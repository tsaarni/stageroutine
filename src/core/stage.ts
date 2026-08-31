/**
 * The main presentation director managing scenes, step transitions, snapshots, and the virtual viewport.
 */

import { computeTransformAndOrigin, interpolateValue } from "./interpolators";
import { MetricRegistry } from "./metrics";
import { type ElementHost, createReactiveProxy } from "./proxy";
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

class SceneBuilder {
  private stage: Stage;
  readonly name: string;

  constructor(stage: Stage, name: string) {
    this.stage = stage;
    this.name = name;
  }

  with(...elements: (ReactiveElementBase | { items?: ReactiveElementBase[] })[]): this {
    const flattened: ReactiveElementBase[] = [];
    for (const el of elements) {
      if ("id" in el && "domElement" in el) {
        flattened.push(el as ReactiveElementBase);
      }
      if ("items" in el && Array.isArray((el as { items?: ReactiveElementBase[] }).items)) {
        for (const item of (el as { items: ReactiveElementBase[] }).items) {
          if ("id" in item && "domElement" in item) {
            flattened.push(item);
          }
        }
      }
      if ("rows" in el && Array.isArray((el as { rows?: ReactiveElementBase[] }).rows)) {
        for (const row of (el as { rows: ReactiveElementBase[] }).rows) {
          if ("id" in row && "domElement" in row) {
            flattened.push(row);
          }
        }
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
export class Stage implements ElementHost {
  private options: StageOptions;
  private container: HTMLElement | null = null;
  private viewport: HTMLElement | null = null;

  // Recording State
  private currentSceneName = "Default";
  private activeElementIds = new Set<string>();
  private elementRegistry = new Map<string, ReactiveElementBase>();
  private initialProperties = new Map<string, Record<string, unknown>>();
  private propertyState = new Map<string, Record<string, unknown>>();
  private currentTheme: ThemeConfig = {};
  private backgroundSource: string | Background | ReactiveElementBase | null = null;

  private steps: StepData[] = [];
  private snapshots: StepSnapshot[] = [];
  private currentStepTransitions: TransitionRecord[] = [];
  private currentStepActions: (() => void)[] = [];
  private currentStepNotes: string | undefined = undefined;
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
  private broadcastChannel: BroadcastChannel | null = null;
  private activeSceneName = "";
  private listeners = new Map<string, Set<(data: unknown) => void>>();

  // Metrics & Performance Tracking
  readonly metrics = new MetricRegistry();
  private lastFrameTime = 0;
  private lastFrameDurationMs = 0;
  private maxFrameDurationMs = 0;
  private currentFps = 60;
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
      plugin.mount(this._createOverlayContext());
    }
    return this;
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
      next: () => this.emit("nav:nextStep"),
      prev: () => this.emit("nav:prevStep"),
      nextScene: () => this.emit("nav:nextScene"),
      prevScene: () => this.emit("nav:prevScene"),
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
        console.error(`Error in stage event handler for "${event}":`, err);
      }
    }
  }

  constructor(options: StageOptions = {}) {
    activeStage = this;
    this.options = {
      width: 1920,
      height: 1080,
      defaultDuration: 0.6,
      theme: { background: "#09090b", text: "#ffffff" },
      ...options,
    };

    this.currentTheme = {
      background: "#09090b",
      text: "#ffffff",
      ...(this.options.theme || {}),
    };

    this._registerCoreMetrics();

    // Register navigation command handlers on the event bus
    this.on("nav:nextStep", () => this._next());
    this.on("nav:prevStep", () => this._prev());
    this.on("nav:nextScene", () => this._nextScene());
    this.on("nav:prevScene", () => this._prevScene());
    this.on("nav:gotoScene", (data) => this._gotoScene(data.index));
    this.on("nav:gotoStep", (data) => this._gotoStep(data.index));
    this.on("stage:requestState", () => this._broadcastState());

    if (typeof window !== "undefined") {
      try {
        this.broadcastChannel = new BroadcastChannel("stageroutine-channel");

        // Incoming: relay BroadcastChannel messages into the event bus
        this.broadcastChannel.onmessage = (event) => {
          if (this.steps.length === 0) return;
          const msg = event.data;
          if (msg?.event && typeof msg.event === "string") {
            this.emit(msg.event as keyof StageEventMap, msg.data);
          }
        };

        // Outgoing: bridge stage:stateChanged to BroadcastChannel
        this.on("stage:stateChanged", (data) => {
          this.broadcastChannel?.postMessage({ event: "stage:stateChanged", data });
        });
      } catch {
        // BroadcastChannel optional fallback
      }
    }
  }

  private _registerCoreMetrics(): void {
    // Stage Aggregates
    this.metrics.register("stage", () => {
      const step = this.steps[this.currentStepIndex];
      return {
        scene_name: step?.sceneName ?? "Default",
        step_index: this.currentStepIndex,
        total_steps: this.steps.length,
        is_animating: this.isAnimating ? 1 : 0,
        active_raf_count: this.animFrameId !== null ? 1 : 0,
        fps: Math.round(this.currentFps),
        last_frame_duration_ms: Number(this.lastFrameDurationMs.toFixed(2)),
        max_frame_duration_ms: Number(this.maxFrameDurationMs.toFixed(2)),
      };
    });

    // Active Transitions Breakdown
    this.metrics.register("stage.transitions", () => {
      return this.activeTransitionsSnapshot.map((t) => ({
        element_id: t.elementId,
        property: t.property,
        from: t.startFrom,
        to: t.to,
        duration_ms: t.durationMs,
        elapsed_ms: Math.round(t.elapsedMs),
        progress: Number(t.progress.toFixed(3)),
      }));
    });

    // DOM Elements Overview & Active breakdown
    this.metrics.register("dom", () => {
      const step = this.steps[this.currentStepIndex];
      const activeIds = step?.activeElementIds;
      let totalRegistered = 0;
      let activeInScene = 0;
      let visibleCount = 0;

      for (const [id] of this.elementRegistry.entries()) {
        totalRegistered++;
        const inActiveScene = activeIds ? activeIds.has(id) : false;
        if (inActiveScene) {
          activeInScene++;
        }
        const props = this.propertyState.get(id) || {};
        const opacity = (props.opacity as number) ?? 1;
        if (inActiveScene && opacity > 0) {
          visibleCount++;
        }
      }

      return {
        total_registered: totalRegistered,
        active_in_scene: activeInScene,
        visible_in_scene: visibleCount,
      };
    });

    // Browser Engine stats (strictly reads cached properties, only reports RUNNING animations)
    this.metrics.register("browser", () => {
      const result: Record<string, unknown> = {};
      if (typeof document !== "undefined") {
        const allAnimations = document.getAnimations();
        let runningCount = 0;
        let hiddenRunningCount = 0;
        const runningList: Record<string, unknown>[] = [];

        for (const anim of allAnimations) {
          if (anim.playState !== "running") continue;
          runningCount++;

          const target = (anim.effect as { target?: Element } | null)?.target;
          const isElement = target instanceof HTMLElement;
          // Read directly from target style to avoid synchronous layout recalculation (getComputedStyle)
          const inlineOpacity =
            isElement && target.style.opacity ? Number.parseFloat(target.style.opacity) : 1;
          const isHidden =
            isElement &&
            (inlineOpacity === 0 ||
              target.style.display === "none" ||
              target.style.visibility === "hidden");
          if (isHidden) hiddenRunningCount++;

          runningList.push({
            name: (anim as CSSAnimation).animationName || anim.id || "unnamed",
            target_tag: target?.tagName,
            target_class: typeof target?.className === "string" ? target.className : undefined,
            is_hidden: isHidden ? 1 : 0,
          });
        }

        result["animations.total_running"] = runningCount;
        result["animations.hidden_running"] = hiddenRunningCount;
        if (runningList.length > 0) {
          result["animations.running"] = runningList;
        }
      }

      if (typeof performance !== "undefined" && "memory" in performance) {
        const mem = (
          performance as unknown as { memory: { usedJSHeapSize: number; totalJSHeapSize: number } }
        ).memory;
        result["memory.js_heap_used_bytes"] = mem.usedJSHeapSize;
        result["memory.js_heap_total_bytes"] = mem.totalJSHeapSize;
      }

      return result;
    });
  }

  // --- ElementHost Implementation ---
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
  }

  registerElement<T extends ReactiveElementBase>(element: T): T {
    this.elementRegistry.set(element.id, element);

    // Baseline property snapshot
    const initialProps: Record<string, unknown> = {
      anchor: element.anchor,
      x: element.x,
      y: element.y,
      width: (element as Record<string, unknown>).width,
      height: (element as Record<string, unknown>).height,
      scale: element.scale,
      rotation: element.rotation,
      opacity: element.opacity,
      blur: element.blur,
      brightness: element.brightness,
      color: element.color,
    };

    for (const key of Object.keys(element)) {
      if (
        key !== "id" &&
        key !== "kind" &&
        key !== "domElement" &&
        !(key in initialProps) &&
        typeof (element as Record<string, unknown>)[key] !== "function"
      ) {
        initialProps[key] = (element as Record<string, unknown>)[key];
      }
    }

    this.initialProperties.set(element.id, { ...initialProps });
    this.propertyState.set(element.id, initialProps);

    return createReactiveProxy(element, this);
  }

  // --- Scene & Pause Authoring API ---
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
    const bg = theme.background || theme["--sr-background"] || theme["--stage-background"];
    if (bg) {
      this.container.style.backgroundColor = bg;
    }
    const txt = theme.text || theme["--sr-text"] || theme["--stage-text"];
    if (txt) {
      this.container.style.color = txt;
    }
    for (const [key, value] of Object.entries(theme)) {
      if (key.startsWith("--")) {
        this.container.style.setProperty(key, String(value));
      } else {
        const kebab = key.replace(/([A-Z])/g, "-$1").toLowerCase();
        this.container.style.setProperty(`--sr-${kebab}`, String(value));
        this.container.style.setProperty(`--stage-${kebab}`, String(value));
      }
    }
  }

  _setActiveScene(name: string, elements: ReactiveElementBase[]): void {
    this.currentSceneName = name;
    const ids = new Set<string>();
    for (const e of elements) {
      ids.add(e.id);
      const items = (e as unknown as { items?: ReactiveElementBase[] }).items;
      if (Array.isArray(items)) {
        for (const child of items) {
          ids.add(child.id);
        }
      }
    }
    this.activeElementIds = ids;
  }

  setNotes(text: string | string[]): void {
    this.currentStepNotes = Array.isArray(text) ? text.join("\n") : text;
  }

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

  // --- Mount & Playback Engine ---
  mount(target?: string | HTMLElement): this {
    if (typeof window === "undefined") return this;

    const el =
      typeof target === "string"
        ? document.querySelector<HTMLElement>(target)
        : target ||
          (typeof this.options.target === "string"
            ? document.querySelector<HTMLElement>(this.options.target)
            : this.options.target) ||
          document.body;

    if (!el) return this;
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

    this.container.addEventListener("selectstart", (e) => e.preventDefault());

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
      if (!element.domElement.parentElement) {
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
      this.emit("stage:resized", { width: window.innerWidth, height: window.innerHeight });
    };

    window.addEventListener("resize", updateScale);
    updateScale();

    // Mount queued overlay plugins
    if (this.overlays.length > 0) {
      const ctx = this._createOverlayContext();
      for (const plugin of this.overlays) {
        plugin.mount(ctx);
      }
    }

    // Keyboard controls (navigation only; pointer toggle is handled by pointer overlay)
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        this.emit("nav:nextStep");
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        this.emit("nav:prevStep");
      }
    });

    // Check URL Hash for live HMR positioning
    const initialIndex = this._resolveHashTarget();
    this.currentStepIndex = initialIndex;
    this._applySnapshot(initialIndex);

    window.addEventListener("hashchange", () => {
      const idx = this._resolveHashTarget();
      if (idx !== this.currentStepIndex) {
        this.currentStepIndex = idx;
        this._applySnapshot(idx);
      }
    });

    this.isMountedState = true;

    // Attach global dev diagnostics hook
    if (typeof window !== "undefined") {
      (
        window as unknown as {
          __STAGEROUTINE_DEV__?: { getMetrics: () => Record<string, unknown> };
        }
      ).__STAGEROUTINE_DEV__ = {
        getMetrics: () => this.metrics.collect(),
      };
    }

    return this;
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

    this.emit("nav:stepChanged", {
      index: stepIdx,
      total: this.steps.length,
      scene: snap.sceneName,
    });

    if (snap.sceneName !== this.activeSceneName) {
      const from = this.activeSceneName;
      this.activeSceneName = snap.sceneName;
      this.emit("nav:sceneChanged", { from, to: snap.sceneName, index: stepIdx });
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    this.isAnimating = false;

    // 1. Restore propertyState map from immutable snapshot
    this.propertyState.clear();
    for (const [id, props] of snap.properties.entries()) {
      this.propertyState.set(id, { ...props });
    }

    // 2. Hide elements that are not in the target step snapshot
    for (const [id, el] of this.elementRegistry.entries()) {
      if (!snap.activeElementIds.has(id)) {
        this._hideElement(el);
      }
    }

    // 3. Update and show elements active in the target step
    for (const id of snap.activeElementIds) {
      const el = this.elementRegistry.get(id);
      if (!el) continue;

      const props = snap.properties.get(id) || this.initialProperties.get(id) || {};
      this._applyStyles(el, props);
      el.play?.();
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

    this.emit("nav:stepChanged", {
      index: stepIdx,
      total: this.steps.length,
      scene: step.sceneName,
    });

    if (step.sceneName !== this.activeSceneName) {
      const from = this.activeSceneName;
      this.activeSceneName = step.sceneName;
      this.emit("nav:sceneChanged", { from, to: step.sceneName, index: stepIdx });
    }

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    this.isAnimating = true;
    const startTime = performance.now();

    if (step.actions) {
      for (const action of step.actions) {
        action();
      }
    }

    const prevSnap = stepIdx > 0 ? this.snapshots[stepIdx - 1] : null;

    // Reset local propertyState to the state right before this step
    this.propertyState.clear();
    for (const [id, initialProp] of this.initialProperties.entries()) {
      const baseProps = prevSnap?.properties.get(id) ?? initialProp;
      this.propertyState.set(id, { ...baseProps });
    }

    // Elements with active transitions in this step
    const transitioningIds = new Set(step.transitions.map((t) => t.elementId));

    // Resolve start/end offsets with lifecycle milestone triggers (.when()) and delays (.delay())
    interface ScheduledTransition extends TransitionRecord {
      startFrom: unknown;
      startOffsetMs: number;
      endOffsetMs: number;
    }

    const scheduledTransitions: ScheduledTransition[] = step.transitions.map((t) => {
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

    // Hide any element in registry that is neither active in the new step nor transitioning
    for (const [id, el] of this.elementRegistry.entries()) {
      if (!participatingIds.has(id)) {
        this._hideElement(el);
      }
    }

    // Ensure all elements participating in this step (active or transitioning) are visible and styled with starting state
    for (const id of participatingIds) {
      const el = this.elementRegistry.get(id);
      if (!el) continue;
      const props = this.propertyState.get(id) || this.initialProperties.get(id) || {};
      this._applyStyles(el, props);
      el.play?.();
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

      // Update active transitions snapshot for on-demand metric queries
      this.activeTransitionsSnapshot = scheduledTransitions.map((t) => {
        let progress = 0;
        if (elapsed <= t.startOffsetMs) progress = 0;
        else if (elapsed >= t.endOffsetMs) progress = 1;
        else progress = (elapsed - t.startOffsetMs) / t.durationMs;

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

        // Render to DOM
        const props = this.propertyState.get(t.elementId) || {};
        this._applyStyles(el, props);
      }

      if (elapsed < maxDuration) {
        this.animFrameId = requestAnimationFrame(frame);
      } else {
        this.isAnimating = false;
        this.animFrameId = null;
        this.activeTransitionsSnapshot = [];
        // Snap to exact end snapshot
        this._applySnapshot(stepIdx);
      }
    };

    this.animFrameId = requestAnimationFrame(frame);
    this._updateHash();
    this._broadcastState();
  }

  private _hideElement(element: ReactiveElementBase): void {
    const node = element.domElement;
    if (!node) return;
    node.style.opacity = "0";
    node.style.visibility = "hidden";
    node.style.pointerEvents = "none";
    element.pause?.();
  }

  private _applyStyles(element: ReactiveElementBase, props: Record<string, unknown>): void {
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

    node.style.transform = transform;
    node.style.transformOrigin = transformOrigin;
    node.style.opacity = `${opacity}`;
    node.style.visibility = opacity === 0 ? "hidden" : "visible";
    if (element.kind === "Connector" || node.tagName.toLowerCase() === "svg") {
      node.style.pointerEvents = "none";
    } else {
      node.style.pointerEvents = opacity === 0 ? "none" : "auto";
    }
    if (opacity > 0) {
      element.play?.();
    } else {
      element.pause?.();
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
  }

  private _slugifySceneName(name: string): string {
    return name.toLowerCase().replace(/\s+/g, "-");
  }

  private _updateHash(): void {
    if (typeof window === "undefined") return;
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
    if (typeof window === "undefined" || !window.location.hash) return 0;

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
    const step = this.steps[this.currentStepIndex];
    const nextStep = this.steps[this.currentStepIndex + 1];

    const scenes = this._getScenes();
    const currentStepIdx = this.currentStepIndex;
    const activeScene = scenes.find(
      (sc) =>
        currentStepIdx >= sc.startStepIndex && currentStepIdx < sc.startStepIndex + sc.stepCount,
    ) ||
      scenes[0] || { sceneIndex: 0, sceneName: "", startStepIndex: 0, stepCount: 1 };

    this.emit("stage:stateChanged", {
      step: this.currentStepIndex,
      total: this.steps.length,
      sceneIndex: activeScene.sceneIndex,
      totalScenes: scenes.length,
      scene: activeScene.sceneName,
      notes: step?.notes ?? "",
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
 * Creates and initializes a new presentation stage.
 * @category Core
 */
export function createStage(options?: StageOptions): Stage {
  const stage = new Stage(options);
  activeStage = stage;
  return stage;
}

/**
 * Returns the currently active presentation stage singleton.
 * @category Core
 */
export function getActiveStage(): Stage {
  if (!activeStage) {
    activeStage = new Stage();
  }
  return activeStage;
}
