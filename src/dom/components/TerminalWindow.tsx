/**
 * Terminal window component with macOS-style window controls and line-by-line interactive focus.
 */

import { getActiveStage } from "../../core/stage";
import { DOMElement, type ElementOptions } from "../element";
import { attachRangeSelection } from "../interaction";

/**
 * Properties for configuring the TerminalWindow component.
 * @category Components
 */
export interface TerminalWindowProps extends ElementOptions {
  title?: string;
  lines?: string[];
  className?: string;
  /** Whether clicking or dragging lines focuses them interactively. Defaults to true. */
  interactive?: boolean;
}

/**
 * @internal
 */
export interface TerminalWindowElement extends DOMElement {
  readonly focusedRange: [number, number] | null;
  focusLines(start: number, end?: number): this;
  unfocus(): this;
}

/**
 * Terminal window component with macOS-style window controls and line-by-line interactive focus.
 * @category Components
 */
export function TerminalWindow(props: TerminalWindowProps = {}): TerminalWindowElement {
  const lines = props.lines || [
    "$ pnpm create stageroutine@latest my-talk",
    "✔ Initialized reactive stage runtime",
    "⚡ Stage live on http://localhost:5173",
  ];
  const classes = ["sr-terminal-window", props.className].filter(Boolean).join(" ");
  const isInteractive = props.interactive ?? true;

  const container = document.createElement("div");
  container.className = classes;

  const header = document.createElement("div");
  header.className = "sr-terminal-header";
  header.innerHTML = `
    <div class="sr-terminal-dot red"></div>
    <div class="sr-terminal-dot yellow"></div>
    <div class="sr-terminal-dot green"></div>
    <span class="sr-terminal-title">${props.title || "bash - 80x24"}</span>
  `;
  container.appendChild(header);

  const body = document.createElement("div");
  body.className = "sr-terminal-body";
  container.appendChild(body);

  const rawLineElements: HTMLElement[] = [];
  for (const lineText of lines) {
    const lineEl = document.createElement("div");
    lineEl.className = "sr-terminal-line";
    lineEl.textContent = lineText;
    body.appendChild(lineEl);
    rawLineElements.push(lineEl);
  }

  const controller = attachRangeSelection({
    container: body,
    getItems: () => rawLineElements,
    interactive: isInteractive,
  });

  const stage = getActiveStage();
  const domEl = new DOMElement("TerminalWindow", container, props);
  const el = stage.registerElement(domEl) as unknown as TerminalWindowElement;

  el.focusLines = function (start: number, end: number = start) {
    controller.focus(start, end);
    return this;
  };

  el.unfocus = function () {
    controller.unfocus();
    return this;
  };

  Object.defineProperty(el, "focusedRange", {
    get() {
      return controller.focusedRange;
    },
    enumerable: true,
  });

  return el;
}
