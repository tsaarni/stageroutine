/**
 * Standard library of slide UI components (Title, Text, Shape, Badge, CodeBlock, etc.).
 */

export { Title, type TitleOptions, type TitleVariant } from "./Title";
export { Text, type TextOptions } from "./Text";
export {
  Image,
  ImageElement,
  type ImageOptions,
  type ImageFit,
} from "./Image";
export {
  Icon,
  IconElement,
  defineIcons,
  resolveIconSvg,
  type IconOptions,
  type IconDefinition,
} from "./Icon";
export {
  Video,
  VideoElement,
  type VideoOptions,
} from "./Video";
export {
  Webcam,
  WebcamElement,
  type WebcamOptions,
  type CameraDevice,
} from "./Webcam";
export {
  Shape,
  Card,
  Circle,
  Pill,
  Diamond,
  ShapeElement,
  type ShapeOptions,
  type ShapeKind,
  type ShapeVariant,
} from "./Shape";
export { Kicker, type KickerOptions } from "./Kicker";
export {
  CodeBlock,
  type CodeBlockOptions,
  type CodeBlockElement,
} from "./CodeBlock";
export {
  TerminalWindow,
  type TerminalWindowProps,
  type TerminalWindowElement,
} from "./TerminalWindow";
export {
  BulletList,
  type BulletListOptions,
  type BulletListElement,
} from "./BulletList";
export { Table, type TableOptions, type TableElement } from "./Table";
export {
  Connector,
  ConnectorElement,
  pulseSequence,
  type ConnectorOptions,
  type ConnectorTarget,
  type ConnectorHeadType,
  type PulseOptions,
  type PulseSequenceStep,
  type PulseSequenceOptions,
  type PulseSequenceController,
} from "./Connector";
export {
  Lifeline,
  LifelineElement,
  ActivationBar,
  ActivationBarElement,
  Activation,
  SequenceDiagram,
  SequenceDiagramElement,
  sequenceDiagram,
  Sequence,
  type LifelineOptions,
  type ActivationBarOptions,
  type ActivationOptions,
  type ActivationElement,
  type SequenceDiagramOptions,
  type SequenceOptions,
} from "./SequenceDiagram";
