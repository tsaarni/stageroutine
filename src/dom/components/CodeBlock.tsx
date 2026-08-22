/**
 * Code snippet component with syntax highlighting powered by the Shiki TextMate engine.
 */

import { codeToHtml } from "shiki";
import type { ReactiveElementBase } from "../../core/index";
import type { ElementOptions } from "../element";

export interface CodeBlockOptions extends ElementOptions {
  lang?: string;
  theme?: string;
  className?: string;
}

export function CodeBlock(snippet: string, options: CodeBlockOptions = {}): ReactiveElementBase {
  const lang = options.lang || "typescript";
  const theme = options.theme || "vitesse-dark";
  const classes = ["sr-code-block", options.className].filter(Boolean).join(" ");

  const trimmed = snippet.trim();
  const el = (
    <pre className={classes} {...options}>
      <code>{trimmed}</code>
    </pre>
  ) as unknown as ReactiveElementBase;

  // Asynchronously highlight with Shiki TextMate engine
  codeToHtml(trimmed, { lang, theme })
    .then((html) => {
      const temp = document.createElement("div");
      temp.innerHTML = html;
      const innerCode = temp.querySelector("code");
      if (innerCode && el.domElement) {
        el.domElement.innerHTML = innerCode.innerHTML;
      }
    })
    .catch(() => {
      // Graceful fallback to plain text if network or language lookup fails
    });

  return el;
}
