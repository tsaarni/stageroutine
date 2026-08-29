/**
 * Standard library of slide UI components (Title, Text, Shape, Badge, CodeBlock, etc.).
 */

export { Title, type TitleOptions, type TitleVariant } from "./Title";
export { Text, type TextOptions } from "./Text";
export {
  Shape,
  ShapeElement,
  type ShapeOptions,
  type ShapeKind,
  type ShapeVariant,
  type NoteSide,
} from "./Shape";
export { Badge, type BadgeOptions } from "./Badge";
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
  type ConnectorOptions,
  type ConnectorTarget,
  type PulseOptions,
} from "./Connector";
export {
  Lifeline,
  LifelineElement,
  Activation,
  ActivationElement,
  type LifelineOptions,
  type ActivationOptions,
} from "./Sequence";
