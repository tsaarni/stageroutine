/**
 * Places a soft dark underlay behind text or elements to keep them readable over busy backgrounds.
 */

import type { DOMElement, ElementDecorator } from "../dom/element";

export interface ScrimOptions {
  /** Background darkness opacity from 0 to 1 (default: 0.85). */
  opacity?: number;
  /** Color of the radial dark aura (default: "#09090b"). */
  color?: string;
  /** Horizontal and vertical expansion/spread factor (default: "medium"). */
  spread?: "tight" | "medium" | "wide" | { x: number; y: number };
  /** Optional backdrop blur in pixels behind the scrim (default: 0). */
  blur?: number;
}

/**
 * Decorates an element with a soft radial dark aura underlay to make foreground text pop from busy animated backgrounds.
 */
export function scrim(options: ScrimOptions = {}): ElementDecorator {
  const { opacity = 0.85, color = "#09090b", spread = "medium", blur = 0 } = options;

  let insetY = "-50%";
  let insetX = "-25%";
  if (spread === "tight") {
    insetY = "-25%";
    insetX = "-12%";
  } else if (spread === "wide") {
    insetY = "-90%";
    insetX = "-45%";
  } else if (typeof spread === "object") {
    insetY = `-${spread.y}%`;
    insetX = `-${spread.x}%`;
  }

  return (element: DOMElement) => {
    const el = element.domElement;
    const scrimEl = document.createElement("div");
    scrimEl.className = "sr-scrim";
    scrimEl.style.position = "absolute";
    scrimEl.style.top = insetY;
    scrimEl.style.bottom = insetY;
    scrimEl.style.left = insetX;
    scrimEl.style.right = insetX;
    scrimEl.style.background = `radial-gradient(ellipse at center, ${color} 0%, transparent 75%)`;
    scrimEl.style.opacity = `${opacity}`;
    scrimEl.style.zIndex = "-1";
    scrimEl.style.pointerEvents = "none";
    scrimEl.style.borderRadius = "50%";

    if (blur > 0) {
      scrimEl.style.backdropFilter = `blur(${blur}px)`;
      scrimEl.style.setProperty("-webkit-backdrop-filter", `blur(${blur}px)`);
    }

    el.insertBefore(scrimEl, el.firstChild);
  };
}
