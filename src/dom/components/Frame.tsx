/**
 * Geometric clipping container that shapes media and child elements to custom SVG contours.
 */

import "./Frame.css";
import { getActiveStage, type ReactiveElementBase, type ReactiveProp } from "../../core/index";
import { DOMElement, type ElementOptions } from "../element";
import { type Box, type CardinalSide, getPathPerimeterPoint, type Point } from "../geometry";
import type { PathFunction } from "../paths";

/**
 * Configuration options for the Frame clipping component.
 * @category Components
 */
export interface FrameOptions extends ElementOptions {
  /** Uniform width and height shorthand. */
  size?: number | string;
  /** Explicit width in pixels or container units. */
  width?: number | string;
  /** Explicit height in pixels or container units. */
  height?: number | string;
  /** Optional border outline color. */
  borderColor?: ReactiveProp<string>;
  /** Optional accent / text color. */
  color?: string;
  /** Border stroke outline width in virtual canvas pixels (default: 0). */
  strokeWidth?: number;
  /** Highlighted / glowing active state. */
  active?: boolean;
  /** Optional child elements or media node. */
  children?: unknown;
}

/** Public controls for a frame. @category Components */
export interface FrameElement extends DOMElement {
  path: PathFunction;
  readonly items: ReactiveElementBase[];
  active: boolean;
  borderColor: ReactiveProp<string> | undefined;
}

/**
 * @internal
 */
class FrameElementImpl extends DOMElement implements FrameElement {
  static override reactiveKeys: ReadonlySet<string> = new Set([
    ...DOMElement.reactiveKeys,
    "active",
    "borderColor",
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

  readonly items: ReactiveElementBase[] = [];
  private readonly contentDiv: HTMLDivElement;
  private readonly svgElement: SVGSVGElement;
  private readonly pathNode: SVGPathElement;

  private _active = false;
  private _borderColor?: ReactiveProp<string>;
  private primaryColor: string;
  private strokeWidth: number;
  private lastW = 0;
  private lastH = 0;

  get active(): boolean {
    return this._active;
  }
  set active(val: boolean) {
    this._active = !!val;
    this.update();
  }

  get borderColor(): ReactiveProp<string> | undefined {
    return this._borderColor;
  }
  set borderColor(val: ReactiveProp<string> | undefined) {
    this._borderColor = val;
    this.update();
  }

  constructor(path: PathFunction, childrenOrOptions?: unknown, options: FrameOptions = {}) {
    let children: unknown = childrenOrOptions;
    let opts: FrameOptions = options;

    if (
      childrenOrOptions &&
      typeof childrenOrOptions === "object" &&
      !("nodeType" in childrenOrOptions) &&
      !("domElement" in childrenOrOptions) &&
      !Array.isArray(childrenOrOptions)
    ) {
      opts = childrenOrOptions as FrameOptions;
      children = opts.children;
    }

    const classNames = ["sr-frame", opts.className].filter(Boolean).join(" ");
    const el = document.createElement("div");
    el.className = classNames;

    const contentDiv = document.createElement("div");
    contentDiv.className = "sr-frame-content";
    el.appendChild(contentDiv);

    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("class", "sr-frame-stroke-svg");
    svg.setAttribute("aria-hidden", "true");

    const pathNode = document.createElementNS("http://www.w3.org/2000/svg", "path");
    pathNode.setAttribute("class", "sr-frame-path-main");
    pathNode.style.fill = "none";
    svg.appendChild(pathNode);

    el.appendChild(svg);

    const childItems: ReactiveElementBase[] = [];

    if (children !== undefined && children !== null) {
      if (children instanceof Node) {
        contentDiv.appendChild(children);
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
        contentDiv.appendChild(childEl.domElement);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) {
            contentDiv.appendChild(child);
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
            contentDiv.appendChild(childEl.domElement);
          }
        }
      }
    }

    super("Frame", el, opts);
    this.domElement.style.willChange = "auto";

    this._path = path;
    this.contentDiv = contentDiv;
    this.svgElement = svg;
    this.pathNode = pathNode;
    this.items = childItems;

    this.primaryColor = opts.color ?? (opts.borderColor as string | undefined) ?? "#38bdf8";
    this.strokeWidth = opts.strokeWidth ?? (opts.borderColor ? 2 : 0);

    if (opts.borderColor !== undefined) {
      this.borderColor = opts.borderColor;
    } else if (opts.color !== undefined) {
      this.borderColor = opts.color;
    }

    if (opts.active !== undefined) this._active = !!opts.active;

    this.onMount(() => {
      this.update();
    });

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        this.update();
      });
      ro.observe(this.domElement);
      this.onUnmount(() => {
        ro.disconnect();
      });
    }

    this.update();
  }

  override update(): void {
    if (!this.pathNode) return;
    this.updateVisualState();
    this.updateGeometry();
  }

  private updateVisualState(): void {
    const strokeColor =
      (this.borderColor as string | undefined) ||
      (this.color as string | undefined) ||
      "transparent";

    if (this.color) {
      this.domElement.style.color = String(this.color);
    }

    if (this.active) {
      this.domElement.classList.add("is-active");
      this.pathNode.setAttribute("stroke", this.primaryColor);
      this.pathNode.style.stroke = this.primaryColor;
      this.pathNode.style.display = "";
    } else if (this.strokeWidth > 0 && strokeColor !== "transparent") {
      this.domElement.classList.remove("is-active");
      this.pathNode.setAttribute("stroke", strokeColor);
      this.pathNode.style.stroke = strokeColor;
      this.pathNode.style.display = "";
    } else {
      this.domElement.classList.remove("is-active");
      this.pathNode.style.display = "none";
    }

    const effectiveWidth = this.active && this.strokeWidth === 0 ? 2 : this.strokeWidth;
    this.pathNode.setAttribute("stroke-width", String(effectiveWidth));
    this.pathNode.style.strokeWidth = `${effectiveWidth}px`;
  }

  private updateGeometry(): void {
    let w = this.domElement.offsetWidth;
    let h = this.domElement.offsetHeight;
    if (w <= 0 && typeof this.width === "number") w = this.width;
    if (h <= 0 && typeof this.height === "number") h = this.height;
    if (w <= 0) w = parseFloat(this.domElement.style.width) || 0;
    if (h <= 0) h = parseFloat(this.domElement.style.height) || 0;

    if (w <= 0 || h <= 0) return;

    if (Math.abs(w - this.lastW) > 0.5 || Math.abs(h - this.lastH) > 0.5) {
      this.lastW = w;
      this.lastH = h;
      this.svgElement.setAttribute("viewBox", `0 0 ${w} ${h}`);

      const strokeD = this._path(w, h, { strokeWidth: this.strokeWidth, inset: 0 });
      this.pathNode.setAttribute("d", strokeD);

      const svgMask = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}'%3E%3Cpath fill='black' d='${encodeURIComponent(strokeD)}'/%3E%3C/svg%3E")`;
      this.contentDiv.style.maskImage = svgMask;
      (
        this.contentDiv.style as CSSStyleDeclaration & { webkitMaskImage?: string }
      ).webkitMaskImage = svgMask;
    }
  }

  /**
   * Calculates the exact perimeter attachment point against the frame's SVG path boundary.
   */
  getPerimeterPoint(box: Box, target: Point, padding = 6): { point: Point; side: CardinalSide } {
    const d =
      this.pathNode.getAttribute("d") ||
      this._path(box.width, box.height, { strokeWidth: this.strokeWidth, inset: 0 });
    return getPathPerimeterPoint(d, box, target, padding);
  }
}

/**
 * Clips media or DOM child elements to an SVG path geometry contour.
 * @category Components
 */
export function Frame(
  path: PathFunction,
  childOrOptions?: unknown,
  options: FrameOptions = {},
): FrameElement {
  const stage = getActiveStage();
  const el = new FrameElementImpl(path, childOrOptions, options);
  if (stage && typeof stage.registerElement === "function") {
    return stage.registerElement(el) as FrameElement;
  }
  return el;
}
