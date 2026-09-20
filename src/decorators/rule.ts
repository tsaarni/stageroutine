/**
 * Attaches a sleek vertical or horizontal divider rule / accent line to an element,
 * with optional curved corner wrapping (bracket accent) and dashed/dotted styling.
 */

import type { DOMElement, ElementDecorator } from "../dom/element";

/**
 * Configuration options for rules and dividers.
 * @category Decorators
 * @inline
 */
export interface RuleOptions {
  /** Which side the rule sits on or faces ("left" | "right" | "top" | "bottom", default: "left"). */
  side?: "left" | "right" | "top" | "bottom";
  /** Stroke color (single CSS color) or gradient color stops (array of colors). */
  color?: string | string[];
  /** Stroke style following standard CSS border-style (default: "solid"). */
  borderStyle?: "solid" | "dashed" | "dotted";
  /** Rule stroke thickness in pixels or CSS unit (default: 2). */
  thickness?: number | string;
  /** Inset padding/offset from endpoints in stage units or pixels (default: 0). */
  inset?: number | string;
  /**
   * Curves the rule around adjacent corners, creating a stylized bracket / corner-hugging accent.
   * Pass `true` or an explicit bracket extension length in pixels (default: 10px).
   */
  bracket?: boolean | number;
  /** Corner radius for bracket corners or straight line caps in pixels (default: 8 when bracketed, 2 for straight). */
  radius?: number | string;
  /** Additional CSS class name. */
  className?: string;
}

/**
 * @internal
 * Applies visual styling (borders, gradients, corner curves) to a rule HTML element.
 */
export function applyRuleStyles(node: HTMLElement, options: RuleOptions = {}): void {
  const {
    side = "left",
    color = "rgba(255, 255, 255, 0.2)",
    borderStyle = "solid",
    thickness: thicknessOpt,
    radius: radiusOpt,
    bracket,
  } = options;

  const rawThickness = thicknessOpt ?? 2;
  const isBracketed = !!bracket;
  const isBorderStroke = borderStyle !== "solid";
  let defaultRadius = 2;
  if (isBracketed) {
    defaultRadius = 8;
  } else if (isBorderStroke) {
    defaultRadius = 0;
  }
  const radius = radiusOpt ?? defaultRadius;

  const formattedThickness = typeof rawThickness === "number" ? `${rawThickness}px` : rawThickness;
  const formattedRadius = typeof radius === "number" ? `${radius}px` : radius;
  const primaryColor = Array.isArray(color) ? color[0] : color;

  node.style.boxSizing = "border-box";
  node.style.pointerEvents = "none";

  if (isBracketed) {
    node.style.background = "transparent";

    if (side === "left") {
      node.style.borderLeft = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      node.style.borderTop = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      node.style.borderBottom = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      node.style.borderTopLeftRadius = formattedRadius;
      node.style.borderBottomLeftRadius = formattedRadius;
    } else if (side === "right") {
      node.style.borderRight = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      node.style.borderTop = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      node.style.borderBottom = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      node.style.borderTopRightRadius = formattedRadius;
      node.style.borderBottomRightRadius = formattedRadius;
    } else if (side === "top") {
      node.style.borderTop = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      node.style.borderLeft = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      node.style.borderRight = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      node.style.borderTopLeftRadius = formattedRadius;
      node.style.borderTopRightRadius = formattedRadius;
    } else if (side === "bottom") {
      node.style.borderBottom = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      node.style.borderLeft = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      node.style.borderRight = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      node.style.borderBottomLeftRadius = formattedRadius;
      node.style.borderBottomRightRadius = formattedRadius;
    }
  } else {
    // Straight rule mode
    if (isBorderStroke) {
      node.style.background = "transparent";
      if (side === "left") {
        node.style.borderLeft = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      } else if (side === "right") {
        node.style.borderRight = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      } else if (side === "top") {
        node.style.borderTop = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      } else if (side === "bottom") {
        node.style.borderBottom = `${formattedThickness} ${borderStyle} ${primaryColor}`;
      }
    } else {
      node.style.borderRadius = formattedRadius;

      if (Array.isArray(color) && color.length > 1) {
        const dir = side === "top" || side === "bottom" ? "to right" : "to bottom";
        node.style.background = `linear-gradient(${dir}, ${color.join(", ")})`;
      } else {
        node.style.backgroundColor = primaryColor;
      }
    }
  }
}

/**
 * Decorates an element with an accent rule / divider line or curved bracket.
 * @category Decorators
 */
export function rule(options: RuleOptions = {}): ElementDecorator {
  const {
    side = "left",
    thickness: thicknessOpt,
    borderStyle = "solid",
    inset = 0,
    className,
  } = options;

  const rawThickness = thicknessOpt ?? 2;
  const isBracketed = !!options.bracket;
  const bracketLength = typeof options.bracket === "number" ? options.bracket : 10;
  const isBorderStroke = borderStyle !== "solid";

  const formattedThickness = typeof rawThickness === "number" ? `${rawThickness}px` : rawThickness;
  const formattedInset = typeof inset === "number" ? `${inset}px` : inset;
  const formattedBracketLength = `${bracketLength}px`;

  return (element: DOMElement) => {
    const el = element.domElement;
    if (!el) return;

    if (!isBracketed) {
      el.setAttribute("data-rule-side", side);
      if (side === "left") {
        el.style.borderTopLeftRadius = "0px";
        el.style.borderBottomLeftRadius = "0px";
      } else if (side === "right") {
        el.style.borderTopRightRadius = "0px";
        el.style.borderBottomRightRadius = "0px";
      } else if (side === "top") {
        el.style.borderTopLeftRadius = "0px";
        el.style.borderTopRightRadius = "0px";
      } else if (side === "bottom") {
        el.style.borderBottomLeftRadius = "0px";
        el.style.borderBottomRightRadius = "0px";
      }
    }

    if (getComputedStyle(el).position === "static") {
      el.style.position = "relative";
    }

    const ruleNode = document.createElement("span");
    ruleNode.className = ["sr-rule", className].filter(Boolean).join(" ");
    ruleNode.style.position = "absolute";
    ruleNode.style.zIndex = "2";

    applyRuleStyles(ruleNode, options);

    if (isBracketed) {
      if (side === "left") {
        ruleNode.style.left = formattedInset;
        ruleNode.style.top = formattedInset;
        ruleNode.style.bottom = formattedInset;
        ruleNode.style.width = formattedBracketLength;
      } else if (side === "right") {
        ruleNode.style.right = formattedInset;
        ruleNode.style.top = formattedInset;
        ruleNode.style.bottom = formattedInset;
        ruleNode.style.width = formattedBracketLength;
      } else if (side === "top") {
        ruleNode.style.top = formattedInset;
        ruleNode.style.left = formattedInset;
        ruleNode.style.right = formattedInset;
        ruleNode.style.height = formattedBracketLength;
      } else if (side === "bottom") {
        ruleNode.style.bottom = formattedInset;
        ruleNode.style.left = formattedInset;
        ruleNode.style.right = formattedInset;
        ruleNode.style.height = formattedBracketLength;
      }
    } else {
      if (isBorderStroke) {
        if (side === "left") {
          ruleNode.style.left = "0px";
          ruleNode.style.top = formattedInset;
          ruleNode.style.bottom = formattedInset;
          ruleNode.style.width = "0px";
        } else if (side === "right") {
          ruleNode.style.right = "0px";
          ruleNode.style.top = formattedInset;
          ruleNode.style.bottom = formattedInset;
          ruleNode.style.width = "0px";
        } else if (side === "top") {
          ruleNode.style.top = "0px";
          ruleNode.style.left = formattedInset;
          ruleNode.style.right = formattedInset;
          ruleNode.style.height = "0px";
        } else if (side === "bottom") {
          ruleNode.style.bottom = "0px";
          ruleNode.style.left = formattedInset;
          ruleNode.style.right = formattedInset;
          ruleNode.style.height = "0px";
        }
      } else {
        if (side === "left") {
          ruleNode.style.left = "0px";
          ruleNode.style.top = formattedInset;
          ruleNode.style.bottom = formattedInset;
          ruleNode.style.width = formattedThickness;
        } else if (side === "right") {
          ruleNode.style.right = "0px";
          ruleNode.style.top = formattedInset;
          ruleNode.style.bottom = formattedInset;
          ruleNode.style.width = formattedThickness;
        } else if (side === "top") {
          ruleNode.style.top = "0px";
          ruleNode.style.left = formattedInset;
          ruleNode.style.right = formattedInset;
          ruleNode.style.height = formattedThickness;
        } else if (side === "bottom") {
          ruleNode.style.bottom = "0px";
          ruleNode.style.left = formattedInset;
          ruleNode.style.right = formattedInset;
          ruleNode.style.height = formattedThickness;
        }
      }
    }

    if (typeof (element as { update?: () => void }).update === "function") {
      (element as { update?: () => void }).update?.();
    }

    el.appendChild(ruleNode);
  };
}
