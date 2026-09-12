/**
 * Base class for full-screen backgrounds with automatic resizing and render loop management.
 */

import type { Background, BackgroundDecorator, StageContext } from "../../core/types";

let nextBgId = 1;

/**
 * Base options for background elements.
 * @category Backgrounds
 */
export interface BackgroundOptions {
  id?: string;
  className?: string;
  /** Optional initial opacity (default: 1). */
  opacity?: number;
}

/**
 * Base element for procedural WebGL and canvas backgrounds.
 * Handles resize observation, full-bleed container positioning,
 * and automatic render loop pausing when invisible.
 * @internal
 */
export abstract class BackgroundElement implements Background {
  readonly id: string;
  readonly kind: string;
  readonly domElement: HTMLElement;
  protected isRunning = false;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;

  constructor(kind: string, options: BackgroundOptions = {}) {
    this.id = options.id || `bg-${kind.toLowerCase()}-${nextBgId++}`;
    this.kind = kind;

    const container = document.createElement("div");
    container.className = `sr-background sr-bg-${kind.toLowerCase()}${options.className ? ` ${options.className}` : ""}`;
    container.style.position = "absolute";
    container.style.inset = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.pointerEvents = "none";
    container.style.zIndex = "0";
    container.style.overflow = "hidden";
    if (options.opacity !== undefined) {
      container.style.opacity = `${options.opacity}`;
    }
    this.domElement = container;

    // Auto-pause continuous RAF loop when invisible (0% GPU/CPU waste)
    this.mutationObserver = new MutationObserver(() => {
      const op = Number.parseFloat(this.domElement.style.opacity);
      const isVisible =
        (Number.isNaN(op) || op > 0.01) && this.domElement.style.visibility !== "hidden";
      if (isVisible && !this.isRunning) {
        this.resume();
      } else if (!isVisible && this.isRunning) {
        this.pause();
      }
    });
    this.mutationObserver.observe(this.domElement, {
      attributes: true,
      attributeFilter: ["style"],
    });

    // Self-contained ResizeObserver
    this.resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          this.onResize(width, height);
        }
      }
    });
    this.resizeObserver.observe(this.domElement);
  }

  decorate(decorator: BackgroundDecorator): this {
    decorator(this);
    return this;
  }

  play(): void {
    this.resume();
  }

  /** Called when container dimensions change */
  abstract onResize(width: number, height: number): void;

  /** Starts or resumes the continuous WebGL render loop */
  abstract resume(): void;

  /** Pauses the continuous WebGL render loop when hidden */
  abstract pause(): void;

  /** Clean up WebGL resources, geometries, textures, and observers */
  dispose(): void {
    this.pause();
    this.mutationObserver?.disconnect();
    this.resizeObserver?.disconnect();
    this.domElement.remove();
  }

  /** Lifecycle attach hook invoked when the background is attached to a stage */
  attach(stage: StageContext): void {
    if (!this.domElement.parentElement) {
      stage.container.prepend(this.domElement);
    }
    this.resume();
    this.onResize(window.innerWidth, window.innerHeight);
  }

  /** @internal Diagnostic metrics queried on-demand by Stage via window.__STAGEROUTINE_DEV__.getMetrics() */
  _getMetrics(): Record<string, unknown> {
    return {
      kind: this.kind,
      is_running: this.isRunning ? 1 : 0,
      is_mounted: Boolean(this.domElement.isConnected),
      opacity: Number.parseFloat(this.domElement.style.opacity) || 1,
    };
  }
}
