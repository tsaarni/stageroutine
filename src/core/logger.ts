/**
 * Minimal logging API with configurable log levels.
 *
 * Default level is `"warn"` so only warnings and errors are emitted.
 * Set to `"debug"` for verbose output during development, or `"silent"`
 * to suppress all output.
 *
 * @example
 * ```typescript
 * import { logger } from "stageroutine";
 * logger.setLevel("debug");
 * ```
 *
 * @category Core
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "silent";

const levels: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  silent: 4,
};

let currentLevel: LogLevel = "warn";

const prefix = "[StageRoutine]";

export const logger = {
  /** Set the minimum log level. Messages below this level are suppressed. */
  setLevel(level: LogLevel) {
    currentLevel = level;
  },

  /** Return the current log level. */
  getLevel(): LogLevel {
    return currentLevel;
  },

  debug(...args: unknown[]) {
    if (levels[currentLevel] <= levels.debug) console.debug(prefix, ...args);
  },

  info(...args: unknown[]) {
    if (levels[currentLevel] <= levels.info) console.info(prefix, ...args);
  },

  warn(...args: unknown[]) {
    if (levels[currentLevel] <= levels.warn) console.warn(prefix, ...args);
  },

  error(...args: unknown[]) {
    if (levels[currentLevel] <= levels.error) console.error(prefix, ...args);
  },
};
