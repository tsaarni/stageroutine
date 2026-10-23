import { interpolateValue } from "./interpolators";
import { createPositionSampler } from "./position-motion";
import type { Point, TransitionRecord } from "./types";

export interface ScheduledTransition extends TransitionRecord {
  startFrom: unknown;
  startOffsetMs: number;
  endOffsetMs: number;
  positionSampler?: (progress: number) => Point;
}

/** Resolves timing for a batch of scene or interactive transitions. */
export function scheduleTransitions(
  records: readonly TransitionRecord[],
  readStart: (record: TransitionRecord) => unknown,
): ScheduledTransition[] {
  const scheduled = records.map((t) => ({
    ...t,
    startFrom: readStart(t),
    startOffsetMs: t.delayMs,
    endOffsetMs: t.delayMs + t.durationMs,
  }));
  for (let pass = 0; pass < scheduled.length; pass++) {
    for (const t of scheduled) {
      const matching = scheduled.filter(
        (other) =>
          other !== t &&
          other.elementId === t.triggerElementId &&
          (!t.triggerProperty ||
            other.property === t.triggerProperty ||
            (other.property === "position" &&
              (t.triggerProperty === "x" || t.triggerProperty === "y")) ||
            (t.triggerProperty === "position" &&
              (other.property === "x" || other.property === "y"))),
      );
      if (!t.triggerElementId || matching.length === 0) continue;
      const milestone = t.triggerMilestone ?? "end";
      let fraction = 1;
      if (milestone === "start") fraction = 0;
      else if (milestone === "halfway") fraction = 0.5;
      else if (typeof milestone === "number") fraction = milestone;
      const offset =
        fraction === 0
          ? Math.min(...matching.map((m) => m.startOffsetMs))
          : Math.max(...matching.map((m) => m.startOffsetMs + m.durationMs * fraction));
      t.startOffsetMs = offset + t.delayMs;
      t.endOffsetMs = t.startOffsetMs + t.durationMs;
    }
  }
  return scheduled;
}

/** Samples a transition, including an instantaneous transition at its start. */
export function sampleTransition(
  t: ScheduledTransition,
  elapsed: number,
  context?: HTMLElement,
): {
  value: unknown;
  progress: number;
  easedProgress: number;
} {
  if (elapsed < t.startOffsetMs) return { value: t.startFrom, progress: 0, easedProgress: 0 };
  if (elapsed >= t.endOffsetMs) return { value: t.to, progress: 1, easedProgress: 1 };
  const progress = (elapsed - t.startOffsetMs) / t.durationMs;
  const easedProgress = t.curve(progress);
  if (t.property === "position") {
    const from = t.startFrom as Point;
    const to = t.to as Point;
    const eased = easedProgress;
    const centerFrom = t.motion?.fromCenter ?? from;
    const centerTo = t.motion?.toCenter ?? to;
    t.positionSampler ??= createPositionSampler(t.motion?.path, centerFrom, centerTo);
    const center = t.positionSampler(eased);
    return {
      progress,
      easedProgress,
      value: center.map(
        (v, i) => v + (from[i] - centerFrom[i]) * (1 - eased) + (to[i] - centerTo[i]) * eased,
      ),
    };
  }
  return {
    progress,
    easedProgress,
    value: interpolateValue(t.startFrom, t.to, easedProgress, t.property, context),
  };
}
