import { test as baseTest, expect, type Locator, type Page } from "@playwright/test";
import type { FrameSampleStats, PerfReport, PerfRunOptions } from "../../src/core/perf.ts";
import type { OutlineScene } from "../../src/core/stage.ts";
import type * as SR from "../../src/index.ts";

/** Shape of the global __STAGEROUTINE_DEV__ object. */
interface StageDevHook {
  getMetrics: (pattern?: RegExp) => string;
  getMetricsData: (pattern?: RegExp) => Record<string, unknown>;
  perf: {
    sample: (ms?: number) => Promise<FrameSampleStats>;
    run: (options?: PerfRunOptions) => Promise<PerfReport>;
  };
  outline: () => OutlineScene[];
}

/**
 * Driver that mounts and controls StageRoutine presentations inside Playwright tests.
 * All dev hooks are queried via `window.__STAGEROUTINE_DEV__` without altering core runtime APIs.
 */
export class StageDriver {
  constructor(public readonly page: Page) {}

  /**
   * Initializes the browser sandbox page.
   */
  async init(): Promise<void> {
    await this.page.goto("/");
    await this.page.waitForFunction(
      () => typeof (window as unknown as { __SR__?: unknown }).__SR__ !== "undefined",
    );
  }

  /**
   * Mounts a presentation onto the stage using an inline setup function.
   * By default, automatically waits until the mounted stage settles into a clean rest state.
   */
  async mount(
    setupFn: (sr: typeof SR) => unknown,
    options: { waitForRest?: boolean } = {},
  ): Promise<void> {
    const fnStr = setupFn.toString();
    await this.page.evaluate((fnString) => {
      (
        window as unknown as {
          __SR_RUN_SETUP__: (code: string) => void;
        }
      ).__SR_RUN_SETUP__(fnString);
    }, fnStr);

    if (options.waitForRest !== false) {
      await this.expectAtRest();
    }
  }

  /** Maps stage units to browser pixels, including scaling and letterboxing. */
  async stageUnitsToClientPixels(x: number, y: number): Promise<{ x: number; y: number }> {
    return this.page.evaluate(
      ({ x, y }) => {
        const stage = window.__STAGE_INSTANCE__;
        const viewport = document.querySelector("#stage > div");
        if (!stage || !viewport) throw new Error("Stage is not mounted");
        const rect = viewport.getBoundingClientRect();
        return {
          x: rect.left + (x / stage.unitsWide) * rect.width,
          y: rect.top + (y / stage.unitsTall) * rect.height,
        };
      },
      { x, y },
    );
  }

  /** Clicks at stage coordinates, in stage units. */
  async clickAtStageUnits(x: number, y: number): Promise<void> {
    const point = await this.stageUnitsToClientPixels(x, y);
    await this.page.mouse.click(point.x, point.y);
  }

  /**
   * Advances to the next step via keyboard and waits for transitions to settle at rest.
   */
  async next(): Promise<void> {
    await this.page.keyboard.press("ArrowRight");
    await this.expectAtRest();
  }

  /**
   * Goes back to the previous step via keyboard and waits for restoration to settle at rest.
   */
  async prev(): Promise<void> {
    await this.page.keyboard.press("ArrowLeft");
    await this.expectAtRest();
  }

  /**
   * Reloads the page and waits for stage restoration to settle at rest.
   */
  async reload(): Promise<void> {
    await this.page.reload();
    await this.expectAtRest();
  }

  /**
   * Reads structured diagnostic metrics, optionally filtered by RegExp.
   */
  async getMetrics(pattern?: RegExp): Promise<Record<string, unknown>> {
    return this.page.evaluate((patSource) => {
      const dev = (window as unknown as { __STAGEROUTINE_DEV__?: StageDevHook })
        .__STAGEROUTINE_DEV__;
      const regex = patSource ? new RegExp(patSource) : undefined;
      return dev?.getMetricsData?.(regex) ?? {};
    }, pattern?.source);
  }

  /**
   * Reads a single metric value from `window.__STAGEROUTINE_DEV__`.
   */
  async getMetric(name: string): Promise<unknown> {
    const metrics = await this.getMetrics();
    return metrics[name];
  }

  /**
   * Samples frame cadence (Hz, frame durations, dropped frames) over a time window.
   */
  async samplePerf(ms = 500): Promise<FrameSampleStats> {
    return this.page.evaluate((duration) => {
      const dev = (window as unknown as { __STAGEROUTINE_DEV__?: StageDevHook })
        .__STAGEROUTINE_DEV__;
      if (!dev?.perf?.sample) {
        throw new Error("__STAGEROUTINE_DEV__.perf.sample is not available");
      }
      return dev.perf.sample(duration);
    }, ms);
  }

  /**
   * Runs performance stepping benchmark across a range of presentation steps.
   */
  async runPerf(options?: PerfRunOptions): Promise<PerfReport> {
    return this.page.evaluate((opts) => {
      const dev = (window as unknown as { __STAGEROUTINE_DEV__?: StageDevHook })
        .__STAGEROUTINE_DEV__;
      if (!dev?.perf?.run) {
        throw new Error("__STAGEROUTINE_DEV__.perf.run is not available");
      }
      return dev.perf.run(opts);
    }, options);
  }

  /**
   * Returns the structural scene/step outline from `window.__STAGEROUTINE_DEV__.outline()`.
   */
  async getOutline(): Promise<OutlineScene[]> {
    return this.page.evaluate(() => {
      const dev = (window as unknown as { __STAGEROUTINE_DEV__?: StageDevHook })
        .__STAGEROUTINE_DEV__;
      return dev?.outline?.() ?? [];
    });
  }

  /**
   * Asserts that the stage has settled into a clean rest state:
   * - `stage_is_animating === 0`
   * - `stage_active_raf_count === 0`
   * - `dom_detached_elements === 0` (no retention leaks)
   * - `dom_promoted === 0` (no will-change layer leaks)
   * - `animation_running === 0` (no Web Animations running while at rest)
   * - `animation_hidden_running === 0` (no invisible running animations)
   */
  async expectAtRest(timeout = 5000): Promise<void> {
    await expect
      .poll(
        async () => {
          const metrics = await this.getMetrics();
          const runningAnimations =
            metrics.animation_running_count ?? metrics.animation_running ?? 0;
          return {
            animating: Number(metrics.stage_is_animating ?? 0),
            activeRaf: Number(metrics.stage_active_raf_count ?? 0),
            detached: Number(metrics.dom_detached_elements ?? 0),
            promoted: Number(metrics.dom_promoted ?? 0),
            hiddenRunning: Number(metrics.animation_hidden_running ?? 0),
            runningAnims: Number(runningAnimations),
          };
        },
        {
          message:
            "Expected Stage to settle into a clean rest state with 0 active animations and 0 leaks",
          timeout,
        },
      )
      .toEqual({
        animating: 0,
        activeRaf: 0,
        detached: 0,
        promoted: 0,
        hiddenRunning: 0,
        runningAnims: 0,
      });
  }

  /**
   * Returns a Locator for an element matching the given selector or element ID.
   */
  locator(selector: string): Locator {
    return this.page.locator(selector);
  }
}

/**
 * Extended Playwright test fixture providing an initialized `stage` driver.
 */
export const test = baseTest.extend<{ stage: StageDriver }>({
  stage: async ({ page }, use) => {
    const driver = new StageDriver(page);
    await driver.init();
    await use(driver);
  },
});

export { expect } from "@playwright/test";
