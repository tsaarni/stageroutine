/**
 * Reactive property proxy that intercepts element assignments (like el.x = 200) and schedules animations.
 */

import { builtinEasings, isTransitionDescriptor } from "../motion/transitions";
import type { AnimationMilestone, EaseCurve, ReactiveElementBase } from "./types";

export interface ElementHost {
  recordMutation(
    elementId: string,
    property: string,
    from: unknown,
    to: unknown,
    durationMs: number,
    delayMs: number,
    curve: EaseCurve,
    triggerElementId?: string,
    triggerMilestone?: AnimationMilestone,
    triggerProperty?: string,
  ): void;
  getCurrentPropertyValue(elementId: string, property: string): unknown;
  setCurrentPropertyValue(elementId: string, property: string, value: unknown): void;
}

export function createReactiveProxy<T extends ReactiveElementBase>(
  element: T,
  host: ElementHost,
): T {
  return new Proxy(element, {
    has(target, prop) {
      if (typeof prop === "string" && host.getCurrentPropertyValue(target.id, prop) !== undefined) {
        return true;
      }
      return Reflect.has(target, prop);
    },

    get(target, prop, receiver) {
      if (typeof prop === "symbol") {
        return Reflect.get(target, prop, receiver);
      }

      if (prop === "size") {
        const w =
          host.getCurrentPropertyValue(target.id, "width") ??
          (target as Record<string, unknown>).width;
        const h =
          host.getCurrentPropertyValue(target.id, "height") ??
          (target as Record<string, unknown>).height;
        return w ?? h;
      }

      // Check current staged property value first
      const val = host.getCurrentPropertyValue(target.id, prop as string);
      if (val !== undefined) {
        return val;
      }

      return Reflect.get(target, prop, receiver);
    },

    set(target, prop, value, receiver) {
      if (typeof prop === "symbol") {
        return Reflect.set(target, prop, value, receiver);
      }

      const propName = prop as string;

      if (propName === "size") {
        (receiver as Record<string, unknown>).width = value;
        (receiver as Record<string, unknown>).height = value;
        return true;
      }

      let from: unknown =
        host.getCurrentPropertyValue(target.id, propName) ?? Reflect.get(target, prop, receiver);

      if (
        from === undefined &&
        "domElement" in target &&
        (target as { domElement?: HTMLElement }).domElement
      ) {
        const dom = (target as { domElement: HTMLElement }).domElement;
        if (propName === "width") {
          from = dom.offsetWidth || undefined;
        } else if (propName === "height") {
          from = dom.offsetHeight || undefined;
        }
      }

      let targetVal = value;
      let durationMs = 600;
      let delayMs = 0;
      let triggerElementId: string | undefined;
      let triggerMilestone: AnimationMilestone | undefined;
      let triggerProperty: string | undefined;
      let curve: EaseCurve = builtinEasings.quartOut;

      if (isTransitionDescriptor(value)) {
        targetVal = value.target;
        durationMs = value.durationMs;
        delayMs = value.delayMs;
        if (value.triggerTarget) {
          triggerElementId =
            typeof value.triggerTarget === "string"
              ? value.triggerTarget
              : (value.triggerTarget as ReactiveElementBase).id;
        }
        triggerMilestone = value.triggerMilestone;
        triggerProperty = value.triggerProperty;
        curve = value.curve;
      }

      // Update state
      host.setCurrentPropertyValue(target.id, propName, targetVal);

      // Record in current step
      host.recordMutation(
        target.id,
        propName,
        from,
        targetVal,
        durationMs,
        delayMs,
        curve,
        triggerElementId,
        triggerMilestone,
        triggerProperty,
      );

      return true;
    },
  });
}
