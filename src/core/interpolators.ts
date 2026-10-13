/**
 * Interpolators for numbers, colors, CSS lengths, and box points.
 *
 * Coordinates are plain numbers in stage units, so they interpolate as numbers.
 */

import type { ElementAnchor, Point } from "./types";
import { cssLength, stageUnitPx } from "./units";

export interface RGBA {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function parseColor(color: string, context?: HTMLElement): RGBA | null {
  color = color.trim();
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3 || hex.length === 4) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (/^[0-9a-f]+$/i.test(hex) && (hex.length === 6 || hex.length === 8)) {
      const num = Number.parseInt(hex.slice(0, 6), 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
        a: hex.length === 8 ? Number.parseInt(hex.slice(6), 16) / 255 : 1,
      };
    }
  }

  const rgbMatch = color.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (rgbMatch) {
    return {
      r: Number.parseInt(rgbMatch[1] ?? "0", 10),
      g: Number.parseInt(rgbMatch[2] ?? "0", 10),
      b: Number.parseInt(rgbMatch[3] ?? "0", 10),
      a: rgbMatch[4] ? Number.parseFloat(rgbMatch[4]) : 1,
    };
  }

  // Fallback map for common named colors
  const named: Record<string, RGBA> = {
    white: { r: 255, g: 255, b: 255, a: 1 },
    black: { r: 0, g: 0, b: 0, a: 1 },
    transparent: { r: 0, g: 0, b: 0, a: 0 },
    red: { r: 255, g: 0, b: 0, a: 1 },
    blue: { r: 0, g: 0, b: 255, a: 1 },
    green: { r: 0, g: 128, b: 0, a: 1 },
  };

  const known = named[color.toLowerCase()];
  if (known) return known;
  const parent = context ?? document.body;
  if (!parent) return null;
  const probe = document.createElement("span");
  probe.style.color = color;
  if (!probe.style.color) return null;
  probe.style.display = "none";
  parent.appendChild(probe);
  const resolved = getComputedStyle(probe).color;
  probe.remove();
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = resolved;
  ctx.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 255] = ctx.getImageData(0, 0, 1, 1).data;
  return { r, g, b, a: a / 255 };
}

export function lerpNumber(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function lerpColor(
  fromStr: string,
  toStr: string,
  t: number,
  context?: HTMLElement,
): string {
  const from = parseColor(fromStr, context);
  const to = parseColor(toStr, context);
  if (!from || !to) return t >= 1 ? toStr : fromStr;

  const r = Math.round(lerpNumber(from.r, to.r, t));
  const g = Math.round(lerpNumber(from.g, to.g, t));
  const b = Math.round(lerpNumber(from.b, to.b, t));
  const a = Math.max(0, Math.min(1, lerpNumber(from.a, to.a, t)));

  return a === 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a.toFixed(2)})`;
}

export function parseUnitValue(val: string): { num: number; unit: string } | null {
  const match = val.trim().match(/^(-?[\d.]+)\s*([a-zA-Z%]+)?$/);
  if (match?.[1]) {
    return {
      num: Number.parseFloat(match[1]),
      unit: match[2] || "",
    };
  }
  return null;
}

/**
 * Resolves a named box point or `[x, y]` pair to percentages of the box.
 * Used by element `origin` and by connector anchors.
 */
export function resolveAnchor(anchor: ElementAnchor | string | undefined): Point {
  if (Array.isArray(anchor) && anchor.length >= 2) {
    return [
      typeof anchor[0] === "number" ? anchor[0] : Number.parseFloat(String(anchor[0])) || 0,
      typeof anchor[1] === "number" ? anchor[1] : Number.parseFloat(String(anchor[1])) || 0,
    ];
  }
  switch (anchor) {
    case "center":
      return [50, 50];
    case "top":
      return [50, 0];
    case "bottom":
      return [50, 100];
    case "left":
      return [0, 50];
    case "right":
      return [100, 50];
    case "top-left":
      return [0, 0];
    case "top-right":
      return [100, 0];
    case "bottom-left":
      return [0, 100];
    case "bottom-right":
      return [100, 100];
    default:
      return [0, 0];
  }
}

/** Converts a stage unit coordinate to canvas pixels. */
export function unitsToPx(val: number | undefined, canvasHeight: number): number {
  if (typeof val !== "number") return 0;
  return val * stageUnitPx(canvasHeight);
}

/**
 * Builds the element transform.
 *
 * `origin` picks which point of the element sits on the coordinate.
 * `scale` and `rotation` pivot around that same point.
 */
export function computeTransform(
  xVal: number | undefined,
  yVal: number | undefined,
  scaleVal: number | undefined,
  rotationVal: number | undefined,
  originVal?: ElementAnchor | undefined,
): { transform: string; transformOrigin: string } {
  const x = cssLength(xVal ?? 0);
  const y = cssLength(yVal ?? 0);
  const scale = scaleVal ?? 1;
  const rotation = rotationVal ?? 0;
  const [ox, oy] = resolveAnchor(originVal);

  return {
    transform: `translate3d(${x}, ${y}, 0) translate(${-ox}%, ${-oy}%) scale(${scale}) rotate(${rotation}deg)`,
    transformOrigin: `${ox}% ${oy}%`,
  };
}

export function interpolateValue(
  from: unknown,
  to: unknown,
  t: number,
  property?: string,
  context?: HTMLElement,
): unknown {
  if (property === "labelPlacement") {
    const fraction = (value: unknown) => {
      if (value === "start") return 0.25;
      if (value === "center") return 0.5;
      if (value === "end") return 0.75;
      return value;
    };
    from = fraction(from);
    to = fraction(to);
  }
  const anchors = property === "origin" || property === "fromAnchor" || property === "toAnchor";
  const colors = property === "color" || property === "borderColor" || property === "background";
  const lengths =
    property === "width" ||
    property === "height" ||
    property === "labelOffsetX" ||
    property === "labelOffsetY";
  const numeric = [
    "x",
    "y",
    "scale",
    "rotation",
    "opacity",
    "blur",
    "brightness",
    "zIndex",
    "start",
    "end",
    "labelScale",
    "labelPlacement",
    "rowY",
    "curvature",
    "padding",
    "fromPadding",
    "toPadding",
    "strokeWidth",
    "length",
    "volume",
    "playbackRate",
    "currentTime",
  ].includes(property ?? "");
  if (property !== undefined && !anchors && !colors && !lengths && !numeric)
    return t >= 1 ? to : from;
  // Stage coordinates, dimensions, and scalars are plain numbers
  if (typeof from === "number" && typeof to === "number") {
    return lerpNumber(from, to, t);
  }

  // Origin / anchor points: named keywords and [x, y] percentage pairs
  const isAnchorKeyword = (v: unknown) =>
    typeof v === "string" &&
    (v === "center" ||
      v === "top-left" ||
      v === "top" ||
      v === "bottom" ||
      v === "left" ||
      v === "right" ||
      v === "top-right" ||
      v === "bottom-left" ||
      v === "bottom-right");

  const isAnchorTuple = (v: unknown): v is Point =>
    Array.isArray(v) && v.length >= 2 && typeof v[0] === "number" && typeof v[1] === "number";

  if (
    anchors &&
    (isAnchorTuple(from) || isAnchorTuple(to) || isAnchorKeyword(from) || isAnchorKeyword(to))
  ) {
    if (
      !(isAnchorTuple(from) || isAnchorKeyword(from)) ||
      !(isAnchorTuple(to) || isAnchorKeyword(to))
    )
      return t >= 1 ? to : from;
    const aFrom = resolveAnchor(from as ElementAnchor);
    const aTo = resolveAnchor(to as ElementAnchor);
    return [lerpNumber(aFrom[0], aTo[0], t), lerpNumber(aFrom[1], aTo[1], t)] as Point;
  }

  if (typeof from === "string" && typeof to === "string") {
    const isColorFrom = colors ? parseColor(from, context) : null;
    const isColorTo = colors ? parseColor(to, context) : null;
    if (colors && isColorFrom && isColorTo) {
      return lerpColor(from, to, t, context);
    }

    // Authored CSS lengths (e.g. "40rem") interpolate when their units match
    const uFrom = parseUnitValue(from);
    const uTo = parseUnitValue(to);
    if (lengths && uFrom && uTo && uFrom.unit === uTo.unit) {
      const val = lerpNumber(uFrom.num, uTo.num, t);
      return `${val}${uTo.unit}`;
    }
  }

  // Discrete switch
  return t >= 1 ? to : from;
}
