import type { DOMElement, ElementDecorator } from "../element";

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
 */
export function gradient(options: GradientOptions = {}): ElementDecorator {
  const { colors = DEFAULT_GRADIENT, flow = true, duration = 7, angle = 90 } = options;

  return (element: DOMElement) => {
    const el = element.domElement;

    el.style.background = `linear-gradient(${angle}deg, ${colors.join(", ")})`;
    el.style.webkitBackgroundClip = "text";
    el.style.webkitTextFillColor = "transparent";
    el.style.display = "inline-block";

    if (flow) {
      el.style.backgroundSize = "200% auto";
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
      appendAnimation(el, `${animName} ${duration}s linear infinite`);
    } else {
      el.style.backgroundSize = "100% auto";
    }
  };
}
