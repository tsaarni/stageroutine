/**
 * Micro-label typography component for chapter indices, category tags, and subtitles.
 */

import "./Kicker.css";
import { getActiveStage } from "../../core/stage";
import { DOMElement, type ElementOptions } from "../element";

/**
 * Configuration options for the Kicker component.
 * @category Components
 */
export interface KickerOptions extends ElementOptions {
  /** Foreground label color. */
  color?: string;
  /** Additional CSS class name. */
  className?: string;
}

/**
 * Micro-label component used for chapter indices and section category tags.
 * @category Components
 */
export function Kicker(label: string, options: KickerOptions = {}): DOMElement {
  const { className, color, style: customStyle, ...restOptions } = options;
  const classes = ["sr-kicker", className].filter(Boolean).join(" ");
  const mergedStyle = {
    ...(color ? { color } : {}),
    ...(customStyle && typeof customStyle === "object" ? customStyle : {}),
  };

  const div = (
    <div className={classes} style={mergedStyle}>
      {label}
    </div>
  );

  const stage = getActiveStage();
  const el = new DOMElement("Kicker", div, restOptions);
  return stage.registerElement(el);
}
