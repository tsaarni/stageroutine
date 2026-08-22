/**
 * Container card component with border, surface styling, and optional title/subtitle.
 */

import type { ElementOptions } from "../element";

export interface CardOptions extends ElementOptions {
  title?: string;
  subtitle?: string;
  width?: number | string;
  height?: number | string;
  borderColor?: string;
  background?: string;
  color?: string;
  className?: string;
  children?: unknown;
}

export function Card(labelOrOptions: string | CardOptions, maybeOptions: CardOptions = {}) {
  const isString = typeof labelOrOptions === "string";
  const options: CardOptions = isString ? maybeOptions : labelOrOptions;
  const label = isString ? labelOrOptions : undefined;

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
      {options.title && (
        <div
          style={{
            fontWeight: "600",
            fontSize: "1.25rem",
            marginBottom: "0.4rem",
            color: "#f8fafc",
          }}
        >
          {options.title}
        </div>
      )}
      {options.subtitle && (
        <div
          style={{
            fontSize: "0.95rem",
            color: "#94a3b8",
            marginBottom: "0.75rem",
          }}
        >
          {options.subtitle}
        </div>
      )}
      {label}
      {options.children as unknown as Node}
    </div>
  );
}
