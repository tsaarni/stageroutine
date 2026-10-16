import type { BezierMotionOptions, MotionPath, Point, SpiralMotionOptions } from "../core/types";

function point(value: Point): Point {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isFinite))
    throw new TypeError("Motion control points must contain two finite stage coordinates.");
  return Object.freeze([value[0], value[1]] as const);
}

function controls(options: BezierMotionOptions): BezierMotionOptions {
  return { control1: point(options.control1), control2: point(options.control2) };
}

/** Reusable route factories for position transitions. @category Motion */
export const motion = {
  /** Circular sweep in degrees, from -180 to 180. Positive is clockwise. Default: 0. */
  arc(degrees = 0): MotionPath {
    if (!Number.isFinite(degrees) || Math.abs(degrees) > 180)
      throw new RangeError("Arc sweep must be finite and between -180 and 180 degrees.");
    return (from, to) => (t) => arcPosition(from, to, t, degrees);
  },
  /** Cubic Bézier controls in stage units, fixed or resolved per movement. No default controls. */
  bezier(
    options: BezierMotionOptions | ((from: Point, to: Point) => BezierMotionOptions),
  ): MotionPath {
    const resolve: (from: Point, to: Point) => BezierMotionOptions = (() => {
      if (typeof options === "function") return (from, to) => controls(options(from, to));
      const fixed = controls(options);
      return () => fixed;
    })();
    return (from, to) => {
      const { control1: a, control2: b } = resolve(from, to);
      return (t) => {
        const u = 1 - t;
        return [
          u ** 3 * from[0] + 3 * u ** 2 * t * a[0] + 3 * u * t ** 2 * b[0] + t ** 3 * to[0],
          u ** 3 * from[1] + 3 * u ** 2 * t * a[1] + 3 * u * t ** 2 * b[1] + t ** 3 * to[1],
        ];
      };
    };
  },
  /** Wind inward around the destination. Default: 1 clockwise turn; range: -10 to 10 turns. */
  spiral(options: SpiralMotionOptions = {}): MotionPath {
    const turns = options.turns ?? 1;
    if (!Number.isFinite(turns) || Math.abs(turns) > 10)
      throw new RangeError("Spiral turns must be finite and between -10 and 10.");
    return (from, to) => (t) => {
      const angle = 2 * Math.PI * turns * t;
      const dx = (from[0] - to[0]) * (1 - t);
      const dy = (from[1] - to[1]) * (1 - t);
      return [
        to[0] + dx * Math.cos(angle) - dy * Math.sin(angle),
        to[1] + dx * Math.sin(angle) + dy * Math.cos(angle),
      ];
    };
  },
};

/** Samples a circular arc in stage coordinates. */
function arcPosition(
  from: readonly number[],
  to: readonly number[],
  progress: number,
  degrees: number,
): [number, number] {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  if (degrees === 0 || (dx === 0 && dy === 0))
    return [from[0] + dx * progress, from[1] + dy * progress];
  const angle = (degrees * Math.PI) / 180;
  const a = angle * progress;
  // Chord coordinates avoid subtracting large circle centers for shallow arcs.
  const halfSinSquared = Math.sin(a / 2) ** 2;
  const factor = 1 / Math.tan(angle / 2);
  const along = halfSinSquared + (factor * Math.sin(a)) / 2;
  const across = factor * halfSinSquared - Math.sin(a) / 2;
  return [from[0] + dx * along - dy * across, from[1] + dy * along + dx * across];
}
