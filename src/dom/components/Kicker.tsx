/**
 * Micro-label component used for chapter indices and section category tags.
 */

import type { ElementOptions } from "../element";

export interface KickerOptions extends ElementOptions {
  color?: string;
  className?: string;
}

export function Kicker(label: string, options: KickerOptions = {}) {
  const classes = ["sr-kicker", options.className].filter(Boolean).join(" ");
  const customStyles: Record<string, string> = {};
  if (options.color) customStyles.color = options.color;

  return (
    <div className={classes} style={customStyles} {...options}>
      {label}
    </div>
  );
}
