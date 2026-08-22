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
  duration(seconds: number): this;
  delay(seconds: number): this;
  when(
    elementOrId: ReactiveElementBase | string,
    milestone?: AnimationMilestone,
    property?: string,
  ): this;
  after(elementOrId: ReactiveElementBase | string, property?: string): this;
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

export type ThemeConfig = Record<string, string>;

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

export interface StageOptions {
  target?: string | HTMLElement;
  width?: number;
  height?: number;
  defaultDuration?: number;
  theme?: ThemeConfig;
}

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
}
