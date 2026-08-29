/**
 * Exports DOM components, the zero-VDOM JSX runtime, and layout helpers.
 */

export {
  DOMElement,
  type ElementOptions,
  type ElementDecorator,
} from "./element";
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
  Shape,
  ShapeElement,
  Badge,
  Kicker,
  CodeBlock,
  TerminalWindow,
  BulletList,
  Table,
  Connector,
  ConnectorElement,
  Lifeline,
  LifelineElement,
  Activation,
  ActivationElement,
  type TitleOptions,
  type TitleVariant,
  type TextOptions,
  type ShapeOptions,
  type ShapeKind,
  type ShapeVariant,
  type NoteSide,
  type BadgeOptions,
  type KickerOptions,
  type CodeBlockOptions,
  type CodeBlockElement,
  type TerminalWindowProps,
  type TerminalWindowElement,
  type BulletListOptions,
  type BulletListElement,
  type TableOptions,
  type TableElement,
  type ConnectorOptions,
  type ConnectorTarget,
  type PulseOptions,
  type LifelineOptions,
  type ActivationOptions,
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
export { arrange, type LayoutOptions } from "./layout";
export {
  getPerimeterPoint,
  getTransformedPerimeterPoint,
  computeOrthogonalPath,
  computeBezierPath,
  type Point,
  type Box,
} from "./geometry";
export { stagger } from "./stagger";
export {
  attachRangeSelection,
  type RangeSelectionOptions,
  type RangeSelectionController,
} from "./interaction";
export {
  jsx,
  jsxs,
  jsxDEV,
  Fragment,
  createElement,
  type JSX,
} from "./jsx-runtime";
