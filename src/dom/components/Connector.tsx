import { getActiveStage } from "../../core/index";
import type { ReactiveProp } from "../../core/types";
import { DOMElement, type ElementOptions } from "../element";
import {
  type Box,
  type CardinalSide,
  type Point,
  computeBezierPath,
  computeOrthogonalPath,
  getBoxAnchorPoint,
  getTransformedPerimeterPoint,
} from "../geometry";

/**
 * Options for triggering glowing packet animations along a connector.
 */
export interface PulseOptions {
  /** Color of the glowing particle (defaults to connector stroke color). */
  color?: string;
  /** Duration of the particle traversal in seconds (default: 0.6s). */
  duration?: number;
  /** Diameter of the particle in virtual canvas pixels (default: 8px). */
  size?: number;
}

/**
 * Options for continuous periodic packet pulses along a connector.
 */
export interface PeriodicPulseOptions extends PulseOptions {
  /** Interval between successive pulse emissions in seconds (default: 2.0s). */
  interval?: number;
}

/**
 * Normalized placement along the connector path.
 * - "start": 25% along the path
 * - "center": 50% along the path (default)
 * - "end": 75% along the path
 * - number: explicit fractional ratio from 0.0 to 1.0
 */
export type LabelPlacement = "start" | "center" | "end" | number;

/**
 * Responsive offset for adjusting label badge position.
 * Supports numbers (1080p virtual pixels) and container units ("cqw", "cqh", "rem", "px").
 * e.g. `{ y: "-1.5cqh" }` or `{ x: "2cqw", y: -8 }`.
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
 * Configuration options for creating a reactive Connector between two elements or points.
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
  /** Routing style: straight line, 90° orthogonal corners, or smooth cubic Bézier. */
  routing?: "straight" | "corner" | "bezier";
  /** CSS style declaration or routing shortcut. */
  style?: "straight" | "corner" | "bezier" | Partial<CSSStyleDeclaration>;
  /** Cardinal attachment face on the origin target ("auto" | "top" | "bottom" | "left" | "right"). */
  fromAnchor?: "auto" | CardinalSide;
  /** Cardinal attachment face on the destination target ("auto" | "top" | "bottom" | "left" | "right"). */
  toAnchor?: "auto" | CardinalSide;
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
  /** Whether to draw an arrowhead at the destination end (defaults to true). */
  arrow?: boolean;
  /** Arrowhead length and scale in virtual canvas pixels (defaults to 18). */
  arrowSize?: number;
  /** Trim-path start offset from 0.0 to 1.0 (useful for draw-in transitions). */
  start?: ReactiveProp<number>;
  /** Trim-path end offset from 0.0 to 1.0 (useful for draw-in transitions). */
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
}

export type ConnectorTarget =
  | DOMElement
  | Point
  | { x: number | string; y: number | string; domElement?: HTMLElement };

export class ConnectorElement extends DOMElement {
  fromTarget: ConnectorTarget;
  toTarget: ConnectorTarget;
  connectorStyle: "straight" | "corner" | "bezier";
  connectorColor: string;
  strokeWidth: number;
  isDashed: boolean;
  isDotted: boolean;
  hasArrow: boolean;
  arrowSize: number;
  radius: number;
  padding: number;
  labelPlacement: ReactiveProp<LabelPlacement> = "center";
  labelOffset: ReactiveProp<LabelOffset> = 0;
  labelOffsetX: ReactiveProp<number | string> = 0;
  labelOffsetY: ReactiveProp<number | string> = 0;

  fromAnchor: "auto" | CardinalSide = "auto";
  toAnchor: "auto" | CardinalSide = "auto";

  svgRoot: SVGSVGElement;
  pathNode: SVGPathElement;
  arrowNode: SVGPolygonElement | null = null;
  labelGroup: SVGGElement | null = null;
  labelBg: SVGRectElement | null = null;
  labelText: SVGTextElement | null = null;

  start: ReactiveProp<number> = 0;
  end: ReactiveProp<number> = 1;
  private animInterval: number | null = null;
  private periodicIntervalTimer: number | null = null;
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
    svg.style.zIndex = "0";
    svg.style.overflow = "visible";

    if (options.traveling || options.animated) {
      svg.classList.add("sr-connector-traveling-dots");
    }

    const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    const color = options.color || "#38bdf8";
    path.setAttribute("stroke", color);
    path.setAttribute("stroke-width", String(options.strokeWidth || 3));
    path.setAttribute("fill", "none");
    path.setAttribute("stroke-linecap", "round");
    path.setAttribute("stroke-linejoin", "round");
    path.setAttribute("pathLength", "1000");

    if (options.dotted) {
      path.setAttribute("stroke-dasharray", "4 10");
    } else if (options.dashed) {
      path.setAttribute("stroke-dasharray", "8 6");
    }

    svg.appendChild(path);

    const aSize = options.arrowSize ?? 18;
    const aHalf = aSize * 0.5;

    let arrow: SVGPolygonElement | null = null;
    if (options.arrow !== false) {
      arrow = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
      arrow.setAttribute("points", `-${aSize},-${aHalf} 0,0 -${aSize},${aHalf}`);
      arrow.setAttribute("fill", color);
      svg.appendChild(arrow);
    }

    let labelGroup: SVGGElement | null = null;
    let labelBg: SVGRectElement | null = null;
    let labelText: SVGTextElement | null = null;

    if (options.label) {
      labelGroup = document.createElementNS("http://www.w3.org/2000/svg", "g");
      labelGroup.setAttribute("class", "sr-connector-label-group");
      labelGroup.style.pointerEvents = "none";

      const textLen = (options.label || "").length;
      const initW = textLen * 10 + 20;
      const initH = 26;

      labelBg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
      labelBg.setAttribute("x", String(-initW / 2));
      labelBg.setAttribute("y", String(-initH / 2));
      labelBg.setAttribute("width", String(initW));
      labelBg.setAttribute("height", String(initH));

      labelText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      labelText.textContent = options.label;

      labelGroup.appendChild(labelBg);
      labelGroup.appendChild(labelText);
      svg.appendChild(labelGroup);
    }

    const { style: optStyle, routing, ...domOpts } = options;
    const resolvedRouting = typeof optStyle === "string" ? optStyle : routing || "straight";
    const resolvedCss = typeof optStyle === "object" ? optStyle : undefined;

    super("Connector", svg, { ...domOpts, style: resolvedCss });

    this.labelGroup = labelGroup;
    this.labelBg = labelBg;
    this.labelText = labelText;

    this.svgRoot = svg;
    this.pathNode = path;
    this.arrowNode = arrow;
    this.fromTarget = from;
    this.toTarget = to;
    this.connectorStyle = resolvedRouting;
    this.connectorColor = color;
    this.fromAnchor = options.fromAnchor || "auto";
    this.toAnchor = options.toAnchor || "auto";
    this.strokeWidth = options.strokeWidth || 3;
    this.isDashed = !!options.dashed;
    this.isDotted = !!options.dotted;
    this.hasArrow = options.arrow !== false;
    this.arrowSize = aSize;
    this.radius = options.radius ?? 12;
    this.padding = options.padding ?? 6;
    this.labelPlacement = options.labelPlacement ?? "center";
    this.labelOffset = options.labelOffset ?? 0;
    this.labelOffsetX = options.labelOffsetX ?? 0;
    this.labelOffsetY = options.labelOffsetY ?? 0;
    this.start = options.start ?? 0;
    this.end = options.end ?? 1;

    const periodic = options.pulseInterval ?? options.periodicPulse;
    if (periodic) {
      if (typeof periodic === "number") {
        this.periodicOptions = { interval: periodic };
      } else if (typeof periodic === "object") {
        this.periodicOptions = { ...periodic };
      } else if (periodic === true) {
        this.periodicOptions = { interval: 2.0 };
      }
      this._startPeriodicTimer();
    }

    this.onPlay(() => this._resumePeriodicPulse());
    this.onPause(() => this._pausePeriodicPulse());

    this.update();

    // Auto-track endpoints during continuous animations
    if (typeof window !== "undefined") {
      const tick = () => {
        this.update();
        this.animInterval = requestAnimationFrame(tick);
      };
      this.animInterval = requestAnimationFrame(tick);
    }
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

    const pt = target as Point;
    const px = typeof pt.x === "number" ? (pt.x <= 100 ? (pt.x / 100) * 1920 : pt.x) : 0;
    const py = typeof pt.y === "number" ? (pt.y <= 100 ? (pt.y / 100) * 1080 : pt.y) : 0;
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
      anchorPreference: "auto" | CardinalSide,
    ): { point: Point; side: CardinalSide } => {
      let shapeKind = "box";
      if ("shape" in target && typeof (target as { shape?: string }).shape === "string") {
        shapeKind = (target as { shape: string }).shape;
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

    let d = `M ${startPt.x} ${startPt.y} L ${endPt.x} ${endPt.y}`;
    if (this.connectorStyle === "corner") {
      d = computeOrthogonalPath(startPt, endPt, startSide, endSide);
    } else if (this.connectorStyle === "bezier") {
      d = computeBezierPath(startPt, endPt, startSide, endSide);
    }

    this.pathNode.setAttribute("d", d);

    if (this.activePulseDots.size > 0) {
      const pathStyle = `path('${d}')`;
      for (const dot of this.activePulseDots) {
        dot.style.offsetPath = pathStyle;
      }
    }

    // Apply trim paths (start..end)
    const startVal = typeof this.start === "number" ? this.start : 0;
    const endVal = typeof this.end === "number" ? this.end : 1;
    const isTraveling = this.svgRoot.classList.contains("sr-connector-traveling-dots");

    if (endVal < 1 || startVal > 0) {
      const len = 1000;
      const visibleLength = (endVal - startVal) * len;
      if (visibleLength <= 0.001) {
        this.pathNode.style.opacity = "0";
      } else {
        this.pathNode.style.opacity = "1";
      }
      this.pathNode.setAttribute("pathLength", "1000");
      const offset = -startVal * len;
      this.pathNode.style.strokeDasharray = `${Math.max(0, visibleLength)} ${len}`;
      this.pathNode.style.strokeDashoffset = `${offset}`;
    } else {
      this.pathNode.style.opacity = "1";
      if (isTraveling) {
        this.pathNode.removeAttribute("pathLength");
        this.pathNode.style.strokeDasharray = "";
        this.pathNode.style.strokeDashoffset = "";
      } else if (this.isDotted) {
        this.pathNode.removeAttribute("pathLength");
        this.pathNode.style.strokeDasharray = "4px 10px";
        this.pathNode.style.strokeDashoffset = "0";
      } else if (this.isDashed) {
        this.pathNode.removeAttribute("pathLength");
        this.pathNode.style.strokeDasharray = "8px 6px";
        this.pathNode.style.strokeDashoffset = "0";
      } else {
        this.pathNode.removeAttribute("pathLength");
        this.pathNode.style.strokeDasharray = "none";
        this.pathNode.style.strokeDashoffset = "0";
      }
    }

    // Position Arrowhead
    if (this.arrowNode) {
      if (endVal - startVal <= 0.02 || endVal <= 0.02) {
        this.arrowNode.style.opacity = "0";
      } else {
        this.arrowNode.style.opacity = "1";
        try {
          const totalPathLength = this.pathNode.getTotalLength();
          const targetLen = totalPathLength * endVal;
          const pt = this.pathNode.getPointAtLength(targetLen);
          const prevPt = this.pathNode.getPointAtLength(Math.max(0, targetLen - 2));
          const angle = Math.atan2(pt.y - prevPt.y, pt.x - prevPt.x) * (180 / Math.PI);

          this.arrowNode.setAttribute("transform", `translate(${pt.x}, ${pt.y}) rotate(${angle})`);
        } catch {
          const angle = Math.atan2(endPt.y - startPt.y, endPt.x - startPt.x) * (180 / Math.PI);
          this.arrowNode.setAttribute(
            "transform",
            `translate(${endPt.x}, ${endPt.y}) rotate(${angle})`,
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
        let offY = resolveOffset(this.labelOffsetY as number | string | undefined, 1080);

        if (typeof this.labelOffset === "number" || typeof this.labelOffset === "string") {
          offY += resolveOffset(this.labelOffset, 1080);
        } else if (this.labelOffset && typeof this.labelOffset === "object") {
          const obj = this.labelOffset as { x?: number | string; y?: number | string };
          offX += resolveOffset(obj.x, 1920);
          offY += resolveOffset(obj.y, 1080);
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

    const startVal = typeof this.start === "number" ? this.start : 0;
    const endVal = typeof this.end === "number" ? this.end : 1;

    // Do not pulse across invisible or zero-length connectors
    if (endVal - startVal <= 0.05) return;

    const pathD = this.pathNode.getAttribute("d");
    if (!pathD) return;

    const duration = (options.duration ?? 0.6) * 1000;
    const color = options.color ?? this.connectorColor;
    const size = options.size ?? 12;

    const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
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

    anim.onfinish = () => {
      this.activePulseDots.delete(g);
      g.remove();
    };
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

    const intervalMs = (this.periodicOptions.interval ?? 2.0) * 1000;
    this._executePulse(this.periodicOptions);

    this.periodicIntervalTimer = window.setInterval(() => {
      this._executePulse(this.periodicOptions || {});
    }, intervalMs);
  }

  private _pausePeriodicPulse(): void {
    if (this.periodicIntervalTimer !== null) {
      clearInterval(this.periodicIntervalTimer);
      this.periodicIntervalTimer = null;
    }
  }

  private _resumePeriodicPulse(): void {
    if (this.periodicOptions && this.periodicIntervalTimer === null) {
      this._startPeriodicTimer();
    }
  }
}

export const Connector = (
  from: ConnectorTarget,
  to: ConnectorTarget,
  options?: ConnectorOptions,
): ConnectorElement => {
  const stage = getActiveStage();
  const el = new ConnectorElement(from, to, options);
  return stage.registerElement(el) as ConnectorElement;
};
