/**
 * Sequence diagram primitives: Lifeline, ActivationBar execution blocks, and SequenceDiagram builder.
 */

import { getActiveStage } from "../../core/index";
import { DOMElement, type ElementOptions } from "../element";
import { Connector, type ConnectorElement, type ConnectorOptions } from "./Connector";

export interface LifelineOptions extends ElementOptions {
  length?: number;
  color?: string;
}

export interface ActivationBarOptions extends ElementOptions {
  from?: ConnectorElement | number;
  to?: ConnectorElement | number;
  y?: number;
  height?: number;
  color?: string;
}

export type ActivationOptions = ActivationBarOptions;

export interface SequenceDiagramOptions {
  participants?: DOMElement[];
  startY?: number;
  gapY?: number;
  lifelineLength?: number;
  lifelineColor?: string;
}

export type SequenceOptions = SequenceDiagramOptions;

export class LifelineElement extends DOMElement {
  actor: DOMElement;
  length: number;
  color: string;
  activations: ActivationBarElement[] = [];

  constructor(actor: DOMElement, options: LifelineOptions = {}) {
    const el = document.createElement("div");
    el.className = "sr-lifeline";
    el.style.position = "absolute";
    el.style.width = "2px";
    el.style.borderLeft = `2px dashed ${options.color || "rgba(148, 163, 184, 0.7)"}`;
    el.style.pointerEvents = "none";
    el.style.zIndex = "1";

    super("Lifeline", el, { ...options, opacity: options.opacity ?? 0, x: 0, y: 0 });

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

  activationBar(options: ActivationBarOptions = {}): ActivationBarElement {
    const stage = getActiveStage();
    const el = new ActivationBarElement(this, options);
    this.activations.push(el);
    return stage.registerElement(el) as ActivationBarElement;
  }

  activation(options: ActivationBarOptions = {}): ActivationBarElement {
    return this.activationBar(options);
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
      const actTopPct = lifelineTopPct + act.relY;
      const actBottomPct = actTopPct + act.barHeight;
      if (actTopPct - 1 <= yPct && yPct <= actBottomPct + 1) {
        return true;
      }
    }
    return false;
  }
}

export class ActivationBarElement extends DOMElement {
  lifeline: LifelineElement;
  relY: number;
  barHeight: number;

  constructor(lifeline: LifelineElement, options: ActivationBarOptions = {}) {
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

    super("ActivationBar", bar, { ...options, opacity: options.opacity ?? 0, x: 0, y: 0 });

    this.lifeline = lifeline;

    let computedY = options.y;
    let computedHeight = options.height;

    if ((options.from !== undefined || options.to !== undefined) && computedY === undefined) {
      const fromYRaw =
        typeof options.from === "number"
          ? options.from
          : typeof (options.from as { messageY?: number })?.messageY === "number"
            ? (options.from as { messageY: number }).messageY
            : typeof options.from?.y === "number"
              ? options.from.y
              : 36;
      const toYRaw =
        typeof options.to === "number"
          ? options.to
          : typeof (options.to as { messageY?: number })?.messageY === "number"
            ? (options.to as { messageY: number }).messageY
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

    this.relY = computedY ?? 4;
    this.barHeight = computedHeight ?? 20;
    this.domElement.style.left = "calc(50% - 7px)";
    this.domElement.style.top = `calc(100% + ${this.relY}cqh)`;
    this.domElement.style.height = `${this.barHeight}cqh`;
    this.domElement.style.transform = "none";

    if (lifeline.actor.domElement) {
      lifeline.actor.domElement.appendChild(this.domElement);
    }
  }
}

export type ActivationElement = ActivationBarElement;

export class SequenceDiagramElement {
  readonly participants: DOMElement[] = [];
  readonly lifelines: LifelineElement[] = [];
  readonly messages: ConnectorElement[] = [];
  readonly activations: ActivationBarElement[] = [];
  private lifelineMap = new Map<DOMElement, LifelineElement>();
  startY: number;
  gapY: number;

  get elements(): DOMElement[] {
    return [...this.lifelines, ...this.activations, ...this.messages];
  }

  constructor(options: SequenceDiagramOptions = {}) {
    this.startY = options.startY ?? 36;
    this.gapY = options.gapY ?? 9;

    if (options.participants) {
      for (const p of options.participants) {
        this.addParticipant(p, {
          length: options.lifelineLength,
          color: options.lifelineColor,
        });
      }
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
    return conn;
  }

  activate(
    actor: DOMElement | LifelineElement,
    options: ActivationBarOptions = {},
  ): ActivationBarElement {
    const act = "actor" in actor ? (actor as LifelineElement).actor : (actor as DOMElement);
    const line = this.getLifeline(act);
    const active = line.activationBar(options);
    this.activations.push(active);
    return active;
  }

  activationBar(
    actor: DOMElement | LifelineElement,
    options: ActivationBarOptions = {},
  ): ActivationBarElement {
    return this.activate(actor, options);
  }
}

export const SequenceDiagram = (options?: SequenceDiagramOptions): SequenceDiagramElement => {
  return new SequenceDiagramElement(options);
};

export const sequenceDiagram = SequenceDiagram;

export const Sequence = (options?: SequenceDiagramOptions): SequenceDiagramElement => {
  return new SequenceDiagramElement(options);
};

export const Lifeline = (actor: DOMElement, options?: LifelineOptions): LifelineElement => {
  const stage = getActiveStage();
  const el = new LifelineElement(actor, options);
  return stage.registerElement(el) as LifelineElement;
};

export const ActivationBar = (
  lifeline: LifelineElement,
  options?: ActivationBarOptions,
): ActivationBarElement => {
  const stage = getActiveStage();
  const el = new ActivationBarElement(lifeline, options);
  return stage.registerElement(el) as ActivationBarElement;
};

export const Activation = (
  lifeline: LifelineElement,
  options?: ActivationBarOptions,
): ActivationBarElement => {
  return ActivationBar(lifeline, options);
};
