/**
 * Applies a smooth color gradient to text or elements, with optional flowing animation.
 */

import type { DOMElement, ElementDecorator } from "../dom/element";

/**
 * Configuration options for the linear gradient text decorator.
 * @category Decorators
 * @inline
 */
export interface GradientOptions {
  /** Array of CSS color stops for the gradient. */
  colors?: string[];
  /** Whether the gradient should animate/flow continuously (default: true). */
  flow?: boolean;
  /** Animation cycle duration in seconds if flow is enabled (default: 7). */
  duration?: number;
  /** Gradient angle in degrees (default: 90). */
  angle?: number;
}

/**
 * Decorates an element with a linear gradient text effect and optional flowing animation.
 * @category Decorators
 */
export function gradient(options: GradientOptions = {}): ElementDecorator {
  const { colors, flow = true, duration = 7, angle = 90 } = options;

  return (element: DOMElement) => {
    const el = element.domElement;

    // Apply the text clip to an inner span: Firefox renders nothing when
    // background-clip:text shares an element with filter (e.g. from glow()).
    const inner = document.createElement("span");
    inner.append(...el.childNodes);
    el.appendChild(inner);

    el.classList.add("sr-gradient");
    inner.className = "sr-gradient-text";
    inner.classList.toggle("sr-gradient-flow", flow);
    inner.style.setProperty("--sr-gradient-angle", `${angle}deg`);
    inner.style.setProperty("--sr-gradient-duration", `${duration}s`);
    if (colors) inner.style.setProperty("--sr-gradient-colors", colors.join(", "));
  };
}
