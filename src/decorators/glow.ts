import type { DOMElement, ElementDecorator } from "../dom/element";
import { appendAnimation } from "./gradient";

export interface GlowOptions {
  /** Whether the glow breathes/animates (default: true). */
  pulse?: boolean;
  /** Animation cycle duration in seconds if pulse is enabled (default: 4). */
  duration?: number;
}

let glowCounter = 0;

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

const BASE_FILTER =
  "drop-shadow(0 0 6px rgba(192, 132, 252, 0.65)) drop-shadow(0 0 22px rgba(167, 139, 250, 0.45)) drop-shadow(0 0 48px rgba(147, 51, 234, 0.25))";

const PEAK_FILTER =
  "drop-shadow(0 0 10px rgba(192, 132, 252, 0.85)) drop-shadow(0 0 32px rgba(167, 139, 250, 0.6)) drop-shadow(0 0 65px rgba(147, 51, 234, 0.35))";

/**
 * Decorates an element with the exact multi-layered neon glow effect with optional breathing animation.
 */
export function glow(options: GlowOptions = {}): ElementDecorator {
  const { pulse = true, duration = 4 } = options;

  return (element: DOMElement) => {
    const el = element.domElement;

    el.style.filter = BASE_FILTER;
    el.style.display = "inline-block";

    if (pulse) {
      const animName = `sr-neon-bloom-${glowCounter++}`;
      injectKeyframes(
        animName,
        `  0%,
  100% {
    filter: ${BASE_FILTER};
  }
  50% {
    filter: ${PEAK_FILTER};
  }`,
      );
      appendAnimation(el, `${animName} ${duration}s ease-in-out infinite`);
    }
  };
}
