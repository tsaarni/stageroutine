/**
 * Reactive property metadata and registry for StageRoutine.
 * Delineates animatable presentation properties from internal component state.
 */

const EMPTY_SET: ReadonlySet<string> = new Set<string>();

export const CORE_REACTIVE_KEYS: ReadonlySet<string> = new Set([
  "x",
  "y",
  "width",
  "height",
  "scale",
  "rotation",
  "opacity",
  "blur",
  "brightness",
  "color",
  "anchor",
  "align",
]);

/**
 * Returns all reactive property names registered on a target instance or constructor.
 */
export function getReactiveKeys(target: unknown): ReadonlySet<string> {
  if (!target || typeof target !== "object") return EMPTY_SET;
  const fromInstance = (target as { reactiveKeys?: ReadonlySet<string> }).reactiveKeys;
  if (fromInstance) return fromInstance;
  const fromCtor = (target.constructor as { reactiveKeys?: ReadonlySet<string> }).reactiveKeys;
  return fromCtor ?? CORE_REACTIVE_KEYS;
}

/**
 * Checks if a property on a target instance or constructor is registered as reactive.
 */
export function isReactiveProperty(target: unknown, prop: string | symbol): boolean {
  if (typeof prop !== "string" || !target || typeof target !== "object") return false;
  if (prop === "size") return true;
  const keys = getReactiveKeys(target);
  return keys.has(prop);
}
