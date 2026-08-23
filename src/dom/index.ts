/**
 * Exports DOM components, the zero-VDOM JSX runtime, and layout helpers.
 */

export { DOMElement, type ElementOptions, type ElementDecorator } from "./element";
export {
  gradient,
  type GradientOptions,
  glow,
  type GlowOptions,
  vignette,
  type VignetteOptions,
  grain,
  type GrainOptions,
  scrim,
  type ScrimOptions,
  typewriter,
  type TypewriterOptions,
  type TypewriterStep,
} from "../decorators/index";
export {
  Title,
  Text,
  Card,
  Badge,
  Kicker,
  CodeBlock,
  TerminalWindow,
  BulletList,
  type TitleOptions,
  type TextOptions,
  type CardOptions,
  type BadgeOptions,
  type KickerOptions,
  type CodeBlockOptions,
  type TerminalWindowProps,
  type BulletListOptions,
} from "./components/index";
export {
  BackgroundElement,
  type BackgroundOptions,
  Starfield,
  StarfieldElement,
  type StarfieldOptions,
  AsciiFluid,
  GradientFluid,
  FluidBackgroundElement,
  type BaseFluidOptions,
  type AsciiFluidOptions,
  type GradientFluidOptions,
} from "./backgrounds/index";
export { stagger } from "./stagger";
export { jsx, jsxs, jsxDEV, Fragment, createElement, type JSX } from "./jsx-runtime";
