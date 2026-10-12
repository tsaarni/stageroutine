/**
 * LiveTerminal element. Runs a real command on the development machine and
 * streams its output onto the stage, with an optional interactive prompt.
 * Falls back to a static transcript when no terminal server is reachable.
 */

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

/** Quiet period after the last output before `initialInput` is typed. */
const SEED_QUIET_MS = 150;

/** Longest wait for a quiet session before typing `initialInput` anyway. */
const SEED_DEADLINE_MS = 1200;

/** Internal lifecycle of a live terminal, mapped onto `TerminalStatus`. */
type TerminalPhase = "idle" | "connecting" | "running" | "exited" | "offline" | "failed";

/**
 * Configuration options for the LiveTerminal component.
 * @category Components
 * @inline
 */
export interface LiveTerminalOptions extends ElementOptions {
  /** Shell command to run when the terminal first enters a scene. Default: an interactive shell. */
  command?: string;
  /** Working directory for the command, relative to the project root. Default: project root. */
  cwd?: string;
  /** Header label. Default: the command, or `"shell"`. */
  title?: string;
  /**
   * Frame height in terminal rows. The card then hugs exactly this many lines
   * instead of stretching to `height`, so a short command leaves no empty rows.
   * Default: the card is as tall as `height`.
   */
  rows?: number;
  /**
   * Static transcript shown in place of the live session when no terminal server
   * is reachable: static builds, single-file exports, or a stopped dev server.
   */
  lines?: string[];
  /** Whether keystrokes typed into the terminal reach the process. Default: `true`. */
  interactive?: boolean;
  /** Whether the terminal takes keyboard focus on scene entry. Default: `false`. */
  autoFocus?: boolean;
  /** Whether entering a scene runs the command again. Default: `false` (sessions persist). */
  restartOnActivate?: boolean;
  /**
   * Text typed into the process whenever a session starts, including after a
   * restart. Default: nothing is typed.
   */
  initialInput?: string;
  /** Whether the window header offers a button that starts a fresh session. Default: `false`. */
  restartButton?: boolean;
}

/** Public controls for a live terminal. @category Components */
export interface LiveTerminalElement extends DOMElement {
  /** Command sent to the terminal server. */
  command: string;
  /** Header label. */
  title: string;
  /** Session state: `"idle"`, `"running"`, `"exited"`, or `"offline"`. */
  readonly status: TerminalStatus;
  /**
   * Types text into the process, as if it came from the keyboard. Text sent while
   * the session is still connecting is delivered as soon as it attaches.
   */
  send(data: string): void;
  /**
   * Stops the process and starts a fresh session with an empty screen, running the
   * command again and typing `initialInput` when the session attaches.
   */
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
  private readonly lines: readonly string[];
  private readonly interactive: boolean;
  private readonly autoFocus: boolean;
  private readonly restartOnActivate: boolean;
  private readonly rowCount: number | undefined;
  private readonly initialInput: string | undefined;
  /** Set while a fresh session owes `initialInput`. */
  private seedPending = true;
  private seedTimer: ReturnType<typeof setTimeout> | null = null;
  private seedDeadline: ReturnType<typeof setTimeout> | null = null;

  private session: TerminalSession | null = null;
  private terminal: XTerm | null = null;
  private fitAddon: FitAddon | null = null;
  private resizeObserver: ResizeObserver | null = null;
  private selection: RangeSelectionController | null = null;
  private onFocusChange: (() => void) | null = null;
  private phase: TerminalPhase = "idle";
  private exitCode = 0;
  private built = false;
  private offline = false;
  /** Text sent before the session attached, flushed once it is ready. */
  private queuedInput: string[] = [];
  private commandText: string;
  private titleText: string;

  constructor(options: LiveTerminalOptions = {}) {
    const rows = options.rows === undefined ? undefined : Math.max(1, Math.trunc(options.rows));
    const settings: LiveTerminalOptions = {
      ...options,
      width: options.width ?? 100,
      // A row sized frame takes its height from the grid, so it sets none.
      ...(rows === undefined ? { height: options.height ?? 44 } : { height: options.height }),
    };
    const command = settings.command ?? "";
    const title = settings.title ?? (command === "" ? "shell" : command);
    const frame = createTerminalFrame({ title, className: "sr-terminal-live" });
    if (rows !== undefined && options.height === undefined) {
      frame.body.className = "sr-terminal-screen";
      frame.body.style.flex = "none";
      frame.body.style.height = `calc(${rows * 1.25}lh + 2 * var(--sr-space-xs))`;
      frame.body.style.boxSizing = "border-box";
    }

    super("LiveTerminal", frame.root, settings);

    this.frame = frame;
    this.commandText = command;
    this.titleText = title;
    this.cwd = settings.cwd;
    this.lines = settings.lines ?? [];
    this.interactive = settings.interactive ?? true;
    this.autoFocus = settings.autoFocus ?? false;
    this.restartOnActivate = settings.restartOnActivate ?? false;
    this.rowCount = rows;
    this.initialInput = settings.initialInput;

    if (settings.restartButton) {
      this.frame.setRestart(() => this.restartSession());
    }

    this.onActivate(() => this.activate());
    this.onDeactivate(() => this.syncCursor());
    this.onUnmount(() => this.dispose());
  }

  get command(): string {
    return this.commandText;
  }

  set command(value: string) {
    this.commandText = value;
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

  send(data: string): void {
    const session = this.session;
    if (!session) return;
    if (session.isAttached) {
      session.input(data);
      return;
    }
    if (this.phase === "connecting") {
      this.queuedInput.push(data);
    }
  }

  restart(): void {
    this.restartSession();
  }

  /** Starts a fresh session, which will be seeded with `initialInput` again. */
  private restartSession(): void {
    const terminal = this.terminal;
    if (!terminal) return;
    this.clearSeedTimers();
    this.seedPending = true;
    this.session?.restart(terminal.cols, terminal.rows);
  }

  /**
   * Types `initialInput` once the session stops printing. Typing into a process
   * that is still starting up echoes the text before its prompt appears.
   */
  private scheduleSeed(): void {
    if (this.initialInput === undefined) return;
    if (this.seedTimer) {
      clearTimeout(this.seedTimer);
      this.seedTimer = null;
    }
    this.seedTimer = setTimeout(() => this.sendSeed(), SEED_QUIET_MS);
    this.seedDeadline ??= setTimeout(() => this.sendSeed(), SEED_DEADLINE_MS);
  }

  private sendSeed(): void {
    if (!this.seedPending) return;
    this.seedPending = false;
    this.clearSeedTimers();
    if (this.initialInput !== undefined) {
      this.session?.input(this.initialInput);
    }
  }

  private clearSeedTimers(): void {
    if (this.seedTimer) {
      clearTimeout(this.seedTimer);
      this.seedTimer = null;
    }
    if (this.seedDeadline) {
      clearTimeout(this.seedDeadline);
      this.seedDeadline = null;
    }
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
    if (this.restartOnActivate && this.session?.isAttached) {
      this.restartSession();
    }
    if (this.autoFocus) terminal.focus();
    this.syncCursor();
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

    const onFocusChange = () => this.syncCursor();
    body.addEventListener("focusin", onFocusChange);
    body.addEventListener("focusout", onFocusChange);
    this.onFocusChange = onFocusChange;

    this.resizeObserver = new ResizeObserver(() => this.fit());
    this.resizeObserver.observe(body);

    this.session = new TerminalSession({
      id: this.id,
      command: this.commandText,
      cwd: this.cwd,
      handlers: {
        ready: (info) => this.handleReady(info),
        data: (chunk) => {
          this.terminal?.write(chunk);
          if (this.seedPending) this.scheduleSeed();
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
    this.syncCursor();

    const queued = this.queuedInput.splice(0);
    for (const chunk of queued) {
      this.session?.input(chunk);
    }

    if (this.seedPending) this.scheduleSeed();
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

  /** Blinks the cursor only while the terminal is focused in the active scene. */
  private syncCursor(): void {
    const terminal = this.terminal;
    if (!terminal) return;
    const focused = this.frame.body.contains(document.activeElement);
    terminal.options.cursorBlink = this.isActive && focused;
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
    this.clearSeedTimers();
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    if (this.onFocusChange) {
      this.frame.body.removeEventListener("focusin", this.onFocusChange);
      this.frame.body.removeEventListener("focusout", this.onFocusChange);
      this.onFocusChange = null;
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

/**
 * Creates a LiveTerminal element on stage.
 *
 * The terminal runs its command through the terminal server started by
 * `stageRoutine({ terminal: true })` or `stageroutine dev --terminal`. Live
 * sessions are never part of a production build: without a reachable server the
 * element renders `lines` instead.
 *
 * @category Components
 * @example
 * ```tsx
 * const deploy = LiveTerminal({
 *   x: "center",
 *   y: "center",
 *   command: "kubectl -n demo rollout status deploy/api",
 *   lines: ["$ kubectl -n demo rollout status deploy/api", "deployment \"api\" successfully rolled out"],
 * });
 *
 * // Step 3 of the talk: run it again for the audience.
 * deploy.restart();
 * ```
 */
export function LiveTerminal(options: LiveTerminalOptions = {}): LiveTerminalElement {
  return mount(new LiveTerminalElementImpl(options));
}
