/**
 * Sequence diagram primitives: Lifeline, Activation execution blocks, and SequenceDiagram builder.
 */

import "./SequenceDiagram.css";
import { STAGE_UNITS_TALL, stageUnitPx, tryGetActiveStage, units } from "../../core/index";
import { DOMElement, type ElementOptions, mount } from "../element";
import { measureOffscreen } from "../layout";
import { Connector, type ConnectorElement, type ConnectorOptions } from "./Connector";

/** Default actor top edge in stage units, used before the actor is measurable. */
const DEFAULT_ACTOR_Y = 20;
/** Default actor height in stage units. */
const DEFAULT_ACTOR_HEIGHT = 8.3;
/** Default lifeline length in stage units. */
const DEFAULT_LIFELINE_LENGTH = 42;
/** Default padding below the lowest message or activation, in stage units. */
const DEFAULT_PADDING_BOTTOM = 4;

function getActorY(actor: DOMElement): number {
  const stage = tryGetActiveStage();
  const currentProp = stage?._getCurrentPropertyValue(actor.id, "y");
  if (typeof currentProp === "number") {
    return currentProp;
  }
  return typeof actor.y === "number" ? actor.y : DEFAULT_ACTOR_Y;
}

/** Converts a CSS length to stage units. Returns undefined for lengths it cannot resolve. */
function cssLengthToUnits(value: string, stageH: number): number | undefined {
  const s = value.trim();
  const num = Number.parseFloat(s) || 0;
  if (s.endsWith("px")) return num / stageUnitPx(stageH);
  if (s.endsWith("rem")) return (num * 16) / stageUnitPx(stageH);
  return undefined;
}

function getActorHeightUnits(actor: DOMElement, stageH: number): number {
  if (typeof actor.height === "number") {
    return actor.height;
  }
  if (typeof actor.height === "string") {
    const resolved = cssLengthToUnits(actor.height, stageH);
    if (resolved !== undefined) return resolved;
  }
  const dom = actor.domElement;
  if (dom) {
    if (dom.offsetHeight > 0) {
      return dom.offsetHeight / stageUnitPx(stageH);
    }
    if (dom.style.height) {
      const resolved = cssLengthToUnits(dom.style.height, stageH);
      if (resolved !== undefined) return resolved;
    }
    // Temporarily attach unmounted nodes offscreen to measure computed height.
    if (!dom.isConnected) {
      const { height } = measureOffscreen(dom);
      if (height > 0) return height / stageUnitPx(stageH);
    }
  }
  return DEFAULT_ACTOR_HEIGHT;
}

function resolveAnchorYUnits(val: unknown, stageH: number, fallback: number): number {
  if (val === undefined || val === null) return fallback;
  let raw: unknown = val;
  if (typeof val === "object" && val !== null && "y" in val) {
    raw = (val as { y: unknown }).y;
  }
  if (typeof raw === "number") {
    return raw;
  }
  if (typeof raw === "string") {
    const resolved = cssLengthToUnits(raw, stageH);
    if (resolved !== undefined) return resolved;
  }
  return fallback;
}

/**
 * Configuration options for vertical dashed lifeline timelines.
 * @category Components
 */
export interface LifelineOptions extends ElementOptions {
  /** Vertical length of the dashed line in stage units (default: 42). Automatically extends when activations exceed length. */
  length?: number;
  /** Stroke color of the dashed line (default: "rgba(148, 163, 184, 0.7)"). */
  color?: string;
}

/**
 * Configuration options for execution activation bars.
 * @category Components
 */
export interface ActivationOptions extends ElementOptions {
  /** Starting message connector, or a Y coordinate in stage units. */
  from?: ConnectorElement | number;
  /** Ending message connector, or a Y coordinate in stage units. */
  to?: ConnectorElement | number;
  /** Explicit vertical offset along the lifeline in stage units. */
  y?: number;
  /** Explicit bar height in stage units (default: 18). */
  height?: number;
  /** Fill color and glow highlight for the activation bar (default: "#38bdf8"). */
  color?: string;
}

/**
 * Configuration options for the SequenceDiagram coordinator.
 * @category Components
 * @inline
 */
export interface SequenceDiagramOptions {
  /** Initial actor elements to register as diagram participants. */
  participants?: DOMElement[];
  /** Vertical start position for the first message in stage units (default: 32). */
  startY?: number;
  /** Vertical spacing between message rows in stage units (default: 8). */
  gapY?: number;
  /** Minimum length of participant lifelines in stage units (default: 42). Automatically extends to fit messages and activations. */
  lifelineLength?: number;
  /** Stroke color of participant lifelines (default: "rgba(148, 163, 184, 0.7)"). */
  lifelineColor?: string;
  /** Initial opacity of participant lifelines (default: 1). Set to 0 if animating lifelines in. */
  lifelineOpacity?: number;
  /** Padding in stage units below the lowest message or activation (default: 4). */
  paddingBottom?: number;
}

/** Public controls for a sequence diagram lifeline. @category Components */
export interface LifelineElement extends DOMElement {
  readonly actor: DOMElement;
  length: number;
  color: string;
  readonly activations: ActivationBarElement[];
  setLength(length: number): void;
  activate(options?: ActivationOptions): ActivationBarElement;
  hasActivationAt(yPx: number): boolean;
}

/** Public state for a sequence diagram activation. @category Components */
export interface ActivationBarElement extends DOMElement {
  readonly lifeline: LifelineElement;
}

/** Public coordinator for a sequence diagram. @category Components */
export interface SequenceDiagramController {
  readonly participants: DOMElement[];
  readonly lifelines: LifelineElement[];
  readonly messages: ConnectorElement[];
  readonly activations: ActivationBarElement[];
  readonly elements: DOMElement[];
  startY: number;
  gapY: number;
  addParticipant(actor: DOMElement, options?: LifelineOptions): LifelineElement;
  getLifeline(actor: DOMElement): LifelineElement;
  message(
    from: DOMElement | LifelineElement,
    to: DOMElement | LifelineElement,
    options?: ConnectorOptions | string,
  ): ConnectorElement;
  activate(actor: DOMElement | LifelineElement, options?: ActivationOptions): ActivationBarElement;
}

/**
 * Vertical dashed lifeline element rendered below its participant actor.
 * @internal
 */
class LifelineElementImpl extends DOMElement implements LifelineElement {
  static override _reactiveKeys: ReadonlySet<string> = new Set([
    ...DOMElement._reactiveKeys,
    "length",
  ]);

  actor: DOMElement;
  diagram?: SequenceDiagramControllerImpl;
  length: number;
  color: string;
  activations: ActivationBarElementImpl[] = [];

  override _update(): void {
    this.domElement.style.height = units(this.length);
  }

  constructor(actor: DOMElement, options: LifelineOptions = {}) {
    const el = document.createElement("div");
    el.className = "sr-lifeline";
    el.style.position = "absolute";
    el.style.width = "2px";
    el.style.borderLeft = `2px dashed ${options.color || "rgba(148, 163, 184, 0.7)"}`;
    el.style.pointerEvents = "none";
    el.style.zIndex = "1";

    super("Lifeline", el, {
      ...options,
      opacity: options.opacity ?? 1,
      x: 0,
      y: 0,
      customPositioned: true,
    });

    this.actor = actor;
    (actor as unknown as { lifeline?: LifelineElementImpl }).lifeline = this;
    this.length = options.length ?? DEFAULT_LIFELINE_LENGTH;
    this.color = options.color || "rgba(148, 163, 184, 0.7)";
    this.domElement.style.left = "calc(50% - 1px)";
    this.domElement.style.top = "100%";
    this.domElement.style.width = "0px";
    this.domElement.style.transform = "none";
    this.domElement.style.height = units(this.length);

    // Ensure actor doesn't clip descending lifeline and activation blocks
    if (actor.domElement) {
      actor.domElement.style.overflow = "visible";
      actor.domElement.appendChild(this.domElement);
    }

    actor.onUpdate(() => {
      for (const act of this.activations) {
        act._update();
      }
      this.diagram?.updateLifelineLengths();
    });
  }

  /** Sets the visual length of the dashed lifeline in stage units. */
  setLength(length: number): void {
    const next = Math.round(length * 100) / 100;
    if (next > 0 && next !== this.length) {
      this.length = next;
      this.domElement.style.height = units(this.length);
    }
  }

  activate(options: ActivationOptions = {}): ActivationBarElementImpl {
    const el = new ActivationBarElementImpl(this, options);
    this.activations.push(el);

    const yNum = typeof el.y === "number" ? el.y : 0;
    const hNum = typeof el.height === "number" ? el.height : 0;
    const needed = yNum + hNum + DEFAULT_PADDING_BOTTOM;
    if (needed > this.length) {
      this.setLength(needed);
    }

    return mount(el);
  }

  hasActivationAt(y: number): boolean {
    const stageH = tryGetActiveStage()?.height ?? 1080;
    const yUnits = y > STAGE_UNITS_TALL ? y / stageUnitPx(stageH) : y;
    const lifelineTop = getActorY(this.actor) + getActorHeightUnits(this.actor, stageH);

    for (const act of this.activations) {
      act._recompute();
      const actY = typeof act.y === "number" ? act.y : 0;
      const actH = typeof act.height === "number" ? act.height : 0;
      const actTop = lifelineTop + actY;
      const actBottom = actTop + actH;
      if (actTop - 1 <= yUnits && yUnits <= actBottom + 1) {
        return true;
      }
    }
    return false;
  }
}

/**
 * Execution activation bar element attached to a lifeline.
 * @internal
 */
class ActivationBarElementImpl extends DOMElement implements ActivationBarElement {
  lifeline: LifelineElementImpl;
  /** @internal */
  _fromTarget?: ConnectorElement | number;
  /** @internal */
  _toTarget?: ConnectorElement | number;
  private isRecomputing = false;

  /** @internal */
  _recompute(): void {
    if (this.isRecomputing || (this._fromTarget === undefined && this._toTarget === undefined)) {
      return;
    }
    this.isRecomputing = true;
    try {
      const stageH = tryGetActiveStage()?.height ?? 1080;
      const fromY = resolveAnchorYUnits(this._fromTarget, stageH, 32);
      const toY = resolveAnchorYUnits(this._toTarget, stageH, fromY + 18);

      const actorY = getActorY(this.lifeline.actor);
      const actorBottom = actorY + getActorHeightUnits(this.lifeline.actor, stageH);

      const computedY = Math.max(0, fromY - actorBottom - 0.7);
      const computedHeight = Math.max(1.8, toY - fromY + 1.4);

      this.y = computedY;
      this.height = computedHeight;
    } finally {
      this.isRecomputing = false;
    }
  }

  override _update(): void {
    this._recompute();
    const yNum = typeof this.y === "number" ? this.y : 0;
    const hNum = typeof this.height === "number" ? this.height : 0;
    this.domElement.style.top = `calc(100% + ${units(yNum)})`;
    this.domElement.style.height = units(hNum);
  }

  constructor(lifeline: LifelineElementImpl, options: ActivationOptions = {}) {
    const color = options.color || "#38bdf8";
    const bar = document.createElement("div");
    bar.className = "sr-activation sr-activation-bar";
    bar.style.position = "absolute";
    bar.style.width = "14px";
    bar.style.boxSizing = "border-box";
    bar.style.background = color;
    bar.style.borderRadius = "3px";
    bar.style.boxShadow = `0 0 12px ${color}66`;
    bar.style.border = "none";
    bar.style.zIndex = "2";
    bar.style.pointerEvents = "none";

    super("ActivationBar", bar, {
      ...options,
      opacity: options.opacity ?? 1,
      x: 0,
      y: options.y ?? 3.6,
      height: options.height ?? 18,
      customPositioned: true,
    });

    this.lifeline = lifeline;
    this._fromTarget = options.from;
    this._toTarget = options.to;
    this.domElement.style.left = "calc(50% - 7px)";
    this.domElement.style.transform = "none";
    this._recompute();
    this._update();

    if (lifeline.actor.domElement) {
      lifeline.actor.domElement.appendChild(this.domElement);
    }
  }
}

/**
 * Sequence diagram coordinator that manages lifelines, messages, and activations for a set of participants.
 * @internal
 */
class SequenceDiagramControllerImpl implements SequenceDiagramController {
  readonly participants: DOMElement[] = [];
  readonly lifelines: LifelineElementImpl[] = [];
  readonly messages: ConnectorElement[] = [];
  readonly activations: ActivationBarElementImpl[] = [];
  private lifelineMap = new Map<DOMElement, LifelineElementImpl>();
  private defaultLifelineLength: number;
  private paddingBottom: number;
  startY: number;
  gapY: number;

  get elements(): DOMElement[] {
    return [...this.lifelines, ...this.activations, ...this.messages];
  }

  constructor(options: SequenceDiagramOptions = {}) {
    this.startY = options.startY ?? 32;
    this.gapY = options.gapY ?? 8;
    this.defaultLifelineLength = options.lifelineLength ?? DEFAULT_LIFELINE_LENGTH;
    this.paddingBottom = options.paddingBottom ?? DEFAULT_PADDING_BOTTOM;

    if (options.participants) {
      for (const p of options.participants) {
        this.addParticipant(p, {
          length: this.defaultLifelineLength,
          color: options.lifelineColor,
          opacity: options.lifelineOpacity,
        });
      }
    }
  }

  /** @internal */
  updateLifelineLengths(): void {
    const stageH = tryGetActiveStage()?.height ?? 1080;
    let maxNeeded = this.defaultLifelineLength;

    for (const line of this.lifelines) {
      const actorBottom = getActorY(line.actor) + getActorHeightUnits(line.actor, stageH);

      for (const msg of this.messages) {
        const msgY = typeof msg.y === "number" ? msg.y : 0;

        if (msgY > 0) {
          const needed = msgY - actorBottom + this.paddingBottom;
          if (needed > maxNeeded) {
            maxNeeded = needed;
          }
        }
      }

      for (const act of this.activations) {
        const actY = typeof act.y === "number" ? act.y : 0;
        const actH = typeof act.height === "number" ? act.height : 0;
        const actBottom = actY + actH + this.paddingBottom;
        if (actBottom > maxNeeded) {
          maxNeeded = actBottom;
        }
      }
    }

    for (const line of this.lifelines) {
      line.setLength(maxNeeded);
    }
  }

  addParticipant(actor: DOMElement, options: LifelineOptions = {}): LifelineElementImpl {
    const existing = this.lifelineMap.get(actor);
    if (existing) {
      return existing;
    }
    const line = Lifeline(actor, options);
    line.diagram = this;
    this.participants.push(actor);
    this.lifelines.push(line);
    this.lifelineMap.set(actor, line);
    this.updateLifelineLengths();
    return line;
  }

  getLifeline(actor: DOMElement): LifelineElementImpl {
    return this.lifelineMap.get(actor) || this.addParticipant(actor);
  }

  message(
    from: DOMElement | LifelineElementImpl,
    to: DOMElement | LifelineElementImpl,
    options: ConnectorOptions | string = {},
  ): ConnectorElement {
    const fromActor = "actor" in from ? (from as LifelineElementImpl).actor : (from as DOMElement);
    const toActor = "actor" in to ? (to as LifelineElementImpl).actor : (to as DOMElement);

    this.getLifeline(fromActor);
    this.getLifeline(toActor);

    const messageIndex = this.messages.length;
    const computedY = this.startY + messageIndex * this.gapY;

    const opts: ConnectorOptions =
      typeof options === "string" ? { label: options } : { ...options };
    const y = opts.y ?? computedY;
    const labelOffsetY = opts.labelOffsetY ?? -2.2;
    const conn = Connector(fromActor, toActor, {
      ...opts,
      labelOffsetY,
      y,
    });

    this.messages.push(conn);
    this.updateLifelineLengths();
    return conn;
  }

  activate(
    actor: DOMElement | LifelineElementImpl,
    options: ActivationOptions = {},
  ): ActivationBarElementImpl {
    const act = "actor" in actor ? (actor as LifelineElementImpl).actor : (actor as DOMElement);
    const line = this.getLifeline(act);
    const active = line.activate(options);
    this.activations.push(active);
    this.updateLifelineLengths();
    return active;
  }
}

/**
 * Creates a reactive Sequence Diagram coordinator with lifelines and messages.
 * @category Components
 */
export function SequenceDiagram(options?: SequenceDiagramOptions): SequenceDiagramController {
  return new SequenceDiagramControllerImpl(options);
}

/**
 * Creates a vertical dashed timeline lifeline extending from a participant actor.
 * Module-internal: lifelines are created and owned by the SequenceDiagram coordinator.
 */
const Lifeline = (actor: DOMElement, options?: LifelineOptions): LifelineElementImpl => {
  return mount(new LifelineElementImpl(actor, options));
};
