/**
 * Browser side of the live terminal protocol: one WebSocket per LiveTerminal element.
 */

import {
  TERMINAL_SUBPROTOCOL,
  type TerminalClientMessage,
  type TerminalServerMessage,
  terminalTokenPath,
} from "../../core/terminal-protocol";

declare const __STAGEROUTINE_TERMINAL__: string | false | undefined;

/** Reason a live terminal has no process to show. */
export type TerminalFailure = "disabled" | "unreachable";

/** Callbacks the LiveTerminal element implements for its session. */
export interface TerminalSessionHandlers {
  /** The session is attached. `replay` holds the scrollback captured so far. */
  ready(info: { cols: number; rows: number; running: boolean; replay: string }): void;
  /** Process output. */
  data(chunk: string): void;
  /** Process exit code. */
  exit(code: number): void;
  /** Session level failure reported by the server, e.g. a missing node-pty. */
  fail(message: string): void;
  /** No session can be attached, and none was ever attached. */
  unavailable(reason: TerminalFailure): void;
  /** An attached session lost its connection. */
  disconnected(): void;
}

/** Resolves the WebSocket endpoint injected by the StageRoutine Vite plugin. */
export function terminalEndpoint(): string | false {
  const injected = (globalThis as { __STAGEROUTINE_TERMINAL__?: string | false })
    .__STAGEROUTINE_TERMINAL__;
  if (injected !== undefined) return injected;
  if (typeof __STAGEROUTINE_TERMINAL__ !== "undefined") return __STAGEROUTINE_TERMINAL__;
  return false;
}

/**
 * Owns the WebSocket to the terminal server for one element.
 *
 * Connecting fetches the token minted for the current server run and offers it as
 * a subprotocol, so the server refuses the socket before any process starts.
 * Opening an id that the server already runs reattaches to that process and
 * replays its scrollback, so reloading a slide deck resumes the same session.
 */
export class TerminalSession {
  private socket: WebSocket | null = null;
  private attached = false;
  private connecting = false;
  private disposed = false;

  constructor(
    private readonly config: {
      id: string;
      command?: string;
      cwd?: string;
      handlers: TerminalSessionHandlers;
    },
  ) {}

  /** True once the server confirmed the session. */
  get isAttached(): boolean {
    return this.attached;
  }

  /** Connects, or does nothing while a socket is open or being opened. */
  open(cols: number, rows: number): void {
    if (this.socket || this.connecting || this.disposed) return;

    const endpoint = terminalEndpoint();
    if (!endpoint) {
      this.config.handlers.unavailable("disabled");
      return;
    }

    this.connecting = true;
    void this.connect(endpoint, cols, rows);
  }

  /** Fetches the token of this server run, then opens the socket. */
  private async connect(endpoint: string, cols: number, rows: number): Promise<void> {
    let token: string;
    try {
      const response = await fetch(terminalTokenPath(endpoint), {
        headers: { accept: "text/plain" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`token request answered ${response.status}`);
      token = (await response.text()).trim();
      if (token === "") throw new Error("token request answered an empty token");
    } catch {
      this.connecting = false;
      this.config.handlers.unavailable("unreachable");
      return;
    }

    this.connecting = false;
    if (this.disposed || this.socket) return;

    const scheme = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${scheme}//${window.location.host}${endpoint}`, [
      TERMINAL_SUBPROTOCOL,
      token,
    ]);
    this.socket = socket;

    socket.onopen = () => {
      this.post({
        type: "open",
        id: this.config.id,
        command: this.config.command,
        cwd: this.config.cwd,
        cols,
        rows,
      });
    };

    socket.onmessage = (event) => {
      this.receive(String(event.data));
    };

    socket.onclose = () => {
      const wasAttached = this.attached;
      this.socket = null;
      this.attached = false;
      if (wasAttached) {
        this.config.handlers.disconnected();
      } else {
        this.config.handlers.unavailable("unreachable");
      }
    };
  }

  /** Sends text to the process as if it was typed. */
  input(data: string): void {
    this.post({ type: "input", data });
  }

  /** Reports a new grid size. */
  resize(cols: number, rows: number): void {
    if (this.attached) this.post({ type: "resize", cols, rows });
  }

  /** Stops the process and runs the command again. */
  restart(cols: number, rows: number, command: string): void {
    if (this.attached) this.post({ type: "restart", cols, rows, command });
  }

  /** Closes the socket. The server reaps the session after its idle timeout. */
  dispose(): void {
    this.disposed = true;
    const socket = this.socket;
    this.socket = null;
    this.attached = false;
    socket?.close();
  }

  private post(message: TerminalClientMessage): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(message));
    }
  }

  private receive(raw: string): void {
    let message: TerminalServerMessage;
    try {
      message = JSON.parse(raw) as TerminalServerMessage;
    } catch {
      return;
    }

    switch (message.type) {
      case "ready":
        this.attached = true;
        this.config.handlers.ready({
          cols: message.cols,
          rows: message.rows,
          running: message.running,
          replay: message.replay,
        });
        break;
      case "data":
        this.config.handlers.data(message.data);
        break;
      case "exit":
        this.config.handlers.exit(message.code);
        break;
      case "error":
        this.config.handlers.fail(message.message);
        break;
    }
  }
}
