/**
 * Darkens the edges of the stage to draw viewer attention toward the center.
 */

import type { Background, ReactiveElementBase } from "../core/types";
import type { DOMElement } from "../dom/element";

/**
 * Configuration options for the radial dark vignette decorator.
 * @category Decorators
 */
export interface VignetteOptions {
  /** Vignette color (default: "#09090b"). */
  color?: string;
  /** Center darkness opacity from 0 to 1 (default: 0.9). */
  opacity?: number;
  /** Custom radial gradient falloff shape (default: "ellipse 55% 55% at 50% 50%"). */
  shape?: string;
}

function createVignetteElement(options: VignetteOptions): HTMLDivElement {
  const { color = "#09090b", opacity = 0.9, shape = "ellipse 55% 55% at 50% 50%" } = options;

  const overlay = document.createElement("div");
  overlay.className = "sr-vignette";
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.width = "100%";
  overlay.style.height = "100%";
  overlay.style.background = `radial-gradient(${shape}, ${color} 0%, rgba(9, 9, 11, 0.85) 45%, rgba(9, 9, 11, 0) 80%)`;
  overlay.style.opacity = `${opacity}`;
  overlay.style.pointerEvents = "none";
  overlay.style.borderRadius = "inherit";
  overlay.style.zIndex = "0";
  return overlay;
}

/**
 * Decorates an element or background with a radial dark vignette.
 * @category Decorators
 */
export function vignette(options: VignetteOptions = {}) {
  return (target: DOMElement | Background | ReactiveElementBase | HTMLElement) => {
    const el =
      "domElement" in target && target.domElement ? target.domElement : (target as HTMLElement);
    const overlay = createVignetteElement(options);
    el.style.position = el.style.position || "relative";
    el.appendChild(overlay);
  };
}
