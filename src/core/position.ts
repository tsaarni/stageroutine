/**
 * Position resolution.
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
