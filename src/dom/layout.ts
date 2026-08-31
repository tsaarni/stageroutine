import type { ReactiveElementBase } from "../core/index";
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
 * Options for grid, row, and column layout arrangements.
 * @category Layout
 */
export interface LayoutOptions {
  x?: number | "center";
  y?: number | "center";
  width?: number | string;
  height?: number | string;
  gap?: number;
  gapX?: number;
  gapY?: number;
  cols?: number;
  animate?: boolean;
  duration?: number;
  /** Optional divider rule(s) placed in gutters between elements. */
  rule?: boolean | RuleOptions;
}

/**
 * Options for 2-column split layouts.
 * @category Layout
 */
export interface SplitLayoutOptions {
  leftX?: number;
  rightX?: number;
  y?: number | "center";
  gap?: number;
  leftWidth?: number;
  rightWidth?: number;
  animate?: boolean;
  duration?: number;
  /** Optional column rule placed centrally in the gutter between columns. */
  rule?: boolean | RuleOptions;
}

/**
 * Relative cardinal placement position.
 * @category Layout
 */
export type RelativePlacement = "top" | "bottom" | "left" | "right";

/**
 * Relative alignment axis mode.
 * @category Layout
 */
export type RelativeAlign = "start" | "center" | "end";

/**
 * Options for orbital circular / elliptical layout arrangements.
 * @category Layout
 */
export interface CircleLayoutOptions {
  /** Center X coordinate in stage cqw (default: 50). */
  centerX?: number;
  /** Center Y coordinate in stage cqh (default: 50). */
  centerY?: number;
  /** Center anchor point as { x, y } or a center element. */
  center?: { x: number; y: number } | LayoutElement;
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
  /** Whether to animate into the circular positions (default: false). */
  animate?: boolean;
  /** Duration in seconds if animated (default: 0.6s). */
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
    animate?: boolean;
    duration?: number;
    width?: number | string;
    height?: number | string;
  } = {},
): void {
  const target = el as Record<string, unknown>;
  if (options.width !== undefined && target.width === undefined) {
    target.width = typeof options.width === "number" ? `${options.width}cqw` : options.width;
    const dom = (el as { domElement?: HTMLElement }).domElement;
    if (dom && !dom.style.width) {
      dom.style.width =
        typeof options.width === "number" ? `${options.width}cqw` : String(options.width);
    }
  }
  if (options.height !== undefined && target.height === undefined) {
    target.height = typeof options.height === "number" ? `${options.height}cqh` : options.height;
    const dom = (el as { domElement?: HTMLElement }).domElement;
    if (dom && !dom.style.height) {
      dom.style.height =
        typeof options.height === "number" ? `${options.height}cqh` : String(options.height);
    }
  }
  if (options.animate) {
    target.x = to(x).duration(options.duration ?? 0.6);
    target.y = to(y).duration(options.duration ?? 0.6);
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
 * Layout helper providing procedural positioning engines (rows, columns, grids, splits, orbits).
 * @category Layout
 */
export const arrange = {
  /**
   * Arranges elements into a horizontal row.
   * Returns any created divider rules if options.rule is enabled.
   */
  row(elements: LayoutElement[], options: LayoutOptions = {}): ConnectorElement[] {
    if (elements.length === 0) return [];

    const gap = options.gap ?? 4;
    const measurements = elements.map((el) => measureElement(el, options.width));
    const totalWidth =
      measurements.reduce((sum, m) => sum + m.widthCqw, 0) + Math.max(0, elements.length - 1) * gap;

    let currentX: number;
    if (options.x === "center") {
      currentX = Math.max(0, (100 - totalWidth) / 2);
    } else if (typeof options.x === "number") {
      currentX = options.x;
    } else {
      currentX = 10;
    }

    const y = options.y ?? 30;
    const yNum = typeof y === "number" ? y : 30;
    const maxH = Math.max(...measurements.map((m) => m.heightCqh));
    const rules: ConnectorElement[] = [];

    elements.forEach((el, index) => {
      const m = measurements[index];
      applyPosition(el, currentX, y, options);

      if (options.rule && index < elements.length - 1) {
        const ruleX = currentX + m.widthCqw + gap / 2;
        const inset =
          typeof options.rule === "object" && options.rule.inset ? options.rule.inset : 0;
        const startY = yNum + inset;
        const endY = yNum + maxH - inset;
        const cfg = typeof options.rule === "object" ? options.rule : {};
        const ruleConn = Connector(
          { x: ruleX, y: startY },
          { x: ruleX, y: endY },
          {
            color: cfg.color ?? "rgba(255, 255, 255, 0.12)",
            strokeWidth: cfg.strokeWidth ?? 1,
            dashed: cfg.dashed,
            dotted: cfg.dotted,
            endHead: "none",
          },
        );
        rules.push(ruleConn);
      }

      currentX += m.widthCqw + gap;
    });

    return rules;
  },

  /**
   * Arranges elements into a vertical column.
   * Returns any created divider rules if options.rule is enabled.
   */
  column(elements: LayoutElement[], options: LayoutOptions = {}): ConnectorElement[] {
    if (elements.length === 0) return [];

    const x = options.x ?? 10;
    const xNum = typeof x === "number" ? x : 10;
    const effectiveWidth =
      options.width ?? (x === "center" ? 80 : Math.max(20, 100 - xNum - (xNum > 30 ? 4 : 6)));

    const gap = options.gap ?? 3;
    const measurements = elements.map((el) =>
      options.width !== undefined
        ? measureElement(el, options.width)
        : (el as Record<string, unknown>).width !== undefined
          ? measureElement(el)
          : measureElement(el, effectiveWidth),
    );
    const totalHeight =
      measurements.reduce((sum, m) => sum + m.heightCqh, 0) +
      Math.max(0, elements.length - 1) * gap;

    let currentY: number;
    if (options.y === "center") {
      currentY = Math.max(0, (100 - totalHeight) / 2);
    } else if (typeof options.y === "number") {
      currentY = options.y;
    } else {
      currentY = 20;
    }

    const rules: ConnectorElement[] = [];

    elements.forEach((el, index) => {
      const m = measurements[index];
      const elWidth = (el as Record<string, unknown>).width as number | string | undefined;
      const appliedOptions =
        options.width !== undefined ? options : { ...options, width: elWidth ?? effectiveWidth };
      applyPosition(el, x, currentY, appliedOptions);

      if (options.rule && index < elements.length - 1) {
        const ruleY = currentY + m.heightCqh + gap / 2;
        const inset =
          typeof options.rule === "object" && options.rule.inset ? options.rule.inset : 0;
        const widthNum = typeof effectiveWidth === "number" ? effectiveWidth : 44;
        const startX = xNum + inset;
        const endX = xNum + widthNum - inset;
        const cfg = typeof options.rule === "object" ? options.rule : {};
        const ruleConn = Connector(
          { x: startX, y: ruleY },
          { x: endX, y: ruleY },
          {
            color: cfg.color ?? "rgba(255, 255, 255, 0.12)",
            strokeWidth: cfg.strokeWidth ?? 1,
            dashed: cfg.dashed,
            dotted: cfg.dotted,
            endHead: "none",
          },
        );
        rules.push(ruleConn);
      }

      currentY += m.heightCqh + gap;
    });

    return rules;
  },

  /**
   * Arranges elements into a multi-column grid.
   * Supports 2D row/column matrices (with `null` for empty slots) or flat 1D arrays with `cols`.
   */
  grid(elements: GridSlot[] | GridSlot[][], options: LayoutOptions = {}): void {
    if (elements.length === 0) return;

    const is2D = Array.isArray(elements[0]);
    let matrix: GridSlot[][];
    let cols: number;

    if (is2D) {
      matrix = elements as GridSlot[][];
      cols = Math.max(...matrix.map((row) => (Array.isArray(row) ? row.length : 0)));
    } else {
      const flat = elements as GridSlot[];
      cols = options.cols ?? 3;
      matrix = [];
      for (let i = 0; i < flat.length; i += cols) {
        matrix.push(flat.slice(i, i + cols));
      }
    }

    const startX = typeof options.x === "number" ? options.x : 10;
    const startY = typeof options.y === "number" ? options.y : 20;
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

    if (flatNonNull.length === 0) return;

    const measurements = flatNonNull.map((el) => measureElement(el, options.width));
    const maxColWidth = Math.max(...measurements.map((m) => m.widthCqw));
    const maxRowHeight = Math.max(...measurements.map((m) => m.heightCqh));

    matrix.forEach((row, rowIdx) => {
      if (!Array.isArray(row)) return;
      row.forEach((slot, colIdx) => {
        if (!slot) return;
        const targetX = startX + colIdx * (maxColWidth + gapX);
        const targetY = startY + rowIdx * (maxRowHeight + gapY);
        applyPosition(slot, targetX, targetY, options);
      });
    });
  },

  /**
   * Arranges two groups into a classic split slide layout (left column & right column).
   * Returns the central column rule connector if options.rule is enabled.
   */
  split(
    left: LayoutElement | LayoutElement[],
    right: LayoutElement | LayoutElement[],
    options: SplitLayoutOptions = {},
  ): { rule?: ConnectorElement } {
    const leftElements = Array.isArray(left) ? left : [left];
    const rightElements = Array.isArray(right) ? right : [right];

    const leftX = options.leftX ?? 6;
    const rightX = options.rightX ?? 52;
    const y = options.y ?? 24;
    const yNum = typeof y === "number" ? y : 24;
    const gap = options.gap ?? 3;
    const leftWidth = options.leftWidth ?? rightX - leftX - (options.rule ? 4 : 2);
    const rightWidth = options.rightWidth ?? Math.max(20, 100 - rightX - 6);

    for (const el of leftElements) {
      if ((el as Record<string, unknown>).width === undefined) {
        (el as Record<string, unknown>).width = `${leftWidth}cqw`;
      }
    }
    for (const el of rightElements) {
      if ((el as Record<string, unknown>).width === undefined) {
        (el as Record<string, unknown>).width = `${rightWidth}cqw`;
      }
    }

    arrange.column(leftElements, {
      x: leftX,
      y,
      gap,
      width: leftWidth,
      animate: options.animate,
      duration: options.duration,
    });

    arrange.column(rightElements, {
      x: rightX,
      y,
      gap,
      width: rightWidth,
      animate: options.animate,
      duration: options.duration,
    });

    let ruleConn: ConnectorElement | undefined;
    if (options.rule) {
      const ruleX = leftX + leftWidth + (rightX - (leftX + leftWidth)) / 2;
      const leftM = leftElements.map((el) => measureElement(el, leftWidth));
      const rightM = rightElements.map((el) => measureElement(el, rightWidth));
      const leftH =
        leftM.reduce((sum, m) => sum + m.heightCqh, 0) + Math.max(0, leftElements.length - 1) * gap;
      const rightH =
        rightM.reduce((sum, m) => sum + m.heightCqh, 0) +
        Math.max(0, rightElements.length - 1) * gap;
      const totalH = Math.max(leftH, rightH);

      const inset = typeof options.rule === "object" && options.rule.inset ? options.rule.inset : 0;
      const startY = yNum + inset;
      const endY = yNum + totalH - inset;
      const cfg = typeof options.rule === "object" ? options.rule : {};
      ruleConn = Connector(
        { x: ruleX, y: startY },
        { x: ruleX, y: endY },
        {
          color: cfg.color ?? "rgba(255, 255, 255, 0.12)",
          strokeWidth: cfg.strokeWidth ?? 1,
          dashed: cfg.dashed,
          dotted: cfg.dotted,
          endHead: "none",
        },
      );
    }

    return { rule: ruleConn };
  },

  /**
   * Positions an element above a target element, separated by `gap`.
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

    let cx = options.centerX ?? 50;
    let cy = options.centerY ?? 50;

    if (options.center) {
      if ("x" in options.center && "y" in options.center) {
        if (typeof options.center.x === "number") cx = options.center.x;
        if (typeof options.center.y === "number") cy = options.center.y;
      }
      // If anchor element, center on its midpoint
      const centerEl = options.center as LayoutElement;
      if ("domElement" in centerEl || "width" in centerEl) {
        const m = measureElement(centerEl);
        if (typeof centerEl.x === "number") cx = centerEl.x + m.widthCqw / 2;
        if (typeof centerEl.y === "number") cy = centerEl.y + m.heightCqh / 2;
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
