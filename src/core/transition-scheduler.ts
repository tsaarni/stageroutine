import { interpolateValue } from "./interpolators";
import type { TransitionRecord } from "./types";

export interface ScheduledTransition extends TransitionRecord {
  startFrom: unknown;
  startOffsetMs: number;
  endOffsetMs: number;
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
          (!t.triggerProperty || other.property === t.triggerProperty),
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
} {
  if (elapsed < t.startOffsetMs) return { value: t.startFrom, progress: 0 };
  if (elapsed >= t.endOffsetMs) return { value: t.to, progress: 1 };
  const progress = (elapsed - t.startOffsetMs) / t.durationMs;
  return {
    progress,
    value: interpolateValue(t.startFrom, t.to, t.curve(progress), t.property, context),
  };
}
