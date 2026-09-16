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
 * API. Implementation element classes,
 * fluent builder classes, and engine internals are intentionally not public.
 */

// Global stylesheet (design tokens, cascade layers, component styling, and body resets)
import "./dom/style.css";

// Browsers load web fonts lazily by default.
// Layout helpers measure text dimensions immediately when presentation code runs.
// If fonts are not ready, measurements use fallback font sizes, which causes text to overlap elements later.
// We eagerly load and wait for all declared fonts here so layout measurements are always accurate.
if (document.fonts) {
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
export { logger, Stage } from "./core/index";
export type { LogLevel } from "./core/logger";
export type {
  Align,
  AnchorKeyword,
  AnimationMilestone,
  Background,
  BuiltinEase,
  CoordProp,
  EaseCurve,
  ElementAnchor,
  FlowEffect,
  NavGotoSceneEvent,
  NavGotoStepEvent,
  NavSceneChangedEvent,
  NavStepChangedEvent,
  OverlayContext,
  OverlayPlugin,
  Point,
  PointerSetStateEvent,
  PointerStateChangedEvent,
  Position,
  PositionUpdater,
  ReactiveElementBase,
  ReactiveProp,
  StageContext,
  StageEventMap,
  StageOptions,
  StageResizedEvent,
  StageStateChangedEvent,
  ThemeConfig,
  TransitionDescriptor,
  UnwrapTransition,
} from "./core/types";
export type {
  BracketOptions,
  BracketStyle,
  DreamOptions,
  GlowOptions,
  GradientOptions,
  GrainOptions,
  RuleOptions,
  ScrimOptions,
  TypewriterOptions,
  TypewriterStep,
  VignetteOptions,
} from "./decorators/index";
// Decorators
export {
  bracket,
  dream,
  glow,
  gradient,
  grain,
  rule,
  scrim,
  typewriter,
  vignette,
} from "./decorators/index";
export type {
  BackgroundOptions,
  CSSBackgroundElement,
  CSSBackgroundOptions,
} from "./dom/backgrounds/index";
// Backgrounds
// Lightweight base & CSS backgrounds are exported at root.
// Full-screen WebGL / Three.js backgrounds (Starfield, AsciiFluid, GradientFluid)
// are imported from "stageroutine/backgrounds" to prevent bundling Three.js in 2D decks.
export { BackgroundElement, CSSBackground } from "./dom/backgrounds/index";
export type {
  ActivationBarElement,
  ActivationOptions,
  BulletItemInput,
  BulletListElement,
  BulletListOptions,
  CameraDevice,
  CodeBlockElement,
  CodeBlockOptions,
  ConnectorElement,
  ConnectorHeadType,
  ConnectorOptions,
  ConnectorTarget,
  FrameElement,
  FrameOptions,
  IconDefinition,
  IconElement,
  IconOptions,
  ImageElement,
  ImageFit,
  ImageOptions,
  KickerOptions,
  LabelOffset,
  LabelPlacement,
  LifelineElement,
  LifelineOptions,
  PeriodicPulseOptions,
  PulseOptions,
  PulseSequenceController,
  PulseSequenceOptions,
  PulseSequenceStep,
  SequenceDiagramController,
  SequenceDiagramOptions,
  ShapeElement,
  ShapeOptions,
  ShapeVariant,
  TableElement,
  TableOptions,
  TerminalBlockElement,
  TerminalBlockOptions,
  TextOptions,
  TitleOptions,
  TitleVariant,
  VideoElement,
  VideoOptions,
  WebcamElement,
  WebcamOptions,
} from "./dom/components/index";
// Components
export {
  BulletList,
  Card,
  CodeBlock,
  Connector,
  defineIcons,
  Frame,
  Icon,
  Image,
  Kicker,
  pulseSequence,
  SequenceDiagram,
  Shape,
  Table,
  TerminalBlock,
  Text,
  Title,
  Video,
  Webcam,
} from "./dom/components/index";
export type { ElementDecorator, ElementOptions } from "./dom/element";
// Base class & option types for custom components
export { DOMElement } from "./dom/element";
export type { GroupElement } from "./dom/group";
export { group } from "./dom/group";
export type {
  CircleLayoutOptions,
  GridSlot,
  LayoutAnimation,
  LayoutElement,
  LayoutOptions,
  RelativeAlign,
  StackSlot,
} from "./dom/layout";
// Layout
export { layout } from "./dom/layout";
export type {
  BoxPathOptions,
  CirclePathOptions,
  DiamondPathOptions,
  HexagonPathOptions,
  PathContext,
  PathFunction,
  PolygonPathOptions,
  SquirclePathOptions,
  StarPathOptions,
  TrianglePathOptions,
} from "./dom/paths";
// Geometry
export { paths } from "./dom/paths";
export type {
  ElementTransition,
  ElementTransitionProps,
  ReplaceOptions,
  ReplaceTransition,
  StaggerOptions,
  StaggerTransition,
} from "./motion/index";
// Motion
export { replace, stagger, to } from "./motion/index";
export type {
  LaserPointerController,
  LaserPointerOptions,
  NavigationOverlayOptions,
} from "./overlays/index";
// Overlays
export { LaserPointer, NavigationOverlay } from "./overlays/index";

// Presenter
export { PresenterClient, PresenterRecorder } from "./presenter/index";

// Theming
export { cyberpunk, defaultDark, defaultLight, dracula, themes, tokyoNight } from "./theme/index";
