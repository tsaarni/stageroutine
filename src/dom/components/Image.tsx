/**
 * Standalone reactive Image element for presentation slides and technical diagrams.
 */

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

/**
 * Reactive Image element wrapping a native <img> DOM node.
 * @internal
 */
export class ImageElement extends DOMElement {
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
  const el = new ImageElement(srcOrOptions, maybeOptions);
  if (stage && typeof stage.registerElement === "function") {
    return stage.registerElement(el) as ImageElement;
  }
  return el;
}
