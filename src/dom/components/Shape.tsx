import "./Shape.css";
import {
  type Align,
  type FlowEffect,
  type ReactiveElementBase,
  type ReactiveProp,
  getActiveStage,
} from "../../core/index";
import { DOMElement, type ElementOptions } from "../element";
import { type PingHandle, spawnPingPacket } from "./ping";

/**
 * Geometric silhouette kind for the Shape component.
 * @category Components
 */
export type ShapeKind = "box" | "circle" | "pill" | "diamond";

/**
 * Surface material preset for the Shape component.
 * @category Components
 */
export type ShapeVariant = "surface" | "ghost" | "solid";

/**
 * Configuration options for the Shape, Card, Circle, Pill, and Diamond components.
 * @category Components
 */
export interface ShapeOptions extends ElementOptions {
  /** Geometric silhouette: "box" (default), "circle", "pill", or "diamond". */
  kind?: ShapeKind;
  /** Surface material preset: "surface" (glass card, default), "ghost" (outline), or "solid" (opaque fill). */
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
  /** Stroke outline width in virtual canvas pixels (default: 1.5). */
  strokeWidth?: number;
  /** Optional child elements or text nodes. */
  children?: unknown;
}

function roundedRectPath(cx: number, pad: number, pw: number, ph: number, cr: number): string {
  if (cr <= 0) {
    return `M ${cx} ${pad} H ${pad + pw} V ${pad + ph} H ${pad} V ${pad} H ${cx} Z`;
  }
  return (
    `M ${cx} ${pad} ` +
    `H ${pad + pw - cr} ` +
    `A ${cr} ${cr} 0 0 1 ${pad + pw} ${pad + cr} ` +
    `V ${pad + ph - cr} ` +
    `A ${cr} ${cr} 0 0 1 ${pad + pw - cr} ${pad + ph} ` +
    `H ${pad + cr} ` +
    `A ${cr} ${cr} 0 0 1 ${pad} ${pad + ph - cr} ` +
    `V ${pad + cr} ` +
    `A ${cr} ${cr} 0 0 1 ${pad + cr} ${pad} ` +
    `H ${cx} Z`
  );
}

function computeShapePath(kind: ShapeKind, w: number, h: number, sw: number, inset = 0): string {
  if (w <= 0 || h <= 0) return "";
  const pad = sw / 2 + inset;
  const pw = w - pad * 2;
  const ph = h - pad * 2;
  if (pw <= 0 || ph <= 0) return "";

  const cx = w / 2;
  const cy = h / 2;

  switch (kind) {
    case "circle": {
      const r = Math.min(pw, ph) / 2;
      if (r <= 0) return "";
      return `M ${cx} ${cy - r} A ${r} ${r} 0 0 1 ${cx} ${cy + r} A ${r} ${r} 0 0 1 ${cx} ${cy - r}`;
    }
    case "pill": {
      const cr = Math.min(pw, ph) / 2;
      return roundedRectPath(cx, pad, pw, ph, cr);
    }
    case "box": {
      const cr = Math.min(12, pw / 2, ph / 2);
      return roundedRectPath(cx, pad, pw, ph, cr);
    }
    case "diamond": {
      const cr = Math.min(10.5, pw * 0.15, ph * 0.15);
      const f = cr / Math.SQRT2;
      return (
        `M ${cx + f} ${pad + f} ` +
        `L ${pad + pw - f} ${cy - f} ` +
        `A ${cr} ${cr} 0 0 1 ${pad + pw - f} ${cy + f} ` +
        `L ${cx + f} ${pad + ph - f} ` +
        `A ${cr} ${cr} 0 0 1 ${cx - f} ${pad + ph - f} ` +
        `L ${pad + f} ${cy + f} ` +
        `A ${cr} ${cr} 0 0 1 ${pad + f} ${cy - f} ` +
        `L ${cx - f} ${pad + f} ` +
        `A ${cr} ${cr} 0 0 1 ${cx + f} ${pad + f} Z`
      );
    }
  }
}

/**
 * @internal
 */
export class ShapeElement extends DOMElement {
  static override reactiveKeys: ReadonlySet<string> = new Set([
    ...DOMElement.reactiveKeys,
    "start",
    "end",
    "flow",
    "active",
    "doubleBorder",
    "text",
    "borderColor",
  ]);

  readonly kind: ShapeKind;
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

  constructor(childrenOrOptions?: unknown, maybeOptions: ShapeOptions = {}) {
    let children: unknown = childrenOrOptions;
    let options: ShapeOptions = maybeOptions;

    if (
      childrenOrOptions &&
      typeof childrenOrOptions === "object" &&
      !("nodeType" in childrenOrOptions) &&
      !("domElement" in childrenOrOptions) &&
      !Array.isArray(childrenOrOptions)
    ) {
      options = childrenOrOptions as ShapeOptions;
      children = options.children;
    }

    const kind = options.kind ?? "box";
    const variant = options.variant ?? "surface";

    const classNames = ["sr-shape", `sr-shape-${kind}`, `sr-shape-${variant}`, options.className]
      .filter(Boolean)
      .join(" ");

    const el = document.createElement("div");
    el.className = classNames;
    el.setAttribute("data-shape", kind);
    el.setAttribute("data-variant", variant);

    const customStyles: Record<string, string> = {};

    if (typeof options.borderColor === "string") customStyles.borderColor = options.borderColor;
    if (options.background) customStyles.backgroundColor = options.background;
    if (options.color) customStyles.color = options.color;

    Object.assign(el.style, customStyles);

    // Create SVG overlay for perimeter stroke
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "sr-shape-stroke-svg");
    svg.setAttribute("aria-hidden", "true");

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    path.setAttribute("class", "sr-shape-path-main");
    path.setAttribute("vector-effect", "non-scaling-stroke");
    svg.appendChild(path);

    const innerPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    innerPath.setAttribute("class", "sr-shape-path-inner");
    innerPath.setAttribute("vector-effect", "non-scaling-stroke");
    innerPath.style.display = "none";
    svg.appendChild(innerPath);

    el.appendChild(svg);

    const childItems: ReactiveElementBase[] = [];
    let initialTextSpan: HTMLElement | null = null;
    let initialText: string | undefined;

    // Append child content
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

    super("Shape", el, options);

    this.svgElement = svg;
    this.pathNode = path;
    this.innerPathNode = innerPath;

    this.textSpan = initialTextSpan;
    this._text = initialText;
    this.items = childItems;

    this.kind = kind;
    this.variant = variant;
    this.primaryColor = options.color ?? (options.borderColor as string | undefined) ?? "#38bdf8";
    this.strokeWidth = options.strokeWidth ?? 1.5;
    if (options.borderColor !== undefined) {
      this.borderColor = options.borderColor;
    } else if (options.color !== undefined) {
      this.borderColor = options.color;
    }
    if (options.text !== undefined) this.text = options.text;
    if (options.start !== undefined) this.start = options.start;
    if (options.end !== undefined) this.end = options.end;
    if (options.flow !== undefined) this.flow = options.flow;

    if (options.active !== undefined) this._active = !!options.active;
    if (options.doubleBorder !== undefined) this._doubleBorder = !!options.doubleBorder;

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
      "color-mix(in srgb, var(--sr-text) 18%, transparent)";

    if (this.color) {
      this.domElement.style.color = String(this.color);
    }

    if (this.active) {
      this.domElement.classList.add("is-active");
      this.domElement.style.boxShadow = `0 0 24px ${this.primaryColor}66, inset 0 0 12px ${this.primaryColor}33`;
      this.pathNode.setAttribute("stroke", this.primaryColor);
      this.innerPathNode.setAttribute("stroke", this.primaryColor);
      this.pathNode.style.stroke = this.primaryColor;
      this.innerPathNode.style.stroke = this.primaryColor;
      this.pathNode.style.color = this.primaryColor;
      this.innerPathNode.style.color = this.primaryColor;
    } else {
      this.domElement.classList.remove("is-active");
      this.domElement.style.boxShadow = "";
      this.pathNode.setAttribute("stroke", strokeColor);
      this.innerPathNode.setAttribute("stroke", strokeColor);
      this.pathNode.style.stroke = strokeColor;
      this.innerPathNode.style.stroke = strokeColor;
      this.pathNode.style.color = strokeColor;
      this.innerPathNode.style.color = strokeColor;
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

      const outerD = computeShapePath(this.kind, w, h, this.strokeWidth, 0);
      this.pathNode.setAttribute("d", outerD);

      if (this.doubleBorder) {
        const innerD = computeShapePath(this.kind, w, h, this.strokeWidth, 4);
        this.innerPathNode.setAttribute("d", innerD);
        this.innerPathNode.style.display = "";
      } else {
        this.innerPathNode.style.display = "none";
      }
    } else if (this.doubleBorder && this.innerPathNode.style.display === "none") {
      const innerD = computeShapePath(this.kind, w, h, this.strokeWidth, 4);
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
    if (typeof window === "undefined") return;
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
    if (typeof window === "undefined") return;
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
}

/**
 * Universal shape container supporting multiple geometries and surface treatments.
 * @category Components
 */
export function Shape(childrenOrOptions?: unknown, maybeOptions: ShapeOptions = {}): ShapeElement {
  const stage = getActiveStage();
  const el = new ShapeElement(childrenOrOptions, maybeOptions);
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
  return Shape(childrenOrOptions, { ...options, kind: "box" });
}

/**
 * Circular geometric node.
 * @category Components
 */
export function Circle(childrenOrOptions?: unknown, options: ShapeOptions = {}): ShapeElement {
  return Shape(childrenOrOptions, { ...options, kind: "circle" });
}

/**
 * Capsule pill tag / status indicator.
 * @category Components
 */
export function Pill(childrenOrOptions?: unknown, options: ShapeOptions = {}): ShapeElement {
  return Shape(childrenOrOptions, { ...options, kind: "pill" });
}

/**
 * 45-degree rotated diamond decision node.
 * @category Components
 */
export function Diamond(childrenOrOptions?: unknown, options: ShapeOptions = {}): ShapeElement {
  return Shape(childrenOrOptions, { ...options, kind: "diamond" });
}
