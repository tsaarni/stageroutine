import type { BezierMotionOptions, MotionPath, Point, SpiralMotionOptions } from "../core/types";

function point(value: Point): Point {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isFinite))
    throw new TypeError("Motion control points must contain two finite stage coordinates.");
  return Object.freeze([value[0], value[1]] as const);
}

/** Travel routes for position transitions. @category Motion */
export const motionPaths = {
  /** Circular sweep in degrees, from -180 to 180. Positive is clockwise. Default: 0. */
  arc(degrees = 0): MotionPath {
    if (!Number.isFinite(degrees) || Math.abs(degrees) > 180)
      throw new RangeError("Arc sweep must be finite and between -180 and 180 degrees.");
    return Object.freeze({ kind: "arc", degrees });
  },
  /** Cubic Bézier with two absolute control points in stage units. No default controls. */
  bezier(options: BezierMotionOptions): MotionPath {
    return Object.freeze({
      kind: "bezier",
      control1: point(options.control1),
      control2: point(options.control2),
    });
  },
  /** Wind inward around the destination. Default: 1 clockwise turn; range: -10 to 10 turns. */
  spiral(options: SpiralMotionOptions = {}): MotionPath {
    const turns = options.turns ?? 1;
    if (!Number.isFinite(turns) || Math.abs(turns) > 10)
      throw new RangeError("Spiral turns must be finite and between -10 and 10.");
    return Object.freeze({ kind: "spiral", turns });
  },
};

/** Copies and validates structurally authored path values. */
export function copyMotionPath(path: MotionPath): MotionPath {
  switch (path.kind) {
    case "arc":
      return motionPaths.arc(path.degrees);
    case "bezier":
      return motionPaths.bezier(path);
    case "spiral":
      return motionPaths.spiral(path);
    default:
      throw new TypeError("Unknown motion path kind.");
  }
}
