/**
 * The main presentation director managing scenes, step transitions, snapshots, and the virtual viewport.
 */

import { builtinEasings } from "../motion/transitions";
import { PresenterHost } from "../presenter/host";
import { defaultDark } from "../theme/presets";
import { applyThemeTokens } from "../theme/tokens";
import { computeTransformAndOrigin, interpolateValue } from "./interpolators";
import { logger } from "./logger";
import { MetricRegistry } from "./metrics";
import { createPerfProbe, type PerfProbe } from "./perf";
import { createReactiveProxy } from "./proxy";
import { getReactiveKeys } from "./reactive";
import { storage } from "./storage";
import type {
  AnimationMilestone,
  Background,
  EaseCurve,
  ElementAnchor,
  OverlayContext,
  OverlayPlugin,
  ReactiveElementBase,
  StageEventMap,
  StageOptions,
  StepData,
  StepSnapshot,
  ThemeConfig,
  TransitionRecord,
} from "./types";

declare const __STAGEROUTINE_CHANNEL__: string | false | undefined;
declare const __STAGEROUTINE_WIDTH__: number | undefined;
declare const __STAGEROUTINE_HEIGHT__: number | undefined;

function resolveDefaultChannel(): string | false {
  return (
    (globalThis as { __STAGEROUTINE_CHANNEL__?: string | false }).__STAGEROUTINE_CHANNEL__ ??
    (typeof __STAGEROUTINE_CHANNEL__ !== "undefined"
      ? __STAGEROUTINE_CHANNEL__
      : "stageroutine-channel")
  );
}

function resolveDefaultWidth(): number {
  return (
    Number((globalThis as { __STAGEROUTINE_WIDTH__?: number }).__STAGEROUTINE_WIDTH__) ||
    (typeof __STAGEROUTINE_WIDTH__ !== "undefined" ? __STAGEROUTINE_WIDTH__ : 1920)
  );
}

function resolveDefaultHeight(): number {
  return (
    Number((globalThis as { __STAGEROUTINE_HEIGHT__?: number }).__STAGEROUTINE_HEIGHT__) ||
    (typeof __STAGEROUTINE_HEIGHT__ !== "undefined" ? __STAGEROUTINE_HEIGHT__ : 1080)
  );
}

const VALID_CLASS_IDENTIFIER = /^[a-zA-Z_-][\w-]*$/;
const TRANSITION_START_MARK = "sr/start";
const TRANSITION_END_MARK = "sr/end";

/** A single step in the dev outline. */
interface OutlineStep {
  /** Global 0-based step index, matching the URL fragment (`#scene/<step>`). */
  step: number;
  /** Speaker notes for the step, if any. */
  notes?: string;
  /** Number of elements active on this step. */
  elements: number;
}

/** A scene in the dev outline, with its steps in order. */
interface OutlineScene {
  /** Scene name. */
  name: string;
  steps: OutlineStep[];
}

function getElementTargetInfo(node: Element): {
  elementId?: string;
  target: string;
} {
  const root = node.closest?.("[data-sr-id]");
  const elementId = root?.getAttribute("data-sr-id") ?? undefined;

  const parts: string[] = [];
  let curr: Element | null = node;

  while (curr && curr !== document.body && parts.length < 5) {
    if (curr === root && elementId) {
      parts.unshift(`[data-sr-id=${elementId}]`);
      break;
    }
    if (curr.id) {
      parts.unshift(`#${curr.id}`);
      break;
    }
    let part = curr.tagName.toLowerCase();
    const rawClass = curr.getAttribute("class");
    if (rawClass) {
      const firstClass = rawClass.trim().split(/\s+/)[0];
      if (firstClass && VALID_CLASS_IDENTIFIER.test(firstClass)) {
        part += `.${firstClass}`;
      }
    }
    parts.unshift(part);
    curr = curr.parentElement;
  }

  if (
    elementId &&
    parts.length > 0 &&
    !parts[0].startsWith("[data-sr-id=") &&
    !parts[0].startsWith("#")
  ) {
    parts.unshift(`[data-sr-id=${elementId}]`);
  }

  return {
    elementId,
    target: parts.join(" > ") || node.tagName.toLowerCase(),
  };
}

class SceneBuilder {
  private stage: Stage;
  readonly name: string;

  constructor(stage: Stage, name: string) {
    this.stage = stage;
    this.name = name;
  }

  with(
    ...elements: (
      | ReactiveElementBase
      | { items?: ReactiveElementBase[] }
      | { rows?: ReactiveElementBase[] }
      | { elements?: readonly unknown[] }
      | Iterable<unknown>
      | null
      | undefined
      | false
    )[]
  ): this {
    const flattened: ReactiveElementBase[] = [];
    const registerAndPush = (item: unknown, ownerId?: string) => {
      if (!item || typeof item !== "object") return;
      let elementId: string | undefined;
      if ("id" in item && "domElement" in item) {
        const reactiveEl = item as ReactiveElementBase;
        elementId = reactiveEl.id;
        if (!this.stage.hasElement(elementId)) {
          this.stage.registerElement(reactiveEl);
        }
        flattened.push(reactiveEl);
        if (ownerId) {
          this.stage._markParentOwned(elementId);
        }
      }
      if ("items" in item && Array.isArray((item as { items?: unknown[] }).items)) {
        for (const sub of (item as { items: unknown[] }).items) {
          registerAndPush(sub, elementId);
        }
      }
      if ("rows" in item && Array.isArray((item as { rows?: unknown[] }).rows)) {
        for (const sub of (item as { rows: unknown[] }).rows) {
          registerAndPush(sub, elementId);
        }
      }
      if ("elements" in item && Array.isArray((item as { elements?: unknown[] }).elements)) {
        for (const sub of (item as { elements: unknown[] }).elements) {
          registerAndPush(sub);
        }
      }
    };

    for (const el of elements) {
      if (!el || typeof el !== "object") continue;
      if (
        Symbol.iterator in el &&
        typeof (el as Iterable<unknown>)[Symbol.iterator] === "function" &&
        !("domElement" in el)
      ) {
        for (const sub of el as Iterable<unknown>) {
          registerAndPush(sub);
        }
      } else {
        registerAndPush(el);
      }
    }
    this.stage._setActiveScene(this.name, flattened);
    return this;
  }

  theme(config: ThemeConfig): this {
    this.stage.theme(config);
    return this;
  }

  background(bg: Background | ReactiveElementBase | string): this {
    this.stage.background(bg);
    return this;
  }
}

/**
 * Presentation director managing scenes, step transitions, snapshots, and the virtual viewport.
 * @category Core
 */
export class Stage {
  private options: StageOptions;
  private container: HTMLElement | null = null;
  private viewport: HTMLElement | null = null;

  // Recording State
  private currentSceneName = "Default";
  private activeElementIds = new Set<string>();
  private elementRegistry = new Map<string, ReactiveElementBase>();
  /** Ids of elements nested inside a parent container (items/rows); the parent owns their visibility. */
  private ownedByParent = new Set<string>();
  private initialProperties = new Map<string, Record<string, unknown>>();
  private propertyState = new Map<string, Record<string, unknown>>();
  private currentTheme: ThemeConfig = {};
  private backgroundSource: string | Background | ReactiveElementBase | null = null;

  private steps: StepData[] = [];
  private snapshots: StepSnapshot[] = [];
  private currentStepTransitions: TransitionRecord[] = [];
  private currentStepActions: (() => void)[] = [];
  private currentStepNotes: string | undefined = undefined;
  private notesDoc = "";
  private pendingMotionFlushes = new Set<() => void>();
  private isMountedState = false;

  isMounted(): boolean {
    return this.isMountedState;
  }

  registerPendingFlush(flush: () => void): () => void {
    this.pendingMotionFlushes.add(flush);
    return () => {
      this.pendingMotionFlushes.delete(flush);
    };
  }

  recordAction(action: () => void): void {
    this.currentStepActions.push(action);
  }

  // Playback State
  private currentStepIndex = 0;
  private isAnimating = false;
  private animFrameId: number | null = null;
  private presenterHost: PresenterHost | null = null;
  private activeSceneName = "";
  private promotedElements = new Set<HTMLElement>();
  private listeners = new Map<string, Set<(data: unknown) => void>>();
  /** Undo functions for DOM and global listeners registered by `mount()`. */
  private mountCleanups: (() => void)[] = [];
  /** Overlays that have received a mount context, in mount order. */
  private mountedOverlays: OverlayPlugin[] = [];

  // Metrics & Performance Tracking
  readonly metrics = new MetricRegistry();
  private lastFrameTime = 0;
  private lastFrameDurationMs = 0;
  private maxFrameDurationMs = 0;
  private currentFps = 60;
  private syncStateBroadcasts = 0;
  private activeTransitionsSnapshot: {
    elementId: string;
    property: string;
    startFrom: unknown;
    to: unknown;
    durationMs: number;
    elapsedMs: number;
    progress: number;
  }[] = [];

  // Overlay Plugins
  private overlays: OverlayPlugin[] = [];

  /**
   * Attaches an overlay plugin to the stage.
   *
   * If the stage is already mounted, the overlay is mounted immediately.
   * Otherwise it is queued and mounted when `mount()` is called.
   *
   * @example
   * ```ts
   * stage.overlay(NavigationOverlay());
   * ```
   */
  overlay(plugin: OverlayPlugin): this {
    this.overlays.push(plugin);
    if (this.container) {
      this._mountOverlay(plugin);
      this._broadcastPointerState();
    }
    return this;
  }

  private _mountOverlay(plugin: OverlayPlugin): void {
    plugin.mount(this._createOverlayContext());
    this.mountedOverlays.push(plugin);
  }

  private _broadcastPointerState(): void {
    const active = storage.runtime.get<boolean>("pointer.active", false);
    this.emit("evt:pointer:stateChanged", { active });
  }

  private _createOverlayContext(): OverlayContext {
    const container = this.container;
    const viewport = this.viewport;
    if (!container || !viewport) {
      throw new Error("Cannot create overlay context before stage is mounted");
    }
    return {
      container,
      viewport,
      width: this.options.width || 1920,
      height: this.options.height || 1080,
      next: () => this.emit("req:nav:nextStep"),
      prev: () => this.emit("req:nav:prevStep"),
      nextScene: () => this.emit("req:nav:nextScene"),
      prevScene: () => this.emit("req:nav:prevScene"),
      emit: this.emit.bind(this),
      on: this.on.bind(this),
    };
  }

  on<K extends keyof StageEventMap>(
    event: K,
    handler: (data: StageEventMap[K]) => void,
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    const genericHandler = handler as (data: unknown) => void;
    set.add(genericHandler);
    return () => {
      set?.delete(genericHandler);
    };
  }

  emit<K extends keyof StageEventMap>(
    event: K,
    ...args: StageEventMap[K] extends undefined ? [] : [data: StageEventMap[K]]
  ): void {
    const data = args[0] as StageEventMap[K];
    const set = this.listeners.get(event);
    if (!set) return;
    for (const handler of set) {
      try {
        handler(data);
      } catch (err) {
        logger.error(`Error in stage event handler for "${event}":`, err);
      }
    }
  }

  /**
   * Initializes a new presentation Stage.
   *
   * @remarks
   * As a side effect, the constructor sets this instance as the module-global
   * `activeStage` singleton used by standalone component factories and motion helpers.
   * Creating multiple `Stage` instances simultaneously in the same JS execution
   * context will cause the latter instance to overwrite `activeStage`.
   */
  constructor(options: StageOptions = {}) {
    activeStage = this;
    (window as unknown as { __stage?: Stage }).__stage = this;
    const defaultWidth = resolveDefaultWidth();
    const defaultHeight = resolveDefaultHeight();
    const defaultChannel = resolveDefaultChannel();

    this.options = {
      defaultDuration: 0.6,
      theme: defaultDark,
      ...options,
      width: options.width ?? defaultWidth,
      height: options.height ?? defaultHeight,
      channel: options.channel !== undefined ? options.channel : defaultChannel,
    };

    this.currentTheme = {
      ...defaultDark,
      ...(this.options.theme || {}),
    };

    if (this.options.logLevel) {
      logger.setLevel(this.options.logLevel);
    }

    this._registerCoreMetrics();

    // Register navigation request handlers on the event bus
    this.on("req:nav:nextStep", () => this._next());
    this.on("req:nav:prevStep", () => this._prev());
    this.on("req:nav:nextScene", () => this._nextScene());
    this.on("req:nav:prevScene", () => this._prevScene());
    this.on("req:nav:gotoScene", (data) => this._gotoScene(data.index));
    this.on("req:nav:gotoStep", (data) => this._gotoStep(data.index));
    this.on("req:stage:requestState", () => this._broadcastState());
    this.on("req:pointer:setState", (data) => this._setPointerActive(data.active));

    const channelName = this.options.channel;
    if (channelName) {
      this.presenterHost = new PresenterHost(this, channelName);
    }
  }

  /** Virtual stage canvas width in pixels (default: 1920). */
  get width(): number {
    return this.options.width || 1920;
  }

  /** Virtual stage canvas height in pixels (default: 1080). */
  get height(): number {
    return this.options.height || 1080;
  }

  private _setPointerActive(active: boolean): void {
    storage.runtime.set("pointer.active", active);
    this.emit("evt:pointer:stateChanged", { active });
  }

  private _cachedDomMetrics: {
    time: number;
    totalRegistered: number;
    activeInScene: number;
    visibleInScene: number;
    dormantCount: number;
    detachedCount: number;
    promotedNodes: HTMLElement[];
    stageTotalNodes: number;
  } | null = null;

  private _getDomMetrics() {
    const now = performance.now();
    if (this._cachedDomMetrics && now - this._cachedDomMetrics.time < 50) {
      return this._cachedDomMetrics;
    }
    const step = this.steps[this.currentStepIndex];
    const activeIds = step?.activeElementIds;
    let totalRegistered = 0;
    let activeInScene = 0;
    let visibleCount = 0;
    let dormantCount = 0;
    let detachedCount = 0;

    for (const [id, el] of this.elementRegistry.entries()) {
      totalRegistered++;
      const inActiveScene = activeIds ? activeIds.has(id) : false;
      if (inActiveScene) activeInScene++;
      const props = this.propertyState.get(id) || {};
      const opacity = (props.opacity as number) ?? 1;
      if (inActiveScene && opacity > 0) visibleCount++;
      if (el.domElement?.style.display === "none") dormantCount++;
      if (el.domElement && !el.domElement.isConnected) detachedCount++;
    }

    const promotedNodes = this.viewport
      ? (Array.from(this.viewport.querySelectorAll('[style*="will-change"]')).filter((node) => {
          const s = (node as HTMLElement).style.willChange;
          return s && s !== "auto";
        }) as HTMLElement[])
      : [];

    const stats = {
      time: now,
      totalRegistered,
      activeInScene,
      visibleInScene: visibleCount,
      dormantCount,
      detachedCount,
      promotedNodes,
      stageTotalNodes: this.viewport ? this.viewport.getElementsByTagName("*").length : 0,
    };
    this._cachedDomMetrics = stats;
    return stats;
  }

  private _cachedAnimationMetrics: {
    time: number;
    hiddenRunningCount: number;
    runningList: { labels: Record<string, string>; value: number }[];
    connectorPulses: number;
  } | null = null;

  private _cachedVisibleVideos: { time: number; count: number } | null = null;

  private _getAnimationMetrics() {
    const now = performance.now();
    if (this._cachedAnimationMetrics && now - this._cachedAnimationMetrics.time < 50) {
      return this._cachedAnimationMetrics;
    }

    const allAnimations = document.getAnimations();
    let hiddenRunningCount = 0;
    const runningList: { labels: Record<string, string>; value: number }[] = [];

    for (const anim of allAnimations) {
      if (anim.playState !== "running") continue;

      const target = (anim.effect as { target?: Element } | null)?.target;
      const isElement = target instanceof HTMLElement || target instanceof SVGElement;
      const targetEl = isElement ? (target as HTMLElement | SVGElement) : null;
      let isHidden = false;
      if (targetEl) {
        if (!targetEl.isConnected) {
          isHidden = true;
        } else if (typeof targetEl.checkVisibility === "function") {
          isHidden = !targetEl.checkVisibility({ opacityProperty: true, visibilityProperty: true });
        } else {
          let curr: Element | null = targetEl;
          while (curr && curr !== document.body) {
            const s = (curr as HTMLElement | SVGElement).style;
            if (
              s.display === "none" ||
              s.visibility === "hidden" ||
              (s.opacity && Number.parseFloat(s.opacity) === 0)
            ) {
              isHidden = true;
              break;
            }
            curr = curr.parentElement;
          }
        }
      }
      if (isHidden) hiddenRunningCount++;

      const info = targetEl ? getElementTargetInfo(targetEl) : { target: "unknown" };
      const labels: Record<string, string> = {
        name: (anim as CSSAnimation).animationName || anim.id || "unnamed",
        target: info.target,
        hidden: isHidden ? "1" : "0",
      };
      if (info.elementId) {
        labels.element_id = info.elementId;
      }

      runningList.push({
        labels,
        value: 1,
      });
    }

    const pulsePackets = document.querySelectorAll(".sr-pulse-packet");
    const stats = {
      time: now,
      hiddenRunningCount,
      runningList,
      connectorPulses: pulsePackets.length,
    };
    this._cachedAnimationMetrics = stats;
    return stats;
  }

  private _getBackgroundMetrics(): Record<string, unknown> | null {
    if (!this.backgroundSource) return null;
    if (typeof this.backgroundSource === "string") {
      return { kind: "color", value: this.backgroundSource };
    }
    const bg = this.backgroundSource as {
      _getMetrics?: () => Record<string, unknown>;
      kind?: string;
      isRunning?: boolean;
    };
    if (typeof bg._getMetrics === "function") {
      return bg._getMetrics();
    }
    return {
      kind: bg.kind ?? "custom",
      is_running: bg.isRunning ? 1 : 0,
    };
  }

  private _visibleVideos(): number {
    const now = performance.now();
    if (this._cachedVisibleVideos && now - this._cachedVisibleVideos.time < 50) {
      return this._cachedVisibleVideos.count;
    }
    let count = 0;
    for (const video of document.querySelectorAll("video")) {
      if (!video.currentSrc && !video.srcObject) continue;
      if (typeof video.checkVisibility === "function") {
        if (!video.checkVisibility()) continue;
      } else if (!video.offsetParent) {
        continue;
      }
      const rect = video.getBoundingClientRect();
      if (rect.width < 2 || rect.height < 2) continue;
      count++;
    }
    this._cachedVisibleVideos = { time: now, count };
    return count;
  }

  private _registerCoreMetrics(): void {
    // Stage Render Loop & Frame Diagnostics
    this.metrics.gauge({
      name: "stage_is_animating",
      help: "Transition playing (1 = animating, 0 = at rest).",
      collect: () => (this.isAnimating ? 1 : 0),
    });

    this.metrics.gauge({
      name: "stage_active_raf_count",
      help: "Stage rAF loops running. Must be 0 at rest.",
      collect: () => (this.animFrameId !== null ? 1 : 0),
    });

    this.metrics.gauge({
      name: "stage_fps",
      help: "FPS of the last step transition. Frozen at rest; cross-check stage_is_animating.",
      unit: "fps",
      collect: () => Math.round(this.currentFps),
    });

    this.metrics.gauge({
      name: "stage_last_frame_duration_ms",
      help: "Last transition frame duration (ms). Frozen at rest.",
      unit: "ms",
      collect: () => Number(this.lastFrameDurationMs.toFixed(2)),
    });

    this.metrics.gauge({
      name: "stage_max_frame_duration_ms",
      help: "Peak transition frame duration (ms). Frozen at rest.",
      unit: "ms",
      collect: () => Number(this.maxFrameDurationMs.toFixed(2)),
    });

    this.metrics.gauge({
      name: "stage_step_index",
      help: "Current step index (0-based).",
      collect: () => this.currentStepIndex,
    });

    this.metrics.gauge({
      name: "stage_total_steps",
      help: "Total steps.",
      collect: () => this.steps.length,
    });

    this.metrics.gauge({
      name: "stage_scene_info",
      help: "Current scene.",
      collect: () => {
        const step = this.steps[this.currentStepIndex];
        return {
          labels: { scene: step?.sceneName ?? "Default" },
          value: 1,
        };
      },
    });

    // Active Transitions Breakdown
    this.metrics.gauge({
      name: "stage_transitions",
      help: "Active property transitions (progress 0..1).",
      collect: () =>
        this.activeTransitionsSnapshot.map((t) => ({
          labels: {
            element: t.elementId,
            property: t.property,
          },
          value: Number(t.progress.toFixed(3)),
        })),
    });

    // DOM Footprint, Dormancy & Retention Diagnostics
    this.metrics.gauge({
      name: "dom_total_registered",
      help: "Registered elements.",
      collect: () => this._getDomMetrics().totalRegistered,
    });

    this.metrics.gauge({
      name: "dom_active_in_scene",
      help: "Elements in the active scene.",
      collect: () => this._getDomMetrics().activeInScene,
    });

    this.metrics.gauge({
      name: "dom_visible_in_scene",
      help: "Visible elements (opacity > 0).",
      collect: () => this._getDomMetrics().visibleInScene,
    });

    this.metrics.gauge({
      name: "dom_dormant_elements",
      help: "Inactive elements (display:none).",
      collect: () => this._getDomMetrics().dormantCount,
    });

    this.metrics.gauge({
      name: "dom_detached_elements",
      help: "Elements missing from the DOM (retention leak). Must be 0.",
      collect: () => this._getDomMetrics().detachedCount,
    });

    this.metrics.gauge({
      name: "dom_promoted",
      help: "Elements holding will-change (GPU layer leak). Must be 0 at rest. Labels name the element.",
      collect: () =>
        this._getDomMetrics().promotedNodes.map((n) => {
          const info = getElementTargetInfo(n);
          const labels: Record<string, string> = {
            target: info.target,
            will_change: n.style.willChange,
          };
          if (info.elementId) {
            labels.element_id = info.elementId;
          }
          return {
            labels,
            value: 1,
          };
        }),
    });

    this.metrics.gauge({
      name: "dom_stage_total_nodes",
      help: "DOM nodes in the stage viewport.",
      collect: () => this._getDomMetrics().stageTotalNodes,
    });

    // GPU & Canvas Footprint
    this.metrics.gauge({
      name: "gpu_canvas_count",
      help: "Canvas elements.",
      collect: () => document.querySelectorAll("canvas").length,
    });

    this.metrics.gauge({
      name: "gpu_canvas_pixels",
      help: "Canvas pixels (all surfaces).",
      collect: () => {
        let pixels = 0;
        for (const c of document.querySelectorAll("canvas")) {
          pixels += c.width * c.height;
        }
        return pixels;
      },
    });

    // Memory Footprint Diagnostics
    this.metrics.gauge({
      name: "memory_heap_used_bytes",
      help: "JS heap used (bytes).",
      unit: "bytes",
      collect: () => {
        if (typeof performance !== "undefined" && "memory" in performance) {
          return (performance as unknown as { memory: { usedJSHeapSize: number } }).memory
            .usedJSHeapSize;
        }
        return null;
      },
    });

    this.metrics.gauge({
      name: "memory_heap_total_bytes",
      help: "JS heap total (bytes).",
      unit: "bytes",
      collect: () => {
        if (typeof performance !== "undefined" && "memory" in performance) {
          return (performance as unknown as { memory: { totalJSHeapSize: number } }).memory
            .totalJSHeapSize;
        }
        return null;
      },
    });

    // Animation & Background Activity Diagnostics
    this.metrics.gauge({
      name: "animation_hidden_running",
      help: "Animations on hidden elements. Must be 0.",
      collect: () => this._getAnimationMetrics().hiddenRunningCount,
    });

    this.metrics.gauge({
      name: "animation_running",
      help: "Running animations. Must be 0 at rest.",
      collect: () => this._getAnimationMetrics().runningList,
    });

    this.metrics.gauge({
      name: "animation_connector_pulses",
      help: "Connector pulse packets. Must be 0 when idle.",
      collect: () => this._getAnimationMetrics().connectorPulses,
    });

    // Media Diagnostics
    this.metrics.gauge({
      name: "media_visible_videos",
      help: "Visible playing videos. Two or more lock Chrome to 30fps; hide one.",
      collect: () => this._visibleVideos(),
    });

    // Background Diagnostics
    this.metrics.gauge({
      name: "background_running",
      help: "Background render loop running. May be 1 at rest.",
      collect: () => {
        const m = this._getBackgroundMetrics();
        return m ? Number(m.is_running) || 0 : null;
      },
    });

    this.metrics.gauge({
      name: "background_is_mounted",
      help: "Background mounted (1 = connected, 0 = detached).",
      collect: () => {
        const m = this._getBackgroundMetrics();
        if (m && "is_mounted" in m) {
          return m.is_mounted ? 1 : 0;
        }
        return null;
      },
    });

    this.metrics.gauge({
      name: "background_opacity",
      help: "Background opacity (0..1).",
      collect: () => {
        const m = this._getBackgroundMetrics();
        return m && typeof m.opacity === "number" ? m.opacity : null;
      },
    });

    this.metrics.gauge({
      name: "background_canvas_width",
      help: "Background canvas width (px).",
      unit: "px",
      collect: () => {
        const m = this._getBackgroundMetrics();
        return m && typeof m.canvas_width === "number" ? m.canvas_width : null;
      },
    });

    this.metrics.gauge({
      name: "background_canvas_height",
      help: "Background canvas height (px).",
      unit: "px",
      collect: () => {
        const m = this._getBackgroundMetrics();
        return m && typeof m.canvas_height === "number" ? m.canvas_height : null;
      },
    });

    this.metrics.gauge({
      name: "background_pixel_ratio",
      help: "Background canvas DPR.",
      collect: () => {
        const m = this._getBackgroundMetrics();
        return m && typeof m.pixel_ratio === "number" ? m.pixel_ratio : null;
      },
    });

    this.metrics.gauge({
      name: "background_canvas_pixels",
      help: "Background canvas pixels.",
      collect: () => {
        const m = this._getBackgroundMetrics();
        return m && typeof m.total_pixels === "number" ? m.total_pixels : null;
      },
    });

    this.metrics.gauge({
      name: "background_star_count",
      help: "Starfield particle count.",
      collect: () => {
        const m = this._getBackgroundMetrics();
        return m && typeof m.star_count === "number" ? m.star_count : null;
      },
    });

    this.metrics.gauge({
      name: "background_speed",
      help: "Starfield speed.",
      collect: () => {
        const m = this._getBackgroundMetrics();
        return m && typeof m.speed === "number" ? m.speed : null;
      },
    });

    this.metrics.gauge({
      name: "background_info",
      help: "Background kind.",
      collect: () => {
        const m = this._getBackgroundMetrics();
        if (!m) return { labels: { kind: "none" }, value: 1 };
        const kind = String(m.kind ?? "custom");
        const labels: Record<string, string> = { kind };
        if (m.value) labels.value = String(m.value);
        return { labels, value: 1 };
      },
    });

    // Overlay Diagnostics
    this.metrics.gauge({
      name: "overlay_laser_active",
      help: "Laser overlay active.",
      collect: () => {
        for (const overlay of this.overlays) {
          const o = overlay as { id?: string; _getMetrics?: () => Record<string, unknown> };
          if (o.id === "laser" && typeof o._getMetrics === "function") {
            const m = o._getMetrics();
            return m.is_active ? 1 : 0;
          }
        }
        return null;
      },
    });

    this.metrics.gauge({
      name: "overlay_laser_raf_active",
      help: "Laser animation loop running. Must be 0 when idle.",
      collect: () => {
        for (const overlay of this.overlays) {
          const o = overlay as { id?: string; _getMetrics?: () => Record<string, unknown> };
          if (o.id === "laser" && typeof o._getMetrics === "function") {
            const m = o._getMetrics();
            return m.raf_loop_active ? 1 : 0;
          }
        }
        return null;
      },
    });

    this.metrics.gauge({
      name: "overlay_laser_points_count",
      help: "Laser trail points.",
      collect: () => {
        for (const overlay of this.overlays) {
          const o = overlay as { id?: string; _getMetrics?: () => Record<string, unknown> };
          if (o.id === "laser" && typeof o._getMetrics === "function") {
            const m = o._getMetrics();
            return typeof m.active_points_count === "number" ? m.active_points_count : 0;
          }
        }
        return null;
      },
    });

    this.metrics.gauge({
      name: "overlay_laser_has_canvas",
      help: "Laser canvas mounted (1 = yes).",
      collect: () => {
        for (const overlay of this.overlays) {
          const o = overlay as { id?: string; _getMetrics?: () => Record<string, unknown> };
          if (o.id === "laser" && typeof o._getMetrics === "function") {
            const m = o._getMetrics();
            return m.has_canvas ? 1 : 0;
          }
        }
        return null;
      },
    });

    // Multi-Window / Tab Synchronization Metrics
    this.metrics.counter({
      name: "sync_channel_messages_sent",
      help: "Messages sent over BroadcastChannel.",
      collect: () => this.presenterHost?.messagesSent ?? 0,
    });

    this.metrics.counter({
      name: "sync_channel_messages_received",
      help: "Messages received over BroadcastChannel.",
      collect: () => this.presenterHost?.messagesReceived ?? 0,
    });

    this.metrics.counter({
      name: "sync_state_broadcasts",
      help: "State broadcasts sent to presenter.",
      collect: () => this.syncStateBroadcasts,
    });

    this.metrics.gauge({
      name: "sync_last_msg_elapsed_ms",
      help: "Ms since last received sync message (-1 if none).",
      unit: "ms",
      collect: () =>
        this.presenterHost && this.presenterHost.lastMsgTime > 0
          ? Math.round(performance.now() - this.presenterHost.lastMsgTime)
          : -1,
    });
  }

  // ElementHost Implementation
  recordMutation(
    elementId: string,
    property: string,
    from: unknown,
    to: unknown,
    durationMs: number,
    delayMs: number,
    curve: EaseCurve,
    triggerElementId?: string,
    triggerMilestone?: AnimationMilestone,
    triggerProperty?: string,
  ): void {
    if (from === to) {
      return;
    }

    this.currentStepTransitions.push({
      elementId,
      property,
      from,
      to,
      durationMs,
      delayMs,
      triggerElementId,
      triggerMilestone,
      triggerProperty,
      curve,
    });
  }

  getCurrentPropertyValue(elementId: string, property: string): unknown {
    return this.propertyState.get(elementId)?.[property];
  }

  setCurrentPropertyValue(elementId: string, property: string, value: unknown): void {
    let elProps = this.propertyState.get(elementId);
    if (!elProps) {
      elProps = {};
      this.propertyState.set(elementId, elProps);
    }
    elProps[property] = value;

    // Update baseline properties if this element has not yet been snapshotted in any step
    const hasSnapshot = this.snapshots.some((s) => s.activeElementIds.has(elementId));
    if (!hasSnapshot) {
      const init = this.initialProperties.get(elementId);
      if (init) {
        init[property] = value;
      }
    }

    const el = this.elementRegistry.get(elementId);
    if (el) {
      try {
        (el as unknown as Record<string, unknown>)[property] = value;
      } catch {
        // ignore read-only
      }
      if (!this.isAnimating) {
        this._applyStyles(el, elProps, false);
      }
    }
  }

  /** Checks whether an element is already registered with the stage. */
  hasElement(id: string): boolean {
    return this.elementRegistry.has(id);
  }

  /** @internal Marks an element as owned by a parent container (its visibility is managed by the parent). */
  _markParentOwned(elementId: string): void {
    this.ownedByParent.add(elementId);
  }

  registerElement<T extends ReactiveElementBase>(element: T): T {
    if (this.elementRegistry.has(element.id)) {
      return createReactiveProxy(this.elementRegistry.get(element.id) as T, this);
    }
    this.elementRegistry.set(element.id, element);

    // Baseline property snapshot - captures only declared @reactive properties
    const initialProps: Record<string, unknown> = {};
    const reactiveKeys = getReactiveKeys(element);

    for (const key of reactiveKeys) {
      try {
        const val = (element as Record<string, unknown>)[key];
        if (val !== undefined && typeof val !== "function") {
          initialProps[key] = val;
        }
      } catch {
        // ignore getters that fail
      }
    }

    this.initialProperties.set(element.id, { ...initialProps });
    this.propertyState.set(element.id, initialProps);

    if (this.viewport) {
      if (typeof element._mount === "function") {
        element._mount(this.viewport);
      } else if (!element.domElement.parentElement) {
        this.viewport.appendChild(element.domElement);
      }
    }

    return createReactiveProxy(element, this);
  }

  /** Declares a new presentation scene and returns a builder to populate its elements. */
  scene(name: string): SceneBuilder {
    return new SceneBuilder(this, name);
  }

  /**
   * Apply global or per-scene theme variable overrides.
   * Updates CSS custom properties on the stage container and preserves them across step snapshots.
   *
   * @example
   * ```ts
   * stage.theme({
   *   background: "#0f172a",
   *   surface: "#1e293b",
   *   surfaceBorder: "1px solid #334155",
   *   text: "#f8fafc",
   * });
   * ```
   */
  theme(config: ThemeConfig): this {
    this.currentTheme = { ...this.currentTheme, ...config };
    if (this.container) {
      this._applyTheme(this.currentTheme);
    }
    return this;
  }

  /**
   * Sets the stage background (color string, gradient, or procedural element).
   *
   * @example
   * ```ts
   * stage.background("#0f172a");
   * stage.background(new Starfield());
   * ```
   */
  background(bg: string | Background | ReactiveElementBase): this {
    if (this.backgroundSource !== null) {
      throw new Error(
        "[StageRoutine] Stage background has already been configured. Setting multiple backgrounds is not supported.",
      );
    }
    this.backgroundSource = bg;
    if (this.container) {
      this._attachBackground(bg);
    }
    return this;
  }

  private _attachBackground(bg: string | Background | ReactiveElementBase): void {
    if (!this.container) return;
    if (typeof bg === "string") {
      this.container.style.background = bg;
    } else if ("attach" in bg && typeof bg.attach === "function") {
      bg.attach({
        container: this.container,
        width: this.options.width || 1920,
        height: this.options.height || 1080,
        on: this.on.bind(this),
      });
    } else if ("domElement" in bg && bg.domElement instanceof HTMLElement) {
      if (!bg.domElement.parentElement) {
        this.container.prepend(bg.domElement);
      }
    }
  }

  private _applyTheme(theme: ThemeConfig): void {
    if (!this.container) return;
    if (theme.background) {
      this.container.style.backgroundColor = theme.background;
    }
    if (theme.text) {
      this.container.style.color = theme.text;
    }
    applyThemeTokens(this.container, theme);
  }

  /** @internal */
  _setActiveScene(name: string, elements: ReactiveElementBase[]): void {
    this.currentSceneName = name;
    const ids = new Set<string>();
    const collect = (list: ReactiveElementBase[]) => {
      for (const e of list) {
        ids.add(e.id);
        const items = (e as unknown as { items?: ReactiveElementBase[] }).items;
        if (Array.isArray(items)) {
          collect(items);
        }
      }
    };
    collect(elements);
    this.activeElementIds = ids;
  }

  /** Loads a full markdown presenter notes document for the presentation. */
  notesDocument(doc: string): this {
    this.notesDoc = doc;
    return this;
  }

  /** Sets presenter speaker notes for the current step. */
  note(text: string | string[]): this {
    this.currentStepNotes = Array.isArray(text) ? text.join("\n") : text;
    return this;
  }

  /** Completes the current presentation step, recording pending mutations and transitions into a snapshot. */
  pause(): void {
    // Flush any pending motion builders (e.g. stagger without .when())
    for (const flush of this.pendingMotionFlushes) {
      flush();
    }
    this.pendingMotionFlushes.clear();

    const stepIdx = this.steps.length;

    // Save step transitions
    this.steps.push({
      sceneName: this.currentSceneName,
      stepIndex: stepIdx,
      transitions: [...this.currentStepTransitions],
      actions: [...this.currentStepActions],
      activeElementIds: new Set(this.activeElementIds),
      notes: this.currentStepNotes,
      theme: { ...this.currentTheme },
    });

    // Save immutable snapshot for backward navigation
    const snapProps = new Map<string, Record<string, unknown>>();
    for (const [id, props] of this.propertyState.entries()) {
      snapProps.set(id, { ...props });
    }

    this.snapshots.push({
      sceneName: this.currentSceneName,
      stepIndex: stepIdx,
      properties: snapProps,
      activeElementIds: new Set(this.activeElementIds),
      theme: { ...this.currentTheme },
    });

    // Reset step records for next step
    this.currentStepTransitions = [];
    this.currentStepActions = [];
    this.currentStepNotes = undefined;
  }

  // Mount & Playback Engine
  /** Mounts the presentation stage into the target container element and begins playback. */
  mount(target?: string | HTMLElement): this {
    const el =
      typeof target === "string"
        ? document.querySelector<HTMLElement>(target)
        : target ||
          (typeof this.options.target === "string"
            ? document.querySelector<HTMLElement>(this.options.target)
            : this.options.target) ||
          null;

    if (!el) {
      logger.warn(
        'mount() requires a target element or CSS selector, e.g. stage.mount("#stage"). No matching element found.',
      );
      return this;
    }
    this.container = el;

    // Setup viewport container
    this.container.innerHTML = "";
    this.container.style.margin = "0";
    this.container.style.padding = "0";
    this.container.style.width = "100vw";
    this.container.style.height = "100vh";
    this.container.style.overflow = "hidden";
    this.container.style.display = "flex";
    this.container.style.alignItems = "center";
    this.container.style.justifyContent = "center";
    this.container.style.fontFamily = "system-ui, -apple-system, sans-serif";
    this.container.style.userSelect = "none";
    this.container.style.webkitUserSelect = "none";

    const onSelectStart = (e: Event) => e.preventDefault();
    el.addEventListener("selectstart", onSelectStart);
    this.mountCleanups.push(() => el.removeEventListener("selectstart", onSelectStart));

    this._applyTheme(this.currentTheme);

    this.viewport = document.createElement("div");
    this.viewport.style.position = "relative";
    this.viewport.style.width = `${this.options.width}px`;
    this.viewport.style.height = `${this.options.height}px`;
    this.viewport.style.minWidth = `${this.options.width}px`;
    this.viewport.style.minHeight = `${this.options.height}px`;
    this.viewport.style.flexShrink = "0";
    this.viewport.style.containerType = "size";
    this.viewport.style.transformOrigin = "center center";
    this.viewport.style.zIndex = "1";
    this.viewport.style.userSelect = "none";
    this.viewport.style.webkitUserSelect = "none";

    this.container.appendChild(this.viewport);

    // Backfill baseline properties for elements registered in later steps into earlier snapshots
    for (const snap of this.snapshots) {
      for (const [id, initialProp] of this.initialProperties.entries()) {
        if (!snap.properties.has(id)) {
          snap.properties.set(id, { ...initialProp });
        }
      }
    }

    // Attach top-level registered element DOM nodes
    for (const element of this.elementRegistry.values()) {
      this._hideElement(element);
      if (typeof element._mount === "function") {
        element._mount(this.viewport);
      } else if (!element.domElement.parentElement) {
        this.viewport.appendChild(element.domElement);
      }
    }

    // Attach background if provided
    if (this.backgroundSource) {
      this._attachBackground(this.backgroundSource);
    }

    // Responsive scaling resize handler
    const updateScale = () => {
      if (!this.viewport) return;
      const sw = window.innerWidth / (this.options.width || 1920);
      const sh = window.innerHeight / (this.options.height || 1080);
      const scale = Math.min(sw, sh);
      this.viewport.style.transform = `scale(${scale})`;
      this.emit("evt:stage:resized", { width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", updateScale);
    this.mountCleanups.push(() => window.removeEventListener("resize", updateScale));
    updateScale();

    // Mount queued overlay plugins
    if (this.overlays.length > 0) {
      for (const plugin of this.overlays) {
        this._mountOverlay(plugin);
      }
      this._broadcastPointerState();
    }

    // Keyboard controls (navigation and pointer mode)
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when focus is in an input field
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === "Home") {
        e.preventDefault();
        this.emit("req:nav:gotoStep", { index: 0 });
      } else if (e.key === "End") {
        e.preventDefault();
        this.emit("req:nav:gotoStep", { index: this.steps.length - 1 });
      } else if (e.shiftKey && (e.key === "ArrowRight" || e.key === "PageDown")) {
        e.preventDefault();
        this.emit("req:nav:nextScene");
      } else if (e.shiftKey && (e.key === "ArrowLeft" || e.key === "PageUp")) {
        e.preventDefault();
        this.emit("req:nav:prevScene");
      } else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        this.emit("req:nav:nextStep");
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        this.emit("req:nav:prevStep");
      } else if (e.key === "p" || e.key === "P") {
        e.preventDefault();
        const current = storage.runtime.get<boolean>("pointer.active", false);
        this.emit("req:pointer:setState", { active: !current });
      } else if (
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        e.shiftKey &&
        (e.key === "M" || e.key === "m")
      ) {
        e.preventDefault();
        this._openMetricsWindow();
      } else if (e.key === "Escape") {
        const current = storage.runtime.get<boolean>("pointer.active", false);
        if (current) {
          e.preventDefault();
          this.emit("req:pointer:setState", { active: false });
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    this.mountCleanups.push(() => window.removeEventListener("keydown", onKeyDown));

    // Check URL Hash for live HMR positioning
    const initialIndex = this._resolveHashTarget();
    this.currentStepIndex = initialIndex;
    this._applySnapshot(initialIndex);

    const onHashChange = () => {
      const idx = this._resolveHashTarget();
      if (idx !== this.currentStepIndex) {
        this.currentStepIndex = idx;
        this._applySnapshot(idx);
      }
    };
    window.addEventListener("hashchange", onHashChange);
    this.mountCleanups.push(() => window.removeEventListener("hashchange", onHashChange));

    this.isMountedState = true;

    // Attach global dev diagnostics hook
    const devWindow = window as unknown as {
      __STAGEROUTINE_DEV__?: {
        getMetrics: () => string;
        showMetrics: () => void;
        perf: PerfProbe;
        outline: () => OutlineScene[];
      };
    };
    const devHook = {
      getMetrics: () => this.metrics.getMetrics(),
      showMetrics: () => this._openMetricsWindow(),
      perf: createPerfProbe(this),
      outline: () => this._getOutline(),
    };
    devWindow.__STAGEROUTINE_DEV__ = devHook;
    this.mountCleanups.push(() => {
      if (devWindow.__STAGEROUTINE_DEV__ === devHook) {
        delete devWindow.__STAGEROUTINE_DEV__;
      }
    });

    return this;
  }

  private _openMetricsWindow(): void {
    const text = this.metrics.getMetrics();
    const w = window.open("", "stageroutine_metrics");
    if (!w?.document.body) return;
    w.document.title = "StageRoutine Metrics";
    w.document.body.innerHTML = "";
    w.document.body.style.cssText =
      "margin:0;padding:24px;background:#0f172a;color:#e2e8f0;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;font-size:13px;line-height:1.6;";
    const pre = w.document.createElement("pre");
    pre.style.cssText = "margin:0;white-space:pre-wrap;word-break:break-all;";
    pre.textContent = text;
    w.document.body.appendChild(pre);
    w.focus?.();
  }

  /**
   * Tears down the stage: stops animation loops and releases the background,
   * overlays, element media, DOM, and communication resources.
   *
   * Disposal is final. A disposed stage cannot be mounted again.
   */
  dispose(): void {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }

    // Stops element timers, RAF loops, and media streams.
    for (const element of this.elementRegistry.values()) {
      element._unmount?.();
    }

    for (const plugin of this.mountedOverlays) {
      plugin.destroy();
    }
    this.mountedOverlays.length = 0;

    if (this.backgroundSource && typeof this.backgroundSource !== "string") {
      (this.backgroundSource as Background).dispose?.();
    }

    for (const cleanup of this.mountCleanups) {
      cleanup();
    }
    this.mountCleanups.length = 0;

    this.viewport?.remove();
    this.viewport = null;
    this.container = null;
    this.isMountedState = false;

    this.presenterHost?.dispose();
    this.presenterHost = null;

    this.pendingMotionFlushes.clear();
    this.listeners.clear();
  }

  private _next(): void {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this._playStepTransition(this.currentStepIndex);
    }
  }

  private _prev(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this._applySnapshot(this.currentStepIndex);
    }
  }

  /**
   * Returns the list of distinct scenes computed from the step sequence.
   * Each entry contains the scene's 0-based index, name, first step index, and step count.
   */
  private _getScenes(): {
    sceneIndex: number;
    sceneName: string;
    startStepIndex: number;
    stepCount: number;
  }[] {
    const scenes: {
      sceneIndex: number;
      sceneName: string;
      startStepIndex: number;
      stepCount: number;
    }[] = [];
    let current: (typeof scenes)[number] | null = null;

    for (let i = 0; i < this.steps.length; i++) {
      const name = this.steps[i].sceneName || "";
      if (!current || current.sceneName !== name) {
        current = { sceneIndex: scenes.length, sceneName: name, startStepIndex: i, stepCount: 1 };
        scenes.push(current);
      } else {
        current.stepCount++;
      }
    }
    return scenes;
  }

  /**
   * Builds a scene-grouped outline of the presentation for dev diagnostics.
   * @internal
   */
  private _getOutline(): OutlineScene[] {
    return this._getScenes().map((sc) => ({
      name: sc.sceneName,
      steps: this.steps.slice(sc.startStepIndex, sc.startStepIndex + sc.stepCount).map((s) => ({
        step: s.stepIndex,
        notes: s.notes,
        elements: s.activeElementIds.size,
      })),
    }));
  }

  /**
   * Returns the 0-based index of the scene that contains the given step index,
   * or 0 if no scenes exist.
   */
  private _currentSceneIndex(): number {
    const scenes = this._getScenes();
    for (const sc of scenes) {
      if (
        this.currentStepIndex >= sc.startStepIndex &&
        this.currentStepIndex < sc.startStepIndex + sc.stepCount
      ) {
        return sc.sceneIndex;
      }
    }
    return 0;
  }

  /**
   * Jump to a specific scene by 0-indexed scene number.
   * Restores the recorded state of the first step of that scene.
   */
  private _gotoScene(sceneIndex: number): void {
    const scenes = this._getScenes();
    const target = scenes[sceneIndex];
    if (target) {
      this.currentStepIndex = target.startStepIndex;
      this._applySnapshot(target.startStepIndex);
    }
  }

  /**
   * Jump to a specific step by global step index.
   */
  private _gotoStep(stepIndex: number): void {
    if (stepIndex >= 0 && stepIndex < this.steps.length && stepIndex !== this.currentStepIndex) {
      this.currentStepIndex = stepIndex;
      this._applySnapshot(stepIndex);
    }
  }

  /**
   * Jump to the first step of the next scene.
   * No-op if already on the last scene.
   */
  private _nextScene(): void {
    const idx = this._currentSceneIndex();
    const scenes = this._getScenes();
    if (idx < scenes.length - 1) {
      this._gotoScene(idx + 1);
    }
  }

  /**
   * Jump to the first step of the previous scene.
   * No-op if already on the first scene.
   */
  private _prevScene(): void {
    const idx = this._currentSceneIndex();
    if (idx > 0) {
      this._gotoScene(idx - 1);
    }
  }

  private _applySnapshot(stepIdx: number): void {
    const snap = this.snapshots[stepIdx];
    if (!snap) return;

    this.currentStepIndex = stepIdx;

    this.emit("evt:nav:stepChanged", {
      index: stepIdx,
      total: this.steps.length,
      scene: snap.sceneName,
    });

    if (snap.sceneName !== this.activeSceneName) {
      const from = this.activeSceneName;
      this.activeSceneName = snap.sceneName;
      this.emit("evt:nav:sceneChanged", { from, to: snap.sceneName, index: stepIdx });
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.isAnimating = false;
    this._clearPromotedElements();

    // 1. Restore propertyState map from immutable snapshot
    this.propertyState.clear();
    for (const [id, props] of snap.properties.entries()) {
      this.propertyState.set(id, { ...props });
    }

    // 2. Hide elements that are not in the target step snapshot
    for (const [id, el] of this.elementRegistry.entries()) {
      if (!snap.activeElementIds.has(id)) {
        if (this.ownedByParent.has(id)) {
          continue;
        }
        this._hideElement(el);
      }
    }

    // 3. Write all property values and DOM transforms for the target step first.
    const restored: ReactiveElementBase[] = [];
    for (const id of snap.activeElementIds) {
      const el = this.elementRegistry.get(id);
      if (!el) continue;

      if (el.domElement) {
        el.domElement.style.display = "";
        el.domElement.style.willChange = "auto";
      }

      const props = snap.properties.get(id) || this.initialProperties.get(id) || {};
      for (const [key, val] of Object.entries(props)) {
        try {
          (el as unknown as Record<string, unknown>)[key] = val;
        } catch {
          // ignore read-only
        }
      }
      this._applyStyles(el, props, true, false);
      restored.push(el);
    }

    // 4. Re-dispatch once every transform is in place, so derived geometry
    // (connectors, live tails) resolves against the restored target positions.
    for (const el of restored) {
      if (typeof el._dispatchUpdate === "function") {
        el._dispatchUpdate(1);
      } else {
        el.update?.();
      }
    }

    // Apply snapshot theme if present
    if (snap.theme) {
      this.currentTheme = { ...snap.theme };
      this._applyTheme(this.currentTheme);
    }

    this._updateHash();
    this._broadcastState();
  }

  private _playStepTransition(stepIdx: number): void {
    const step = this.steps[stepIdx];
    if (!step) return;

    this.emit("evt:nav:stepChanged", {
      index: stepIdx,
      total: this.steps.length,
      scene: step.sceneName,
    });

    if (step.sceneName !== this.activeSceneName) {
      const from = this.activeSceneName;
      this.activeSceneName = step.sceneName;
      this.emit("evt:nav:sceneChanged", { from, to: step.sceneName, index: stepIdx });
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this._clearPromotedElements();
    }

    this.isAnimating = true;
    const startTime = performance.now();
    this._beginTransitionMark(step.sceneName, stepIdx);

    const prevSnap = stepIdx > 0 ? this.snapshots[stepIdx - 1] : null;

    // Reset local propertyState to the state right before this step
    this.propertyState.clear();
    for (const [id, initialProp] of this.initialProperties.entries()) {
      const baseProps = prevSnap?.properties.get(id) ?? initialProp;
      this.propertyState.set(id, { ...baseProps });
    }

    // Combine explicit transitions with automatic scene enter/exit transitions
    const stepTransitions = [...step.transitions];

    if (prevSnap) {
      const explicitOpacityElementIds = new Set(
        step.transitions.filter((t) => t.property === "opacity").map((t) => t.elementId),
      );

      // 1. Exiting elements: active in previous step, but omitted in this step
      for (const id of prevSnap.activeElementIds) {
        if (!step.activeElementIds.has(id) && !explicitOpacityElementIds.has(id)) {
          const el = this.elementRegistry.get(id);
          if (!el) continue;
          if (this.ownedByParent.has(id)) {
            continue;
          }
          const currentOpacity = (this.propertyState.get(id)?.opacity as number) ?? 1;
          if (currentOpacity > 0) {
            const exitDurationSec = el.exitDuration ?? this.options.defaultDuration ?? 0.6;
            if (exitDurationSec <= 0) {
              el._deactivate?.();
              this.setCurrentPropertyValue(id, "opacity", 0);
              this._applyStyles(el, { opacity: 0 });
              continue;
            }
            const exitDelaySec = el.exitDelay ?? 0;
            stepTransitions.push({
              elementId: id,
              property: "opacity",
              from: currentOpacity,
              to: 0,
              durationMs: exitDurationSec * 1000,
              delayMs: exitDelaySec * 1000,
              curve: builtinEasings.quartOut,
            });
          } else {
            el._deactivate?.();
          }
        }
      }

      // 2. Entering elements: active in this step, but was not active in previous step
      for (const id of step.activeElementIds) {
        if (!prevSnap.activeElementIds.has(id) && !explicitOpacityElementIds.has(id)) {
          const el = this.elementRegistry.get(id);
          if (!el) continue;
          if (this.ownedByParent.has(id)) {
            continue;
          }
          const enterDurationSec = el.enterDuration ?? this.options.defaultDuration ?? 0.6;
          if (enterDurationSec <= 0) {
            continue;
          }
          const enterDelaySec = el.enterDelay ?? 0;
          const targetProps =
            this.snapshots[stepIdx]?.properties.get(id) || this.propertyState.get(id) || {};
          const targetOpacity = (targetProps.opacity as number) ?? 1;
          if (targetOpacity > 0) {
            this.setCurrentPropertyValue(id, "opacity", 0);
            stepTransitions.push({
              elementId: id,
              property: "opacity",
              from: 0,
              to: targetOpacity,
              durationMs: enterDurationSec * 1000,
              delayMs: enterDelaySec * 1000,
              curve: builtinEasings.quartOut,
            });
          }
        }
      }
    }

    // Elements with active transitions in this step
    const transitioningIds = new Set(stepTransitions.map((t) => t.elementId));

    // Resolve start/end offsets with lifecycle milestone triggers (.when()) and delays (.delay())
    interface ScheduledTransition extends TransitionRecord {
      startFrom: unknown;
      startOffsetMs: number;
      endOffsetMs: number;
    }

    const scheduledTransitions: ScheduledTransition[] = stepTransitions.map((t) => {
      const liveVal = this.getCurrentPropertyValue(t.elementId, t.property);
      const startFrom = t.from !== undefined ? t.from : liveVal;
      this.setCurrentPropertyValue(t.elementId, t.property, startFrom);
      return {
        ...t,
        startFrom,
        startOffsetMs: t.delayMs || 0,
        endOffsetMs: (t.delayMs || 0) + t.durationMs,
      };
    });

    const participatingIds = new Set([...step.activeElementIds, ...transitioningIds]);

    // For any property that has an explicit new value in targetSnap but NO transition scheduled in this step,
    // apply it immediately at the start of the step so discrete changes (like text, flow, etc.) are not delayed.
    const transitioningKeys = new Set(stepTransitions.map((t) => `${t.elementId}:${t.property}`));
    const targetSnap = this.snapshots[stepIdx];
    if (targetSnap) {
      for (const [id, targetProps] of targetSnap.properties.entries()) {
        const currentProps = this.propertyState.get(id);
        if (currentProps) {
          for (const [prop, val] of Object.entries(targetProps)) {
            if (!transitioningKeys.has(`${id}:${prop}`)) {
              currentProps[prop] = val;
            }
          }
        }
      }
    }

    // Hide any element in registry that is neither active in the new step nor transitioning
    for (const [id, el] of this.elementRegistry.entries()) {
      if (!participatingIds.has(id)) {
        if (this.ownedByParent.has(id)) {
          continue;
        }
        this._hideElement(el);
      }
    }

    // Ensure all elements participating in this step (active or transitioning) are visible and styled with starting state
    for (const id of participatingIds) {
      const el = this.elementRegistry.get(id);
      if (!el) continue;
      if (el.domElement) {
        el.domElement.style.display = "";
      }
      const props = this.propertyState.get(id) || this.initialProperties.get(id) || {};
      this._applyStyles(el, props);
    }

    for (const id of transitioningIds) {
      const el = this.elementRegistry.get(id);
      if (el?.domElement && el.kind !== "Shape" && el.kind !== "Frame") {
        el.domElement.style.willChange = "transform, opacity";
        this.promotedElements.add(el.domElement);
      }
    }

    if (step.actions) {
      for (const action of step.actions) {
        action();
      }
    }

    for (let pass = 0; pass < 6; pass++) {
      for (const t of scheduledTransitions) {
        let baseStart = t.delayMs || 0;
        if (t.triggerElementId) {
          const matching = scheduledTransitions.filter((other) => {
            if (other === t || other.elementId !== t.triggerElementId) return false;
            if (t.triggerProperty && other.property !== t.triggerProperty) return false;
            return true;
          });

          if (matching.length > 0) {
            const milestone = t.triggerMilestone ?? "end";
            if (milestone === "start" || milestone === 0) {
              baseStart = Math.min(...matching.map((m) => m.startOffsetMs)) + (t.delayMs || 0);
            } else if (milestone === "halfway" || milestone === 0.5) {
              baseStart =
                Math.max(...matching.map((m) => m.startOffsetMs + m.durationMs * 0.5)) +
                (t.delayMs || 0);
            } else if (typeof milestone === "number") {
              baseStart =
                Math.max(...matching.map((m) => m.startOffsetMs + m.durationMs * milestone)) +
                (t.delayMs || 0);
            } else {
              // "end" or "complete"
              baseStart = Math.max(...matching.map((m) => m.endOffsetMs)) + (t.delayMs || 0);
            }
          }
        }
        t.startOffsetMs = baseStart;
        t.endOffsetMs = baseStart + t.durationMs;
      }
    }

    const maxDuration = Math.max(
      ...scheduledTransitions.map((t) => t.endOffsetMs),
      (this.options.defaultDuration || 0.6) * 1000,
    );

    this.lastFrameTime = performance.now();
    this.maxFrameDurationMs = 0;

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const frameDelta = now - this.lastFrameTime;
      this.lastFrameTime = now;
      this.lastFrameDurationMs = frameDelta;
      if (frameDelta > this.maxFrameDurationMs) {
        this.maxFrameDurationMs = frameDelta;
      }
      if (frameDelta > 0) {
        this.currentFps = 1000 / frameDelta;
      }

      const elementProgress = new Map<string, number>();

      // Update active transitions snapshot for on-demand metric queries
      this.activeTransitionsSnapshot = scheduledTransitions.map((t) => {
        let progress = 0;
        if (elapsed <= t.startOffsetMs) progress = 0;
        else if (elapsed >= t.endOffsetMs) progress = 1;
        else progress = (elapsed - t.startOffsetMs) / t.durationMs;

        if (!elementProgress.has(t.elementId) || t.property === "opacity") {
          elementProgress.set(t.elementId, progress);
        }

        return {
          elementId: t.elementId,
          property: t.property,
          startFrom: t.startFrom,
          to: t.to,
          durationMs: t.durationMs,
          elapsedMs: elapsed,
          progress,
        };
      });

      for (const t of scheduledTransitions) {
        const el = this.elementRegistry.get(t.elementId);
        if (!el) continue;

        let currentVal = t.startFrom;
        if (elapsed <= t.startOffsetMs) {
          currentVal = t.startFrom;
        } else if (elapsed >= t.endOffsetMs) {
          currentVal = t.to;
        } else {
          const progressT = (elapsed - t.startOffsetMs) / t.durationMs;
          const easedProgress = t.curve(Math.max(0, Math.min(1, progressT)));
          currentVal = interpolateValue(t.startFrom, t.to, easedProgress);
        }

        // Update local property state
        this.setCurrentPropertyValue(t.elementId, t.property, currentVal);

        // Render to DOM without dispatching intermediate updates per property
        const props = this.propertyState.get(t.elementId) || {};
        this._applyStyles(el, props, step.activeElementIds.has(t.elementId), false);
      }

      // Update participating elements once per frame after all properties have resolved
      for (const id of participatingIds) {
        const el = this.elementRegistry.get(id);
        const progress = elementProgress.get(id) ?? (step.activeElementIds.has(id) ? 1 : 0);
        if (typeof el?._dispatchUpdate === "function") {
          el._dispatchUpdate(progress);
        } else {
          el?.update?.();
        }
      }

      if (elapsed < maxDuration) {
        this.animFrameId = requestAnimationFrame(frame);
      } else {
        this.isAnimating = false;
        this.animFrameId = null;
        this.activeTransitionsSnapshot = [];
        this._endTransitionMark(step.sceneName, stepIdx);
        // Snap to exact end snapshot
        this._applySnapshot(stepIdx);
      }
    };

    this.animFrameId = requestAnimationFrame(frame);
    this._updateHash();
    this._broadcastState();
  }

  private _clearPromotedElements(): void {
    for (const el of this.promotedElements) {
      el.style.willChange = "auto";
    }
    this.promotedElements.clear();
  }

  private _hideElement(element: ReactiveElementBase): void {
    const node = element.domElement;
    if (!node) return;
    node.style.opacity = "0";
    node.style.visibility = "hidden";
    node.style.display = "none";
    node.style.willChange = "auto";
    node.style.pointerEvents = "none";
    this.promotedElements.delete(node);
    element._deactivate?.();
  }

  private _applyStyles(
    element: ReactiveElementBase,
    props: Record<string, unknown>,
    triggerLifecycle = true,
    dispatchUpdate = true,
  ): void {
    const node = element.domElement;
    if (!node) return;

    const x = props.x as number | string | undefined;
    const y = props.y as number | string | undefined;
    const scale = (props.scale as number) ?? 1;
    const rotation = (props.rotation as number) ?? 0;
    const rawAnchor = props.anchor ?? element.anchor;
    const anchor: ElementAnchor =
      typeof rawAnchor === "string" || Array.isArray(rawAnchor)
        ? (rawAnchor as ElementAnchor)
        : "top-left";
    const opacity = (props.opacity as number) ?? 1;
    const blur = (props.blur as number) ?? 0;
    const brightness = (props.brightness as number) ?? 1;
    const color = props.color as string | undefined;

    const { transform, transformOrigin } = computeTransformAndOrigin(x, y, scale, rotation, anchor);

    const isCustomPositioned =
      Boolean(element.isCustomPositioned) ||
      node instanceof SVGElement ||
      node.tagName.toLowerCase() === "svg";
    if (!isCustomPositioned) {
      node.style.transform = transform;
      node.style.transformOrigin = transformOrigin;
    }
    const defaultPointerEvents =
      element._defaultPointerEvents ??
      (node instanceof SVGElement || node.tagName.toLowerCase() === "svg" ? "none" : "auto");
    node.style.pointerEvents = opacity === 0 ? "none" : defaultPointerEvents;
    node.style.opacity = `${opacity}`;
    try {
      (element as unknown as { opacity: number }).opacity = opacity;
    } catch {
      // ignore read-only properties
    }
    node.style.visibility = opacity === 0 ? "hidden" : "visible";
    if (opacity > 0 && node.style.display === "none") {
      node.style.display = "";
    }
    if (triggerLifecycle) {
      if (opacity > 0) {
        element._activate?.();
      } else {
        element._deactivate?.();
      }
    }
    if (blur > 0 || brightness !== 1) {
      const filters: string[] = [];
      if (blur > 0) filters.push(`blur(${blur}px)`);
      if (brightness !== 1) filters.push(`brightness(${brightness})`);
      node.style.filter = filters.join(" ");
    }
    if (color && color !== "inherit") {
      node.style.color = color;
    }
    if (props.width !== undefined) {
      const formattedWidth =
        typeof props.width === "number" ? `${props.width}px` : String(props.width);
      if (node.style.width !== formattedWidth) {
        node.style.width = formattedWidth;
      }
    }
    if (props.height !== undefined) {
      const formattedHeight =
        typeof props.height === "number" ? `${props.height}px` : String(props.height);
      if (node.style.height !== formattedHeight) {
        node.style.height = formattedHeight;
      }
    }

    for (const [key, value] of Object.entries(props)) {
      if (
        key !== "x" &&
        key !== "y" &&
        key !== "width" &&
        key !== "height" &&
        key !== "scale" &&
        key !== "rotation" &&
        key !== "anchor" &&
        key !== "opacity" &&
        key !== "blur" &&
        key !== "brightness" &&
        key !== "color" &&
        key in element
      ) {
        try {
          (element as unknown as Record<string, unknown>)[key] = value;
        } catch {
          // ignore read-only properties
        }
      }
    }

    if (dispatchUpdate) {
      if (typeof element._dispatchUpdate === "function") {
        element._dispatchUpdate(1);
      } else if (typeof element.update === "function") {
        element.update();
      }
    }
  }

  private _beginTransitionMark(scene: string, step: number): void {
    performance.clearMarks(TRANSITION_START_MARK);
    performance.clearMarks(TRANSITION_END_MARK);
    performance.mark(TRANSITION_START_MARK, { detail: { scene, step } });
  }

  private _endTransitionMark(scene: string, step: number): void {
    const name = `sr/${this._slugifySceneName(scene)}/${step}`;
    performance.mark(TRANSITION_END_MARK);
    performance.measure(name, TRANSITION_START_MARK, TRANSITION_END_MARK);
    performance.clearMarks(TRANSITION_START_MARK);
    performance.clearMarks(TRANSITION_END_MARK);
    performance.clearMeasures(name);
  }

  private _slugifySceneName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, "-");
  }

  private _updateHash(): void {
    const step = this.steps[this.currentStepIndex];
    if (step) {
      window.location.hash = `#${this._slugifySceneName(step.sceneName)}/${step.stepIndex}`;
    }
  }

  /**
   * Resolves the URL hash fragment to a step index.
   *
   * Supported formats:
   * - `#scene-name/stepIndex` — go to that exact step (fully qualified)
   * - `#scene-name` — go to first step of that scene
   * - `#/stepIndex` — go to that step by global index
   */
  private _resolveHashTarget(): number {
    if (!window.location.hash) return 0;

    const raw = window.location.hash.slice(1); // strip leading '#'

    // Format 3: #/stepIndex — bare step number
    if (raw.startsWith("/")) {
      const stepStr = raw.slice(1);
      const stepIdx = Number.parseInt(stepStr, 10);
      if (!Number.isNaN(stepIdx) && stepIdx >= 0 && stepIdx < this.steps.length) {
        return stepIdx;
      }
      return 0;
    }

    const slashPos = raw.lastIndexOf("/");

    if (slashPos !== -1) {
      const scenePart = raw.slice(0, slashPos);
      const stepStr = raw.slice(slashPos + 1);
      const stepIdx = Number.parseInt(stepStr, 10);

      // Format 1: #scene-name/stepIndex — fully qualified
      if (scenePart.length > 0 && !Number.isNaN(stepIdx)) {
        if (stepIdx >= 0 && stepIdx < this.steps.length) {
          return stepIdx;
        }
        return 0;
      }
    }

    // Format 2: #scene-name — scene name only, go to first step of that scene
    const slug = raw;
    for (const step of this.steps) {
      if (this._slugifySceneName(step.sceneName) === slug) {
        return step.stepIndex;
      }
    }

    return 0;
  }

  private _broadcastState(): void {
    if (this.steps.length === 0) return;
    this.syncStateBroadcasts++;
    const step = this.steps[this.currentStepIndex];
    const nextStep = this.steps[this.currentStepIndex + 1];

    const scenes = this._getScenes();
    const currentStepIdx = this.currentStepIndex;
    const activeScene = scenes.find(
      (sc) =>
        currentStepIdx >= sc.startStepIndex && currentStepIdx < sc.startStepIndex + sc.stepCount,
    ) ||
      scenes[0] || { sceneIndex: 0, sceneName: "", startStepIndex: 0, stepCount: 1 };

    this.emit("evt:stage:stateChanged", {
      step: this.currentStepIndex,
      total: this.steps.length,
      sceneIndex: activeScene.sceneIndex,
      totalScenes: scenes.length,
      scene: activeScene.sceneName,
      notes: step?.notes ?? "",
      notesDoc: this.notesDoc,
      nextScene: nextStep?.sceneName ?? "",
      nextNotes: nextStep?.notes ?? "",
      scenes,
      steps: this.steps.map((s) => ({
        stepIndex: s.stepIndex,
        sceneName: s.sceneName,
      })),
    });
  }
}

// Global active stage singleton for helper bindings
let activeStage: Stage | null = null;

/**
 * Returns the currently active presentation stage singleton.
 * @category Core
 */
export function getActiveStage(): Stage {
  if (!activeStage) {
    throw new Error(
      "[StageRoutine] No active Stage found. Call `new Stage()` before creating stage elements.",
    );
  }
  return activeStage;
}

/**
 * Returns the currently active presentation stage singleton, or null if none is initialized.
 * @internal
 */
export function tryGetActiveStage(): Stage | null {
  return activeStage;
}
