/**
 * Body copy paragraph component formatted for high-legibility stage presentations.
 */

import "./Text.css";
import { getActiveStage } from "../../core/stage";
import { DOMElement, type ElementOptions } from "../element";

/**
 * Configuration options for the Text component.
 * @category Components
 * @inline
 */
export interface TextOptions extends ElementOptions {
  /** Foreground text color. */
  color?: string;
  /** Additional CSS class name. */
  className?: string;
}

/**
 * Body copy paragraph component formatted for high-legibility stage presentations.
 * @category Components
 */
export function Text(text: string, options: TextOptions = {}): DOMElement {
  const { className, color, style: customStyle, ...restOptions } = options;
  const classes = ["sr-text", className].filter(Boolean).join(" ");
  const mergedStyle = {
    ...(color ? { color } : {}),
    ...(customStyle && typeof customStyle === "object" ? customStyle : {}),
  };

  const p = (
    <p className={classes} style={mergedStyle}>
      {text}
    </p>
  );

  const stage = getActiveStage();
  const el = new DOMElement("Text", p, restOptions);
  return stage.registerElement(el);
}
