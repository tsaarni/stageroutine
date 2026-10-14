/**
 * Terminal block component with macOS-style window controls and line-by-line interactive focus.
 */

import "./TerminalBlock.css";
import { type DOMElement, DOMElementImpl, type ElementOptions, mount } from "../element";
import { attachRangeSelection } from "../interaction";
import { createWindowFrame, createWindowLines } from "./WindowFrame";

/**
 * Options for configuring the TerminalBlock component.
 * @category Components
 * @inline
 */
export interface TerminalBlockOptions extends ElementOptions {
  /** Window title bar label (default: "bash - 80x24"). */
  title?: string;
  /** Command-line output lines to display. */
  lines?: readonly string[];
  /** Additional CSS class name. */
  className?: string;
  /** Whether clicking or dragging lines focuses them interactively (default: true). */
  interactive?: boolean;
}

/** Public controls for a terminal block. @category Components */
export interface TerminalBlockElement extends DOMElement {
  title: string;
  lines: readonly string[];
}

/**
 * @internal
 */
class TerminalBlockElementImpl extends DOMElementImpl implements TerminalBlockElement {
  static override _reactiveKeys: ReadonlySet<string> = new Set([
    ...DOMElementImpl._reactiveKeys,
    "title",
    "lines",
  ]);
  private titleValue = "";
  private linesValue: readonly string[] = [];
  private replaceTitle: (title: string) => void = () => {};
  private replaceLines: (lines: readonly string[]) => void = () => {};
  get title(): string {
    return this.titleValue;
  }
  set title(value: string) {
    this.titleValue = value;
    this.replaceTitle(value);
  }
  get lines(): readonly string[] {
    return [...this.linesValue];
  }
  set lines(value: readonly string[]) {
    this.linesValue = [...value];
    this.replaceLines(value);
  }
  constructor(options: TerminalBlockOptions = {}) {
    const lines = options.lines || [];
    const isInteractive = options.interactive ?? true;

    const frame = createWindowFrame({
      title: options.title || "bash - 80x24",
      className: ["sr-terminal-block", options.className].filter(Boolean).join(" "),
    });
    frame.body.className = "sr-terminal-body";

    let lineElements = createWindowLines(frame.body, [...lines]);

    const controller = attachRangeSelection({
      container: frame.body,
      getItems: () => lineElements,
      interactive: isInteractive,
    });

    super("TerminalBlock", frame.root, options);

    this.titleValue = options.title ?? "bash - 80x24";
    this.linesValue = [...lines];
    this.replaceTitle = frame.setTitle;
    this.replaceLines = (values) => {
      frame.body.replaceChildren();
      lineElements = createWindowLines(frame.body, [...values]);
      controller.refresh();
    };
    this.onUnmount(() => controller.destroy());
  }
}

/**
 * Terminal block component with macOS-style window controls and line-by-line interactive focus.
 * @category Components
 */
export function TerminalBlock(options: TerminalBlockOptions = {}): TerminalBlockElement {
  return mount(new TerminalBlockElementImpl(options));
}
