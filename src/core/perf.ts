/**
 * On-demand frame-cadence probes for diagnosing jank from the browser console
 * or the Chrome DevTools MCP `evaluate_script` tool.
 *
 * Exposed as `window.__STAGEROUTINE_DEV__.perf`. Every probe creates a
 * temporary requestAnimationFrame sampler and removes it when finished, so it
 * adds no cost while the stage is at rest.
 */

import type { Stage } from "./stage";

/** Frame cadence statistics for one sampled window. */
export interface FrameSampleStats {
  /** Number of frame intervals observed. */
  frames: number;
  /** Frames per second derived from the median interval. */
  hz: number;
  /** Median frame interval in milliseconds. */
  p50Ms: number;
  /** 95th percentile frame interval in milliseconds. */
  p95Ms: number;
  /** Longest frame interval in milliseconds. */
  maxMs: number;
  /** Intervals longer than 1.5x the median. */
  dropped: number;
}

/** Cadence of a single presentation step. */
export interface StepPerfReport {
  /** 0-based step index. */
  index: number;
  /** Scene name owning the step. */
  scene: string;
  /** Cadence while settled on the step. */
  restHz: number;
  /** Cadence of the transition entering the step. Omitted for step 0. */
  enterHz?: number;
  /** True when `minHz` was requested and a cadence is below it. */
  overBudget?: boolean;
}

/** Options for `perf.run`. */
export interface PerfRunOptions {
  /** First step to measure. Default 0. */
  first?: number;
  /** Last step to measure. Default `first`. */
  last?: number;
  /** Rest sample window in milliseconds. Default 700. */
  ms?: number;
  /** Expected minimum frames per second used to set `overBudget`. */
  minHz?: number;
}

/** Result of `perf.run`. */
export interface PerfReport {
  /** Fastest cadence observed across all samples. Proxy for display refresh. */
  bestHz: number;
  /** Per-step measurements, in order. */
  steps: StepPerfReport[];
}

/** Frame-cadence probes exposed on `window.__STAGEROUTINE_DEV__.perf`. */
export interface PerfProbe {
  /** Measure the current frame cadence for `durationMs`. Default 700. */
  sample(durationMs?: number): Promise<FrameSampleStats>;
  /** Walk steps `first`..`last` and report rest and entering-transition cadence. */
  run(options?: PerfRunOptions): Promise<PerfReport>;
}

interface StageInternals {
  isAnimating: boolean;
  steps: { sceneName: string }[];
  emit(event: string, data?: unknown): void;
}

const REST_MS = 700;
const TRANSITION_MS = 2500;
const WARMUP_MS = 300;

function percentile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function summarize(deltas: number[]): FrameSampleStats {
  const sorted = deltas.filter((d) => d > 0).sort((a, b) => a - b);
  if (sorted.length === 0) {
    return { frames: 0, hz: 0, p50Ms: 0, p95Ms: 0, maxMs: 0, dropped: 0 };
  }
  const p50 = percentile(sorted, 0.5);
  return {
    frames: sorted.length,
    hz: p50 > 0 ? Math.round(1000 / p50) : 0,
    p50Ms: round(p50),
    p95Ms: round(percentile(sorted, 0.95)),
    maxMs: round(sorted[sorted.length - 1]),
    dropped: sorted.filter((d) => d > p50 * 1.5).length,
  };
}

function sampleFrames(durationMs: number, stopAfter?: () => boolean): Promise<FrameSampleStats> {
  return new Promise((resolve) => {
    const deltas: number[] = [];
    const start = performance.now();
    let last = 0;
    const tick = (now: number): void => {
      if (last > 0) deltas.push(now - last);
      last = now;
      const elapsed = now - start;
      const done =
        elapsed >= durationMs || (stopAfter !== undefined && elapsed > 50 && stopAfter());
      if (done) {
        resolve(summarize(deltas));
        return;
      }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

function nextFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForRest(stage: StageInternals): Promise<void> {
  await nextFrame();
  for (let guard = 0; stage.isAnimating && guard < 600; guard++) {
    await nextFrame();
  }
}

/**
 * Creates the frame-cadence probe bound to a stage instance.
 * @internal
 */
export function createPerfProbe(stage: Stage): PerfProbe {
  const s = stage as unknown as StageInternals;

  const sample = (durationMs = REST_MS): Promise<FrameSampleStats> => sampleFrames(durationMs);

  const run = async (options: PerfRunOptions = {}): Promise<PerfReport> => {
    const lastStep = s.steps.length - 1;
    if (lastStep < 0) return { bestHz: 0, steps: [] };

    const ms = options.ms ?? REST_MS;
    const first = Math.max(0, Math.min(lastStep, options.first ?? 0));
    const last = Math.max(first, Math.min(lastStep, options.last ?? first));
    const steps: StepPerfReport[] = [];
    let bestHz = 0;

    for (let index = first; index <= last; index++) {
      let enterHz: number | undefined;
      if (index > 0) {
        s.emit("req:nav:gotoStep", { index: index - 1 });
        await waitForRest(s);
        await delay(WARMUP_MS);
        const sampling = sampleFrames(Math.max(ms, TRANSITION_MS), () => !s.isAnimating);
        s.emit("req:nav:nextStep");
        enterHz = (await sampling).hz;
      } else {
        s.emit("req:nav:gotoStep", { index: 0 });
        await waitForRest(s);
        await delay(WARMUP_MS);
      }

      const restHz = (await sampleFrames(ms)).hz;
      bestHz = Math.max(bestHz, restHz, enterHz ?? 0);

      steps.push({
        index,
        scene: s.steps[index]?.sceneName ?? "Default",
        restHz,
        enterHz,
        overBudget:
          options.minHz === undefined
            ? undefined
            : restHz < options.minHz || (enterHz ?? options.minHz) < options.minHz,
      });
    }

    return { bestHz, steps };
  };

  return { sample, run };
}
