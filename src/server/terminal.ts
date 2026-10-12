/**
 * Live terminal server for the StageRoutine dev and preview servers.
 *
 * A browser attaches over a WebSocket and streams I/O to a pseudo-terminal that
 * runs commands on the local machine. Only loopback connections are accepted, a
 * token minted for this server run must be presented, and every session is
 * confined to the project root. Requires the optional node-pty package; the
 * plugin stays inert without it.
 */

import { randomBytes, timingSafeEqual } from "node:crypto";
import { chmodSync, statSync } from "node:fs";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import { createRequire } from "node:module";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import type { Duplex } from "node:stream";
import type { PluginOption, PreviewServer, ViteDevServer } from "vite";
import { type WebSocket, WebSocketServer } from "ws";
import {
  TERMINAL_ENDPOINT,
  TERMINAL_SUBPROTOCOL,
  type TerminalClientMessage,
  type TerminalServerMessage,
  terminalTokenPath,
} from "../core/terminal-protocol.ts";

/** WebSocket.OPEN. */
const SOCKET_OPEN = 1;

/** Milliseconds a session survives without an attached client. */
const DEFAULT_IDLE_TIMEOUT = 120_000;

/** Characters of output kept for replay. */
const DEFAULT_SCROLLBACK = 20_000;

/** Terminal grid limits, protecting the pty from absurd sizes. */
const MIN_COLS = 2;
const MAX_COLS = 500;
const MIN_ROWS = 1;
const MAX_ROWS = 200;

/**
 * node-pty surface used here. Declared structurally so installs without
 * node-pty still type check.
 */
interface PtyProcess {
  onData(listener: (data: string) => void): void;
  onExit(listener: (event: { exitCode: number }) => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
}

interface PtyModule {
  spawn(
    file: string,
    args: string[],
    options: {
      name: string;
      cols: number;
      rows: number;
      cwd: string;
      env: Record<string, string>;
    },
  ): PtyProcess;
}

/**
 * Specifier typed as a plain string, so TypeScript never requires node-pty to be
 * installed for the plugin to compile.
 */
const PTY_MODULE: string = "node-pty";

/** Options for the live terminal server. */
export interface TerminalServerOptions {
  /** WebSocket endpoint that serves sessions. Default: `"/__stageroutine/terminal"`. */
  path?: string;
  /** Directory that sessions may start in, relative to the project root. Default: project root. */
  cwd?: string;
  /** Extra environment variables for every session. */
  env?: Record<string, string>;
  /** Interactive shell. Default: `$SHELL`, then `/bin/bash`. */
  shell?: string;
  /** Maximum concurrent sessions. Default: `8`. */
  maxSessions?: number;
  /** Milliseconds without an attached client before a session is killed. Default: `120000`. */
  idleTimeout?: number;
  /** Characters of output kept for replay when a client attaches. Default: `20000`. */
  scrollback?: number;
  /**
   * Fixed token that clients must present. Default: 24 random bytes minted per
   * server run, published on `${path}/token`.
   */
  token?: string;
}

interface Session {
  readonly id: string;
  readonly command: string | undefined;
  readonly cwd: string;
  cols: number;
  rows: number;
  process: PtyProcess | null;
  exitCode: number | null;
  output: string;
  clients: Set<WebSocket>;
  /** In-flight spawn, so parallel opens share one process. */
  starting: Promise<string | null> | null;
  reap: ReturnType<typeof setTimeout> | null;
}

/**
 * node-pty 1.1.0 publishes its macOS and Linux `spawn-helper` binary without the
 * executable bit, which makes every spawn fail with "posix_spawnp failed".
 * Restore the bit when it is missing. Compiled installs are already fine.
 */
function repairSpawnHelper(): void {
  if (process.platform === "win32") return;
  try {
    const entry = createRequire(import.meta.url).resolve("node-pty");
    const helper = join(
      dirname(entry),
      "..",
      "prebuilds",
      `${process.platform}-${process.arch}`,
      "spawn-helper",
    );
    const info = statSync(helper, { throwIfNoEntry: false });
    if (!info || (info.mode & 0o111) !== 0) return;
    chmodSync(helper, 0o755);
  } catch {
    // Unusual install layouts simply need the executable bit from elsewhere.
  }
}

/** Turns a spawn failure into a message that names the likely cause. */
function spawnErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (!message.includes("posix_spawnp")) return message;
  return `${message} Run: chmod +x node_modules/node-pty/prebuilds/*/spawn-helper`;
}

/** Projects an output buffer onto its most recent complete lines. */
function trimScrollback(output: string, limit: number): string {
  const cut = output.indexOf("\n", output.length - limit);
  return cut === -1 ? output.slice(output.length - limit) : output.slice(cut + 1);
}

/** Clamps a client supplied grid size to the values a pty accepts. */
function gridSize(value: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.min(Math.max(Math.trunc(value), min), max);
}

/** Matches the request path against the terminal endpoint. */
function requestPath(url: string | undefined): string {
  if (!url) return "";
  const query = url.indexOf("?");
  return query === -1 ? url : url.slice(0, query);
}

/** True for connections originating on the loopback interface. */
function isLoopback(request: IncomingMessage): boolean {
  const address = request.socket.remoteAddress ?? "";
  const normalized = address.startsWith("::ffff:") ? address.slice(7) : address;
  return normalized === "::1" || normalized.startsWith("127.");
}

/** True when a browser sent the request from the same origin as the dev server. */
function isSameOrigin(request: IncomingMessage): boolean {
  const { origin, host } = request.headers;
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/** Refuses an upgrade with a plain HTTP response. */
function refuseUpgrade(socket: Duplex, status: string): void {
  socket.write(`HTTP/1.1 ${status}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}

/** Reads the token a client offered as its second WebSocket subprotocol. */
function offeredToken(request: IncomingMessage): string | undefined {
  const header = request.headers["sec-websocket-protocol"];
  if (!header) return undefined;
  const protocols = String(header)
    .split(",")
    .map((protocol) => protocol.trim());
  return protocols[0] === TERMINAL_SUBPROTOCOL ? protocols[1] : undefined;
}

/**
 * Serves live terminal sessions over WebSocket for the Vite dev and preview servers.
 *
 * The plugin is added by `stageRoutine({ terminal: true })` and is never part of a
 * presentation build. Sessions run commands with the privileges of the user running
 * the dev server, so connections are limited to the loopback interface and must
 * present the token minted for this run.
 */
export function terminalServer(options: TerminalServerOptions = {}): PluginOption {
  const endpoint = options.path ?? TERMINAL_ENDPOINT;
  const shell = options.shell ?? process.env.SHELL ?? "/bin/bash";
  const maxSessions = options.maxSessions ?? 8;
  const idleTimeout = options.idleTimeout ?? DEFAULT_IDLE_TIMEOUT;
  const scrollback = options.scrollback ?? DEFAULT_SCROLLBACK;
  const token = options.token ?? randomBytes(24).toString("base64url");
  const tokenPath = terminalTokenPath(endpoint);

  const sessions = new Map<string, Session>();
  const attached = new Set<Server>();
  let root = process.cwd();
  let pty: PtyModule | null | undefined;

  const send = (client: WebSocket, message: TerminalServerMessage): void => {
    if (client.readyState === SOCKET_OPEN) {
      client.send(JSON.stringify(message));
    }
  };

  const broadcast = (session: Session, message: TerminalServerMessage): void => {
    for (const client of session.clients) {
      send(client, message);
    }
  };

  const append = (session: Session, chunk: string): void => {
    session.output += chunk;
    if (session.output.length > scrollback) {
      session.output = trimScrollback(session.output, scrollback);
    }
  };

  const clearReap = (session: Session): void => {
    if (session.reap) {
      clearTimeout(session.reap);
      session.reap = null;
    }
  };

  const stop = (session: Session): void => {
    clearReap(session);
    session.process?.kill();
    session.process = null;
    sessions.delete(session.id);
  };

  const stopAll = (): void => {
    for (const session of [...sessions.values()]) {
      stop(session);
    }
  };

  /** Kills a session once it has been without a client for `idleTimeout`. */
  const scheduleReap = (session: Session): void => {
    clearReap(session);
    if (session.clients.size > 0) return;
    session.reap = setTimeout(() => stop(session), idleTimeout);
  };

  /** Compares a client token in constant time. */
  const matchesToken = (supplied: string | undefined): boolean => {
    if (!supplied) return false;
    const expected = Buffer.from(token, "utf8");
    const actual = Buffer.from(supplied, "utf8");
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  };

  /** Answers token requests. Returns false when the request targets another path. */
  function handleTokenRequest(request: IncomingMessage, response: ServerResponse): boolean {
    if (requestPath(request.url) !== tokenPath) return false;
    if (!isLoopback(request) || !isSameOrigin(request)) {
      response.writeHead(403).end("Forbidden");
      return true;
    }
    response.writeHead(200, {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "no-store",
    });
    response.end(token);
    return true;
  }

  /** Resolves a session working directory, refusing paths outside the project root. */
  const resolveCwd = (requested: string | undefined): string => {
    const base = resolve(root, options.cwd ?? ".");
    const target = resolve(base, requested ?? ".");
    const inside = relative(root, target);
    if (inside.startsWith("..") || isAbsolute(inside)) {
      throw new Error(`Working directory "${target}" is outside the project root`);
    }
    if (!statSync(target, { throwIfNoEntry: false })?.isDirectory()) {
      throw new Error(`Working directory "${target}" does not exist`);
    }
    return target;
  };

  async function loadPty(): Promise<PtyModule | null> {
    try {
      const loaded = (await import(PTY_MODULE)) as { default?: PtyModule };
      repairSpawnHelper();
      return loaded.default ?? (loaded as unknown as PtyModule);
    } catch {
      return null;
    }
  }

  /** Starts the session process. Resolves to an error message, or null on success. */
  async function start(session: Session, cols: number, rows: number): Promise<string | null> {
    if (pty === undefined) {
      pty = await loadPty();
    }
    if (!pty) {
      return "Live terminals need the optional node-pty package. Install it with: pnpm add -D node-pty";
    }

    let cwd: string;
    try {
      cwd = resolveCwd(session.cwd);
    } catch (error) {
      return error instanceof Error ? error.message : String(error);
    }

    const width = gridSize(cols, MIN_COLS, MAX_COLS, 80);
    const height = gridSize(rows, MIN_ROWS, MAX_ROWS, 24);

    try {
      // Setup may change directory or export variables for the interactive shell.
      const args = session.command ? ["-c", `${session.command}\nexec "$0"`, shell] : [];
      const child = pty.spawn(shell, args, {
        name: "xterm-256color",
        cols: width,
        rows: height,
        cwd,
        env: {
          ...process.env,
          ...options.env,
          TERM: "xterm-256color",
          COLORTERM: "truecolor",
        } as Record<string, string>,
      });

      session.process = child;
      session.cols = width;
      session.rows = height;
      session.exitCode = null;
      session.output = "";

      child.onData((data) => {
        if (session.process !== child) return;
        append(session, data);
        broadcast(session, { type: "data", data });
      });

      child.onExit(({ exitCode }) => {
        if (session.process !== child) return;
        session.process = null;
        session.exitCode = exitCode;
        broadcast(session, { type: "exit", code: exitCode });
        scheduleReap(session);
      });

      return null;
    } catch (error) {
      return spawnErrorMessage(error);
    }
  }

  function resize(session: Session, cols: number, rows: number): void {
    const width = gridSize(cols, MIN_COLS, MAX_COLS, session.cols);
    const height = gridSize(rows, MIN_ROWS, MAX_ROWS, session.rows);
    session.cols = width;
    session.rows = height;
    session.process?.resize(width, height);
  }

  function create(id: string, command: string | undefined, cwd: string): Session {
    const session: Session = {
      id,
      command,
      cwd,
      cols: 80,
      rows: 24,
      process: null,
      exitCode: null,
      output: "",
      clients: new Set(),
      starting: null,
      reap: null,
    };
    sessions.set(id, session);
    return session;
  }

  /** Finds or creates the session named by an open message. */
  function resolveSession(
    client: WebSocket,
    message: Extract<TerminalClientMessage, { type: "open" }>,
  ): Session | null {
    const existing = sessions.get(message.id);
    if (existing) return existing;
    if (sessions.size >= maxSessions) {
      send(client, { type: "error", message: `Too many live terminals (limit ${maxSessions})` });
      return null;
    }
    return create(message.id, message.command, message.cwd ?? ".");
  }

  /** Attaches a client, starting the process when the session is new or restarted. */
  async function attachClient(
    client: WebSocket,
    session: Session,
    message: Extract<TerminalClientMessage, { type: "open" }>,
  ): Promise<void> {
    session.clients.add(client);
    clearReap(session);

    if (!session.process && session.exitCode === null) {
      session.starting ??= start(session, message.cols, message.rows);
      const failure = await session.starting;
      if (failure) {
        session.starting = null;
        send(client, { type: "error", message: failure });
        return;
      }
    }

    resize(session, message.cols, message.rows);
    send(client, {
      type: "ready",
      id: session.id,
      cols: session.cols,
      rows: session.rows,
      running: session.process !== null,
      replay: session.output,
    });
    if (session.exitCode !== null) {
      send(client, { type: "exit", code: session.exitCode });
    }
  }

  async function handleRestart(session: Session, cols: number, rows: number): Promise<void> {
    clearReap(session);
    session.process?.kill();
    session.process = null;
    session.exitCode = null;
    session.output = "";
    session.starting = null;

    const failure = await start(session, cols, rows);
    if (failure) {
      broadcast(session, { type: "error", message: failure });
      return;
    }
    broadcast(session, {
      type: "ready",
      id: session.id,
      cols: session.cols,
      rows: session.rows,
      running: true,
      replay: "",
    });
  }

  function handleClient(client: WebSocket): void {
    let current: Session | null = null;

    const detach = (): void => {
      if (!current) return;
      current.clients.delete(client);
      scheduleReap(current);
      current = null;
    };

    client.on("message", (raw) => {
      let message: TerminalClientMessage;
      try {
        message = JSON.parse(String(raw)) as TerminalClientMessage;
      } catch {
        send(client, { type: "error", message: "Malformed terminal message" });
        return;
      }

      switch (message.type) {
        case "open": {
          const session = resolveSession(client, message);
          if (session) {
            current = session;
            void attachClient(client, session, message);
          }
          break;
        }
        case "input":
          current?.process?.write(message.data);
          break;
        case "resize":
          if (current) resize(current, message.cols, message.rows);
          break;
        case "restart":
          if (current) void handleRestart(current, message.cols, message.rows);
          break;
      }
    });

    client.on("close", detach);
    client.on("error", detach);
  }

  /** Wires the endpoint onto an http server, replacing any previous wiring. */
  function attach(http: Server | null): void {
    if (!http || attached.has(http)) return;
    attached.add(http);

    // ws selects the first offered subprotocol, which is the constant name, so the
    // token the client sends alongside it is never echoed back.
    const sockets = new WebSocketServer({ noServer: true });
    sockets.on("connection", (client) => handleClient(client));

    http.on("upgrade", (request, socket, head) => {
      if (requestPath(request.url) !== endpoint) return;
      if (!isLoopback(request) || !isSameOrigin(request)) {
        refuseUpgrade(socket, "403 Forbidden");
        return;
      }
      if (!matchesToken(offeredToken(request))) {
        refuseUpgrade(socket, "401 Unauthorized");
        return;
      }
      sockets.handleUpgrade(request, socket, head, (client) => {
        sockets.emit("connection", client, request);
      });
    });

    http.on("close", () => {
      stopAll();
      sockets.close();
      attached.delete(http);
    });
  }

  /** Publishes the token and wires the endpoint onto a Vite server. */
  function wire(server: ViteDevServer | PreviewServer): void {
    root = server.config.root;
    server.middlewares.use((request, response, next) => {
      if (!handleTokenRequest(request, response)) next();
    });
    attach(server.httpServer as Server | null);
    server.config.logger.info(
      `\x1b[36m▶\x1b[0m live terminals on ${endpoint} (loopback only, token required)`,
    );
  }

  return {
    name: "stageroutine:terminal",
    configureServer(server) {
      wire(server);
    },
    configurePreviewServer(server) {
      wire(server);
    },
  };
}
