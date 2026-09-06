/**
 * Full-screen background elements including WebGL fluid simulations, starfields, and CSS patterns.
 */

export { BackgroundElement, type BackgroundOptions } from "./base";
export {
  CSSBackground,
  type CSSBackgroundOptions,
  type CSSBackgroundElement,
} from "./css";
export { Starfield, type StarfieldOptions, type StarfieldElement } from "./starfield";
export {
  AsciiFluid,
  GradientFluid,
  type BaseFluidOptions,
  type AsciiFluidOptions,
  type GradientFluidOptions,
  type FluidBackgroundElement,
} from "./fluid";
export type { DOMElement, ElementOptions } from "../element";
export type {
  Point,
  TransitionDescriptor,
  ThemeConfig,
  ReactiveElementBase,
  EaseCurve,
  ElementAnchor,
  AnchorKeyword,
  ReactiveProp,
} from "../../core/types";
