/**
 * Headline typography component supporting hero, serif editorial, and section kicker styles.
 */

import type { ElementOptions } from "../element";

export interface TitleOptions extends ElementOptions {
  color?: string;
  serif?: boolean;
  hero?: boolean;
  kicker?: string;
  className?: string;
}

export function Title(text: string, options: TitleOptions = {}) {
  let baseClass = "sr-title";
  if (options.hero) {
    baseClass = "sr-hero";
  } else if (options.serif) {
    baseClass = "sr-serif-lead";
  }

  const { className, ...restOptions } = options;
  const classes = [baseClass, className].filter(Boolean).join(" ");
  const style = options.color ? { color: options.color } : undefined;

  return (
    <div className={classes} style={style} {...restOptions}>
      {options.kicker && <span className="sr-kicker">{options.kicker}</span>}
      {text}
    </div>
  );
}
