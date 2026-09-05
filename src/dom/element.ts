/**
 * Represents an animated HTML element on the stage, wrapping a real DOM node with reactive transform properties.
 */

import type { Properties as CSSProperties } from "csstype";
import { computeTransformAndOrigin } from "../core/interpolators";
import type { ElementAnchor, Point, ReactiveElementBase, ReactiveProp } from "../core/types";
import { type ThemeConfig, applyThemeTokens } from "../theme/tokens";

let nextId = 1;

/**
 * Callback function to decorate or style a Stage DOMElement instance.
 * @category Decorators
 */
export type ElementDecorator = (element: DOMElement) => void;

/**
 * Base positioning and visual options shared across all Stage elements.
 * @category Core
 */
export interface ElementOptions {
  id?: string;
  anchor?: ElementAnchor;
  position?: Point;
  x?: ReactiveProp<number | string>;
  y?: ReactiveProp<number | string>;
  width?: ReactiveProp<number | string>;
  height?: ReactiveProp<number | string>;
  size?: ReactiveProp<number | string>;
  scale?: ReactiveProp<number>;
  rotation?: ReactiveProp<number>;
  opacity?: ReactiveProp<number>;
  blur?: ReactiveProp<number>;
  brightness?: ReactiveProp<number>;
  color?: ReactiveProp<string>;
  className?: string;
  style?: CSSProperties | Partial<CSSStyleDeclaration>;
  theme?: Partial<ThemeConfig>;
}

/**
 * Base reactive element wrapper around an HTML/SVG DOM node on the presentation stage.
 * @category Core
 */
export class DOMElement implements ReactiveElementBase {
  readonly id: string;
  readonly kind: string;
  readonly domElement: HTMLElement;
  anchor: ElementAnchor;

  x: ReactiveProp<number | string> = 0;
  y: ReactiveProp<number | string> = 0;
  width?: ReactiveProp<number | string>;
  height?: ReactiveProp<number | string>;
  size?: ReactiveProp<number | string>;
  scale: ReactiveProp<number> = 1;
  rotation: ReactiveProp<number> = 0;
  opacity: ReactiveProp<number> = 1;
  blur: ReactiveProp<number> = 0;
  brightness: ReactiveProp<number> = 1;
  color?: ReactiveProp<string>;

  isMounted = false;
  isActive = false;

  private mountListeners = new Set<() => void>();
  private unmountListeners = new Set<() => void>();
  private activateListeners = new Set<() => void>();
  private deactivateListeners = new Set<() => void>();

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

    this.x = options.x ?? (options.position ? options.position[0] : 0);
    this.y = options.y ?? (options.position ? options.position[1] : 0);
    this.width = options.width ?? options.size;
    this.height = options.height ?? options.size;
    this.scale = options.scale ?? 1;
    this.rotation = options.rotation ?? 0;
    this.opacity = options.opacity ?? 1;
    this.blur = options.blur ?? 0;
    this.brightness = options.brightness ?? 1;
    this.color = options.color;

    if (this.width !== undefined) {
      this.domElement.style.width =
        typeof this.width === "number" ? `${this.width}px` : String(this.width);
    }
    if (this.height !== undefined) {
      this.domElement.style.height =
        typeof this.height === "number" ? `${this.height}px` : String(this.height);
    }

    // Apply baseline stage positioning styles (Top-Left origin standard)
    this.domElement.style.position = "absolute";
    this.domElement.style.left = "0px";
    this.domElement.style.top = "0px";
    this.domElement.style.willChange = "transform, opacity, filter";
    if (!this.domElement.style.pointerEvents) {
      this.domElement.style.pointerEvents = "auto";
    }
    this.domElement.style.zIndex = "1";

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

    if (options.theme) {
      applyThemeTokens(this.domElement, options.theme);
    }

    if (options.style && typeof options.style === "object") {
      Object.assign(this.domElement.style, options.style);
    }
  }

  /**
   * Registers a callback triggered when this element is mounted into the DOM.
   */
  onMount(fn: () => void): () => void {
    this.mountListeners.add(fn);
    return () => this.mountListeners.delete(fn);
  }

  /**
   * Registers a callback triggered when this element is unmounted from the DOM.
   */
  onUnmount(fn: () => void): () => void {
    this.unmountListeners.add(fn);
    return () => this.unmountListeners.delete(fn);
  }

  /**
   * Registers a callback triggered whenever this element becomes active and visible on stage.
   */
  onActivate(fn: () => void): () => void {
    this.activateListeners.add(fn);
    return () => this.activateListeners.delete(fn);
  }

  /**
   * Registers a callback triggered whenever this element becomes inactive / hidden.
   */
  onDeactivate(fn: () => void): () => void {
    this.deactivateListeners.add(fn);
    return () => this.deactivateListeners.delete(fn);
  }

  /**
   * Mounts the element's DOM node into the specified parent container.
   */
  /**
   * @internal Mounts the element's DOM node into the specified parent container.
   */
  _mount(parent: HTMLElement): void {
    if (this.isMounted) return;
    this.isMounted = true;
    if (!this.domElement.parentElement) {
      parent.appendChild(this.domElement);
    }
    for (const listener of this.mountListeners) {
      listener();
    }
  }

  /**
   * @internal Unmounts the element from the DOM and releases resources.
   */
  _unmount(): void {
    if (!this.isMounted) return;
    this._deactivate();
    this.isMounted = false;
    this.domElement.remove();
    for (const listener of this.unmountListeners) {
      listener();
    }
  }

  /**
   * @internal Activates the element when it enters active scene visibility (opacity > 0).
   * Notifies registered `onActivate` listeners to start timers, RAF loops, or media streams.
   */
  _activate(): void {
    if (this.isActive) return;
    this.isActive = true;
    for (const listener of this.activateListeners) {
      listener();
    }
  }

  /**
   * @internal Deactivates the element when it leaves active visibility (opacity === 0).
   * Notifies registered `onDeactivate` listeners to pause timers, RAF loops, or media streams.
   */
  _deactivate(): void {
    if (!this.isActive) return;
    this.isActive = false;
    for (const listener of this.deactivateListeners) {
      listener();
    }
  }

  /**
   * Registers a click interaction handler on this element.
   */
  onClick(handler: (event: MouseEvent) => void): this {
    this.domElement.style.cursor = "pointer";
    this.domElement.addEventListener("click", handler);
    return this;
  }

  /**
   * Applies a decorator function to enhance this element with custom styles, animations, or behaviors.
   */
  decorate(decorator: ElementDecorator): this {
    decorator(this);
    return this;
  }
}
