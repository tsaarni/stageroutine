/**
 * Pure math layout engine (compute-and-apply) for arranging slide elements without wrapper DOM containers.
 */

import { to } from "../core/transitions";
import type { DOMElement } from "./element";

export interface LayoutOptions {
  x?: number;
  y?: number;
  gap?: number;
  gapX?: number;
  gapY?: number;
  cols?: number;
  animate?: boolean;
  duration?: number;
}

export const arrange = {
  /**
   * Arranges elements into a horizontal row.
   */
  row(elements: DOMElement[], options: LayoutOptions = {}): void {
    const isPercentage = (options.x ?? 100) <= 100;
    let currentX = options.x ?? (isPercentage ? 10 : 100);
    const y = options.y ?? (isPercentage ? 30 : 300);
    const gap = options.gap ?? (isPercentage ? 3 : 32);

    for (const el of elements) {
      if (options.animate) {
        el.x = to(currentX).duration(options.duration ?? 0.6);
        el.y = to(y).duration(options.duration ?? 0.6);
      } else {
        el.x = currentX;
        el.y = y;
      }

      const domWidth = el.domElement?.offsetWidth || 120;
      const width = isPercentage ? (domWidth / 1920) * 100 : domWidth;
      currentX += width + gap;
    }
  },

  /**
   * Arranges elements into a vertical column.
   */
  column(elements: DOMElement[], options: LayoutOptions = {}): void {
    const isPercentage = (options.x ?? 100) <= 100;
    const x = options.x ?? (isPercentage ? 10 : 100);
    let currentY = options.y ?? (isPercentage ? 20 : 200);
    const gap = options.gap ?? (isPercentage ? 3 : 24);

    for (const el of elements) {
      if (options.animate) {
        el.x = to(x).duration(options.duration ?? 0.6);
        el.y = to(currentY).duration(options.duration ?? 0.6);
      } else {
        el.x = x;
        el.y = currentY;
      }

      const domHeight = el.domElement?.offsetHeight || 60;
      const height = isPercentage ? (domHeight / 1080) * 100 : domHeight;
      currentY += height + gap;
    }
  },

  /**
   * Arranges elements into a multi-column grid.
   */
  grid(elements: DOMElement[], options: LayoutOptions = {}): void {
    const isPercentage = (options.x ?? 100) <= 100;
    const cols = options.cols ?? 3;
    const startX = options.x ?? (isPercentage ? 10 : 100);
    const startY = options.y ?? (isPercentage ? 20 : 200);
    const gapX = options.gapX ?? options.gap ?? (isPercentage ? 3 : 32);
    const gapY = options.gapY ?? options.gap ?? (isPercentage ? 3 : 32);

    elements.forEach((el, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);

      const domWidth = el.domElement?.offsetWidth || 120;
      const domHeight = el.domElement?.offsetHeight || 60;

      const width = isPercentage ? (domWidth / 1920) * 100 : domWidth;
      const height = isPercentage ? (domHeight / 1080) * 100 : domHeight;

      const targetX = startX + col * (width + gapX);
      const targetY = startY + row * (height + gapY);

      if (options.animate) {
        el.x = to(targetX).duration(options.duration ?? 0.6);
        el.y = to(targetY).duration(options.duration ?? 0.6);
      } else {
        el.x = targetX;
        el.y = targetY;
      }
    });
  },
};
