import { getActiveStage } from "../../core/index";
import type { ElementAnchor, ReactiveProp } from "../../core/types";
import { DOMElement, type ElementOptions } from "../element";
import {
  type Box,
  type CardinalSide,
  type Point,
  computeArcPath,
  computeBezierPath,
  computeOrthogonalPath,
  getBoxAnchorPoint,
  getTransformedPerimeterPoint,
} from "../geometry";

/**
 * Options for triggering glowing packet animations along a connector.
 * @category Components
 */
export interface PulseOptions {
  /** Color of the glowing particle (defaults to connector stroke color). */
  color?: string;
  /** Duration of the particle traversal in seconds (default: 0.6s). */
  duration?: number;
  /** Diameter of the particle in virtual canvas pixels (default: 8px). */
  size?: number;
  /** Callback invoked when the pulse completes its traversal. */
  onComplete?: () => void;
}

/**
 * Options for continuous periodic packet pulses along a connector.
 * @internal
 */
export interface PeriodicPulseOptions extends PulseOptions {
  /** Interval between successive pulse emissions in seconds (default: 2.0s). */
  interval?: number;
  /** Initial delay in seconds before the first pulse emission fires (default: 0s). */
  delay?: number;
}

/**
 * Step configuration for a multi-connector sequential pulse chain.
 * @category Motion
 */
export interface PulseSequenceStep {
  /** The connector element to pulse. */
  connector: ConnectorElement;
  /** Duration in seconds for this pulse traversal (default: 0.45s). */
  duration?: number;
  /** Particle color override. */
  color?: string;
  /** Particle diameter in pixels. */
  size?: number;
  /** Optional pause delay in seconds before the next connector pulses. */
  delayAfter?: number;
}

/**
 * Options for configuring a multi-connector sequential pulse loop.
 * @category Motion
 */
export interface PulseSequenceOptions {
  /** Whether the sequence should loop continuously (default: true). */
  loop?: boolean;
  /** Pause in seconds after the final connector finishes before restarting the cycle (default: 1.45s). */
  pauseAfter?: number;
  /** Initial delay in seconds before the first pulse begins (e.g. while nodes settle). */
  startDelay?: number;
}

/**
 * Controller handle returned by `pulseSequence()`.
 * @category Motion
 */
export interface PulseSequenceController {
  start(): void;
  stop(): void;
  isRunning(): boolean;
}

/**
 * Normalized placement along the connector path.
 * - "start": 25% along the path
 * - "center": 50% along the path (default)
 * - "end": 75% along the path
 * - number: explicit fractional ratio from 0.0 to 1.0
 * @internal
 */
export type LabelPlacement = "start" | "center" | "end" | number;

/**
 * Responsive offset for adjusting label badge position.
 * Supports numbers (1080p virtual pixels) and container units ("cqw", "cqh", "rem", "px").
 * e.g. `{ y: "-1.5cqh" }` or `{ x: "2cqw", y: -8 }`.
 * @internal
 */
export type LabelOffset = { x?: number | string; y?: number | string } | number | string;

function resolveOffset(val: number | string | undefined, baseDim: number): number {
  if (val === undefined) return 0;
  if (typeof val === "number") return val;
  const s = val.trim();
  if (s.endsWith("cqw") || s.endsWith("%")) {
    return (Number.parseFloat(s) / 100) * 1920;
  }
  if (s.endsWith("cqh")) {
    return (Number.parseFloat(s) / 100) * 1080;
  }
  if (s.endsWith("rem")) {
    return Number.parseFloat(s) * 16;
  }
  return Number.parseFloat(s) || 0;
}

/**
 * Head marker decoration types at the endpoints of a Connector line.
 * @category Components
 */
export type ConnectorHeadType =
  | "none"
  | "arrow"
  | "open"
  | "dot"
  | "circle"
  | "diamond"
  | "diamond-open"
  | "bar"
  | "crow";

interface HeadMarker {
  type: ConnectorHeadType;
  size: number;
  node: SVGElement;
  retract: number;
}

function createSvg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attrs: Record<string, string | number>,
): SVGElementTagNameMap[K] {
  const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [k, v] of Object.entries(attrs)) {
    el.setAttribute(k, String(v));
  }
  return el;
}

function createHeadMarker(
  type: ConnectorHeadType,
  size: number,
  color: string,
  strokeWidth: number,
): HeadMarker | null {
  if (type === "none") return null;

  const half = size * 0.45;

  if (type === "arrow") {
    const points = `-${size},-${half} 0,0 -${size},${half}`;
    // Blot group: opaque background eraser + colored fill on top
    const g = createSvg("g", {});
    g.appendChild(createSvg("polygon", { points, fill: "#0f172a" }));
    g.appendChild(createSvg("polygon", { points, fill: color }));
    // Retract by full size so path ends at the arrowhead base (not midway through the narrow tip)
    return { type, size, node: g, retract: size };
  }

  if (type === "open") {
    const node = createSvg("polyline", {
      points: `-${size},-${half} 0,0 -${size},${half}`,
      fill: "none",
      stroke: color,
      "stroke-width": strokeWidth,
      "stroke-linecap": "round",
      "stroke-linejoin": "round",
    });
    return { type, size, node, retract: 2 };
  }

  if (type === "dot") {
    const r = size * 0.35;
    const node = createSvg("circle", { cx: -r, cy: 0, r, fill: color });
    return { type, size, node, retract: r * 1.5 };
  }

  if (type === "circle") {
    const r = size * 0.35;
    const node = createSvg("circle", {
      cx: -r,
      cy: 0,
      r,
      fill: "#0f172a",
      stroke: color,
      "stroke-width": strokeWidth,
    });
    return { type, size, node, retract: r * 2 };
  }

  if (type === "diamond") {
    const points = `0,0 -${half},-${half} -${size},0 -${half},${half}`;
    const g = createSvg("g", {});
    g.appendChild(createSvg("polygon", { points, fill: "#0f172a" }));
    g.appendChild(createSvg("polygon", { points, fill: color }));
    return { type, size, node: g, retract: size * 0.8 };
  }

  if (type === "diamond-open") {
    const node = createSvg("polygon", {
      points: `0,0 -${half},-${half} -${size},0 -${half},${half}`,
      fill: "#0f172a",
      stroke: color,
      "stroke-width": strokeWidth,
    });
    return { type, size, node, retract: size * 0.9 };
  }

  if (type === "bar") {
    const barHalf = size * 0.5;
    const node = createSvg("line", {
      x1: 0,
      y1: -barHalf,
      x2: 0,
      y2: barHalf,
      stroke: color,
      "stroke-width": strokeWidth,
      "stroke-linecap": "round",
    });
    return { type, size, node, retract: 0 };
  }

  if (type === "crow") {
    const g = createSvg("g", {});
    g.appendChild(
      createSvg("polyline", {
        points: `-${size},-${half} 0,0 -${size},${half}`,
        fill: "none",
        stroke: color,
        "stroke-width": strokeWidth,
        "stroke-linecap": "round",
      }),
    );
    g.appendChild(
      createSvg("line", {
        x1: -size,
        y1: 0,
        x2: 0,
        y2: 0,
        stroke: color,
        "stroke-width": strokeWidth,
      }),
    );
    return { type, size, node: g, retract: size * 0.7 };
  }

  return null;
}

/**
 * Configuration options for creating a reactive Connector between two elements or points.
 * @category Components
 */
export interface ConnectorOptions extends Omit<ElementOptions, "style"> {
  /** Optional text label rendered at the connector's midpoint or specified placement. */
  label?: string;
  /** Position of the label along the path ("start" | "center" | "end" | 0..1 ratio). Reactive. */
  labelPlacement?: ReactiveProp<LabelPlacement>;
  /** Responsive offset to nudge the label ({ x, y } in px, cqw, cqh, or rem). Reactive. */
  labelOffset?: ReactiveProp<LabelOffset>;
  /** Horizontal offset for the label in virtual pixels or container units. Reactive. */
  labelOffsetX?: ReactiveProp<number | string>;
  /** Vertical offset for the label in virtual pixels or container units. Reactive. */
  labelOffsetY?: ReactiveProp<number | string>;
  /** Routing style: straight line, 90° orthogonal corners, smooth cubic Bézier, or single-curvature circular arc. */
  routing?: "straight" | "corner" | "bezier" | "arc";
  /** CSS style declaration or routing shortcut. */
  style?: "straight" | "corner" | "bezier" | "arc" | Partial<CSSStyleDeclaration>;
  /** Curvature bow factor for "arc" routing (defaults to 0.2). Positive bows outward, negative bows inward. */
  curvature?: number;
  /** Cardinal attachment face or custom { x, y } anchor on the origin target ("auto" | "top" | "bottom" | "left" | "right" | { x, y }). */
  fromAnchor?: "auto" | ElementAnchor;
  /** Cardinal attachment face or custom { x, y } anchor on the destination target ("auto" | "top" | "bottom" | "left" | "right" | { x, y }). */
  toAnchor?: "auto" | ElementAnchor;
  /** Stroke color of the connector line (defaults to #38bdf8). */
  color?: string;
  /** Stroke width in virtual pixels (defaults to 3). */
  strokeWidth?: number;
  /** Whether the line is styled with dashed strokes. */
  dashed?: boolean;
  /** Whether the line is styled with dotted strokes. */
  dotted?: boolean;
  /** Whether dotted strokes stream continuously in a traveling particle animation. */
  traveling?: boolean;
  /** Alias for traveling animation. */
  animated?: boolean;
  /** Head marker at the start/origin endpoint (defaults to "none"). */
  startHead?: ConnectorHeadType;
  /** Head marker at the end/destination endpoint (defaults to "arrow"). */
  endHead?: ConnectorHeadType;
  /** Size of the start head marker in virtual canvas pixels (defaults to 16). */
  startHeadSize?: number;
  /** Size of the end head marker in virtual canvas pixels (defaults to 16). */
  endHeadSize?: number;
  /** Trim-path start offset from 0.0 to 1.0. */
  start?: ReactiveProp<number>;
  /**
   * Trim-path end offset from 0.0 to 1.0 for draw-in transitions.
   * When animated (e.g. `to(1)`), the arrowhead automatically rides the leading edge of the stroke.
   */
  end?: ReactiveProp<number>;
  /** Corner radius for rounded box intersections (defaults to 12). */
  radius?: number;
  /** Outer clearance padding around card perimeters in virtual pixels (defaults to 6). */
  padding?: number;
  /** Custom perimeter clearance at the origin card. */
  fromPadding?: number;
  /** Custom perimeter clearance at the destination card. */
  toPadding?: number;
  /** Continuous periodic pulse configuration or interval in seconds (e.g. 1.5 or { interval: 2.0, color: '#38bdf8' }). */
  pulseInterval?: number | PeriodicPulseOptions;
  /** Alias for pulseInterval. */
  periodicPulse?: boolean | number | PeriodicPulseOptions;
  /** Vertical alignment Y coordinate for sequence diagram horizontal messages. */
  messageY?: ReactiveProp<number | string>;
}

/**
 * Valid endpoint target for a Connector line (DOMElement, point coordinates, or element proxy).
 * @category Components
 */
export type ConnectorTarget =
  | DOMElement
  | Point
  | { x: number | string; y: number | string; domElement?: HTMLElement };

/**
 * @internal
 */
export class ConnectorElement extends DOMElement {
  fromTarget: ConnectorTarget;
  toTarget: ConnectorTarget;
  connectorStyle: "straight" | "corner" | "bezier" | "arc";
  curvature = 0.2;
  connectorColor: string;
  strokeWidth: number;
  isDashed: boolean;
  isDotted: boolean;
  startHead: ConnectorHeadType;
  endHead: ConnectorHeadType;
  startHeadSize: number;
  endHeadSize: number;
  radius: number;
  padding: number;
  labelPlacement: ReactiveProp<LabelPlacement> = "center";
  labelOffset: ReactiveProp<LabelOffset> = 0;
  labelOffsetX: ReactiveProp<number | string> = 0;
  labelOffsetY: ReactiveProp<number | string> = 0;

  fromAnchor: "auto" | ElementAnchor = "auto";
  toAnchor: "auto" | ElementAnchor = "auto";

  svgRoot: SVGSVGElement;
  pathNode: SVGPathElement;
  startHeadNode: SVGElement | null = null;
  endHeadNode: SVGElement | null = null;
  startRetract = 0;
  endRetract = 0;
  labelGroup: SVGGElement | null = null;
  labelBg: SVGRectElement | null = null;
  labelText: SVGTextElement | null = null;

  private _start: ReactiveProp<number> = 0;
  private _end: ReactiveProp<number> = 1;

  get start(): ReactiveProp<number> {
    return this._start;
  }
  set start(val: ReactiveProp<number>) {
    this._start = val;
    if (this.animInterval === null) {
      this.update();
    }
  }

  get end(): ReactiveProp<number> {
    return this._end;
  }
  set end(val: ReactiveProp<number>) {
    this._end = val;
    if (this.animInterval === null) {
      this.update();
    }
  }

  messageY?: ReactiveProp<number | string>;
  private animInterval: number | null = null;
  private periodicIntervalTimer: number | null = null;
  private periodicTimeoutTimer: number | null = null;
  private periodicOptions: PeriodicPulseOptions | null = null;
  private activePulseDots = new Set<SVGElement>();
  constructor(from: ConnectorTarget, to: ConnectorTarget, options: ConnectorOptions = {}) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.style.position = "absolute";
    svg.style.top = "0";
    svg.style.left = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.pointerEvents = "none";
    svg.style.zIndex = "10";
    svg.style.overflow = "visible";
    svg.setAttribute("viewBox", "0 0 1920 1080");
    svg.setAttribute("preserveAspectRatio", "none");

    if (options.traveling || options.animated) {
      svg.classList.add("sr-connector-traveling-dots");
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const color = options.color || "#38bdf8";
    const sWidth = options.strokeWidth || 3;
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", String(sWidth));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-linecap", "butt");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("pathLength", "1000");

    if (options.dotted) {
      path.setAttribute("stroke-dasharray", "4 10");
    } else if (options.dashed) {
      path.setAttribute("stroke-dasharray", "8 6");
    }

    svg.appendChild(path);

    const startType = options.startHead ?? "none";
    const endType = options.endHead ?? "arrow";
    const startSize = options.startHeadSize ?? 16;
    const endSize = options.endHeadSize ?? 16;

    const startMarker = createHeadMarker(startType, startSize, color, sWidth);
    const endMarker = createHeadMarker(endType, endSize, color, sWidth);

    if (startMarker) svg.appendChild(startMarker.node);
    if (endMarker) svg.appendChild(endMarker.node);

    let labelGroup: SVGGElement | null = null;
    let labelBg: SVGRectElement | null = null;
    let labelText: SVGTextElement | null = null;

    if (options.label) {
      labelGroup = createSvg("g", { class: "sr-connector-label-group" });
      labelGroup.style.pointerEvents = "none";

      const textLen = (options.label || "").length;
      const initW = textLen * 10 + 20;
      const initH = 26;

      labelBg = createSvg("rect", {
        x: -initW / 2,
        y: -initH / 2,
        width: initW,
        height: initH,
        rx: 5,
        fill: "rgba(15, 23, 42, 0.95)",
        stroke: color,
        "stroke-width": 1,
        "stroke-opacity": 0.4,
      });
      labelGroup.appendChild(labelBg);

      labelText = createSvg("text", {
        "text-anchor": "middle",
        "dominant-baseline": "central",
        fill: "#f8fafc",
        "font-size": "13px",
        "font-weight": "500",
        "font-family": "system-ui, -apple-system, sans-serif",
      });
      labelText.textContent = options.label;
      labelGroup.appendChild(labelText);

      svg.appendChild(labelGroup);
    }

    const { style: optStyle, routing, ...domOpts } = options;
    const resolvedRouting = (typeof optStyle === "string" ? optStyle : routing || "straight") as
      | "straight"
      | "corner"
      | "bezier"
      | "arc";
    const resolvedCss = typeof optStyle === "object" ? optStyle : undefined;

    super("Connector", svg, { ...domOpts, x: 0, y: 0, style: resolvedCss });

    this.domElement.style.pointerEvents = "none";
    this.fromTarget = from;
    this.toTarget = to;
    this.connectorStyle = resolvedRouting;
    this.connectorColor = color;
    this.strokeWidth = sWidth;
    this.isDashed = !!options.dashed;
    this.isDotted = !!options.dotted;
    this.startHead = startType;
    this.endHead = endType;
    this.startHeadSize = startSize;
    this.endHeadSize = endSize;
    this.startHeadNode = startMarker?.node ?? null;
    this.endHeadNode = endMarker?.node ?? null;
    this.startRetract = startMarker?.retract ?? 0;
    this.endRetract = endMarker?.retract ?? 0;
    this.radius = options.radius ?? 12;
    this.padding = options.padding ?? 6;
    if (options.curvature !== undefined) this.curvature = options.curvature;

    if (options.fromAnchor) this.fromAnchor = options.fromAnchor;
    if (options.toAnchor) this.toAnchor = options.toAnchor;
    if (options.labelPlacement !== undefined) this.labelPlacement = options.labelPlacement;
    if (options.labelOffset !== undefined) this.labelOffset = options.labelOffset;
    if (options.labelOffsetX !== undefined) this.labelOffsetX = options.labelOffsetX;
    if (options.labelOffsetY !== undefined) this.labelOffsetY = options.labelOffsetY;

    this.svgRoot = svg;
    this.pathNode = path;
    this.labelGroup = labelGroup;
    this.labelBg = labelBg;
    this.labelText = labelText;

    if (options.start !== undefined) this.start = options.start;
    if (options.end !== undefined) this.end = options.end;
    if (options.messageY !== undefined) this.messageY = options.messageY;
    if (options.y !== undefined) this.messageY = options.y;

    const periodic = options.pulseInterval ?? options.periodicPulse;
    if (periodic) {
      if (typeof periodic === "number") {
        this.periodicOptions = { interval: periodic };
      } else if (typeof periodic === "object") {
        this.periodicOptions = { ...periodic };
      } else if (periodic === true) {
        this.periodicOptions = { interval: 2.0 };
      }
    }

    this.update();

    const startRaf = () => {
      if (typeof window === "undefined" || this.animInterval !== null) return;
      const tick = () => {
        if (
          this.domElement?.isConnected &&
          this.domElement.style.display !== "none" &&
          this.domElement.style.visibility !== "hidden"
        ) {
          this.update();
          this.animInterval = requestAnimationFrame(tick);
        } else {
          this.animInterval = null;
        }
      };
      this.animInterval = requestAnimationFrame(tick);
    };

    const stopRaf = () => {
      if (this.animInterval !== null) {
        cancelAnimationFrame(this.animInterval);
        this.animInterval = null;
      }
    };

    this.onPlay(() => {
      this._resumePeriodicPulse();
      startRaf();
    });

    this.onPause(() => {
      this._pausePeriodicPulse();
      stopRaf();
    });

    // Register diagnostics metrics for background loop monitoring
    const stage = getActiveStage();
    stage.metrics.register(`connector.${this.id}`, () => ({
      raf_loop_active: this.animInterval !== null ? 1 : 0,
      periodic_pulse_active: this.periodicIntervalTimer !== null ? 1 : 0,
      active_pulses_count: this.activePulseDots.size,
      dom_pulse_packets_count: this.svgRoot.querySelectorAll(".sr-pulse-packet").length,
      is_mounted: Boolean(this.domElement?.isConnected),
    }));
  }

  private resolveBoxOrPoint(target: ConnectorTarget): { point: Point; box?: Box } {
    if ("domElement" in target && target.domElement instanceof HTMLElement) {
      const el = target as DOMElement;
      const dom = el.domElement;
      const viewport =
        (dom.parentElement?.closest("[style*='container-type']") as HTMLElement) ||
        dom.parentElement;

      if (viewport && dom.isConnected) {
        const vRect = viewport.getBoundingClientRect();
        const dRect = dom.getBoundingClientRect();
        const scale = vRect.width > 0 ? vRect.width / 1920 : 1;
        const x = (dRect.left - vRect.left) / scale;
        const y = (dRect.top - vRect.top) / scale;
        const width = dRect.width / scale;
        const height = dRect.height / scale;

        return {
          point: { x: x + width / 2, y: y + height / 2 },
          box: {
            x,
            y,
            width,
            height,
            scale: typeof el.scale === "number" ? el.scale : 1,
            rotation: typeof el.rotation === "number" ? el.rotation : 0,
          },
        };
      }

      const width = dom.offsetWidth || 120;
      const height = dom.offsetHeight || 60;
      const rawX = typeof el.x === "number" ? (el.x <= 100 ? (el.x / 100) * 1920 : el.x) : 0;
      const rawY = typeof el.y === "number" ? (el.y <= 100 ? (el.y / 100) * 1080 : el.y) : 0;

      return {
        point: { x: rawX + width / 2, y: rawY + height / 2 },
        box: { x: rawX, y: rawY, width, height },
      };
    }

    const pt = target as { x?: number | string; y?: number | string };
    let px = 0;
    if (typeof pt.x === "number") {
      px = pt.x <= 100 ? (pt.x / 100) * 1920 : pt.x;
    } else if (typeof pt.x === "string") {
      const s = pt.x.trim();
      if (s === "center") {
        px = 960;
      } else if (s.endsWith("cqw") || s.endsWith("%")) {
        px = (Number.parseFloat(s) / 100) * 1920;
      } else {
        px = Number.parseFloat(s) || 0;
      }
    }

    let py = 0;
    if (typeof pt.y === "number") {
      py = pt.y <= 100 ? (pt.y / 100) * 1080 : pt.y;
    } else if (typeof pt.y === "string") {
      const s = pt.y.trim();
      if (s === "center") {
        py = 540;
      } else if (s.endsWith("cqh") || s.endsWith("%")) {
        py = (Number.parseFloat(s) / 100) * 1080;
      } else {
        py = Number.parseFloat(s) || 0;
      }
    }

    return { point: { x: px, y: py } };
  }

  update(): void {
    const fromResolved = this.resolveBoxOrPoint(this.fromTarget);
    const toResolved = this.resolveBoxOrPoint(this.toTarget);

    let startPt = fromResolved.point;
    let endPt = toResolved.point;
    let startSide: CardinalSide = "center";
    let endSide: CardinalSide = "center";
    const resolveShapePoint = (
      target: ConnectorTarget,
      box: Box,
      targetPt: Point,
      anchorPreference: "auto" | ElementAnchor,
    ): { point: Point; side: CardinalSide } => {
      let shapeKind = "box";
      if ("kind" in target && typeof (target as { kind?: string }).kind === "string") {
        shapeKind = (target as { kind: string }).kind;
      } else if (
        "domElement" in target &&
        (target as DOMElement).domElement instanceof HTMLElement
      ) {
        const dom = (target as DOMElement).domElement;
        shapeKind =
          dom.getAttribute("data-shape") ||
          (dom.classList.contains("sr-shape-circle") || dom.classList.contains("sr-state-node")
            ? "circle"
            : dom.classList.contains("sr-shape-diamond")
              ? "diamond"
              : dom.classList.contains("sr-shape-pill")
                ? "pill"
                : "box");
      }

      if (shapeKind === "circle") {
        const radius = Math.min(box.width, box.height) / 2;
        return {
          point: getTransformedPerimeterPoint(box, targetPt, radius, this.padding),
          side: "center",
        };
      }

      if (shapeKind === "diamond") {
        const diamondSide = Math.min(box.width, box.height) * Math.SQRT1_2;
        return {
          point: getTransformedPerimeterPoint(
            {
              ...box,
              width: diamondSide,
              height: diamondSide,
              rotation: (box.rotation ?? 0) + 45,
            },
            targetPt,
            6,
            this.padding,
          ),
          side: "center",
        };
      }

      const anchor = getBoxAnchorPoint(box, anchorPreference, targetPt, this.padding);
      return { point: anchor.point, side: anchor.side };
    };

    if (fromResolved.box) {
      const res = resolveShapePoint(
        this.fromTarget,
        fromResolved.box,
        toResolved.point,
        this.fromAnchor,
      );
      startPt = res.point;
      startSide = res.side;
    }

    if (toResolved.box) {
      const res = resolveShapePoint(
        this.toTarget,
        toResolved.box,
        fromResolved.point,
        this.toAnchor,
      );
      endPt = res.point;
      endSide = res.side;
    }

    if (typeof this.messageY === "number" && this.messageY !== 0) {
      const fixedY = this.messageY <= 100 ? (this.messageY / 100) * 1080 : this.messageY;
      let x1 = fromResolved.point.x;
      let x2 = toResolved.point.x;
      const dir = x2 >= x1 ? 1 : -1;

      const vRect =
        this.domElement.parentElement?.getBoundingClientRect() ||
        this.domElement.getBoundingClientRect();
      const scale = vRect.width > 0 ? vRect.width / 1920 : 1;
      const activationOffset = 7 / scale + 2;
      const lifelineGap = 4 / scale;

      const fromLifeline = (
        this.fromTarget as {
          lifeline?: { hasActivationAt?: (y: number) => boolean };
        }
      )?.lifeline;
      const toLifeline = (
        this.toTarget as {
          lifeline?: { hasActivationAt?: (y: number) => boolean };
        }
      )?.lifeline;

      if (fromLifeline?.hasActivationAt?.(fixedY)) {
        x1 += dir * activationOffset;
      } else {
        x1 += dir * lifelineGap;
      }

      if (toLifeline?.hasActivationAt?.(fixedY)) {
        x2 -= dir * activationOffset;
      } else {
        x2 -= dir * lifelineGap;
      }

      startPt = { x: x1, y: fixedY };
      endPt = { x: x2, y: fixedY };
    }

    const dx = endPt.x - startPt.x;
    const dy = endPt.y - startPt.y;
    const dist = Math.hypot(dx, dy);
    const chordNx = dist > 0 ? dx / dist : 1;
    const chordNy = dist > 0 ? dy / dist : 0;

    const buildPath = (sp: Point, ep: Point): string => {
      if (this.connectorStyle === "corner")
        return computeOrthogonalPath(sp, ep, startSide, endSide);
      if (this.connectorStyle === "bezier") return computeBezierPath(sp, ep, startSide, endSide);
      if (this.connectorStyle === "arc") return computeArcPath(sp, ep, this.curvature);
      return `M ${sp.x} ${sp.y} L ${ep.x} ${ep.y}`;
    };

    // Pass 1: write the full-length path so we can measure tangents via the DOM.
    // For straight paths the chord IS the tangent, so no DOM read needed.
    const dFull = buildPath(startPt, endPt);
    this.pathNode.setAttribute("d", dFull);

    // Measure end tangent from the path geometry.
    let endTx = chordNx;
    let endTy = chordNy;
    let startTx = -chordNx;
    let startTy = -chordNy;
    if (this.connectorStyle === "arc" || this.connectorStyle === "bezier") {
      try {
        const len = this.pathNode.getTotalLength();
        if (len > 2) {
          const p1e = this.pathNode.getPointAtLength(len - 2);
          const p2e = this.pathNode.getPointAtLength(len);
          const dl = Math.hypot(p2e.x - p1e.x, p2e.y - p1e.y);
          if (dl > 0) {
            endTx = (p2e.x - p1e.x) / dl;
            endTy = (p2e.y - p1e.y) / dl;
          }

          const p1s = this.pathNode.getPointAtLength(0);
          const p2s = this.pathNode.getPointAtLength(Math.min(len, 2));
          const dl2 = Math.hypot(p2s.x - p1s.x, p2s.y - p1s.y);
          if (dl2 > 0) {
            startTx = (p1s.x - p2s.x) / dl2;
            startTy = (p1s.y - p2s.y) / dl2;
          }
        }
      } catch {
        /* keep chord direction */
      }
    }

    // Pass 2: retract endpoints along the true curve tangent, then rebuild.
    let pathStartPt = { ...startPt };
    let pathEndPt = { ...endPt };
    if (this.endHeadNode && this.endRetract > 0 && dist > 4) {
      const r = dist > 20 ? this.endRetract : dist * 0.3;
      pathEndPt = { x: endPt.x - endTx * r, y: endPt.y - endTy * r };
    }
    if (this.startHeadNode && this.startRetract > 0 && dist > 4) {
      const r = dist > 20 ? this.startRetract : dist * 0.3;
      pathStartPt = { x: startPt.x - startTx * r, y: startPt.y - startTy * r };
    }

    const d = buildPath(pathStartPt, pathEndPt);
    this.pathNode.setAttribute("d", d);

    if (this.activePulseDots.size > 0) {
      const pathStyle = `path('${d}')`;
      for (const dot of this.activePulseDots) {
        dot.style.offsetPath = pathStyle;
      }
    }

    // Apply trim paths (start..end) — preserve consistent dash spacing throughout animation
    const startVal = typeof this.start === "number" ? this.start : 0;
    const endVal = typeof this.end === "number" ? this.end : 1;
    const isTraveling = this.svgRoot.classList.contains("sr-connector-traveling-dots");

    // Always work in actual path length units so dash spacing is identical
    // during draw-in animation and at rest. Measure the path once per update.
    let actualLen = 0;
    try {
      actualLen = this.pathNode.getTotalLength();
    } catch {
      // not yet mounted; skip
    }

    if (endVal < 1 || startVal > 0) {
      const visiblePx = (endVal - startVal) * actualLen;
      if (visiblePx <= 0.1) {
        this.pathNode.style.opacity = "0";
      } else {
        this.pathNode.style.opacity = "1";
      }
      // Remove pathLength so all values below are in actual SVG user units
      this.pathNode.removeAttribute("pathLength");
      const offsetPx = -startVal * actualLen;

      if (this.isDotted) {
        this.pathNode.style.strokeDasharray = "4 10";
        this.pathNode.style.strokeDashoffset = `${offsetPx}`;
      } else if (this.isDashed) {
        const dash = 8;
        const gap = 6;
        // Trim window: a long solid segment for the visible portion, then zero for the rest
        // Achieved by: dash pattern repeated for the visible section, then huge gap
        const tail = actualLen - visiblePx;
        this.pathNode.style.strokeDasharray = `${`${dash} ${gap} `.repeat(Math.ceil(visiblePx / (dash + gap))).trimEnd()} 0 ${tail + dash + gap}`;
        this.pathNode.style.strokeDashoffset = `${offsetPx}`;
      } else {
        this.pathNode.style.strokeDasharray = `${visiblePx} ${actualLen}`;
        this.pathNode.style.strokeDashoffset = `${offsetPx}`;
      }
    } else {
      this.pathNode.style.opacity = "1";
      this.pathNode.removeAttribute("pathLength");
      if (isTraveling) {
        this.pathNode.style.strokeDasharray = "";
        this.pathNode.style.strokeDashoffset = "";
      } else if (this.isDotted) {
        this.pathNode.style.strokeDasharray = "4 10";
        this.pathNode.style.strokeDashoffset = "0";
      } else if (this.isDashed) {
        this.pathNode.style.strokeDasharray = "8 6";
        this.pathNode.style.strokeDashoffset = "0";
      } else {
        this.pathNode.style.strokeDasharray = "none";
        this.pathNode.style.strokeDashoffset = "0";
      }
    }

    // Arrowhead tips sit at node boundary (startPt / endPt).
    // Angle comes from the measured tangent — correct for arcs and bezier curves.
    if (this.startHeadNode) {
      if (startVal >= 0.98) {
        this.startHeadNode.style.opacity = "0";
      } else {
        this.startHeadNode.style.opacity = "1";
        const angle = Math.atan2(startTy, startTx) * (180 / Math.PI);
        this.startHeadNode.setAttribute(
          "transform",
          `translate(${startPt.x}, ${startPt.y}) rotate(${angle})`,
        );
      }
    }

    // Position End Head Marker
    // During draw-in transitions (endVal < 1), the arrowhead rides the leading edge of the stroke:
    // 1. Calculate point `p` at current trim length (`endVal * actualLen`) along the path.
    // 2. Measure tangent vector `(tx, ty)` at `p` to orient the arrowhead along the curve.
    // 3. Project arrowhead tip forward by `endRetract` so the marker base connects to `p`.
    // 4. When endVal >= 0.999, coordinates converge exactly to `endPt` with zero visual snap.
    if (this.endHeadNode) {
      if (endVal - startVal <= 0.02 || endVal <= 0.02) {
        this.endHeadNode.style.opacity = "0";
      } else {
        this.endHeadNode.style.opacity = "1";

        if (endVal >= 0.999 || actualLen <= 0) {
          const angle = Math.atan2(endTy, endTx) * (180 / Math.PI);
          this.endHeadNode.setAttribute(
            "transform",
            `translate(${endPt.x}, ${endPt.y}) rotate(${angle})`,
          );
        } else {
          const trimLen = Math.max(0, Math.min(actualLen, endVal * actualLen));
          const p = this.pathNode.getPointAtLength(trimLen);
          const pPrev = this.pathNode.getPointAtLength(Math.max(0, trimLen - 2));
          const dl = Math.hypot(p.x - pPrev.x, p.y - pPrev.y);
          const tx = dl > 0 ? (p.x - pPrev.x) / dl : endTx;
          const ty = dl > 0 ? (p.y - pPrev.y) / dl : endTy;
          const angle = Math.atan2(ty, tx) * (180 / Math.PI);

          const r = this.endRetract || 16;
          const tipX = p.x + tx * r;
          const tipY = p.y + ty * r;
          const headScale = Math.min(1, endVal * 4);

          this.endHeadNode.setAttribute(
            "transform",
            `translate(${tipX}, ${tipY}) rotate(${angle}) scale(${headScale})`,
          );
        }
      }
    }

    // Position Label at path midpoint
    if (this.labelGroup && this.labelText && this.labelBg) {
      if (endVal <= 0.2) {
        this.labelGroup.style.opacity = "0";
      } else {
        this.labelGroup.style.opacity = "1";
        try {
          const bbox = this.labelText.getBBox();
          const padX = 10;
          const padY = 4;
          if (bbox.width > 0 && bbox.height > 0) {
            this.labelBg.setAttribute("x", String(bbox.x - padX));
            this.labelBg.setAttribute("y", String(bbox.y - padY));
            this.labelBg.setAttribute("width", String(bbox.width + padX * 2));
            this.labelBg.setAttribute("height", String(bbox.height + padY * 2));
          }
        } catch {
          const textLen = (this.labelText.textContent || "").length;
          const w = textLen * 10 + 20;
          const h = 26;
          this.labelBg.setAttribute("x", String(-w / 2));
          this.labelBg.setAttribute("y", String(-h / 2));
          this.labelBg.setAttribute("width", String(w));
          this.labelBg.setAttribute("height", String(h));
        }

        let ratio = 0.5;
        const rawPlacement = this.labelPlacement;
        if (typeof rawPlacement === "number") {
          ratio = Math.max(0, Math.min(1, rawPlacement));
        } else if (rawPlacement === "start") {
          ratio = 0.25;
        } else if (rawPlacement === "end") {
          ratio = 0.75;
        }

        let offX = resolveOffset(this.labelOffsetX as number | string | undefined, 1920);
        let offY = 0;

        if (this.labelOffsetY !== undefined) {
          offY = resolveOffset(this.labelOffsetY as number | string | undefined, 1080);
        } else if (this.labelOffset !== undefined) {
          if (typeof this.labelOffset === "number" || typeof this.labelOffset === "string") {
            offY = resolveOffset(this.labelOffset, 1080);
          } else if (typeof this.labelOffset === "object" && this.labelOffset !== null) {
            const obj = this.labelOffset as { x?: number | string; y?: number | string };
            offX += resolveOffset(obj.x, 1920);
            offY += resolveOffset(obj.y, 1080);
          }
        } else {
          // Default offset above the connector path
          offY = -14;
        }

        try {
          const totalPathLength = this.pathNode.getTotalLength();
          if (totalPathLength > 0) {
            const pt = this.pathNode.getPointAtLength(totalPathLength * ratio);
            this.labelGroup.setAttribute("transform", `translate(${pt.x + offX}, ${pt.y + offY})`);
          } else {
            const mx = startPt.x + (endPt.x - startPt.x) * ratio;
            const my = startPt.y + (endPt.y - startPt.y) * ratio;
            this.labelGroup.setAttribute("transform", `translate(${mx + offX}, ${my + offY})`);
          }
        } catch {
          const mx = startPt.x + (endPt.x - startPt.x) * ratio;
          const my = startPt.y + (endPt.y - startPt.y) * ratio;
          this.labelGroup.setAttribute("transform", `translate(${mx + offX}, ${my + offY})`);
        }
      }
    }
  }

  /**
   * Spawns a glowing data packet particle traveling along the connector path.
   * If invoked while defining presentation steps, it automatically records as a step action.
   */
  pulse(options: PulseOptions = {}): void {
    const stage = getActiveStage() as unknown as {
      isMounted?: () => boolean;
      recordAction?: (fn: () => void) => void;
    } | null;

    if (stage && typeof stage.isMounted === "function" && !stage.isMounted()) {
      if (typeof stage.recordAction === "function") {
        stage.recordAction(() => this._executePulse(options));
      }
      return;
    }

    this._executePulse(options);
  }

  private _executePulse(options: PulseOptions = {}): void {
    if (typeof window === "undefined") return;

    // Clean up any existing active pulses on THIS connector before spawning a new one
    this.cancelPulses();

    const opacity = typeof this.opacity === "number" ? this.opacity : 1;
    if (opacity <= 0.01) return;

    const startVal = typeof this.start === "number" ? this.start : 0;
    const endVal = typeof this.end === "number" ? this.end : 1;

    // Do not pulse across invisible or incomplete connectors
    if (endVal < 0.95 || endVal - startVal <= 0.05) return;

    const pathD = this.pathNode.getAttribute("d");
    if (!pathD) return;

    const duration = (options.duration ?? 0.6) * 1000;
    const color = options.color ?? this.connectorColor;
    const size = options.size ?? 12;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
    g.classList.add("sr-pulse-packet");
    g.style.offsetPath = `path('${pathD}')`;
    g.style.offsetRotate = "auto";
    g.style.willChange = "offset-distance, opacity";

    // Outer blooming neon aura
    const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    halo.setAttribute("r", String(size / 2 + 1));
    halo.setAttribute("fill", color);
    halo.style.filter = `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 10px ${color}) drop-shadow(0 0 18px ${color})`;

    // High-intensity incandescent center
    const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    core.setAttribute("r", String(Math.max(2, size / 3.5)));
    core.setAttribute("fill", "#ffffff");

    g.appendChild(halo);
    g.appendChild(core);
    this.svgRoot.appendChild(g);
    this.activePulseDots.add(g);

    const startPct = `${startVal * 100}%`;
    const endPct = `${endVal * 100}%`;

    const anim = g.animate(
      [
        { offsetDistance: startPct, opacity: 0 },
        { offsetDistance: startPct, opacity: 1, offset: 0.08 },
        { offsetDistance: endPct, opacity: 1, offset: 0.92 },
        { offsetDistance: endPct, opacity: 0, offset: 1.0 },
      ],
      {
        duration,
        easing: "cubic-bezier(0.4, 0, 0.2, 1)",
        fill: "forwards",
      },
    );

    let finished = false;
    const cleanup = (triggerComplete: boolean) => {
      if (finished) return;
      finished = true;
      this.activePulseDots.delete(g);
      g.remove();
      if (triggerComplete) {
        options.onComplete?.();
      }
    };

    anim.onfinish = () => cleanup(true);
    anim.oncancel = () => cleanup(false);
  }

  /**
   * Immediately cancels and removes all in-flight pulse packets on this connector.
   * Note: Paused Web Animations do not fire onfinish handlers.
   * Explicit cancellation ensures no orphan SVG nodes remain.
   */
  cancelPulses(): this {
    for (const dot of Array.from(this.activePulseDots)) {
      for (const a of dot.getAnimations()) {
        a.cancel();
      }
      dot.remove();
    }
    this.activePulseDots.clear();

    const stray = this.svgRoot.querySelectorAll(".sr-pulse-packet");
    for (let i = 0; i < stray.length; i++) {
      stray[i].remove();
    }
    return this;
  }

  /**
   * Starts emitting repeating glowing packet pulses at regular intervals.
   */
  startPeriodicPulse(options?: number | PeriodicPulseOptions): this {
    if (typeof options === "number") {
      this.periodicOptions = { interval: options };
    } else if (options) {
      this.periodicOptions = { ...options };
    } else if (!this.periodicOptions) {
      this.periodicOptions = { interval: 2.0 };
    }
    this._startPeriodicTimer();
    return this;
  }

  /**
   * Stops repeating glowing packet pulses.
   */
  stopPeriodicPulse(): this {
    this._pausePeriodicPulse();
    this.periodicOptions = null;
    return this;
  }

  private _startPeriodicTimer(): void {
    if (typeof window === "undefined") return;
    this._pausePeriodicPulse();
    if (!this.periodicOptions) return;

    const opacity = typeof this.opacity === "number" ? this.opacity : 1;
    if (opacity <= 0.01) return;

    const intervalMs = (this.periodicOptions.interval ?? 2.0) * 1000;
    const delayMs = (this.periodicOptions.delay ?? 0) * 1000;

    const startLoop = () => {
      this.periodicTimeoutTimer = null;
      if (typeof this.opacity === "number" && this.opacity <= 0.01) return;
      this._executePulse(this.periodicOptions || {});
      this.periodicIntervalTimer = window.setInterval(() => {
        if (typeof this.opacity === "number" && this.opacity <= 0.01) {
          this._pausePeriodicPulse();
          return;
        }
        this._executePulse(this.periodicOptions || {});
      }, intervalMs);
    };

    if (delayMs > 0) {
      this.periodicTimeoutTimer = window.setTimeout(startLoop, delayMs);
    } else {
      startLoop();
    }
  }

  private _pausePeriodicPulse(): void {
    if (this.periodicTimeoutTimer !== null) {
      clearTimeout(this.periodicTimeoutTimer);
      this.periodicTimeoutTimer = null;
    }
    if (this.periodicIntervalTimer !== null) {
      clearInterval(this.periodicIntervalTimer);
      this.periodicIntervalTimer = null;
    }
    this.cancelPulses();
  }

  private _resumePeriodicPulse(): void {
    if (
      this.periodicOptions &&
      this.periodicIntervalTimer === null &&
      this.periodicTimeoutTimer === null
    ) {
      this._startPeriodicTimer();
    }
  }

  play(): void {
    super.play();
    this._resumePeriodicPulse();
  }

  pause(): void {
    super.pause();
    this._pausePeriodicPulse();
  }
}

/**
 * Orchestrates a sequential pulse relay across multiple connectors.
 * Uses onComplete event callbacks instead of independent interval timers.
 * This prevents timer drift and guarantees exactly one pulse is active at a time.
 * @category Motion
 */
export function pulseSequence(
  steps: (ConnectorElement | PulseSequenceStep)[],
  options: PulseSequenceOptions = {},
): PulseSequenceController {
  let running = false;
  let timer: number | null = null;
  const pauseAfterMs = (options.pauseAfter ?? 1.45) * 1000;
  const loop = options.loop ?? true;

  const stepList: PulseSequenceStep[] = steps.map((s) => ("connector" in s ? s : { connector: s }));

  const stop = () => {
    running = false;
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
    for (const s of stepList) {
      s.connector.cancelPulses();
    }
  };

  const runStep = (idx: number) => {
    if (!running) return;

    if (idx >= stepList.length) {
      if (!loop) {
        running = false;
        return;
      }
      timer = window.setTimeout(() => {
        timer = null;
        if (running) runStep(0);
      }, pauseAfterMs);
      return;
    }

    const current = stepList[idx];
    const conn = current.connector;
    if (!conn) return;

    const opacity = typeof conn.opacity === "number" ? conn.opacity : 1;
    const startVal = typeof conn.start === "number" ? conn.start : 0;
    const endVal = typeof conn.end === "number" ? conn.end : 1;

    // Wait until the connector has finished drawing in (end >= 0.98) and is visible
    if (opacity <= 0.01 || endVal < 0.98 || endVal - startVal < 0.9) {
      timer = window.setTimeout(() => {
        timer = null;
        if (running) runStep(idx);
      }, 50);
      return;
    }

    conn.pulse({
      duration: current.duration ?? 0.45,
      color: current.color,
      size: current.size,
      onComplete: () => {
        if (!running) return;
        const delay = (current.delayAfter ?? 0) * 1000;
        if (delay > 0) {
          timer = window.setTimeout(() => {
            timer = null;
            if (running) runStep(idx + 1);
          }, delay);
        } else {
          runStep(idx + 1);
        }
      },
    });
  };

  const start = () => {
    stop();
    running = true;
    runStep(0);
  };

  if (stepList.length > 0) {
    const first = stepList[0].connector;
    first.onPlay(() => {
      start();
    });
    first.onPause(() => {
      stop();
    });
  }

  return {
    start,
    stop,
    isRunning: () => running,
  };
}

/**
 * Creates a reactive visual connector / arrow between two nodes or coordinate points.
 * @category Components
 */
export const Connector = (
  from: ConnectorTarget,
  to: ConnectorTarget,
  options?: ConnectorOptions,
): ConnectorElement => {
  const stage = getActiveStage();
  const el = new ConnectorElement(from, to, options);
  return stage.registerElement(el) as ConnectorElement;
};
