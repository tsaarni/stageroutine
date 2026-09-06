/**
 * Terminal window component with macOS-style window controls and line-by-line interactive focus.
 */

import "./TerminalWindow.css";
import { getActiveStage } from "../../core/stage";
import { DOMElement, type ElementOptions } from "../element";
import { attachRangeSelection } from "../interaction";

/**
 * Properties for configuring the TerminalWindow component.
 * @category Components
 */
export interface TerminalWindowProps extends ElementOptions {
  /** Window title bar label (default: "bash - 80x24"). */
  title?: string;
  /** Command-line output lines to display. */
  lines?: string[];
  /** Additional CSS class name. */
  className?: string;
  /** Whether clicking or dragging lines focuses them interactively (default: true). */
  interactive?: boolean;
}

/**
 * @internal
 */
export class TerminalWindowElement extends DOMElement {
  private controller: ReturnType<typeof attachRangeSelection>;

  get focusedRange(): [number, number] | null {
    return this.controller.focusedRange;
  }

  get focusedIndex(): number | null {
    return this.controller.focusedIndex;
  }

  constructor(props: TerminalWindowProps = {}) {
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

    super("TerminalWindow", container, props);

    this.controller = controller;
  }

  focusLines(start: number, end: number = start): this {
    this.controller.focus(start, end);
    return this;
  }

  unfocus(): this {
    this.controller.unfocus();
    return this;
  }
}

/**
 * Terminal window component with macOS-style window controls and line-by-line interactive focus.
 * @category Components
 */
export function TerminalWindow(props: TerminalWindowProps = {}): TerminalWindowElement {
  const stage = getActiveStage();
  const el = new TerminalWindowElement(props);
  return stage ? (stage.registerElement(el) as TerminalWindowElement) : el;
}
