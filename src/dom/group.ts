/**
 * Logical group proxy for coordinating multi-element transitions and property broadcasting without DOM wrappers.
 */

import { isReactiveProperty } from "../core/reactive";
import type {
  CoordProp,
  Position,
  PositionUpdater,
  ReactiveElementBase,
  ReactiveProp,
  Size,
} from "../core/types";
import {
  type ElementTransition,
  ElementTransitionBuilder,
  type ElementTransitionProps,
} from "../motion/element-transition";
import { isTransitionDescriptor } from "../motion/transitions";
import type { DOMElement, ElementDecorator } from "./element";

/**
 * Public fluent contract for a logical group of elements.
 * @category Core
 */
export interface GroupElement<T extends ReactiveElementBase = ReactiveElementBase>
  extends Iterable<T> {
  readonly elements: readonly T[];
  opacity: ReactiveProp<number>;
  scale: ReactiveProp<number>;
  rotation: ReactiveProp<number>;
  blur: ReactiveProp<number>;
  brightness: ReactiveProp<number>;
  color: ReactiveProp<string>;
  x: CoordProp;
  y: CoordProp;
  position: ReactiveProp<Position> | PositionUpdater;
  size: ReactiveProp<Size>;

  to(props: ElementTransitionProps<T>): ElementTransition;
  decorate(...decorators: ElementDecorator[]): this;
}

/**
 * @internal
 */
class GroupElementImpl implements Iterable<DOMElement | ReactiveElementBase> {
  readonly elements: readonly (DOMElement | ReactiveElementBase)[];

  constructor(elements: readonly (DOMElement | ReactiveElementBase)[]) {
    this.elements = elements;
  }

  [Symbol.iterator](): Iterator<DOMElement | ReactiveElementBase> {
    return this.elements[Symbol.iterator]();
  }

  to(props: ElementTransitionProps): ElementTransition {
    return new ElementTransitionBuilder(this.elements, props);
  }

  decorate(...decorators: ElementDecorator[]): this {
    for (const el of this.elements) {
      if (el && typeof (el as DOMElement).decorate === "function") {
        for (const dec of decorators) {
          (el as DOMElement).decorate(dec);
        }
      }
    }
    return this;
  }
}

/**
 * Creates a zero-DOM logical group proxy over multiple stage elements.
 * Grouping allows broadcasting transitions, property mutations, and decorators
 * across elements without adding container elements to the DOM tree.
 *
 * @category Core
 */
export function group<
  const T extends readonly (
    | ReactiveElementBase
    | readonly ReactiveElementBase[]
    | GroupElement
    | null
    | undefined
    | false
  )[],
>(
  ...items: T
): GroupElement<
  | Extract<T[number], ReactiveElementBase>
  | Extract<T[number], readonly ReactiveElementBase[]>[number]
  | Extract<T[number], GroupElement>["elements"][number]
> {
  const flattened: (DOMElement | ReactiveElementBase)[] = [];

  const add = (
    item:
      | DOMElement
      | ReactiveElementBase
      | readonly (DOMElement | ReactiveElementBase)[]
      | GroupElement
      | null
      | undefined
      | false,
  ) => {
    if (!item || typeof item !== "object") return;
    if (Array.isArray(item)) {
      for (const sub of item) add(sub);
    } else if ("elements" in item && Array.isArray((item as GroupElement).elements)) {
      for (const sub of (item as GroupElement).elements) add(sub);
    } else if (
      Symbol.iterator in item &&
      typeof (item as Iterable<unknown>)[Symbol.iterator] === "function" &&
      !("domElement" in item)
    ) {
      for (const sub of item as Iterable<DOMElement | ReactiveElementBase>) add(sub);
    } else {
      flattened.push(item as DOMElement | ReactiveElementBase);
    }
  };

  for (const it of items) {
    add(it);
  }

  const impl = new GroupElementImpl(flattened);

  return new Proxy(impl, {
    get(target, prop, receiver) {
      if (prop in target || typeof prop === "symbol") {
        return Reflect.get(target, prop, receiver);
      }
      if (target.elements.length > 0) {
        return Reflect.get(target.elements[0], prop);
      }
      return undefined;
    },
    set(target, prop, value, receiver) {
      if (prop in target && typeof prop !== "symbol") {
        return Reflect.set(target, prop, value, receiver);
      }
      const propName = String(prop);
      if (target.elements.some((el) => !isReactiveProperty(el, propName)))
        throw new Error(`Unsupported group property: ${propName}`);
      for (const el of target.elements) {
        if (!el) continue;
        if (isTransitionDescriptor(value)) {
          // Clone descriptor so each element gets its own transition instance
          (el as unknown as Record<string, unknown>)[propName] = { ...value };
        } else {
          (el as unknown as Record<string, unknown>)[propName] = value;
        }
      }
      return true;
    },
  }) as unknown as GroupElement<
    | Extract<T[number], ReactiveElementBase>
    | Extract<T[number], readonly ReactiveElementBase[]>[number]
    | Extract<T[number], GroupElement>["elements"][number]
  >;
}
