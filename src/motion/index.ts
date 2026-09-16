/**
 * Exports all motion primitives: atomic transitions (to), element transitions,
 * and explicit multi-element choreography helpers.
 */

export type { ElementTransition, ElementTransitionProps } from "./element-transition";
export type { ReplaceOptions, ReplaceTransition } from "./replace";
export { replace } from "./replace";
export type { StaggerOptions, StaggerTransition } from "./stagger";
export { stagger } from "./stagger";
export { to } from "./transitions";
