/**
 * Code snippet component with syntax highlighting powered by the Shiki TextMate engine
 * and interactive line/multi-line drag focus.
 */

import "./CodeBlock.css";
import { codeToHtml } from "shiki";
import { getActiveStage } from "../../core/stage";
import { DOMElement, type ElementOptions } from "../element";
import { attachRangeSelection } from "../interaction";

/**
 * Configuration options for the syntax-highlighted CodeBlock component.
 * @category Components
 * @inline
 */
export interface CodeBlockOptions extends Omit<ElementOptions, "theme"> {
  lang?: string;
  /** Shiki syntax highlighting theme (e.g. "vitesse-dark", "github-dark") or Stage ThemeConfig */
  theme?: string | ElementOptions["theme"];
  className?: string;
  /** Whether clicking or dragging lines focuses them interactively. Defaults to true. */
  interactive?: boolean;
}

/** Public controls for a code block. @category Components */
export interface CodeBlockElement extends DOMElement {}

/**
 * @internal
 */
class CodeBlockElementImpl extends DOMElement implements CodeBlockElement {
  constructor(snippet: string | string[], options: CodeBlockOptions = {}) {
    const lang = options.lang || "typescript";
    const shikiTheme = typeof options.theme === "string" ? options.theme : "vitesse-dark";
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
    codeToHtml(trimmed, { lang, theme: shikiTheme })
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

    const elementTheme = typeof options.theme === "object" ? options.theme : undefined;
    super("CodeBlock", preEl, { ...options, theme: elementTheme });
  }
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
  const stage = getActiveStage();
  const el = new CodeBlockElementImpl(snippet, options);
  return stage ? (stage.registerElement(el) as CodeBlockElement) : el;
}
