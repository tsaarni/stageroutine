import { Card, Element, Stage, shine, transform } from "../../src/index";

// Compiled by `pnpm verify`; this function is never executed.
export function customElementTypes(node: HTMLElement) {
  const element = Element(node, {
    props: { progress: 0, comparison: 0 },
    onDraw(props) {
      const value: number = props.progress;
      // @ts-expect-error Drawing receives immutable values.
      props.progress = value;
    },
  });
  element.to({ progress: 1, comparison: 0.5, rotation: -20 });
  const effect = transform({ perspective: 220 });
  element.decorate(effect);
  effect.to({ rotationY: -20, perspective: 400 });
  effect.to({ perspective: "none", scale: 0.8 });
  // @ts-expect-error Tilt belongs to the transform controller.
  element.to({ rotationY: -20 });
  // @ts-expect-error A transform controller cannot animate content.
  effect.to({ progress: 1 });
  // @ts-expect-error Transform values are read-only.
  effect.values.rotationY = 10;
  // @ts-expect-error The stage has no scene-wide camera.
  new Stage({ perspective: 220 });
  element.progress = 0.5;
  // @ts-expect-error Unknown custom properties cannot be animated.
  element.to({ missing: 1 });
  // @ts-expect-error Custom targets must be numeric.
  element.to({ progress: "finished" });
  // @ts-expect-error Built-in element properties cannot be redeclared.
  Element(node, { props: { opacity: 0 }, onDraw() {} });
  // @ts-expect-error Internal names are reserved.
  Element(node, { props: { _progress: 0 }, onDraw() {} });
  // @ts-expect-error Custom properties require a drawing callback.
  Element(node, { props: { progress: 0 } });
}

export function shineTypes() {
  const light = shine({ angle: -20, width: 0.22, surface: "outline" });
  Card("One").decorate(light);
  Card("Two").decorate(light);
  light.to({ progress: 1 }).duration(1);
  // @ts-expect-error Only progress is animatable.
  light.to({ width: 0.5 });
  // @ts-expect-error Values are read-only.
  light.values.progress = 0;
  // @ts-expect-error Sweep targets are numeric.
  light.to({ progress: "done" });
}
