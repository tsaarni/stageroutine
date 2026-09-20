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
  | "gentle";

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
 * Continuous ambient stroke animations supported across shapes and connectors.
 * @category Motion
 */
export type FlowEffect = "none" | "traveling" | "chase" | "ping";

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

/**
 * Event payload emitted when the active presentation step changes.
 * @category Core
 */
export interface NavStepChangedEvent {
  /** 0-based index of the active step. */
  index: number;
  /** Total number of steps in the presentation. */
  total: number;
  /** Name of the active scene. */
  scene: string;
}

/**
 * Event payload emitted when the active scene changes.
 * @category Core
 */
export interface NavSceneChangedEvent {
  /** Name of the previous scene. */
  from: string;
  /** Name of the incoming scene. */
  to: string;
  /** 0-based index of the incoming scene. */
  index: number;
}

/**
 * Command event payload to jump directly to a step index.
 * @category Core
 */
export interface NavGotoStepEvent {
  /** 0-based target step index. */
  index: number;
}

/**
 * Command event payload to jump directly to a scene index.
 * @category Core
 */
export interface NavGotoSceneEvent {
  /** 0-based target scene index. */
  index: number;
}

/**
 * Event payload emitted when the stage viewport dimensions change.
 * @category Core
 */
export interface StageResizedEvent {
  /** New viewport width in virtual canvas pixels. */
  width: number;
  /** New viewport height in virtual canvas pixels. */
  height: number;
}

/**
 * Complete state snapshot emitted whenever presentation state changes.
 * @category Core
 */
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

/**
 * Event payload emitted when the pointer active state changes.
 * @category Core
 */
export interface PointerStateChangedEvent {
  /** Whether the pointer overlay is currently active. */
  active: boolean;
}

/**
 * Command payload to set the pointer active state.
 * @category Core
 */
export interface PointerSetStateEvent {
  /** New active state for the pointer. */
  active: boolean;
}

/**
 * Complete event map for the stage event bus.
 * - Requests (`req:*`) are imperative instructions sent to the stage (e.g. `req:nav:nextStep`).
 * - Events (`evt:*`) are state notifications broadcast by core (e.g. `evt:nav:stepChanged`).
 * @category Core
 */
export interface StageEventMap {
  // Navigation requests
  "req:nav:nextStep": undefined;
  "req:nav:prevStep": undefined;
  "req:nav:nextScene": undefined;
  "req:nav:prevScene": undefined;
  "req:nav:gotoStep": NavGotoStepEvent;
  "req:nav:gotoScene": NavGotoSceneEvent;

  // Navigation notifications
  "evt:nav:stepChanged": NavStepChangedEvent;
  "evt:nav:sceneChanged": NavSceneChangedEvent;

  // Pointer requests & notifications
  "req:pointer:setState": PointerSetStateEvent;
  "evt:pointer:stateChanged": PointerStateChangedEvent;

  // Stage lifecycle
  "evt:stage:resized": StageResizedEvent;
  "req:stage:requestState": undefined;
  "evt:stage:stateChanged": StageStateChangedEvent;
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
 * A decorator applied to a background element.
 * @category Backgrounds
 */
export type BackgroundDecorator = (bg: Background | ReactiveElementBase) => void;

/**
 * Interface implemented by dynamic or static stage background renderers.
 * @category Backgrounds
 */
export interface Background {
  readonly domElement?: HTMLElement;
  attach(stage: StageContext): void;
  dispose?(): void;
  decorate(decorator: BackgroundDecorator): this;
  play?(): void;
  pause?(): void;
}

/**
 * Options for initializing the Stage presentation director.
 * @category Core
 * @inline
 */
export interface StageOptions {
  /** Target HTML container or CSS selector to mount into (default: `document.body`). */
  target?: string | HTMLElement;
  /** Virtual stage width in pixels (default: `1920` or environment config). */
  width?: number;
  /** Virtual stage height in pixels (default: `1080` or environment config). */
  height?: number;
  /** Default transition duration in seconds (default: `0.6`). */
  defaultDuration?: number;
  /** Initial theme color overrides (default: `defaultDark`). */
  theme?: ThemeConfig;
  /** Minimum log level (default: `"warn"`). Set to `"debug"` for verbose output or `"silent"` to suppress all. */
  logLevel?: import("./logger").LogLevel;
  /**
   * BroadcastChannel name for dual-screen presenter console synchronization.
   * Pass `false` to disable presenter sync (recommended for embedded component previews and unit tests).
   * Default: `"stageroutine-channel"`.
   */
  channel?: string | false;
}

/**
 * Unwraps a potentially animated property type to its underlying raw value.
 * @category Core
 */
export type UnwrapTransition<T> =
  T extends TransitionDescriptor<infer U>
    ? UnwrapTransition<U>
    : T extends (...args: never[]) => infer R
      ? R
      : T;

/**
 * 2D coordinate delta updater function.
 * Accepts either `(x, y)` coordinates or a `([x, y])` tuple and returns target coordinates.
 * @category Core
 */
export type PositionUpdater =
  | ((x: number, y: number) => [number | string, number | string])
  | ((current: [number, number]) => [number | string, number | string]);

/**
 * Represents a property that accepts a static value, a reactive transition descriptor,
 * or a numeric relative-delta updater.
 * Coordinate strings (`"50cqw"`, `"center"`) and colors do not accept updaters.
 * Use {@link CoordProp} for `x`, `y`, `width`, `height`, and `size`.
 * @category Core
 */
export type ReactiveProp<T> =
  | T
  | TransitionDescriptor<T>
  | (T extends number ? (current: number) => number : never)
  | (T extends Position ? PositionUpdater : never);

/**
 * Stage coordinate or dimension property.
 * Accepts a number, CSS/layout string, transition, or relative-delta updater.
 * @category Core
 */
export type CoordProp = ReactiveProp<number | string> | ((current: number) => number | string);

/**
 * 2D coordinate point or vector as a fixed-length [x, y] tuple.
 * Numbers represent stage percentages (0..100) or pixels in canvas geometry.
 * @category Core
 */
export type Point = readonly [x: number, y: number];

/**
 * 2D coordinate point or vector as an [x, y] tuple.
 * Numbers represent stage percentages or pixels; strings represent layout coordinates (e.g. "center").
 * @category Core
 */
export type Position =
  | readonly [x: number | string, y: number | string]
  | readonly (number | string)[];

/**
 * 9-position content alignment grid for text and children inside a container.
 * Single-axis shorthands are centered on the other axis: "top" means top-center, "left" means middle-left.
 * @category Layout
 */
export type Align =
  | "top-left"
  | "top"
  | "top-right"
  | "left"
  | "center"
  | "right"
  | "bottom-left"
  | "bottom"
  | "bottom-right";

/**
 * Standard named position or anchor keyword.
 * @category Core
 */
export type AnchorKeyword = Align;

/**
 * Element or connector anchor: either a named keyword or an [x, y] percentage point.
 * @category Core
 */
export type ElementAnchor = AnchorKeyword | Point;

/**
 * How a connector endpoint picks its attachment point on a target outline.
 * "auto" pins to the midpoint of the facing straight side when there is one, otherwise it behaves like "ray".
 * "closest" takes the nearest outline point. "ray" takes the crossing of the direction towards the other endpoint.
 * @category Core
 */
export type AnchorMode = "auto" | "closest" | "ray";

/**
 * Base interface for all reactive presentation elements on stage.
 * @category Core
 */
export interface ReactiveElementBase {
  readonly id: string;
  readonly kind: string;
  readonly domElement: HTMLElement;
  anchor?: ReactiveProp<ElementAnchor>;
  align?: ReactiveProp<Align>;
  /**
   * Whether this element manages its own CSS positioning/transform (e.g. custom SVG overlays or lifelines).
   * When true, Stage does not overwrite `node.style.transform`.
   * @internal Engine driver
   */
  isCustomPositioned?: boolean;
  /**
   * Default pointer-events style when element is visible.
   * @internal Engine driver
   */
  _defaultPointerEvents?: string;
  opacity: ReactiveProp<number>;
  x: CoordProp;
  y: CoordProp;
  position?: ReactiveProp<Position> | PositionUpdater;
  size?: CoordProp;
  scale: ReactiveProp<number>;
  rotation: ReactiveProp<number>;
  blur: ReactiveProp<number>;
  brightness: ReactiveProp<number>;
  color?: ReactiveProp<string>;
  readonly isMounted?: boolean;
  readonly isActive?: boolean;
  onMount?(fn: () => void): () => void;
  onUnmount?(fn: () => void): () => void;
  /** Duration in seconds for exiting scene transition (defaults to stage defaultDuration if undefined). */
  exitDuration?: number;
  /** Delay in seconds before exiting scene transition begins (defaults to 0). */
  exitDelay?: number;
  /** Duration in seconds for entering scene transition (defaults to stage defaultDuration if undefined). */
  enterDuration?: number;
  /** Delay in seconds before entering scene transition begins (defaults to 0). */
  enterDelay?: number;
  onActivate?(fn: () => void): () => void;
  onDeactivate?(fn: () => void): () => void;
  onUpdate?(fn: (progress: number) => void): () => void;
  onClick?(handler: (event: MouseEvent) => void): this;
  /** Recomputes layout or path coordinates on visual changes. */
  update?(): void;
  /** @internal Engine driver */
  _dispatchUpdate?(progress?: number): void;
  /** @internal Engine driver */
  _mount?(parent: HTMLElement): void;
  /** @internal Engine driver */
  _unmount?(): void;
  /** @internal Engine driver */
  _activate?(): void;
  /** @internal Engine driver */
  _deactivate?(): void;
}
