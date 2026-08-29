/**
 * Headline typography component supporting default title, hero, and serif editorial variants.
 */

import type { ElementOptions } from "../element";

export type TitleVariant = "title" | "hero" | "serif";

export interface TitleOptions extends ElementOptions {
  /** Visual typography variant: "title" (default), "hero" (large display), or "serif" (editorial italic). */
  variant?: TitleVariant;
  /** Foreground text color. */
  color?: string;
  /** Optional section kicker displayed above the title. */
  kicker?: string;
  /** Legacy alias for variant="serif". */
  serif?: boolean;
  /** Legacy alias for variant="hero". */
  hero?: boolean;
  className?: string;
}

export function Title(text: string, options: TitleOptions = {}) {
  const variant = options.variant ?? (options.hero ? "hero" : options.serif ? "serif" : "title");

  let baseClass = "sr-title";
  if (variant === "hero") {
    baseClass = "sr-hero";
  } else if (variant === "serif") {
    baseClass = "sr-serif-lead";
  }

  const { className, hero: _hero, serif: _serif, variant: _variant, ...restOptions } = options;
  const classes = [baseClass, className].filter(Boolean).join(" ");
  const style = options.color ? { color: options.color } : undefined;

  return (
    <div className={classes} style={style} {...restOptions}>
      {options.kicker && <span className="sr-kicker">{options.kicker}</span>}
      {text}
    </div>
  );
}
