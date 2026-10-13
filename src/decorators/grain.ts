/**
 * Adds an animated film grain texture overlay to give the stage a tactile, cinematic look.
 */

import type { Background, ReactiveElementBase } from "../core/types";
import type { DOMElement } from "../dom/element";

/**
 * Configuration options for the film grain texture decorator.
 * @category Decorators
 * @inline
 */
export interface GrainOptions {
  /** Film grain opacity from 0 to 1 (default: 0.12). */
  opacity?: number;
  /** Granularity scale factor in pixels (default: 1). Higher values produce larger grain blocks. */
  granularity?: number;
  /** Noise tile size in pixels (default: 512). */
  size?: number;
  /** Whether the grain subtly flickers/moves (default: true). */
  animated?: boolean;
}

function generateNoiseTile(size: number, grainBlock: number): string {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;
  const blockSize = Math.max(1, Math.round(grainBlock));

  for (let y = 0; y < size; y += blockSize) {
    for (let x = 0; x < size; x += blockSize) {
      const val = Math.floor(Math.random() * 255);
      const alpha = Math.floor(Math.random() * 160 + 60);

      for (let dy = 0; dy < blockSize && y + dy < size; dy++) {
        for (let dx = 0; dx < blockSize && x + dx < size; dx++) {
          const idx = ((y + dy) * size + (x + dx)) * 4;
          data[idx] = val;
          data[idx + 1] = val;
          data[idx + 2] = val;
          data[idx + 3] = alpha;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL("image/png");
}

function createGrainContainer(
  options: GrainOptions,
  frames: string[],
): { element: HTMLDivElement; cleanup: () => void } {
  const { opacity = 0.12 } = options;

  const grainEl = document.createElement("div");
  grainEl.className = "sr-grain";
  grainEl.style.position = "absolute";
  grainEl.style.inset = "0";
  grainEl.style.width = "100%";
  grainEl.style.height = "100%";
  grainEl.style.backgroundImage = `url("${frames[0]}")`;
  grainEl.style.backgroundRepeat = "repeat";
  grainEl.style.opacity = `${opacity}`;
  grainEl.style.pointerEvents = "none";
  grainEl.style.borderRadius = "inherit";
  grainEl.style.zIndex = "0";

  return {
    element: grainEl,
    cleanup() {
      grainEl.remove();
    },
  };
}

/**
 * Decorates an element or background with a film grain texture.
 * @category Decorators
 */
export function grain(options: GrainOptions = {}) {
  const { granularity = 1, size = 512 } = options;

  return (target: DOMElement | Background | ReactiveElementBase | HTMLElement) => {
    // Pre-generate 3 unique high-entropy random noise frames
    const frames = [
      generateNoiseTile(size, granularity),
      generateNoiseTile(size, granularity),
      generateNoiseTile(size, granularity),
    ];

    const el =
      "domElement" in target && target.domElement ? target.domElement : (target as HTMLElement);
    const { element, cleanup } = createGrainContainer(options, frames);
    let detach = () => {};
    if (
      "onUpdate" in target &&
      typeof target.onUpdate === "function" &&
      options.animated !== false
    ) {
      let lastFrame = -1;
      detach = target.onUpdate(() => {
        const frame = Math.floor(performance.now() / 100);
        if (frame === lastFrame) return;
        lastFrame = frame;
        element.style.backgroundImage = `url("${frames[frame % frames.length]}")`;
      });
    }
    const dispose = () => {
      detach();
      cleanup();
    };
    if ("onUnmount" in target && typeof target.onUnmount === "function") target.onUnmount(dispose);
    el.style.position = el.style.position || "relative";
    el.appendChild(element);
    return { dispose };
  };
}
