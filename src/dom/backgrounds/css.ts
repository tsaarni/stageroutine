/**
 * Full-screen background styled with standard CSS colors, gradients, or patterns.
 */

import type { Background, BackgroundDecorator, StageContext } from "../../core/types";

/**
 * Configuration options for full-bleed CSS backgrounds.
 * @category Backgrounds
 */
export interface CSSBackgroundOptions {
  id?: string;
  className?: string;
  /** Standard CSS background value (color, gradient, or url). */
  background?: string;
  /** Optional initial opacity (default: 1). */
  opacity?: number;
}

/**
 * Full-bleed DOM background element styled with standard CSS.
 * @internal
 */
export class CSSBackgroundElement implements Background {
  readonly id: string;
  readonly kind = "CSSBackground";
  readonly domElement: HTMLElement;

  constructor(options: CSSBackgroundOptions = {}) {
    this.id = options.id || "bg-css";
    const div = document.createElement("div");
    div.className = `sr-background sr-bg-css${options.className ? ` ${options.className}` : ""}`;
    div.style.position = "absolute";
    div.style.inset = "0";
    div.style.width = "100%";
    div.style.height = "100%";
    div.style.zIndex = "0";
    div.style.pointerEvents = "none";
    if (options.opacity !== undefined) {
      div.style.opacity = `${options.opacity}`;
    }
    if (options.background) {
      div.style.background = options.background;
    }
    this.domElement = div;
  }

  decorate(decorator: BackgroundDecorator): this {
    decorator(this);
    return this;
  }

  attach(stage: StageContext): void {
    if (!this.domElement.parentElement) {
      stage.container.prepend(this.domElement);
    }
  }

  /** @internal */
  _getMetrics(): Record<string, unknown> {
    return {
      kind: this.kind,
      is_mounted: Boolean(this.domElement.isConnected),
      opacity: Number.parseFloat(this.domElement.style.opacity) || 1,
    };
  }

  dispose(): void {
    this.domElement.remove();
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
export function CSSBackground(cssOrOptions: string | CSSBackgroundOptions = {}): Background {
  const options = typeof cssOrOptions === "string" ? { background: cssOrOptions } : cssOrOptions;
  return new CSSBackgroundElement(options);
}
