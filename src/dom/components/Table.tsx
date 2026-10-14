/**
 * Table component with column alignment, row proxies, and interactive row-level focus.
 */

import "./Table.css";
import { getActiveStage } from "../../core/index";
import { type StaggerOptions, type StaggerTransition, stagger } from "../../motion/stagger";
import { type DOMElement, DOMElementImpl, type ElementOptions, mount } from "../element";
import { attachRangeSelection } from "../interaction";

/**
 * Configuration options for the Table component.
 * @category Components
 * @inline
 */
export interface TableOptions extends ElementOptions {
  /** Hide body rows initially for reveal (default: false). */
  rowsHidden?: boolean;
  /** Column header labels displayed in the table header row. */
  headers?: string[];
  /** Two-dimensional matrix of row cell values (strings, numbers, or elements). */
  rows: (string | number | HTMLElement | DOMElement)[][];
  /** Text alignment per column (default: "left"). */
  columnAlign?: ("left" | "center" | "right")[];
  /** Additional CSS class name. */
  className?: string;
  /** Whether clicking or dragging rows focuses them interactively (default: true). */
  interactive?: boolean;
}

/** Public controls for a table. @category Components */
export interface TableElement extends DOMElement {
  readonly rows: readonly DOMElement[];
  reveal(options?: StaggerOptions): StaggerTransition;
}

/**
 * @internal
 */
class TableElementImpl extends DOMElementImpl implements TableElement {
  readonly rows: readonly DOMElement[];

  constructor(options: TableOptions) {
    const { columnAlign: tableAlign, ...elementOpts } = options;
    const isHiddenInitially = options.rowsHidden ?? false;
    const containerOptions = elementOpts;
    const container = document.createElement("div");
    container.className = ["sr-table-container", options.className].filter(Boolean).join(" ");

    const table = document.createElement("table");
    table.className = "sr-table";
    container.appendChild(table);

    const align = options.columnAlign || [];

    if (options.headers && options.headers.length > 0) {
      const thead = document.createElement("thead");
      const tr = document.createElement("tr");
      options.headers.forEach((h, colIdx) => {
        const th = document.createElement("th");
        th.textContent = h;
        const colAlign = align[colIdx];
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
        if (cellData instanceof HTMLElement) {
          td.appendChild(cellData);
        } else if (cellData instanceof DOMElementImpl) {
          td.appendChild(cellData.domElement);
        } else {
          td.textContent = String(cellData);
        }
        const colAlign = align[colIdx];
        if (colAlign) {
          td.style.textAlign = colAlign;
        }
        tr.appendChild(td);
      });

      tbody.appendChild(tr);
      rawRowElements.push(tr);

      const rowDOM = new DOMElementImpl("TableRow", tr, {
        opacity: isHiddenInitially ? 0 : 1,
        x: isHiddenInitially ? 2 : 0,
        y: 0,
        style: {
          position: "relative",
        },
      });
      const proxyRow = mount(rowDOM);
      childRowElements.push(proxyRow);
    }

    const controller = attachRangeSelection({
      container,
      getItems: () => rawRowElements,
      interactive: isInteractive,
    });

    super("Table", container, containerOptions);

    this.onUnmount(() => controller.destroy());
    this.rows = childRowElements;
  }

  reveal(options?: StaggerOptions): StaggerTransition {
    const stage = getActiveStage();
    for (const row of this.rows) {
      const currentOpacity = stage
        ? (stage._getCurrentPropertyValue(row.id, "opacity") as number | undefined)
        : (row.opacity as number | undefined);
      const currentX = stage
        ? (stage._getCurrentPropertyValue(row.id, "x") as number | string | undefined)
        : (row.x as number | string | undefined);
      if (currentOpacity === undefined || currentOpacity === 1) {
        if (stage) {
          stage._setCurrentPropertyValue(row.id, "opacity", 0);
        } else {
          row.opacity = 0;
        }
      }
      if (currentX === undefined || currentX === 0) {
        if (stage) {
          stage._setCurrentPropertyValue(row.id, "x", 2);
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
  return mount(new TableElementImpl(options));
}
