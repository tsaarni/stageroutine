/**
 * Represents an animated HTML element on the stage, wrapping a real DOM node with reactive transform properties.
 */

import { computeTransformAndOrigin } from "../core/interpolators";
import type { ElementAnchor, ReactiveElementBase, ReactiveProp } from "../core/types";

let nextId = 1;

export type ElementDecorator = (element: DOMElement) => void;

export interface ElementOptions {
  id?: string;
  anchor?: ElementAnchor;
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
  style?: Partial<CSSStyleDeclaration>;
}

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

  private isPlaying = true;
  private playListeners = new Set<() => void>();
  private pauseListeners = new Set<() => void>();

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

    this.x = options.x ?? 0;
    this.y = options.y ?? 0;
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

    if (options.style && typeof options.style === "object") {
      Object.assign(this.domElement.style, options.style);
    }
  }

  /**
   * Registers a callback triggered whenever this element enters active playback state.
   */
  onPlay(fn: () => void): () => void {
    this.playListeners.add(fn);
    return () => this.playListeners.delete(fn);
  }

  /**
   * Registers a callback triggered whenever this element enters paused state.
   */
  onPause(fn: () => void): () => void {
    this.pauseListeners.add(fn);
    return () => this.pauseListeners.delete(fn);
  }

  /**
   * Resumes all CSS and Web Animations running on this element and its subtree.
   */
  play(): void {
    this.isPlaying = true;
    this.domElement.style.animationPlayState = "running";
    if (typeof this.domElement.getAnimations === "function") {
      for (const anim of this.domElement.getAnimations({ subtree: true })) {
        anim.play();
      }
    }
    for (const listener of this.playListeners) {
      listener();
    }
  }

  /**
   * Pauses all CSS and Web Animations running on this element and its subtree to save CPU/GPU cycles.
   */
  pause(): void {
    if (!this.isPlaying) return;
    this.isPlaying = false;
    this.domElement.style.animationPlayState = "paused";
    if (typeof this.domElement.getAnimations === "function") {
      for (const anim of this.domElement.getAnimations({ subtree: true })) {
        anim.pause();
      }
    }
    for (const listener of this.pauseListeners) {
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
