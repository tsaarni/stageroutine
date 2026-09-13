import {
  getActiveStage,
  type Point,
  type ReactiveElementBase,
  type TransitionDescriptor,
  tryGetActiveStage,
} from "../core/index";
import { applyRuleStyles, type RuleOptions } from "../decorators/rule";
import { to } from "../motion/transitions";
import { DOMElement } from "./element";

export type { RuleOptions };

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
  /** Gutter spacing shorthand along the primary axis in stage percentage units (`cqw` horizontally, `cqh` vertically). Defaults to 4 for hstack, 3 for vstack, and 2 for relative layouts. */
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
  /** Perpendicular alignment for relative placement: "start" (default), "center", or "end". */
  align?: RelativeAlign;
  /** Whether multiple relative elements stack sequentially (default: true). */
  stack?: boolean;
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

  const stage = tryGetActiveStage();
  const BASE_WIDTH = stage?.width ?? 1920;
  const BASE_HEIGHT = stage?.height ?? 1080;

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

  // Temporarily attach unmounted elements offscreen to measure computed dimensions.
  if (!dom.isConnected) {
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
  const stage = getActiveStage();
  if (
    stage &&
    typeof stage.registerElement === "function" &&
    el &&
    typeof el === "object" &&
    "id" in el &&
    "domElement" in el
  ) {
    const reactiveEl = el as ReactiveElementBase;
    if (typeof stage.hasElement === "function" ? !stage.hasElement(reactiveEl.id) : true) {
      stage.registerElement(reactiveEl);
    }
  }

  const target = el as Record<string, unknown>;
  const optWidth = Array.isArray(options.width) ? options.width[0] : options.width;
  const optHeight = Array.isArray(options.height) ? options.height[0] : options.height;
  if (optWidth !== undefined) {
    if (target.width === undefined) {
      target.width = typeof optWidth === "number" ? `${optWidth}cqw` : optWidth;
    }
    const dom = (el as { domElement?: HTMLElement }).domElement;
    if (dom && !dom.style.width) {
      dom.style.width = typeof optWidth === "number" ? `${optWidth}cqw` : String(optWidth);
    }
  }
  if (optHeight !== undefined) {
    if (target.height === undefined) {
      target.height = typeof optHeight === "number" ? `${optHeight}cqh` : optHeight;
    }
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
 * Shared engine for directional placement: positions `elements` on the given side
 * of `target`, separated by `gap`, with perpendicular `align` (start/center/end)
 * and optional animated transitions.
 */
function positionRelative(
  elements: LayoutElement | LayoutElement[],
  target: LayoutElement,
  placement: RelativePlacement,
  options: LayoutOptions = {},
): void {
  const list = Array.isArray(elements) ? elements : [elements];
  if (list.length === 0) return;

  const gap = options.gap ?? 2;
  const align = options.align ?? "start";
  const shouldStack = options.stack ?? true;

  const targetM = measureElement(target);
  const targetX = typeof target.x === "number" ? target.x : 0;
  const targetY = typeof target.y === "number" ? target.y : 0;

  if (placement === "bottom") {
    let refY = targetY;
    let refHeight = targetM.heightCqh;
    list.forEach((el, index) => {
      const elM = measureElement(el);
      const computedY = refY + refHeight + gap;
      let computedX = targetX;
      if (!shouldStack && typeof el.x === "number") {
        computedX = el.x;
      } else if (align === "center") {
        computedX = targetX + (targetM.widthCqw - elM.widthCqw) / 2;
      } else if (align === "end") {
        computedX = targetX + targetM.widthCqw - elM.widthCqw;
      }
      applyPosition(el, computedX, computedY, options, index);
      if (shouldStack) {
        refY = computedY;
        refHeight = elM.heightCqh;
      }
    });
  } else if (placement === "top") {
    if (!shouldStack) {
      list.forEach((el, index) => {
        const elM = measureElement(el);
        const computedY = targetY - elM.heightCqh - gap;
        const computedX = typeof el.x === "number" ? el.x : targetX;
        applyPosition(el, computedX, computedY, options, index);
      });
    } else {
      let refY = targetY;
      for (let i = list.length - 1; i >= 0; i--) {
        const el = list[i];
        const elM = measureElement(el);
        const computedY = refY - elM.heightCqh - gap;
        let computedX = targetX;
        if (align === "center") {
          computedX = targetX + (targetM.widthCqw - elM.widthCqw) / 2;
        } else if (align === "end") {
          computedX = targetX + targetM.widthCqw - elM.widthCqw;
        }
        applyPosition(el, computedX, computedY, options, i);
        refY = computedY;
      }
    }
  } else if (placement === "right") {
    let refX = targetX;
    let refWidth = targetM.widthCqw;
    list.forEach((el, index) => {
      const elM = measureElement(el);
      const computedX = refX + refWidth + gap;
      let computedY = targetY;
      if (!shouldStack && typeof el.y === "number") {
        computedY = el.y;
      } else if (align === "center") {
        computedY = targetY + (targetM.heightCqh - elM.heightCqh) / 2;
      } else if (align === "end") {
        computedY = targetY + targetM.heightCqh - elM.heightCqh;
      }
      applyPosition(el, computedX, computedY, options, index);
      if (shouldStack) {
        refX = computedX;
        refWidth = elM.widthCqw;
      }
    });
  } else if (placement === "left") {
    if (!shouldStack) {
      list.forEach((el, index) => {
        const elM = measureElement(el);
        const computedX = targetX - elM.widthCqw - gap;
        const computedY = typeof el.y === "number" ? el.y : targetY;
        applyPosition(el, computedX, computedY, options, index);
      });
    } else {
      let refX = targetX;
      for (let i = list.length - 1; i >= 0; i--) {
        const el = list[i];
        const elM = measureElement(el);
        const computedX = refX - elM.widthCqw - gap;
        let computedY = targetY;
        if (align === "center") {
          computedY = targetY + (targetM.heightCqh - elM.heightCqh) / 2;
        } else if (align === "end") {
          computedY = targetY + targetM.heightCqh - elM.heightCqh;
        }
        applyPosition(el, computedX, computedY, options, i);
        refX = computedX;
      }
    }
  }
}

function createLayoutRule(
  x: number,
  y: number,
  width: string,
  height: string,
  options: RuleOptions,
): DOMElement {
  const node = document.createElement("span");
  if (options.className) {
    node.className = options.className;
  }
  node.style.width = "100%";
  node.style.height = "100%";
  node.style.display = "block";
  applyRuleStyles(node, options);

  const el = new DOMElement("rule", node, {
    x,
    y,
    width,
    height,
  });
  return getActiveStage().registerElement(el) as DOMElement;
}

/**
 * Layout helper providing procedural positioning engines (hstack, vstack, grid, circle, relational).
 * @category Layout
 */
export const layout = {
  /**
   * Arranges elements or columns horizontally (horizontal stack).
   * Slots can be single elements or nested arrays of elements (columns stacked vertically).
   * Returns any created divider rules if options.rule is enabled.
   */
  hstack(elements: StackSlot[], options: LayoutOptions = {}): DOMElement[] {
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
        const totalGapsY = Math.max(0, colElements.length - 1) * gapY;
        const colWidthVal =
          typeof explicitWidth === "number"
            ? explicitWidth
            : typeof explicitWidth === "string"
              ? Number.parseFloat(explicitWidth) || autoColWidth
              : autoColWidth;

        for (const el of colElements) {
          if ((el as Record<string, unknown>).width === undefined) {
            const formatted = `${colWidthVal}cqw`;
            (el as Record<string, unknown>).width = formatted;
            const dom = (el as { domElement?: HTMLElement }).domElement;
            if (dom && !dom.style.width) {
              dom.style.width = formatted;
            }
          }
        }

        const items = colElements.map((el) => {
          const m = measureElement(el, colWidthVal);
          return { el, widthCqw: m.widthCqw, heightCqh: m.heightCqh };
        });

        const maxW = Math.max(...items.map((it) => it.widthCqw));
        const totalH = items.reduce((sum, it) => sum + it.heightCqh, 0) + totalGapsY;

        slotMeasurements.push({
          widthCqw: maxW,
          heightCqh: totalH,
          isColumn: true,
          items,
        });
      } else {
        const explicitW = Array.isArray(options.width) ? options.width[index] : options.width;
        const elWidth = (slot as Record<string, unknown>).width;
        const isEqual = options.width === "equal";
        const m =
          explicitW !== undefined && explicitW !== "equal"
            ? measureElement(slot, explicitW)
            : elWidth !== undefined
              ? measureElement(slot)
              : isEqual
                ? measureElement(slot, autoColWidth)
                : measureElement(slot);
        slotMeasurements.push({
          widthCqw: m.widthCqw,
          heightCqh: m.heightCqh,
          isColumn: false,
          items: [{ el: slot, widthCqw: m.widthCqw, heightCqh: m.heightCqh }],
        });
      }
    });

    let currentX: number;
    if (options.x === "center") {
      const totalWidth =
        slotMeasurements.reduce((sum, sm) => sum + sm.widthCqw, 0) +
        Math.max(0, slotMeasurements.length - 1) * gapX;
      currentX = Math.max(0, (100 - totalWidth) / 2);
    } else if (typeof options.x === "number") {
      currentX = options.x;
    } else {
      currentX = defaultX;
    }

    const y = options.y ?? 24;
    const yNum = typeof y === "number" ? y : 24;
    const align = options.align ?? "start";
    const maxH = Math.max(...slotMeasurements.map((sm) => sm.heightCqh));
    const rules: DOMElement[] = [];
    let itemIdx = 0;

    slotMeasurements.forEach((sm, index) => {
      const explicitWidth = Array.isArray(options.width) ? options.width[index] : options.width;
      let slotY = yNum;
      if (align === "center") {
        slotY = yNum + (maxH - sm.heightCqh) / 2;
      } else if (align === "end") {
        slotY = yNum + (maxH - sm.heightCqh);
      }

      if (sm.isColumn) {
        let colY = slotY;
        for (const { el, heightCqh } of sm.items) {
          const elWidth = (el as Record<string, unknown>).width as number | string | undefined;
          const appliedOptions = {
            ...options,
            width:
              explicitWidth !== undefined && explicitWidth !== "equal"
                ? explicitWidth
                : (elWidth ?? sm.widthCqw),
          };
          applyPosition(el, currentX, colY, appliedOptions, itemIdx++);
          colY += heightCqh + gapY;
        }
      } else {
        const item = sm.items[0];
        if (item) {
          const appliedOptions = {
            ...options,
            width: explicitWidth === "equal" ? autoColWidth : explicitWidth,
          };
          applyPosition(item.el, currentX, slotY, appliedOptions, itemIdx++);
        }
      }

      if (options.rule && index < slotMeasurements.length - 1) {
        const ruleX = currentX + sm.widthCqw + gapX / 2;
        const cfg = typeof options.rule === "object" ? options.rule : {};
        const inset =
          typeof cfg.inset === "number"
            ? cfg.inset
            : typeof cfg.inset === "string"
              ? Number.parseFloat(cfg.inset) || 0
              : 0;
        const thickness = cfg.thickness ?? 2;
        const isBracketed = !!cfg.bracket;
        const bracketLength = typeof cfg.bracket === "number" ? cfg.bracket : 10;

        const ruleWidth = isBracketed
          ? `${bracketLength}px`
          : typeof thickness === "number"
            ? `${thickness}px`
            : String(thickness);
        const ruleHeight = `${maxH - 2 * inset}cqh`;

        const ruleEl = createLayoutRule(ruleX, yNum + inset, ruleWidth, ruleHeight, {
          ...cfg,
          side: cfg.side ?? "left",
        });
        rules.push(ruleEl);
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
  vstack(elements: StackSlot[], options: LayoutOptions = {}): DOMElement[] {
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

    const rules: DOMElement[] = [];
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
        const cfg = typeof options.rule === "object" ? options.rule : {};
        const inset =
          typeof cfg.inset === "number"
            ? cfg.inset
            : typeof cfg.inset === "string"
              ? Number.parseFloat(cfg.inset) || 0
              : 0;
        const thickness = cfg.thickness ?? 2;
        const isBracketed = !!cfg.bracket;
        const bracketLength = typeof cfg.bracket === "number" ? cfg.bracket : 10;

        const ruleHeight = isBracketed
          ? `${bracketLength}px`
          : typeof thickness === "number"
            ? `${thickness}px`
            : String(thickness);
        const ruleWidth = `${widthNum - 2 * inset}cqw`;

        const ruleEl = createLayoutRule(xNum + inset, ruleY, ruleWidth, ruleHeight, {
          ...cfg,
          side: cfg.side ?? "top",
        });
        rules.push(ruleEl);
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
  grid(matrix: GridSlot[][], options: LayoutOptions = {}): DOMElement[] {
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

    const rules: DOMElement[] = [];
    if (options.rule) {
      const cfg = typeof options.rule === "object" ? options.rule : {};
      const inset =
        typeof cfg.inset === "number"
          ? cfg.inset
          : typeof cfg.inset === "string"
            ? Number.parseFloat(cfg.inset) || 0
            : 0;
      const thickness = cfg.thickness ?? 2;
      const isBracketed = !!cfg.bracket;
      const bracketLength = typeof cfg.bracket === "number" ? cfg.bracket : 10;

      const vertWidth = isBracketed
        ? `${bracketLength}px`
        : typeof thickness === "number"
          ? `${thickness}px`
          : String(thickness);
      const vertHeight = `${totalGridHeight - 2 * inset}cqh`;

      // Vertical column dividers
      for (let c = 0; c < cols - 1; c++) {
        const ruleX = startX + (c + 1) * maxColWidth + c * gapX + gapX / 2;
        rules.push(
          createLayoutRule(ruleX, startY + inset, vertWidth, vertHeight, {
            ...cfg,
            side: cfg.side ?? "left",
          }),
        );
      }

      const horizHeight = isBracketed
        ? `${bracketLength}px`
        : typeof thickness === "number"
          ? `${thickness}px`
          : String(thickness);
      const horizWidth = `${totalGridWidth - 2 * inset}cqw`;

      // Horizontal row dividers
      for (let r = 0; r < matrix.length - 1; r++) {
        const ruleY = startY + (r + 1) * maxRowHeight + r * gapY + gapY / 2;
        rules.push(
          createLayoutRule(startX + inset, ruleY, horizWidth, horizHeight, {
            ...cfg,
            side: cfg.side ?? "top",
          }),
        );
      }
    }

    return rules;
  },

  /**
   * Positions one or more elements above a target element.
   * Multiple elements chain sequentially upwards by default (reading order maintained).
   * @param options Layout options for gap, alignment, and animated transitions.
   */
  above(
    elements: LayoutElement | LayoutElement[],
    target: LayoutElement,
    options: LayoutOptions = {},
  ): void {
    positionRelative(elements, target, "top", options);
  },

  /**
   * Positions one or more elements below a target element.
   * Multiple elements chain sequentially downwards by default.
   * @param options Layout options for gap, alignment, and animated transitions.
   */
  below(
    elements: LayoutElement | LayoutElement[],
    target: LayoutElement,
    options: LayoutOptions = {},
  ): void {
    positionRelative(elements, target, "bottom", options);
  },

  /**
   * Positions one or more elements to the right of a target element.
   * Multiple elements chain sequentially rightwards by default.
   * @param options Layout options for gap, alignment, and animated transitions.
   */
  rightOf(
    elements: LayoutElement | LayoutElement[],
    target: LayoutElement,
    options: LayoutOptions = {},
  ): void {
    positionRelative(elements, target, "right", options);
  },

  /**
   * Positions one or more elements to the left of a target element.
   * Multiple elements chain sequentially leftwards by default (reading order maintained).
   * @param options Layout options for gap, alignment, and animated transitions.
   */
  leftOf(
    elements: LayoutElement | LayoutElement[],
    target: LayoutElement,
    options: LayoutOptions = {},
  ): void {
    positionRelative(elements, target, "left", options);
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
    const stage = tryGetActiveStage();
    const stageW = stage?.width ?? 1920;
    const stageH = stage?.height ?? 1080;
    const rx = radius;
    const ry = radius * (stageW / stageH) * (1 - (options.flatten ?? 0));
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
