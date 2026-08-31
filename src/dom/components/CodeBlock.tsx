/**
 * Code snippet component with syntax highlighting powered by the Shiki TextMate engine
 * and interactive line/multi-line drag focus.
 */

import { codeToHtml } from "shiki";
import { getActiveStage } from "../../core/stage";
import { DOMElement, type ElementOptions } from "../element";
import { attachRangeSelection } from "../interaction";

/**
 * Configuration options for the syntax-highlighted CodeBlock component.
 * @category Components
 */
export interface CodeBlockOptions extends ElementOptions {
  lang?: string;
  theme?: string;
  className?: string;
  /** Whether clicking or dragging lines focuses them interactively. Defaults to true. */
  interactive?: boolean;
}

/**
 * @internal
 */
export interface CodeBlockElement extends DOMElement {
  readonly focusedRange: [number, number] | null;
  focusLines(start: number, end?: number): this;
  unfocus(): this;
}

/**
 * Code snippet component with syntax highlighting powered by the Shiki TextMate engine
 * and interactive line/multi-line drag focus.
 * @category Components
 */
export function CodeBlock(
  snippet: string | string[],
  options: CodeBlockOptions = {},
): CodeBlockElement {
  const lang = options.lang || "typescript";
  const theme = options.theme || "vitesse-dark";
  const classes = ["sr-code-block", options.className].filter(Boolean).join(" ");
  const isInteractive = options.interactive ?? true;

  const rawSnippet = Array.isArray(snippet) ? snippet.join("\n") : snippet;
  const trimmed = rawSnippet.trim();

  const preEl = document.createElement("pre");
  preEl.className = classes;

  const codeEl = document.createElement("code");
  preEl.appendChild(codeEl);

  let lineElements: HTMLElement[] = [];

  const setupLineElements = () => {
    // Remove whitespace text nodes between block line spans that cause double spacing
    for (const child of Array.from(codeEl.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE && !child.textContent?.trim()) {
        child.remove();
      }
    }

    const rawLines = Array.from(codeEl.querySelectorAll<HTMLElement>(".line"));
    if (rawLines.length > 0) {
      lineElements = rawLines;
    } else {
      // Fallback if shiki spans are not rendered yet
      const lines = trimmed.split("\n");
      codeEl.innerHTML = "";
      lineElements = lines.map((lineText) => {
        const span = document.createElement("span");
        span.className = "line";
        span.textContent = lineText || " ";
        codeEl.appendChild(span);
        return span;
      });
    }

    for (const line of lineElements) {
      line.classList.add("sr-code-line");
    }
  };

  // Initial fallback lines while Shiki loads
  setupLineElements();

  const controller = attachRangeSelection({
    container: preEl,
    getItems: () => lineElements,
    interactive: isInteractive,
  });

  // Highlight with Shiki TextMate engine
  codeToHtml(trimmed, { lang, theme })
    .then((html) => {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      const innerCode = temp.querySelector("code");
      if (innerCode) {
        codeEl.innerHTML = innerCode.innerHTML;
        setupLineElements();
        controller.refresh();
      }
    })
    .catch(() => {
      // Graceful fallback
    });

  const stage = getActiveStage();
  const domEl = new DOMElement("CodeBlock", preEl, options);
  const el = stage.registerElement(domEl) as unknown as CodeBlockElement;

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
