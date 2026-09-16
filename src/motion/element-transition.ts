/**
 * Fluent builder for coordinating multi-property transitions across one or more elements.
 */

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
} from "../core/types";
import type { DOMElement } from "../dom/element";
import { isTransitionDescriptor, to } from "./transitions";

export interface ElementTransitionProps {
  x?: CoordProp;
  y?: CoordProp;
  position?: ReactiveProp<Position> | PositionUpdater;
  width?: CoordProp;
  height?: CoordProp;
  size?: CoordProp;
  scale?: ReactiveProp<number>;
  rotation?: ReactiveProp<number>;
  opacity?: ReactiveProp<number>;
  blur?: ReactiveProp<number>;
  brightness?: ReactiveProp<number>;
  color?: ReactiveProp<string>;
  anchor?: ReactiveProp<ElementAnchor>;
  align?: ReactiveProp<Align>;
  [key: string]: unknown;
}

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
  private elements: (DOMElement | ReactiveElementBase)[];
  private props: ElementTransitionProps;
  private durationSec = 0.6;
  private delaySec = 0;
  private easeCurve: BuiltinEase | EaseCurve = "cubicOut";
  private triggerTarget?: ReactiveElementBase | string;
  private triggerMilestone: AnimationMilestone = "end";
  private triggerProperty?: string;
  private applied = false;
  private unregisterFlush?: () => void;

  constructor(
    element:
      | DOMElement
      | ReactiveElementBase
      | (DOMElement | ReactiveElementBase)[]
      | { elements: readonly (DOMElement | ReactiveElementBase)[] },
    props: ElementTransitionProps,
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
    if (stage && typeof stage.registerPendingFlush === "function") {
      this.unregisterFlush = stage.registerPendingFlush(() => {
        this.apply();
      });
    }
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
        if (val === undefined) continue;
        const targetVal = isTransitionDescriptor(val) ? val.target : val;
        const builder = to(targetVal)
          .duration(this.durationSec)
          .delay(this.delaySec)
          .ease(this.easeCurve);

        if (this.triggerTarget) {
          builder.when(this.triggerTarget, this.triggerMilestone, this.triggerProperty);
        }
        (el as unknown as Record<string, unknown>)[key] = builder;
      }
    }
  }
}
