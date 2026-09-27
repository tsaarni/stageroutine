/**
 * Micro-label typography component for chapter indices, category tags, and subtitles.
 */

import "./Kicker.css";
import { DOMElement, type ElementOptions, mount } from "../element";

/**
 * Configuration options for the Kicker component.
 * @category Components
 * @inline
 */
export type KickerOptions = ElementOptions;

/**
 * Micro-label component used for chapter indices and section category tags.
 * @category Components
 */
export function Kicker(label: string, options: KickerOptions = {}): DOMElement {
  const { className, ...restOptions } = options;
  const classes = ["sr-kicker", className].filter(Boolean).join(" ");
  return mount(new DOMElement("Kicker", <div className={classes}>{label}</div>, restOptions));
}
