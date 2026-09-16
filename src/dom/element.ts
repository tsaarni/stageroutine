/**
 * Represents an animated HTML element on the stage, wrapping a real DOM node with reactive transform properties.
 */

import type { Properties as CSSProperties } from "csstype";
import { computeTransformAndOrigin } from "../core/interpolators";
import { CORE_REACTIVE_KEYS } from "../core/reactive";
import type {
  Align,
  ElementAnchor,
  Position,
  ReactiveElementBase,
  ReactiveProp,
} from "../core/types";
import {
  type ElementTransition,
  ElementTransitionBuilder,
  type ElementTransitionProps,
} from "../motion/element-transition";
import { isTransitionDescriptor } from "../motion/transitions";
import { applyThemeTokens, type ThemeConfig } from "../theme/tokens";

let nextId = 1;

/**
 * Callback function that applies visual effects or behavior to a stage element.
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
  align?: Align;
  position?: Position;
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
  /** Whether this element manages its own CSS transform / positioning (disables stage translate3d). */
  customPositioned?: boolean;
  /** Duration in seconds for exiting scene transition. */
  exitDuration?: number;
  /** Delay in seconds before exiting scene transition begins. */
  exitDelay?: number;
  /** Duration in seconds for entering scene transition. */
  enterDuration?: number;
  /** Delay in seconds before entering scene transition begins. */
  enterDelay?: number;
  onMount?: () => void;
  onUnmount?: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

/**
 * Animated DOM element instance managed by the reactive Stage runtime.
 * Wraps an underlying HTML/SVG element and exposes bindable transform and visual properties.
 * @category Core
 */
export class DOMElement implements ReactiveElementBase {
  static reactiveKeys: ReadonlySet<string> = CORE_REACTIVE_KEYS;

  get reactiveKeys(): ReadonlySet<string> {
    return (this.constructor as typeof DOMElement).reactiveKeys;
  }

  readonly id: string;
  readonly kind: string;
  readonly domElement: HTMLElement;
  anchor: ElementAnchor;
  /**
   * Whether this element manages its own CSS positioning/transform (e.g. custom SVG overlays or lifelines).
   * When true, Stage does not overwrite `node.style.transform`.
   * @internal Engine driver
   */
  isCustomPositioned = false;
  /** @internal */
  _defaultPointerEvents = "auto";

  x: ReactiveProp<number | string> = 0;
  y: ReactiveProp<number | string> = 0;
  width?: ReactiveProp<number | string>;
  height?: ReactiveProp<number | string>;
  scale: ReactiveProp<number> = 1;
  rotation: ReactiveProp<number> = 0;
  opacity: ReactiveProp<number> = 1;
  blur: ReactiveProp<number> = 0;
  brightness: ReactiveProp<number> = 1;
  color?: ReactiveProp<string>;
  exitDuration?: number;
  exitDelay?: number;
  enterDuration?: number;
  enterDelay?: number;

  private _align?: Align;

  get align(): Align | undefined {
    return this._align;
  }
  set align(val: Align | undefined) {
    this._align = val;
    if (val) {
      this.domElement.dataset.align = val;
    } else {
      delete this.domElement.dataset.align;
    }
  }

  get size(): ReactiveProp<number | string> | undefined {
    return this.width ?? this.height;
  }
  set size(val: ReactiveProp<number | string> | undefined) {
    this.width = val;
    this.height = val;
  }

  get position(): Position {
    const currX = isTransitionDescriptor(this.x) ? this.x.target : this.x;
    const currY = isTransitionDescriptor(this.y) ? this.y.target : this.y;
    return [currX as number | string, currY as number | string];
  }
  set position(val: ReactiveProp<Position> | undefined) {
    if (val === undefined) return;
    if (isTransitionDescriptor(val)) {
      const targetCoord = val.target as unknown;
      let targetX: unknown;
      let targetY: unknown;
      if (Array.isArray(targetCoord)) {
        targetX = targetCoord[0];
        targetY = targetCoord[1];
      } else if (typeof targetCoord === "object" && targetCoord !== null) {
        targetX = (targetCoord as Record<string, unknown>).x;
        targetY = (targetCoord as Record<string, unknown>).y;
      }
      if (targetX !== undefined) {
        this.x = { ...val, target: targetX } as unknown as ReactiveProp<number | string>;
      }
      if (targetY !== undefined) {
        this.y = { ...val, target: targetY } as unknown as ReactiveProp<number | string>;
      }
      return;
    }

    if (Array.isArray(val)) {
      this.x = val[0];
      this.y = val[1];
    } else if (typeof val === "object" && val !== null) {
      const p = val as { x?: number | string; y?: number | string };
      if (p.x !== undefined) this.x = p.x;
      if (p.y !== undefined) this.y = p.y;
    }
  }

  /**
   * Animates multiple reactive properties on this element simultaneously.
   * e.g. `card.to({ y: -50, opacity: 0 }).duration(0.4).ease("cubicInOut")`
   */
  to(props: ElementTransitionProps): ElementTransition {
    return new ElementTransitionBuilder(this, props);
  }

  isMounted = false;
  isActive = false;

  private mountListeners = new Set<() => void>();
  private unmountListeners = new Set<() => void>();
  private activateListeners = new Set<() => void>();
  private deactivateListeners = new Set<() => void>();
  private updateListeners = new Set<(progress: number) => void>();

  /**
   * Component update hook invoked whenever reactive properties are mutated during transitions.
   * Can be overridden by subclasses to redraw SVG, canvas, or complex layouts.
   */
  update(): void {}

  /**
   * @internal Dispatches update to the component and all registered onUpdate listeners.
   */
  _dispatchUpdate(progress = 1): void {
    this.update();
    for (const listener of this.updateListeners) {
      listener(progress);
    }
  }

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
      const initialAlign = options.align ?? html.align;
      if (initialAlign) {
        this.align = initialAlign;
      }
    } else if (typeof html === "string") {
      this.domElement = document.createElement("div");
      this.domElement.innerHTML = html;
    } else if (html instanceof DocumentFragment) {
      this.domElement = document.createElement("div");
      this.domElement.appendChild(html);
    } else {
      this.domElement = html as HTMLElement;
    }

    if (options.align) {
      this.align = options.align;
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
    this.exitDuration = options.exitDuration;
    this.exitDelay = options.exitDelay;
    this.enterDuration = options.enterDuration;
    this.enterDelay = options.enterDelay;
    if (options.customPositioned) {
      this.isCustomPositioned = true;
    }

    if (this.width !== undefined) {
      this.domElement.style.width =
        typeof this.width === "number" ? `${this.width}px` : String(this.width);
    }
    if (this.height !== undefined) {
      this.domElement.style.height =
        typeof this.height === "number" ? `${this.height}px` : String(this.height);
    }

    this.domElement.style.willChange = "transform, opacity, filter";
    if (!this.domElement.style.pointerEvents) {
      this.domElement.style.pointerEvents = "auto";
    }
    this._defaultPointerEvents = this.domElement.style.pointerEvents || "auto";
    this.domElement.style.zIndex = "1";

    if (!this.isCustomPositioned) {
      // Apply baseline stage positioning styles (Top-Left origin standard)
      this.domElement.style.position = "absolute";
      this.domElement.style.left = "0px";
      this.domElement.style.top = "0px";

      const { transform, transformOrigin } = computeTransformAndOrigin(
        this.x as number | string,
        this.y as number | string,
        this.scale as number,
        this.rotation as number,
        this.anchor,
      );
      this.domElement.style.transform = transform;
      this.domElement.style.transformOrigin = transformOrigin;
    }
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

    if (options.onMount) this.onMount(options.onMount);
    if (options.onUnmount) this.onUnmount(options.onUnmount);
    if (options.onActivate) this.onActivate(options.onActivate);
    if (options.onDeactivate) this.onDeactivate(options.onDeactivate);
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
   * Registers a callback invoked whenever reactive properties are mutated during transitions.
   * Receives normalized transition progress from 0 (start) to 1 (complete/rest).
   */
  onUpdate(fn: (progress: number) => void): () => void {
    this.updateListeners.add(fn);
    return () => this.updateListeners.delete(fn);
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
    if (typeof this.domElement?.getAnimations === "function") {
      for (const anim of this.domElement.getAnimations({ subtree: true })) {
        anim.play();
      }
    }
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
    if (typeof this.domElement?.getAnimations === "function") {
      for (const anim of this.domElement.getAnimations({ subtree: true })) {
        anim.pause();
      }
    }
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
