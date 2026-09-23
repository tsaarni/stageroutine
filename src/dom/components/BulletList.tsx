/**
 * Bullet list component with individual bullet point animation and interactive click-and-drag focus.
 */

import "./BulletList.css";
import type { Properties as CSSProperties } from "csstype";
import { getActiveStage } from "../../core/stage";
import { type StaggerOptions, type StaggerTransition, stagger } from "../../motion/stagger";
import type { ThemeConfig } from "../../theme/tokens";
import { DOMElement, type ElementOptions } from "../element";
import { attachRangeSelection } from "../interaction";

/**
 * A single bullet item with optional per-item overrides.
 * @category Components
 * @inline
 */
export interface BulletItem {
  /** Item text. */
  text: string;
  /** Marker glyph for this item (overrides list-level `marker`). */
  marker?: string;
  /** Marker color for this item (overrides list-level `markerColor` and fallback `color`). */
  markerColor?: string;
  /** Text and marker color for this item (overrides list-level `color`). */
  color?: string;
  /** Additional CSS class name. */
  className?: string;
  /** Inline styles for this item. */
  style?: CSSProperties | Partial<CSSStyleDeclaration>;
  /** Theme token overrides for this item. */
  theme?: Partial<ThemeConfig>;
  /** Nested sub-items indented under this bullet item. */
  children?: BulletItemInput | BulletItemInput[];
}

/**
 * Item specification for a bullet list: plain text, a styled item, or a nested array for indentation.
 * @category Components
 */
export type BulletItemInput = string | BulletItem | BulletItemInput[];

/**
 * Configuration options for the BulletList component.
 * @category Components
 * @inline
 */
export interface BulletListOptions extends ElementOptions {
  /** Vertical spacing between bullet items in pixels (default: 16). */
  itemSpacing?: number;
  /** Marker symbol(s) for bullet points (default: "–"). Single symbol or an array per depth level. A per-item `marker` overrides this. */
  marker?: string | string[];
  /** Default marker color for bullet points (overrides `color` for markers). A per-item `markerColor` overrides this. */
  markerColor?: string;
  /** Foreground text and bullet marker color. */
  color?: string;
  /** Additional CSS class name. */
  className?: string;
  /** Whether clicking or dragging bullet items focuses them interactively (default: true). */
  interactive?: boolean;
}

interface NormalizedBulletItem extends Omit<BulletItem, "children"> {
  readonly level: number;
}

function formatInvalidItem(item: unknown): string {
  if (item === null) return "null";
  if (typeof item === "object") return JSON.stringify(item);
  return String(item);
}

function* flattenBulletItems(
  items: readonly BulletItemInput[],
  level = 0,
): Generator<NormalizedBulletItem> {
  for (const item of items) {
    if (Array.isArray(item)) {
      yield* flattenBulletItems(item, level + 1);
    } else if (typeof item === "string") {
      yield { text: item, level };
    } else if (
      typeof item === "object" &&
      item !== null &&
      "text" in item &&
      typeof item.text === "string"
    ) {
      const { children, ...bulletItem } = item;
      yield { ...bulletItem, level };
      if (children) {
        const childList = Array.isArray(children) ? children : [children];
        yield* flattenBulletItems(childList, level + 1);
      }
    } else {
      throw new TypeError(
        `[BulletList] Invalid item at level ${level}: expected string or object with 'text', received ${formatInvalidItem(item)}`,
      );
    }
  }
}

function resolveMarker(marker: string | readonly string[] | undefined, level: number): string {
  if (marker === undefined) return "–";
  if (typeof marker === "string") return marker;
  if (marker.length === 0) return "–";
  return marker[Math.min(level, marker.length - 1)];
}

/** Public controls for a bullet list. @category Components */
export interface BulletListElement extends DOMElement {
  readonly items: DOMElement[];
  reveal(options?: StaggerOptions): StaggerTransition;
}

/**
 * @internal
 */
class BulletListElementImpl extends DOMElement implements BulletListElement {
  readonly items: DOMElement[];

  constructor(items: BulletItemInput[], options: BulletListOptions = {}) {
    const isHiddenInitially = options.opacity === 0;
    const containerOptions = isHiddenInitially ? { ...options, opacity: 1 } : options;
    const container = document.createElement("div");
    container.className = ["sr-bullet-list", options.className].filter(Boolean).join(" ");
    if (options.itemSpacing !== undefined) {
      container.style.gap = `${options.itemSpacing}px`;
    }

    const isInteractive = options.interactive ?? true;
    const rawItemElements: HTMLElement[] = [];
    const stage = getActiveStage();
    const childElements: DOMElement[] = [];

    for (const item of flattenBulletItems(items)) {
      const itemEl = document.createElement("div");
      itemEl.className = "sr-bullet-item";
      if (item.level > 0) {
        itemEl.dataset.level = String(item.level);
        itemEl.style.setProperty("--sr-bullet-level", String(item.level));
      }
      rawItemElements.push(itemEl);

      const markerColor = item.markerColor ?? options.markerColor ?? item.color ?? options.color;
      const textColor = item.color ?? options.color;

      const markerEl = document.createElement("span");
      markerEl.className = "sr-bullet-marker";
      markerEl.textContent = item.marker ?? resolveMarker(options.marker, item.level);
      if (markerColor) {
        markerEl.style.color = markerColor;
        markerEl.style.setProperty("--sr-bullet-marker-color", markerColor);
      }

      const text = document.createElement("span");
      text.textContent = item.text;
      if (textColor) text.style.color = textColor;

      itemEl.appendChild(markerEl);
      itemEl.appendChild(text);
      container.appendChild(itemEl);

      const childDOM = new DOMElement("BulletItem", itemEl, {
        opacity: isHiddenInitially ? 0 : 1,
        x: isHiddenInitially ? 2 : 0,
        y: 0,
        className: item.className,
        style: {
          position: "relative",
          ...item.style,
        } as CSSProperties | Partial<CSSStyleDeclaration>,
        theme: item.theme,
      });

      const proxyItem = stage ? (stage.registerElement(childDOM) as DOMElement) : childDOM;
      childElements.push(proxyItem);
    }

    super("BulletList", container, containerOptions);

    this.items = childElements;

    attachRangeSelection({
      container,
      getItems: () => rawItemElements,
      interactive: isInteractive,
    });
  }

  reveal(options?: StaggerOptions): StaggerTransition {
    const stage = getActiveStage();
    for (const item of this.items) {
      const currentOpacity = stage
        ? (stage.getCurrentPropertyValue(item.id, "opacity") as number | undefined)
        : (item.opacity as number | undefined);
      const currentX = stage
        ? (stage.getCurrentPropertyValue(item.id, "x") as number | string | undefined)
        : (item.x as number | string | undefined);
      if (currentOpacity === undefined || currentOpacity === 1) {
        if (stage) {
          stage.setCurrentPropertyValue(item.id, "opacity", 0);
        } else {
          item.opacity = 0;
        }
      }
      if (currentX === undefined || currentX === 0) {
        if (stage) {
          stage.setCurrentPropertyValue(item.id, "x", 2);
        } else {
          item.x = 2;
        }
      }
    }
    return stagger(this.items, { props: { opacity: 1, x: 0 }, ...options });
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
  const el = new BulletListElementImpl(items, options);
  return stage ? (stage.registerElement(el) as BulletListElement) : el;
}
