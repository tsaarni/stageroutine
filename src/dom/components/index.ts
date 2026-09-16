/**
 * Public surface of the standard component library (Title, Text, Shape, CodeBlock, etc.).
 *
 * Implementation element classes are intentionally
 * not exported; users interact with the reactive proxies returned by the factories and type
 * custom logic against `DOMElement` or the exported option interfaces.
 */

export {
  type BulletItemInput,
  BulletList,
  type BulletListElement,
  type BulletListOptions,
} from "./BulletList";
export { CodeBlock, type CodeBlockElement, type CodeBlockOptions } from "./CodeBlock";
export {
  Connector,
  type ConnectorElement,
  type ConnectorHeadType,
  type ConnectorOptions,
  type ConnectorTarget,
  type LabelOffset,
  type LabelPlacement,
  type PeriodicPulseOptions,
  type PulseOptions,
  type PulseSequenceController,
  type PulseSequenceOptions,
  type PulseSequenceStep,
  pulseSequence,
} from "./Connector";
export {
  Frame,
  type FrameElement,
  type FrameOptions,
} from "./Frame";
export {
  defineIcons,
  Icon,
  type IconDefinition,
  type IconElement,
  type IconOptions,
} from "./Icon";
export { Image, type ImageElement, type ImageFit, type ImageOptions } from "./Image";
export { Kicker, type KickerOptions } from "./Kicker";
/**
 * The sequence diagram system is used through its coordinator: `SequenceDiagram()` returns
 * the `seq` controller with `.message()`, `.activate()`, `.addParticipant()`, `.lifelines`,
 * and `.elements`. Lifelines and activation bars are sub-elements managed by the
 * coordinator.
 */
export {
  type ActivationBarElement,
  type ActivationOptions,
  type LifelineElement,
  type LifelineOptions,
  SequenceDiagram,
  type SequenceDiagramController,
  type SequenceDiagramOptions,
} from "./SequenceDiagram";
export {
  Card,
  Shape,
  type ShapeElement,
  type ShapeOptions,
  type ShapeVariant,
} from "./Shape";
export { Table, type TableElement, type TableOptions } from "./Table";
export {
  TerminalBlock,
  type TerminalBlockElement,
  type TerminalBlockOptions,
} from "./TerminalBlock";
export { Text, type TextOptions } from "./Text";
export { Title, type TitleOptions, type TitleVariant } from "./Title";
export { Video, type VideoElement, type VideoOptions } from "./Video";
export { type CameraDevice, Webcam, type WebcamElement, type WebcamOptions } from "./Webcam";
