/**
 * Layout calculation engine for rows, columns, grids, stacks, and circular topologies.
 */

import {
  type ElementAnchor,
  type Point,
  type PositionTransitionDescriptor,
  type ReactiveElementBase,
  resolveAnchor,
  type Size,
  STAGE_UNIT_VAR,
  STAGE_UNITS_TALL,
  stageUnitPx,
  stageUnitsWide,
  tryGetActiveStage,
  units,
} from "../core/index";
import { getPositionMotion, positionMotion } from "../core/position-motion";
import { applyRuleStyles, type RuleOptions } from "../decorators/rule";
import { to } from "../motion/transitions";
import { getStageStyleContext } from "../theme/context";
import { applyThemeTokens } from "../theme/tokens";
import { type DOMElement, DOMElementImpl, mount } from "./element";

export type { RuleOptions };

/**
 * Any stage element that layout helpers can measure and position.
 * @category Layout
 */
export type LayoutElement = ReactiveElementBase;

/**
 * A cell in a grid layout. Empty cells are `null` or `undefined`.
 * @category Layout
 */
export type GridSlot = LayoutElement | null | undefined;

/**
 * Animation configuration for layout placement.
 * Can be:
 * - `boolean`: `true` to animate with default duration (0.6s).
 * - `Function`: A callback receiving `(position, element, index)` returning a configured transition via `to(position)`.
 * @category Layout
 */
export type LayoutAnimation =
  | boolean
  | ((position: Point, element: LayoutElement, index: number) => PositionTransitionDescriptor);

/**
 * A slot in a stack layout: either a single element or a nested array of elements (column/row).
 * @category Layout
 */
export type StackSlot = LayoutElement | LayoutElement[];

/** Available rectangle in stage units. No DOM container is created. @category Layout */
export interface LayoutRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Shared stack and grid placement options. @category Layout */
export interface LayoutOptions {
  /** Available space. Default: full stage. Coordinates remain absolute stage units. */
  region?: LayoutRegion;
  /** Left edge in stage units, or `"center"`. Default: region left edge. */
  x?: number | "center";
  /** Top edge in stage units, or `"center"`. Default: region top edge. */
  y?: number | "center";
  /** Element width in stage units or CSS length; arrays select columns (hstack/grid) or rows (vstack). Overrides existing widths. */
  width?: Size | Size[];
  /** Element height in stage units or CSS length; arrays select columns (hstack) or rows (vstack/grid). Overrides existing heights. */
  height?: Size | Size[];
  /** Primary gap in stage units. Defaults: hstack 6, vstack 3, grid 4. */
  gap?: number;
  /** Horizontal gutter spacing in stage units. */
  gapX?: number;
  /** Vertical gutter spacing in stage units. */
  gapY?: number;
  /**
   * Whether or how to animate elements into target positions.
   * Can be `true` or a builder callback `(position, el, index) => to(position).duration(0.8)`.
   */
  animate?: LayoutAnimation;
  /** Fallback duration in seconds if `animate: true` is used (default: 0.6s). */
  duration?: number;
  /** Optional divider rule(s) placed in gutters between elements or columns/rows. */
  rule?: boolean | RuleOptions;
  /** Cross-axis or grid-cell alignment: "start" (default), "center", or "end". */
  align?: RelativeAlign;
}

/** Stack placement and distribution. @category Layout */
export interface StackLayoutOptions extends LayoutOptions {
  /** Main-axis placement within the region; overrides that axis's coordinate. Default: unset. */
  justify?: RelativeAlign | "space-between";
}

/** Placement relative to an element. @category Layout */
export interface RelativeLayoutOptions {
  /** Element dimensions; arrays select each placed element. Default: existing size. */
  width?: Size | Size[];
  height?: Size | Size[];
  /** Distance from the target in stage units; default: 3. */
  gap?: number;
  /** Perpendicular alignment; default: start. */
  align?: RelativeAlign;
  /** Chain elements in reading order; default: true. */
  stack?: boolean;
  animate?: LayoutAnimation;
  /** Duration in seconds; default: 0.6. */
  duration?: number;
}

/**
 * Relative cardinal placement position.
 */
type RelativePlacement = "top" | "bottom" | "left" | "right";

/**
 * Edge alignment within layout space.
 * @category Layout
 */
export type RelativeAlign = "start" | "center" | "end";

/**
 * Options for circular/orbit layout arrangement.
 * @category Layout
 */
export interface CircleLayoutOptions {
  /** Available space for the default center. Default: full stage. */
  region?: LayoutRegion;
  /** Center anchor point as [x, y] in stage units, or a center element (default: stage center). */
  center?: Point | LayoutElement;
  /** Orbit radius in stage units (default: 28). */
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
   * Can be `true` or a builder callback `(position, el, index) => to(position).duration(0.8)`.
   */
  animate?: LayoutAnimation;
  /** Fallback duration in seconds if `animate: true` is used (default: 0.6s). */
  duration?: number;
}

/**
 * Options for rigid-body group transform (uniform scale + translate).
 * @category Layout
 */
export interface GroupLayoutOptions {
  /** Target center position as [x, y] in stage units. Default: current bounding center. */
  position?: Point;
  /** Relative scale multiplier applied to current positions and scales. Default: 1. */
  scale?: number;
  /** Transform origin as [x, y] in stage units. Default: bounding-box center of the elements. */
  origin?: Point;
  /** Animate the transform. Default: false. A callback configures the shared center transition once. */
  animate?: boolean | ((position: Point) => PositionTransitionDescriptor);
  /** Duration in seconds when `animate: true`. Default: 0.6s. */
  duration?: number;
}

/**
 * Temporarily attaches an unmounted DOM element offscreen to measure its computed layout dimensions.
 * @internal
 */
export function measureOffscreen(dom: HTMLElement): { width: number; height: number } {
  if (dom.isConnected) {
    return { width: dom.offsetWidth, height: dom.offsetHeight };
  }
  const stage = tryGetActiveStage();
  const context = stage && getStageStyleContext(stage);
  const host = document.createElement("div");
  host.className = "sr-stage sr-measurement";
  host.style.width = `${stage?.width ?? 1920}px`;
  host.style.height = `${stage?.height ?? 1080}px`;
  host.style.setProperty("--sr-scale", String(context?.scale ?? 1));
  if (context) applyThemeTokens(host, context.theme);

  const parent = dom.parentNode;
  const next = dom.nextSibling;
  host.appendChild(dom);
  // biome-ignore lint/plugin: temporary offscreen measurement host
  document.body.appendChild(host);
  try {
    return { width: dom.offsetWidth, height: dom.offsetHeight };
  } finally {
    if (parent) parent.insertBefore(dom, next);
    else dom.remove();
    host.remove();
  }
}

/** Stage width in stage units, falling back to a 16:9 stage before mount. */
function stageWidthUnits(): number {
  return tryGetActiveStage()?.unitsWide ?? stageUnitsWide(1920, 1080);
}

function measureElement(el: LayoutElement): { width: number; height: number } {
  const dom = (el as { domElement?: HTMLElement }).domElement;
  if (!dom) return { width: 24, height: 7.2 };

  const stage = tryGetActiveStage();
  const unitPx = stageUnitPx(stage?.height ?? 1080);

  const prevWidth = dom.style.width;
  const prevHeight = dom.style.height;
  const heightSource = record(el).height;
  if (heightSource !== undefined)
    dom.style.height =
      typeof heightSource === "number" ? `${heightSource * unitPx}px` : String(heightSource);
  const prevUnit = dom.style.getPropertyValue(STAGE_UNIT_VAR);
  dom.style.setProperty(STAGE_UNIT_VAR, `${unitPx}px`);

  const widthSource = record(el).width;
  if (widthSource !== undefined) {
    dom.style.width =
      typeof widthSource === "number" ? `${widthSource * unitPx}px` : String(widthSource);
  }

  try {
    const measured = measureOffscreen(dom);
    return { width: measured.width / unitPx, height: measured.height / unitPx };
  } finally {
    dom.style.width = prevWidth;
    dom.style.height = prevHeight;
    if (prevUnit) dom.style.setProperty(STAGE_UNIT_VAR, prevUnit);
    else dom.style.removeProperty(STAGE_UNIT_VAR);
  }
}

/** Alignment of existing elements. @category Layout */
export interface AlignmentOptions {
  /** Axis to align; default: x. */
  axis?: "x" | "y" | "both";
  /** Edge or center; default: start. */
  align?: RelativeAlign;
  /** Reference rectangle; default: combined element bounds. */
  region?: LayoutRegion;
  animate?: LayoutAnimation;
  /** Duration in seconds; default: 0.6. */
  duration?: number;
}

interface Bounds extends LayoutRegion {}

function record(el: LayoutElement): Record<string, unknown> {
  return el as unknown as Record<string, unknown>;
}

function regionOf(options: { region?: LayoutRegion }): LayoutRegion {
  const region = options.region ?? {
    x: 0,
    y: 0,
    width: stageWidthUnits(),
    height: STAGE_UNITS_TALL,
  };
  if (
    ![region.x, region.y, region.width, region.height].every(Number.isFinite) ||
    region.width < 0 ||
    region.height < 0
  ) {
    throw new RangeError("Layout region must have finite coordinates and nonnegative dimensions.");
  }
  return region;
}

function numberProp(el: LayoutElement, key: string, fallback: number): number {
  const value = record(el)[key];
  return typeof value === "number" ? value : fallback;
}

/** Visual axis-aligned bounds relative to the element's origin coordinate. */
function offsets(el: LayoutElement): Bounds {
  const { width, height } = measureElement(el);
  const [ax, ay] = resolveAnchor((record(el).origin ?? "top-left") as ElementAnchor);
  const scale = numberProp(el, "scale", 1);
  const angle = (numberProp(el, "rotation", 0) * Math.PI) / 180;
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ].map(([x, y]) => {
    const dx = (x - (width * ax) / 100) * scale;
    const dy = (y - (height * ay) / 100) * scale;
    return [
      dx * Math.cos(angle) - dy * Math.sin(angle),
      dx * Math.sin(angle) + dy * Math.cos(angle),
    ];
  });
  const x = Math.min(...corners.map((p) => p[0]));
  const y = Math.min(...corners.map((p) => p[1]));
  return {
    x,
    y,
    width: Math.max(...corners.map((p) => p[0])) - x,
    height: Math.max(...corners.map((p) => p[1])) - y,
  };
}

function bounds(el: LayoutElement): Bounds {
  const box = offsets(el);
  return { ...box, x: numberProp(el, "x", 0) + box.x, y: numberProp(el, "y", 0) + box.y };
}

function union(elements: LayoutElement[]): Bounds {
  const boxes = elements.map(bounds);
  const x = Math.min(...boxes.map((b) => b.x));
  const y = Math.min(...boxes.map((b) => b.y));
  return {
    x,
    y,
    width: Math.max(...boxes.map((b) => b.x + b.width)) - x,
    height: Math.max(...boxes.map((b) => b.y + b.height)) - y,
  };
}

function positionTransition(
  position: Point,
  el: LayoutElement,
  index: number,
  options: { animate?: LayoutAnimation; duration?: number },
): PositionTransitionDescriptor | undefined {
  if (typeof options.animate === "function") return options.animate(position, el, index);
  if (options.animate) return to(position).duration(options.duration ?? 0.6);
  return undefined;
}

function setPosition(
  el: LayoutElement,
  position: Point,
  options: { animate?: LayoutAnimation; duration?: number },
  index: number,
): void {
  record(el).position = positionTransition(position, el, index, options) ?? position;
}

function place(
  el: LayoutElement,
  x: number,
  y: number,
  options: { animate?: LayoutAnimation; duration?: number },
  index: number,
): void {
  const box = offsets(el);
  setPosition(el, [x - box.x, y - box.y], options, index);
}

function dimension(value: Size | Size[] | undefined, index: number): Size | undefined {
  return Array.isArray(value) ? value[index] : value;
}

function prepare(el: LayoutElement, width?: Size, height?: Size): Bounds {
  // Constraints are applied before measurement, so measured wrapping matches rendered wrapping.
  if (width !== undefined) record(el).width = width;
  if (height !== undefined) record(el).height = height;
  return offsets(el);
}

function aligned(extra: number, align: RelativeAlign = "start"): number {
  if (align === "center") return extra / 2;
  return align === "end" ? extra : 0;
}

function startAt(
  value: number | "center" | undefined,
  start: number,
  available: number,
  size: number,
): number {
  return value === "center" ? start + (available - size) / 2 : (value ?? start);
}

function positionRelative(
  elements: LayoutElement | LayoutElement[],
  target: LayoutElement,
  placement: RelativePlacement,
  options: RelativeLayoutOptions = {},
): void {
  const list = Array.isArray(elements) ? elements : [elements];
  const horizontal = placement === "left" || placement === "right";
  const reverse = placement === "left" || placement === "top";
  const targetBox = bounds(target);
  const gap = options.gap ?? 3;
  let edge = horizontal
    ? targetBox.x + (reverse ? 0 : targetBox.width)
    : targetBox.y + (reverse ? 0 : targetBox.height);
  const indices = list.map((_, i) => i);
  if (reverse && options.stack !== false) indices.reverse();
  for (const index of indices) {
    const el = list[index];
    const box = prepare(el, dimension(options.width, index), dimension(options.height, index));
    const cross = horizontal
      ? targetBox.y + aligned(targetBox.height - box.height, options.align)
      : targetBox.x + aligned(targetBox.width - box.width, options.align);
    const main = reverse ? edge - gap - (horizontal ? box.width : box.height) : edge + gap;
    place(el, horizontal ? main : cross, horizontal ? cross : main, options, index);
    if (options.stack !== false)
      edge = reverse ? main : main + (horizontal ? box.width : box.height);
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

  const el = new DOMElementImpl("rule", node, {
    x,
    y,
    width,
    height,
  });
  return mount(el);
}

interface SlotMeasurement {
  items: { el: LayoutElement; box: Bounds }[];
  width: number;
  height: number;
}

function stackLayout(
  elements: StackSlot[],
  options: StackLayoutOptions,
  horizontal: boolean,
): DOMElement[] {
  if (!elements.length) return [];
  const region = regionOf(options);
  const gapX = options.gapX ?? (horizontal ? options.gap : undefined) ?? 6;
  const gapY = options.gapY ?? (!horizontal ? options.gap : undefined) ?? 3;
  const primaryGap = horizontal ? gapX : gapY;
  const slots: SlotMeasurement[] = elements.map((slot, index) => {
    const items = (Array.isArray(slot) ? slot : [slot]).map((el) => ({
      el,
      box: prepare(el, dimension(options.width, index), dimension(options.height, index)),
    }));
    if (!items.length) return { items, width: 0, height: 0 };
    let width = Math.max(...items.map((item) => item.box.width));
    let height = Math.max(...items.map((item) => item.box.height));
    if (Array.isArray(slot)) {
      if (horizontal)
        height = items.reduce((sum, item) => sum + item.box.height, 0) + (items.length - 1) * gapY;
      else width = items.reduce((sum, item) => sum + item.box.width, 0) + (items.length - 1) * gapX;
    }
    return { items, width, height };
  });
  const mainSize =
    slots.reduce((sum, slot) => sum + (horizontal ? slot.width : slot.height), 0) +
    (slots.length - 1) * primaryGap;
  const crossSize = Math.max(...slots.map((slot) => (horizontal ? slot.height : slot.width)));
  const available = horizontal ? region.width : region.height;
  const extra = available - mainSize;
  const distributedGap =
    options.justify === "space-between" && slots.length > 1
      ? primaryGap + Math.max(0, extra) / (slots.length - 1)
      : primaryGap;
  const width = horizontal ? mainSize : crossSize;
  const height = horizontal ? crossSize : mainSize;
  const x = startAt(options.x, region.x, region.width, width);
  const y = startAt(options.y, region.y, region.height, height);
  let cursor = horizontal ? x : y;
  if (options.justify) {
    cursor =
      (horizontal ? region.x : region.y) +
      aligned(extra, options.justify === "space-between" ? "start" : options.justify);
  }
  const crossStart = horizontal ? y : x;
  const rules: DOMElement[] = [];
  let itemIndex = 0;
  slots.forEach((slot, index) => {
    const cross =
      crossStart + aligned(crossSize - (horizontal ? slot.height : slot.width), options.align);
    let inner = cross;
    for (const { el, box } of slot.items) {
      place(
        el,
        horizontal ? cursor + aligned(slot.width - box.width, options.align) : inner,
        horizontal ? inner : cursor + aligned(slot.height - box.height, options.align),
        options,
        itemIndex++,
      );
      inner += horizontal ? box.height + gapY : box.width + gapX;
    }
    const size = horizontal ? slot.width : slot.height;
    if (options.rule && index < slots.length - 1) {
      rules.push(
        divider(
          horizontal,
          cursor + size + distributedGap / 2,
          crossStart,
          crossSize,
          options.rule,
        ),
      );
    }
    cursor += size + distributedGap;
  });
  return rules;
}

function divider(
  vertical: boolean,
  at: number,
  cross: number,
  length: number,
  rule: boolean | RuleOptions,
): DOMElement {
  const cfg = typeof rule === "object" ? rule : {};
  const inset = cfg.inset ?? 0;
  let thickness = cfg.thickness ?? 2;
  if (cfg.bracket) thickness = typeof cfg.bracket === "number" ? cfg.bracket : 10;
  const thin = typeof thickness === "number" ? `${thickness}px` : thickness;
  return createLayoutRule(
    vertical ? at : cross + inset,
    vertical ? cross + inset : at,
    vertical ? thin : units(Math.max(0, length - 2 * inset)),
    vertical ? units(Math.max(0, length - 2 * inset)) : thin,
    { ...cfg, side: cfg.side ?? (vertical ? "left" : "top") },
  );
}

/** One-shot positioning without DOM containers. @category Layout */
export const layout = {
  /** Arrange a row; nested arrays form columns. Default gaps: 6 horizontal, 3 vertical stage units. */
  hstack(elements: StackSlot[], options: StackLayoutOptions = {}): DOMElement[] {
    return stackLayout(elements, options, true);
  },
  /** Arrange a column; nested arrays form rows. Default gaps: 6 horizontal, 3 vertical stage units. */
  vstack(elements: StackSlot[], options: StackLayoutOptions = {}): DOMElement[] {
    return stackLayout(elements, options, false);
  },
  /** Arrange cells in rows. Default gaps: 4 stage units; alignment: start on both axes. */
  grid(matrix: GridSlot[][], options: LayoutOptions = {}): DOMElement[] {
    const cols = Math.max(0, ...matrix.map((row) => row.length));
    if (!cols || !matrix.some((row) => row.some(Boolean))) return [];
    const region = regionOf(options);
    const gapX = options.gapX ?? options.gap ?? 4;
    const gapY = options.gapY ?? options.gap ?? 4;
    const cells = matrix.map((row, r) =>
      row.map((el, c) =>
        el
          ? { el, box: prepare(el, dimension(options.width, c), dimension(options.height, r)) }
          : null,
      ),
    );
    const widths = Array.from({ length: cols }, (_, c) =>
      Math.max(0, ...cells.map((row) => row[c]?.box.width ?? 0)),
    );
    const heights = cells.map((row) => Math.max(0, ...row.map((cell) => cell?.box.height ?? 0)));
    const width = widths.reduce((a, b) => a + b, 0) + (cols - 1) * gapX;
    const height = heights.reduce((a, b) => a + b, 0) + (matrix.length - 1) * gapY;
    const x = startAt(options.x, region.x, region.width, width);
    let y = startAt(options.y, region.y, region.height, height);
    const startY = y;
    let index = 0;
    const rules: DOMElement[] = [];
    cells.forEach((row, r) => {
      let cursor = x;
      for (let c = 0; c < cols; c++) {
        const cell = row[c];
        if (cell)
          place(
            cell.el,
            cursor + aligned(widths[c] - cell.box.width, options.align),
            y + aligned(heights[r] - cell.box.height, options.align),
            options,
            index++,
          );
        if (r === 0 && options.rule && c < cols - 1)
          rules.push(divider(true, cursor + widths[c] + gapX / 2, startY, height, options.rule));
        cursor += widths[c] + gapX;
      }
      if (options.rule && r < cells.length - 1)
        rules.push(divider(false, y + heights[r] + gapY / 2, x, width, options.rule));
      y += heights[r] + gapY;
    });
    return rules;
  },
  /** Align existing elements within their combined bounds or a region. Default: left edges. */
  align(elements: LayoutElement[], options: AlignmentOptions = {}): void {
    if (!elements.length) return;
    const region = options.region ?? union(elements);
    regionOf({ region });
    elements.forEach((el, index) => {
      const box = bounds(el);
      const axis = options.axis ?? "x";
      const x = axis === "y" ? box.x : region.x + aligned(region.width - box.width, options.align);
      const y =
        axis === "x" ? box.y : region.y + aligned(region.height - box.height, options.align);
      place(el, x, y, options, index);
    });
  },
  /** Place above a target; gap defaults to 3 stage units. */
  above(
    elements: LayoutElement | LayoutElement[],
    target: LayoutElement,
    options: RelativeLayoutOptions = {},
  ): void {
    positionRelative(elements, target, "top", options);
  },
  /** Place below a target; gap defaults to 3 stage units. */
  below(
    elements: LayoutElement | LayoutElement[],
    target: LayoutElement,
    options: RelativeLayoutOptions = {},
  ): void {
    positionRelative(elements, target, "bottom", options);
  },
  /** Place left of a target; gap defaults to 3 stage units. */
  leftOf(
    elements: LayoutElement | LayoutElement[],
    target: LayoutElement,
    options: RelativeLayoutOptions = {},
  ): void {
    positionRelative(elements, target, "left", options);
  },
  /** Place right of a target; gap defaults to 3 stage units. */
  rightOf(
    elements: LayoutElement | LayoutElement[],
    target: LayoutElement,
    options: RelativeLayoutOptions = {},
  ): void {
    positionRelative(elements, target, "right", options);
  },
  /** Arrange around a center; radius defaults to 28 stage units. */
  circle(elements: LayoutElement[], options: CircleLayoutOptions = {}): void {
    const region = regionOf(options);
    let center: Point = [region.x + region.width / 2, region.y + region.height / 2];
    if (options.center) {
      if (Array.isArray(options.center)) center = options.center as Point;
      else {
        const box = bounds(options.center as LayoutElement);
        center = [box.x + box.width / 2, box.y + box.height / 2];
      }
    }
    const span = options.span ?? 360;
    elements.forEach((el, index) => {
      const angle =
        (((options.startAngle ?? -90) +
          (elements.length > 1
            ? (index * span) / (Math.abs(span) === 360 ? elements.length : elements.length - 1)
            : 0)) *
          Math.PI) /
        180;
      const box = offsets(el);
      const x = center[0] + (options.radius ?? 28) * Math.cos(angle);
      const y = center[1] + (options.radius ?? 28) * (1 - (options.flatten ?? 0)) * Math.sin(angle);
      if (options.centerElements === false) {
        setPosition(el, [x, y], options, index);
      } else place(el, x - box.width / 2, y - box.height / 2, options, index);
    });
  },
  /** Move and scale current geometry together; scale is a relative multiplier (default: 1). */
  group(elements: LayoutElement[], options: GroupLayoutOptions = {}): void {
    const positioned = elements.filter((el) => record(el).kind !== "Connector");
    if (!positioned.length) return;
    const box = union(positioned);
    const origin = options.origin ?? [box.x + box.width / 2, box.y + box.height / 2];
    const target = options.position ?? origin;
    const scale = options.scale ?? 1;
    if (!Number.isFinite(scale) || scale <= 0)
      throw new RangeError("Group scale must be positive and finite.");
    // Read every input before recording mutations, including connectors attached to these elements.
    const states = elements.map((el) => ({
      el,
      x: numberProp(el, "x", 0),
      y: numberProp(el, "y", 0),
      scale: numberProp(el, "scale", 1),
      labelScale: numberProp(el, "labelScale", 1),
    }));
    // One callback and timing descriptor describe the center's motion for the entire group.
    let transition: PositionTransitionDescriptor | undefined;
    if (typeof options.animate === "function") transition = options.animate(target);
    else if (options.animate) transition = to(target).duration(options.duration ?? 0.6);
    const destination = transition?.target;
    if (destination && (destination === "center" || destination.some((v) => typeof v !== "number")))
      throw new TypeError("Group animation must target a numeric position.");
    const center = (destination as Point | undefined) ?? target;
    const withTiming = (value: number) =>
      transition ? { ...transition, target: value, [positionMotion]: undefined } : value;
    states.forEach((state) => {
      if (record(state.el).kind === "Connector")
        record(state.el).labelScale = withTiming(state.labelScale * scale);
      else {
        const position: Point = [
          center[0] + (state.x - origin[0]) * scale,
          center[1] + (state.y - origin[1]) * scale,
        ];
        record(state.el).position = transition
          ? {
              ...transition,
              target: position,
              [positionMotion]: {
                path: getPositionMotion(transition)?.path,
                fromCenter: origin,
                toCenter: center,
              },
            }
          : position;
        record(state.el).scale = withTiming(state.scale * scale);
      }
    });
  },
};
