/**
 * Adds an animated film grain texture overlay to give slides a tactile, cinematic look.
 */

import type { DOMElement } from "../dom/element";

export interface GrainOptions {
  /** Film grain opacity from 0 to 1 (default: 0.12). */
  opacity?: number;
  /** Granularity scale factor in pixels (default: 1. Higher numbers produce larger, chunkier grain blocks). */
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
  const { opacity = 0.12, animated = true } = options;

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

  let animTimer: ReturnType<typeof setInterval> | null = null;
  if (animated) {
    let frameIdx = 0;
    animTimer = setInterval(() => {
      if (!grainEl) return;
      frameIdx = (frameIdx + 1) % frames.length;
      grainEl.style.backgroundImage = `url("${frames[frameIdx]}")`;
    }, 100);
  }

  return {
    element: grainEl,
    cleanup() {
      if (animTimer) {
        clearInterval(animTimer);
        animTimer = null;
      }
      grainEl.remove();
    },
  };
}

/**
 * Universal decorator: Adds tactile analog film grain texture to any Element, Card, or Background.
 */
export function grain(options: GrainOptions = {}) {
  const { granularity = 1, size = 512 } = options;

  return (target: DOMElement | HTMLElement) => {
    // Pre-generate 3 unique high-entropy random noise frames
    const frames = [
      generateNoiseTile(size, granularity),
      generateNoiseTile(size, granularity),
      generateNoiseTile(size, granularity),
    ];

    const el = "domElement" in target ? target.domElement : target;
    const { element } = createGrainContainer(options, frames);
    el.style.position = el.style.position || "relative";
    el.appendChild(element);
  };
}
