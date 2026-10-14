/**
 * Adds a soft glowing light effect behind an element, with an optional pulsing animation.
 */

import type { DOMElement, ElementDecorator } from "../dom/element";

/**
 * Configuration options for the glow decorator.
 * @category Decorators
 * @inline
 */
export interface GlowOptions {
  /** Whether the glow pulses continuously (default: true). */
  pulse?: boolean;
  /** Animation cycle duration in seconds if pulse is enabled (default: 4). */
  duration?: number;
}

/**
 * Decorates an element with a glowing neon aura and optional pulse animation.
 * @category Decorators
 */
export function glow(options: GlowOptions = {}): ElementDecorator {
  const { pulse = true, duration = 4 } = options;

  return (element: DOMElement) => {
    const el = element.domElement;

    el.classList.add("sr-glow");
    el.classList.toggle("sr-glow-pulse", pulse);
    el.style.setProperty("--sr-glow-duration", `${duration}s`);
  };
}
