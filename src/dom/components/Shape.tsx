import { getActiveStage } from "../../core/index";
import { DOMElement, type ElementOptions } from "../element";

export type ShapeKind = "box" | "circle" | "pill" | "diamond";
export type ShapeVariant = "surface" | "ghost" | "note";
export type NoteSide = "left" | "right";

export interface ShapeOptions extends ElementOptions {
  /** Geometric kind: "box" (default), "circle", "pill", or "diamond". */
  shape?: ShapeKind;
  /** Visual surface preset: "surface" (glass card, default), "ghost" (transparent), or "note" (accent side bar). */
  variant?: ShapeVariant;
  /** Border side for note variant ("left" | "right", defaults to "left"). */
  side?: NoteSide;
  /** Uniform width and height shorthand (ideal for circles and diamonds). */
  size?: number | string;
  /** Explicit width in pixels or container units. */
  width?: number | string;
  /** Explicit height in pixels or container units. */
  height?: number | string;
  /** Border stroke color. */
  borderColor?: string;
  /** Background fill color. */
  background?: string;
  /** Foreground text / accent color. */
  color?: string;
  /** Highlighted / glowing active state. */
  active?: boolean;
  /** Double border outline (e.g. for final states, nested rings). */
  doubleBorder?: boolean;
  /** Content alignment inside the shape container ("left" | "center" | "right"). */
  align?: "left" | "center" | "right";
  /** Optional child elements or text nodes. */
  children?: unknown;
}

export class ShapeElement extends DOMElement {
  readonly shape: ShapeKind;
  readonly variant: ShapeVariant;
  private _isActive = false;
  private _doubleBorder = false;
  private primaryColor: string;

  get active(): boolean {
    return this._isActive;
  }

  set active(val: boolean) {
    this._isActive = val;
    this.updateVisualState();
  }

  get doubleBorder(): boolean {
    return this._doubleBorder;
  }

  set doubleBorder(val: boolean) {
    this._doubleBorder = val;
    this.updateVisualState();
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

    const shape = options.shape ?? "box";
    const variant = options.variant ?? "surface";
    const side = options.side ?? "left";

    const classNames = [
      "sr-shape",
      `sr-shape-${shape}`,
      `sr-shape-${variant}`,
      variant === "note" ? `is-side-${side}` : undefined,
      options.className,
    ]
      .filter(Boolean)
      .join(" ");

    const el = document.createElement("div");
    el.className = classNames;
    el.setAttribute("data-shape", shape);
    el.setAttribute("data-variant", variant);

    const customStyles: Record<string, string> = {};

    const resolvedWidth = options.width ?? options.size;
    const resolvedHeight = options.height ?? options.size;

    if (resolvedWidth !== undefined) {
      customStyles.width = typeof resolvedWidth === "number" ? `${resolvedWidth}px` : resolvedWidth;
    }
    if (resolvedHeight !== undefined) {
      if (shape === "circle" || shape === "diamond") {
        customStyles.height =
          typeof resolvedHeight === "number" ? `${resolvedHeight}px` : resolvedHeight;
      } else {
        customStyles.minHeight =
          typeof resolvedHeight === "number" ? `${resolvedHeight}px` : resolvedHeight;
      }
    }

    if (options.borderColor) customStyles.borderColor = options.borderColor;
    if (options.background) customStyles.backgroundColor = options.background;
    if (options.color) customStyles.color = options.color;

    if (options.align === "center" || shape === "circle" || shape === "diamond") {
      customStyles.alignItems = "center";
      customStyles.justifyContent = "center";
      customStyles.textAlign = "center";
    } else if (options.align === "right") {
      customStyles.alignItems = "flex-end";
      customStyles.textAlign = "right";
    } else if (options.align === "left") {
      customStyles.alignItems = "flex-start";
      customStyles.textAlign = "left";
    }

    Object.assign(el.style, customStyles);

    // Append child content
    if (children !== undefined && children !== null) {
      if (typeof children === "string" || typeof children === "number") {
        const textSpan = document.createElement("span");
        textSpan.className = "sr-shape-text";
        textSpan.textContent = String(children);
        el.appendChild(textSpan);
      } else if (children instanceof Node) {
        el.appendChild(children);
      } else if (children instanceof DOMElement) {
        el.appendChild(children.domElement);
      } else if (Array.isArray(children)) {
        for (const child of children) {
          if (child instanceof Node) {
            el.appendChild(child);
          } else if (child instanceof DOMElement) {
            el.appendChild(child.domElement);
          } else if (typeof child === "string" || typeof child === "number") {
            const span = document.createElement("span");
            span.textContent = String(child);
            el.appendChild(span);
          }
        }
      }
    }

    super("Shape", el, options);

    this.shape = shape;
    this.variant = variant;
    this.primaryColor = options.color ?? options.borderColor ?? "#38bdf8";
    this._isActive = !!options.active;
    this._doubleBorder = !!options.doubleBorder;
    this.updateVisualState();
  }

  private updateVisualState(): void {
    if (this._isActive) {
      this.domElement.classList.add("is-active");
      this.domElement.style.borderColor = this.primaryColor;
      this.domElement.style.boxShadow = `0 0 24px ${this.primaryColor}66, inset 0 0 12px ${this.primaryColor}33`;
    } else {
      this.domElement.classList.remove("is-active");
      this.domElement.style.boxShadow = "";
    }

    if (this._doubleBorder) {
      this.domElement.classList.add("has-double-border");
    } else {
      this.domElement.classList.remove("has-double-border");
    }
  }
}

export function Shape(childrenOrOptions?: unknown, maybeOptions: ShapeOptions = {}): ShapeElement {
  const stage = getActiveStage();
  const el = new ShapeElement(childrenOrOptions, maybeOptions);
  if (stage && typeof stage.registerElement === "function") {
    return stage.registerElement(el) as ShapeElement;
  }
  return el;
}
