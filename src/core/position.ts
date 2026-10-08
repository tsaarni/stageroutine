/**
 * Splits `position` assignments into separate x and y assignments.
 */

import { isTransitionDescriptor } from "../motion/transitions";

/** An x and y pair, where either axis may be omitted. */
export interface AxisPair {
  x?: unknown;
  y?: unknown;
}

/** Reads the current coordinate, used to resolve updater functions. */
export type CurrentPosition = () => [number, number];

function resolveCoords(target: unknown, current: CurrentPosition): AxisPair {
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

/**
 * Splits a `position` value into x and y assignments.
 * A transition is kept on both axes, so they animate together.
 */
export function splitPosition(value: unknown, current: CurrentPosition): AxisPair {
  if (value === undefined || value === null) return {};

  if (isTransitionDescriptor(value)) {
    const { x, y } = resolveCoords(value.target, current);
    return {
      x: x === undefined ? undefined : { ...value, target: x },
      y: y === undefined ? undefined : { ...value, target: y },
    };
  }

  return resolveCoords(value, current);
}
