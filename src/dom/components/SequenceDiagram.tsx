/**
 * Sequence diagram primitives: Lifeline, Activation execution blocks, and SequenceDiagram builder.
 */

import "./SequenceDiagram.css";
import { getActiveStage } from "../../core/index";
import { DOMElement, type ElementOptions } from "../element";
import { Connector, type ConnectorElement, type ConnectorOptions } from "./Connector";

/**
 * Configuration options for vertical dashed lifeline timelines.
 * @category Components
 */
export interface LifelineOptions extends ElementOptions {
  /** Vertical length of the dashed line in pixels (default: 500). Automatically extends when activations exceed length. */
  length?: number;
  /** Stroke color of the dashed line (default: "rgba(148, 163, 184, 0.7)"). */
  color?: string;
}

/**
 * Configuration options for execution activation bars.
 * @category Components
 */
export interface ActivationOptions extends ElementOptions {
  /** Starting message connector or Y coordinate anchor. */
  from?: ConnectorElement | number;
  /** Ending message connector or Y coordinate anchor. */
  to?: ConnectorElement | number;
  /** Explicit vertical offset along the lifeline in pixels or stage units. */
  y?: number;
  /** Explicit bar height in pixels or stage units (default: 20). */
  height?: number;
  /** Fill color and glow highlight for the activation bar (default: "#38bdf8"). */
  color?: string;
}

/**
 * Configuration options for the SequenceDiagram coordinator.
 * @category Components
 */
export interface SequenceDiagramOptions {
  /** Initial actor elements to register as diagram participants. */
  participants?: DOMElement[];
  /** Vertical start position for the first message in stage height percentage (default: 36). */
  startY?: number;
  /** Vertical spacing between message rows in stage height percentage (default: 9). */
  gapY?: number;
  /** Minimum length of participant lifelines in pixels (default: 500). Automatically extends to fit messages and activations. */
  lifelineLength?: number;
  /** Stroke color of participant lifelines (default: "rgba(148, 163, 184, 0.7)"). */
  lifelineColor?: string;
  /** Padding in pixels below the lowest message or activation (default: 48). */
  paddingBottom?: number;
}

/**
 * Vertical dashed lifeline element rendered below its participant actor.
 * @internal
 */
export class LifelineElement extends DOMElement {
  static override reactiveKeys: ReadonlySet<string> = new Set([
    ...DOMElement.reactiveKeys,
    "length",
  ]);

  actor: DOMElement;
  length: number;
  color: string;
  activations: ActivationBarElement[] = [];

  override update(): void {
    this.domElement.style.height = `${this.length}px`;
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
      opacity: options.opacity ?? 0,
      x: 0,
      y: 0,
      customPositioned: true,
    });

    this.actor = actor;
    (actor as unknown as { lifeline?: LifelineElement }).lifeline = this;
    this.length = options.length ?? 500;
    this.color = options.color || "rgba(148, 163, 184, 0.7)";
    this.domElement.style.left = "calc(50% - 1px)";
    this.domElement.style.top = "100%";
    this.domElement.style.width = "0px";
    this.domElement.style.transform = "none";
    this.domElement.style.height = `${this.length}px`;

    // Ensure actor doesn't clip descending lifeline and activation blocks
    if (actor.domElement) {
      actor.domElement.style.overflow = "visible";
      actor.domElement.appendChild(this.domElement);
    }
  }

  /** Sets the visual length of the dashed lifeline in pixels. */
  setLength(length: number): void {
    const rounded = Math.round(length);
    if (rounded > 0 && rounded !== this.length) {
      this.length = rounded;
      this.domElement.style.height = `${this.length}px`;
    }
  }

  activate(options: ActivationOptions = {}): ActivationBarElement {
    const stage = getActiveStage();
    const el = new ActivationBarElement(this, options);
    this.activations.push(el);

    const yNum = typeof el.y === "number" ? el.y : Number.parseFloat(String(el.y)) || 0;
    const hNum =
      typeof el.height === "number" ? el.height : Number.parseFloat(String(el.height)) || 0;
    const needed = (yNum + hNum) * 10.8 + 48;
    if (needed > this.length) {
      this.setLength(needed);
    }

    return stage.registerElement(el) as ActivationBarElement;
  }

  hasActivationAt(y1080: number): boolean {
    const actorYRaw = typeof this.actor.y === "number" ? this.actor.y : 0;
    const actorYPct = actorYRaw > 100 ? (actorYRaw / 1080) * 100 : actorYRaw;

    let actorHeightPct = 9;
    const stageEl = this.actor.domElement?.closest(".sr-viewport, [style*='container-type']");
    const stageH = stageEl?.clientHeight || window.innerHeight;
    if (this.actor.domElement && stageH > 0) {
      actorHeightPct = (this.actor.domElement.offsetHeight / stageH) * 100;
    }
    const lifelineTopPct = actorYPct + actorHeightPct;
    const yPct = (y1080 / 1080) * 100;

    for (const act of this.activations) {
      const actY = typeof act.y === "number" ? act.y : Number.parseFloat(String(act.y)) || 0;
      const actH =
        typeof act.height === "number" ? act.height : Number.parseFloat(String(act.height)) || 0;
      const actTopPct = lifelineTopPct + actY;
      const actBottomPct = actTopPct + actH;
      if (actTopPct - 1 <= yPct && yPct <= actBottomPct + 1) {
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
export class ActivationBarElement extends DOMElement {
  lifeline: LifelineElement;

  override update(): void {
    const yNum = typeof this.y === "number" ? this.y : Number.parseFloat(String(this.y)) || 0;
    const hNum =
      typeof this.height === "number" ? this.height : Number.parseFloat(String(this.height)) || 0;
    this.domElement.style.top = `calc(100% + ${yNum}cqh)`;
    this.domElement.style.height = `${hNum}cqh`;
  }

  constructor(lifeline: LifelineElement, options: ActivationOptions = {}) {
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

    let computedY = options.y;
    let computedHeight = options.height;

    if ((options.from !== undefined || options.to !== undefined) && computedY === undefined) {
      const fromYRaw =
        typeof options.from === "number"
          ? options.from
          : typeof options.from?.y === "number"
            ? options.from.y
            : 36;
      const toYRaw =
        typeof options.to === "number"
          ? options.to
          : typeof options.to?.y === "number"
            ? options.to.y
            : fromYRaw + 20;

      const fromYPct = fromYRaw > 100 ? (fromYRaw / 1080) * 100 : fromYRaw;
      const toYPct = toYRaw > 100 ? (toYRaw / 1080) * 100 : toYRaw;

      // In sequence diagrams, participant row is placed at y = 22cqh with height ~9.25cqh
      const actorYPct = 22;
      const actorHeightPct = 9.25;
      const actorBottomPct = actorYPct + actorHeightPct;

      computedY = Math.max(0, fromYPct - actorBottomPct - 0.8);
      computedHeight = Math.max(2, toYPct - fromYPct + 1.6);
    }

    const yVal = computedY ?? 4;
    const heightVal = computedHeight ?? 20;

    super("ActivationBar", bar, {
      ...options,
      opacity: options.opacity ?? 0,
      x: 0,
      y: yVal,
      height: heightVal,
      customPositioned: true,
    });

    this.lifeline = lifeline;
    this.domElement.style.left = "calc(50% - 7px)";
    this.domElement.style.transform = "none";
    this.update();

    if (lifeline.actor.domElement) {
      lifeline.actor.domElement.appendChild(this.domElement);
    }
  }
}

/**
 * Sequence diagram coordinator that manages lifelines, messages, and activations for a set of participants.
 * @internal
 */
export class SequenceDiagramElement {
  readonly participants: DOMElement[] = [];
  readonly lifelines: LifelineElement[] = [];
  readonly messages: ConnectorElement[] = [];
  readonly activations: ActivationBarElement[] = [];
  private lifelineMap = new Map<DOMElement, LifelineElement>();
  private defaultLifelineLength: number;
  private paddingBottom: number;
  startY: number;
  gapY: number;

  get elements(): DOMElement[] {
    return [...this.lifelines, ...this.activations, ...this.messages];
  }

  constructor(options: SequenceDiagramOptions = {}) {
    this.startY = options.startY ?? 36;
    this.gapY = options.gapY ?? 9;
    this.defaultLifelineLength = options.lifelineLength ?? 500;
    this.paddingBottom = options.paddingBottom ?? 48;

    if (options.participants) {
      for (const p of options.participants) {
        this.addParticipant(p, {
          length: this.defaultLifelineLength,
          color: options.lifelineColor,
        });
      }
    }
  }

  private updateLifelineLengths(): void {
    let maxNeeded = this.defaultLifelineLength;

    for (const line of this.lifelines) {
      const actorYRaw = typeof line.actor.y === "number" ? line.actor.y : 22;
      const actorYPx = actorYRaw > 100 ? actorYRaw : (actorYRaw / 100) * 1080;
      let actorHeightPx = (9.25 / 100) * 1080;
      if (typeof line.actor.height === "number") {
        actorHeightPx =
          line.actor.height > 100 ? line.actor.height : (line.actor.height / 100) * 1080;
      } else if (line.actor.domElement?.offsetHeight) {
        actorHeightPx = line.actor.domElement.offsetHeight;
      }
      const actorBottomPx = actorYPx + actorHeightPx;

      for (const msg of this.messages) {
        const msgYRaw = typeof msg.y === "number" || typeof msg.y === "string" ? msg.y : 0;
        const msgYPx =
          typeof msgYRaw === "number"
            ? msgYRaw > 100
              ? msgYRaw
              : (msgYRaw / 100) * 1080
            : typeof msgYRaw === "string" && (msgYRaw.endsWith("cqh") || msgYRaw.endsWith("%"))
              ? (Number.parseFloat(msgYRaw) / 100) * 1080
              : Number.parseFloat(String(msgYRaw)) || 0;

        if (msgYPx > 0) {
          const needed = msgYPx - actorBottomPx + this.paddingBottom;
          if (needed > maxNeeded) {
            maxNeeded = needed;
          }
        }
      }

      for (const act of this.activations) {
        const actY = typeof act.y === "number" ? act.y : Number.parseFloat(String(act.y)) || 0;
        const actH =
          typeof act.height === "number" ? act.height : Number.parseFloat(String(act.height)) || 0;
        const actBottomPx = (actY + actH) * 10.8 + this.paddingBottom;
        if (actBottomPx > maxNeeded) {
          maxNeeded = actBottomPx;
        }
      }
    }

    for (const line of this.lifelines) {
      line.setLength(maxNeeded);
    }
  }

  addParticipant(actor: DOMElement, options: LifelineOptions = {}): LifelineElement {
    const existing = this.lifelineMap.get(actor);
    if (existing) {
      return existing;
    }
    const line = Lifeline(actor, options);
    this.participants.push(actor);
    this.lifelines.push(line);
    this.lifelineMap.set(actor, line);
    this.updateLifelineLengths();
    return line;
  }

  getLifeline(actor: DOMElement): LifelineElement {
    return this.lifelineMap.get(actor) || this.addParticipant(actor);
  }

  message(
    from: DOMElement | LifelineElement,
    to: DOMElement | LifelineElement,
    options: ConnectorOptions | string = {},
  ): ConnectorElement {
    const fromActor = "actor" in from ? (from as LifelineElement).actor : (from as DOMElement);
    const toActor = "actor" in to ? (to as LifelineElement).actor : (to as DOMElement);

    this.getLifeline(fromActor);
    this.getLifeline(toActor);

    const messageIndex = this.messages.length;
    const computedY = this.startY + messageIndex * this.gapY;

    const opts: ConnectorOptions =
      typeof options === "string" ? { label: options } : { ...options };
    const y = opts.y ?? computedY;
    const labelOffsetY =
      opts.labelOffsetY ??
      (typeof opts.labelOffset === "number" || typeof opts.labelOffset === "string"
        ? opts.labelOffset
        : -30);

    const conn = Connector(fromActor, toActor, {
      labelOffsetY,
      ...opts,
      y,
    });

    this.messages.push(conn);
    this.updateLifelineLengths();
    return conn;
  }

  activate(
    actor: DOMElement | LifelineElement,
    options: ActivationOptions = {},
  ): ActivationBarElement {
    const act = "actor" in actor ? (actor as LifelineElement).actor : (actor as DOMElement);
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
export function SequenceDiagram(options?: SequenceDiagramOptions): SequenceDiagramElement {
  return new SequenceDiagramElement(options);
}

/**
 * Creates a vertical dashed timeline lifeline extending from a participant actor.
 * Module-internal: lifelines are created and owned by the SequenceDiagram coordinator.
 */
const Lifeline = (actor: DOMElement, options?: LifelineOptions): LifelineElement => {
  const stage = getActiveStage();
  const el = new LifelineElement(actor, options);
  return stage.registerElement(el) as LifelineElement;
};
