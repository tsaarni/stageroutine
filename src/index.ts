/**
 * Public API surface for StageRoutine.
 *
 * Everything user-facing is exported flat from the root, so a single
 * `import { ... } from "stageroutine"` covers the whole library with IDE
 * autocompletion. Larger feature areas are additionally available as subpath
 * entry points:
 *
 * - `stageroutine/backgrounds` — full-screen background renderers (WebGL/canvas)
 * - `stageroutine/overlays`    — overlay plugins (laser pointer, navigation)
 * - `stageroutine/presenter`   — presenter console client & screen recorder
 * - `stageroutine/jsx-runtime` — JSX runtime (configured as `jsxImportSource` by the Vite plugin)
 * - `stageroutine/styles.css`  — base stylesheet
 * - `stageroutine/vite`        — the StageRoutine Vite plugin
 *
 * A symbol is exported here exactly when it is part of the documented user-facing
 * API. Implementation element classes (`TitleElement`, `ConnectorElement`, ...),
 * fluent builder classes, and engine internals are intentionally not public.
 */

// --- Core runtime ---
export { Stage, logger } from "./core/index";
export type { LogLevel } from "./core/logger";
export type {
  StageOptions,
  ThemeConfig,
  Background,
  StageContext,
  StageEventMap,
  NavStepChangedEvent,
  NavSceneChangedEvent,
  NavGotoStepEvent,
  NavGotoSceneEvent,
  StageResizedEvent,
  StageStateChangedEvent,
  PointerToggledEvent,
  ReactiveElementBase,
  ReactiveProp,
  UnwrapTransition,
  OverlayPlugin,
  OverlayContext,
  EaseCurve,
  BuiltinEase,
  AnimationMilestone,
  TransitionDescriptor,
  Point,
  AnchorKeyword,
  ElementAnchor,
} from "./core/types";

// --- Motion ---
export { to, stagger, crossfade, cubicBezier } from "./motion/index";
export type {
  StaggerOptions,
  StaggerBuilder,
  CrossfadeOptions,
  CrossfadeBuilder,
} from "./motion/index";

// --- Layout ---
export { layout } from "./dom/layout";
export type {
  LayoutOptions,
  LayoutAnimation,
  StackSlot,
  CircleLayoutOptions,
  RelativePlacement,
  RelativeAlign,
  GridSlot,
  LayoutElement,
  RuleOptions,
} from "./dom/layout";

// --- Base class & option types for custom components ---
export { DOMElement } from "./dom/element";
export type { ElementOptions, ElementDecorator } from "./dom/element";

// --- Components ---
export {
  Title,
  Text,
  Image,
  Video,
  Webcam,
  Shape,
  Card,
  Circle,
  Pill,
  Diamond,
  Icon,
  defineIcons,
  resolveIconSvg,
  Kicker,
  CodeBlock,
  TerminalWindow,
  BulletList,
  Table,
  Connector,
  pulseSequence,
  SequenceDiagram,
} from "./dom/components/index";
export type {
  TitleOptions,
  TitleVariant,
  TextOptions,
  ImageOptions,
  ImageFit,
  VideoOptions,
  VideoElement,
  WebcamOptions,
  CameraDevice,
  ShapeOptions,
  ShapeKind,
  ShapeVariant,
  IconOptions,
  IconDefinition,
  KickerOptions,
  CodeBlockOptions,
  CodeBlockElement,
  TerminalWindowProps,
  TerminalWindowElement,
  BulletListOptions,
  BulletListElement,
  TableOptions,
  TableElement,
  ConnectorOptions,
  ConnectorElement,
  ConnectorTarget,
  ConnectorHeadType,
  PulseOptions,
  PulseSequenceStep,
  PulseSequenceOptions,
  PulseSequenceController,
  SequenceDiagramElement,
  LifelineElement,
  ActivationBarElement,
  LifelineOptions,
  ActivationOptions,
  SequenceDiagramOptions,
} from "./dom/components/index";

// --- Decorators ---
export {
  gradient,
  glow,
  vignette,
  grain,
  scrim,
  typewriter,
  rail,
  bracket,
} from "./decorators/index";
export type {
  GradientOptions,
  GlowOptions,
  VignetteOptions,
  GrainOptions,
  ScrimOptions,
  TypewriterOptions,
  TypewriterStep,
  RailOptions,
  BracketOptions,
  BracketStyle,
} from "./decorators/index";

// --- Backgrounds ---
// Lightweight base & CSS backgrounds are exported at root.
// Full-screen WebGL / Three.js backgrounds (Starfield, AsciiFluid, GradientFluid)
// are imported from "stageroutine/backgrounds" to prevent bundling Three.js in 2D decks.
export { BackgroundElement, CSSBackground } from "./dom/backgrounds/index";
export type {
  BackgroundOptions,
  CSSBackgroundOptions,
} from "./dom/backgrounds/index";

// --- Overlays ---
export { LaserPointer, NavigationOverlay } from "./overlays/index";
export type {
  LaserPointerOptions,
  LaserPointerController,
  NavigationOverlayOptions,
} from "./overlays/index";

// --- Presenter ---
export { PresenterClient, PresenterRecorder } from "./presenter/index";

// --- Theming ---
export { themes, defaultDark, defaultLight, dracula, tokyoNight, cyberpunk } from "./theme/index";
