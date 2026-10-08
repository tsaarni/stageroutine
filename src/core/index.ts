/**
 * Exports the core animation engine, stage director, proxies, and state snapshots.
 */

export {
  computeTransform,
  interpolateValue,
  lerpColor,
  lerpNumber,
  parseUnitValue,
  resolveAnchor,
  unitsToPx,
} from "./interpolators";
export { type LogLevel, logger } from "./logger";
export {
  type BaseMetricOptions,
  Counter,
  type CounterOptions,
  Gauge,
  type GaugeOptions,
  type LabeledItem,
  type MetricFamily,
  type MetricGaugeValue,
  type MetricLabels,
  MetricRegistry,
  type MetricSample,
  type MetricType,
} from "./metrics";
export { createReactiveProxy } from "./proxy";
export {
  CORE_REACTIVE_KEYS,
  getReactiveKeys,
  isReactiveProperty,
} from "./reactive";
export { getActiveStage, Stage, tryGetActiveStage } from "./stage";
export {
  StageStorage,
  type StorageBackend,
  type StorageListener,
  StorageScope,
  storage,
} from "./storage";
export * from "./types";
export {
  cssLength,
  STAGE_UNIT_VAR,
  STAGE_UNITS_TALL,
  stageUnitPx,
  stageUnitsWide,
  units,
} from "./units";
