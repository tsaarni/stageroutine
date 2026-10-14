/**
 * Window chrome shared by TerminalBlock, LiveTerminal, and BrowserWindow:
 * control dots, title label, optional status light, and body scaffold.
 * @internal
 */

/** Tone of the header status light. */
export type WindowStatusTone = "live" | "idle" | "error";

/** Restart glyph, a circular arrow drawn from the current text colour. */
const RESTART_GLYPH = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12a9 9 0 1 1-2.6-6.4"/><path d="M21 3v5h-5"/></svg>`;

/** Header and body scaffold for window-frame elements. */
export interface WindowFrame {
  /** Outer element, positioned and sized by the stage. */
  root: HTMLDivElement;
  /** Content area below the header. */
  body: HTMLDivElement;
  /** Replaces the header label. */
  setTitle(title: string): void;
  /** Shows a header status label, or clears it when `text` is null. */
  setStatus(text: string | null, tone?: WindowStatusTone): void;
  /** Shows a restart button in the header, or removes it when `handler` is null. */
  setRestart(handler: (() => void) | null): void;
}

/**
 * Builds window chrome: three control dots, a title label, and an empty
 * body ready for a viewport or a transcript.
 */
export function createWindowFrame(
  options: { title?: string; className?: string } = {},
): WindowFrame {
  const root = document.createElement("div");
  root.className = ["sr-window-frame", options.className].filter(Boolean).join(" ");

  const header = document.createElement("div");
  header.className = "sr-window-header";

  for (const dot of ["red", "yellow", "green"]) {
    const control = document.createElement("div");
    control.className = `sr-window-dot ${dot}`;
    header.appendChild(control);
  }

  const title = document.createElement("span");
  title.className = "sr-window-title";
  title.textContent = options.title ?? "";
  header.appendChild(title);

  const body = document.createElement("div");
  root.append(header, body);

  let status: HTMLSpanElement | null = null;
  let restartButton: HTMLButtonElement | null = null;
  let restartHandler: (() => void) | null = null;

  const setStatus = (text: string | null, tone: WindowStatusTone = "idle"): void => {
    if (!text) {
      status?.remove();
      status = null;
      return;
    }
    if (!status) {
      status = document.createElement("span");
      header.appendChild(status);
    }
    status.className = `sr-window-status is-${tone}`;
    status.textContent = text;
  };

  const setRestart = (handler: (() => void) | null): void => {
    restartHandler = handler;

    if (handler && !restartButton) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "sr-window-action";
      button.title = "Restart session";
      button.setAttribute("aria-label", "Restart session");
      button.innerHTML = RESTART_GLYPH;
      button.addEventListener("click", (event) => {
        // Keep the click away from window handlers and the navigation keys, so a
        // restart does not double as a deck advance.
        event.stopPropagation();
        button.blur();
        restartHandler?.();
      });
      header.appendChild(button);
      restartButton = button;
      return;
    }

    if (!handler && restartButton) {
      restartButton.remove();
      restartButton = null;
    }
  };

  return {
    root,
    body,
    setTitle: (value) => {
      title.textContent = value;
    },
    setStatus,
    setRestart,
  };
}

/** Appends plain text lines to a body element and returns them for selection handling. */
export function createWindowLines(body: HTMLElement, lines: readonly string[]): HTMLElement[] {
  return lines.map((text) => {
    const line = document.createElement("div");
    line.className = "sr-terminal-line";
    line.textContent = text;
    body.appendChild(line);
    return line;
  });
}
