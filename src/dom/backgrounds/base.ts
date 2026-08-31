/**
 * Base class for full-screen backgrounds with automatic resizing and render loop management.
 */

import type { StageContext } from "../../core/types";
import { DOMElement, type ElementOptions } from "../element";

/**
 * Base options for background elements.
 * @category Backgrounds
 */
export interface BackgroundOptions extends ElementOptions {
  /** Optional initial opacity (default: 1). */
  opacity?: number;
}

/**
 * Base reactive element for procedural GPU/WebGL backgrounds.
 * Handles automatic resize observation, full-bleed viewport positioning,
 * and automatic render loop pausing when invisible (0% GPU waste).
 * @internal
 */
export abstract class BackgroundElement extends DOMElement {
  protected isRunning = false;
  private resizeObserver: ResizeObserver | null = null;
  private mutationObserver: MutationObserver | null = null;

  constructor(kind: string, options: BackgroundOptions = {}) {
    const container = document.createElement("div");
    container.className = `sr-background sr-bg-${kind.toLowerCase()}`;
    container.style.position = "absolute";
    container.style.inset = "0";
    container.style.width = "100%";
    container.style.height = "100%";
    container.style.pointerEvents = "none";
    container.style.zIndex = "0";
    container.style.overflow = "hidden";

    super(kind, container, {
      ...options,
      x: options.x ?? 0,
      y: options.y ?? 0,
      opacity: 1,
    });

    // Reset transform since background is full-bleed and outside container query context
    this.domElement.style.transform = "none";
    this.domElement.style.transformOrigin = "0 0";
    this.domElement.style.zIndex = "0";
    this.domElement.style.pointerEvents = "none";

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

  /** Called when container dimensions change */
  abstract onResize(width: number, height: number): void;

  /** Starts or resumes the continuous WebGL render loop */
  abstract resume(): void;

  /** Resumes both CSS animations and the WebGL render loop */
  override play(): void {
    super.play();
    this.resume();
  }

  /** Pauses the continuous WebGL render loop to save 100% GPU/CPU when hidden */
  override pause(): void {
    super.pause();
  }

  /** Clean up WebGL resources, geometries, textures, and observers */
  abstract dispose(): void;

  /** Lifecycle attach hook for compatibility with createStage({ background }) */
  attach(stage: StageContext): void {
    if (!this.domElement.parentElement) {
      stage.container.prepend(this.domElement);
    }
    this.resume();
    this.onResize(window.innerWidth, window.innerHeight);

    // Register background lifecycle metrics
    if (
      "metrics" in stage &&
      typeof (stage as unknown as { metrics: { register: (k: string, g: () => unknown) => void } })
        .metrics.register === "function"
    ) {
      (
        stage as unknown as { metrics: { register: (k: string, g: () => unknown) => void } }
      ).metrics.register(`background.${this.kind.toLowerCase()}`, () => ({
        is_running: this.isRunning ? 1 : 0,
        is_mounted: Boolean(this.domElement.isConnected),
        opacity: Number.parseFloat(this.domElement.style.opacity) || 1,
      }));
    }
  }
}
