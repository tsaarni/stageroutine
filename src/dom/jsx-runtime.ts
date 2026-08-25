/**
 * Direct-to-DOM JSX runtime compiling TSX tags directly into native DOM nodes with zero Virtual DOM overhead.
 */

import { getActiveStage } from "../core/index";
import { DOMElement, type ElementOptions } from "./element";

export const Fragment = Symbol("StageRoutine.Fragment");

const SVG_TAGS = new Set([
  "svg",
  "path",
  "circle",
  "rect",
  "g",
  "line",
  "text",
  "polygon",
  "polyline",
  "ellipse",
  "defs",
  "use",
  "clipPath",
  "mask",
  "linearGradient",
  "radialGradient",
  "stop",
  "pattern",
  "image",
]);

const MOTION_PROP_KEYS = new Set([
  "x",
  "y",
  "scale",
  "rotation",
  "opacity",
  "blur",
  "brightness",
  "anchor",
  "asElement",
]);

const ALL_STAGE_OPTION_KEYS = new Set([
  "x",
  "y",
  "scale",
  "rotation",
  "opacity",
  "blur",
  "brightness",
  "anchor",
  "color",
  "className",
  "style",
  "id",
  "asElement",
]);

function appendChild(parent: Node, child: unknown): void {
  if (child === null || child === undefined || typeof child === "boolean") {
    return;
  }

  if (Array.isArray(child)) {
    for (const item of child) {
      appendChild(parent, item);
    }
    return;
  }

  if (child instanceof Node) {
    parent.appendChild(child);
  } else if (
    typeof child === "object" &&
    child !== null &&
    "domElement" in child &&
    (child as DOMElement).domElement instanceof Node
  ) {
    parent.appendChild((child as DOMElement).domElement);
  } else {
    parent.appendChild(document.createTextNode(String(child)));
  }
}

export type JSXProps = Record<string, unknown>;
export type ComponentFunction = (
  props: JSXProps,
) => HTMLElement | SVGElement | DocumentFragment | DOMElement;

export function jsx(
  type: string | typeof Fragment | ComponentFunction,
  props: JSXProps = {},
  _key?: string,
): HTMLElement | SVGElement | DocumentFragment | DOMElement {
  if (type === Fragment) {
    const fragment = document.createDocumentFragment();
    if (props.children) {
      appendChild(fragment, props.children);
    }
    return fragment;
  }

  // Check if stage motion props were passed
  let hasMotionProps = false;
  for (const key of Object.keys(props)) {
    if (MOTION_PROP_KEYS.has(key) && props[key] !== undefined) {
      hasMotionProps = true;
      break;
    }
  }

  if (typeof type === "function") {
    if (!hasMotionProps) {
      return type(props);
    }

    // Split stage options from component props
    const stageOptions: ElementOptions = {};
    const componentProps: JSXProps = {};

    for (const [key, value] of Object.entries(props)) {
      if (ALL_STAGE_OPTION_KEYS.has(key)) {
        (stageOptions as Record<string, unknown>)[key] = value;
      } else {
        componentProps[key] = value;
      }
    }

    const result = type(componentProps);

    // Direct DOM element or already-wrapped element guard
    if (
      result instanceof HTMLElement ||
      result instanceof SVGElement ||
      result instanceof DOMElement ||
      (typeof result === "object" && result !== null && "domElement" in result)
    ) {
      if (hasMotionProps) {
        const kind = typeof type === "function" && type.name ? type.name.toLowerCase() : "custom";
        const domEl =
          result instanceof DOMElement
            ? result
            : new DOMElement(kind, result as HTMLElement | SVGElement, stageOptions);
        return getActiveStage().registerElement(domEl);
      }
      return result;
    }

    if (hasMotionProps) {
      const kind = typeof type === "function" && type.name ? type.name.toLowerCase() : "custom";
      const domEl = new DOMElement(kind, result, stageOptions);
      return getActiveStage().registerElement(domEl);
    }

    return result;
  }

  const isSvg = SVG_TAGS.has(type.toLowerCase());
  const element = isSvg
    ? document.createElementNS("http://www.w3.org/2000/svg", type)
    : document.createElement(type);

  for (const [key, value] of Object.entries(props)) {
    if (
      hasMotionProps &&
      ALL_STAGE_OPTION_KEYS.has(key) &&
      key !== "className" &&
      key !== "style"
    ) {
      continue;
    }

    if (key === "children") {
      appendChild(element, value);
      continue;
    }

    if (key === "ref" && value) {
      if (typeof value === "function") {
        value(element);
      } else if (typeof value === "object" && "current" in value) {
        (value as { current: unknown }).current = element;
      }
      continue;
    }

    if (key === "className" || key === "class") {
      if (isSvg) {
        element.setAttribute("class", String(value));
      } else {
        (element as HTMLElement).className = String(value);
      }
      continue;
    }

    if (key === "style") {
      if (typeof value === "string") {
        (element as HTMLElement).style.cssText = value;
      } else if (typeof value === "object" && value !== null) {
        Object.assign((element as HTMLElement).style, value);
      }
      continue;
    }

    if (key.startsWith("on") && typeof value === "function") {
      const eventName = key.slice(2).toLowerCase();
      element.addEventListener(eventName, value as EventListener);
      continue;
    }

    if (typeof value === "boolean") {
      if (value) {
        element.setAttribute(key, "");
      }
      continue;
    }

    if (value !== undefined && value !== null) {
      element.setAttribute(key, String(value));
    }
  }

  if (hasMotionProps) {
    const stageOptions: ElementOptions = {};
    for (const [key, value] of Object.entries(props)) {
      if (ALL_STAGE_OPTION_KEYS.has(key)) {
        (stageOptions as Record<string, unknown>)[key] = value;
      }
    }
    const domEl = new DOMElement(type, element, stageOptions);
    return getActiveStage().registerElement(domEl);
  }

  return element;
}

export const jsxs = jsx;
export const jsxDEV = jsx;

export function createElement(
  type: string | typeof Fragment | ComponentFunction,
  props: JSXProps | null = null,
  ...children: unknown[]
): HTMLElement | SVGElement | DocumentFragment | DOMElement {
  const combinedProps: JSXProps = { ...(props || {}) };
  if (children.length === 1) {
    combinedProps.children = children[0];
  } else if (children.length > 1) {
    combinedProps.children = children;
  }
  return jsx(type, combinedProps);
}

// Global JSX namespace for TypeScript
export namespace JSX {
  export type Element = DOMElement & HTMLElement & { [key: string]: unknown };
  export type LibraryManagedAttributes<_C, P> = P & ElementOptions;
  export interface IntrinsicElements {
    // biome-ignore lint/suspicious/noExplicitAny: Required for universal JSX attribute support
    [elemName: string]: any;
  }
}
