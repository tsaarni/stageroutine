/**
 * Sequence diagram primitives: Lifeline and Activation execution blocks.
 */

import { getActiveStage } from "../../core/index";
import { DOMElement, type ElementOptions } from "../element";

export interface LifelineOptions extends ElementOptions {
  length?: number;
  color?: string;
}

export interface ActivationOptions extends ElementOptions {
  y?: number;
  height?: number;
  color?: string;
}

export class LifelineElement extends DOMElement {
  actor: DOMElement;
  length: number;
  color: string;
  private animFrame: number | null = null;

  constructor(actor: DOMElement, options: LifelineOptions = {}) {
    const el = document.createElement("div");
    el.className = "sr-lifeline";
    el.style.position = "absolute";
    el.style.width = "2px";
    el.style.borderLeft = `2px dashed ${options.color || "#475569"}`;
    el.style.pointerEvents = "none";
    el.style.zIndex = "0";

    super("Lifeline", el, options);

    this.actor = actor;
    this.length = options.length ?? 450;
    this.color = options.color || "#475569";
    this.domElement.style.height = `${this.length}px`;

    this.updatePosition();

    if (typeof window !== "undefined") {
      const tick = () => {
        this.updatePosition();
        this.animFrame = requestAnimationFrame(tick);
      };
      this.animFrame = requestAnimationFrame(tick);
    }
  }

  updatePosition(): void {
    const dom = this.actor.domElement;
    const viewport =
      (dom.parentElement?.closest("[style*='container-type']") as HTMLElement) || dom.parentElement;

    if (viewport && dom.isConnected) {
      const vRect = viewport.getBoundingClientRect();
      const dRect = dom.getBoundingClientRect();
      const scale = vRect.width > 0 ? vRect.width / 1920 : 1;
      const x = (dRect.left - vRect.left) / scale;
      const y = (dRect.top - vRect.top) / scale;
      const width = dRect.width / scale;
      const height = dRect.height / scale;

      this.x = x + width / 2 - 1;
      this.y = y + height;
      return;
    }

    const actorW = dom.offsetWidth || 140;
    const actorH = dom.offsetHeight || 48;
    const rawX =
      typeof this.actor.x === "number"
        ? this.actor.x <= 100
          ? (this.actor.x / 100) * 1920
          : this.actor.x
        : 0;
    const rawY =
      typeof this.actor.y === "number"
        ? this.actor.y <= 100
          ? (this.actor.y / 100) * 1080
          : this.actor.y
        : 0;

    this.x = rawX + actorW / 2 - 1;
    this.y = rawY + actorH;
  }

  activation(options: ActivationOptions = {}): ActivationElement {
    const stage = getActiveStage();
    const el = new ActivationElement(this, options);
    return stage.registerElement(el) as ActivationElement;
  }
}

export class ActivationElement extends DOMElement {
  lifeline: LifelineElement;
  relY: number;
  barHeight: number;

  constructor(lifeline: LifelineElement, options: ActivationOptions = {}) {
    const bar = document.createElement("div");
    bar.className = "sr-activation";
    bar.style.position = "absolute";
    bar.style.width = "14px";
    bar.style.background = options.color || "#38bdf8";
    bar.style.borderRadius = "3px";
    bar.style.boxShadow = "0 0 12px rgba(56, 189, 248, 0.4)";
    bar.style.border = "1px solid rgba(255, 255, 255, 0.2)";
    bar.style.zIndex = "2";

    super("Activation", bar, options);

    this.lifeline = lifeline;
    this.relY = options.y ?? 100;
    this.barHeight = options.height ?? 120;
    this.domElement.style.height = `${this.barHeight}px`;

    this.updatePosition();

    if (typeof window !== "undefined") {
      const tick = () => {
        this.updatePosition();
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    }
  }

  updatePosition(): void {
    const lifeX =
      typeof this.lifeline.x === "number"
        ? this.lifeline.x
        : (this.lifeline.domElement?.offsetLeft ?? 0);
    const lifeY =
      typeof this.lifeline.y === "number"
        ? this.lifeline.y
        : (this.lifeline.domElement?.offsetTop ?? 0);

    this.x = lifeX - 6;
    this.y = lifeY + this.relY;
  }
}

export const Lifeline = (actor: DOMElement, options?: LifelineOptions): LifelineElement => {
  const stage = getActiveStage();
  const el = new LifelineElement(actor, options);
  return stage.registerElement(el) as LifelineElement;
};

export const Activation = (
  lifeline: LifelineElement,
  options?: ActivationOptions,
): ActivationElement => {
  const stage = getActiveStage();
  const el = new ActivationElement(lifeline, options);
  return stage.registerElement(el) as ActivationElement;
};
