/** Interactive shell for presenter-led live demos. */

import "@xterm/xterm/css/xterm.css";
import "./LiveTerminal.css";
import { FitAddon } from "@xterm/addon-fit";
import { Terminal as XTerm } from "@xterm/xterm";
import { logger } from "../../core/index";
import type { TerminalStatus } from "../../core/terminal-protocol";
import { DOMElement, type ElementOptions, mount } from "../element";
import { attachRangeSelection, type RangeSelectionController } from "../interaction";
import { createTerminalFrame, createTerminalLines, type TerminalFrame } from "./terminal-chrome";
import { type TerminalFailure, TerminalSession, terminalEndpoint } from "./terminal-session";

/** Internal lifecycle of a live terminal, mapped onto `TerminalStatus`. */
type TerminalPhase = "idle" | "connecting" | "running" | "exited" | "offline" | "failed";

/**
 * Configuration options for the LiveTerminal component.
 * @category Components
 * @inline
 */
export interface LiveTerminalOptions extends ElementOptions {
  /** Setup command run before the interactive shell opens. Default: none. */
  command?: string;
  /** Working directory for the shell, relative to the project root. Default: project root. */
  cwd?: string;
  /** Header label. Default: `"shell"`. */
  title?: string;
  /** Terminal rows. Default: fit to `height` (44 stage units by default). */
  rows?: number;
  /** Transcript shown without a terminal server. Default: no lines. */
  lines?: string[];
  /** Whether keystrokes typed into the terminal reach the process. Default: `true`. */
  interactive?: boolean;
  /** Whether the terminal takes keyboard focus on scene entry. Default: `false`. */
  autoFocus?: boolean;
  /** Whether the window header offers a button that starts a fresh session. Default: `false`. */
  restartButton?: boolean;
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
 * Reactive terminal element running a pseudo-terminal on the development machine.
 * @internal
 */
class LiveTerminalElementImpl extends DOMElement implements LiveTerminalElement {
  private readonly frame: TerminalFrame;
  private readonly cwd: string | undefined;
  private readonly command: string | undefined;
  private readonly lines: readonly string[];
  private readonly interactive: boolean;
  private readonly autoFocus: boolean;
  private readonly rowCount: number | undefined;
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

  constructor(options: LiveTerminalOptions = {}) {
    const rows = options.rows === undefined ? undefined : Math.max(1, Math.trunc(options.rows));
    const settings: LiveTerminalOptions = {
      ...options,
      width: options.width ?? 100,
      // A row sized frame takes its height from the grid, so it sets none.
      ...(rows === undefined ? { height: options.height ?? 44 } : { height: options.height }),
    };
    const title = settings.title ?? "shell";
    const frame = createTerminalFrame({ title, className: "sr-terminal-live" });
    if (rows !== undefined && options.height === undefined) {
      frame.body.className = "sr-terminal-screen";
      frame.body.style.flex = "none";
      frame.body.style.height = `calc(${rows * 1.25}lh + 2 * var(--sr-space-xs))`;
      frame.body.style.boxSizing = "border-box";
    }

    super("LiveTerminal", frame.root, settings);

    this.frame = frame;
    this.titleText = title;
    this.cwd = settings.cwd;
    this.command = settings.command;
    this.lines = settings.lines ?? [];
    this.interactive = settings.interactive ?? true;
    this.autoFocus = settings.autoFocus ?? false;
    this.rowCount = rows;

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
    this.session?.restart(terminal.cols, terminal.rows);
  }

  focus(): void {
    this.terminal?.focus();
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
    // Also reconnects after the server went away and came back.
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

    const terminal = new XTerm({
      fontFamily: styles.fontFamily,
      fontSize: Number.parseFloat(styles.fontSize) || 16,
      lineHeight: 1.25,
      letterSpacing: 0,
      cursorBlink: false,
      cursorStyle: "bar",
      cursorInactiveStyle: "bar",
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

    this.terminal = terminal;
    this.fitAddon = fitAddon;

    if (this.interactive) {
      terminal.onData((data) => this.session?.input(data));
    }
    terminal.onResize(({ cols, rows }) => this.session?.resize(cols, rows));

    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(body);

    this.session = new TerminalSession({
      id: this.id,
      command: this.command,
      cwd: this.cwd,
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

    // Drop the previous view before writing the replay, so a reattached session
    // never shows stale output above the fresh one.
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
    // No trailing newline: the note sits on the last row of a row sized frame.
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

    // A transcript has nothing to restart.
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

    const lineElements = createTerminalLines(body, this.lines);
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
