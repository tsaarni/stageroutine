/**
 * Full-screen background elements including WebGL fluid simulations, starfields, and CSS patterns.
 */

export type {
  AnchorKeyword,
  EaseCurve,
  ElementAnchor,
  Point,
  ReactiveElementBase,
  ReactiveProp,
  ThemeConfig,
  TransitionDescriptor,
} from "../../core/types";
export type { DOMElement, ElementOptions } from "../element";
export { BackgroundElement, type BackgroundOptions } from "./base";
export {
  CSSBackground,
  type CSSBackgroundElement,
  type CSSBackgroundOptions,
} from "./css";
export {
  AsciiFluid,
  type AsciiFluidOptions,
  type BaseFluidOptions,
  type FluidBackgroundElement,
  GradientFluid,
  type GradientFluidOptions,
} from "./fluid";
export { Starfield, type StarfieldElement, type StarfieldOptions } from "./starfield";
