/**
 * Body copy paragraph component formatted for high-legibility presentation slides.
 */

import "./Text.css";
import type { ElementOptions } from "../element";

/**
 * Configuration options for the Text component.
 * @category Components
 */
export interface TextOptions extends ElementOptions {
  color?: string;
  className?: string;
}

/**
 * Body copy paragraph component formatted for high-legibility presentation slides.
 * @category Components
 */
export function Text(text: string, options: TextOptions = {}) {
  const { className, color, style: customStyle, ...restOptions } = options;
  const classes = ["sr-text", className].filter(Boolean).join(" ");
  const mergedStyle = {
    ...(color ? { color } : {}),
    ...(customStyle && typeof customStyle === "object" ? customStyle : {}),
  };

  return (
    <p className={classes} style={mergedStyle} {...restOptions}>
      {text}
    </p>
  );
}
