/**
 * The main presentation director managing scenes, step transitions, snapshots, and the virtual viewport.
 */

import { computeTransformAndOrigin, interpolateValue } from "./interpolators";
import { type ElementHost, createReactiveProxy } from "./proxy";
import type {
  AnimationMilestone,
  EaseCurve,
  ElementAnchor,
  ReactiveElementBase,
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
    }
    this.stage._setActiveScene(this.name, flattened);
    return this;
  }

  theme(config: ThemeConfig): this {
    this.stage.theme(config);
    return this;
  }
}

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

  private steps: StepData[] = [];
  private snapshots: StepSnapshot[] = [];
  private currentStepTransitions: TransitionRecord[] = [];
  private currentStepNotes: string | undefined = undefined;

  // Playback State
  private currentStepIndex = 0;
  private visibleElementIds = new Set<string>();
  private isAnimating = false;
  private animFrameId: number | null = null;
  private broadcastChannel: BroadcastChannel | null = null;

  constructor(options: StageOptions = {}) {
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

    if (typeof window !== "undefined") {
      try {
        this.broadcastChannel = new BroadcastChannel("stageroutine-channel");
        this.broadcastChannel.onmessage = (event) => {
          if (event.data?.action === "next") this.next();
          if (event.data?.action === "prev") this.prev();
          if (event.data?.action === "goto") this.goto(event.data.stepIndex);
          if (event.data?.action === "requestState") this._broadcast();
        };
      } catch {
        // BroadcastChannel optional fallback
      }
    }
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
      scale: element.scale,
      rotation: element.rotation,
      opacity: element.opacity,
      blur: element.blur,
      brightness: element.brightness,
      color: element.color,
    };
    this.initialProperties.set(element.id, { ...initialProps });
    this.propertyState.set(element.id, initialProps);

    return createReactiveProxy(element, this);
  }

  // --- Scene & Pause Authoring API ---
  scene(name: string): SceneBuilder {
    return new SceneBuilder(this, name);
  }

  theme(config: ThemeConfig): this {
    this.currentTheme = { ...this.currentTheme, ...config };
    if (this.container) {
      this._applyTheme(this.currentTheme);
    }
    return this;
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
    this.activeElementIds = new Set(elements.map((e) => e.id));
  }

  setNotes(text: string): void {
    this.currentStepNotes = text;
  }

  pause(): void {
    const stepIdx = this.steps.length;

    // Save step transitions
    this.steps.push({
      sceneName: this.currentSceneName,
      stepIndex: stepIdx,
      transitions: [...this.currentStepTransitions],
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

    // Responsive scaling resize handler
    const updateScale = () => {
      if (!this.viewport) return;
      const sw = window.innerWidth / (this.options.width || 1920);
      const sh = window.innerHeight / (this.options.height || 1080);
      const scale = Math.min(sw, sh);
      this.viewport.style.transform = `scale(${scale})`;
    };

    window.addEventListener("resize", updateScale);
    updateScale();

    // Keyboard controls
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") {
        e.preventDefault();
        this.next();
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        this.prev();
      }
    });

    // Check URL Hash for live HMR positioning
    const initialIndex = this._parseHashStep();
    this.goto(initialIndex, false);

    window.addEventListener("hashchange", () => {
      const idx = this._parseHashStep();
      if (idx !== this.currentStepIndex) {
        this.goto(idx, false);
      }
    });

    return this;
  }

  next(): void {
    if (this.currentStepIndex < this.steps.length - 1) {
      this.currentStepIndex++;
      this._playStepTransition(this.currentStepIndex);
    }
  }

  prev(): void {
    if (this.currentStepIndex > 0) {
      this.currentStepIndex--;
      this.goto(this.currentStepIndex, false);
    }
  }

  goto(stepIndex: number, animate = false): void {
    const clamped = Math.max(0, Math.min(stepIndex, this.steps.length - 1));
    this.currentStepIndex = clamped;

    if (animate) {
      this._playStepTransition(clamped);
    } else {
      this._applySnapshot(clamped);
    }
  }

  private _applySnapshot(stepIdx: number): void {
    const snap = this.snapshots[stepIdx];
    if (!snap) return;

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

    // 2. Hide elements that are currently visible but not in the target step
    for (const id of this.visibleElementIds) {
      if (!snap.activeElementIds.has(id)) {
        const el = this.elementRegistry.get(id);
        if (el) {
          this._hideElement(el);
        }
      }
    }

    // 3. Update and show elements active in the target step
    for (const id of snap.activeElementIds) {
      const el = this.elementRegistry.get(id);
      if (!el) continue;

      const props = snap.properties.get(id) || this.initialProperties.get(id) || {};
      this._applyStyles(el, props);
    }

    this.visibleElementIds = new Set(snap.activeElementIds);

    // Apply snapshot theme if present
    if (snap.theme) {
      this.currentTheme = { ...snap.theme };
      this._applyTheme(this.currentTheme);
    }

    this._updateHash();
    this._broadcast();
  }

  private _playStepTransition(stepIdx: number): void {
    const step = this.steps[stepIdx];
    if (!step) return;

    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }

    this.isAnimating = true;
    const startTime = performance.now();

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

    // Only hide elements that are neither active in the new step nor transitioning out
    for (const id of this.visibleElementIds) {
      if (!step.activeElementIds.has(id) && !transitioningIds.has(id)) {
        const el = this.elementRegistry.get(id);
        if (el) {
          this._hideElement(el);
        }
      }
    }

    // Ensure all elements participating in this step (active or transitioning) are visible and styled with starting state
    const participatingIds = new Set([...step.activeElementIds, ...transitioningIds]);
    for (const id of participatingIds) {
      const el = this.elementRegistry.get(id);
      if (!el) continue;
      const props = this.propertyState.get(id) || this.initialProperties.get(id) || {};
      this._applyStyles(el, props);
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

    const frame = (now: number) => {
      const elapsed = now - startTime;

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
        // Snap to exact end snapshot
        this._applySnapshot(stepIdx);
      }
    };

    this.visibleElementIds = new Set(step.activeElementIds);
    this.animFrameId = requestAnimationFrame(frame);
    this._updateHash();
    this._broadcast();
  }

  private _hideElement(element: ReactiveElementBase): void {
    const node = element.domElement;
    if (!node) return;
    node.style.opacity = "0";
    node.style.visibility = "hidden";
    node.style.pointerEvents = "none";
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
    node.style.pointerEvents = opacity === 0 ? "none" : "auto";
    node.style.filter = `blur(${blur}px) brightness(${brightness})`;
    if (color && color !== "inherit") {
      node.style.color = color;
    }
  }

  private _updateHash(): void {
    if (typeof window === "undefined") return;
    const step = this.steps[this.currentStepIndex];
    if (step) {
      window.location.hash = `#${step.sceneName.toLowerCase().replace(/\s+/g, "-")}/${step.stepIndex}`;
    }
  }

  private _parseHashStep(): number {
    if (typeof window === "undefined" || !window.location.hash) return 0;
    const match = window.location.hash.match(/\/(\d+)$/);
    if (match?.[1]) {
      return Number.parseInt(match[1], 10);
    }
    return 0;
  }

  private _broadcast(): void {
    if (!this.broadcastChannel) return;
    const step = this.steps[this.currentStepIndex];
    const nextStep = this.steps[this.currentStepIndex + 1];

    this.broadcastChannel.postMessage({
      currentStep: this.currentStepIndex,
      totalSteps: this.steps.length,
      sceneName: step?.sceneName ?? "",
      notes: step?.notes ?? "",
      nextSceneName: nextStep?.sceneName ?? "",
      nextNotes: nextStep?.notes ?? "",
      steps: this.steps.map((s) => ({
        stepIndex: s.stepIndex,
        sceneName: s.sceneName,
      })),
    });
  }
}

// Global active stage singleton for helper bindings
let activeStage: Stage | null = null;

export function createStage(options?: StageOptions): Stage {
  const stage = new Stage(options);
  activeStage = stage;
  return stage;
}

export function getActiveStage(): Stage {
  if (!activeStage) {
    activeStage = new Stage();
  }
  return activeStage;
}
