/**
 * Bullet list component with individual bullet point animation and interactive click-and-drag focus.
 */

import { getActiveStage } from "../../core/stage";
import { type StaggerBuilder, type StaggerOptions, stagger } from "../../motion/stagger";
import { DOMElement, type ElementOptions } from "../element";
import { attachRangeSelection } from "../interaction";

/**
 * Configuration options for the BulletList component.
 * @category Components
 */
export interface BulletListOptions extends ElementOptions {
  itemSpacing?: number;
  color?: string;
  className?: string;
  /** Whether clicking or dragging bullet items focuses them interactively. Defaults to true. */
  interactive?: boolean;
}

/**
 * @internal
 */
export interface BulletListElement extends DOMElement {
  items: DOMElement[];
  readonly focusedRange: [number, number] | null;
  readonly focusedIndex: number | null;
  focus(index: number): this;
  focusItems(start: number, end?: number): this;
  unfocus(): this;
  reveal(options?: StaggerOptions): StaggerBuilder;
}

/**
 * Bullet list component with individual bullet point animation and interactive click-and-drag focus.
 * @category Components
 */
export function BulletList(items: string[], options: BulletListOptions = {}): BulletListElement {
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

    const proxyItem = stage.registerElement(childDOM);
    childElements.push(proxyItem);
  }

  const controller = attachRangeSelection({
    container,
    getItems: () => rawItemElements,
    interactive: isInteractive,
  });

  const parentDOM = new DOMElement("BulletList", container, containerOptions) as BulletListElement;
  parentDOM.items = childElements;

  parentDOM.focus = function (this: BulletListElement, index: number) {
    controller.focus(index);
    return this;
  };

  parentDOM.focusItems = function (this: BulletListElement, start: number, end: number = start) {
    controller.focus(start, end);
    return this;
  };

  parentDOM.unfocus = function (this: BulletListElement) {
    controller.unfocus();
    return this;
  };

  parentDOM.reveal = function (this: BulletListElement, options?: StaggerOptions) {
    return stagger(this.items, options);
  };

  Object.defineProperty(parentDOM, "focusedRange", {
    get() {
      return controller.focusedRange;
    },
    enumerable: true,
  });

  Object.defineProperty(parentDOM, "focusedIndex", {
    get() {
      return controller.focusedIndex;
    },
    enumerable: true,
  });

  const proxyParent = stage.registerElement(parentDOM) as BulletListElement;
  proxyParent.items = childElements;
  return proxyParent;
}
