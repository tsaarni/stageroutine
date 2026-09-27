/**
 * Body copy paragraph component formatted for high-legibility stage presentations.
 */

import "./Text.css";
import { DOMElement, type ElementOptions, mount } from "../element";

/**
 * Configuration options for the Text component.
 * @category Components
 * @inline
 */
export type TextOptions = ElementOptions;

/**
 * Body copy paragraph component formatted for high-legibility stage presentations.
 * @category Components
 */
export function Text(text: string, options: TextOptions = {}): DOMElement {
  const { className, ...restOptions } = options;
  const classes = ["sr-text", className].filter(Boolean).join(" ");
  return mount(new DOMElement("Text", <p className={classes}>{text}</p>, restOptions));
}
