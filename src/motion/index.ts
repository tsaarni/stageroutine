/**
 * Exports all motion primitives: atomic transitions (to) and group choreography (stagger).
 */

export { to, cubicBezier } from "./transitions";

export {
  stagger,
  type StaggerBuilder,
  type StaggerOptions,
} from "./stagger";

export {
  crossfade,
  type CrossfadeBuilder,
  type CrossfadeOptions,
} from "./crossfade";
