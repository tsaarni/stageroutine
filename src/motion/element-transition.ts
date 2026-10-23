/**
 * Fluent builder for coordinating multi-property transitions across one or more elements.
 */

import { copyPositionMotion } from "../core/position-motion";
import { isReactiveProperty } from "../core/reactive";
import { getActiveStage } from "../core/stage";
import type {
  Align,
  AnimationMilestone,
  BuiltinEase,
  CoordProp,
  EaseCurve,
  ElementAnchor,
  Position,
  PositionUpdater,
  ReactiveElementBase,
  ReactiveProp,
  Size,
} from "../core/types";
import type { DOMElement } from "../dom/element";
import { isTransitionDescriptor, to } from "./transitions";

/**
 * Transitionable element properties and targets.
 * @category Motion
 */

/** Transition targets from an element's presentation properties. @category Motion */
export type ElementTransitionProps<T = ReactiveElementBase> = {
  x?: CoordProp;
  y?: CoordProp;
  position?: ReactiveProp<Position> | PositionUpdater;
  width?: ReactiveProp<Size>;
  height?: ReactiveProp<Size>;
  size?: ReactiveProp<Size>;
  scale?: ReactiveProp<number>;
  rotation?: ReactiveProp<number>;
  opacity?: ReactiveProp<number>;
  blur?: ReactiveProp<number>;
  brightness?: ReactiveProp<number>;
  color?: ReactiveProp<string>;
  origin?: ReactiveProp<ElementAnchor>;
  align?: ReactiveProp<Align>;
  zIndex?: ReactiveProp<number | string>;
} & {
  [K in keyof T as K extends string
    ? K extends
        | `_${string}`
        | "id"
        | "kind"
        | "domElement"
        | "isMounted"
        | "isActive"
        | "items"
        | "rows"
        | "path"
        | "variant"
        | "actor"
        | "lifeline"
        | "activations"
        | "playbackTime"
        | "status"
        | "videoElement"
        | "imgElement"
      ? never
      : T[K] extends (...args: never[]) => unknown
        ? never
        : K
    : never]?: ReactiveProp<T[K]>;
};

/**
 * Public fluent contract for multi-property transitions on an element or group.
 * @category Motion
 */
export interface ElementTransition {
  duration(seconds: number): this;
  delay(seconds: number): this;
  ease(curve: BuiltinEase | EaseCurve): this;
  when(
    target: ReactiveElementBase | string,
    milestone?: AnimationMilestone,
    property?: string,
  ): this;
  after(target: ReactiveElementBase | string, property?: string): this;
  apply(): void;
}

/**
 * Fluent builder for multi-property transitions on one or more elements.
 * @internal
 */
export class ElementTransitionBuilder implements ElementTransition {
  private elements: readonly (DOMElement | ReactiveElementBase)[];
  private props: object;
  private durationSec?: number;
  private delaySec?: number;
  private easeCurve?: BuiltinEase | EaseCurve;
  private triggerTarget?: ReactiveElementBase | string;
  private triggerMilestone: AnimationMilestone = "end";
  private triggerProperty?: string;
  private applied = false;
  private unregisterFlush?: () => void;

  constructor(
    element:
      | DOMElement
      | ReactiveElementBase
      | readonly (DOMElement | ReactiveElementBase)[]
      | { elements: readonly (DOMElement | ReactiveElementBase)[] },
    props: object,
  ) {
    if (Array.isArray(element)) {
      this.elements = element;
    } else if (
      element &&
      typeof element === "object" &&
      "elements" in element &&
      Array.isArray((element as { elements: unknown }).elements)
    ) {
      this.elements = (element as { elements: (DOMElement | ReactiveElementBase)[] }).elements;
    } else {
      this.elements = [element as DOMElement | ReactiveElementBase];
    }
    this.props = props;

    const stage = getActiveStage();
    if (stage && typeof stage._registerPendingFlush === "function") {
      this.unregisterFlush = stage._registerPendingFlush(() => {
        this.apply();
      });
    }
    if (stage.isMounted) queueMicrotask(() => this.apply());
  }

  /** Sets transition duration in seconds. */
  duration(seconds: number): this {
    this.durationSec = Math.max(0, seconds);
    return this;
  }

  /** Sets delay in seconds before animation begins. */
  delay(seconds: number): this {
    this.delaySec = Math.max(0, seconds);
    return this;
  }

  /** Sets easing curve. */
  ease(curve: BuiltinEase | EaseCurve): this {
    this.easeCurve = curve;
    return this;
  }

  /** Synchronizes transition start to an external element trigger. */
  when(
    target: ReactiveElementBase | string,
    milestone: AnimationMilestone = "end",
    property?: string,
  ): this {
    this.triggerTarget = target;
    this.triggerMilestone = milestone;
    this.triggerProperty = property;
    this.apply();
    return this;
  }

  /** Chains transition to start after an external element finishes. */
  after(target: ReactiveElementBase | string, property?: string): this {
    return this.when(target, "end", property);
  }

  /** Executes multi-property transitions across target elements. */
  apply(): void {
    if (this.applied) return;
    this.applied = true;
    this.unregisterFlush?.();

    for (const el of this.elements) {
      if (!el) continue;
      for (const [key, val] of Object.entries(this.props)) {
        if (!isReactiveProperty(el, key) && key !== "labelOffset") {
          throw new Error(`Unsupported transition property: ${key}`);
        }
        if (val === undefined) {
          (el as unknown as Record<string, unknown>)[key] = undefined;
          continue;
        }
        const targetVal = isTransitionDescriptor(val) ? val.target : val;
        const descriptor = isTransitionDescriptor(val) ? val : undefined;
        const builder = to(targetVal);
        if (descriptor) {
          builder.durationMs = descriptor.durationMs;
          builder.delayMs = descriptor.delayMs;
          builder.curve = descriptor.curve;
          copyPositionMotion(descriptor, builder);
          builder.triggerTarget = descriptor.triggerTarget;
          builder.triggerMilestone = descriptor.triggerMilestone;
          builder.triggerProperty = descriptor.triggerProperty;
        }
        if (this.durationSec !== undefined) builder.duration(this.durationSec);
        if (this.delaySec !== undefined) builder.delay(this.delaySec);
        if (this.easeCurve !== undefined) builder.ease(this.easeCurve);

        if (this.triggerTarget) {
          builder.when(this.triggerTarget, this.triggerMilestone, this.triggerProperty);
        }
        (el as unknown as Record<string, unknown>)[key] = builder;
      }
    }
  }
}
