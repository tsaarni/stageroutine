import { getActiveStage } from "../core/stage";
import type {
  AnimationMilestone,
  BuiltinEase,
  EaseCurve,
  ReactiveElementBase,
} from "../core/types";
import type { DOMElement } from "../dom/element";
import { to } from "./transitions";

export interface CrossfadeOptions {
  /** Total choreography duration in seconds (default: 0.5s). */
  duration?: number;
  /** Overlap hand-off point as a fraction of exit progress (default: 0.55). */
  overlap?: number;
  /** Subtle depth scaling factor during swap (default: 0.96, or false to disable). */
  scale?: boolean | number;
  /** Easing curve for the incoming element (default: "quartOut"). */
  ease?: BuiltinEase | EaseCurve;
  /** Automatically match incoming element's (x, y) coordinates to outgoing element (default: true). */
  matchPosition?: boolean;
}

export class CrossfadeBuilder {
  private fromElement: DOMElement | ReactiveElementBase;
  private toElement: DOMElement | ReactiveElementBase;
  private durationSec = 0.5;
  private overlapPoint = 0.55;
  private easeCurve: BuiltinEase | EaseCurve = "quartOut";
  private scaleFactor: number | undefined = 0.96;
  private shouldMatchPosition = true;
  private triggerTarget?: ReactiveElementBase | string;
  private triggerMilestone: AnimationMilestone = "end";
  private triggerProperty?: string;
  private applied = false;
  private unregisterFlush?: () => void;

  constructor(
    fromElement: DOMElement | ReactiveElementBase,
    toElement: DOMElement | ReactiveElementBase,
    options: CrossfadeOptions = {},
  ) {
    this.fromElement = fromElement;
    this.toElement = toElement;

    if (options.duration !== undefined) this.durationSec = options.duration;
    if (options.overlap !== undefined) this.overlapPoint = options.overlap;
    if (options.ease !== undefined) this.easeCurve = options.ease;
    if (options.matchPosition !== undefined) this.shouldMatchPosition = options.matchPosition;
    if (options.scale !== undefined) {
      this.scaleFactor =
        typeof options.scale === "number" ? options.scale : options.scale ? 0.96 : undefined;
    }

    const stage = getActiveStage();
    if (stage && typeof stage.registerPendingFlush === "function") {
      this.unregisterFlush = stage.registerPendingFlush(() => {
        this.apply();
      });
    }
  }

  /** Sets total duration in seconds. */
  duration(seconds: number): this {
    this.durationSec = Math.max(0.05, seconds);
    return this;
  }

  /** Sets the overlap hand-off point as a fraction of exit progress (0..1). */
  overlap(fraction: number): this {
    this.overlapPoint = Math.min(Math.max(0, fraction), 1);
    return this;
  }

  /** Sets the easing curve for the incoming element. */
  ease(curve: BuiltinEase | EaseCurve): this {
    this.easeCurve = curve;
    return this;
  }

  /** Enables or configures subtle depth scaling during the swap. */
  scale(factor: boolean | number = 0.96): this {
    this.scaleFactor = typeof factor === "number" ? factor : factor ? 0.96 : undefined;
    return this;
  }

  /** Whether incoming element automatically snaps to outgoing element's position. */
  matchPosition(match: boolean): this {
    this.shouldMatchPosition = match;
    return this;
  }

  /** Synchronizes the crossfade start to an external element trigger. */
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

  /** Chains the crossfade to start after an external element finishes. */
  after(target: ReactiveElementBase | string, property?: string): this {
    return this.when(target, "end", property);
  }

  /** Executes the asymmetric phase swap transitions. */
  apply(): void {
    if (this.applied) return;
    this.applied = true;
    this.unregisterFlush?.();

    const fromTarget = this.fromElement as unknown as Record<string, unknown>;
    const toTarget = this.toElement as unknown as Record<string, unknown>;

    // Align coordinates if requested
    if (this.shouldMatchPosition) {
      if (fromTarget.x !== undefined) toTarget.x = fromTarget.x;
      if (fromTarget.y !== undefined) toTarget.y = fromTarget.y;
    }

    // Phase 1: Fast Exit (45% of duration)
    const exitDuration = this.durationSec * 0.45;
    const fromOpacity = to(0).duration(exitDuration).ease("cubicOut");

    if (this.triggerTarget) {
      fromOpacity.when(this.triggerTarget, this.triggerMilestone, this.triggerProperty);
    }
    fromTarget.opacity = fromOpacity;

    if (this.scaleFactor !== undefined) {
      const fromScale = to(this.scaleFactor).duration(exitDuration).ease("cubicOut");
      if (this.triggerTarget) {
        fromScale.when(this.triggerTarget, this.triggerMilestone, this.triggerProperty);
      }
      fromTarget.scale = fromScale;
    }

    // Phase 2: Smooth Entrance (65% of duration, starts at overlap point of Phase 1)
    const enterDuration = this.durationSec * 0.65;
    const toOpacity = to(1)
      .duration(enterDuration)
      .ease(this.easeCurve)
      .when(this.fromElement, this.overlapPoint);

    toTarget.opacity = toOpacity;

    if (this.scaleFactor !== undefined) {
      toTarget.scale = this.scaleFactor;
      const toScale = to(1)
        .duration(enterDuration)
        .ease(this.easeCurve)
        .when(this.fromElement, this.overlapPoint);

      toTarget.scale = toScale;
    }
  }
}

/**
 * Creates an asymmetric phase swap between two elements in place.
 * Outgoing element exits quickly; incoming element enters smoothly with zero text double-vision.
 */
export function crossfade(
  fromElement: DOMElement | ReactiveElementBase,
  toElement: DOMElement | ReactiveElementBase,
  options?: CrossfadeOptions,
): CrossfadeBuilder {
  return new CrossfadeBuilder(fromElement, toElement, options);
}
