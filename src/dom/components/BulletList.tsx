/**
 * Bullet list component with individual bullet point animation and interactive click-and-drag focus.
 */

import "./BulletList.css";
import { getActiveStage } from "../../core/stage";
import { type StaggerBuilder, type StaggerOptions, stagger } from "../../motion/stagger";
import { DOMElement, type ElementOptions } from "../element";
import { attachRangeSelection } from "../interaction";

/**
 * Configuration options for the BulletList component.
 * @category Components
 */
export interface BulletListOptions extends ElementOptions {
  /** Vertical spacing between bullet items in pixels (default: 16). */
  itemSpacing?: number;
  /** Foreground text and bullet dot color. */
  color?: string;
  /** Additional CSS class name. */
  className?: string;
  /** Whether clicking or dragging bullet items focuses them interactively (default: true). */
  interactive?: boolean;
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

  constructor(items: string[], options: BulletListOptions = {}) {
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

    for (const itemText of items) {
      const itemEl = document.createElement("div");
      itemEl.className = "sr-bullet-item";
      rawItemElements.push(itemEl);

      const dot = document.createElement("span");
      dot.className = "sr-bullet-dot";
      if (options.color) dot.style.backgroundColor = options.color;

      const text = document.createElement("span");
      text.textContent = itemText;
      if (options.color) text.style.color = options.color;

      itemEl.appendChild(dot);
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
export function BulletList(items: string[], options: BulletListOptions = {}): BulletListElement {
  const stage = getActiveStage();
  const el = new BulletListElement(items, options);
  return stage ? (stage.registerElement(el) as BulletListElement) : el;
}
