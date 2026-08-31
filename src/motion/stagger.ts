import { getActiveStage } from "../core/stage";
import type {
  AnimationMilestone,
  BuiltinEase,
  EaseCurve,
  ReactiveElementBase,
} from "../core/types";
import type { DOMElement } from "../dom/element";
import { to } from "./transitions";

/**
 * Configuration options for cascading stagger animations across multiple elements.
 * @category Motion
 */
export interface StaggerOptions {
  duration?: number;
  overlap?: AnimationMilestone;
  ease?: BuiltinEase | EaseCurve;
  props?: Record<string, unknown>;
}

/**
 * @internal
 */
export class StaggerBuilder {
  private elements: (DOMElement | ReactiveElementBase)[];
  private durationSec = 0.4;
  private overlapMilestone: AnimationMilestone = 0.5;
  private easeCurve: BuiltinEase | EaseCurve = "quartOut";
  private targetProps: Record<string, unknown> = { opacity: 1, x: 0 };
  private triggerTarget?: ReactiveElementBase | string;
  private triggerMilestone: AnimationMilestone = "end";
  private applied = false;
  private unregisterFlush?: () => void;

  constructor(elements: (DOMElement | ReactiveElementBase)[], options: StaggerOptions = {}) {
    this.elements = elements;
    if (options.duration !== undefined) this.durationSec = options.duration;
    if (options.overlap !== undefined) this.overlapMilestone = options.overlap;
    if (options.ease !== undefined) this.easeCurve = options.ease;
    if (options.props !== undefined) this.targetProps = options.props;

    const stage = getActiveStage();
    if (stage && typeof stage.registerPendingFlush === "function") {
      this.unregisterFlush = stage.registerPendingFlush(() => {
        this.apply();
      });
    }
  }

  /** Sets the duration in seconds for each element's animation. */
  duration(seconds: number): this {
    this.durationSec = seconds;
    return this;
  }

  /** Sets the overlap trigger milestone between consecutive items (e.g. 0.5 or "halfway"). */
  overlap(milestone: AnimationMilestone): this {
    this.overlapMilestone = milestone;
    return this;
  }

  /** Sets the easing curve for each element transition. */
  ease(curve: BuiltinEase | EaseCurve): this {
    this.easeCurve = curve;
    return this;
  }

  /** Customizes the animated target properties (defaults to `{ opacity: 1, x: 0 }`). */
  props(properties: Record<string, unknown>): this {
    this.targetProps = properties;
    return this;
  }

  /** Synchronizes the stagger cascade to start when an external trigger reaches a milestone. */
  when(target: ReactiveElementBase | string, milestone: AnimationMilestone = "end"): this {
    this.triggerTarget = target;
    this.triggerMilestone = milestone;
    this.apply();
    return this;
  }

  /** Chains the stagger cascade to start after an external trigger finishes its animation. */
  after(target: ReactiveElementBase | string): this {
    return this.when(target, "end");
  }

  /** Explicitly executes the stagger cascade immediately. */
  apply(): void {
    if (this.applied) return;
    this.applied = true;
    this.unregisterFlush?.();

    if (this.elements.length === 0) return;

    this.elements.forEach((item, index) => {
      const targetRecord = item as unknown as Record<string, unknown>;
      const prevItem = index > 0 ? this.elements[index - 1] : undefined;
      const isFirst = index === 0;

      for (const [prop, targetVal] of Object.entries(this.targetProps)) {
        const transition = to(targetVal).duration(this.durationSec).ease(this.easeCurve);

        if (isFirst) {
          if (this.triggerTarget) {
            transition.when(this.triggerTarget, this.triggerMilestone);
          }
        } else if (prevItem) {
          transition.when(prevItem, this.overlapMilestone);
        }

        targetRecord[prop] = transition;
      }
    });
  }
}

/**
 * Creates a fluent stagger coordinator to cascade animations across a list of elements.
 * @category Motion
 */
export function stagger(
  elements: (DOMElement | ReactiveElementBase)[],
  options?: StaggerOptions,
): StaggerBuilder {
  return new StaggerBuilder(elements, options);
}
