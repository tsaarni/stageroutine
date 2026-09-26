/**
 * Ken Burns cinematic pan and zoom decorator for images, frames, and media containers.
 */

import { resolveAnchor } from "../core/interpolators";
import type { ElementAnchor } from "../core/types";
import type { DOMElement, ElementDecorator } from "../dom/element";

/**
 * Target focal anchor point or normalized percentage coordinate pair `[x, y]`.
 * @category Decorators
 */
export type KenBurnsFocus = ElementAnchor | [number, number];

/**
 * Keyframe snapshot for Ken Burns camera motion.
 * @category Decorators
 */
export interface KenBurnsKeyframe {
  /** Scale factor (default: 1.0, minimum: 1.0). */
  scale?: number;
  /** Focus anchor point or percentage coordinates [x, y] from 0 to 100 (default: "center"). Explicit `pan` takes precedence. */
  focus?: KenBurnsFocus;
  /** Explicit translation percentage offset [x, y], clamped to safe frame bounds. Takes precedence over `focus`. */
  pan?: [number, number];
}

/**
 * Configuration options for the Ken Burns camera pan and zoom decorator.
 *
 * All time durations are expressed in seconds.
 *
 * @category Decorators
 * @inline
 */
export interface KenBurnsOptions {
  /** Peak zoom magnification factor (default: 1.35). For zoom-in, this is the end scale; for zoom-out, the start scale. */
  scale?: number;
  /** Target focus shorthand when `to` is omitted (default: "center"). Explicit `pan` takes precedence over `focus`. */
  focus?: KenBurnsFocus;
  /** Explicit target pan translation percentages [x, y] when `to` is omitted. Takes precedence over `focus`. */
  pan?: [number, number];
  /** Direction shorthand: "in" (default) zooms 1.0 to scale; "out" zooms scale to 1.0. */
  direction?: "in" | "out";
  /** Starting keyframe or focus anchor (default: full frame scale 1.0 at center). */
  from?: KenBurnsKeyframe | KenBurnsFocus;
  /** Ending keyframe or focus anchor (default: peak scale and focus). */
  to?: KenBurnsKeyframe | KenBurnsFocus;
  /** Animation duration in seconds (default: 20s). */
  duration?: number;
  /** Initial delay before motion begins in seconds (default: 0s). */
  delay?: number;
  /** CSS easing timing curve (default: "ease-out"). */
  ease?: string;
  /** Whether motion loops continuously or alternates directions (default: false, holds end frame). */
  loop?: boolean | "alternate";
}

interface KeyframeParams {
  scale: number;
  panX: number;
  panY: number;
}

function computeKeyframeParams(kf: KenBurnsKeyframe): KeyframeParams {
  const scale = Math.max(1.0, kf.scale ?? 1.0);
  const maxPan = 50 * (scale - 1);

  let panX = 0;
  let panY = 0;

  // Explicit pan offset takes precedence over focus anchor
  if (kf.pan) {
    panX = Math.max(-maxPan, Math.min(maxPan, kf.pan[0]));
    panY = Math.max(-maxPan, Math.min(maxPan, kf.pan[1]));
  } else if (kf.focus !== undefined) {
    const [fx, fy] = resolveAnchor(kf.focus);
    panX = ((50 - fx) / 50) * maxPan;
    panY = ((50 - fy) / 50) * maxPan;
  }

  return { scale, panX, panY };
}

function resolveTargets(element: DOMElement): HTMLElement[] {
  const root = element.domElement;
  if (!root) return [];

  // Frame clipping container
  const frameContent = root.querySelector<HTMLElement>(".sr-frame-content");
  if (frameContent) {
    frameContent.style.overflow = "hidden";
    const children = Array.from(frameContent.children) as HTMLElement[];
    if (children.length > 0) {
      return children;
    }
    return [frameContent];
  }

  // Media child inside container (e.g. Card, Shape) without DOM reparenting
  const mediaChild = root.querySelector<HTMLElement>(".sr-image, img, video");
  if (mediaChild && mediaChild !== root) {
    root.style.overflow = "hidden";
    return [mediaChild];
  }

  // Standalone element
  root.style.overflow = "hidden";
  return [root];
}

function isKenBurnsKeyframe(val: KenBurnsKeyframe | KenBurnsFocus): val is KenBurnsKeyframe {
  return typeof val === "object" && val !== null && !Array.isArray(val) && !("length" in val);
}

/**
 * Decorates an element or frame with authentic Ken Burns camera panning and slow zooming.
 *
 * Supports pure zoom, tracking pans, and combined pan-and-zoom shots.
 * Restarts the shot from frame zero whenever entering active scene visibility.
 *
 * @category Decorators
 */
export function kenBurns(options: KenBurnsOptions = {}): ElementDecorator {
  const { duration = 20, delay = 0, ease = "ease-out", loop = false, direction = "in" } = options;

  const isZoomOut = direction === "out";
  const defaultPeakScale = options.scale ?? 1.35;
  const isTwoFocusPan =
    options.from !== undefined &&
    options.to !== undefined &&
    !isKenBurnsKeyframe(options.from) &&
    !isKenBurnsKeyframe(options.to);

  let fromKf: KenBurnsKeyframe;
  let toKf: KenBurnsKeyframe;

  if (options.from) {
    if (isKenBurnsKeyframe(options.from)) {
      fromKf = {
        scale: options.from.scale ?? (isZoomOut ? defaultPeakScale : 1.0),
        focus: options.from.focus ?? "center",
        pan: options.from.pan,
      };
    } else {
      let scale = 1.0;
      if (isTwoFocusPan || isZoomOut) {
        scale = defaultPeakScale;
      }
      fromKf = { scale, focus: options.from };
    }
  } else {
    fromKf = isZoomOut
      ? { scale: defaultPeakScale, focus: options.focus ?? "center", pan: options.pan }
      : { scale: 1.0, focus: "center" };
  }

  if (options.to) {
    if (isKenBurnsKeyframe(options.to)) {
      toKf = {
        scale: options.to.scale ?? (isZoomOut ? 1.0 : defaultPeakScale),
        focus: options.to.focus ?? (isZoomOut ? "center" : (options.focus ?? "center")),
        pan: options.to.pan,
      };
    } else {
      let scale = defaultPeakScale;
      if (!isTwoFocusPan && isZoomOut) {
        scale = 1.0;
      }
      toKf = { scale, focus: options.to };
    }
  } else {
    toKf = isZoomOut
      ? { scale: 1.0, focus: "center" }
      : { scale: defaultPeakScale, focus: options.focus ?? "center", pan: options.pan };
  }

  const fromP = computeKeyframeParams(fromKf);
  const toP = computeKeyframeParams(toKf);

  return (element: DOMElement) => {
    const animations: Animation[] = [];

    function setupAnimations() {
      for (const anim of animations) {
        anim.cancel();
      }
      animations.length = 0;

      const targets = resolveTargets(element);
      for (const target of targets) {
        target.style.transformOrigin = "50% 50%";
        target.style.willChange = "transform";

        const isRootStageTarget = target === element.domElement && !element.isCustomPositioned;
        if (isRootStageTarget) {
          element.onUpdate(() => {
            target.style.transformOrigin = "50% 50%";
          });
        }

        const keyframes: Keyframe[] = isRootStageTarget
          ? [
              {
                scale: `${fromP.scale}`,
                translate: `${fromP.panX.toFixed(3)}% ${fromP.panY.toFixed(3)}%`,
              },
              {
                scale: `${toP.scale}`,
                translate: `${toP.panX.toFixed(3)}% ${toP.panY.toFixed(3)}%`,
              },
            ]
          : [
              {
                transform: `translate3d(${fromP.panX.toFixed(3)}%, ${fromP.panY.toFixed(3)}%, 0) scale(${fromP.scale.toFixed(4)})`,
              },
              {
                transform: `translate3d(${toP.panX.toFixed(3)}%, ${toP.panY.toFixed(3)}%, 0) scale(${toP.scale.toFixed(4)})`,
              },
            ];

        const anim = target.animate(keyframes, {
          duration: duration * 1000,
          delay: delay * 1000,
          easing: ease,
          iterations: loop ? Number.POSITIVE_INFINITY : 1,
          direction: loop === "alternate" ? "alternate" : "normal",
          fill: "forwards",
        });

        if (!element.isActive) {
          anim.pause();
        }

        animations.push(anim);
      }
    }

    setupAnimations();

    element.onMount(() => {
      if (animations.length === 0) {
        setupAnimations();
      }
    });

    element.onActivate(() => {
      if (animations.length === 0) {
        setupAnimations();
      }
      for (const anim of animations) {
        anim.currentTime = 0;
        anim.play();
      }
    });

    element.onDeactivate(() => {
      for (const anim of animations) {
        anim.pause();
      }
    });

    element.onUnmount(() => {
      for (const anim of animations) {
        anim.cancel();
      }
      animations.length = 0;
    });
  };
}
