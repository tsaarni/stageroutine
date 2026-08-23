/**
 * Exports DOM components, the zero-VDOM JSX runtime, and layout helpers.
 */

export { DOMElement, type ElementOptions, type ElementDecorator } from "./element";
export {
  gradient,
  type GradientOptions,
  glow,
  type GlowOptions,
  typewriter,
  type TypewriterOptions,
  type TypewriterStep,
} from "./decorators/index";
export {
  Title,
  Text,
  Card,
  Badge,
  Kicker,
  CodeBlock,
  TerminalWindow,
  BulletList,
  type TitleOptions,
  type TextOptions,
  type CardOptions,
  type BadgeOptions,
  type KickerOptions,
  type CodeBlockOptions,
  type TerminalWindowProps,
  type BulletListOptions,
} from "./components/index";
export { stagger } from "./stagger";
export { jsx, jsxs, jsxDEV, Fragment, createElement, type JSX } from "./jsx-runtime";
