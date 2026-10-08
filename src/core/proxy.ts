/**
 * Reactive proxy wrapping stage elements to track property reads, mutations, and transitions.
 */

import { isTransitionDescriptor } from "../motion/transitions";
import { splitPosition } from "./position";
import { isReactiveProperty } from "./reactive";
import { tryGetActiveStage } from "./stage";
import type { AnimationMilestone, EaseCurve, ReactiveElementBase } from "./types";
import { STAGE_UNITS_TALL, stageUnitsWide } from "./units";

/** Resolves "center" on an axis to its numeric stage unit coordinate. */
function resolveCenterCoord(axis: "x" | "y"): number {
  if (axis === "x") {
    const stage = tryGetActiveStage();
    return stage ? stage.unitsWide / 2 : stageUnitsWide(1920, 1080) / 2;
  }
  return STAGE_UNITS_TALL / 2;
}

/**
 * Host interface that manages property states and transitions for proxied elements.
 * @internal
 */
export interface ElementHost {
  _getCurrentPropertyValue(elementId: string, property: string): unknown;
  _setCurrentPropertyValue(elementId: string, property: string, value: unknown): void;
  _recordMutation(
    elementId: string,
    property: string,
    from: unknown,
    to: unknown,
    durationMs?: number,
    delayMs?: number,
    curve?: EaseCurve,
    triggerElementId?: string,
    triggerMilestone?: AnimationMilestone,
    triggerProperty?: string,
  ): void;
}

/**
 * Creates a reactive proxy for an element that intercepts property sets
 * and records transitions or mutations with the host.
 * @internal
 */
export function createReactiveProxy<T extends ReactiveElementBase>(
  element: T,
  host: ElementHost,
): T {
  return new Proxy(element, {
    get(target, prop, receiver) {
      if (typeof prop === "symbol") {
        return Reflect.get(target, prop, receiver);
      }

      const propName = String(prop);

      if (propName === "position") {
        return [readCoord(target, host, "x"), readCoord(target, host, "y")];
      }

      // Check current staged property value first
      const stagedValue = host._getCurrentPropertyValue(target.id, propName);
      if (stagedValue !== undefined) {
        return stagedValue;
      }

      return Reflect.get(target, prop, receiver);
    },

    set(target, prop, value, receiver) {
      if (typeof prop === "symbol") {
        return Reflect.set(target, prop, value, receiver);
      }

      const propName = String(prop);

      if (propName === "position") {
        const { x, y } = splitPosition(value, () => [
          readCoord(target, host, "x"),
          readCoord(target, host, "y"),
        ]);
        if (x !== undefined) {
          (receiver as Record<string, unknown>).x = x;
        }
        if (y !== undefined) {
          (receiver as Record<string, unknown>).y = y;
        }
        return true;
      }

      // Only track declared reactive properties
      if (!isReactiveProperty(target, propName)) {
        return Reflect.set(target, prop, value, receiver);
      }

      if (isTransitionDescriptor(value)) {
        let from: unknown =
          host._getCurrentPropertyValue(target.id, propName) ?? Reflect.get(target, prop, receiver);

        if (
          from === undefined &&
          "domElement" in target &&
          (target as { domElement?: HTMLElement }).domElement
        ) {
          const dom = (target as { domElement: HTMLElement }).domElement;
          if (propName === "width") {
            from = dom.style.width || undefined;
          } else if (propName === "height") {
            from = dom.style.height || undefined;
          }
        }

        let targetVal = value.target;
        if (typeof targetVal === "function") {
          const current = typeof from === "number" ? from : 0;
          targetVal = (targetVal as (curr: number) => unknown)(current);
        }

        if (targetVal === "center" && (propName === "x" || propName === "y")) {
          targetVal = resolveCenterCoord(propName);
        }

        let triggerElementId: string | undefined;
        if (value.triggerTarget) {
          if (typeof value.triggerTarget === "string") {
            triggerElementId = value.triggerTarget;
          } else if (
            "id" in value.triggerTarget &&
            typeof (value.triggerTarget as ReactiveElementBase).id === "string"
          ) {
            triggerElementId = (value.triggerTarget as ReactiveElementBase).id;
          } else if (
            "elements" in value.triggerTarget &&
            Array.isArray((value.triggerTarget as { elements: unknown[] }).elements)
          ) {
            const first = (value.triggerTarget as { elements: { id?: string }[] }).elements[0];
            if (first && typeof first.id === "string") {
              triggerElementId = first.id;
            }
          }
        }

        host._setCurrentPropertyValue(target.id, propName, targetVal);
        host._recordMutation(
          target.id,
          propName,
          from,
          targetVal,
          value.durationMs,
          value.delayMs,
          value.curve,
          triggerElementId,
          value.triggerMilestone,
          value.triggerProperty,
        );

        return true;
      }

      // Static direct assignment: update property state without scheduling a transition
      let targetVal = value;
      if (typeof targetVal === "function") {
        const from: unknown =
          host._getCurrentPropertyValue(target.id, propName) ?? Reflect.get(target, prop, receiver);
        targetVal = targetVal(typeof from === "number" ? from : 0);
      }

      if (targetVal === "center" && (propName === "x" || propName === "y")) {
        targetVal = resolveCenterCoord(propName);
      }

      host._setCurrentPropertyValue(target.id, propName, targetVal);
      try {
        Reflect.set(target, prop, targetVal, receiver);
      } catch {
        // ignore read-only
      }
      const managed = target as {
        _dispatchUpdate?: (progress?: number) => void;
        _update?: () => void;
      };
      if (typeof managed._dispatchUpdate === "function") {
        managed._dispatchUpdate(1);
      } else {
        managed._update?.();
      }
      return true;
    },
  });
}

/** Reads the live coordinate of one axis, falling back to the element's own value. */
function readCoord(target: ReactiveElementBase, host: ElementHost, axis: "x" | "y"): number {
  const staged = host._getCurrentPropertyValue(target.id, axis);
  if (typeof staged === "number") return staged;
  const own = (target as unknown as Record<string, unknown>)[axis];
  return typeof own === "number" ? own : 0;
}
