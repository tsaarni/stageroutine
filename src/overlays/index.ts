/**
 * Built-in overlay plugins for the StageRoutine presentation engine.
 */

export type { OverlayContext, OverlayPlugin } from "../core/types";
export {
  Annotation,
  type AnnotationController,
  type AnnotationOptions,
} from "./annotation";
export { LaserPointer, type LaserPointerController, type LaserPointerOptions } from "./laser";
export { NavigationOverlay, type NavigationOverlayOptions } from "./navigation";
