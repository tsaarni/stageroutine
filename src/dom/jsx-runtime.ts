/**
 * Direct-to-DOM JSX runtime compiling TSX tags directly into native DOM nodes with zero Virtual DOM overhead.
 */

import { applyThemeTokens, type ThemeConfig } from "../theme/tokens";
import type { DOMElement, ElementOptions } from "./element";

export const Fragment = Symbol("StageRoutine.Fragment");

const SVG_TAGS = new Set([
  // Structure & shapes
  "svg",
  "g",
  "defs",
  "desc",
  "metadata",
  "symbol",
  "use",
  "marker",
  "clippath",
  "mask",
  "pattern",
  "image",
  "switch",
  "foreignobject",
  "view",
  "circle",
  "ellipse",
  "line",
  "path",
  "polygon",
  "polyline",
  "rect",
  "text",
  "tspan",
  "textpath",

  // Gradients
  "lineargradient",
  "radialgradient",
  "stop",

  // Animation (SMIL)
  "animate",
  "animatemotion",
  "animatetransform",
  "mpath",
  "set",

  // Filter & filter primitives
  "filter",
  "feblend",
  "fecolormatrix",
  "fecomponenttransfer",
  "fecomposite",
  "feconvolvematrix",
  "fediffuselighting",
  "fedisplacementmap",
  "fedistantlight",
  "fedropshadow",
  "feflood",
  "fefunca",
  "fefuncb",
  "fefuncg",
  "fefuncr",
  "fegaussianblur",
  "feimage",
  "femerge",
  "femergenode",
  "femorphology",
  "feoffset",
  "fepointlight",
  "fespecularlighting",
  "fespotlight",
  "fetile",
  "feturbulence",
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

  if (typeof type === "function") {
    return type(props);
  }

  const isSvg = SVG_TAGS.has(type.toLowerCase());
  const element = isSvg
    ? document.createElementNS("http://www.w3.org/2000/svg", type)
    : document.createElement(type);

  for (const [key, value] of Object.entries(props)) {
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

    if (key === "theme" && typeof value === "object" && value !== null) {
      applyThemeTokens(element as HTMLElement, value as Partial<ThemeConfig>);
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

export type {
  Align,
  AnchorKeyword,
  EaseCurve,
  ElementAnchor,
  Point,
  Position,
  ReactiveElementBase,
  ReactiveProp,
  TransitionDescriptor,
} from "../core/types";
export type { DOMElement } from "./element";
