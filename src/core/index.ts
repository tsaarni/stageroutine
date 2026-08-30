/**
 * Exports the core animation engine, stage director, proxies, and state snapshots.
 */

export { createStage, getActiveStage, Stage } from "./stage";
export { interpolateValue, lerpNumber, lerpColor, parseUnitValue, px } from "./interpolators";
export { createReactiveProxy } from "./proxy";
export { MetricRegistry, type MetricMap, type MetricValue, type MetricGetter } from "./metrics";
export * from "./types";
