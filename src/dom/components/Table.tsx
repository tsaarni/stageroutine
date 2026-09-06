/**
 * Glassmorphic Table component with column alignment, row proxies, and interactive row-level focus.
 */

import "./Table.css";
import { getActiveStage } from "../../core/stage";
import { type StaggerBuilder, type StaggerOptions, stagger } from "../../motion/stagger";
import { DOMElement, type ElementOptions } from "../element";
import { attachRangeSelection } from "../interaction";

/**
 * Configuration options for the glassmorphic Table component.
 * @category Components
 */
export interface TableOptions extends ElementOptions {
  /** Column header labels displayed in the table header row. */
  headers?: string[];
  /** Two-dimensional matrix of row cell values (strings, numbers, or elements). */
  rows: (string | number | HTMLElement)[][];
  /** Text alignment per column ("left", "center", or "right", default: "left"). */
  align?: ("left" | "center" | "right")[];
  /** Additional CSS class name. */
  className?: string;
  /** Whether clicking or dragging rows focuses them interactively (default: true). */
  interactive?: boolean;
}

/**
 * @internal
 */
export class TableElement extends DOMElement {
  readonly rows: DOMElement[];
  private controller: ReturnType<typeof attachRangeSelection>;

  get focusedRange(): [number, number] | null {
    return this.controller.focusedRange;
  }

  get focusedIndex(): number | null {
    return this.controller.focusedIndex;
  }

  constructor(options: TableOptions) {
    const isHiddenInitially = options.opacity === 0;
    const containerOptions = isHiddenInitially ? { ...options, opacity: 1 } : options;
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
    const isInteractive = options.interactive ?? true;

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
        opacity: isHiddenInitially ? 0 : 1,
        x: isHiddenInitially ? 2 : 0,
        y: 0,
        style: {
          position: "relative",
        },
      });
      const proxyRow = stage ? (stage.registerElement(rowDOM) as DOMElement) : rowDOM;
      childRowElements.push(proxyRow);
    }

    const controller = attachRangeSelection({
      container,
      getItems: () => rawRowElements,
      interactive: isInteractive,
    });

    super("Table", container, containerOptions);

    this.rows = childRowElements;
    this.controller = controller;
  }

  focusRows(start: number, end: number = start): this {
    this.controller.focus(start, end);
    return this;
  }

  unfocus(): this {
    this.controller.unfocus();
    return this;
  }

  reveal(options?: StaggerOptions): StaggerBuilder {
    return stagger(this.rows, options);
  }
}

/**
 * Glassmorphic Table component with column alignment, row proxies, and interactive row-level focus.
 * @category Components
 */
export function Table(options: TableOptions): TableElement {
  const stage = getActiveStage();
  const el = new TableElement(options);
  return stage ? (stage.registerElement(el) as TableElement) : el;
}
