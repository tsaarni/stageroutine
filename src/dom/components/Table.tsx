/**
 * Table component with column alignment, row proxies, and interactive row-level focus.
 */

import "./Table.css";
import { getActiveStage } from "../../core/stage";
import type { Align } from "../../core/types";
import { type StaggerOptions, type StaggerTransition, stagger } from "../../motion/stagger";
import { DOMElement, type ElementOptions } from "../element";
import { attachRangeSelection } from "../interaction";

function resolveColumnTextAlign(align?: Align): "left" | "center" | "right" | undefined {
  if (!align) return undefined;
  if (align.includes("right")) return "right";
  if (align.includes("left")) return "left";
  return "center";
}

/**
 * Configuration options for the Table component.
 * @category Components
 * @inline
 */
export interface TableOptions extends Omit<ElementOptions, "align"> {
  /** Column header labels displayed in the table header row. */
  headers?: string[];
  /** Two-dimensional matrix of row cell values (strings, numbers, or elements). */
  rows: (string | number | HTMLElement)[][];
  /** Text alignment per column (default: "left"). */
  align?: Align[];
  /** Additional CSS class name. */
  className?: string;
  /** Whether clicking or dragging rows focuses them interactively (default: true). */
  interactive?: boolean;
}

/** Public controls for a table. @category Components */
export interface TableElement extends DOMElement {
  readonly rows: DOMElement[];
  reveal(options?: StaggerOptions): StaggerTransition;
}

/**
 * @internal
 */
class TableElementImpl extends DOMElement implements TableElement {
  readonly rows: DOMElement[];

  constructor(options: TableOptions) {
    const { align: tableAlign, ...elementOpts } = options;
    const isHiddenInitially = elementOpts.opacity === 0;
    const containerOptions = isHiddenInitially ? { ...elementOpts, opacity: 1 } : elementOpts;
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
        const colAlign = resolveColumnTextAlign(align[colIdx]);
        if (colAlign) {
          th.style.textAlign = colAlign;
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
        const colAlign = resolveColumnTextAlign(align[colIdx]);
        if (colAlign) {
          td.style.textAlign = colAlign;
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

    attachRangeSelection({
      container,
      getItems: () => rawRowElements,
      interactive: isInteractive,
    });

    super("Table", container, containerOptions);

    this.rows = childRowElements;
  }

  reveal(options?: StaggerOptions): StaggerTransition {
    const stage = getActiveStage();
    for (const row of this.rows) {
      const currentOpacity = stage
        ? (stage.getCurrentPropertyValue(row.id, "opacity") as number | undefined)
        : (row.opacity as number | undefined);
      const currentX = stage
        ? (stage.getCurrentPropertyValue(row.id, "x") as number | string | undefined)
        : (row.x as number | string | undefined);
      if (currentOpacity === undefined || currentOpacity === 1) {
        if (stage) {
          stage.setCurrentPropertyValue(row.id, "opacity", 0);
        } else {
          row.opacity = 0;
        }
      }
      if (currentX === undefined || currentX === 0) {
        if (stage) {
          stage.setCurrentPropertyValue(row.id, "x", 2);
        } else {
          row.x = 2;
        }
      }
    }
    return stagger(this.rows, { props: { opacity: 1, x: 0 }, ...options });
  }
}

/**
 * Table component with column alignment, row proxies, and interactive row-level focus.
 * @category Components
 */
export function Table(options: TableOptions): TableElement {
  const stage = getActiveStage();
  const el = new TableElementImpl(options);
  return stage ? (stage.registerElement(el) as TableElement) : el;
}
