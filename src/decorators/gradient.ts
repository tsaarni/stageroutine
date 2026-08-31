/**
 * Applies a smooth color gradient to text or elements, with optional flowing animation.
 */

import type { DOMElement, ElementDecorator } from "../dom/element";

/**
 * Configuration options for the linear gradient text decorator.
 * @category Decorators
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

const DEFAULT_GRADIENT = [
  "#a78bfa 0%",
  "#e0e7ff 22%",
  "#ffffff 35%",
  "#bae6fd 48%",
  "#c4b5fd 65%",
  "#a78bfa 100%",
];

let flowCounter = 0;

function injectKeyframes(name: string, body: string) {
  if (typeof document === "undefined") return;
  let styleTag = document.getElementById("sr-decorators-style") as HTMLStyleElement;
  if (!styleTag) {
    styleTag = document.createElement("style");
    styleTag.id = "sr-decorators-style";
    document.head.appendChild(styleTag);
  }
  styleTag.textContent += `\n@keyframes ${name} {\n${body}\n}`;
}

/**
 * @internal
 */
export function appendAnimation(el: HTMLElement, animDef: string) {
  const current = el.style.animation
    ? el.style.animation
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  current.push(animDef);
  el.style.animation = current.join(", ");
}

/**
 * Decorates an element with a linear gradient text effect and optional flowing animation.
 * @category Decorators
 */
export function gradient(options: GradientOptions = {}): ElementDecorator {
  const { colors = DEFAULT_GRADIENT, flow = true, duration = 7, angle = 90 } = options;

  return (element: DOMElement) => {
    const el = element.domElement;

    // Apply the text clip to an inner span: Firefox renders nothing when
    // background-clip:text shares an element with filter (e.g. from glow()).
    const inner = document.createElement("span");
    inner.append(...el.childNodes);
    el.appendChild(inner);

    inner.style.background = `linear-gradient(${angle}deg, ${colors.join(", ")})`;
    inner.style.backgroundClip = "text";
    inner.style.webkitBackgroundClip = "text";
    inner.style.webkitTextFillColor = "transparent";
    inner.style.display = "inline-block";
    el.style.display = "inline-block";

    if (flow) {
      inner.style.backgroundSize = "200% auto";
      const animName = `sr-neon-sweep-${flowCounter++}`;
      injectKeyframes(
        animName,
        `  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }`,
      );
      appendAnimation(inner, `${animName} ${duration}s linear infinite`);
    } else {
      inner.style.backgroundSize = "100% auto";
    }
  };
}
