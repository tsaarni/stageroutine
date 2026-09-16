/**
 * Reactive property proxy that intercepts element assignments (like el.x = 200) and schedules animations.
 */

import { isTransitionDescriptor } from "../motion/transitions";
import { isReactiveProperty } from "./reactive";
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
      if (
        typeof prop === "string" &&
        isReactiveProperty(target, prop) &&
        host.getCurrentPropertyValue(target.id, prop) !== undefined
      ) {
        return true;
      }
      return Reflect.has(target, prop);
    },

    get(target, prop, receiver) {
      if (typeof prop === "symbol") {
        return Reflect.get(target, prop, receiver);
      }

      const propName = prop as string;

      // Non-reactive properties (lifecycle flags, DOM nodes, methods) bypass the stage engine
      if (!isReactiveProperty(target, propName)) {
        return Reflect.get(target, prop, receiver);
      }

      if (propName === "size") {
        const w =
          host.getCurrentPropertyValue(target.id, "width") ??
          (target as Record<string, unknown>).width;
        const h =
          host.getCurrentPropertyValue(target.id, "height") ??
          (target as Record<string, unknown>).height;
        return w ?? h;
      }

      if (propName === "position") {
        const x =
          host.getCurrentPropertyValue(target.id, "x") ??
          (target as Record<string, unknown>).x ??
          0;
        const y =
          host.getCurrentPropertyValue(target.id, "y") ??
          (target as Record<string, unknown>).y ??
          0;
        return [x, y];
      }

      // Check current staged property value first
      const val = host.getCurrentPropertyValue(target.id, propName);
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

      // Non-reactive properties (lifecycle flags, DOM nodes, methods) bypass the stage engine
      if (!isReactiveProperty(target, propName)) {
        return Reflect.set(target, prop, value, receiver);
      }

      if (typeof value === "function") {
        return Reflect.set(target, prop, value, receiver);
      }

      if (propName === "size") {
        (receiver as Record<string, unknown>).width = value;
        (receiver as Record<string, unknown>).height = value;
        return true;
      }

      if (propName === "position") {
        if (isTransitionDescriptor(value)) {
          const targetCoord = value.target as unknown;
          let targetX: unknown;
          let targetY: unknown;
          if (Array.isArray(targetCoord)) {
            targetX = targetCoord[0];
            targetY = targetCoord[1];
          } else if (typeof targetCoord === "object" && targetCoord !== null) {
            targetX = (targetCoord as Record<string, unknown>).x;
            targetY = (targetCoord as Record<string, unknown>).y;
          }
          if (targetX !== undefined) {
            (receiver as Record<string, unknown>).x = {
              ...value,
              target: targetX,
            };
          }
          if (targetY !== undefined) {
            (receiver as Record<string, unknown>).y = {
              ...value,
              target: targetY,
            };
          }
          return true;
        }

        let x: unknown;
        let y: unknown;
        if (Array.isArray(value)) {
          x = value[0];
          y = value[1];
        } else if (typeof value === "object" && value !== null) {
          x = (value as Record<string, unknown>).x;
          y = (value as Record<string, unknown>).y;
        }
        if (x !== undefined) {
          (receiver as Record<string, unknown>).x = x;
        }
        if (y !== undefined) {
          (receiver as Record<string, unknown>).y = y;
        }
        return true;
      }

      if (isTransitionDescriptor(value)) {
        let from: unknown =
          host.getCurrentPropertyValue(target.id, propName) ?? Reflect.get(target, prop, receiver);

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

        host.setCurrentPropertyValue(target.id, propName, value.target);
        host.recordMutation(
          target.id,
          propName,
          from,
          value.target,
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
      host.setCurrentPropertyValue(target.id, propName, value);
      try {
        Reflect.set(target, prop, value, receiver);
      } catch {
        // ignore read-only
      }
      if (
        typeof (target as { _dispatchUpdate?: (progress?: number) => void })._dispatchUpdate ===
        "function"
      ) {
        (target as { _dispatchUpdate: (progress?: number) => void })._dispatchUpdate(1);
      } else {
        (target as { update?: () => void }).update?.();
      }
      return true;
    },
  });
}
