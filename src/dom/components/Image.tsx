/**
 * Standalone reactive Image element for stage presentations and technical diagrams.
 */

import { type DOMElement, type ElementOptions, mount } from "../element";
import { type ImageFit, MediaSurface } from "./media";

export type { ImageFit };

/**
 * Configuration options for the Image component.
 * @category Components
 * @inline
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
class ImageElementImpl extends MediaSurface implements ImageElement {
  readonly imgElement: HTMLImageElement;

  protected override get mediaNode(): HTMLElement {
    return this.imgElement;
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

    super("Image", img, options);

    this.imgElement = img;
    this.applyInitialFit(options.fit ?? "contain");
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
  return mount(new ImageElementImpl(srcOrOptions, maybeOptions));
}
