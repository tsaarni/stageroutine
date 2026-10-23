import type { ReactiveProp } from "../../core/types";
import type { ElementDecorator } from "../../dom/element";
import type { ElementTransition } from "../../motion/element-transition";
import { createSharedEffectController } from "../controller";
import { createShineRenderer } from "./renderer";

/** A shared reflection's appearance and initial position. @category Decorators @inline */
export interface ShineOptions {
  /** Sweep fraction from 0 to 1. Both endpoints are clear. Default: 0. */
  progress?: number;
  /** CSS shoulder colour. Default: the stage theme's secondary colour. */
  color?: string;
  /** CSS core colour. Default: a lighter version of color. */
  highlight?: string;
  /** Nonnegative strength multiplier. Default: 1. */
  intensity?: number;
  /** Travel direction in degrees; 0 goes right, positive goes clockwise. Default: -20. */
  angle?: number;
  /** Band width as a fraction of the receivers' projected span. Default: 0.22. */
  width?: number;
  /** Receiving surface. Auto uses outlines for ghost shapes and fills otherwise. Default: "auto". */
  surface?: "auto" | "outline" | "fill";
}

/** One shared light, attached to one or more elements on the same stage. @category Decorators */
export interface ShineEffect extends ElementDecorator {
  /** Current sweep fraction. Default: 0. */
  readonly values: Readonly<{ progress: number }>;
  /** Animates the light on the stage clock. */
  to(props: { progress?: ReactiveProp<number> }): ElementTransition;
}

/** Creates one reflection shared by all elements decorated with it. @category Decorators */
export function shine(options: ShineOptions = {}): ShineEffect {
  const {
    progress = 0,
    color,
    highlight,
    intensity = 1,
    angle = -20,
    width = 0.22,
    surface = "auto",
  } = options;
  if (
    !Number.isFinite(intensity) ||
    intensity < 0 ||
    !Number.isFinite(angle) ||
    !Number.isFinite(width) ||
    width <= 0 ||
    width > 1
  )
    throw new RangeError(
      "Shine requires finite intensity >= 0, angle in degrees, and width in (0, 1].",
    );
  if (!["auto", "outline", "fill"].includes(surface)) throw new TypeError("Unknown shine surface.");
  for (const value of [color, highlight])
    if (value !== undefined && !CSS.supports("color", value))
      throw new TypeError("Shine colours must be valid CSS colours.");
  const renderer = createShineRenderer({ color, highlight, intensity, angle, width });
  return createSharedEffectController(
    "shine",
    { progress },
    (_key, value) => {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 1)
        throw new RangeError("Shine progress must be a fraction from 0 to 1.");
    },
    (element) => {
      const node = element.domElement;
      // Only use the receiver's own shape, never SVG content nested inside a card.
      const canvas = node.matches(".sr-shape")
        ? node.querySelector<SVGSVGElement>(":scope > svg.sr-shape-stroke-svg")
        : null;
      const outline = canvas?.querySelector<SVGPathElement>(":scope > path.sr-shape-path-main");
      if (!canvas || !outline) throw new TypeError("Shine supports Shape and Card surfaces.");
      const defaultKind = node.dataset.variant === "ghost" ? "outline" : "fill";
      return renderer.attach(element, {
        canvas,
        outline,
        kind: surface === "auto" ? defaultKind : surface,
      });
    },
    (values, context) => renderer.render(values.progress, context),
  );
}
