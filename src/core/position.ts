/**
 * Position resolution and circular path geometry.
 */

/** An x and y pair, where either axis may be omitted. */
export interface AxisPair {
  x?: unknown;
  y?: unknown;
}

/** Reads the current coordinate, used to resolve updater functions. */
export type CurrentPosition = () => [number, number];

export function resolveCoords(target: unknown, current: CurrentPosition): AxisPair {
  let val = target;

  if (typeof val === "function") {
    const [cx, cy] = current();
    const fn = val as (...args: unknown[]) => unknown;
    val = fn.length === 2 ? fn(cx, cy) : fn([cx, cy]);
  }

  if (val === "center") {
    return { x: "center", y: "center" };
  }

  if (Array.isArray(val)) {
    return { x: val[0], y: val[1] };
  }

  if (typeof val === "object" && val !== null) {
    const p = val as AxisPair;
    return { x: p.x, y: p.y };
  }

  return {};
}

/** Samples a circular arc in stage coordinates. */
export function arcPosition(
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
