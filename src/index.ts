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
} from "./core/types";

// DOM Components
export {
  Title,
  Text,
  Card,
  Badge,
  Kicker,
  Metric,
  CodeBlock,
  TerminalWindow,
  BulletList,
  DOMElement,
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
  type MetricProps,
  type CodeBlockOptions,
  type TerminalWindowProps,
  type BulletListOptions,
  type ElementOptions,
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
