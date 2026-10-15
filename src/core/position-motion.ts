import { arcPosition } from "./position";
import type { MotionPath, Point, PositionMotion } from "./types";

/** Private metadata survives descriptor spreading without expanding the public API. */
export const positionMotion = Symbol("positionMotion");

export function getPositionMotion(value: object): PositionMotion | undefined {
  return (value as { [positionMotion]?: PositionMotion })[positionMotion];
}

export function copyPositionMotion(source: object, destination: object): void {
  Object.assign(destination, { [positionMotion]: getPositionMotion(source) });
}

/** Compiles a route once; easing then selects normalized travel distance. */
export function createPositionSampler(
  path: MotionPath | undefined,
  from: Point,
  to: Point,
): (progress: number) => Point {
  if (!path || path.kind === "arc")
    return (progress) => arcPosition(from, to, progress, path?.degrees ?? 0);

  const raw = (t: number): Point => {
    if (path.kind === "bezier") {
      const u = 1 - t;
      return [
        u ** 3 * from[0] +
          3 * u ** 2 * t * path.control1[0] +
          3 * u * t ** 2 * path.control2[0] +
          t ** 3 * to[0],
        u ** 3 * from[1] +
          3 * u ** 2 * t * path.control1[1] +
          3 * u * t ** 2 * path.control2[1] +
          t ** 3 * to[1],
      ];
    }
    const angle = 2 * Math.PI * path.turns * t;
    const dx = (from[0] - to[0]) * (1 - t);
    const dy = (from[1] - to[1]) * (1 - t);
    return [
      to[0] + dx * Math.cos(angle) - dy * Math.sin(angle),
      to[1] + dx * Math.sin(angle) + dy * Math.cos(angle),
    ];
  };
  // More segments for additional turns keep tight spiral arrivals smooth.
  const segments =
    path.kind === "spiral" ? Math.max(512, Math.ceil(Math.abs(path.turns) * 256)) : 512;
  const lengths = [0];
  let previous = from;
  for (let i = 1; i <= segments; i++) {
    const next = raw(i / segments);
    lengths.push(lengths[i - 1] + Math.hypot(next[0] - previous[0], next[1] - previous[1]));
    previous = next;
  }
  const total = lengths[segments];
  return (progress) => {
    if (progress <= 0) return from;
    if (progress >= 1) return to;
    if (total === 0) return from;
    const distance = total * progress;
    let low = 0;
    let high = segments;
    while (high - low > 1) {
      const mid = (low + high) >>> 1;
      if (lengths[mid] < distance) low = mid;
      else high = mid;
    }
    const span = lengths[high] - lengths[low];
    const fraction = span === 0 ? 0 : (distance - lengths[low]) / span;
    return raw((low + fraction) / segments);
  };
}
