/**
 * Body copy paragraph component formatted for high-legibility stage presentations.
 */

import "./Text.css";
import { type ElementOptions, mount } from "../element";
import { TextContentElement, type TextElement } from "./TextContent";

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
export function Text(text: string, options: TextOptions = {}): TextElement {
  const { className, ...restOptions } = options;
  const classes = ["sr-text", className].filter(Boolean).join(" ");
  return mount(new TextContentElement("Text", <p className={classes}></p>, text, restOptions));
}
