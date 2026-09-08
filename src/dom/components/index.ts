/**
 * Public surface of the standard component library (Title, Text, Shape, CodeBlock, etc.).
 *
 * Implementation element classes (`TitleElement`, `ConnectorElement`, ...) are intentionally
 * not exported; users interact with the reactive proxies returned by the factories and type
 * custom logic against `DOMElement` or the exported option interfaces.
 */

export { Title, type TitleOptions, type TitleVariant } from "./Title";
export { Text, type TextOptions } from "./Text";
export { Image, type ImageOptions, type ImageFit, type ImageElement } from "./Image";
export {
  Icon,
  defineIcons,
  resolveIconSvg,
  type IconOptions,
  type IconDefinition,
  type IconElement,
} from "./Icon";
export { Video, type VideoOptions, type VideoElement } from "./Video";
export { Webcam, type WebcamOptions, type WebcamElement, type CameraDevice } from "./Webcam";
export {
  Shape,
  Card,
  Circle,
  Pill,
  Diamond,
  type ShapeOptions,
  type ShapeKind,
  type ShapeVariant,
  type ShapeElement,
} from "./Shape";
export { Kicker, type KickerOptions } from "./Kicker";
export { CodeBlock, type CodeBlockOptions, type CodeBlockElement } from "./CodeBlock";
export {
  TerminalWindow,
  type TerminalWindowProps,
  type TerminalWindowElement,
} from "./TerminalWindow";
export {
  BulletList,
  type BulletListOptions,
  type BulletListElement,
  type BulletItemInput,
} from "./BulletList";
export { Table, type TableOptions, type TableElement } from "./Table";
export {
  Connector,
  pulseSequence,
  type ConnectorElement,
  type ConnectorOptions,
  type ConnectorTarget,
  type ConnectorHeadType,
  type LabelOffset,
  type LabelPlacement,
  type PeriodicPulseOptions,
  type PulseOptions,
  type PulseSequenceStep,
  type PulseSequenceOptions,
  type PulseSequenceController,
} from "./Connector";
/**
 * The sequence diagram system is used through its coordinator: `SequenceDiagram()` returns
 * the `seq` handle with `.message()`, `.activate()`, `.addParticipant()`, `.lifelines`,
 * and `.elements`. Lifelines and activation bars are sub-elements managed by the
 * coordinator.
 */
export {
  SequenceDiagram,
  type SequenceDiagramElement,
  type LifelineElement,
  type ActivationBarElement,
  type LifelineOptions,
  type ActivationOptions,
  type SequenceDiagramOptions,
} from "./SequenceDiagram";
