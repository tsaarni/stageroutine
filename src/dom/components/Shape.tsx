/**
 * Universal geometric shape container supporting surface materials, trim paths, and dynamic borders.
 */

import "./Shape.css";
import {
  type Align,
  type FlowEffect,
  getActiveStage,
  type ReactiveElementBase,
  type ReactiveProp,
} from "../../core/index";
import { DOMElement, type ElementOptions } from "../element";
import { type Box, type CardinalSide, getPathPerimeterPoint, type Point } from "../geometry";
import { type PathFunction, paths } from "../paths";
import { type PingHandle, spawnPingPacket } from "./ping";

export type { PathFunction };

/**
 * Surface material preset for the Shape component.
 * @category Components
 */
export type ShapeVariant = "surface" | "ghost" | "solid";

/**
 * Configuration options for the Shape and Card components.
 * @category Components
 */
export interface ShapeOptions extends ElementOptions {
  /** Surface material preset: "surface" (background fill, default), "ghost" (outline), or "solid" (opaque fill). */
  variant?: ShapeVariant;
  /** Uniform width and height shorthand (ideal for circles and diamonds). */
  size?: number | string;
  /** Explicit width in pixels or container units. */
  width?: number | string;
  /** Explicit height in pixels or container units. */
  height?: number | string;
  /** Border stroke color. */
  borderColor?: ReactiveProp<string>;
  /** Optional text content inside the shape container. */
  text?: string;
  /** Background fill color. */
  background?: string;
  /** Foreground text / accent color. */
  color?: string;
  /** Highlighted / glowing active state. */
  active?: boolean;
  /** Double border outline (e.g. for final states, nested rings). */
  doubleBorder?: boolean;
  /** Content alignment inside the shape container (default: "center"). */
  align?: Align;
  /** Trim-path start offset from 0.0 to 1.0 (default: 0). */
  start?: ReactiveProp<number>;
  /** Trim-path end offset from 0.0 to 1.0 (default: 1). */
  end?: ReactiveProp<number>;
  /** Continuous ambient stroke animation ("none" | "traveling" | "chase" | "ping", default: "none"). */
  flow?: ReactiveProp<FlowEffect>;
  /** Stroke outline width in virtual canvas pixels (default: 2). */
  strokeWidth?: number;
  /** Optional child elements or text nodes. */
  children?: unknown;
}

/** Public controls for a shape. @category Components */
export interface ShapeElement extends DOMElement {
  path: PathFunction;
  readonly variant: ShapeVariant;
  readonly items: ReactiveElementBase[];
  start: ReactiveProp<number>;
  end: ReactiveProp<number>;
  flow: ReactiveProp<FlowEffect>;
  text: string | undefined;
  borderColor: ReactiveProp<string> | undefined;
  background: string | undefined;
  active: boolean;
  doubleBorder: boolean;
}

/**
 * @internal
 */
class ShapeElementImpl extends DOMElement implements ShapeElement {
  static override reactiveKeys: ReadonlySet<string> = new Set([
    ...DOMElement.reactiveKeys,
    "start",
    "end",
    "flow",
    "active",
    "doubleBorder",
    "text",
    "borderColor",
    "background",
  ]);

  private _path: PathFunction;

  get path(): PathFunction {
    return this._path;
  }
  set path(val: PathFunction) {
    this._path = val;
    this.lastW = 0;
    this.lastH = 0;
    this.update();
  }

  readonly variant: ShapeVariant;
  readonly items: ReactiveElementBase[] = [];

  start: ReactiveProp<number> = 0;
  end: ReactiveProp<number> = 1;
  private strokeWidth: number;

  private _flow: ReactiveProp<FlowEffect> = "none";
  private pingIntervalTimer: number | null = null;
  private pingTimeoutTimer: number | null = null;
  private activePings = new Set<PingHandle>();

  get flow(): ReactiveProp<FlowEffect> {
    return this._flow;
  }
  set flow(val: ReactiveProp<FlowEffect>) {
    this._flow = val ?? "none";
    this.update();
  }

  private _text?: string;
  private _borderColor?: ReactiveProp<string>;
  private _background?: string;
  private textSpan: HTMLElement | null = null;

  get text(): string | undefined {
    return this._text;
  }
  set text(val: string | undefined) {
    this._text = val;
    if (val !== undefined) {
      if (!this.textSpan) {
        const span = document.createElement("span");
        span.className = "sr-shape-text";
        this.domElement.appendChild(span);
        this.textSpan = span;
      }
      this.textSpan.textContent = String(val);
    } else if (this.textSpan) {
      this.textSpan.textContent = "";
    }
  }

  get borderColor(): ReactiveProp<string> | undefined {
    return this._borderColor;
  }
  set borderColor(val: ReactiveProp<string> | undefined) {
    this._borderColor = val;
    this.update();
  }

  get background(): string | undefined {
    return this._background;
  }
  set background(val: string | undefined) {
    this._background = val;
    this.update();
  }

  private readonly frostDiv: HTMLDivElement;
  private readonly svgElement: SVGSVGElement;
  private readonly pathNode: SVGPathElement;
  private readonly innerPathNode: SVGPathElement;

  private _active = false;
  private _doubleBorder = false;
  private primaryColor: string;
  private lastW = 0;
  private lastH = 0;

  get active(): boolean {
    return this._active;
  }
  set active(val: boolean) {
    this._active = !!val;
    this.update();
  }

  get doubleBorder(): boolean {
    return this._doubleBorder;
  }
  set doubleBorder(val: boolean) {
    this._doubleBorder = !!val;
    this.update();
  }

  constructor(path: PathFunction, childrenOrOptions?: unknown, options: ShapeOptions = {}) {
    let children: unknown = childrenOrOptions;
    let opts: ShapeOptions = options;

    if (
      childrenOrOptions &&
      typeof childrenOrOptions === "object" &&
      !("nodeType" in childrenOrOptions) &&
      !("domElement" in childrenOrOptions) &&
      !Array.isArray(childrenOrOptions)
    ) {
      opts = childrenOrOptions as ShapeOptions;
      children = opts.children;
    }

    const pathFn = path;
    const variant = opts.variant ?? "surface";

    const classNames = ["sr-shape", `sr-shape-${variant}`, opts.className]
      .filter(Boolean)
      .join(" ");

    const el = document.createElement("div");
    el.className = classNames;
    el.setAttribute("data-variant", variant);

    const customStyles: Record<string, string> = {};

    if (typeof opts.borderColor === "string") customStyles.borderColor = opts.borderColor;
    if (opts.color) customStyles.color = opts.color;

    Object.assign(el.style, customStyles);

    // Layer 1: Frosted glass div (gradient + backdrop blur, masked via SVG data URI)
    const frostDiv = document.createElement("div");
    frostDiv.className = "sr-shape-frost";
    el.appendChild(frostDiv);

    // Layer 2: Vector stroke outline SVG overlay
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "sr-shape-stroke-svg");
    svg.setAttribute("aria-hidden", "true");

    const mainPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    mainPath.setAttribute("class", "sr-shape-path-main");
    mainPath.style.fill = "none";
    svg.appendChild(mainPath);

    const innerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    innerPath.setAttribute("class", "sr-shape-path-inner");
    innerPath.style.fill = "none";
    innerPath.style.display = "none";
    svg.appendChild(innerPath);

    el.appendChild(svg);

    // Layer 3: Text and child content
    const childItems: ReactiveElementBase[] = [];
    let initialTextSpan: HTMLElement | null = null;
    let initialText: string | undefined;

    if (children !== undefined && children !== null) {
      if (typeof children === "string" || typeof children === "number") {
        const textSpan = document.createElement("span");
        textSpan.className = "sr-shape-text";
        textSpan.textContent = String(children);
        el.appendChild(textSpan);
        initialTextSpan = textSpan;
        initialText = String(children);
      } else if (children instanceof Node) {
        el.appendChild(children);
      } else if (
        children instanceof DOMElement ||
        (children && typeof children === "object" && "domElement" in children)
      ) {
        const childEl = children as unknown as ReactiveElementBase;
        childItems.push(childEl);
        childEl.domElement.style.position = "relative";
        childEl.domElement.style.left = "auto";
        childEl.domElement.style.top = "auto";
        childEl.domElement.style.transform = "none";
        el.appendChild(childEl.domElement);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) {
            el.appendChild(child);
          } else if (
            child instanceof DOMElement ||
            (child && typeof child === "object" && "domElement" in child)
          ) {
            const childEl = child as unknown as ReactiveElementBase;
            childItems.push(childEl);
            childEl.domElement.style.position = "relative";
            childEl.domElement.style.left = "auto";
            childEl.domElement.style.top = "auto";
            childEl.domElement.style.transform = "none";
            el.appendChild(childEl.domElement);
          } else if (typeof child === "string" || typeof child === "number") {
            const span = document.createElement("span");
            span.className = "sr-shape-text";
            span.textContent = String(child);
            el.appendChild(span);
            if (!initialTextSpan) {
              initialTextSpan = span;
              initialText = String(child);
            }
          }
        }
      }
    }

    super("Shape", el, opts);
    this.domElement.style.willChange = "auto";

    this.frostDiv = frostDiv;
    this.svgElement = svg;
    this.pathNode = mainPath;
    this.innerPathNode = innerPath;

    this.textSpan = initialTextSpan;
    this._text = initialText;
    this.items = childItems;
    this._path = pathFn;
    this.variant = variant;
    this.primaryColor = opts.color ?? (opts.borderColor as string | undefined) ?? "#38bdf8";
    this.strokeWidth = opts.strokeWidth ?? 2;

    if (opts.borderColor !== undefined) {
      this.borderColor = opts.borderColor;
    } else if (opts.color !== undefined) {
      this.borderColor = opts.color;
    }
    if (opts.text !== undefined) this.text = opts.text;
    if (opts.background !== undefined) this.background = opts.background;
    if (opts.start !== undefined) this.start = opts.start;
    if (opts.end !== undefined) this.end = opts.end;
    if (opts.flow !== undefined) this.flow = opts.flow;

    if (opts.active !== undefined) this._active = !!opts.active;
    if (opts.doubleBorder !== undefined) this._doubleBorder = !!opts.doubleBorder;

    this.onMount(() => {
      this.update();
    });

    this.onActivate(() => {
      this.pathNode.style.animationPlayState = "running";
      this.innerPathNode.style.animationPlayState = "running";
      if (this.flow === "ping") {
        this._startPeriodicPing();
      }
      this.update();
    });

    this.onDeactivate(() => {
      this.pathNode.style.animationPlayState = "paused";
      this.innerPathNode.style.animationPlayState = "paused";
      this._stopPeriodicPing();
    });

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        this.update();
      });
      ro.observe(this.domElement);
      this.onUnmount(() => {
        this._stopPeriodicPing();
        ro.disconnect();
      });
    }

    this.update();
  }

  override update(): void {
    if (!this.pathNode) return;
    this.updateVisualState();
    this.updateGeometry();
    this.updateFlowClasses();
    this.updatePingFlow();
    this.applyTrim(this.pathNode);
    if (this.doubleBorder) {
      this.applyTrim(this.innerPathNode);
    }
  }

  private updateVisualState(): void {
    const strokeColor =
      (this.borderColor as string | undefined) ||
      (this.color as string | undefined) ||
      "color-mix(in srgb, var(--sr-text) 10%, transparent)";

    if (this.color) {
      this.domElement.style.color = String(this.color);
    }

    if (this.background) {
      this.domElement.style.background = "";
      this.frostDiv.style.display = "";
      this.frostDiv.style.background = this.background;
      this.pathNode.style.fill = "none";
    } else if (this.variant === "surface" || this.variant === "solid") {
      this.domElement.style.background = "";
      this.frostDiv.style.display = "";
      this.frostDiv.style.background = "";
      this.pathNode.style.fill = "none";
    } else {
      this.domElement.style.background = "";
      this.frostDiv.style.display = "none";
      this.frostDiv.style.background = "";
      this.pathNode.style.fill = "none";
    }

    if (this.active) {
      this.domElement.classList.add("is-active");
      this.pathNode.setAttribute("stroke", this.primaryColor);
      this.innerPathNode.setAttribute("stroke", this.primaryColor);
      this.pathNode.style.stroke = this.primaryColor;
      this.innerPathNode.style.stroke = this.primaryColor;
    } else {
      this.domElement.classList.remove("is-active");
      this.pathNode.setAttribute("stroke", strokeColor);
      this.innerPathNode.setAttribute("stroke", strokeColor);
      this.pathNode.style.stroke = strokeColor;
      this.innerPathNode.style.stroke = strokeColor;
    }

    this.pathNode.setAttribute("stroke-width", String(this.strokeWidth));
    this.innerPathNode.setAttribute("stroke-width", String(Math.max(1, this.strokeWidth - 0.5)));

    if (this.doubleBorder) {
      this.domElement.classList.add("has-double-border");
    } else {
      this.domElement.classList.remove("has-double-border");
    }
  }

  private updateGeometry(): void {
    let w = this.domElement.offsetWidth;
    let h = this.domElement.offsetHeight;
    if (w <= 0 && typeof this.width === "number") w = this.width;
    if (h <= 0 && typeof this.height === "number") h = this.height;
    if (w <= 0 || h <= 0) return;

    if (w !== this.lastW || h !== this.lastH) {
      this.lastW = w;
      this.lastH = h;
      this.svgElement.setAttribute("viewBox", `0 0 ${w} ${h}`);

      const strokeD = this._path(w, h, { strokeWidth: this.strokeWidth, inset: 0 });
      this.pathNode.setAttribute("d", strokeD);
      const svgMask = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'%3E%3Cpath fill='black' d='${encodeURIComponent(strokeD)}'/%3E%3C/svg%3E")`;
      this.frostDiv.style.maskImage = svgMask;
      (this.frostDiv.style as CSSStyleDeclaration & { webkitMaskImage?: string }).webkitMaskImage =
        svgMask;

      if (this.doubleBorder) {
        const innerD = this._path(w, h, { strokeWidth: this.strokeWidth, inset: 4 });
        this.innerPathNode.setAttribute("d", innerD);
        this.innerPathNode.style.display = "";
      } else {
        this.innerPathNode.style.display = "none";
      }
    } else if (this.doubleBorder && this.innerPathNode.style.display === "none") {
      const innerD = this._path(w, h, { strokeWidth: this.strokeWidth, inset: 4 });
      this.innerPathNode.setAttribute("d", innerD);
      this.innerPathNode.style.display = "";
    } else if (!this.doubleBorder && this.innerPathNode.style.display !== "none") {
      this.innerPathNode.style.display = "none";
    }
  }

  private updateFlowClasses(): void {
    const flowVal = typeof this.flow === "string" ? this.flow : "none";
    const svg = this.svgElement;
    svg.classList.remove("sr-flow-traveling", "sr-flow-chase", "sr-flow-pulse", "sr-flow-ping");

    if (flowVal && flowVal !== "none") {
      svg.classList.add(`sr-flow-${flowVal}`);
      if (flowVal === "chase") {
        this.pathNode.setAttribute("pathLength", "100");
        this.innerPathNode.setAttribute("pathLength", "100");
      } else {
        this.pathNode.removeAttribute("pathLength");
        this.innerPathNode.removeAttribute("pathLength");
      }
    } else {
      this.pathNode.removeAttribute("pathLength");
      this.innerPathNode.removeAttribute("pathLength");
    }
  }

  private updatePingFlow(): void {
    const flowVal = typeof this.flow === "string" ? this.flow : "none";
    if (flowVal === "ping") {
      if (this.pingIntervalTimer === null && this.pingTimeoutTimer === null) {
        this._startPeriodicPing();
      }
    } else {
      if (
        this.pingIntervalTimer !== null ||
        this.pingTimeoutTimer !== null ||
        this.activePings.size > 0
      ) {
        this._stopPeriodicPing();
      }
    }
  }

  private _startPeriodicPing(): void {
    this._stopPeriodicPing();

    const opacity = typeof this.opacity === "number" ? this.opacity : 1;
    if (opacity <= 0.01) return;

    const delayMs = 300;
    const intervalMs = 2200;

    const startLoop = () => {
      this.pingTimeoutTimer = null;
      if (typeof this.opacity === "number" && this.opacity <= 0.01) return;
      this._emitPing();
      this.pingIntervalTimer = window.setInterval(() => {
        if (typeof this.opacity === "number" && this.opacity <= 0.01) {
          this._stopPeriodicPing();
          return;
        }
        this._emitPing();
      }, intervalMs);
    };

    if (delayMs > 0) {
      this.pingTimeoutTimer = window.setTimeout(startLoop, delayMs);
    } else {
      startLoop();
    }
  }

  private _stopPeriodicPing(): void {
    if (this.pingTimeoutTimer !== null) {
      clearTimeout(this.pingTimeoutTimer);
      this.pingTimeoutTimer = null;
    }
    if (this.pingIntervalTimer !== null) {
      clearInterval(this.pingIntervalTimer);
      this.pingIntervalTimer = null;
    }
    for (const ping of this.activePings) {
      ping.cancel();
    }
    this.activePings.clear();
  }

  private _emitPing(): void {
    const opacity = typeof this.opacity === "number" ? this.opacity : 1;
    if (opacity <= 0.01) return;

    const pathD = this.pathNode.getAttribute("d");
    if (!pathD) return;

    const strokeColor =
      (this.borderColor as string | undefined) || (this.color as string | undefined) || "#10b981";

    const ping = spawnPingPacket(this.svgElement, pathD, {
      color: strokeColor,
      duration: 1.4,
      onComplete: () => {
        if (ping) this.activePings.delete(ping);
      },
    });

    if (ping) {
      this.activePings.add(ping);
    }
  }

  private applyTrim(path: SVGPathElement): void {
    const flowVal = typeof this.flow === "string" ? this.flow : "none";
    const isCssFlowing = flowVal === "traveling" || flowVal === "chase";
    if (isCssFlowing) {
      path.style.opacity = "";
      path.style.strokeDasharray = "";
      path.style.strokeDashoffset = "";
      return;
    }

    const startVal = typeof this.start === "number" ? this.start : 0;
    const endVal = typeof this.end === "number" ? this.end : 1;

    let len = 0;
    try {
      if (typeof path.getTotalLength === "function") {
        len = path.getTotalLength();
      }
    } catch {
      return;
    }

    const visiblePx = Math.max(0, (endVal - startVal) * len);
    if (visiblePx <= 0.1) {
      path.style.opacity = "0";
      return;
    }

    path.style.opacity = "1";

    if (endVal < 1 || startVal > 0) {
      path.style.strokeDasharray = `${visiblePx} ${len}`;
      path.style.strokeDashoffset = `${-startVal * len}`;
    } else {
      path.style.strokeDasharray = "none";
      path.style.strokeDashoffset = "0";
    }
  }

  /**
   * Calculates the exact perimeter attachment point against the shape's SVG path boundary.
   */
  getPerimeterPoint(box: Box, target: Point, padding = 6): { point: Point; side: CardinalSide } {
    const d = this.pathNode.getAttribute("d") || this._path(box.width, box.height);
    return getPathPerimeterPoint(d, box, target, padding);
  }
}

/**
 * Universal shape container supporting multiple geometries and surface treatments.
 * @category Components
 */
export function Shape(
  path: PathFunction,
  childrenOrOptions?: unknown,
  options: ShapeOptions = {},
): ShapeElement {
  const stage = getActiveStage();
  const el = new ShapeElementImpl(path, childrenOrOptions, options);
  if (stage && typeof stage.registerElement === "function") {
    return stage.registerElement(el) as ShapeElement;
  }
  return el;
}

/**
 * Rectangular card container.
 * @category Components
 */
export function Card(childrenOrOptions?: unknown, options: ShapeOptions = {}): ShapeElement {
  return Shape(paths.box(), childrenOrOptions, options);
}
