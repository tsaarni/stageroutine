/**
 * Reactive visual connector and arrow primitive linking nodes and coordinates with dynamic tracking.
 */

import "./Connector.css";
import { getActiveStage, resolveCoordToPx, tryGetActiveStage } from "../../core/index";
import type { ElementAnchor, FlowEffect, ReactiveProp } from "../../core/types";
import { DOMElement, type ElementOptions } from "../element";
import {
  type Box,
  type CardinalSide,
  computeArcPath,
  computeBezierPath,
  computeOrthogonalPath,
  getBoxAnchorPoint,
  type Point,
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
 * @category Components
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
  /** Particle color override (default: connector stroke color). */
  color?: string;
  /** Particle diameter in pixels (default: 8px). */
  size?: number;
  /** Optional pause delay in seconds before the next connector pulses (default: 0s). */
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
  /** Initial delay in seconds before the first pulse begins (default: 0s). */
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
 * @category Components
 */
export type LabelPlacement = "start" | "center" | "end" | number;

/**
 * Responsive offset for adjusting label badge position.
 * Supports a 2D tuple `[x, y]` or a scalar vertical offset number/string ("cqw", "cqh", "rem", "px").
 * e.g. `[0, "-1.5cqh"]` or `["2cqw", -8]`.
 * @category Components
 */
export type LabelOffset = readonly [x: number | string, y: number | string] | number | string;

function resolveOffset(val: number | string | undefined, baseDim: number): number {
  if (val === undefined) return 0;
  if (typeof val === "number") return val;
  const s = val.trim();
  if (s.endsWith("cqw") || s.endsWith("cqh") || s.endsWith("%")) {
    return (Number.parseFloat(s) / 100) * baseDim;
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
  /** Responsive offset to nudge the label ([x, y] in px, cqw, cqh, or rem). Reactive. */
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
  /** Cardinal attachment face or custom [x, y] anchor on the origin target ("auto" | "top" | "bottom" | "left" | "right" | [x, y]). */
  fromAnchor?: "auto" | ElementAnchor;
  /** Cardinal attachment face or custom [x, y] anchor on the destination target ("auto" | "top" | "bottom" | "left" | "right" | [x, y]). */
  toAnchor?: "auto" | ElementAnchor;
  /** Stroke color of the connector line (defaults to #38bdf8). */
  color?: string;
  /** Stroke width in virtual pixels (defaults to 3). */
  strokeWidth?: number;
  /** Whether the line is styled with dashed strokes. */
  dashed?: boolean;
  /** Whether the line is styled with dotted strokes. */
  dotted?: boolean;
  /** Continuous ambient stroke animation ("none" | "traveling" | "chase" | "ping", default: "none"). */
  flow?: FlowEffect;
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
}

/**
 * Valid endpoint target for a Connector line (DOMElement or point coordinates as an [x, y] tuple).
 * @category Components
 */
export type ConnectorTarget =
  | DOMElement
  | Point
  | readonly [x: number | string, y: number | string];

/** Public controls for a connector. @category Components */
export interface ConnectorElement extends DOMElement {
  fromTarget: ConnectorTarget;
  toTarget: ConnectorTarget;
  connectorStyle: "straight" | "corner" | "bezier" | "arc";
  curvature: number;
  connectorColor: string;
  labelPlacement: ReactiveProp<LabelPlacement>;
  labelOffset: ReactiveProp<LabelOffset>;
  labelOffsetX: ReactiveProp<number | string>;
  labelOffsetY: ReactiveProp<number | string>;
  flow: FlowEffect;
  start: ReactiveProp<number>;
  end: ReactiveProp<number>;
  pulse(options?: PulseOptions): void;
  cancelPulses(): this;
  startPeriodicPulse(options?: number | PeriodicPulseOptions): this;
  stopPeriodicPulse(): this;
}

/**
 * @internal
 */
class ConnectorElementImpl extends DOMElement implements ConnectorElement {
  static override reactiveKeys: ReadonlySet<string> = new Set([
    ...DOMElement.reactiveKeys,
    "start",
    "end",
    "flow",
    "labelPlacement",
  ]);

  private _flow: FlowEffect = "none";
  private _flowPingActive = false;

  get flow(): FlowEffect {
    return this._flow;
  }
  set flow(val: FlowEffect) {
    const prev = this._flow;
    this._flow = val ?? "none";
    if (this._flow === "ping") {
      if (this.periodicIntervalTimer === null && this.periodicTimeoutTimer === null) {
        this._flowPingActive = true;
        this.startPeriodicPulse();
      }
    } else if (prev === "ping" && this._flowPingActive) {
      this._flowPingActive = false;
      this.stopPeriodicPulse();
    }
    this.update();
  }

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

  start: ReactiveProp<number> = 0;
  end: ReactiveProp<number> = 1;
  private periodicIntervalTimer: number | null = null;
  private periodicTimeoutTimer: number | null = null;
  private periodicOptions: PeriodicPulseOptions | null = null;
  private activePulseDots = new Set<SVGElement>();
  private activeAnimations = new Set<Animation>();
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

    super("Connector", svg, {
      ...domOpts,
      x: 0,
      y: options.y ?? 0,
      style: resolvedCss,
      customPositioned: true,
    });

    this.exitDuration = options.exitDuration ?? 0.1;
    this.enterDuration = options.enterDuration ?? 0;

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
    this.labelPlacement = options.labelPlacement ?? "center";
    this.labelOffset = options.labelOffset ?? 0;
    this.labelOffsetX = options.labelOffsetX ?? 0;
    this.labelOffsetY = options.labelOffsetY ?? 0;
    this.fromAnchor = options.fromAnchor ?? "auto";
    this.toAnchor = options.toAnchor ?? "auto";
    this.curvature = options.curvature ?? 0.2;
    this.radius = options.radius ?? 12;
    this.padding = options.padding ?? 6;
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
    if (options.flow !== undefined) this.flow = options.flow;

    const periodic = options.pulseInterval;
    if (periodic) {
      if (typeof periodic === "number") {
        this.periodicOptions = { interval: periodic };
      } else if (typeof periodic === "object") {
        this.periodicOptions = { ...periodic };
      }
    }

    this.update();

    this.onActivate(() => {
      this._resumePeriodicPulse();
      this._resumeFlowAnimation();
      this.update();
    });

    this.onDeactivate(() => {
      this._pausePeriodicPulse();
      this._pauseFlowAnimation();
      this.cancelPulses();
    });

    const stage = getActiveStage();
    if (stage && typeof stage.on === "function") {
      stage.on("evt:stage:resized", () => {
        if (this.isActive) {
          this.update();
        }
      });
    }

    // Register diagnostics metrics for background loop monitoring
    if (stage?.metrics) {
      stage.metrics.register(`connector.${this.id}`, () => ({
        raf_loop_active: 0,
        periodic_pulse_active: this.periodicIntervalTimer !== null ? 1 : 0,
        active_pulses_count: this.activePulseDots.size,
        dom_pulse_packets_count: this.svgRoot.querySelectorAll(".sr-pulse-packet").length,
        is_mounted: Boolean(this.domElement?.isConnected),
      }));
    }
  }

  override _deactivate(): void {
    this.cancelPulses();
    this._pausePeriodicPulse();
    this._pauseFlowAnimation();
    super._deactivate();
  }

  override _unmount(): void {
    this.cancelPulses();
    this._pausePeriodicPulse();
    this._pauseFlowAnimation();
    super._unmount();
  }

  private getStageDimensions(): { width: number; height: number } {
    const stage = tryGetActiveStage();
    return {
      width: stage?.width ?? 1920,
      height: stage?.height ?? 1080,
    };
  }

  private resolveBoxOrPoint(
    target: ConnectorTarget,
    stageW = 1920,
    stageH = 1080,
  ): { point: Point; box?: Box } {
    if ("domElement" in target && target.domElement instanceof HTMLElement) {
      const el = target as DOMElement;
      const dom = el.domElement;
      const viewport =
        (dom.parentElement?.closest("[style*='container-type']") as HTMLElement) ||
        dom.parentElement;

      if (viewport && dom.isConnected) {
        const vRect = viewport.getBoundingClientRect();
        const dRect = dom.getBoundingClientRect();
        const scale = vRect.width > 0 ? vRect.width / stageW : 1;
        const cx = (dRect.left - vRect.left + dRect.width / 2) / scale;
        const cy = (dRect.top - vRect.top + dRect.height / 2) / scale;
        let width = dom.offsetWidth;
        let height = dom.offsetHeight;
        if (width <= 0) width = parseFloat(dom.style.width) || dRect.width / scale;
        if (height <= 0) height = parseFloat(dom.style.height) || dRect.height / scale;
        const x = cx - width / 2;
        const y = cy - height / 2;

        return {
          point: [cx, cy],
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
      const rawX = resolveCoordToPx(
        typeof el.x === "number" || typeof el.x === "string" ? el.x : 0,
        stageW,
      );
      const rawY = resolveCoordToPx(
        typeof el.y === "number" || typeof el.y === "string" ? el.y : 0,
        stageH,
      );

      return {
        point: [rawX + width / 2, rawY + height / 2],
        box: { x: rawX, y: rawY, width, height },
      };
    }

    if (Array.isArray(target) && target.length >= 2) {
      const px = resolveCoordToPx(target[0], stageW);
      const py = resolveCoordToPx(target[1], stageH);
      return { point: [px, py] };
    }

    return { point: [0, 0] };
  }

  update(): void {
    if (this.isMounted && !this.isActive) {
      return;
    }

    const { width: stageW, height: stageH } = this.getStageDimensions();
    this.domElement.setAttribute("viewBox", `0 0 ${stageW} ${stageH}`);

    const fromResolved = this.resolveBoxOrPoint(this.fromTarget, stageW, stageH);
    const toResolved = this.resolveBoxOrPoint(this.toTarget, stageW, stageH);

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
      if (
        anchorPreference === "auto" &&
        "getPerimeterPoint" in target &&
        typeof (target as { getPerimeterPoint?: unknown }).getPerimeterPoint === "function"
      ) {
        return (
          target as {
            getPerimeterPoint: (
              box: Box,
              target: Point,
              padding: number,
            ) => { point: Point; side: CardinalSide };
          }
        ).getPerimeterPoint(box, targetPt, this.padding);
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

    const resolvedY = resolveCoordToPx(
      typeof this.y === "number" || typeof this.y === "string" ? this.y : 0,
      stageH,
    );
    if (resolvedY > 0) {
      const fixedY = resolvedY;
      let x1 = fromResolved.point[0];
      let x2 = toResolved.point[0];
      const dir = x2 >= x1 ? 1 : -1;

      const vRect =
        this.domElement.parentElement?.getBoundingClientRect() ||
        this.domElement.getBoundingClientRect();
      const scale = vRect.width > 0 ? vRect.width / stageW : 1;
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

      startPt = [x1, fixedY];
      endPt = [x2, fixedY];
    }

    const dx = endPt[0] - startPt[0];
    const dy = endPt[1] - startPt[1];
    const dist = Math.hypot(dx, dy);
    const chordNx = dist > 0 ? dx / dist : 1;
    const chordNy = dist > 0 ? dy / dist : 0;

    const buildPath = (sp: Point, ep: Point): string => {
      if (this.connectorStyle === "corner")
        return computeOrthogonalPath(sp, ep, startSide, endSide);
      if (this.connectorStyle === "bezier") return computeBezierPath(sp, ep, startSide, endSide);
      if (this.connectorStyle === "arc") return computeArcPath(sp, ep, this.curvature);
      return `M ${sp[0]} ${sp[1]} L ${ep[0]} ${ep[1]}`;
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
    let pathStartPt: Point = startPt;
    let pathEndPt: Point = endPt;
    if (this.endHeadNode && this.endRetract > 0 && dist > 4) {
      const r = dist > 20 ? this.endRetract : dist * 0.3;
      pathEndPt = [endPt[0] - endTx * r, endPt[1] - endTy * r];
    }
    if (this.startHeadNode && this.startRetract > 0 && dist > 4) {
      const r = dist > 20 ? this.startRetract : dist * 0.3;
      pathStartPt = [startPt[0] - startTx * r, startPt[1] - startTy * r];
    }

    const d = buildPath(pathStartPt, pathEndPt);
    this.pathNode.setAttribute("d", d);
    if (this.strokeWidth) {
      this.pathNode.setAttribute("stroke-width", String(this.strokeWidth));
    }
    const currentStroke = (this.color as string | undefined) || this.connectorColor;
    if (currentStroke) {
      this.pathNode.setAttribute("stroke", currentStroke);
    }

    if (this.activePulseDots.size > 0) {
      const pathStyle = `path('${d}')`;
      for (const dot of this.activePulseDots) {
        dot.style.offsetPath = pathStyle;
      }
    }

    this.updateFlowClasses();

    // Apply trim paths (start..end) — preserve consistent dash spacing throughout animation
    const startVal = typeof this.start === "number" ? this.start : 0;
    const endVal = typeof this.end === "number" ? this.end : 1;
    const flowVal = typeof this.flow === "string" ? this.flow : "none";
    const isFlowing = flowVal && flowVal !== "none";

    // Always work in actual path length units so dash spacing is identical
    // during draw-in animation and at rest. Measure the path once per update.
    let actualLen = 0;
    try {
      actualLen = this.pathNode.getTotalLength();
    } catch {
      // not yet mounted; skip
    }

    if (isFlowing && flowVal !== "ping") {
      this.pathNode.style.opacity = "1";
      this.pathNode.style.strokeDasharray = "";
      this.pathNode.style.strokeDashoffset = "";
    } else if (endVal < 1 || startVal > 0) {
      const visiblePx = (endVal - startVal) * actualLen;
      if (visiblePx <= 0.1) {
        this.pathNode.style.opacity = "0";
      } else {
        this.pathNode.style.opacity = "1";
      }
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
      if (this.isDotted) {
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
          `translate(${startPt[0]}, ${startPt[1]}) rotate(${angle})`,
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
            `translate(${endPt[0]}, ${endPt[1]}) rotate(${angle})`,
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

        let offX = resolveOffset(this.labelOffsetX as number | string | undefined, stageW);
        let offY = 0;

        if (this.labelOffsetY !== undefined) {
          offY = resolveOffset(this.labelOffsetY as number | string | undefined, stageH);
        } else if (this.labelOffset !== undefined) {
          if (Array.isArray(this.labelOffset)) {
            offX += resolveOffset(this.labelOffset[0], stageW);
            offY += resolveOffset(this.labelOffset[1], stageH);
          } else {
            offY = resolveOffset(this.labelOffset as number | string, stageH);
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
            const mx = startPt[0] + (endPt[0] - startPt[0]) * ratio;
            const my = startPt[1] + (endPt[1] - startPt[1]) * ratio;
            this.labelGroup.setAttribute("transform", `translate(${mx + offX}, ${my + offY})`);
          }
        } catch {
          const mx = startPt[0] + (endPt[0] - startPt[0]) * ratio;
          const my = startPt[1] + (endPt[1] - startPt[1]) * ratio;
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
    // Clean up any existing active pulses on THIS connector before spawning a new one
    this.cancelPulses();

    const opacity = typeof this.opacity === "number" ? this.opacity : 1;
    if (opacity <= 0.01 || !this.isActive) return;

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
    this.activeAnimations.add(anim);

    let finished = false;
    const cleanup = (triggerComplete: boolean) => {
      if (finished) return;
      finished = true;
      this.activeAnimations.delete(anim);
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
   * Cancels and removes all in-flight pulse packets on this connector.
   */
  cancelPulses(): this {
    for (const anim of Array.from(this.activeAnimations)) {
      try {
        anim.cancel();
      } catch {
        // ignore
      }
    }
    this.activeAnimations.clear();

    for (const dot of Array.from(this.activePulseDots)) {
      for (const a of dot.getAnimations()) {
        a.cancel();
      }
      dot.remove();
    }
    this.activePulseDots.clear();

    const stray = this.svgRoot.querySelectorAll(".sr-pulse-packet");
    for (let i = 0; i < stray.length; i++) {
      const node = stray[i] as SVGElement;
      if (typeof node.getAnimations === "function") {
        for (const a of node.getAnimations()) {
          a.cancel();
        }
      }
      node.remove();
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

  private updateFlowClasses(): void {
    const flowVal = typeof this.flow === "string" ? this.flow : "none";
    this.svgRoot.classList.remove(
      "sr-flow-traveling",
      "sr-flow-chase",
      "sr-flow-pulse",
      "sr-flow-ping",
    );

    if (flowVal && flowVal !== "none") {
      this.svgRoot.classList.add(`sr-flow-${flowVal}`);
      if (flowVal === "chase") {
        this.pathNode.setAttribute("pathLength", "100");
      } else {
        this.pathNode.removeAttribute("pathLength");
      }
    } else {
      this.pathNode.removeAttribute("pathLength");
    }
  }

  private _resumeFlowAnimation(): void {
    const flowVal = typeof this.flow === "string" ? this.flow : "none";
    if (flowVal && flowVal !== "none") {
      this.domElement.style.animationPlayState = "running";
      this.pathNode.style.animationPlayState = "running";
      for (const anim of this.pathNode.getAnimations()) {
        anim.play();
      }
    }
  }

  private _pauseFlowAnimation(): void {
    const flowVal = typeof this.flow === "string" ? this.flow : "none";
    if (flowVal && flowVal !== "none") {
      this.pathNode.style.animationPlayState = "paused";
      for (const anim of this.pathNode.getAnimations()) {
        anim.pause();
      }
    }
  }
}

/**
 * Orchestrates a sequential packet pulse chain across multiple connectors.
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

  const runStep = (idx: number, retryCount = 0) => {
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

    // If connector is inactive or hidden, stop the sequence immediately
    if (!conn.isActive || opacity <= 0.01) {
      stop();
      return;
    }

    // Wait until the connector has finished drawing in (end >= 0.95), capped at 25 retries (~1.25s)
    if (endVal < 0.95 || endVal - startVal < 0.8) {
      if (retryCount >= 25) {
        stop();
        return;
      }
      timer = window.setTimeout(() => {
        timer = null;
        if (running) runStep(idx, retryCount + 1);
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

  // Bind deactivation listeners on all participating connectors
  for (const s of stepList) {
    s.connector.onDeactivate(() => {
      stop();
    });
  }

  // Bind activation on first connector to start
  if (stepList.length > 0) {
    const first = stepList[0].connector;
    first.onActivate(() => {
      start();
    });
  }

  // Listen to stage navigation to ensure sequence stops when scenes change
  const stage = getActiveStage();
  if (stage && typeof stage.on === "function") {
    stage.on("evt:nav:sceneChanged", () => {
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
export function Connector(
  from: ConnectorTarget,
  to: ConnectorTarget,
  options?: ConnectorOptions,
): ConnectorElement {
  const stage = getActiveStage();
  const el = new ConnectorElementImpl(from, to, options);
  return stage.registerElement(el) as ConnectorElement;
}
