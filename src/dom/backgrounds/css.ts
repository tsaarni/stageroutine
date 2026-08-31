/**
 * Full-screen background styled with standard CSS colors, gradients, or patterns.
 */

import { DOMElement, type ElementOptions } from "../element";

/**
 * Configuration options for full-bleed CSS backgrounds.
 * @category Backgrounds
 */
export interface CSSBackgroundOptions extends ElementOptions {
  /** Standard CSS background value (color, gradient, or url). */
  background?: string;
}

/**
 * Full-bleed DOM background element styled with standard CSS.
 * @internal
 */
export class CSSBackgroundElement extends DOMElement {
  constructor(options: CSSBackgroundOptions = {}) {
    const div = document.createElement("div");
    div.className = "sr-background sr-bg-css";

    super("CSSBackground", div, options);

    this.domElement.style.position = "absolute";
    this.domElement.style.inset = "0";
    this.domElement.style.width = "100%";
    this.domElement.style.height = "100%";
    this.domElement.style.transform = "none";
    this.domElement.style.transformOrigin = "0 0";
    this.domElement.style.zIndex = "0";
    this.domElement.style.pointerEvents = "none";

    if (options.background) {
      this.domElement.style.background = options.background;
    }
  }
}

/**
 * Creates a full-bleed CSS background supporting colors, gradients, and images.
 *
 * @category Backgrounds
 * @example
 * ```ts
 * CSSBackground("#0f172a");
 * CSSBackground("linear-gradient(135deg, #1e293b, #0f172a)");
 * CSSBackground("url('/wallpaper.jpg') center / cover no-repeat");
 * ```
 */
export function CSSBackground(
  cssOrOptions: string | CSSBackgroundOptions = {},
): CSSBackgroundElement {
  const options = typeof cssOrOptions === "string" ? { background: cssOrOptions } : cssOrOptions;
  return new CSSBackgroundElement(options);
}
