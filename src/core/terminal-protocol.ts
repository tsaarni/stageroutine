/**
 * Wire contract shared by LiveTerminal and the StageRoutine terminal server.
 *
 * Every frame is a JSON object with a `type` discriminator. One WebSocket carries
 * exactly one session: the client opens it, then streams input and output until the
 * socket closes. Reopening a session id reattaches to the running process.
 *
 * Each server run publishes a random token on `${endpoint}/token` and demands it as
 * a WebSocket subprotocol, so a socket is refused before any process starts.
 */

/** Default WebSocket endpoint that serves live terminal sessions. */
export const TERMINAL_ENDPOINT = "/__stageroutine/terminal";

/** First WebSocket subprotocol offered by the terminal client. */
export const TERMINAL_SUBPROTOCOL = "stageroutine";

/** HTTP path that issues the session token for a terminal endpoint. */
export function terminalTokenPath(endpoint: string): string {
  return `${endpoint}/token`;
}

/** Lifecycle of a live terminal as seen by the presentation. */
export type TerminalStatus = "idle" | "running" | "exited" | "offline";

/** Starts or reattaches to a session. */
export interface TerminalOpenMessage {
  type: "open";
  /** Stable session key. Reopening a live id reattaches and replays its scrollback. */
  id: string;
  /** Setup command run before the interactive shell opens. Default: none. */
  command?: string;
  /** Working directory, relative to the server root (default: server root). */
  cwd?: string;
  /** Environment variables passed to the shell process. */
  env?: Record<string, string>;
  /** Shell command and arguments. Default: the user's login shell. */
  shell?: string[];
  /** Grid width in character cells. */
  cols: number;
  /** Grid height in character cells. */
  rows: number;
}

/** Sends keystrokes or pasted text to the process. */
export interface TerminalInputMessage {
  type: "input";
  data: string;
}

/** Reports a new grid size after the element box changed. */
export interface TerminalResizeMessage {
  type: "resize";
  cols: number;
  rows: number;
}

/** Stops the current shell and opens a fresh shell with a clean grid. */
export interface TerminalRestartMessage {
  type: "restart";
  cols: number;
  rows: number;
}

/** Messages the element sends to the terminal server. */
export type TerminalClientMessage =
  | TerminalOpenMessage
  | TerminalInputMessage
  | TerminalResizeMessage
  | TerminalRestartMessage;

/** Confirms that a session is attached, with the scrollback captured so far. */
export interface TerminalReadyMessage {
  type: "ready";
  id: string;
  cols: number;
  rows: number;
  /** False when the process already finished before this client attached. */
  running: boolean;
  /** Output captured for this session, replayed on attach. */
  replay: string;
}

/** Streams process output. */
export interface TerminalDataMessage {
  type: "data";
  data: string;
}

/** Reports the process exit code. */
export interface TerminalExitMessage {
  type: "exit";
  code: number;
}

/** Reports a session that could not start or an unusable request. */
export interface TerminalErrorMessage {
  type: "error";
  message: string;
}

/** Messages the terminal server sends to the element. */
export type TerminalServerMessage =
  | TerminalReadyMessage
  | TerminalDataMessage
  | TerminalExitMessage
  | TerminalErrorMessage;
