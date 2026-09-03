/**
 * Micro-label component used for chapter indices and section category tags.
 */

import "./Kicker.css";
import type { ElementOptions } from "../element";

/**
 * Configuration options for the Kicker component.
 * @category Components
 */
export interface KickerOptions extends ElementOptions {
  color?: string;
  className?: string;
}

/**
 * Micro-label component used for chapter indices and section category tags.
 * @category Components
 */
export function Kicker(label: string, options: KickerOptions = {}) {
  const { className, color, style: customStyle, ...restOptions } = options;
  const classes = ["sr-kicker", className].filter(Boolean).join(" ");
  const mergedStyle = {
    ...(color ? { color } : {}),
    ...(customStyle && typeof customStyle === "object" ? customStyle : {}),
  };

  return (
    <div className={classes} style={mergedStyle} {...restOptions}>
      {label}
    </div>
  );
}
