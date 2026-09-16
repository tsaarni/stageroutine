/**
 * Standalone reactive Image element for stage presentations and technical diagrams.
 */

import "./Media.css";
import { getActiveStage } from "../../core/index";
import { DOMElement, type ElementOptions } from "../element";

/**
 * Image object-fit scaling mode:
 * - "contain" (default): Scales image to fit inside bounds while preserving aspect ratio.
 * - "cover": Zooms and fills bounds completely, cropping overflow.
 * - "fill": Stretches image to exact bounds.
 * - "none": Displays image at intrinsic pixel size.
 * - "scale-down": Scales down like "contain" if larger than container, otherwise behaves like "none".
 * @category Components
 */
export type ImageFit = "contain" | "cover" | "fill" | "none" | "scale-down";

/**
 * Configuration options for the Image component.
 * @category Components
 */
export interface ImageOptions extends ElementOptions {
  /** Image source URL or path (optional if passed as first argument). */
  src?: string;
  /** Accessible text description. */
  alt?: string;
  /** Object sizing fit: "contain" (default) | "cover" | "fill" | "none" | "scale-down". */
  fit?: ImageFit;
}

/** Public controls for an image. @category Components */
export interface ImageElement extends DOMElement {
  fit: ImageFit;
  src: string;
  alt: string;
}

/**
 * Reactive Image element wrapping a native <img> DOM node.
 * @internal
 */
class ImageElementImpl extends DOMElement implements ImageElement {
  readonly imgElement: HTMLImageElement;
  private _fit: ImageFit = "contain";

  get fit(): ImageFit {
    return this._fit;
  }

  set fit(val: ImageFit) {
    this._fit = val;
    this.imgElement.style.objectFit = val;
  }

  get src(): string {
    return this.imgElement.src;
  }

  set src(val: string) {
    this.imgElement.src = val;
  }

  get alt(): string {
    return this.imgElement.alt;
  }

  set alt(val: string) {
    this.imgElement.alt = val;
  }

  override update(): void {
    if (this.imgElement) {
      if (this.src && this.imgElement.src !== this.src) this.imgElement.src = this.src;
      if (this.alt && this.imgElement.alt !== this.alt) this.imgElement.alt = this.alt;
      if (this._fit && this.imgElement.style.objectFit !== this._fit) {
        this.imgElement.style.objectFit = this._fit;
      }
    }
  }

  constructor(srcOrOptions: string | ImageOptions = {}, maybeOptions: ImageOptions = {}) {
    const options =
      typeof srcOrOptions === "string" ? { ...maybeOptions, src: srcOrOptions } : srcOrOptions;
    const img = document.createElement("img");
    img.className = ["sr-image", options.className].filter(Boolean).join(" ");

    if (options.src) img.src = options.src;
    if (options.alt) img.alt = options.alt;

    const fit = options.fit ?? "contain";
    img.style.objectFit = fit;

    super("Image", img, options);

    this.imgElement = img;
    this._fit = fit;
  }
}

/**
 * Creates a reactive Image element on stage.
 *
 * @category Components
 * @example
 * ```tsx
 * const diagram = Image("./architecture.png", {
 *   x: "center",
 *   y: "center",
 *   scale: 0.8,
 * });
 * ```
 */
export function Image(
  srcOrOptions: string | ImageOptions = {},
  maybeOptions: ImageOptions = {},
): ImageElement {
  const stage = getActiveStage();
  const el = new ImageElementImpl(srcOrOptions, maybeOptions);
  if (stage && typeof stage.registerElement === "function") {
    return stage.registerElement(el) as ImageElement;
  }
  return el;
}
