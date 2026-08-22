/**
 * Fluent transition builder ('to') and cubic-Bézier easing curve calculations.
 */

import type {
  AnimationMilestone,
  BuiltinEase,
  EaseCurve,
  ReactiveElementBase,
  TransitionDescriptor,
} from "./types";

/**
 * High-precision Cubic Bézier curve solver.
 * Solves B_x(t) = x for t via Newton-Raphson, then evaluates B_y(t).
 */
export function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number): EaseCurve {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;

  function sampleCurveX(t: number): number {
    return ((ax * t + bx) * t + cx) * t;
  }

  function sampleCurveY(t: number): number {
    return ((ay * t + by) * t + cy) * t;
  }

  function sampleDerivativeX(t: number): number {
    return (3 * ax * t + 2 * bx) * t + cx;
  }

  function solveCurveX(x: number): number {
    if (x <= 0) return 0;
    if (x >= 1) return 1;

    // Newton-Raphson iteration
    let t = x;
    for (let i = 0; i < 8; i++) {
      const currentX = sampleCurveX(t) - x;
      if (Math.abs(currentX) < 1e-6) return t;
      const dX = sampleDerivativeX(t);
      if (Math.abs(dX) < 1e-6) break;
      t -= currentX / dX;
    }

    // Fallback bisection search
    let t0 = 0;
    let t1 = 1;
    t = x;
    while (t0 < t1) {
      const currentX = sampleCurveX(t);
      if (Math.abs(currentX - x) < 1e-6) return t;
      if (x > currentX) {
        t0 = t;
      } else {
        t1 = t;
      }
      t = (t1 + t0) * 0.5;
    }
    return t;
  }

  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    return sampleCurveY(solveCurveX(x));
  };
}

export const builtinEasings: Record<BuiltinEase, EaseCurve> = {
  linear: (t) => t,
  cubicOut: (t) => 1 - (1 - t) ** 3,
  cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2),
  quartOut: (t) => 1 - (1 - t) ** 4,
  quartInOut: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - (-2 * t + 2) ** 4 / 2),
  quintOut: (t) => 1 - (1 - t) ** 5,
  quintInOut: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 - (-2 * t + 2) ** 5 / 2),
  expoOut: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  expoInOut: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    return t < 0.5 ? 2 ** (20 * t - 10) / 2 : (2 - 2 ** (-20 * t + 10)) / 2;
  },
  smooth: cubicBezier(0.25, 0.1, 0.25, 1),
  gentle: cubicBezier(0.16, 1, 0.3, 1),
  // Legacy aliases
  outQuad: (t) => t * (2 - t),
  inOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  outExpo: (t) => (t === 1 ? 1 : 1 - 2 ** (-10 * t)),
  inOutExpo: (t) => {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const scaled = t * 2;
    if (scaled < 1) return 0.5 * 2 ** (10 * (scaled - 1));
    return 0.5 * (-(2 ** (-10 * (scaled - 1))) + 2);
  },
};

class TransitionBuilder<T> implements TransitionDescriptor<T> {
  readonly __isTransition = true;
  target: T;
  durationMs = 600; // Default 0.6s
  delayMs = 0;
  triggerTarget?: ReactiveElementBase | string;
  triggerMilestone?: AnimationMilestone;
  triggerProperty?: string;
  curve: EaseCurve = builtinEasings.quartOut; // Smooth deceleration by default, zero bounce

  constructor(target: T) {
    this.target = target;
  }

  duration(seconds: number): this {
    this.durationMs = Math.max(0, seconds * 1000);
    return this;
  }

  delay(seconds: number): this {
    this.delayMs = Math.max(0, seconds * 1000);
    return this;
  }

  when(
    elementOrId: ReactiveElementBase | string,
    milestone: AnimationMilestone = "end",
    property?: string,
  ): this {
    this.triggerTarget = elementOrId;
    this.triggerMilestone = milestone;
    this.triggerProperty = property;
    return this;
  }

  after(elementOrId: ReactiveElementBase | string, property?: string): this {
    return this.when(elementOrId, "end", property);
  }

  ease(curve: BuiltinEase | EaseCurve): this {
    if (typeof curve === "string") {
      this.curve = builtinEasings[curve] ?? builtinEasings.quartOut;
    } else {
      this.curve = curve;
    }
    return this;
  }
}

/**
 * Creates a fluent transition modifier.
 * e.g. `to(200).duration(1.5).ease("outExpo")`
 */
export function to<T>(target: T): TransitionDescriptor<T> {
  return new TransitionBuilder(target);
}

export function isTransitionDescriptor(value: unknown): value is TransitionDescriptor {
  return (
    typeof value === "object" &&
    value !== null &&
    (value as { __isTransition?: boolean }).__isTransition === true
  );
}
