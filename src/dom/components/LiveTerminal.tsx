/** Interactive shell for presenter-led live demos. */

import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XTerm } from "@xterm/xterm";
import { logger } from "../../core/index";
import type { TerminalStatus } from "../../core/terminal-protocol";
import { type DOMElement, DOMElementImpl, type ElementOptions, mount } from "../element";
import { attachRangeSelection, type RangeSelectionController } from "../interaction";
import { type TerminalFailure, TerminalSession, terminalEndpoint } from "./TerminalSession";
import { createWindowFrame, createWindowLines, type WindowFrame } from "./WindowFrame";

/** Internal lifecycle of a live terminal, mapped onto `TerminalStatus`. */
type TerminalPhase = "idle" | "connecting" | "running" | "exited" | "offline" | "failed";

/**
 * Configuration options for the LiveTerminal component.
 * @category Components
 * @inline
 */
export interface LiveTerminalOptions extends ElementOptions {
  /** Working directory for the shell, relative to the project root. Default: project root. */
  cwd?: string;
  /** Environment variables passed to the shell process (e.g. `{ PS1: "$ " }`). */
  env?: Record<string, string>;
  /** Shell command and arguments. Default: the user's login shell. Example: `["bash", "--norc", "--noprofile"]`. */
  shell?: string[];
  /** Header label. Default: `"shell"`. */
  title?: string;
  /** Terminal rows. Default: fit to `height` (44 stage units by default). */
  rows?: number;
  /** Fallback transcript shown when the terminal server is unavailable. Default: none. */
  transcript?: string[];
  /** Whether keystrokes typed into the terminal reach the process. Default: `true`. */
  interactive?: boolean;
  /** Whether the terminal takes keyboard focus on scene entry. Default: `false`. */
  autoFocus?: boolean;
  /** Whether the window header offers a button that starts a fresh session. Default: `false`. */
  restartButton?: boolean;
  /** Font size in screen pixels (visual size after stage scaling). Default: inherited from the theme (`--sr-font-size-code`). */
  fontSize?: number;
}

/** Public controls for a live terminal. @category Components */
export interface LiveTerminalElement extends DOMElement {
  /** Header label. */
  title: string;
  /** Session state: `"idle"`, `"running"`, `"exited"`, or `"offline"`. */
  readonly status: TerminalStatus;
  /** Stops the shell, clears the screen, and runs setup again in a fresh shell. */
  restart(): void;
  /** Gives the terminal keyboard focus so typing reaches the process. */
  focus(): void;
  /** Types text character by character with a typewriter effect. */
  type(text: string, options?: { speed?: number; jitter?: number }): Promise<void>;
  /** Sends Enter to the terminal. */
  enter(): void;
  /** Sends Ctrl+C to the terminal. */
  interrupt(): void;
  /** Sends Ctrl+L (clear screen) to the terminal. */
  clear(): void;
}

/** Reads a design token, rejecting values that are not concrete colors. */
function readToken(styles: CSSStyleDeclaration, token: string, fallback: string): string {
  const value = styles.getPropertyValue(token).trim();
  return value === "" || value.includes("gradient") ? fallback : value;
}

/** Resolves a CSS color expression through the element's own cascade. */
function resolveColor(host: HTMLElement, expression: string, fallback: string): string {
  const probe = document.createElement("span");
  probe.style.position = "absolute";
  probe.style.visibility = "hidden";
  probe.style.color = expression;
  host.appendChild(probe);
  const resolved = window.getComputedStyle(probe).color;
  probe.remove();
  return resolved === "" ? fallback : resolved;
}

/**
 * Returns the CSS transform scale factor applied by the stage viewport.
 * Compares getBoundingClientRect (screen pixels) with offsetWidth (layout pixels).
 */
function getAncestorScale(el: HTMLElement): number {
  const viewport = (el.closest(".sr-viewport") ||
    el.closest("[style*='container-type']")) as HTMLElement | null;
  if (!viewport) return 1;
  const layout = viewport.offsetWidth;
  if (layout <= 0) return 1;
  return viewport.getBoundingClientRect().width / layout;
}

/**
 * Patches the xterm.js internal MouseService so that `getCoords` and
 * `getMouseReportCoords` account for a CSS `transform: scale()` ancestor.
 *
 * The problem: xterm measures cell dimensions via OffscreenCanvas (unaffected
 * by transforms) but maps mouse events via getBoundingClientRect (affected by
 * transforms).  The cell widths are in layout pixels while the mouse offsets
 * are in screen pixels — dividing one by the other gives wrong cell indices.
 *
 * The fix: wrap both methods to multiply cell dimensions by the scale factor
 * so that everything is in screen pixels.
 */
function patchMouseService(terminal: XTerm, scaleGetter: () => number): void {
  // biome-ignore lint/suspicious/noExplicitAny: xterm internal API
  const core = (terminal as any)._core;
  const mouseService = core?._mouseService;
  if (!mouseService) return;

  const origGetCoords = mouseService.getCoords.bind(mouseService);
  mouseService.getCoords = (
    event: { clientX: number; clientY: number },
    element: HTMLElement,
    colCount: number,
    rowCount: number,
    isSelection?: boolean,
  ): [number, number] | undefined => {
    const scale = scaleGetter();
    if (scale === 1 || scale <= 0) {
      return origGetCoords(event, element, colCount, rowCount, isSelection);
    }
    // Scale the event coordinates from screen pixels to layout pixels
    // so they match the cell dimensions xterm computed.
    const rect = element.getBoundingClientRect();
    const layoutEvent = {
      clientX: rect.left + (event.clientX - rect.left) / scale,
      clientY: rect.top + (event.clientY - rect.top) / scale,
    };
    return origGetCoords(layoutEvent, element, colCount, rowCount, isSelection);
  };

  const origGetMouseReportCoords = mouseService.getMouseReportCoords.bind(mouseService);
  mouseService.getMouseReportCoords = (
    event: MouseEvent,
    element: HTMLElement,
  ): { col: number; row: number; x: number; y: number } | undefined => {
    const scale = scaleGetter();
    if (scale === 1 || scale <= 0) {
      return origGetMouseReportCoords(event, element);
    }
    const rect = element.getBoundingClientRect();
    const synth = new MouseEvent(event.type, {
      clientX: rect.left + (event.clientX - rect.left) / scale,
      clientY: rect.top + (event.clientY - rect.top) / scale,
    });
    return origGetMouseReportCoords(synth, element);
  };
}

/**
 * Reactive terminal element running a pseudo-terminal on the development machine.
 * @internal
 */
class LiveTerminalElementImpl extends DOMElementImpl implements LiveTerminalElement {
  static override _reactiveKeys: ReadonlySet<string> = new Set([
    ...DOMElementImpl._reactiveKeys,
    "title",
  ]);
  private readonly frame: WindowFrame;
  private readonly cwd: string | undefined;
  private readonly env: Record<string, string> | undefined;
  private readonly shell: string[] | undefined;
  private readonly transcript: readonly string[];
  private readonly interactive: boolean;
  private readonly autoFocus: boolean;
  private readonly rowCount: number | undefined;
  private readonly overrideFontSize: number | undefined;
  private session: TerminalSession | null = null;
  private terminal: XTerm | null = null;
  private fitAddon: FitAddon | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private selection: RangeSelectionController | null = null;
  private phase: TerminalPhase = "idle";
  private exitCode = 0;
  private built = false;
  private offline = false;
  private titleText: string;
  private typed = false;
  private static readonly sessionToken = Date.now().toString(36);

  constructor(options: LiveTerminalOptions = {}) {
    const rows = options.rows === undefined ? undefined : Math.max(1, Math.trunc(options.rows));
    const settings: LiveTerminalOptions = {
      ...options,
      width: options.width ?? options.size ?? 100,
      ...(rows === undefined
        ? { height: options.height ?? options.size ?? 44 }
        : { height: options.height }),
    };
    const title = settings.title ?? "shell";
    const frame = createWindowFrame({ title, className: "sr-terminal-live" });

    super("LiveTerminal", frame.root, settings);

    this.frame = frame;
    this.titleText = title;
    this.cwd = settings.cwd;
    this.env = settings.env;
    this.shell = settings.shell;
    this.transcript = settings.transcript ?? [];
    this.interactive = settings.interactive ?? true;
    this.autoFocus = settings.autoFocus ?? false;
    this.rowCount = rows;
    this.overrideFontSize = settings.fontSize;

    if (settings.restartButton) {
      this.frame.setRestart(() => this.restartSession());
    }

    this.onActivate(() => this.activate());
    this.onUnmount(() => this.dispose());
  }

  get title(): string {
    return this.titleText;
  }

  set title(value: string) {
    this.titleText = value;
    this.frame.setTitle(value);
  }

  get status(): TerminalStatus {
    switch (this.phase) {
      case "running":
        return "running";
      case "exited":
        return "exited";
      case "offline":
      case "failed":
        return "offline";
      default:
        return "idle";
    }
  }

  restart(): void {
    this.restartSession();
  }

  private restartSession(): void {
    const terminal = this.terminal;
    if (!terminal) return;
    this.typed = false;
    this.session?.restart(terminal.cols, terminal.rows);
  }

  focus(): void {
    this.terminal?.focus();
  }

  type(text: string, options?: { speed?: number; jitter?: number }): Promise<void> {
    if (this.typed) return Promise.resolve();
    this.typed = true;
    const speed = options?.speed ?? 0.045;
    const jitter = options?.jitter ?? 0.35;
    return new Promise<void>((resolve) => {
      let i = 0;
      const next = () => {
        if (i >= text.length) {
          resolve();
          return;
        }
        this.session?.input(text[i]);
        i++;
        const delay = speed * 1000 * (1 + (Math.random() * 2 - 1) * jitter);
        setTimeout(next, delay);
      };
      // Wait until the session is running before typing.
      const waitAndStart = () => {
        if (this.phase === "running") {
          next();
        } else {
          setTimeout(waitAndStart, 50);
        }
      };
      waitAndStart();
    });
  }

  enter(): void {
    this.session?.input("\r");
  }

  interrupt(): void {
    this.session?.input("\x03");
  }

  clear(): void {
    this.session?.input("\x0c");
  }

  private activate(): void {
    if (this.offline) {
      this.syncStatus();
      return;
    }
    if (!this.built) this.build();

    const terminal = this.terminal;
    if (!terminal) return;

    this.fit();
    this.session?.open(terminal.cols, terminal.rows);
    if (this.autoFocus) terminal.focus();
  }

  /** Creates the xterm.js viewport and connects the session. */
  private build(): void {
    this.built = true;

    if (!terminalEndpoint()) {
      this.showTranscript("disabled");
      return;
    }

    const body = this.frame.body;
    body.className = "sr-terminal-screen";
    body.replaceChildren();

    const styles = window.getComputedStyle(body);
    const background = readToken(styles, "--sr-background", "#0c0d12");
    const themeFontSize = Number.parseFloat(styles.fontSize);
    const fontSize = this.overrideFontSize ?? themeFontSize;

    const terminal = new XTerm({
      fontFamily: styles.fontFamily,
      fontSize,
      lineHeight: 1.25,
      letterSpacing: 0,
      cursorBlink: true,
      cursorStyle: "block",
      cursorInactiveStyle: "none",
      scrollback: 2000,
      disableStdin: !this.interactive,
      theme: {
        background,
        foreground: readToken(styles, "--sr-text", "#ffffff"),
        cursor: readToken(styles, "--sr-primary", "#38bdf8"),
        cursorAccent: background,
        selectionBackground: resolveColor(
          body,
          "color-mix(in srgb, var(--sr-primary, #38bdf8) 40%, transparent)",
          "#38bdf866",
        ),
      },
    });

    const fitAddon = new FitAddon();
    terminal.loadAddon(fitAddon);
    terminal.open(body);

    // Patch xterm's internal mouse coordinate mapping to account for the
    // ancestor CSS transform: scale() applied by the stage viewport.
    patchMouseService(terminal, () => getAncestorScale(body));

    this.terminal = terminal;
    this.fitAddon = fitAddon;

    if (this.interactive) {
      terminal.onData((data) => this.session?.input(data));
    }
    terminal.onResize(({ cols, rows }) => this.session?.resize(cols, rows));

    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(body);

    this.session = new TerminalSession({
      id: `${this.id}:${LiveTerminalElementImpl.sessionToken}`,
      cwd: this.cwd,
      env: this.env,
      shell: this.shell,
      handlers: {
        ready: (info) => this.handleReady(info),
        data: (chunk) => {
          this.terminal?.write(chunk);
        },
        exit: (code) => this.handleExit(code),
        fail: (message) => this.handleFailure(message),
        unavailable: (reason) => this.showTranscript(reason),
        disconnected: () => this.handleDisconnect(),
      },
    });

    if (this.rowCount !== undefined) {
      terminal.resize(fitAddon.proposeDimensions()?.cols ?? terminal.cols, this.rowCount);
    }

    this.phase = "connecting";
    this.syncStatus();
  }

  private handleReady(info: {
    cols: number;
    rows: number;
    running: boolean;
    replay: string;
  }): void {
    const terminal = this.terminal;
    if (!terminal) return;

    terminal.reset();
    terminal.clear();
    if (info.replay !== "") terminal.write(info.replay);
    if (terminal.cols !== info.cols || terminal.rows !== info.rows) {
      terminal.resize(info.cols, info.rows);
    }

    this.phase = info.running ? "running" : "exited";
    this.syncStatus();
  }

  private handleExit(code: number): void {
    this.exitCode = code;
    this.phase = "exited";
    this.syncStatus();
    this.terminal?.write(`\r\n\x1b[90m[exited with code ${code}]\x1b[0m`);
  }

  private handleFailure(message: string): void {
    logger.warn(`[StageRoutine] Live terminal: ${message}`);
    this.phase = "failed";
    this.syncStatus();
    this.terminal?.write(`\r\n\x1b[31m${message}\x1b[0m\r\n`);
  }

  private handleDisconnect(): void {
    this.phase = "offline";
    this.syncStatus();
    this.terminal?.write("\r\n\x1b[90m[terminal server disconnected]\x1b[0m\r\n");
  }

  /** Replaces the viewport with the static transcript used without a server. */
  private showTranscript(reason: TerminalFailure): void {
    if (this.offline) return;
    this.offline = true;
    this.release();

    this.frame.setRestart(null);

    const body = this.frame.body;
    body.className = "sr-terminal-body";
    body.replaceChildren();

    const note = document.createElement("div");
    note.className = "sr-terminal-note";
    note.textContent =
      reason === "disabled"
        ? "Live terminal not enabled here."
        : "Live terminal server not reachable.";
    body.appendChild(note);

    const lineElements = createWindowLines(body, this.transcript);
    if (this.interactive && lineElements.length > 0) {
      this.selection = attachRangeSelection({
        container: body,
        getItems: () => lineElements,
        interactive: true,
      });
    }

    this.phase = "offline";
    this.syncStatus();
  }

  /** Fits the grid to the element box. */
  private fit(): void {
    const fitAddon = this.fitAddon;
    const terminal = this.terminal;
    if (!fitAddon || !terminal || !this.isActive) return;

    const body = this.frame.body;
    if (body.clientWidth === 0) return;

    // A row sized frame takes columns from the box and keeps its own row count.
    if (this.rowCount !== undefined) {
      const proposed = fitAddon.proposeDimensions();
      if (!proposed) return;
      if (proposed.cols !== terminal.cols || this.rowCount !== terminal.rows) {
        terminal.resize(proposed.cols, this.rowCount);
      }
      return;
    }

    if (body.clientHeight === 0) return;
    fitAddon.fit();
  }

  private syncStatus(): void {
    switch (this.phase) {
      case "connecting":
        this.frame.setStatus("connecting", "idle");
        break;
      case "running":
        this.frame.setStatus("running", "live");
        break;
      case "exited":
        this.frame.setStatus(
          this.exitCode === 0 ? "exited" : `exit ${this.exitCode}`,
          this.exitCode === 0 ? "idle" : "error",
        );
        break;
      case "failed":
        this.frame.setStatus("error", "error");
        break;
      case "offline":
        this.frame.setStatus("offline", "idle");
        break;
      default:
        this.frame.setStatus(null);
    }
  }

  /** Drops the viewport and its session. */
  private release(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.session?.dispose();
    this.session = null;
    this.terminal?.dispose();
    this.terminal = null;
    this.fitAddon = null;
  }

  private dispose(): void {
    this.selection?.destroy();
    this.selection = null;
    this.release();
  }
}

/** Creates an interactive shell for live demos. @category Components */
export function LiveTerminal(options: LiveTerminalOptions = {}): LiveTerminalElement {
  return mount(new LiveTerminalElementImpl(options));
}
