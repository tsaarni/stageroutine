/**
 * Compact tag badge component for status indicators and version labels.
 */

import type { ElementOptions } from "../element";

export interface BadgeOptions extends ElementOptions {
  background?: string;
  color?: string;
  borderColor?: string;
  className?: string;
}

export function Badge(label: string, options: BadgeOptions = {}) {
  const classes = ["sr-badge", options.className].filter(Boolean).join(" ");
  const customStyles: Record<string, string> = {};

  if (options.background) customStyles.backgroundColor = options.background;
  if (options.color) customStyles.color = options.color;
  if (options.borderColor) customStyles.borderColor = options.borderColor;

  return (
    <span className={classes} style={customStyles} {...options}>
      {label}
    </span>
  );
}
