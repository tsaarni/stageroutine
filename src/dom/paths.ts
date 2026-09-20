import { resolveAnchor } from "../core/interpolators";
import type { AnchorMode, ElementAnchor, Point } from "../core/types";
import type { DOMElement } from "./element";

/**
 * Contextual geometry parameters passed to a PathFunction.
 * @category Shape & Frame
 */
export interface PathContext {
  /** Stroke width in virtual canvas pixels, used to center the stroke within bounds. */
  strokeWidth?: number;
  /** Inset padding in pixels from the element bounds. */
  inset?: number;
}

/**
 * A function that calculates an SVG path string ('d' attribute) for given dimensions.
 * @category Shape & Frame
 */
export type PathFunction = (width: number, height: number, context?: PathContext) => string;

/**
 * Runtime context supplied by Shape/Frame when evaluating a path.
 * @internal
 */
export interface PathRuntimeContext extends PathContext {
  /** Resolves a live tail target to a point in the source element's local coordinate space. */
  resolveTail?: (
    target: DOMElement | Point,
    anchor: AnchorMode | ElementAnchor,
    padding: number,
  ) => Point | null;
}

/** Paths that depend on live targets and must be regenerated every frame. @internal */
const dynamicPaths = new WeakSet<PathFunction>();

/** @internal Marks a path generator as depending on live targets. */
export function markDynamicPath(fn: PathFunction): PathFunction {
  dynamicPaths.add(fn);
  return fn;
}

/** @internal Whether a path generator depends on live targets. */
export function isDynamicPath(fn: PathFunction): boolean {
  return dynamicPaths.has(fn);
}

interface GeometryBounds {
  pad: number;
  pw: number;
  ph: number;
  cx: number;
  cy: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function getGeometryBounds(w: number, h: number, context?: PathContext): GeometryBounds | null {
  const sw = context?.strokeWidth ?? 0;
  const inset = context?.inset ?? 0;
  const pad = sw / 2 + inset;
  const pw = w - pad * 2;
  const ph = h - pad * 2;
  if (pw <= 0 || ph <= 0) return null;

  return {
    pad,
    pw,
    ph,
    cx: w / 2,
    cy: h / 2,
    left: pad,
    right: pad + pw,
    top: pad,
    bottom: pad + ph,
  };
}

interface CornerRadii {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

function roundedRectPerCorner(pad: number, pw: number, ph: number, radii: CornerRadii): string {
  const { tl, tr, br, bl } = radii;
  const left = pad;
  const right = pad + pw;
  const top = pad;
  const bottom = pad + ph;

  if (tl <= 0 && tr <= 0 && br <= 0 && bl <= 0) {
    return `M ${left} ${top} H ${right} V ${bottom} H ${left} Z`;
  }

  const pathParts: string[] = [];

  pathParts.push(`M ${left + tl} ${top}`);

  pathParts.push(`H ${right - tr}`);
  if (tr > 0) {
    pathParts.push(`A ${tr} ${tr} 0 0 1 ${right} ${top + tr}`);
  }

  pathParts.push(`V ${bottom - br}`);
  if (br > 0) {
    pathParts.push(`A ${br} ${br} 0 0 1 ${right - br} ${bottom}`);
  }

  pathParts.push(`H ${left + bl}`);
  if (bl > 0) {
    pathParts.push(`A ${bl} ${bl} 0 0 1 ${left} ${bottom - bl}`);
  }

  pathParts.push(`V ${top + tl}`);
  if (tl > 0) {
    pathParts.push(`A ${tl} ${tl} 0 0 1 ${left + tl} ${top}`);
  }

  pathParts.push("Z");
  return pathParts.join(" ");
}

/**
 * Samples an ellipse at `count` points spaced evenly by arc length.
 * Sampling by angle would bunch points together at the flatter left and right sides.
 */
function ellipseRing(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  count: number,
): Array<[number, number]> {
  const at = (t: number) => [cx + rx * Math.sin(t), cy - ry * Math.cos(t)];
  const steps = 360;
  const samples = Array.from({ length: steps + 1 }, (_, i) => at((i / steps) * Math.PI * 2));
  const segs = samples
    .slice(1)
    .map((p, i) => Math.hypot(p[0] - samples[i][0], p[1] - samples[i][1]));
  const total = segs.reduce((a, b) => a + b, 0);
  let e = 0;
  let walked = 0;
  return Array.from({ length: count }, (_, k) => {
    const goal = (k / count) * total;
    while (walked + segs[e] < goal) walked += segs[e++];
    const f = (goal - walked) / segs[e];
    const a = samples[e];
    const b = samples[e + 1];
    return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
  });
}

/**
 * Explicit live tail target with an attachment anchor and clearance padding.
 * @category Shape & Frame
 */
export interface TailTargetSpec {
  /** Element or stage point the tail points to. */
  to: DOMElement | Point;
  /** Attachment on the target outline (default: "auto"). */
  anchor?: AnchorMode | ElementAnchor;
  /** Clearance in pixels between the tail tip and the target outline (default: 0). */
  padding?: number;
}

/**
 * Accepted forms of the bubble `tail` option: a length, a local anchor, a target spec,
 * or a bare target element/point for live tracking.
 * @category Shape & Frame
 */
export type BubbleTail = number | ElementAnchor | TailTargetSpec | DOMElement;

interface ParsedTail {
  kind: "local" | "target";
  anchor: AnchorMode | ElementAnchor;
  length: number;
  target?: DOMElement | Point;
  padding: number;
}

function parseTail(
  tail: BubbleTail | undefined,
  defaultAnchor: ElementAnchor,
  defaultLength: number,
): ParsedTail {
  if (tail === undefined) {
    return { kind: "local", anchor: defaultAnchor, length: defaultLength, padding: 0 };
  }
  if (typeof tail === "number") {
    return { kind: "local", anchor: defaultAnchor, length: Math.max(0, tail), padding: 0 };
  }
  if (typeof tail === "string") {
    return { kind: "local", anchor: tail, length: defaultLength, padding: 0 };
  }
  if (Array.isArray(tail)) {
    return { kind: "local", anchor: tail as ElementAnchor, length: defaultLength, padding: 0 };
  }
  if (typeof tail === "object" && tail !== null) {
    // Check the element shorthand first: DOMElement instances also carry a `to()` method.
    if ("domElement" in tail) {
      return { kind: "target", anchor: "auto", length: 0, target: tail as DOMElement, padding: 0 };
    }
    if ("to" in tail) {
      const spec = tail as TailTargetSpec;
      return {
        kind: "target",
        anchor: spec.anchor ?? "auto",
        length: 0,
        target: spec.to,
        padding: spec.padding ?? 0,
      };
    }
  }
  return { kind: "local", anchor: defaultAnchor, length: defaultLength, padding: 0 };
}

/** Local anchor position as an offset inside the element bounds. */
function localTailTip(
  anchor: ElementAnchor,
  pw: number,
  ph: number,
  left: number,
  top: number,
): Point {
  const [pctX, pctY] = resolveAnchor(anchor);
  return [left + (pctX / 100) * pw, top + (pctY / 100) * ph];
}

type WedgeSide = "top" | "right" | "bottom" | "left";

/** Thought-bubble trail: a few dots that shrink toward the thinker. */
const TRAIL_SAMPLES = 24;
const TRAIL_TAPER = 0.6;
const TRAIL_MIN_R = 1.8;
const TRAIL_MAX_BUBBLES = 6;
const TRAIL_HEAD_RATIO = 0.32;
const TRAIL_MAX_HEAD_R = 16;

/** Picks the bounding-box face that the tail tip points away from. */
function pickWedgeSide(
  left: number,
  top: number,
  right: number,
  bottom: number,
  tip: Point,
): WedgeSide {
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const dx = tip[0] - cx;
  const dy = tip[1] - cy;
  if (Math.abs(dy) * (right - left) >= Math.abs(dx) * (bottom - top)) {
    return dy >= 0 ? "bottom" : "top";
  }
  return dx >= 0 ? "right" : "left";
}

/**
 * Builds a rounded rectangle whose `side` is interrupted by a pointy wedge aimed at `tip`.
 * Path travels clockwise; base points are ordered along that direction.
 */
function buildBubblePath(
  left: number,
  top: number,
  right: number,
  bottom: number,
  r: number,
  side: WedgeSide,
  tip: Point,
  tailWidth: number,
): string {
  const w = right - left;
  const h = bottom - top;
  const cx = (left + right) / 2;
  const cy = (top + bottom) / 2;
  const p: string[] = [`M ${left + r} ${top}`];

  if (side === "top") {
    const bw = Math.max(8, Math.min(tailWidth, w - 2 * r));
    const minX = left + r + bw / 2;
    const maxX = right - r - bw / 2;
    const bx = minX <= maxX ? Math.max(minX, Math.min(maxX, tip[0])) : cx;
    const ty = Math.min(tip[1], top - 4);
    p.push(`H ${bx - bw / 2}`, `L ${tip[0]} ${ty}`, `L ${bx + bw / 2} ${top}`, `H ${right - r}`);
  } else {
    p.push(`H ${right - r}`);
  }

  p.push(`A ${r} ${r} 0 0 1 ${right} ${top + r}`);

  if (side === "right") {
    const bw = Math.max(8, Math.min(tailWidth, h - 2 * r));
    const minY = top + r + bw / 2;
    const maxY = bottom - r - bw / 2;
    const by = minY <= maxY ? Math.max(minY, Math.min(maxY, tip[1])) : cy;
    const tx = Math.max(tip[0], right + 4);
    p.push(`V ${by - bw / 2}`, `L ${tx} ${tip[1]}`, `L ${right} ${by + bw / 2}`, `V ${bottom - r}`);
  } else {
    p.push(`V ${bottom - r}`);
  }

  p.push(`A ${r} ${r} 0 0 1 ${right - r} ${bottom}`);

  if (side === "bottom") {
    const bw = Math.max(8, Math.min(tailWidth, w - 2 * r));
    const minX = left + r + bw / 2;
    const maxX = right - r - bw / 2;
    const bx = minX <= maxX ? Math.max(minX, Math.min(maxX, tip[0])) : cx;
    const ty = Math.max(tip[1], bottom + 4);
    p.push(`H ${bx + bw / 2}`, `L ${tip[0]} ${ty}`, `L ${bx - bw / 2} ${bottom}`, `H ${left + r}`);
  } else {
    p.push(`H ${left + r}`);
  }

  p.push(`A ${r} ${r} 0 0 1 ${left} ${bottom - r}`);

  if (side === "left") {
    const bw = Math.max(8, Math.min(tailWidth, h - 2 * r));
    const minY = top + r + bw / 2;
    const maxY = bottom - r - bw / 2;
    const by = minY <= maxY ? Math.max(minY, Math.min(maxY, tip[1])) : cy;
    const tx = Math.min(tip[0], left - 4);
    p.push(`V ${by + bw / 2}`, `L ${tx} ${tip[1]}`, `L ${left} ${by - bw / 2}`, `V ${top + r}`);
  } else {
    p.push(`V ${top + r}`);
  }

  p.push(`A ${r} ${r} 0 0 1 ${left + r} ${top} Z`);
  return p.join(" ");
}

/**
 * Options for the box (rounded rectangle) path generator.
 * @category Shape & Frame
 */
export interface BoxPathOptions {
  /** Corner radius in pixels (default: 12). */
  radius?: number;
}

/**
 * Options for the circle / ellipse path generator.
 * @category Shape & Frame
 */
export interface CirclePathOptions {
  /**
   * Sizing mode:
   * - "contain" (default): preserves a 1:1 circular aspect ratio centered inside the bounds.
   * - "fill": stretches to the bounding box as a smooth ellipse.
   */
  fit?: "contain" | "fill";
}

/**
 * Options for the diamond path generator.
 * @category Shape & Frame
 */
export interface DiamondPathOptions {
  /** Corner tip radius in pixels (default: 10.5). */
  radius?: number;
}

/**
 * Options for the triangle path generator.
 * @category Shape & Frame
 */
export interface TrianglePathOptions {
  /** Triangle orientation: "up" (default), "down", "left", or "right". */
  direction?: "up" | "down" | "left" | "right";
  /** Corner rounding radius in pixels (default: 10). */
  radius?: number;
}

/**
 * Options for the hexagon path generator.
 * @category Shape & Frame
 */
export interface HexagonPathOptions {
  /** Hexagon orientation: "pointy" (default, vertex at top) or "flat" (flat horizontal top). */
  orientation?: "pointy" | "flat";
}

/**
 * Options for the star path generator.
 * @category Shape & Frame
 */
export interface StarPathOptions {
  /** Number of star points (default: 5). */
  points?: number;
  /** Ratio of inner radius to outer radius between 0 and 1 (default: 0.45). */
  innerRadius?: number;
}

/**
 * Options for the squircle (superellipse) path generator.
 * @category Shape & Frame
 */
export interface SquirclePathOptions {
  /** Curvature tension between 0 (sharp) and 1 (round, default: 0.82). */
  curvature?: number;
}

/**
 * Options for the regular polygon path generator.
 * @category Shape & Frame
 */
export interface PolygonPathOptions {
  /** Number of sides (minimum: 3, default: 5). */
  sides?: number;
}

/**
 * Options for the speech bubble path generator.
 * @category Shape & Frame
 */
export interface SpeechBubblePathOptions {
  /** Corner radius in pixels (default: 12). */
  radius?: number;
  /**
   * Tail placement:
   * - Live target: a DOM element, `{ to, anchor?, padding? }`, or a stage `[x, y]` point. Tracks the target each frame.
   * - Local preset: `"bottom"` (default) | `"bottom-left"` | `"top-right"` | `"left"` | `"right"` | etc.
   * - Number: tail length in pixels for the local preset (default: 16).
   */
  tail?: BubbleTail;
  /** Width of the tail base where it joins the bubble body (default: 24). */
  tailWidth?: number;
}

/**
 * Options for the thought bubble path generator.
 * @category Shape & Frame
 */
export interface ThoughtBubblePathOptions {
  /**
   * Trail placement:
   * - Live target: a DOM element, `{ to, anchor?, padding? }`, or a stage `[x, y]` point. Tracks the target each frame.
   * - Local preset: `"bottom-left"` (default) | `"bottom-right"` | `"top-left"` | `"top-right"` | etc.
   * - Number: trail length in pixels for the local preset (default: 30).
   */
  tail?: BubbleTail;
  /** Number of cloud puffs (default: 9). */
  lobes?: number;
}

/**
 * Geometric SVG path generators for shapes, cards, and clipping frames.
 * @category Shape & Frame
 */
export const paths = {
  /**
   * Generates a rectangle with optional rounded corners.
   */
  box(options: BoxPathOptions = {}): PathFunction {
    const defaultRadius = options.radius ?? 12;
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const maxR = Math.min(geo.pw / 2, geo.ph / 2);
      const r = Math.min(Math.max(0, defaultRadius), maxR);
      let tl = r;
      let tr = r;
      let br = r;
      let bl = r;

      const ruleSide = (ctx as { ruleSide?: string } | undefined)?.ruleSide;
      if (ruleSide === "left") {
        tl = 0;
        bl = 0;
      } else if (ruleSide === "right") {
        tr = 0;
        br = 0;
      } else if (ruleSide === "top") {
        tl = 0;
        tr = 0;
      } else if (ruleSide === "bottom") {
        bl = 0;
        br = 0;
      }

      return roundedRectPerCorner(geo.pad, geo.pw, geo.ph, { tl, tr, br, bl });
    };
  },

  /**
   * Generates a circle or ellipse fitting inside bounds.
   * - `fit: "contain"` (default): forces a 1:1 circular aspect ratio.
   * - `fit: "fill"`: stretches to the full bounding box as an ellipse.
   */
  circle(options: CirclePathOptions = {}): PathFunction {
    const fit = options.fit ?? "contain";
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const rx = fit === "fill" ? geo.pw / 2 : Math.min(geo.pw, geo.ph) / 2;
      const ry = fit === "fill" ? geo.ph / 2 : rx;
      if (rx <= 0 || ry <= 0) return "";
      const k = 0.5522847498307935;
      const kx = rx * k;
      const ky = ry * k;
      const { cx, cy } = geo;
      return (
        `M ${cx} ${cy - ry} ` +
        `C ${cx + kx} ${cy - ry} ${cx + rx} ${cy - ky} ${cx + rx} ${cy} ` +
        `C ${cx + rx} ${cy + ky} ${cx + kx} ${cy + ry} ${cx} ${cy + ry} ` +
        `C ${cx - kx} ${cy + ry} ${cx - rx} ${cy + ky} ${cx - rx} ${cy} ` +
        `C ${cx - rx} ${cy - ky} ${cx - kx} ${cy - ry} ${cx} ${cy - ry} Z`
      );
    };
  },

  /**
   * Generates a capsule / pill path with fully rounded ends.
   */
  pill(): PathFunction {
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const cr = Math.min(geo.pw, geo.ph) / 2;
      return roundedRectPerCorner(geo.pad, geo.pw, geo.ph, { tl: cr, tr: cr, br: cr, bl: cr });
    };
  },

  /**
   * Generates a diamond (rhombus) decision shape with softly rounded tips.
   */
  diamond(options: DiamondPathOptions = {}): PathFunction {
    const maxRadius = options.radius ?? 10.5;
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { pad, pw, ph, cx, cy } = geo;
      const cr = Math.min(maxRadius, pw * 0.15, ph * 0.15);
      const f = cr / Math.SQRT2;
      return (
        `M ${cx + f} ${pad + f} ` +
        `L ${pad + pw - f} ${cy - f} ` +
        `A ${cr} ${cr} 0 0 1 ${pad + pw - f} ${cy + f} ` +
        `L ${cx + f} ${pad + ph - f} ` +
        `A ${cr} ${cr} 0 0 1 ${cx - f} ${pad + ph - f} ` +
        `L ${pad + f} ${cy + f} ` +
        `A ${cr} ${cr} 0 0 1 ${pad + f} ${cy - f} ` +
        `L ${cx - f} ${pad + f} ` +
        `A ${cr} ${cr} 0 0 1 ${cx + f} ${pad + f} Z`
      );
    };
  },

  /**
   * Generates a triangle pointing in the specified direction with rounded corners.
   */
  triangle(options: TrianglePathOptions = {}): PathFunction {
    const direction = options.direction ?? "up";
    const requestedRadius = options.radius ?? 10;

    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { cx, cy, pw, ph, left, right, top, bottom } = geo;

      // Calculate 3 vertices based on direction
      let v1: [number, number];
      let v2: [number, number];
      let v3: [number, number];

      switch (direction) {
        case "down":
          v1 = [cx, bottom];
          v2 = [left, top];
          v3 = [right, top];
          break;
        case "left":
          v1 = [left, cy];
          v2 = [right, top];
          v3 = [right, bottom];
          break;
        case "right":
          v1 = [right, cy];
          v2 = [left, bottom];
          v3 = [left, top];
          break;
        default:
          v1 = [cx, top];
          v2 = [right, bottom];
          v3 = [left, bottom];
          break;
      }

      const cr = Math.min(requestedRadius, pw * 0.15, ph * 0.15);
      if (cr <= 0) {
        return `M ${v1[0]} ${v1[1]} L ${v2[0]} ${v2[1]} L ${v3[0]} ${v3[1]} Z`;
      }

      // Helper to calculate arc points at each corner
      const roundCorner = (
        prev: [number, number],
        curr: [number, number],
        next: [number, number],
      ): { inPoint: [number, number]; outPoint: [number, number] } => {
        const dxIn = prev[0] - curr[0];
        const dyIn = prev[1] - curr[1];
        const lenIn = Math.hypot(dxIn, dyIn) || 1;

        const dxOut = next[0] - curr[0];
        const dyOut = next[1] - curr[1];
        const lenOut = Math.hypot(dxOut, dyOut) || 1;

        const offset = Math.min(cr * 1.5, lenIn * 0.35, lenOut * 0.35);

        return {
          inPoint: [curr[0] + (dxIn / lenIn) * offset, curr[1] + (dyIn / lenIn) * offset],
          outPoint: [curr[0] + (dxOut / lenOut) * offset, curr[1] + (dyOut / lenOut) * offset],
        };
      };

      const c1 = roundCorner(v3, v1, v2);
      const c2 = roundCorner(v1, v2, v3);
      const c3 = roundCorner(v2, v3, v1);

      return (
        `M ${c1.outPoint[0]} ${c1.outPoint[1]} ` +
        `L ${c2.inPoint[0]} ${c2.inPoint[1]} ` +
        `A ${cr} ${cr} 0 0 1 ${c2.outPoint[0]} ${c2.outPoint[1]} ` +
        `L ${c3.inPoint[0]} ${c3.inPoint[1]} ` +
        `A ${cr} ${cr} 0 0 1 ${c3.outPoint[0]} ${c3.outPoint[1]} ` +
        `L ${c1.inPoint[0]} ${c1.inPoint[1]} ` +
        `A ${cr} ${cr} 0 0 1 ${c1.outPoint[0]} ${c1.outPoint[1]} Z`
      );
    };
  },

  /**
   * Generates a regular hexagon.
   */
  hexagon(options: HexagonPathOptions = {}): PathFunction {
    const orientation = options.orientation ?? "pointy";
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { cx, cy, pw, ph } = geo;
      const rx = pw / 2;
      const ry = ph / 2;

      const points: [number, number][] = [];
      const offsetAngle = orientation === "pointy" ? -Math.PI / 2 : 0;
      for (let i = 0; i < 6; i++) {
        const angle = offsetAngle + (i * Math.PI) / 3;
        points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
      }

      const [start, ...rest] = points;
      return `M ${start[0]} ${start[1]} ${rest.map((p) => `L ${p[0]} ${p[1]}`).join(" ")} Z`;
    };
  },

  /**
   * Generates a multi-point star shape.
   */
  star(options: StarPathOptions = {}): PathFunction {
    const pointsCount = Math.max(3, options.points ?? 5);
    const innerRatio = Math.max(0.1, Math.min(0.9, options.innerRadius ?? 0.45));

    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { cx, cy, pw, ph } = geo;
      const rx = pw / 2;
      const ry = ph / 2;

      const totalVertices = pointsCount * 2;
      const vertices: [number, number][] = [];
      const step = Math.PI / pointsCount;
      const startAngle = -Math.PI / 2;

      for (let i = 0; i < totalVertices; i++) {
        const angle = startAngle + i * step;
        const rRatio = i % 2 === 0 ? 1 : innerRatio;
        vertices.push([cx + rx * rRatio * Math.cos(angle), cy + ry * rRatio * Math.sin(angle)]);
      }

      const [start, ...rest] = vertices;
      return `M ${start[0]} ${start[1]} ${rest.map((p) => `L ${p[0]} ${p[1]}`).join(" ")} Z`;
    };
  },

  /**
   * Generates a squircle (superellipse) with continuous G2 curvature.
   */
  squircle(options: SquirclePathOptions = {}): PathFunction {
    const tension = Math.max(0.2, Math.min(0.98, options.curvature ?? 0.82));

    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { pad, pw, ph, cx, cy } = geo;
      const rx = pw / 2;
      const ry = ph / 2;

      const right = pad + pw;
      const bottom = pad + ph;
      const top = pad;
      const left = pad;

      const dx = rx * tension;
      const dy = ry * tension;

      return (
        `M ${cx} ${top} ` +
        `C ${cx + dx} ${top}, ${right} ${cy - dy}, ${right} ${cy} ` +
        `C ${right} ${cy + dy}, ${cx + dx} ${bottom}, ${cx} ${bottom} ` +
        `C ${cx - dx} ${bottom}, ${left} ${cy + dy}, ${left} ${cy} ` +
        `C ${left} ${cy - dy}, ${cx - dx} ${top}, ${cx} ${top} Z`
      );
    };
  },

  /**
   * Generates a symmetrical heart shape.
   */
  heart(): PathFunction {
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { pad, pw, ph, cx } = geo;
      const top = pad;
      const bottom = pad + ph;
      const right = pad + pw;
      const left = pad;

      const cleftY = top + ph * 0.26;

      return (
        `M ${cx} ${cleftY} ` +
        `C ${cx - pw * 0.18} ${top}, ${left} ${top + ph * 0.05}, ${left} ${top + ph * 0.38} ` +
        `C ${left} ${top + ph * 0.62}, ${cx - pw * 0.22} ${top + ph * 0.82}, ${cx} ${bottom} ` +
        `C ${cx + pw * 0.22} ${top + ph * 0.82}, ${right} ${top + ph * 0.62}, ${right} ${top + ph * 0.38} ` +
        `C ${right} ${top + ph * 0.05}, ${cx + pw * 0.18} ${top}, ${cx} ${cleftY} Z`
      );
    };
  },

  /**
   * Generates a regular N-sided polygon (pentagon, octagon, etc.).
   */
  polygon(options: PolygonPathOptions = {}): PathFunction {
    const sideCount = Math.max(3, options.sides ?? 5);
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { cx, cy, pw, ph } = geo;
      const rx = pw / 2;
      const ry = ph / 2;

      const points: [number, number][] = [];
      const offsetAngle = -Math.PI / 2;
      for (let i = 0; i < sideCount; i++) {
        const angle = offsetAngle + (i * 2 * Math.PI) / sideCount;
        points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
      }

      const [start, ...rest] = points;
      return `M ${start[0]} ${start[1]} ${rest.map((p) => `L ${p[0]} ${p[1]}`).join(" ")} Z`;
    };
  },

  /**
   * Generates a speech bubble with a pointy pointer tail.
   * Pass a live target (element or stage point) to make the tail track it each frame.
   */
  speechBubble(options: SpeechBubblePathOptions = {}): PathFunction {
    const radius = options.radius ?? 12;
    const tailWidth = options.tailWidth ?? 24;
    const parsed = parseTail(options.tail, "bottom", 16);

    const fn: PathFunction = (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { pad, pw, ph, left, right, top, bottom } = geo;

      let tip: Point | null = null;
      let bodyLeft = left;
      let bodyTop = top;
      let bodyRight = right;
      let bodyBottom = bottom;

      if (parsed.kind === "target") {
        tip =
          (ctx as PathRuntimeContext | undefined)?.resolveTail?.(
            parsed.target as DOMElement | Point,
            parsed.anchor,
            parsed.padding,
          ) ?? null;
      } else if (parsed.length > 0) {
        // Local tail: aim at a preset/corner inside the bounds and reserve space on that axis.
        tip = localTailTip(parsed.anchor as ElementAnchor, pw, ph, left, top);
        const side = pickWedgeSide(left, top, right, bottom, tip);
        const margin = Math.min(parsed.length, Math.min(pw, ph) / 2);
        if (side === "bottom" || side === "top") {
          bodyTop = top + margin;
          bodyBottom = bottom - margin;
        } else {
          bodyLeft = left + margin;
          bodyRight = right - margin;
        }
      }

      const r = Math.min(
        Math.max(0, radius),
        (bodyRight - bodyLeft) / 2,
        (bodyBottom - bodyTop) / 2,
      );

      if (!tip) {
        return roundedRectPerCorner(pad, pw, ph, { tl: r, tr: r, br: r, bl: r });
      }

      const side = pickWedgeSide(bodyLeft, bodyTop, bodyRight, bodyBottom, tip);
      return buildBubblePath(bodyLeft, bodyTop, bodyRight, bodyBottom, r, side, tip, tailWidth);
    };

    if (parsed.kind === "target") markDynamicPath(fn);
    return fn;
  },

  /**
   * Generates a scalloped thought cloud with a curved trail of shrinking bubbles.
   * Pass a live target (element or stage point) to make the trail track it each frame.
   */
  thoughtBubble(options: ThoughtBubblePathOptions = {}): PathFunction {
    const lobes = Math.max(3, Math.round(options.lobes ?? 9));
    const parsed = parseTail(options.tail, "bottom-left", 30);

    const fn: PathFunction = (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { pw, ph, cx, cy, left, top } = geo;

      const rx = pw * 0.38;
      const ry = ph * 0.35;

      const ring = ellipseRing(cx, cy, rx, ry, lobes);
      const cloud = ring
        .map(([x, y], i) => {
          const [px, py] = ring[(i + lobes - 1) % lobes];
          const r = Math.hypot(x - px, y - py) * 0.72;
          return `${i ? "" : `M ${px} ${py} `}A ${r} ${r} 0 0 1 ${x} ${y}`;
        })
        .join(" ");

      let tip: Point | null = null;
      if (parsed.kind === "target") {
        tip =
          (ctx as PathRuntimeContext | undefined)?.resolveTail?.(
            parsed.target as DOMElement | Point,
            parsed.anchor,
            parsed.padding,
          ) ?? null;
      } else if (parsed.length > 0) {
        tip = localTailTip(parsed.anchor as ElementAnchor, pw, ph, left, top);
      }

      if (!tip) return `${cloud} Z`;

      // Exit point on the cloud ellipse in the direction of the target.
      const angle = Math.atan2(tip[1] - cy, tip[0] - cx);
      const exitX = cx + rx * Math.cos(angle);
      const exitY = cy + ry * Math.sin(angle);

      const ex = tip[0] - exitX;
      const ey = tip[1] - exitY;
      const vlen = Math.hypot(ex, ey);
      if (vlen < 10) return `${cloud} Z`;

      // Perpendicular vector for a slight whimsical bow.
      const ux = ex / vlen;
      const uy = ey / vlen;
      const bow = vlen * 0.12;
      const midX = (exitX + tip[0]) / 2 - uy * bow;
      const midY = (exitY + tip[1]) / 2 + ux * bow;

      const spine = (t: number): Point => {
        const it = 1 - t;
        return [
          it * it * exitX + 2 * it * t * midX + t * t * tip[0],
          it * it * exitY + 2 * it * t * midY + t * t * tip[1],
        ];
      };

      // Sample the spine into an arc-length table so bubbles can be placed by distance.
      const cum: number[] = [0];
      for (let i = 1; i <= TRAIL_SAMPLES; i++) {
        const a = spine((i - 1) / TRAIL_SAMPLES);
        const b = spine(i / TRAIL_SAMPLES);
        cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]));
      }
      const arcLen = cum[TRAIL_SAMPLES];
      const tAtDistance = (d: number): number => {
        if (d <= 0) return 0;
        if (d >= arcLen) return 1;
        let i = 1;
        while (i < cum.length - 1 && cum[i] < d) i++;
        const seg = cum[i] - cum[i - 1] || 1;
        return (i - 1 + (d - cum[i - 1]) / seg) / TRAIL_SAMPLES;
      };

      // Head size follows the cloud, not the distance, so far targets never inflate it.
      const clearance = Math.min(28, Math.max(5, Math.min(rx, ry) * 0.34));
      const usable = Math.max(4, arcLen - clearance);
      const headR = Math.max(3, Math.min(TRAIL_MAX_HEAD_R, Math.min(rx, ry) * TRAIL_HEAD_RATIO));

      // A short tapering run of dots, ending in a small one.
      const radii: number[] = [];
      for (let r = headR; radii.length < TRAIL_MAX_BUBBLES && r >= TRAIL_MIN_R; r *= TRAIL_TAPER) {
        radii.push(r);
      }

      // Melded (touching) when it fits; otherwise scale down. Leftover length becomes dot gaps.
      const naturalSpan = 2 * radii.reduce((a, b) => a + b, 0);
      if (naturalSpan > usable) {
        const scale = usable / naturalSpan;
        for (let i = 0; i < radii.length; i++) radii[i] *= scale;
      }
      const steps = radii.slice(0, -1).map((r, i) => r + radii[i + 1]);
      const usedSpan = steps.reduce((a, b) => a + b, 0) + radii[0] + radii[radii.length - 1];
      const gap = steps.length > 0 ? Math.max(0, (usable - usedSpan) / steps.length) : 0;

      const bubbles: string[] = [];
      let d = clearance + radii[0];
      for (let i = 0; i < radii.length; i++) {
        const [bx, by] = spine(tAtDistance(Math.max(0, Math.min(arcLen, d))));
        const r = radii[i];
        bubbles.push(
          `M ${bx - r} ${by} a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0`,
        );
        if (i < steps.length) d += steps[i] + gap;
      }

      return `${cloud} Z ${bubbles.join(" ")}`;
    };

    if (parsed.kind === "target") markDynamicPath(fn);
    return fn;
  },
};
