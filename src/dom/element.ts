/**
 * Represents an animated HTML element on the stage, wrapping a real DOM node with reactive transform properties.
 */

import { computeTransformAndOrigin } from "../core/interpolators";
import type { ElementAnchor, ReactiveElementBase, ReactiveProp } from "../core/types";

let nextId = 1;

export interface ElementOptions {
  id?: string;
  anchor?: ElementAnchor;
  x?: number | string;
  y?: number | string;
  scale?: number;
  rotation?: number;
  opacity?: number;
  blur?: number;
  brightness?: number;
  color?: string;
  className?: string;
  style?: Partial<CSSStyleDeclaration>;
}

export class DOMElement implements ReactiveElementBase {
  readonly id: string;
  readonly kind: string;
  readonly domElement: HTMLElement;
  anchor: ElementAnchor;

  x: ReactiveProp<number | string> = 0;
  y: ReactiveProp<number | string> = 0;
  scale: ReactiveProp<number> = 1;
  rotation: ReactiveProp<number> = 0;
  opacity: ReactiveProp<number> = 1;
  blur: ReactiveProp<number> = 0;
  brightness: ReactiveProp<number> = 1;
  color?: ReactiveProp<string>;

  constructor(
    kind: string,
    html: HTMLElement | SVGElement | DocumentFragment | DOMElement | string,
    options: ElementOptions = {},
  ) {
    this.id = options.id || `${kind}-${nextId++}`;
    this.kind = kind;
    this.anchor = options.anchor || "top-left";

    if (html instanceof DOMElement) {
      this.domElement = html.domElement;
      this.id = options.id || html.id;
      this.anchor = options.anchor || html.anchor || "top-left";
    } else if (typeof html === "string") {
      this.domElement = document.createElement("div");
      this.domElement.innerHTML = html;
    } else if (html instanceof DocumentFragment) {
      this.domElement = document.createElement("div");
      this.domElement.appendChild(html);
    } else {
      this.domElement = html as HTMLElement;
    }

    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
    this.scale = options.scale ?? 1;
    this.rotation = options.rotation ?? 0;
    this.opacity = options.opacity ?? 1;
    this.blur = options.blur ?? 0;
    this.brightness = options.brightness ?? 1;
    this.color = options.color;

    // Apply baseline stage positioning styles (Top-Left origin standard)
    this.domElement.style.position = "absolute";
    this.domElement.style.left = "0px";
    this.domElement.style.top = "0px";
    this.domElement.style.willChange = "transform, opacity, filter";
    this.domElement.style.pointerEvents = "auto";

    const { transform, transformOrigin } = computeTransformAndOrigin(
      this.x as number | string,
      this.y as number | string,
      this.scale as number,
      this.rotation as number,
      this.anchor,
    );
    this.domElement.style.transform = transform;
    this.domElement.style.transformOrigin = transformOrigin;
    this.domElement.style.opacity = `${this.opacity}`;

    if (options.className) {
      const existing = this.domElement.className ? this.domElement.className.split(" ") : [];
      const incoming = options.className.split(" ");
      this.domElement.className = Array.from(new Set([...existing, ...incoming]))
        .filter(Boolean)
        .join(" ");
    }

    if (options.style) {
      Object.assign(this.domElement.style, options.style);
    }
  }
}
