/**
 * Body copy paragraph component formatted for high-legibility presentation slides.
 */

import type { ElementOptions } from "../element";

/**
 * Configuration options for the Text component.
 * @category Components
 */
export interface TextOptions extends ElementOptions {
  color?: string;
  className?: string;
}

/**
 * Body copy paragraph component formatted for high-legibility presentation slides.
 * @category Components
 */
export function Text(text: string, options: TextOptions = {}) {
  const classes = ["sr-text", options.className].filter(Boolean).join(" ");
  const style = options.color ? { color: options.color } : undefined;

  return (
    <p className={classes} style={style} {...options}>
      {text}
    </p>
  );
}
