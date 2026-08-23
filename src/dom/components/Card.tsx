/**
 * Container card component providing a surfaced glass box for slide content.
 */

import type { ElementOptions } from "../element";

export interface CardOptions extends ElementOptions {
  width?: number | string;
  height?: number | string;
  borderColor?: string;
  background?: string;
  color?: string;
  className?: string;
  children?: unknown;
}

export function Card(childrenOrOptions?: unknown, maybeOptions: CardOptions = {}) {
  let children: unknown = childrenOrOptions;
  let options: CardOptions = maybeOptions;

  if (
    childrenOrOptions &&
    typeof childrenOrOptions === "object" &&
    !("nodeType" in childrenOrOptions) &&
    !("domElement" in childrenOrOptions) &&
    !Array.isArray(childrenOrOptions)
  ) {
    options = childrenOrOptions as CardOptions;
    children = options.children;
  }

  const classes = ["sr-card", options.className].filter(Boolean).join(" ");
  const customStyles: Record<string, string> = {};

  if (options.width) {
    customStyles.width = typeof options.width === "number" ? `${options.width}px` : options.width;
  }
  if (options.height) {
    customStyles.minHeight =
      typeof options.height === "number" ? `${options.height}px` : options.height;
  }
  if (options.borderColor) customStyles.borderColor = options.borderColor;
  if (options.background) customStyles.backgroundColor = options.background;
  if (options.color) customStyles.color = options.color;

  return (
    <div className={classes} style={customStyles} {...options}>
      {children as unknown as Node}
    </div>
  );
}
