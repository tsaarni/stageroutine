/**
 * Glassmorphic Table component with column alignment, row proxies, and interactive row-level focus.
 */

import { getActiveStage } from "../../core/stage";
import { DOMElement, type ElementOptions } from "../element";
import { attachRangeSelection } from "../interaction";

export interface TableOptions extends ElementOptions {
  headers?: string[];
  rows: (string | number | HTMLElement)[][];
  align?: ("left" | "center" | "right")[];
  className?: string;
  /** Whether clicking or dragging rows focuses them interactively. Defaults to true. */
  interactive?: boolean;
}

export interface TableElement extends DOMElement {
  rows: DOMElement[];
  readonly focusedRange: [number, number] | null;
  readonly focusedIndex: number | null;
  focusRows(start: number, end?: number): this;
  unfocus(): this;
}

export function Table(options: TableOptions): TableElement {
  const container = document.createElement("div");
  container.className = ["sr-table-container", options.className].filter(Boolean).join(" ");

  const table = document.createElement("table");
  table.className = "sr-table";
  container.appendChild(table);

  const align = options.align || [];
  const stage = getActiveStage();

  if (options.headers && options.headers.length > 0) {
    const thead = document.createElement("thead");
    const tr = document.createElement("tr");
    options.headers.forEach((h, colIdx) => {
      const th = document.createElement("th");
      th.textContent = h;
      if (align[colIdx]) {
        th.style.textAlign = align[colIdx];
      }
      tr.appendChild(th);
    });
    thead.appendChild(tr);
    table.appendChild(thead);
  }

  const tbody = document.createElement("tbody");
  table.appendChild(tbody);

  const rawRowElements: HTMLElement[] = [];
  const childRowElements: DOMElement[] = [];

  for (const rowData of options.rows) {
    const tr = document.createElement("tr");
    tr.className = "sr-table-row";

    rowData.forEach((cellData, colIdx) => {
      const td = document.createElement("td");
      if (typeof cellData === "object" && cellData instanceof HTMLElement) {
        td.appendChild(cellData);
      } else {
        td.textContent = String(cellData);
      }
      if (align[colIdx]) {
        td.style.textAlign = align[colIdx];
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
    rawRowElements.push(tr);

    const rowDOM = new DOMElement("TableRow", tr, {
      opacity: 1,
      x: 0,
      y: 0,
      style: {
        position: "relative",
      },
    });
    const proxyRow = stage.registerElement(rowDOM);
    childRowElements.push(proxyRow);
  }

  const isInteractive = options.interactive ?? true;
  const controller = attachRangeSelection({
    container,
    getItems: () => rawRowElements,
    interactive: isInteractive,
  });

  const parentDOM = new DOMElement("Table", container, options) as TableElement;
  parentDOM.rows = childRowElements;

  parentDOM.focusRows = function (this: TableElement, start: number, end: number = start) {
    controller.focus(start, end);
    return this;
  };

  parentDOM.unfocus = function (this: TableElement) {
    controller.unfocus();
    return this;
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

  const proxyParent = stage.registerElement(parentDOM) as TableElement;
  proxyParent.rows = childRowElements;
  return proxyParent;
}
