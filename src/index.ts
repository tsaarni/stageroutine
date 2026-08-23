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

// Backgrounds (WebGL, Three.js, Shaders & Canvas)
export {
  Starfield,
  type StarfieldOptions,
  AsciiFluid,
  type AsciiFluidOptions,
  GradientFluid,
  type GradientFluidOptions,
  type BaseFluidOptions,
} from "./backgrounds/index";

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
  DOMElement,
  gradient,
  glow,
  typewriter,
  stagger,
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
  type TerminalWindowProps,
  type BulletListOptions,
  type ElementOptions,
  type ElementDecorator,
  type GradientOptions,
  type GlowOptions,
  type TypewriterOptions,
  type TypewriterStep,
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
