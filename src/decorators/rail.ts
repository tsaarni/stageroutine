/**
 * Attaches a sleek vertical or horizontal accent rail / keyline to an element,
 * with optional curved corner wrapping (bracket accent) and neon glow.
 */

import type { DOMElement, ElementDecorator } from "../dom/element";

export interface RailOptions {
  /** Which side the rail sits on ("left" | "right" | "top" | "bottom", default: "left"). */
  side?: "left" | "right" | "top" | "bottom";
  /** Solid accent color (default: "rgba(255, 255, 255, 0.2)"). */
  color?: string;
  /** Gradient color stops (e.g. ["#38bdf8", "#a855f7"]). Overrides color if provided. */
  gradient?: string[];
  /** Rail stroke thickness in pixels (default: 3). */
  thickness?: number | string;
  /**
   * Corner radius for the rail or curved corners in pixels (default: 10 when curved, 2 for straight rail).
   */
  radius?: number | string;
  /**
   * Curves the rail around the adjacent top and bottom (or left and right) corners,
   * creating a stylized bracket / corner-hugging accent.
   * Pass `true` or an explicit bracket extension length in pixels (default: 20px).
   */
  curve?: boolean | number;
  /** Alias for `curve`. */
  bracket?: boolean | number;
  /** Inset offset from element edges in pixels (default: 0). */
  inset?: number | string;
  /** Whether the rail emits a subtle neon bloom glow (default: false). */
  glow?: boolean | string;
  /** Additional CSS class name. */
  className?: string;
}

/**
 * Decorates an element with an accent rail (keyline / gutter indicator / curved bracket).
 */
export function rail(options: RailOptions = {}): ElementDecorator {
  const {
    side = "left",
    color = "rgba(255, 255, 255, 0.2)",
    gradient: gradientColors,
    thickness = 3,
    inset = 0,
    glow: glowOpt = false,
    className,
  } = options;

  const isCurved = options.curve !== undefined ? !!options.curve : !!options.bracket;
  const curveLength =
    typeof options.curve === "number"
      ? options.curve
      : typeof options.bracket === "number"
        ? options.bracket
        : 10;

  const defaultRadius = isCurved ? 8 : 2;
  const radius = options.radius ?? defaultRadius;

  const formattedThickness = typeof thickness === "number" ? `${thickness}px` : thickness;
  const formattedRadius = typeof radius === "number" ? `${radius}px` : radius;
  const formattedInset = typeof inset === "number" ? `${inset}px` : inset;
  const formattedCurveLength = `${curveLength}px`;

  return (element: DOMElement) => {
    const el = element.domElement;
    if (!el) return;

    if (typeof window !== "undefined" && getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    } else {
      el.style.position = el.style.position || "relative";
    }

    const railNode = document.createElement("span");
    railNode.className = ["sr-rail", className].filter(Boolean).join(" ");
    railNode.style.position = "absolute";
    railNode.style.pointerEvents = "none";
    railNode.style.zIndex = "2";
    railNode.style.boxSizing = "border-box";

    if (isCurved) {
      // Curved bracket mode: wraps around the corners
      railNode.style.background = "transparent";

      if (side === "left") {
        railNode.style.left = formattedInset;
        railNode.style.top = formattedInset;
        railNode.style.bottom = formattedInset;
        railNode.style.width = formattedCurveLength;
        railNode.style.borderLeft = `${formattedThickness} solid ${color}`;
        railNode.style.borderTop = `${formattedThickness} solid ${color}`;
        railNode.style.borderBottom = `${formattedThickness} solid ${color}`;
        railNode.style.borderTopLeftRadius = formattedRadius;
        railNode.style.borderBottomLeftRadius = formattedRadius;
      } else if (side === "right") {
        railNode.style.right = formattedInset;
        railNode.style.top = formattedInset;
        railNode.style.bottom = formattedInset;
        railNode.style.width = formattedCurveLength;
        railNode.style.borderRight = `${formattedThickness} solid ${color}`;
        railNode.style.borderTop = `${formattedThickness} solid ${color}`;
        railNode.style.borderBottom = `${formattedThickness} solid ${color}`;
        railNode.style.borderTopRightRadius = formattedRadius;
        railNode.style.borderBottomRightRadius = formattedRadius;
      } else if (side === "top") {
        railNode.style.top = formattedInset;
        railNode.style.left = formattedInset;
        railNode.style.right = formattedInset;
        railNode.style.height = formattedCurveLength;
        railNode.style.borderTop = `${formattedThickness} solid ${color}`;
        railNode.style.borderLeft = `${formattedThickness} solid ${color}`;
        railNode.style.borderRight = `${formattedThickness} solid ${color}`;
        railNode.style.borderTopLeftRadius = formattedRadius;
        railNode.style.borderTopRightRadius = formattedRadius;
      } else if (side === "bottom") {
        railNode.style.bottom = formattedInset;
        railNode.style.left = formattedInset;
        railNode.style.right = formattedInset;
        railNode.style.height = formattedCurveLength;
        railNode.style.borderBottom = `${formattedThickness} solid ${color}`;
        railNode.style.borderLeft = `${formattedThickness} solid ${color}`;
        railNode.style.borderRight = `${formattedThickness} solid ${color}`;
        railNode.style.borderBottomLeftRadius = formattedRadius;
        railNode.style.borderBottomRightRadius = formattedRadius;
      }
    } else {
      // Straight bar mode
      railNode.style.borderRadius = formattedRadius;

      // Apply Background & Gradient
      if (gradientColors && gradientColors.length > 1) {
        const dir = side === "top" || side === "bottom" ? "to right" : "to bottom";
        railNode.style.background = `linear-gradient(${dir}, ${gradientColors.join(", ")})`;
      } else {
        railNode.style.backgroundColor = color;
      }

      // Apply Side Positioning
      if (side === "left") {
        railNode.style.left = formattedInset;
        railNode.style.top = formattedInset;
        railNode.style.bottom = formattedInset;
        railNode.style.width = formattedThickness;
      } else if (side === "right") {
        railNode.style.right = formattedInset;
        railNode.style.top = formattedInset;
        railNode.style.bottom = formattedInset;
        railNode.style.width = formattedThickness;
      } else if (side === "top") {
        railNode.style.top = formattedInset;
        railNode.style.left = formattedInset;
        railNode.style.right = formattedInset;
        railNode.style.height = formattedThickness;
      } else if (side === "bottom") {
        railNode.style.bottom = formattedInset;
        railNode.style.left = formattedInset;
        railNode.style.right = formattedInset;
        railNode.style.height = formattedThickness;
      }
    }

    // Apply Glow Effect
    if (glowOpt) {
      const glowColor = typeof glowOpt === "string" ? glowOpt : color;
      if (isCurved) {
        railNode.style.filter = `drop-shadow(0 0 6px ${glowColor}) drop-shadow(0 0 14px ${glowColor}66)`;
      } else {
        railNode.style.boxShadow = `0 0 10px ${glowColor}, 0 0 20px ${glowColor}66`;
      }
    }

    el.appendChild(railNode);
  };
}
