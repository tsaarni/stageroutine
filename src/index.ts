/**
 * Main entry point exporting the core stage runtime, DOM components, and presenter utilities.
 */

// Core Runtime
export {
  createStage,
  getActiveStage,
  Stage,
  to,
  cubicBezier,
  builtinEasings,
  isTransitionDescriptor,
  interpolateValue,
  lerpNumber,
  lerpColor,
  px,
  createReactiveProxy,
} from "./core/index";
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
  type GradientOptions,
  type GlowOptions,
  type VignetteOptions,
  type GrainOptions,
  type ScrimOptions,
  type TypewriterOptions,
  type TypewriterStep,
} from "./decorators/index";

// DOM Components
export {
  Title,
  Text,
  Card,
  Badge,
  Kicker,
  CodeBlock,
  TerminalWindow,
  BulletList,
  Table,
  DOMElement,
  stagger,
  attachRangeSelection,
  jsx,
  jsxs,
  jsxDEV,
  Fragment,
  createElement,
  type TitleOptions,
  type TextOptions,
  type CardOptions,
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
