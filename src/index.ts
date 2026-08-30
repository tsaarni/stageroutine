/**
 * Main entry point exporting the core stage runtime, DOM components, and presenter utilities.
 */

// Core Runtime
export {
  createStage,
  getActiveStage,
  Stage,
  interpolateValue,
  lerpNumber,
  lerpColor,
  px,
  createReactiveProxy,
} from "./core/index";

// Motion & Transitions
export {
  to,
  stagger,
  StaggerBuilder,
  type StaggerOptions,
  crossfade,
  CrossfadeBuilder,
  type CrossfadeOptions,
  cubicBezier,
  builtinEasings,
  isTransitionDescriptor,
} from "./motion/index";
export type {
  EaseCurve,
  BuiltinEase,
  TransitionDescriptor,
  TransitionRecord,
  StepSnapshot,
  StepData,
  StageOptions,
  ThemeConfig,
  ReactiveProp,
  ReactiveElementBase,
  Background,
  StageContext,
  StageEventMap,
  SceneChangeEvent,
  ResizeEvent,
} from "./core/types";

// Backgrounds (WebGL, Three.js, Shaders, Canvas & CSS)
export {
  BackgroundElement,
  type BackgroundOptions,
  CSSBackground,
  CSSBackgroundElement,
  type CSSBackgroundOptions,
  Starfield,
  StarfieldElement,
  type StarfieldOptions,
  AsciiFluid,
  GradientFluid,
  FluidBackgroundElement,
  type GradientFluidOptions,
  type AsciiFluidOptions,
  type BaseFluidOptions,
} from "./dom/backgrounds/index";

// Universal Decorators (Elements, Cards, Terminal & Backgrounds)
export {
  gradient,
  glow,
  vignette,
  grain,
  scrim,
  typewriter,
  rail,
  bracket,
  type GradientOptions,
  type GlowOptions,
  type VignetteOptions,
  type GrainOptions,
  type ScrimOptions,
  type TypewriterOptions,
  type TypewriterStep,
  type RailOptions,
  type BracketOptions,
  type BracketStyle,
} from "./decorators/index";

// Layout Engine
export {
  arrange,
  type LayoutOptions,
  type SplitLayoutOptions,
  type RelativePlacement,
  type RelativeAlign,
  type CircleLayoutOptions,
  type GridSlot,
  type LayoutElement,
  type RuleOptions,
} from "./dom/layout";

// Geometry Solvers
export {
  getPerimeterPoint,
  getTransformedPerimeterPoint,
  computeOrthogonalPath,
  computeBezierPath,
  type Point,
  type Box,
} from "./dom/geometry";

// DOM Components & Diagram Primitives
export {
  Title,
  Text,
  Shape,
  Card,
  Circle,
  Pill,
  Diamond,
  ShapeElement,
  Kicker,
  CodeBlock,
  TerminalWindow,
  BulletList,
  Table,
  Connector,
  ConnectorElement,
  Lifeline,
  LifelineElement,
  ActivationBar,
  ActivationBarElement,
  Activation,
  SequenceDiagram,
  SequenceDiagramElement,
  sequenceDiagram,
  Sequence,
  DOMElement,
  attachRangeSelection,
  jsx,
  jsxs,
  jsxDEV,
  Fragment,
  createElement,
  type TitleOptions,
  type TitleVariant,
  type TextOptions,
  type ShapeOptions,
  type ShapeKind,
  type ShapeVariant,
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
  type ConnectorHeadType,
  type PulseOptions,
  type LifelineOptions,
  type ActivationBarOptions,
  type ActivationOptions,
  type ActivationElement,
  type SequenceDiagramOptions,
  type SequenceOptions,
  type RangeSelectionOptions,
  type RangeSelectionController,
  type ElementOptions,
  type ElementDecorator,
  type JSX,
} from "./dom/index";

// Presenter View, Speaker Notes & GPU Recorder
export {
  notes,
  createPresenterClient,
  PresenterClient,
  PresenterRecorder,
  type PresenterMessage,
} from "./presenter/index";

// Presenter Pointer Plugins
export {
  laserPointer,
  type LaserPointerOptions,
  type PointerPlugin,
  type PointerContext,
} from "./pointers/index";
