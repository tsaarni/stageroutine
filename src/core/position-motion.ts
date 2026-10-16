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
  from = Object.freeze([...from]) as Point;
  to = Object.freeze([...to]) as Point;
  if (!path) return (t) => [from[0] + (to[0] - from[0]) * t, from[1] + (to[1] - from[1]) * t];
  const raw = path(from, to);
  const segments = 4096;
  const lengths = [0];
  let previous = from;
  for (let i = 1; i <= segments; i++) {
    const next = raw(i / segments);
    lengths.push(lengths[i - 1] + Math.hypot(next[0] - previous[0], next[1] - previous[1]));
    previous = next;
  }
  const total = lengths[segments];
  return (progress) => {
    if (progress === 0) return from;
    if (progress === 1) return to;
    if (progress < 0 || progress > 1) {
      const start = progress < 0;
      const endpoint = start ? from : to;
      const neighbor = raw(start ? 1 / segments : 1 - 1 / segments);
      const dx = start ? neighbor[0] - from[0] : to[0] - neighbor[0];
      const dy = start ? neighbor[1] - from[1] : to[1] - neighbor[1];
      const length = Math.hypot(dx, dy);
      const distance = (progress - (start ? 0 : 1)) * total;
      return length === 0
        ? endpoint
        : [endpoint[0] + (dx / length) * distance, endpoint[1] + (dy / length) * distance];
    }
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
