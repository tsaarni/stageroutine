/**
 * Bullet list component where individual bullet points can be animated independently via .items.
 */

import { getActiveStage } from "../../core/stage";
import { DOMElement, type ElementOptions } from "../element";

export interface BulletListOptions extends ElementOptions {
  itemSpacing?: number;
  color?: string;
  className?: string;
}

export interface BulletListElement extends DOMElement {
  items: DOMElement[];
}

export function BulletList(items: string[], options: BulletListOptions = {}): BulletListElement {
  const container = document.createElement("div");
  container.className = ["sr-bullet-list", options.className].filter(Boolean).join(" ");
  if (options.itemSpacing) {
    container.style.gap = `${options.itemSpacing}px`;
  }

  const stage = getActiveStage();
  const childElements: DOMElement[] = [];

  for (const itemText of items) {
    const itemEl = document.createElement("div");
    itemEl.className = "sr-bullet-item";

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
      opacity: 1,
      x: 0,
      y: 0,
      style: {
        position: "relative",
      },
    });

    const proxyItem = stage.registerElement(childDOM);
    childElements.push(proxyItem);
  }

  const parentDOM = new DOMElement("BulletList", container, options) as BulletListElement;
  const proxyParent = stage.registerElement(parentDOM) as BulletListElement;
  proxyParent.items = childElements;
  return proxyParent;
}
