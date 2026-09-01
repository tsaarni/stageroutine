/**
 * Interpolators for smoothly blending numbers, colors, container units, and transform coordinates.
 */

import type { ElementAnchor } from "./types";

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

export interface CoordParts {
  stageVal: number;
  stageUnit: string;
  selfPct: number;
}

export function parseCoordParts(
  val: number | string | undefined,
  defaultUnit = "cqw",
): CoordParts | null {
  if (val === undefined || val === null) return null;
  if (typeof val === "number") {
    return { stageVal: val, stageUnit: defaultUnit, selfPct: 0 };
  }
  const str = String(val).trim();
  if (str === "center") {
    return { stageVal: 50, stageUnit: defaultUnit, selfPct: 50 };
  }
  // Matches calc(50cqw - 50%) or calc(50% - 50%)
  const calcMatch = str.match(/^calc\(\s*(-?[\d.]+)\s*([a-zA-Z%]*)\s*-\s*(-?[\d.]+)\s*%\s*\)$/);
  if (calcMatch?.[1] && calcMatch[3]) {
    return {
      stageVal: Number.parseFloat(calcMatch[1]),
      stageUnit: calcMatch[2] || defaultUnit,
      selfPct: Number.parseFloat(calcMatch[3]),
    };
  }
  // Pure number as string
  if (/^-?[\d.]+$/.test(str)) {
    return { stageVal: Number.parseFloat(str), stageUnit: defaultUnit, selfPct: 0 };
  }
  // Single unit e.g. "6cqw", "200px"
  const unitMatch = str.match(/^(-?[\d.]+)\s*([a-zA-Z%]+)$/);
  if (unitMatch?.[1]) {
    return {
      stageVal: Number.parseFloat(unitMatch[1]),
      stageUnit: unitMatch[2] || defaultUnit,
      selfPct: 0,
    };
  }
  return null;
}

export function formatCoord(val: number | string | undefined, defaultUnit = "cqw"): string {
  if (val === undefined || val === null) return "0px";
  const parts = parseCoordParts(val, defaultUnit);
  if (!parts) return String(val).trim();
  if (parts.selfPct !== 0) {
    return `calc(${parts.stageVal}${parts.stageUnit} - ${parts.selfPct}%)`;
  }
  return `${parts.stageVal}${parts.stageUnit}`;
}

export function px(val: number): string {
  return `${val}px`;
}

export function resolveAnchor(anchor: ElementAnchor | string | undefined): {
  x: number;
  y: number;
} {
  if (anchor && typeof anchor === "object" && "x" in anchor && "y" in anchor) {
    return {
      x: typeof anchor.x === "number" ? anchor.x : Number.parseFloat(String(anchor.x)) || 0,
      y: typeof anchor.y === "number" ? anchor.y : Number.parseFloat(String(anchor.y)) || 0,
    };
  }
  switch (anchor) {
    case "center":
      return { x: 50, y: 50 };
    case "top":
      return { x: 50, y: 0 };
    case "bottom":
      return { x: 50, y: 100 };
    case "left":
      return { x: 0, y: 50 };
    case "right":
      return { x: 100, y: 50 };
    case "top-left":
      return { x: 0, y: 0 };
    case "top-right":
      return { x: 100, y: 0 };
    case "bottom-left":
      return { x: 0, y: 100 };
    case "bottom-right":
      return { x: 100, y: 100 };
    default:
      return { x: 0, y: 0 };
  }
}

export function parseAnchor(anchor: ElementAnchor | string | undefined): { x: number; y: number } {
  return resolveAnchor(anchor);
}

export function computeTransformAndOrigin(
  xVal: number | string | undefined,
  yVal: number | string | undefined,
  scaleVal: number | undefined,
  rotationVal: number | undefined,
  _anchorVal?: ElementAnchor | string | undefined,
): { transform: string; transformOrigin: string } {
  const xStr = formatCoord(xVal, "cqw");
  const yStr = formatCoord(yVal, "cqh");
  const scale = scaleVal ?? 1;
  const rotation = rotationVal ?? 0;

  return {
    transform: `translate3d(${xStr}, ${yStr}, 0) scale(${scale}) rotate(${rotation}deg)`,
    transformOrigin: "0 0",
  };
}

export function interpolateValue(from: unknown, to: unknown, t: number): unknown {
  if (typeof from === "number" && typeof to === "number") {
    return lerpNumber(from, to, t);
  }

  // Coordinate expression with self-centering % support (e.g. "center" -> 6)
  const pFrom = parseCoordParts(from as number | string | undefined, "cqw");
  const pTo = parseCoordParts(to as number | string | undefined, "cqw");
  if (pFrom && pTo && pFrom.stageUnit === pTo.stageUnit) {
    const stageVal = lerpNumber(pFrom.stageVal, pTo.stageVal, t);
    const selfPct = lerpNumber(pFrom.selfPct, pTo.selfPct, t);
    if (selfPct !== 0) {
      return `calc(${stageVal}${pTo.stageUnit} - ${selfPct}%)`;
    }
    return `${stageVal}${pTo.stageUnit}`;
  }

  // Anchor vector or keyword interpolation
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

  const isAnchorObj = (v: unknown) => v !== null && typeof v === "object" && "x" in v && "y" in v;

  if (isAnchorObj(from) || isAnchorObj(to) || isAnchorKeyword(from) || isAnchorKeyword(to)) {
    const aFrom = resolveAnchor(from as ElementAnchor);
    const aTo = resolveAnchor(to as ElementAnchor);
    return {
      x: lerpNumber(aFrom.x, aTo.x, t),
      y: lerpNumber(aFrom.y, aTo.y, t),
    };
  }

  if (typeof from === "string" && typeof to === "string") {
    const isColorFrom = from.startsWith("#") || from.startsWith("rgb") || parseColor(from);
    const isColorTo = to.startsWith("#") || to.startsWith("rgb") || parseColor(to);
    if (isColorFrom && isColorTo) {
      return lerpColor(from, to, t);
    }

    const uFrom = parseUnitValue(from);
    const uTo = parseUnitValue(to);
    if (uFrom && uTo && uFrom.unit === uTo.unit) {
      const val = lerpNumber(uFrom.num, uTo.num, t);
      return `${val}${uTo.unit}`;
    }
  }

  if (typeof from === "number" && typeof to === "string") {
    const uTo = parseUnitValue(to);
    if (uTo) {
      const val = lerpNumber(from, uTo.num, t);
      return `${val}${uTo.unit}`;
    }
  }

  if (typeof from === "string" && typeof to === "number") {
    const uFrom = parseUnitValue(from);
    if (uFrom) {
      const val = lerpNumber(uFrom.num, to, t);
      return `${val}${uFrom.unit}`;
    }
  }

  // Discrete switch
  return t >= 1 ? to : from;
}
