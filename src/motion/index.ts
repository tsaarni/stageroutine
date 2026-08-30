/**
 * Exports all motion primitives: atomic transitions (to) and group choreography (stagger).
 */

export {
  to,
  cubicBezier,
  builtinEasings,
  isTransitionDescriptor,
} from "./transitions";

export {
  stagger,
  StaggerBuilder,
  type StaggerOptions,
} from "./stagger";

export {
  crossfade,
  CrossfadeBuilder,
  type CrossfadeOptions,
} from "./crossfade";
