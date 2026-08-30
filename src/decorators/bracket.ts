/**
 * Attaches grouping brackets (curly braces, square brackets, parentheses, or 4-corner HUD marks)
 * to an element, with optional apex label badges and neon glow.
 */

import type { DOMElement, ElementDecorator } from "../dom/element";

export type BracketStyle = "curly" | "square" | "round" | "corners";

export interface BracketOptions {
  /** Bracket style: "curly" (default), "square", "round", or "corners". */
  style?: BracketStyle;
  /** Which side the bracket sits on ("left" | "right" | "top" | "bottom", default: "left"). */
  side?: "left" | "right" | "top" | "bottom";
  /** Optional label text placed at the bracket apex/center. */
  label?: string;
  /** Solid stroke color (default: "rgba(255, 255, 255, 0.25)"). */
  color?: string;
  /** Bracket stroke thickness in pixels (default: 1.5). */
  strokeWidth?: number;
  /** Bracket depth / breadth in pixels (default: 16). */
  depth?: number;
  /** Spacing distance between element border and bracket in pixels (default: 8). */
  offset?: number;
  /** Corner radius / curvature in pixels (default: 8). */
  radius?: number;
  /** Dashed stroke pattern. */
  dashed?: boolean;
  /** Dotted stroke pattern. */
  dotted?: boolean;
  /** Whether the bracket emits a neon bloom glow (default: false). */
  glow?: boolean | string;
  /** Additional CSS class name. */
  className?: string;
}

function createSvg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function buildBracketPath(
  style: BracketStyle,
  side: "left" | "right" | "top" | "bottom",
  w: number,
  h: number,
  r: number,
): string {
  if (style === "corners") {
    const len = Math.min(w, h, r * 2);
    return [
      `M 0 ${len} L 0 0 L ${len} 0`,
      `M ${w - len} 0 L ${w} 0 L ${w} ${len}`,
      `M 0 ${h - len} L 0 ${h} L ${len} ${h}`,
      `M ${w - len} ${h} L ${w} ${h} L ${w} ${h - len}`,
    ].join(" ");
  }

  if (style === "round") {
    if (side === "left") return `M ${w} 0 C 0 ${h * 0.25}, 0 ${h * 0.75}, ${w} ${h}`;
    if (side === "right") return `M 0 0 C ${w} ${h * 0.25}, ${w} ${h * 0.75}, 0 ${h}`;
    if (side === "top") return `M 0 ${h} C ${w * 0.25} 0, ${w * 0.75} 0, ${w} ${h}`;
    if (side === "bottom") return `M 0 0 C ${w * 0.25} ${h}, ${w * 0.75} ${h}, ${w} 0`;
  }

  if (style === "square") {
    const cornerR = Math.min(r, w / 2, h / 2);
    if (side === "left") {
      return cornerR > 0
        ? `M ${w} 0 L ${cornerR} 0 Q 0 0 0 ${cornerR} L 0 ${h - cornerR} Q 0 ${h} ${cornerR} ${h} L ${w} ${h}`
        : `M ${w} 0 L 0 0 L 0 ${h} L ${w} ${h}`;
    }
    if (side === "right") {
      return cornerR > 0
        ? `M 0 0 L ${w - cornerR} 0 Q ${w} 0 ${w} ${cornerR} L ${w} ${h - cornerR} Q ${w} ${h} ${w - cornerR} ${h} L 0 ${h}`
        : `M 0 0 L ${w} 0 L ${w} ${h} L 0 ${h}`;
    }
    if (side === "top") {
      return cornerR > 0
        ? `M 0 ${h} L 0 ${cornerR} Q 0 0 ${cornerR} 0 L ${w - cornerR} 0 Q ${w} 0 ${w} ${cornerR} L ${w} ${h}`
        : `M 0 ${h} L 0 0 L ${w} 0 L ${w} ${h}`;
    }
    if (side === "bottom") {
      return cornerR > 0
        ? `M 0 0 L 0 ${h - cornerR} Q 0 ${h} ${cornerR} ${h} L ${w - cornerR} ${h} Q ${w} ${h} ${w} ${h - cornerR} L ${w} 0`
        : `M 0 0 L 0 ${h} L ${w} ${h} L ${w} 0`;
    }
  }

  // Default: Typographic Curly Brace ({ / })
  const k = 0.55228475; // Standard cubic bezier circle/quadrant constant
  const midX = w / 2;
  const midY = h / 2;

  if (side === "left") {
    const rY = Math.min(r, h / 4);
    return [
      `M ${w} 0`,
      `C ${w - (w - midX) * k} 0, ${midX} ${rY * (1 - k)}, ${midX} ${rY}`,
      `L ${midX} ${midY - rY}`,
      `C ${midX} ${midY - rY * (1 - k)}, ${midX * (1 - k)} ${midY}, 0 ${midY}`,
      `C ${midX * (1 - k)} ${midY}, ${midX} ${midY + rY * (1 - k)}, ${midX} ${midY + rY}`,
      `L ${midX} ${h - rY}`,
      `C ${midX} ${h - rY * (1 - k)}, ${w - (w - midX) * k} ${h}, ${w} ${h}`,
    ].join(" ");
  }

  if (side === "right") {
    const rY = Math.min(r, h / 4);
    return [
      "M 0 0",
      `C ${midX * k} 0, ${midX} ${rY * (1 - k)}, ${midX} ${rY}`,
      `L ${midX} ${midY - rY}`,
      `C ${midX} ${midY - rY * (1 - k)}, ${w - (w - midX) * (1 - k)} ${midY}, ${w} ${midY}`,
      `C ${w - (w - midX) * (1 - k)} ${midY}, ${midX} ${midY + rY * (1 - k)}, ${midX} ${midY + rY}`,
      `L ${midX} ${h - rY}`,
      `C ${midX} ${h - rY * (1 - k)}, ${midX * k} ${h}, 0 ${h}`,
    ].join(" ");
  }

  if (side === "top") {
    const rX = Math.min(r, w / 4);
    return [
      `M 0 ${h}`,
      `C 0 ${h - (h - midY) * k}, ${rX * (1 - k)} ${midY}, ${rX} ${midY}`,
      `L ${midX - rX} ${midY}`,
      `C ${midX - rX * (1 - k)} ${midY}, ${midX} ${midY * (1 - k)}, ${midX} 0`,
      `C ${midX} ${midY * (1 - k)}, ${midX + rX * (1 - k)} ${midY}, ${midX + rX} ${midY}`,
      `L ${w - rX} ${midY}`,
      `C ${w - rX * (1 - k)} ${midY}, ${w} ${h - (h - midY) * k}, ${w} ${h}`,
    ].join(" ");
  }

  // side === "bottom"
  const rX = Math.min(r, w / 4);
  return [
    "M 0 0",
    `C 0 ${midY * k}, ${rX * (1 - k)} ${midY}, ${rX} ${midY}`,
    `L ${midX - rX} ${midY}`,
    `C ${midX - rX * (1 - k)} ${midY}, ${midX} ${h - (h - midY) * (1 - k)}, ${midX} ${h}`,
    `C ${midX} ${h - (h - midY) * (1 - k)}, ${midX + rX * (1 - k)} ${midY}, ${midX + rX} ${midY}`,
    `L ${w - rX} ${midY}`,
    `C ${w - rX * (1 - k)} ${midY}, ${w} ${midY * k}, ${w} 0`,
  ].join(" ");
}

/**
 * Decorates an element with a grouping bracket (curly brace, square bracket, or corner frame).
 */
export function bracket(options: BracketOptions = {}): ElementDecorator {
  const {
    style = "curly",
    side = "left",
    label,
    color = "rgba(255, 255, 255, 0.25)",
    strokeWidth = 1.5,
    depth = 24,
    offset = 10,
    radius = 24,
    dashed = false,
    dotted = false,
    glow: glowOpt = false,
    className,
  } = options;

  return (element: DOMElement) => {
    const el = element.domElement;
    if (!el) return;

    if (typeof window !== "undefined" && getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    } else {
      el.style.position = el.style.position || "relative";
    }

    const container = document.createElement("div");
    container.className = ["sr-bracket-container", className].filter(Boolean).join(" ");
    container.style.position = "absolute";
    container.style.pointerEvents = "none";
    container.style.zIndex = "3";
    container.style.overflow = "visible";

    const svg = createSvg("svg", {
      class: "sr-bracket-svg",
      fill: "none",
      stroke: color,
      "stroke-width": strokeWidth,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.overflow = "visible";

    const path = createSvg("path", { class: "sr-bracket-path" });
    if (dotted) {
      path.setAttribute("stroke-dasharray", "3 6");
    } else if (dashed) {
      path.setAttribute("stroke-dasharray", "6 4");
    }
    svg.appendChild(path);
    container.appendChild(svg);

    // Optional Apex Label Badge
    let labelNode: HTMLElement | null = null;
    if (label) {
      labelNode = document.createElement("span");
      labelNode.className = "sr-bracket-label";
      labelNode.textContent = label;
      labelNode.style.position = "absolute";
      labelNode.style.fontFamily = "var(--sr-font-mono, monospace)";
      labelNode.style.fontSize = "0.75rem";
      labelNode.style.fontWeight = "500";
      labelNode.style.letterSpacing = "0.05em";
      labelNode.style.color = color.startsWith("rgba") ? "#94a3b8" : color;
      labelNode.style.whiteSpace = "nowrap";
      labelNode.style.pointerEvents = "none";
      container.appendChild(labelNode);
    }

    if (glowOpt) {
      const glowColor = typeof glowOpt === "string" ? glowOpt : color;
      svg.style.filter = `drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 0 12px ${glowColor}66)`;
    }

    const updateGeometry = () => {
      const elW = el.offsetWidth || 200;
      const elH = el.offsetHeight || 100;

      if (style === "corners") {
        container.style.left = `-${offset}px`;
        container.style.top = `-${offset}px`;
        container.style.width = `${elW + offset * 2}px`;
        container.style.height = `${elH + offset * 2}px`;

        const totalW = elW + offset * 2;
        const totalH = elH + offset * 2;
        svg.setAttribute("viewBox", `0 0 ${totalW} ${totalH}`);
        path.setAttribute("d", buildBracketPath(style, side, totalW, totalH, radius));
        return;
      }

      if (side === "left") {
        container.style.left = `-${depth + offset}px`;
        container.style.top = "0px";
        container.style.width = `${depth}px`;
        container.style.height = `${elH}px`;

        svg.setAttribute("viewBox", `0 0 ${depth} ${elH}`);
        path.setAttribute("d", buildBracketPath(style, side, depth, elH, radius));

        if (labelNode) {
          labelNode.style.right = `${depth + 6}px`;
          labelNode.style.top = "50%";
          labelNode.style.transform = "translateY(-50%)";
        }
      } else if (side === "right") {
        container.style.left = `${elW + offset}px`;
        container.style.top = "0px";
        container.style.width = `${depth}px`;
        container.style.height = `${elH}px`;

        svg.setAttribute("viewBox", `0 0 ${depth} ${elH}`);
        path.setAttribute("d", buildBracketPath(style, side, depth, elH, radius));

        if (labelNode) {
          labelNode.style.left = `${depth + 6}px`;
          labelNode.style.top = "50%";
          labelNode.style.transform = "translateY(-50%)";
        }
      } else if (side === "top") {
        container.style.left = "0px";
        container.style.top = `-${depth + offset}px`;
        container.style.width = `${elW}px`;
        container.style.height = `${depth}px`;

        svg.setAttribute("viewBox", `0 0 ${elW} ${depth}`);
        path.setAttribute("d", buildBracketPath(style, side, elW, depth, radius));

        if (labelNode) {
          labelNode.style.left = "50%";
          labelNode.style.bottom = `${depth + 4}px`;
          labelNode.style.transform = "translateX(-50%)";
        }
      } else if (side === "bottom") {
        container.style.left = "0px";
        container.style.top = `${elH + offset}px`;
        container.style.width = `${elW}px`;
        container.style.height = `${depth}px`;

        svg.setAttribute("viewBox", `0 0 ${elW} ${depth}`);
        path.setAttribute("d", buildBracketPath(style, side, elW, depth, radius));

        if (labelNode) {
          labelNode.style.left = "50%";
          labelNode.style.top = `${depth + 4}px`;
          labelNode.style.transform = "translateX(-50%)";
        }
      }
    };

    updateGeometry();

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver(() => updateGeometry());
      observer.observe(el);
    }

    el.appendChild(container);
  };
}
