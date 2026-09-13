/**
 * Exports all motion primitives: atomic transitions (to) and group choreography (stagger).
 */

export {
  type CrossfadeBuilder,
  type CrossfadeOptions,
  crossfade,
} from "./crossfade";

export {
  type StaggerBuilder,
  type StaggerOptions,
  stagger,
} from "./stagger";
export { cubicBezier, to } from "./transitions";
