/**
 * Headline typography component supporting default title, hero, and serif editorial variants.
 */

import "./Title.css";
import { DOMElement, type ElementOptions, mount } from "../element";

/**
 * Visual typography variant for the Title component.
 * @category Components
 */
export type TitleVariant = "title" | "hero" | "serif";

/**
 * Configuration options for the Title component.
 * @category Components
 * @inline
 */
export interface TitleOptions extends ElementOptions {
  /** Visual typography variant: "title" (default), "hero" (large display), or "serif" (editorial italic). */
  variant?: TitleVariant;
  /** Optional section kicker displayed above the title. */
  kicker?: string;
}

const TITLE_CLASSES: Record<TitleVariant, string> = {
  title: "sr-title",
  hero: "sr-hero",
  serif: "sr-serif-lead",
};

/**
 * Headline typography component supporting default title, hero, and serif editorial variants.
 * @category Components
 */
export function Title(text: string, options: TitleOptions = {}): DOMElement {
  const { className, variant = "title", ...restOptions } = options;
  const classes = [TITLE_CLASSES[variant], className].filter(Boolean).join(" ");
  const div = (
    <div className={classes}>
      {options.kicker && <span className="sr-kicker">{options.kicker}</span>}
      {text}
    </div>
  );
  return mount(new DOMElement("Title", div, restOptions));
}
