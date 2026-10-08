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

export function parseColor(color: string): RGBA | null {
  if (color.startsWith("#")) {
    let hex = color.slice(1);
    if (hex.length === 3) {
      hex = hex
        .split("")
        .map((c) => c + c)
        .join("");
    }
    if (hex.length === 6) {
      const num = Number.parseInt(hex, 16);
      return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255,
        a: 1,
      };
    }
  }

  const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/);
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
    red: { r: 239, g: 68, b: 68, a: 1 },
    blue: { r: 59, g: 130, b: 246, a: 1 },
    green: { r: 34, g: 197, b: 94, a: 1 },
  };

  return named[color.toLowerCase()] ?? null;
}

export function lerpNumber(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

export function lerpColor(fromStr: string, toStr: string, t: number): string {
  const from = parseColor(fromStr);
  const to = parseColor(toStr);
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

export function interpolateValue(from: unknown, to: unknown, t: number): unknown {
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

  if (isAnchorTuple(from) || isAnchorTuple(to) || isAnchorKeyword(from) || isAnchorKeyword(to)) {
    const aFrom = resolveAnchor(from as ElementAnchor);
    const aTo = resolveAnchor(to as ElementAnchor);
    return [lerpNumber(aFrom[0], aTo[0], t), lerpNumber(aFrom[1], aTo[1], t)] as Point;
  }

  if (typeof from === "string" && typeof to === "string") {
    const isColorFrom = from.startsWith("#") || from.startsWith("rgb") || parseColor(from);
    const isColorTo = to.startsWith("#") || to.startsWith("rgb") || parseColor(to);
    if (isColorFrom && isColorTo) {
      return lerpColor(from, to, t);
    }

    // Authored CSS lengths (e.g. "40rem") interpolate when their units match
    const uFrom = parseUnitValue(from);
    const uTo = parseUnitValue(to);
    if (uFrom && uTo && uFrom.unit === uTo.unit) {
      const val = lerpNumber(uFrom.num, uTo.num, t);
      return `${val}${uTo.unit}`;
    }
  }

  // Discrete switch
  return t >= 1 ? to : from;
}
