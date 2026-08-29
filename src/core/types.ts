/**
 * Type definitions for stage options, easing curves, transition descriptors, and snapshots.
 */

export type EaseCurve = (t: number) => number;

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
 */
export type AnimationMilestone = "start" | "halfway" | "end" | "complete" | number;

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
 */
export interface ThemeConfig {
  /** Background color of the stage canvas (maps to `--sr-background`). */
  background?: string;
  /** Primary text color for headlines and hero typography (maps to `--sr-text`). */
  text?: string;
  /** Secondary text color for body paragraphs and descriptions (maps to `--sr-text-muted`). */
  textMuted?: string;
  /** Tertiary text color for kickers, labels, and bullet dots (maps to `--sr-text-dim`). */
  textDim?: string;
  /** Brand/accent highlight color (maps to `--sr-primary`). */
  primary?: string;
  /** Accent highlight color (maps to `--sr-accent`). */
  accent?: string;
  /** Surface background fill for cards, terminals, and badges (maps to `--sr-surface`). */
  surface?: string;
  /** Outline border for surface containers (maps to `--sr-surface-border`). */
  surfaceBorder?: string;
  /** Top specular highlight / rim color for surfaces (maps to `--sr-surface-highlight`). */
  surfaceHighlight?: string;
  /** Elevation shadow and inner lighting for surfaces (maps to `--sr-surface-shadow`). */
  surfaceShadow?: string;
  /** Backdrop blur filter for translucent surfaces (maps to `--sr-surface-backdrop`). */
  surfaceBackdrop?: string;
  /** Custom CSS variables or extended theme keys. */
  [key: string]: string | undefined;
}

export interface StepSnapshot {
  sceneName: string;
  stepIndex: number;
  properties: Map<string, Record<string, unknown>>;
  activeElementIds: Set<string>;
  theme?: ThemeConfig;
}

export interface StepData {
  sceneName: string;
  stepIndex: number;
  transitions: TransitionRecord[];
  activeElementIds: Set<string>;
  notes?: string;
  theme?: ThemeConfig;
}

export interface StepChangeEvent {
  stepIndex: number;
  totalSteps: number;
  sceneName: string;
}

export interface SceneChangeEvent {
  from: string;
  to: string;
  stepIndex: number;
}

export interface ResizeEvent {
  width: number;
  height: number;
}

export interface StageEventMap {
  sceneChange: SceneChangeEvent;
  stepChange: StepChangeEvent;
  resize: ResizeEvent;
}

export interface StageContext {
  container: HTMLElement;
  width: number;
  height: number;
  on<K extends keyof StageEventMap>(
    event: K,
    handler: (data: StageEventMap[K]) => void,
  ): () => void;
}

export type BackgroundDecorator = (bg: Background | ReactiveElementBase) => void;

export interface Background {
  attach(stage: StageContext): void;
  dispose?(): void;
  decorate?(decorator: BackgroundDecorator): this;
  play?(): void;
  pause?(): void;
}

export interface StageOptions {
  target?: string | HTMLElement;
  width?: number;
  height?: number;
  defaultDuration?: number;
  theme?: ThemeConfig;
}

export type UnwrapTransition<T> = T extends TransitionDescriptor<infer U> ? UnwrapTransition<U> : T;

export type ReactiveProp<T> = T | TransitionDescriptor<T>;

export type AnchorKeyword =
  | "top-left"
  | "center"
  | "top"
  | "bottom"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type ElementAnchor = AnchorKeyword | [number, number];

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
  play?(): void;
  pause?(): void;
  onClick?(handler: (event: MouseEvent) => void): this;
}
