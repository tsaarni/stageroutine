/**
 * Represents an animated HTML element on the stage, wrapping a real DOM node with reactive transform properties.
 */

import type { Properties as CSSProperties } from "csstype";
import { applyDOMOpacity, discoverBackdropLayers } from "../core/dom-opacity";
import { computeTransform } from "../core/interpolators";
import { logger } from "../core/logger";
import { resolveCoords } from "../core/position";
import { CORE_REACTIVE_KEYS } from "../core/reactive";
import { getActiveStage, tryGetActiveStage } from "../core/stage";
import type {
  Align,
  CoordProp,
  ElementAnchor,
  Position,
  PositionCoord,
  PositionUpdater,
  ReactiveElementBase,
  ReactiveProp,
  Size,
} from "../core/types";
import { cssLength, STAGE_UNITS_TALL, stageUnitsWide } from "../core/units";
import {
  type ElementTransition,
  ElementTransitionBuilder,
  type ElementTransitionProps,
} from "../motion/element-transition";
import { isTransitionDescriptor } from "../motion/transitions";
import { applyThemeTokens, type ThemeConfig } from "../theme/tokens";

let nextId = 1;

/** Resolves a coordinate assignment to a number. Supports "center" and transitions. */
function resolveCoord(val: unknown, current: number, axis: "x" | "y"): number {
  if (val === "center") {
    if (axis === "x") {
      const stage = tryGetActiveStage();
      return stage ? stage.unitsWide / 2 : stageUnitsWide(1920, 1080) / 2;
    }
    return STAGE_UNITS_TALL / 2;
  }
  if (typeof val === "number") return val;
  if (typeof val === "function") return (val as (curr: number) => number)(current);
  if (isTransitionDescriptor(val)) return resolveCoord(val.target, current, axis);
  return current;
}

/**
 * Callback function that applies visual effects or behavior to a stage element.
 * @category Decorators
 */
export type ElementDecorator = (element: DOMElement) => void;

/** Content accepted by container factories. @category Core */
export type ElementChild =
  | DOMElement
  | Node
  | string
  | number
  | boolean
  | null
  | readonly ElementChild[];

/**
 * Base positioning and visual options shared across all Stage elements.
 * @category Core
 */
export interface ElementOptions {
  id?: string;
  /** Which point of the element sits on its coordinate (default: `"top-left"`). */
  origin?: ElementAnchor;
  align?: Align;
  position?: Position;
  /** Horizontal position in stage units (default: 0). */
  x?: PositionCoord;
  /** Vertical position in stage units (default: 0). */
  y?: PositionCoord;
  /** Width in stage units or CSS length (default: content size). */
  width?: Size;
  /** Height in stage units or CSS length (default: content size). */
  height?: Size;
  /** Both dimensions in stage units or CSS length (default: unset). */
  size?: Size;
  /** Scale multiplier (default: 1). */
  scale?: number;
  /** Rotation in degrees (default: 0). */
  rotation?: number;
  /** Whole-element opacity from 0 to 1 (default: 1). */
  opacity?: number;
  /** Blur in virtual pixels (default: 0). */
  blur?: number;
  /** Brightness multiplier (default: 1). */
  brightness?: number;
  /** Foreground CSS color (default: component/theme color). */
  color?: string;
  className?: string;
  style?: CSSProperties;
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
export interface DOMElement extends ReactiveElementBase {
  get origin(): ElementAnchor;
  set origin(value: ReactiveProp<ElementAnchor> | undefined);
  get align(): Align | undefined;
  set align(value: ReactiveProp<Align> | undefined);
  get position(): Position;
  set position(value: ReactiveProp<Position> | PositionUpdater | undefined);
  /** Whether the element is mounted (default: false). */
  readonly isMounted: boolean;
  /** Whether the element is active (default: false). */
  readonly isActive: boolean;
  onMount(fn: () => void): () => void;
  onUnmount(fn: () => void): () => void;
  onActivate(fn: () => void): () => void;
  onDeactivate(fn: () => void): () => void;
  onUpdate(fn: (progress: number) => void): () => void;
  onClick(handler: (event: MouseEvent) => (() => void) | unknown): this;
  /** Sets properties with one transition. */
  to(props: ElementTransitionProps<this>): ElementTransition;
  /** Applies an element decorator. */
  decorate(decorator: ElementDecorator): this;
}

/** Internal DOM implementation. @internal */
export class DOMElementImpl implements DOMElement {
  /** @internal */
  protected static _reactiveKeys: ReadonlySet<string> = CORE_REACTIVE_KEYS;

  /** @internal */
  protected get _reactiveKeys(): ReadonlySet<string> {
    return (this.constructor as typeof DOMElementImpl)._reactiveKeys;
  }

  readonly id: string;
  readonly kind: string;
  readonly domElement: HTMLElement;
  private _origin: ElementAnchor = "top-left";

  /** Which point of the element sits on its coordinate. */
  get origin(): ElementAnchor {
    return this._origin;
  }
  set origin(val: ReactiveProp<ElementAnchor> | undefined) {
    if (isTransitionDescriptor(val)) {
      this._origin = (val.target ?? "top-left") as ElementAnchor;
    } else {
      this._origin = (val ?? "top-left") as ElementAnchor;
    }
  }
  /** @internal */
  _isCustomPositioned = false;

  /** @internal */
  _defaultPointerEvents = "auto";

  private _x = 0;
  private _y = 0;

  /** Horizontal coordinate in stage units. */
  get x(): number {
    return this._x;
  }
  set x(val: CoordProp) {
    this._x = resolveCoord(val, this._x, "x");
  }

  /** Vertical coordinate in stage units. */
  get y(): number {
    return this._y;
  }
  set y(val: CoordProp) {
    this._y = resolveCoord(val, this._y, "y");
  }

  private _width?: Size;
  get width(): Size | undefined {
    return this._width;
  }
  set width(value: ReactiveProp<Size> | undefined) {
    const raw = isTransitionDescriptor(value) ? value.target : value;
    this._width =
      typeof raw === "function" ? raw(typeof this._width === "number" ? this._width : 0) : raw;
  }
  private _height?: Size;
  get height(): Size | undefined {
    return this._height;
  }
  set height(value: ReactiveProp<Size> | undefined) {
    const raw = isTransitionDescriptor(value) ? value.target : value;
    this._height =
      typeof raw === "function" ? raw(typeof this._height === "number" ? this._height : 0) : raw;
  }
  private _scale = 1;
  get scale(): number {
    return this._scale;
  }
  set scale(value: ReactiveProp<number>) {
    if (typeof value === "number") this._scale = value;
    else if (typeof value === "function") this._scale = value(this._scale);
    else this._scale = value.target as number;
  }
  private _rotation = 0;
  get rotation(): number {
    return this._rotation;
  }
  set rotation(value: ReactiveProp<number>) {
    if (typeof value === "number") this._rotation = value;
    else if (typeof value === "function") this._rotation = value(this._rotation);
    else this._rotation = value.target as number;
  }
  private _opacity = 1;
  get opacity(): number {
    return this._opacity;
  }
  set opacity(value: ReactiveProp<number>) {
    if (typeof value === "number") this._opacity = value;
    else if (typeof value === "function") this._opacity = value(this._opacity);
    else this._opacity = value.target as number;
  }
  private _blur = 0;
  get blur(): number {
    return this._blur;
  }
  set blur(value: ReactiveProp<number>) {
    if (typeof value === "number") this._blur = value;
    else if (typeof value === "function") this._blur = value(this._blur);
    else this._blur = value.target as number;
  }
  private _brightness = 1;
  get brightness(): number {
    return this._brightness;
  }
  set brightness(value: ReactiveProp<number>) {
    if (typeof value === "number") this._brightness = value;
    else if (typeof value === "function") this._brightness = value(this._brightness);
    else this._brightness = value.target as number;
  }
  private _color?: string;
  get color(): string | undefined {
    return this._color;
  }
  set color(value: ReactiveProp<string> | undefined) {
    this._color = isTransitionDescriptor(value) ? value.target : value;
  }
  private _zIndex?: number | string;
  get zIndex(): number | string | undefined {
    return this._zIndex;
  }
  set zIndex(value: ReactiveProp<number | string> | undefined) {
    const raw = isTransitionDescriptor(value) ? value.target : value;
    this._zIndex =
      typeof raw === "function" ? raw(typeof this._zIndex === "number" ? this._zIndex : 0) : raw;
  }
  exitDuration?: number;
  exitDelay?: number;
  enterDuration?: number;
  /** Delay in seconds before entering scene transition begins (defaults to 0). */
  enterDelay: number | undefined;

  private _align: Align | undefined;

  get align(): Align | undefined {
    return this._align;
  }
  set align(value: ReactiveProp<Align> | undefined) {
    const raw = isTransitionDescriptor(value) ? value.target : value;
    const val = typeof raw === "string" ? raw : undefined;
    this._align = val;
    if (val) {
      this.domElement.dataset.align = val;
    } else {
      delete this.domElement.dataset.align;
    }
  }

  get size(): Size | undefined {
    return this.width ?? this.height;
  }
  set size(val: ReactiveProp<Size> | undefined) {
    this.width = val;
    this.height = val;
  }

  /** Coordinate pair in stage units. */
  get position(): Position {
    return [this._x, this._y];
  }
  set position(val: ReactiveProp<Position> | PositionUpdater | undefined) {
    const { x, y } = resolveCoords(isTransitionDescriptor(val) ? val.target : val, () => [
      this._x,
      this._y,
    ]);
    if (x !== undefined) {
      this.x = x as CoordProp;
    }
    if (y !== undefined) {
      this.y = y as CoordProp;
    }
  }

  /**
   * Sets multiple properties on this element with a unified transition descriptor or immediate values.
   */
  to(props: ElementTransitionProps<this>): ElementTransition {
    return new ElementTransitionBuilder(this, props);
  }

  private mountListeners: Set<() => void> = new Set();
  private unmountListeners: Set<() => void> = new Set();
  private activateListeners: Set<() => void> = new Set();
  private deactivateListeners: Set<() => void> = new Set();
  private updateListeners: Set<(progress: number) => void> = new Set();

  /** Whether this element is currently attached to the DOM tree. */
  isMounted = false;

  /** Whether this element is visible and active in the current scene (opacity > 0). */
  isActive = false;

  /**
   * Internal hook invoked by Stage during transition ticks.
   * Dispatches updates to registered `onUpdate` listeners and triggers layout recomputes.
   * @internal
   */
  _dispatchUpdate(progress = 1): void {
    this._update();
    for (const listener of this.updateListeners) {
      listener(progress);
    }
  }

  /**
   * Virtual update hook overridden by derived elements (like Connector) to sync geometries.
   * @internal
   */
  _update(): void {}

  constructor(
    kind: string,
    html: HTMLElement | SVGElement | DocumentFragment | DOMElement | string,
    options: ElementOptions = {},
  ) {
    this.id = options.id || `${kind}-${nextId++}`;
    this.kind = kind;

    for (const [key, value] of Object.entries(options)) {
      if (isTransitionDescriptor(value))
        throw new Error(
          `Initial ${key} must be a plain value; animate the registered element instead.`,
        );
    }

    let rawPosX = options.x;
    let rawPosY = options.y;
    if (options.position === "center") {
      rawPosX = "center";
      rawPosY = "center";
    } else if (Array.isArray(options.position)) {
      rawPosX = options.position[0];
      rawPosY = options.position[1];
    }

    const defaultOrigin: ElementAnchor = "top-left";
    this.origin = options.origin ?? defaultOrigin;

    if (html instanceof DOMElementImpl) {
      this.domElement = html.domElement;
      this.id = options.id || html.id;
      this.origin = options.origin || html.origin || defaultOrigin;
      const initialAlign = options.align ?? html.align;
      if (initialAlign) {
        this.align = initialAlign;
      }
    } else if (typeof html === "string") {
      const template = document.createElement("template");
      template.innerHTML = html.trim();
      this.domElement =
        (template.content.firstElementChild as HTMLElement) || document.createElement("div");
    } else if (html instanceof DocumentFragment) {
      const wrapper = document.createElement("div");
      wrapper.appendChild(html);
      this.domElement = wrapper;
    } else {
      this.domElement = html as HTMLElement;
    }

    if (options.align) {
      this.align = options.align;
    }

    this.x = options.x ?? (rawPosX as CoordProp) ?? 0;
    this.y = options.y ?? (rawPosY as CoordProp) ?? 0;
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
      this._isCustomPositioned = true;
    }

    const initialWidth = cssLength(this.width);
    if (initialWidth !== undefined) {
      this.domElement.style.width = initialWidth;
    }
    const initialHeight = cssLength(this.height);
    if (initialHeight !== undefined) {
      this.domElement.style.height = initialHeight;
    }

    if (!this.domElement.style.pointerEvents) {
      this.domElement.style.pointerEvents = "auto";
    }
    this._defaultPointerEvents = this.domElement.style.pointerEvents || "auto";
    this.domElement.style.zIndex = "1";

    if (!this._isCustomPositioned) {
      this.domElement.style.position = "absolute";
      this.domElement.style.left = "0px";
      this.domElement.style.top = "0px";

      const { transform, transformOrigin } = computeTransform(
        this._x,
        this._y,
        this.scale as number,
        this.rotation as number,
        this.origin,
      );
      this.domElement.style.transform = transform;
      this.domElement.style.transformOrigin = transformOrigin;
    }
    applyDOMOpacity(this.domElement, this.opacity);

    if (options.style) {
      const owned = [
        "transform",
        "transformOrigin",
        "opacity",
        "filter",
        "width",
        "height",
        "color",
        "zIndex",
      ];
      for (const key of owned) {
        if (key in options.style)
          logger.warn(`[StageRoutine] style.${key} is stage-owned; use a presentation property.`);
      }
    }
    if (options.className) {
      this.domElement.classList.add(...options.className.split(" ").filter(Boolean));
    }
    if (options.style) {
      Object.assign(this.domElement.style, options.style);
    }
    if (options.theme) {
      applyThemeTokens(this.domElement, options.theme);
    }
    if (options.onMount) {
      this.onMount(options.onMount);
    }
    if (options.onUnmount) {
      this.onUnmount(options.onUnmount);
    }
    if (options.onActivate) {
      this.onActivate(options.onActivate);
    }
    if (options.onDeactivate) {
      this.onDeactivate(options.onDeactivate);
    }

    if (options.id) {
      this.domElement.id = options.id;
    }
    this.domElement.dataset.elementId = this.id;
    this.domElement.dataset.elementKind = this.kind;
  }

  /**
   * Registers a callback invoked when the element is attached to the stage DOM.
   */
  onMount(fn: () => void): () => void {
    this.mountListeners.add(fn);
    return () => this.mountListeners.delete(fn);
  }

  /**
   * Registers a callback invoked when the element is detached from the stage DOM.
   */
  onUnmount(fn: () => void): () => void {
    this.unmountListeners.add(fn);
    return () => this.unmountListeners.delete(fn);
  }

  /**
   * Registers a callback invoked when the element becomes visible in the active scene.
   */
  onActivate(fn: () => void): () => void {
    this.activateListeners.add(fn);
    return () => this.activateListeners.delete(fn);
  }

  /**
   * Registers a callback invoked when the element transitions out of visibility.
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
    discoverBackdropLayers(this.domElement);
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
    this.domElement.style.removeProperty("--sr-element-play-state");
    if (typeof this.domElement?.getAnimations === "function") {
      for (const anim of this.domElement.getAnimations({ subtree: true })) {
        if (
          anim instanceof CSSAnimation &&
          ["sr-neon-bloom", "sr-neon-sweep"].includes(anim.animationName)
        )
          continue;
        anim.play();
      }
    }
    for (const listener of this.activateListeners) {
      listener();
    }
  }

  /**
   * @internal Deactivates the element when it leaves active visibility (opacity === 0).
   * Notifies registered `onDeactivate` listeners to pause timers, RAF loops, or media streams.
   */
  _deactivate(): void {
    this.domElement.style.setProperty("--sr-element-play-state", "paused");
    if (typeof this.domElement?.getAnimations === "function") {
      for (const anim of this.domElement.getAnimations({ subtree: true })) {
        if (
          anim instanceof CSSAnimation &&
          ["sr-neon-bloom", "sr-neon-sweep", "sr-flow-traveling-kf", "sr-flow-chase-kf"].includes(
            anim.animationName,
          )
        )
          continue;
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
   * If the handler returns a function, that function is invoked as a reset cleanup
   * when clicking outside this element or pressing Escape.
   */
  onClick(handler: (event: MouseEvent) => (() => void) | unknown): this {
    this.domElement.style.cursor = "pointer";
    let activeCleanup: (() => void) | null = null;

    const runCleanup = () => {
      if (activeCleanup) {
        const cleanup = activeCleanup;
        activeCleanup = null;
        window.removeEventListener("pointerdown", onOutside, true);
        window.removeEventListener("keydown", onKeyDown, true);
        cleanup();
      }
    };

    const onOutside = (e: PointerEvent) => {
      if (!this.domElement.contains(e.target as Node)) {
        runCleanup();
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        runCleanup();
      }
    };

    this.domElement.addEventListener("click", (event) => {
      if (activeCleanup) {
        return;
      }
      const cleanup = handler(event);
      if (typeof cleanup === "function") {
        activeCleanup = cleanup as () => void;
        setTimeout(() => {
          if (activeCleanup) {
            window.addEventListener("pointerdown", onOutside, true);
            window.addEventListener("keydown", onKeyDown, true);
          }
        }, 0);
      }
    });

    this.onUnmount(() => runCleanup());
    this.onDeactivate(() => runCleanup());

    return this;
  }

  /**
   * Applies a decorator function to enhance this element with custom styles, animations, or behaviors.
   */
  decorate(decorator: ElementDecorator): this {
    decorator(this);
    discoverBackdropLayers(this.domElement);
    return this;
  }
}

/**
 * Registers a component element on the active stage and returns its reactive proxy.
 * Throws when no Stage has been created.
 * @internal
 */
export function mount<T extends ReactiveElementBase>(element: T): T {
  return getActiveStage()._registerElement(element);
}

/** Wraps a DOM node as a reactive stage element. @category Core */
export function Element(node: HTMLElement, options: ElementOptions = {}): DOMElement {
  return mount(new DOMElementImpl("Element", node, options));
}
