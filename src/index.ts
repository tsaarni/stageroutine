/**
 * Main entry point exporting the core stage runtime, DOM components, and presenter utilities.
 */

// Core Runtime
export {
  createStage,
  getActiveStage,
  logger,
  Stage,
  storage,
  StageStorage,
  type StorageOptions,
  type StorageListener,
} from "./core/index";
export type { LogLevel } from "./core/logger";
export type {
  StageOptions,
  ThemeConfig,
  Background,
  ReactiveElementBase,
  OverlayPlugin,
  OverlayContext,
} from "./core/types";
export {
  themes,
  defaultDark,
  defaultLight,
  dracula,
  tokyoNight,
  cyberpunk,
  applyThemeTokens,
  TOKEN_MAP,
} from "./theme/index";

// Motion & Transitions
export {
  to,
  stagger,
  type StaggerOptions,
  crossfade,
  type CrossfadeOptions,
  cubicBezier,
  builtinEasings,
} from "./motion/index";
export type {
  EaseCurve,
  BuiltinEase,
} from "./core/types";

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

// Backgrounds (WebGL, Canvas, Three.js & CSS)
export {
  CSSBackground,
  type CSSBackgroundOptions,
  Starfield,
  type StarfieldOptions,
  AsciiFluid,
  type AsciiFluidOptions,
  GradientFluid,
  type GradientFluidOptions,
  type BackgroundOptions,
} from "./dom/backgrounds/index";

// Layout Engine
export {
  arrange,
  type LayoutOptions,
  type SplitLayoutOptions,
  type CircleLayoutOptions,
  type RelativePlacement,
  type RelativeAlign,
} from "./dom/layout";

// DOM Components & Diagram Primitives
export {
  Title,
  Text,
  Image,
  ImageElement,
  Video,
  VideoElement,
  Webcam,
  WebcamElement,
  Shape,
  Card,
  Circle,
  Pill,
  Diamond,
  Icon,
  IconElement,
  defineIcons,
  resolveIconSvg,
  Kicker,
  CodeBlock,
  TerminalWindow,
  BulletList,
  Table,
  Connector,
  ConnectorElement,
  pulseSequence,
  Lifeline,
  Activation,
  SequenceDiagram,
  sequenceDiagram,
  Sequence,
  DOMElement,
  type TitleOptions,
  type TitleVariant,
  type TextOptions,
  type ImageOptions,
  type ImageFit,
  type VideoOptions,
  type WebcamOptions,
  type CameraDevice,
  type ShapeOptions,
  type ShapeKind,
  type ShapeVariant,
  type IconOptions,
  type IconDefinition,
  type KickerOptions,
  type CodeBlockOptions,
  type TerminalWindowProps,
  type BulletListOptions,
  type TableOptions,
  type ConnectorOptions,
  type ConnectorTarget,
  type ConnectorHeadType,
  type PulseOptions,
  type PulseSequenceStep,
  type PulseSequenceOptions,
  type PulseSequenceController,
  type LifelineOptions,
  type ActivationOptions,
  type SequenceDiagramOptions,
  type SequenceOptions,
  type ElementOptions,
  type ElementDecorator,
} from "./dom/index";

// Presenter View, Speaker Notes & Tools
export {
  notes,
  createPresenterClient,
  PresenterClient,
  PresenterRecorder,
} from "./presenter/index";

// Overlays
export {
  LaserPointer,
  type LaserPointerOptions,
  type LaserPointerController,
  NavigationOverlay,
  type NavigationOverlayOptions,
} from "./overlays/index";
