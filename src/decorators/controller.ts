import { getActiveStage, type Stage } from "../core/stage";
import type { ReactiveProp } from "../core/types";
import {
  type DOMElement,
  DOMElementImpl,
  type ElementDecorator,
  registerPresentationProperties,
} from "../dom/element";
import { type ElementTransition, ElementTransitionBuilder } from "../motion/element-transition";

type Targets<State> = { [Key in keyof State]?: ReactiveProp<State[Key]> };
type Controller<State> = ElementDecorator & {
  readonly values: Readonly<State>;
  to(props: Targets<State>): ElementTransition;
};

/** Shared attachment and snapshot state for built-in effect controllers. */
export function createEffectController<State extends Record<string, unknown>>(
  name: string,
  initial: State,
  validate: (key: string, value: unknown) => void,
  attach: (element: DOMElement, read: (props: Readonly<Record<string, unknown>>) => State) => void,
): Controller<State> {
  for (const [key, value] of Object.entries(initial)) validate(key, value);
  let attached: DOMElement | undefined;
  const keys = new Map(Object.keys(initial).map((key) => [key, `_${name}_${key}`]));
  const read = (props: Readonly<Record<string, unknown>>): State =>
    Object.fromEntries(
      [...keys].map(([key, property]) => [key, props[property] ?? initial[key]]),
    ) as State;
  const effect = ((element: DOMElement) => {
    if (attached)
      throw new Error(
        `A ${name} controller can only be attached once. Create a ${name} for each element.`,
      );
    registerPresentationProperties(
      element,
      Object.fromEntries([...keys].map(([key, property]) => [property, initial[key]])),
      (property, value) => validate(property.slice(name.length + 2), value),
    );
    attached = element;
    attach(element, read);
  }) as Controller<State>;
  Object.defineProperty(effect, "values", {
    get: () =>
      Object.freeze(
        attached ? read(attached as unknown as Record<string, unknown>) : { ...initial },
      ),
  });
  effect.to = (props) => {
    if (!attached) throw new Error(`Decorate an element before animating its ${name}.`);
    const targets = Object.fromEntries(
      Object.entries(props).map(([key, value]) => {
        const property = keys.get(key);
        if (!property) throw new TypeError(`Unknown ${name} property '${key}'.`);
        return [property, value];
      }),
    );
    return new ElementTransitionBuilder(attached, targets);
  };
  return effect;
}

/** One snapshot-safe controller can drive multiple receiving surfaces on the same stage. */
export function createSharedEffectController<State extends Record<string, unknown>>(
  name: string,
  initial: State,
  validate: (key: string, value: unknown) => void,
  attach: (element: DOMElement) => () => void,
  render: (values: Readonly<State>, context: HTMLElement) => void,
): Controller<State> {
  // Validate before the first attachment or any registration side effects.
  for (const [key, value] of Object.entries(initial)) validate(key, value);
  let stage: Stage | undefined;
  let controller: Controller<State> | undefined;
  let state: DOMElement | undefined;
  let queued = false;
  let disposed = false;
  const targets = new Set<DOMElement>();
  const cleanups: (() => void)[] = [];
  const requestRender = () => {
    if (queued || disposed) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      if (!disposed && controller && state?.isMounted) render(controller.values, state.domElement);
    });
  };
  const effect = ((element: DOMElement) => {
    if (disposed) throw new Error(`Cannot attach a disposed ${name}.`);
    const current = getActiveStage();
    if (!current._ownsElement(element) || (stage && stage !== current))
      throw new Error(`All ${name} receivers must belong to the same active stage.`);
    if (targets.has(element)) throw new Error(`This element already receives this ${name}.`);
    const removeSurface = attach(element);
    if (!controller) {
      stage = current;
      const node = document.createElement("div");
      node.hidden = true;
      node.setAttribute("aria-hidden", "true");
      state = stage._registerElement(
        new DOMElementImpl("EffectState", node, { customPositioned: true }),
      );
      stage._retainEffectState(state.id);
      controller = createEffectController(name, initial, validate, () => {});
      state.decorate(controller);
      state.onUpdate(requestRender);
      const observer = new ResizeObserver(requestRender);
      const mount = () => {
        if (!state) return;
        const viewport = state.domElement.parentElement;
        if (viewport) observer.observe(viewport);
        const theme = viewport?.parentElement;
        if (theme) {
          const mutations = new MutationObserver(requestRender);
          mutations.observe(theme, { attributes: true, attributeFilter: ["style", "class"] });
          cleanups.push(() => mutations.disconnect());
        }
        requestRender();
      };
      state.onMount(mount);
      if (state.isMounted) mount();
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
      reducedMotion.addEventListener("change", requestRender);
      cleanups.push(
        () => observer.disconnect(),
        () => reducedMotion.removeEventListener("change", requestRender),
      );
      stage._registerDisposeCleanup(() => {
        disposed = true;
        for (const cleanup of cleanups) cleanup();
        targets.clear();
      });
      // Receivers can be resized independently of the viewport.
      observe = (target) => observer.observe(target.domElement);
    }
    targets.add(element);
    observe(element);
    cleanups.push(
      removeSurface,
      element.onUpdate(requestRender),
      element.onActivate(requestRender),
      element.onDeactivate(requestRender),
    );
    requestRender();
  }) as Controller<State>;
  let observe: (element: DOMElement) => void = () => {};
  Object.defineProperty(effect, "values", {
    get: () => controller?.values ?? Object.freeze({ ...initial }),
  });
  effect.to = (props) => {
    if (!controller || !stage || disposed)
      throw new Error(`Decorate an element before animating its ${name}.`);
    if (getActiveStage() !== stage) throw new Error(`Animate ${name} on its owning stage.`);
    return controller.to(props);
  };
  return effect;
}
