import { resolveAnchor } from "../core/interpolators";
import type { ElementAnchor, Point } from "../core/types";
import type { TransformOptions } from "../decorators/transform";
import { localTransform } from "./transform";

/** Source corners in stage units: top-left, top-right, bottom-right, bottom-left. @category Motion */
export type ProjectedQuad = readonly [Point, Point, Point, Point];

/** Authored element geometry with an optional local transform. @category Motion */
export interface ElementPlane {
  /** Pivot position in stage units. Required; no default. */
  position: Point;
  /** Unscaled width and height in stage units. Required; no default. */
  size: Point;
  /** Element pivot. Default: "top-left". */
  origin?: ElementAnchor;
  /** Element rotation in degrees. Default: 0. */
  rotation?: number;
  /** Element scale multiplier. Default: 1. */
  scale?: number;
  /** Local transform effect. Default: none. */
  transform?: TransformOptions;
}

function corners(plane: ElementPlane): ProjectedQuad {
  const {
    position: [x, y],
    size: [width, height],
    scale = 1,
    rotation = 0,
  } = plane;
  const [ox, oy] = resolveAnchor(plane.origin);
  if (
    ![x, y, width, height, scale, rotation, ox, oy].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0
  )
    throw new RangeError("An element plane needs finite values and positive dimensions.");
  const local = localTransform(plane.transform);
  const angle = (rotation * Math.PI) / 180;
  const project = (px: number, py: number): Point => {
    const [lx, ly] = local.project([px - (width * ox) / 100, py - (height * oy) / 100]);
    return [
      x + scale * (lx * Math.cos(angle) - ly * Math.sin(angle)),
      y + scale * (lx * Math.sin(angle) + ly * Math.cos(angle)),
    ];
  };
  return [project(0, 0), project(width, 0), project(width, height), project(0, height)];
}

function bounds(quad: ProjectedQuad) {
  const xs = quad.map(([x]) => x);
  const ys = quad.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Measures independently transformed elements in stage units. @category Motion */
export const space = {
  /** Projects element corners. Default: no local transform, top-left origin. */
  corners,
  /** Measures the axis-aligned bounds of projected corners in stage units. */
  bounds,
};
