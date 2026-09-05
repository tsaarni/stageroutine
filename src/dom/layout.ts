import type { Point, ReactiveElementBase, TransitionDescriptor } from "../core/index";
import { to } from "../motion/transitions";
import { Connector, type ConnectorElement } from "./components/Connector";
import type { DOMElement } from "./element";

/**
 * @internal
 */
export type LayoutElement =
  | DOMElement
  | ReactiveElementBase
  | {
      x?: unknown;
      y?: unknown;
      width?: unknown;
      height?: unknown;
      domElement?: HTMLElement;
    };

/**
 * @internal
 */
export type GridSlot = LayoutElement | null | undefined;

/**
 * Animation configuration for layout placement.
 * Can be:
 * - `boolean`: `true` to animate with default duration (0.6s).
 * - `Function`: A callback receiving `(coord, element, index)` returning a configured transition via `to(coord)`.
 * @category Layout
 */
export type LayoutAnimation =
  | boolean
  | ((
      coord: number | "center",
      element: LayoutElement,
      index: number,
    ) => TransitionDescriptor<unknown>);

/**
 * @internal
 */
export interface RuleOptions {
  /** Line stroke color (defaults to "rgba(255, 255, 255, 0.12)"). */
  color?: string;
  /** Stroke width in pixels (defaults to 1). */
  strokeWidth?: number;
  /** Whether the line is styled with dashed strokes. */
  dashed?: boolean;
  /** Whether the line is styled with dotted strokes. */
  dotted?: boolean;
  /** Inset padding from endpoints in virtual canvas units (defaults to 0). */
  inset?: number;
}

/**
 * A slot in a stack layout: either a single element or a nested array of elements (column/row).
 * @category Layout
 */
export type StackSlot = LayoutElement | LayoutElement[];

/**
 * Options for grid, row, and column layout arrangements.
 * @category Layout
 */
export interface LayoutOptions {
  /** Horizontal start position in stage width percentage units (`cqw`, 0..100) or `"center"`. */
  x?: number | "center";
  /** Vertical start position in stage height percentage units (`cqh`, 0..100) or `"center"`. */
  y?: number | "center";
  /** Width constraint in stage width percentage units (`cqw`, 0..100), CSS unit string, or array per column. */
  width?: number | string | (number | string)[];
  /** Height constraint in stage height percentage units (`cqh`, 0..100), CSS unit string, or array per row. */
  height?: number | string | (number | string)[];
  /** Gutter spacing shorthand along the primary axis in stage percentage units (`cqw` horizontally, `cqh` vertically). */
  gap?: number;
  /** Horizontal gutter spacing in stage width percentage units (`cqw`, 0..100). */
  gapX?: number;
  /** Vertical gutter spacing in stage height percentage units (`cqh`, 0..100). */
  gapY?: number;
  /**
   * Whether or how to animate elements into target positions.
   * Can be `true` or a builder callback `(coord, el, index) => to(coord).duration(0.8)`.
   */
  animate?: LayoutAnimation;
  /** Fallback duration in seconds if `animate: true` is used (default: 0.6s). */
  duration?: number;
  /** Optional divider rule(s) placed in gutters between elements or columns/rows. */
  rule?: boolean | RuleOptions;
}

/**
 * Relative cardinal placement position.
 * @category Layout
 */
export type RelativePlacement = "top" | "bottom" | "left" | "right";

/**
 * Perpendicular alignment mode for relative placement.
 * @category Layout
 */
export type RelativeAlign = "start" | "center" | "end";

/**
 * Options for circular/orbit layout arrangement.
 * @category Layout
 */
export interface CircleLayoutOptions {
  /** Center anchor point as [x, y] or a center element (default: [50, 50]). */
  center?: Point | LayoutElement;
  /** Horizontal orbit radius in cqw (default: 18). */
  radius?: number;
  /** Vertical squash factor, 0 = perfect circle, 1 = flat line (default: 0). */
  flatten?: number;
  /** Starting angle in degrees (default: -90 for 12 o'clock top). */
  startAngle?: number;
  /** Angular span in degrees (default: 360 for full circle). */
  span?: number;
  /** Whether each element is centered on its orbit point (default: true). */
  centerElements?: boolean;
  /**
   * Whether or how to animate elements into circular positions.
   * Can be `true` or a builder callback `(coord, el, index) => to(coord).duration(0.8)`.
   */
  animate?: LayoutAnimation;
  /** Fallback duration in seconds if `animate: true` is used (default: 0.6s). */
  duration?: number;
}

function measureElement(
  el: LayoutElement,
  explicitWidth?: number | string,
): { widthCqw: number; heightCqh: number } {
  const dom = (el as { domElement?: HTMLElement }).domElement;
  if (!dom) return { widthCqw: 15, heightCqh: 8 };

  const BASE_WIDTH = 1920;
  const BASE_HEIGHT = 1080;

  const prevWidth = dom.style.width;

  if (explicitWidth !== undefined) {
    const formattedW =
      typeof explicitWidth === "number"
        ? `${(explicitWidth / 100) * BASE_WIDTH}px`
        : String(explicitWidth).endsWith("cqw")
          ? `${(Number.parseFloat(String(explicitWidth)) / 100) * BASE_WIDTH}px`
          : String(explicitWidth);
    dom.style.width = formattedW;
  } else {
    const wProp = (el as Record<string, unknown>).width;
    if (wProp !== undefined) {
      const formattedW =
        typeof wProp === "number"
          ? `${wProp}px`
          : String(wProp).endsWith("cqw")
            ? `${(Number.parseFloat(String(wProp)) / 100) * BASE_WIDTH}px`
            : String(wProp);
      dom.style.width = formattedW;
    }
  }

  let w = dom.offsetWidth;
  let h = dom.offsetHeight;

  if (typeof document !== "undefined" && !dom.isConnected) {
    const prevVis = dom.style.visibility;
    const prevPos = dom.style.position;
    const prevLeft = dom.style.left;
    dom.style.visibility = "hidden";
    dom.style.position = "absolute";
    dom.style.left = "-9999px";
    document.body.appendChild(dom);
    w = dom.offsetWidth;
    h = dom.offsetHeight;
    dom.remove();
    dom.style.visibility = prevVis;
    dom.style.position = prevPos;
    dom.style.left = prevLeft;
  }

  // Restore the original inline style width so elements keep their reactive cqw units
  dom.style.width = prevWidth;

  if (w === 0) w = 240;
  if (h === 0) h = 80;

  return {
    widthCqw: (w / BASE_WIDTH) * 100,
    heightCqh: (h / BASE_HEIGHT) * 100,
  };
}

function applyPosition(
  el: LayoutElement,
  x: number | "center",
  y: number | "center",
  options: {
    animate?: LayoutAnimation;
    duration?: number;
    width?: number | string | (number | string)[];
    height?: number | string | (number | string)[];
  } = {},
  index = 0,
): void {
  const target = el as Record<string, unknown>;
  const optWidth = Array.isArray(options.width) ? options.width[0] : options.width;
  const optHeight = Array.isArray(options.height) ? options.height[0] : options.height;
  if (optWidth !== undefined && target.width === undefined) {
    target.width = typeof optWidth === "number" ? `${optWidth}cqw` : optWidth;
    const dom = (el as { domElement?: HTMLElement }).domElement;
    if (dom && !dom.style.width) {
      dom.style.width = typeof optWidth === "number" ? `${optWidth}cqw` : String(optWidth);
    }
  }
  if (optHeight !== undefined && target.height === undefined) {
    target.height = typeof optHeight === "number" ? `${optHeight}cqh` : optHeight;
    const dom = (el as { domElement?: HTMLElement }).domElement;
    if (dom && !dom.style.height) {
      dom.style.height = typeof optHeight === "number" ? `${optHeight}cqh` : String(optHeight);
    }
  }
  if (options.animate) {
    if (typeof options.animate === "function") {
      target.x = options.animate(x, el, index);
      target.y = options.animate(y, el, index);
    } else {
      target.x = to(x).duration(options.duration ?? 0.6);
      target.y = to(y).duration(options.duration ?? 0.6);
    }
  } else {
    target.x = x;
    target.y = y;
  }
}

/**
 * Shared engine for directional placement: positions `element` on the given side
 * of `target`, separated by `gap`, with perpendicular `align` (start/center/end).
 */
function positionRelative(
  element: LayoutElement,
  target: LayoutElement,
  placement: RelativePlacement,
  gap: number,
  align: RelativeAlign,
): void {
  const targetM = measureElement(target);
  const elM = measureElement(element);

  const targetX = typeof target.x === "number" ? target.x : 0;
  const targetY = typeof target.y === "number" ? target.y : 0;

  let computedX = targetX;
  let computedY = targetY;

  if (placement === "bottom") {
    computedY = targetY + targetM.heightCqh + gap;
    if (align === "center") {
      computedX = targetX + (targetM.widthCqw - elM.widthCqw) / 2;
    } else if (align === "end") {
      computedX = targetX + targetM.widthCqw - elM.widthCqw;
    }
  } else if (placement === "top") {
    computedY = targetY - elM.heightCqh - gap;
    if (align === "center") {
      computedX = targetX + (targetM.widthCqw - elM.widthCqw) / 2;
    } else if (align === "end") {
      computedX = targetX + targetM.widthCqw - elM.widthCqw;
    }
  } else if (placement === "right") {
    computedX = targetX + targetM.widthCqw + gap;
    if (align === "center") {
      computedY = targetY + (targetM.heightCqh - elM.heightCqh) / 2;
    } else if (align === "end") {
      computedY = targetY + targetM.heightCqh - elM.heightCqh;
    }
  } else if (placement === "left") {
    computedX = targetX - elM.widthCqw - gap;
    if (align === "center") {
      computedY = targetY + (targetM.heightCqh - elM.heightCqh) / 2;
    } else if (align === "end") {
      computedY = targetY + targetM.heightCqh - elM.heightCqh;
    }
  }

  applyPosition(element, computedX, computedY);
}

/**
 * Layout helper providing procedural positioning engines (hstack, vstack, grid, split, circle, relational).
 * @category Layout
 */
export const layout = {
  /**
   * Arranges elements into a horizontal row (horizontal stack).
   * Returns any created divider rules if options.rule is enabled.
   */
  /**
   * Arranges elements or columns horizontally (horizontal stack).
   * Slots can be single elements or nested arrays of elements (columns stacked vertically).
   * Returns any created divider rules if options.rule is enabled.
   */
  hstack(elements: StackSlot[], options: LayoutOptions = {}): ConnectorElement[] {
    if (elements.length === 0) return [];

    const gapX = options.gapX ?? options.gap ?? 4;
    const gapY = options.gapY ?? 3;

    const slotCount = elements.length;
    const defaultX = 10;
    const startXVal = typeof options.x === "number" ? options.x : defaultX;
    const totalGapsX = Math.max(0, slotCount - 1) * gapX;
    const autoColWidth = Math.max(10, (100 - startXVal * 2 - totalGapsX) / slotCount);

    interface MeasuredSlot {
      widthCqw: number;
      heightCqh: number;
      isColumn: boolean;
      items: { el: LayoutElement; widthCqw: number; heightCqh: number }[];
    }

    const slotMeasurements: MeasuredSlot[] = [];

    elements.forEach((slot, index) => {
      const explicitWidth = Array.isArray(options.width) ? options.width[index] : options.width;

      if (Array.isArray(slot)) {
        const colElements = slot;
        const colWidth = explicitWidth !== undefined ? explicitWidth : autoColWidth;

        for (const el of colElements) {
          if ((el as Record<string, unknown>).width === undefined) {
            (el as Record<string, unknown>).width =
              typeof colWidth === "number" ? `${colWidth}cqw` : colWidth;
          }
        }

        const items = colElements.map((el) => {
          const m = measureElement(el, colWidth);
          return { el, widthCqw: m.widthCqw, heightCqh: m.heightCqh };
        });

        const totalH =
          items.reduce((sum, it) => sum + it.heightCqh, 0) + Math.max(0, items.length - 1) * gapY;
        const maxW =
          typeof colWidth === "number" ? colWidth : Math.max(...items.map((it) => it.widthCqw));

        slotMeasurements.push({
          widthCqw: maxW,
          heightCqh: totalH,
          isColumn: true,
          items,
        });
      } else {
        const m = measureElement(slot, explicitWidth);
        slotMeasurements.push({
          widthCqw: m.widthCqw,
          heightCqh: m.heightCqh,
          isColumn: false,
          items: [{ el: slot, widthCqw: m.widthCqw, heightCqh: m.heightCqh }],
        });
      }
    });

    const totalWidth = slotMeasurements.reduce((sum, sm) => sum + sm.widthCqw, 0) + totalGapsX;

    let currentX: number;
    if (options.x === "center") {
      currentX = Math.max(0, (100 - totalWidth) / 2);
    } else if (typeof options.x === "number") {
      currentX = options.x;
    } else {
      currentX = defaultX;
    }

    const y = options.y ?? 24;
    const yNum = typeof y === "number" ? y : 24;
    const maxH = Math.max(...slotMeasurements.map((sm) => sm.heightCqh));
    const rules: ConnectorElement[] = [];
    let itemIdx = 0;

    slotMeasurements.forEach((sm, index) => {
      const explicitWidth = Array.isArray(options.width) ? options.width[index] : options.width;

      if (sm.isColumn) {
        let colY = yNum;
        for (const { el, heightCqh } of sm.items) {
          const elWidth = (el as Record<string, unknown>).width as number | string | undefined;
          const appliedOptions = {
            ...options,
            width: explicitWidth !== undefined ? explicitWidth : (elWidth ?? sm.widthCqw),
          };
          applyPosition(el, currentX, colY, appliedOptions, itemIdx++);
          colY += heightCqh + gapY;
        }
      } else {
        const item = sm.items[0];
        if (item) {
          const appliedOptions = {
            ...options,
            width: explicitWidth,
          };
          applyPosition(item.el, currentX, y, appliedOptions, itemIdx++);
        }
      }

      if (options.rule && index < slotMeasurements.length - 1) {
        const ruleX = currentX + sm.widthCqw + gapX / 2;
        const inset =
          typeof options.rule === "object" && options.rule.inset ? options.rule.inset : 0;
        const startY = yNum + inset;
        const endY = yNum + maxH - inset;
        const cfg = typeof options.rule === "object" ? options.rule : {};
        const ruleConn = Connector([ruleX, startY], [ruleX, endY], {
          color: cfg.color ?? "rgba(255, 255, 255, 0.12)",
          strokeWidth: cfg.strokeWidth ?? 1,
          dashed: cfg.dashed,
          dotted: cfg.dotted,
          endHead: "none",
        });
        rules.push(ruleConn);
      }

      currentX += sm.widthCqw + gapX;
    });

    return rules;
  },

  /**
   * Arranges elements or rows vertically (vertical stack).
   * Slots can be single elements or nested arrays of elements (rows laid out horizontally).
   * Returns any created divider rules if options.rule is enabled.
   */
  vstack(elements: StackSlot[], options: LayoutOptions = {}): ConnectorElement[] {
    if (elements.length === 0) return [];

    const x = options.x ?? 10;
    const xNum = typeof x === "number" ? x : 10;
    const effectiveWidth =
      options.width ?? (x === "center" ? 80 : Math.max(20, 100 - xNum - (xNum > 30 ? 4 : 6)));

    const gapY = options.gapY ?? options.gap ?? 3;
    const gapX = options.gapX ?? 4;

    interface MeasuredSlot {
      widthCqw: number;
      heightCqh: number;
      isRow: boolean;
      items: { el: LayoutElement; widthCqw: number; heightCqh: number }[];
    }

    const slotMeasurements: MeasuredSlot[] = [];

    elements.forEach((slot, index) => {
      const explicitHeight = Array.isArray(options.height) ? options.height[index] : options.height;

      if (Array.isArray(slot)) {
        const rowElements = slot;
        const totalGapsX = Math.max(0, rowElements.length - 1) * gapX;
        const widthVal =
          typeof effectiveWidth === "number"
            ? effectiveWidth
            : Array.isArray(effectiveWidth) && typeof effectiveWidth[0] === "number"
              ? (effectiveWidth[0] as number)
              : 80;
        const autoItemWidth = Math.max(10, (widthVal - totalGapsX) / rowElements.length);

        for (const el of rowElements) {
          if ((el as Record<string, unknown>).width === undefined) {
            (el as Record<string, unknown>).width = `${autoItemWidth}cqw`;
          }
        }

        const items = rowElements.map((el) => {
          const m = measureElement(el, autoItemWidth);
          return { el, widthCqw: m.widthCqw, heightCqh: m.heightCqh };
        });

        const totalW = items.reduce((sum, it) => sum + it.widthCqw, 0) + totalGapsX;
        const maxH =
          typeof explicitHeight === "number"
            ? explicitHeight
            : Math.max(...items.map((it) => it.heightCqh));

        slotMeasurements.push({
          widthCqw: totalW,
          heightCqh: maxH,
          isRow: true,
          items,
        });
      } else {
        const explicitW = Array.isArray(options.width) ? options.width[index] : options.width;
        const elWidth = (slot as Record<string, unknown>).width;
        const m =
          explicitW !== undefined
            ? measureElement(slot, explicitW)
            : elWidth !== undefined
              ? measureElement(slot)
              : measureElement(
                  slot,
                  typeof effectiveWidth === "number" || typeof effectiveWidth === "string"
                    ? effectiveWidth
                    : undefined,
                );
        slotMeasurements.push({
          widthCqw: m.widthCqw,
          heightCqh: typeof explicitHeight === "number" ? explicitHeight : m.heightCqh,
          isRow: false,
          items: [{ el: slot, widthCqw: m.widthCqw, heightCqh: m.heightCqh }],
        });
      }
    });

    const totalHeight =
      slotMeasurements.reduce((sum, sm) => sum + sm.heightCqh, 0) +
      Math.max(0, slotMeasurements.length - 1) * gapY;

    let currentY: number;
    if (options.y === "center") {
      currentY = Math.max(0, (100 - totalHeight) / 2);
    } else if (typeof options.y === "number") {
      currentY = options.y;
    } else {
      currentY = 20;
    }

    const rules: ConnectorElement[] = [];
    let itemIdx = 0;
    const widthNum =
      typeof effectiveWidth === "number"
        ? effectiveWidth
        : typeof effectiveWidth === "string"
          ? Number.parseFloat(effectiveWidth) || 44
          : 44;

    slotMeasurements.forEach((sm, index) => {
      const explicitH = Array.isArray(options.height) ? options.height[index] : options.height;

      if (sm.isRow) {
        let rowX = xNum;
        for (const { el, widthCqw } of sm.items) {
          const appliedOptions = {
            ...options,
            height: explicitH,
          };
          applyPosition(el, rowX, currentY, appliedOptions, itemIdx++);
          rowX += widthCqw + gapX;
        }
      } else {
        const item = sm.items[0];
        if (item) {
          const explicitW = Array.isArray(options.width) ? options.width[index] : options.width;
          const elWidth = (item.el as Record<string, unknown>).width as number | string | undefined;
          const appliedOptions = {
            ...options,
            width:
              explicitW !== undefined
                ? explicitW
                : (elWidth ??
                  (typeof effectiveWidth === "number" || typeof effectiveWidth === "string"
                    ? effectiveWidth
                    : undefined)),
            height: explicitH,
          };
          applyPosition(item.el, x, currentY, appliedOptions, itemIdx++);
        }
      }

      if (options.rule && index < slotMeasurements.length - 1) {
        const ruleY = currentY + sm.heightCqh + gapY / 2;
        const inset =
          typeof options.rule === "object" && options.rule.inset ? options.rule.inset : 0;
        const startX = xNum + inset;
        const endX = xNum + widthNum - inset;
        const cfg = typeof options.rule === "object" ? options.rule : {};
        const ruleConn = Connector([startX, ruleY], [endX, ruleY], {
          color: cfg.color ?? "rgba(255, 255, 255, 0.12)",
          strokeWidth: cfg.strokeWidth ?? 1,
          dashed: cfg.dashed,
          dotted: cfg.dotted,
          endHead: "none",
        });
        rules.push(ruleConn);
      }

      currentY += sm.heightCqh + gapY;
    });

    return rules;
  },

  /**
   * Arranges elements into a multi-column grid defined as a 2D matrix of rows and columns.
   * Supports `null` or `undefined` for empty matrix slots.
   * Returns divider rules placed in grid gutters if options.rule is enabled.
   */
  grid(matrix: GridSlot[][], options: LayoutOptions = {}): ConnectorElement[] {
    if (matrix.length === 0) return [];

    const cols = Math.max(...matrix.map((row) => (Array.isArray(row) ? row.length : 0)));
    if (cols === 0) return [];

    const gapX = options.gapX ?? options.gap ?? 4;
    const gapY = options.gapY ?? options.gap ?? 4;

    const flatNonNull: LayoutElement[] = [];
    for (const row of matrix) {
      if (Array.isArray(row)) {
        for (const slot of row) {
          if (slot) flatNonNull.push(slot);
        }
      }
    }

    if (flatNonNull.length === 0) return [];

    const measurements = flatNonNull.map((el) =>
      measureElement(el, Array.isArray(options.width) ? options.width[0] : options.width),
    );
    const maxColWidth = Math.max(...measurements.map((m) => m.widthCqw));
    const maxRowHeight = Math.max(...measurements.map((m) => m.heightCqh));

    const totalGridWidth = cols * maxColWidth + Math.max(0, cols - 1) * gapX;
    const totalGridHeight = matrix.length * maxRowHeight + Math.max(0, matrix.length - 1) * gapY;

    let startX: number;
    if (options.x === "center") {
      startX = Math.max(0, (100 - totalGridWidth) / 2);
    } else if (typeof options.x === "number") {
      startX = options.x;
    } else {
      startX = 10;
    }

    let startY: number;
    if (options.y === "center") {
      startY = Math.max(0, (100 - totalGridHeight) / 2);
    } else if (typeof options.y === "number") {
      startY = options.y;
    } else {
      startY = 20;
    }

    let itemIdx = 0;
    matrix.forEach((row, rowIdx) => {
      if (!Array.isArray(row)) return;
      row.forEach((slot, colIdx) => {
        if (!slot) return;
        const targetX = startX + colIdx * (maxColWidth + gapX);
        const targetY = startY + rowIdx * (maxRowHeight + gapY);
        applyPosition(slot, targetX, targetY, options, itemIdx++);
      });
    });

    const rules: ConnectorElement[] = [];
    if (options.rule) {
      const cfg = typeof options.rule === "object" ? options.rule : {};
      const inset = typeof options.rule === "object" && options.rule.inset ? options.rule.inset : 0;
      // Vertical column dividers
      for (let c = 0; c < cols - 1; c++) {
        const ruleX = startX + (c + 1) * maxColWidth + c * gapX + gapX / 2;
        rules.push(
          Connector([ruleX, startY + inset], [ruleX, startY + totalGridHeight - inset], {
            color: cfg.color ?? "rgba(255, 255, 255, 0.12)",
            strokeWidth: cfg.strokeWidth ?? 1,
            dashed: cfg.dashed,
            dotted: cfg.dotted,
            endHead: "none",
          }),
        );
      }
      // Horizontal row dividers
      for (let r = 0; r < matrix.length - 1; r++) {
        const ruleY = startY + (r + 1) * maxRowHeight + r * gapY + gapY / 2;
        rules.push(
          Connector([startX + inset, ruleY], [startX + totalGridWidth - inset, ruleY], {
            color: cfg.color ?? "rgba(255, 255, 255, 0.12)",
            strokeWidth: cfg.strokeWidth ?? 1,
            dashed: cfg.dashed,
            dotted: cfg.dotted,
            endHead: "none",
          }),
        );
      }
    }

    return rules;
  },

  /**
   * Positions an element above a target element, separated by `gap`.
   * @param gap Vertical separation distance in stage height percentage units (`cqh`, 0..100; default: 2).
   * @param align Horizontal alignment: "start" (left edges, default), "center", or "end" (right edges).
   */
  above(
    element: LayoutElement,
    target: LayoutElement,
    gap = 2,
    align: RelativeAlign = "start",
  ): void {
    positionRelative(element, target, "top", gap, align);
  },

  /**
   * Positions an element below a target element, separated by `gap`.
   * @param gap Vertical separation distance in stage height percentage units (`cqh`, 0..100; default: 2).
   * @param align Horizontal alignment: "start" (left edges, default), "center", or "end" (right edges).
   */
  below(
    element: LayoutElement,
    target: LayoutElement,
    gap = 2,
    align: RelativeAlign = "start",
  ): void {
    positionRelative(element, target, "bottom", gap, align);
  },

  /**
   * Positions an element to the right of a target element, separated by `gap`.
   * @param gap Horizontal separation distance in stage width percentage units (`cqw`, 0..100; default: 2).
   * @param align Vertical alignment: "start" (top edges, default), "center", or "end" (bottom edges).
   */
  rightOf(
    element: LayoutElement,
    target: LayoutElement,
    gap = 2,
    align: RelativeAlign = "start",
  ): void {
    positionRelative(element, target, "right", gap, align);
  },

  /**
   * Positions an element to the left of a target element, separated by `gap`.
   * @param gap Horizontal separation distance in stage width percentage units (`cqw`, 0..100; default: 2).
   * @param align Vertical alignment: "start" (top edges, default), "center", or "end" (bottom edges).
   */
  leftOf(
    element: LayoutElement,
    target: LayoutElement,
    gap = 2,
    align: RelativeAlign = "start",
  ): void {
    positionRelative(element, target, "left", gap, align);
  },

  /**
   * Arranges elements in a circular orbit around a central point or anchor element.
   */
  circle(elements: LayoutElement[], options: CircleLayoutOptions = {}): void {
    const count = elements.length;
    if (count === 0) return;

    let cx = 50;
    let cy = 50;

    if (options.center) {
      if (Array.isArray(options.center)) {
        cx = options.center[0];
        cy = options.center[1];
      } else {
        // If anchor element, center on its midpoint
        const centerEl = options.center as LayoutElement;
        if ("domElement" in centerEl || "width" in centerEl) {
          const m = measureElement(centerEl);
          if (typeof centerEl.x === "number") cx = centerEl.x + m.widthCqw / 2;
          if (typeof centerEl.y === "number") cy = centerEl.y + m.heightCqh / 2;
        }
      }
    }

    const radius = options.radius ?? 18;
    // cqw vs cqh scale differently (1920 vs 1080 per 100 units);
    // flatten 0 keeps a true pixel circle, higher values squash vertically.
    const rx = radius;
    const ry = radius * (1920 / 1080) * (1 - (options.flatten ?? 0));
    const startAngleDeg = options.startAngle ?? -90; // Default 12 o'clock top
    const spanDeg = options.span ?? 360;
    const centerElements = options.centerElements ?? true;

    elements.forEach((el, index) => {
      let angleDeg = startAngleDeg;
      if (count > 1) {
        const stepDeg = spanDeg === 360 ? spanDeg / count : spanDeg / (count - 1);
        angleDeg = startAngleDeg + index * stepDeg;
      }

      const rad = (angleDeg * Math.PI) / 180;
      let targetX = cx + rx * Math.cos(rad);
      let targetY = cy + ry * Math.sin(rad);

      if (centerElements) {
        const m = measureElement(el);
        targetX -= m.widthCqw / 2;
        targetY -= m.heightCqh / 2;
      }

      applyPosition(el, targetX, targetY, options);
    });
  },
};
