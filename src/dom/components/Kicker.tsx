/**
 * Micro-label typography component for chapter indices, category tags, and subtitles.
 */

import "./Kicker.css";
import { type ElementOptions, mount } from "../element";
import { TextContentElement, type TextElement } from "./TextContent";

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
export function Kicker(label: string, options: KickerOptions = {}): TextElement {
  const { className, ...restOptions } = options;
  const classes = ["sr-kicker", className].filter(Boolean).join(" ");
  return mount(
    new TextContentElement("Kicker", <div className={classes}></div>, label, restOptions),
  );
}
