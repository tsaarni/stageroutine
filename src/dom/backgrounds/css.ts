/**
 * Full-screen background styled with standard CSS colors, gradients, or patterns.
 */

import type { Background, BackgroundDecorator, StageContext } from "../../core/types";
import type { BackgroundOptions } from "./base";

/**
 * Configuration options for full-bleed CSS backgrounds.
 * @category Backgrounds
 */
export interface CSSBackgroundOptions extends BackgroundOptions {
  /** Standard CSS background value (color, gradient, or url). */
  background?: string;
}

/**
 * Full-bleed DOM background element styled with standard CSS.
 * @internal
 */
export interface CSSBackgroundElement extends Background {
  background: string;
}

/** @internal */
class CSSBackgroundElementImpl implements CSSBackgroundElement {
  /** @internal */
  readonly _reactiveKeys: ReadonlySet<string> = new Set(["opacity", "background"]);
  get opacity(): number {
    const value = Number.parseFloat(this.domElement.style.opacity);
    return Number.isNaN(value) ? 1 : value;
  }
  set opacity(value: number) {
    this.domElement.style.opacity = String(value);
  }
  get background(): string {
    return this.domElement.style.background;
  }
  set background(value: string) {
    this.domElement.style.background = value;
  }
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
      opacity: this.opacity,
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
export function CSSBackground(
  cssOrOptions: string | CSSBackgroundOptions = {},
): CSSBackgroundElement {
  const options = typeof cssOrOptions === "string" ? { background: cssOrOptions } : cssOrOptions;
  return new CSSBackgroundElementImpl(options);
}
