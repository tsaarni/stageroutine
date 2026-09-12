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

// Global stylesheet (design tokens, cascade layers, component styling, and body resets)
import "./dom/style.css";
// Browsers load web fonts lazily by default.
// Layout helpers measure text dimensions immediately when presentation code runs.
// If fonts are not ready, measurements use fallback font sizes, which causes text to overlap elements later.
// We eagerly load and wait for all declared fonts here so layout measurements are always accurate.
if (typeof document !== "undefined" && document.fonts) {
  const descriptors = new Set<string>();
  for (const face of document.fonts) {
    if (face.family) {
      descriptors.add(`${face.style} ${face.weight} 1rem "${face.family}"`);
    }
  }
  const loads: Promise<unknown>[] = [];
  for (const desc of descriptors) {
    loads.push(document.fonts.load(desc));
  }
  await Promise.allSettled(loads);
  await document.fonts.ready;
}

// Core runtime
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
  FlowEffect,
  TransitionDescriptor,
  Point,
  Align,
  AnchorKeyword,
  ElementAnchor,
} from "./core/types";

// Motion
export { to, stagger, crossfade, cubicBezier } from "./motion/index";
export type {
  StaggerOptions,
  StaggerBuilder,
  CrossfadeOptions,
  CrossfadeBuilder,
} from "./motion/index";

// Layout
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
} from "./dom/layout";

// Base class & option types for custom components
export { DOMElement } from "./dom/element";
export type { ElementOptions, ElementDecorator } from "./dom/element";

// Components
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
  TerminalBlock,
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
  ImageElement,
  VideoOptions,
  VideoElement,
  WebcamOptions,
  WebcamElement,
  CameraDevice,
  ShapeOptions,
  ShapeKind,
  ShapeVariant,
  ShapeElement,
  IconOptions,
  IconDefinition,
  IconElement,
  KickerOptions,
  CodeBlockOptions,
  CodeBlockElement,
  TerminalBlockOptions,
  TerminalBlockElement,
  BulletListOptions,
  BulletListElement,
  BulletItemInput,
  TableOptions,
  TableElement,
  ConnectorOptions,
  ConnectorElement,
  ConnectorTarget,
  ConnectorHeadType,
  LabelOffset,
  LabelPlacement,
  PeriodicPulseOptions,
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

// Decorators
export {
  gradient,
  glow,
  vignette,
  grain,
  scrim,
  typewriter,
  rule,
  bracket,
  dream,
} from "./decorators/index";
export type {
  GradientOptions,
  GlowOptions,
  VignetteOptions,
  GrainOptions,
  ScrimOptions,
  TypewriterOptions,
  TypewriterStep,
  RuleOptions,
  BracketOptions,
  BracketStyle,
  DreamOptions,
} from "./decorators/index";

// Backgrounds
// Lightweight base & CSS backgrounds are exported at root.
// Full-screen WebGL / Three.js backgrounds (Starfield, AsciiFluid, GradientFluid)
// are imported from "stageroutine/backgrounds" to prevent bundling Three.js in 2D decks.
export { BackgroundElement, CSSBackground } from "./dom/backgrounds/index";
export type {
  BackgroundOptions,
  CSSBackgroundOptions,
  CSSBackgroundElement,
} from "./dom/backgrounds/index";

// Overlays
export { LaserPointer, NavigationOverlay } from "./overlays/index";
export type {
  LaserPointerOptions,
  LaserPointerController,
  NavigationOverlayOptions,
} from "./overlays/index";

// Presenter
export { PresenterClient, PresenterRecorder } from "./presenter/index";

// Theming
export { themes, defaultDark, defaultLight, dracula, tokyoNight, cyberpunk } from "./theme/index";
