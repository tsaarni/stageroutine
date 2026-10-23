import type { ReactiveProp } from "../core/types";
import type { ElementDecorator } from "../dom/element";
import { addFilterContribution, renderElementFilters } from "../dom/filters";
import type { ElementTransition } from "../motion/element-transition";
import { createEffectController } from "./controller";

/** Glow appearance and initial strength. @category Decorators @inline */
export interface GlowOptions {
  /** Strength multiplier; 0 disables the glow. Default: 1. */
  intensity?: number;
  /** Ambient pulse while visible and intensity is positive. Default: true. */
  pulse?: boolean;
  /** Pulse cycle duration in seconds. Default: 4. */
  duration?: number;
}

/** Animated glow targets. @category Decorators */
export interface GlowTransitionProps {
  intensity?: ReactiveProp<number>;
}

/** Glow controller attached to one element. @category Decorators */
export interface GlowEffect extends ElementDecorator {
  /** Current strength multiplier; 0 disables the glow. Default: 1. */
  readonly values: Readonly<{ intensity: number }>;
  /** Animates strength on the stage clock. */
  to(props: GlowTransitionProps): ElementTransition;
}

/** Creates a theme-coloured glow with snapshot-safe intensity. @category Decorators */
export function glow(options: GlowOptions = {}): GlowEffect {
  const { intensity = 1, pulse = true, duration = 4 } = options;
  if (!Number.isFinite(duration) || duration <= 0)
    throw new RangeError("Glow duration must be positive seconds.");
  return createEffectController(
    "glow",
    { intensity },
    (_key, value) => {
      if (typeof value !== "number" || !Number.isFinite(value) || value < 0)
        throw new RangeError("Glow intensity must be a finite nonnegative multiplier.");
    },
    (element, read) => {
      const node = element.domElement;
      node.classList.add("sr-glow");
      node.style.setProperty("--sr-glow-duration", `${duration}s`);
      addFilterContribution(node, (props) => {
        const { intensity } = read(props);
        node.style.setProperty("--sr-glow-intensity", String(intensity));
        node.classList.toggle("sr-glow-pulse", pulse && intensity > 0);
        return intensity > 0 ? "var(--sr-glow-filter)" : "";
      });
      renderElementFilters(node, element as unknown as Record<string, unknown>);
    },
  );
}
