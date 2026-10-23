import type { ReactiveProp } from "../core/types";
import type { ElementDecorator } from "../dom/element";
import { addTransformContribution, localTransform } from "../dom/transform";
import type { ElementTransition } from "../motion/element-transition";
import { createEffectController } from "./controller";

/** Local transformation of any stage element. @category Decorators */
export interface TransformOptions {
  /** X-axis rotation in degrees. Default: 0. */
  rotationX?: number;
  /** Y-axis rotation in degrees. Default: 0. */
  rotationY?: number;
  /** Z-axis rotation in degrees. Default: 0. */
  rotation?: number;
  /** Local scale multiplier. Default: 1. */
  scale?: number;
  /** Local depth in stage units; positive enlarges the element. Default: 0. */
  z?: number;
  /** Perspective distance in stage units, or orthographic projection. Default: 220. */
  perspective?: number | "none";
}

/** Animation targets for a local transform. @category Decorators */
export type TransformTransitionProps = {
  [K in keyof TransformOptions]?: ReactiveProp<Required<TransformOptions>[K]>;
};

/** A transform controller attached to one element. @category Decorators */
export interface TransformEffect extends ElementDecorator {
  /** Current values; rotations use degrees, depth and perspective use stage units. */
  readonly values: Readonly<Required<TransformOptions>>;
  /** Animates the attached element's local transform on the stage clock. */
  to(props: TransformTransitionProps): ElementTransition;
}

/** Creates an independent local transform. No animation loop. @category Decorators */
export function transform(options: TransformOptions = {}): TransformEffect {
  const initial: Required<TransformOptions> = {
    rotationX: options.rotationX ?? 0,
    rotationY: options.rotationY ?? 0,
    rotation: options.rotation ?? 0,
    scale: options.scale ?? 1,
    z: options.z ?? 0,
    perspective: options.perspective ?? 220,
  };
  localTransform(initial);
  return createEffectController(
    "transform",
    initial,
    (key, value) => {
      if (key === "perspective" && value === "none") return;
      if (!Number.isFinite(value) || (key === "perspective" && (value as number) <= 0))
        throw new TypeError(
          "Transform values must be finite; perspective must be positive or 'none'.",
        );
    },
    (element, read) => {
      addTransformContribution(element.domElement, (props) => localTransform(read(props)).css);
    },
  );
}
