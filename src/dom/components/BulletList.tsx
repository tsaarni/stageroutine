/**
 * Bullet list component with individual bullet point animation and interactive click-and-drag focus.
 */

import "./BulletList.css";
import { getActiveStage } from "../../core/stage";
import { type StaggerBuilder, type StaggerOptions, stagger } from "../../motion/stagger";
import { DOMElement, type ElementOptions } from "../element";
import { attachRangeSelection } from "../interaction";

/**
 * Item specification for a bullet list. Can be a string or a nested array of items.
 * @category Components
 */
export type BulletItemInput = string | BulletItemInput[];

/**
 * Configuration options for the BulletList component.
 * @category Components
 */
export interface BulletListOptions extends ElementOptions {
  /** Vertical spacing between bullet items in pixels (default: 16). */
  itemSpacing?: number;
  /** Marker symbol(s) for bullet points (default: "–"). Can be a single symbol or an array per depth level. */
  marker?: string | string[];
  /** Foreground text and bullet marker color. */
  color?: string;
  /** Additional CSS class name. */
  className?: string;
  /** Whether clicking or dragging bullet items focuses them interactively (default: true). */
  interactive?: boolean;
}

interface FlattenedBulletItem {
  readonly text: string;
  readonly level: number;
}

function flattenBulletItems(items: readonly BulletItemInput[], level = 0): FlattenedBulletItem[] {
  const result: FlattenedBulletItem[] = [];
  for (const item of items) {
    if (Array.isArray(item)) {
      result.push(...flattenBulletItems(item, level + 1));
    } else {
      result.push({ text: String(item), level });
    }
  }
  return result;
}

function resolveMarker(marker: string | readonly string[] | undefined, level: number): string {
  if (marker === undefined) return "–";
  if (typeof marker === "string") return marker;
  if (marker.length === 0) return "–";
  return marker[Math.min(level, marker.length - 1)];
}

/**
 * @internal
 */
export class BulletListElement extends DOMElement {
  readonly items: DOMElement[];
  private controller: ReturnType<typeof attachRangeSelection>;

  get focusedRange(): [number, number] | null {
    return this.controller.focusedRange;
  }

  get focusedIndex(): number | null {
    return this.controller.focusedIndex;
  }

  constructor(items: BulletItemInput[], options: BulletListOptions = {}) {
    const isHiddenInitially = options.opacity === 0;
    const containerOptions = isHiddenInitially ? { ...options, opacity: 1 } : options;
    const container = document.createElement("div");
    container.className = ["sr-bullet-list", options.className].filter(Boolean).join(" ");
    if (options.itemSpacing) {
      container.style.gap = `${options.itemSpacing}px`;
    }

    const isInteractive = options.interactive ?? true;
    const rawItemElements: HTMLElement[] = [];
    const stage = getActiveStage();
    const childElements: DOMElement[] = [];
    const flattened = flattenBulletItems(items);

    for (const { text: itemText, level } of flattened) {
      const itemEl = document.createElement("div");
      itemEl.className = "sr-bullet-item";
      if (level > 0) {
        itemEl.dataset.level = String(level);
        itemEl.style.setProperty("--sr-bullet-level", String(level));
      }
      rawItemElements.push(itemEl);

      const markerEl = document.createElement("span");
      markerEl.className = "sr-bullet-marker";
      markerEl.textContent = resolveMarker(options.marker, level);
      if (options.color) markerEl.style.color = options.color;

      const text = document.createElement("span");
      text.textContent = itemText;
      if (options.color) text.style.color = options.color;

      itemEl.appendChild(markerEl);
      itemEl.appendChild(text);
      container.appendChild(itemEl);

      const childDOM = new DOMElement("BulletItem", itemEl, {
        opacity: isHiddenInitially ? 0 : 1,
        x: isHiddenInitially ? 2 : 0,
        y: 0,
        style: {
          position: "relative",
        },
      });

      const proxyItem = stage ? (stage.registerElement(childDOM) as DOMElement) : childDOM;
      childElements.push(proxyItem);
    }

    super("BulletList", container, containerOptions);

    this.items = childElements;

    this.controller = attachRangeSelection({
      container,
      getItems: () => rawItemElements,
      interactive: isInteractive,
    });
  }

  focus(index: number): this {
    this.controller.focus(index);
    return this;
  }

  focusItems(start: number, end: number = start): this {
    this.controller.focus(start, end);
    return this;
  }

  unfocus(): this {
    this.controller.unfocus();
    return this;
  }

  reveal(options?: StaggerOptions): StaggerBuilder {
    return stagger(this.items, options);
  }
}

/**
 * Bullet list component with individual bullet point animation and interactive click-and-drag focus.
 * @category Components
 */
export function BulletList(
  items: BulletItemInput[],
  options: BulletListOptions = {},
): BulletListElement {
  const stage = getActiveStage();
  const el = new BulletListElement(items, options);
  return stage ? (stage.registerElement(el) as BulletListElement) : el;
}
