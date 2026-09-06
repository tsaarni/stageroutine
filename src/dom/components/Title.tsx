/**
 * Headline typography component supporting default title, hero, and serif editorial variants.
 */

import "./Title.css";
import type { ElementOptions } from "../element";

/**
 * Visual typography variant for the Title component.
 * @category Components
 */
export type TitleVariant = "title" | "hero" | "serif";

/**
 * Configuration options for the Title component.
 * @category Components
 */
export interface TitleOptions extends ElementOptions {
  /** Visual typography variant: "title" (default), "hero" (large display), or "serif" (editorial italic). */
  variant?: TitleVariant;
  /** Foreground text color. */
  color?: string;
  /** Optional section kicker displayed above the title. */
  kicker?: string;
  className?: string;
}

/**
 * Headline typography component supporting default title, hero, and serif editorial variants.
 * @category Components
 */
export function Title(text: string, options: TitleOptions = {}) {
  const variant = options.variant ?? "title";

  let baseClass = "sr-title";
  if (variant === "hero") {
    baseClass = "sr-hero";
  } else if (variant === "serif") {
    baseClass = "sr-serif-lead";
  }

  const { className, variant: _variant, color, style: customStyle, ...restOptions } = options;
  const classes = [baseClass, className].filter(Boolean).join(" ");
  const mergedStyle = {
    ...(color ? { color } : {}),
    ...(customStyle && typeof customStyle === "object" ? customStyle : {}),
  };

  return (
    <div className={classes} style={mergedStyle} {...restOptions}>
      {options.kicker && <span className="sr-kicker">{options.kicker}</span>}
      {text}
    </div>
  );
}
