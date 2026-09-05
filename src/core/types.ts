/**
 * Type definitions for stage options, easing curves, transition descriptors, and snapshots.
 */

/**
 * Custom easing function mapping progress t (0..1) to animated value.
 * @category Motion
 */
export type EaseCurve = (t: number) => number;

/**
 * Built-in named easing curves supported by StageRoutine transitions.
 * @category Motion
 */
export type BuiltinEase =
  | "linear"
  | "cubicOut"
  | "cubicInOut"
  | "quartOut"
  | "quartInOut"
  | "quintOut"
  | "quintInOut"
  | "expoOut"
  | "expoInOut"
  | "smooth"
  | "gentle"
  | "outQuad"
  | "inOutQuad"
  | "outExpo"
  | "inOutExpo";

/**
 * Animation milestone representing progress of another element's transition:
 * - `"start"`: Triggers immediately when target element begins animating (progress = 0).
 * - `"halfway"`: Triggers when target element reaches 50% of its easing progress.
 * - `"end"` | `"complete"`: Triggers when target element finishes its animation (progress = 1).
 * - `number`: Custom fractional progress (e.g. `0.75` for 75%).
 * @category Motion
 */
export type AnimationMilestone = "start" | "halfway" | "end" | "complete" | number;

/**
 * Fluent builder descriptor returned by `to(value)` for scheduling transitions.
 * @category Motion
 */
export interface TransitionDescriptor<T = unknown> {
  __isTransition: true;
  target: T;
  durationMs: number;
  delayMs: number;
  triggerTarget?: ReactiveElementBase | string;
  triggerMilestone?: AnimationMilestone;
  triggerProperty?: string;
  curve: EaseCurve;
  /** Sets animation duration in seconds. */
  duration(seconds: number): this;
  /** Adds a delay in seconds before animation begins. */
  delay(seconds: number): this;
  /**
   * Synchronizes this transition to start when another element reaches an animation milestone.
   * @param elementOrId Target element or element ID to listen to.
   * @param milestone Progress milestone: `"start"`, `"halfway"`, `"end"` (default), or a fraction (0..1).
   * @param property Optional specific property on the target element to track.
   */
  when(
    elementOrId: ReactiveElementBase | string,
    milestone?: AnimationMilestone,
    property?: string,
  ): this;
  /**
   * Chains this transition to start after another element completes its animation (alias for `.when(element, "end")`).
   * @param elementOrId Target element or element ID to wait for.
   * @param property Optional specific property on the target element to wait for.
   */
  after(elementOrId: ReactiveElementBase | string, property?: string): this;
  /** Sets the easing curve (e.g. `"quartOut"`, `"cubicInOut"`, `"smooth"`). */
  ease(curve: BuiltinEase | EaseCurve): this;
}

/**
 * @internal
 */
export interface TransitionRecord {
  elementId: string;
  property: string;
  from: unknown;
  to: unknown;
  durationMs: number;
  delayMs: number;
  triggerElementId?: string;
  triggerMilestone?: AnimationMilestone;
  triggerProperty?: string;
  curve: EaseCurve;
}

/**
 * Theme configuration object for customizing stage canvas, typography, and surface tokens.
 * Supports camelCase property names (e.g. `surfaceBorder`) or raw CSS variable names (`--sr-surface-border`).
 * @category Core
 */
import type { ThemeConfig } from "../theme/tokens";
export type { ThemeConfig };

/**
 * @internal
 */
export interface StepSnapshot {
  sceneName: string;
  stepIndex: number;
  properties: Map<string, Record<string, unknown>>;
  activeElementIds: Set<string>;
  theme?: ThemeConfig;
}

/**
 * @internal
 */
export interface StepData {
  sceneName: string;
  stepIndex: number;
  transitions: TransitionRecord[];
  actions?: (() => void)[];
  activeElementIds: Set<string>;
  notes?: string;
  theme?: ThemeConfig;
}

// ---------------------------------------------------------------------------
// Unified Namespaced Event System
//
// Naming convention:
//   domain:action
//
// Commands (imperative verbs) — actions triggered by user, overlay, or presenter:
//   nav:nextStep, nav:prevStep, nav:nextScene, nav:prevScene,
//   nav:gotoStep, nav:gotoScene, pointer:toggle, stage:requestState
//
// Notifications (past tense) — state changes emitted by core:
//   nav:stepChanged, nav:sceneChanged, pointer:toggled,
//   stage:resized, stage:stateChanged
//
// All events flow through a single typed bus. BroadcastChannel is a transparent
// bridge that serializes events to other windows using the same names.
// ---------------------------------------------------------------------------

export interface NavStepChangedEvent {
  index: number;
  total: number;
  scene: string;
}

export interface NavSceneChangedEvent {
  from: string;
  to: string;
  index: number;
}

export interface NavGotoStepEvent {
  index: number;
}

export interface NavGotoSceneEvent {
  index: number;
}

export interface StageResizedEvent {
  width: number;
  height: number;
}

export interface StageStateChangedEvent {
  step: number;
  total: number;
  sceneIndex: number;
  totalScenes: number;
  scene: string;
  notes: string;
  notesDoc?: string;
  nextScene: string;
  nextNotes: string;
  scenes: { sceneIndex: number; sceneName: string; startStepIndex: number; stepCount: number }[];
  steps: { stepIndex: number; sceneName: string }[];
}

export interface PointerToggledEvent {
  active: boolean;
}

/**
 * Complete event map for the stage event bus. Command events are imperative verbs
 * triggered by overlays or the presenter (`nav:nextStep`, ...); notification events
 * are past-tense state changes emitted by core (`nav:stepChanged`, ...).
 * @category Core
 */
export interface StageEventMap {
  // Navigation commands
  "nav:nextStep": undefined;
  "nav:prevStep": undefined;
  "nav:nextScene": undefined;
  "nav:prevScene": undefined;
  "nav:gotoStep": NavGotoStepEvent;
  "nav:gotoScene": NavGotoSceneEvent;

  // Navigation notifications
  "nav:stepChanged": NavStepChangedEvent;
  "nav:sceneChanged": NavSceneChangedEvent;

  // Pointer commands & notifications
  "pointer:toggle": undefined;
  "pointer:toggled": PointerToggledEvent;

  // Stage lifecycle
  "stage:resized": StageResizedEvent;
  "stage:requestState": undefined;
  "stage:stateChanged": StageStateChangedEvent;
}

/**
 * Context passed to background renderers when they are attached to the stage.
 * @category Core
 */
export interface StageContext {
  container: HTMLElement;
  width: number;
  height: number;
  on<K extends keyof StageEventMap>(
    event: K,
    handler: (data: StageEventMap[K]) => void,
  ): () => void;
}

/**
 * Context passed to overlay plugins when they are mounted on the stage.
 * Provides the DOM containers, stage dimensions, navigation methods, and event subscriptions.
 * @category Core
 */
export interface OverlayContext {
  /** The stage top-level container element (screen space). */
  container: HTMLElement;
  /** The scaled virtual viewport element (e.g. 1920×1080). */
  viewport: HTMLElement;
  /** Virtual stage width in pixels (e.g. 1920). */
  width: number;
  /** Virtual stage height in pixels (e.g. 1080). */
  height: number;
  /** Advance to the next step. */
  next(): void;
  /** Go back to the previous step. */
  prev(): void;
  /** Jump to the first step of the next scene. */
  nextScene(): void;
  /** Jump to the first step of the previous scene. */
  prevScene(): void;
  /** Emit an event on the stage event bus. */
  emit<K extends keyof StageEventMap>(
    event: K,
    ...args: StageEventMap[K] extends undefined ? [] : [data: StageEventMap[K]]
  ): void;
  /** Subscribe to stage events. Returns an unsubscribe function. */
  on<K extends keyof StageEventMap>(
    event: K,
    handler: (data: StageEventMap[K]) => void,
  ): () => void;
}

/**
 * Interface for overlay plugins that attach interactive UI on top of the stage.
 *
 * Overlays are mounted via `stage.overlay(plugin)` and receive an {@link OverlayContext}
 * with navigation methods and event subscriptions.
 *
 * @example
 * ```ts
 * const myOverlay: OverlayPlugin = {
 *   mount(ctx) {
 *     const btn = document.createElement("button");
 *     btn.textContent = "Next";
 *     btn.addEventListener("click", () => ctx.next());
 *     ctx.container.appendChild(btn);
 *   },
 *   show() {},
 *   hide() {},
 *   destroy() {},
 * };
 * stage.overlay(myOverlay);
 * ```
 *
 * @category Core
 */
export interface OverlayPlugin {
  /** Called once when the overlay is attached to the stage. */
  mount(ctx: OverlayContext): void;
  /** Show the overlay. */
  show(): void;
  /** Hide the overlay. */
  hide(): void;
  /** Remove overlay from the DOM and clean up all listeners. */
  destroy(): void;
}

/**
 * @internal
 */
export type BackgroundDecorator = (bg: Background | ReactiveElementBase) => void;

/**
 * Interface implemented by dynamic or static stage background renderers.
 * @category Backgrounds
 */
export interface Background {
  attach(stage: StageContext): void;
  dispose?(): void;
  decorate?(decorator: BackgroundDecorator): this;
  play?(): void;
  pause?(): void;
}

/**
 * Options for initializing the Stage presentation director.
 * @category Core
 */
export interface StageOptions {
  /** Target HTML container or CSS selector to mount into. */
  target?: string | HTMLElement;
  /** Virtual stage width in pixels (default: `1920`). */
  width?: number;
  /** Virtual stage height in pixels (default: `1080`). */
  height?: number;
  /** Default transition duration in seconds (default: `0.6`). */
  defaultDuration?: number;
  /** Initial theme color overrides. */
  theme?: ThemeConfig;
  /** Minimum log level (default: `"warn"`). Set to `"debug"` for verbose output or `"silent"` to suppress all. */
  logLevel?: import("./logger").LogLevel;
}

/**
 * Unwraps a potentially animated property type to its underlying raw value.
 * @category Core
 */
export type UnwrapTransition<T> = T extends TransitionDescriptor<infer U> ? UnwrapTransition<U> : T;

/**
 * Represents a property that accepts either a static value or a reactive transition descriptor.
 * @category Core
 */
export type ReactiveProp<T> = T | TransitionDescriptor<T>;

/**
 * 2D coordinate point or vector as a fixed-length [x, y] tuple.
 * Numbers represent stage percentages (0..100) or pixels in canvas geometry.
 * @category Core
 */
export type Point = readonly [x: number, y: number];

/**
 * Standard named position or anchor keyword.
 * @category Core
 */
export type AnchorKeyword =
  | "top-left"
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

/**
 * Element or connector anchor: either a named keyword or an [x, y] percentage point.
 * @category Core
 */
export type ElementAnchor = AnchorKeyword | Point;

/**
 * Base interface for all reactive presentation elements on stage.
 * @category Core
 */
export interface ReactiveElementBase {
  readonly id: string;
  readonly kind: string;
  readonly domElement: HTMLElement;
  anchor?: ReactiveProp<ElementAnchor>;
  opacity: ReactiveProp<number>;
  x: ReactiveProp<number | string>;
  y: ReactiveProp<number | string>;
  scale: ReactiveProp<number>;
  rotation: ReactiveProp<number>;
  blur: ReactiveProp<number>;
  brightness: ReactiveProp<number>;
  color?: ReactiveProp<string>;
  readonly isMounted?: boolean;
  readonly isActive?: boolean;
  onMount?(fn: () => void): () => void;
  onUnmount?(fn: () => void): () => void;
  onActivate?(fn: () => void): () => void;
  onDeactivate?(fn: () => void): () => void;
  onClick?(handler: (event: MouseEvent) => void): this;
  /** @internal Engine driver */
  _mount?(parent: HTMLElement): void;
  /** @internal Engine driver */
  _unmount?(): void;
  /** @internal Engine driver */
  _activate?(): void;
  /** @internal Engine driver */
  _deactivate?(): void;
}
