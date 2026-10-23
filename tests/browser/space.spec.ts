import { space } from "../../src/dom/space";
import { expect, test } from "../helpers/stage";

test("local geometry preserves the pivot and does not depend on stage position", () => {
  const flat = space.corners({ position: [80, 45], size: [40, 20], origin: "center" });
  expect(flat).toEqual([
    [60, 35],
    [100, 35],
    [100, 55],
    [60, 55],
  ]);
  const turned = space.corners({
    position: [80, 45],
    size: [40, 20],
    origin: "center",
    transform: { rotation: 90 },
  });
  for (let i = 0; i < 4; i++) {
    expect(turned[i][0]).toBeCloseTo([90, 90, 70, 70][i]);
    expect(turned[i][1]).toBeCloseTo([25, 65, 65, 25][i]);
  }
  const plane = {
    position: [50, 45] as const,
    size: [40, 20] as const,
    origin: "center" as const,
    transform: { rotationX: 18, rotationY: -28, z: 20 },
  };
  const original = space.corners(plane);
  const moved = space.corners({ ...plane, position: [110, 30] });
  for (let i = 0; i < 4; i++) {
    expect(moved[i][0] - original[i][0]).toBeCloseTo(60);
    expect(moved[i][1] - original[i][1]).toBeCloseTo(-15);
  }
  const close = space.bounds(
    space.corners({
      position: [80, 45],
      size: [40, 20],
      origin: "center",
      transform: { z: 50, perspective: 100 },
    }),
  );
  expect(close).toEqual({ x: 40, y: 25, width: 80, height: 40 });
  const orthographic = space.bounds(
    space.corners({
      position: [80, 45],
      size: [40, 20],
      origin: "center",
      transform: { z: 50, perspective: "none" },
    }),
  );
  expect(orthographic).toEqual({ x: 60, y: 35, width: 40, height: 20 });
  expect(() => space.corners({ ...plane, transform: { z: 220 } })).toThrow(RangeError);
  expect(() => space.corners({ ...plane, transform: { perspective: 0 } })).toThrow(RangeError);
});

test("rendered local transforms match geometry across fractional dimensions and pivots", async ({
  stage,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false, width: 1080, height: 1080 });
    const panels = (
      [
        [0, 0],
        [25, 75],
        [100, 100],
      ] as const
    ).map((origin, i) =>
      SR.Element(document.createElement("div"), {
        id: `pivot-${i}`,
        position: [55, 40],
        origin,
        width: 20.125,
        height: 10.375,
        rotation: 31,
        scale: 0.83,
      }).decorate(
        SR.transform({
          rotationX: 18,
          rotationY: -28,
          rotation: 12,
          scale: 0.94,
          z: 25,
          perspective: 320,
        }),
      ),
    );
    s.scene("Pivots").with(...panels);
    s.pause();
    return s;
  });
  for (const [i, origin] of (
    [
      [0, 0],
      [25, 75],
      [100, 100],
    ] as const
  ).entries()) {
    const rendered = await stage.locator(`#pivot-${i}`).evaluate((node) => {
      const matrix = new DOMMatrix(getComputedStyle(node).transform);
      return [
        [0, 0],
        [20.125, 0],
        [20.125, 10.375],
        [0, 10.375],
      ].map(([x, y]) => {
        const point = matrix.transformPoint(new DOMPoint(x * 12, y * 12));
        return [point.x / point.w / 12, point.y / point.w / 12];
      });
    });
    const expected = space.corners({
      position: [55, 40],
      size: [20.125, 10.375],
      origin,
      rotation: 31,
      scale: 0.83,
      transform: {
        rotationX: 18,
        rotationY: -28,
        rotation: 12,
        scale: 0.94,
        z: 25,
        perspective: 320,
      },
    });
    for (let corner = 0; corner < 4; corner++) {
      expect(rendered[corner][0]).toBeCloseTo(expected[corner][0], 2);
      expect(rendered[corner][1]).toBeCloseTo(expected[corner][1], 2);
    }
  }
});

test("connectors follow projected edge anchors throughout resize, tilt, and restoration", async ({
  stage,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const card = SR.Card("Tilt", {
      id: "anchor-card",
      position: [55, 40],
      width: 30,
      height: 20,
      origin: [25, 75],
    });
    const effect = SR.transform();
    card.decorate(effect);
    const link = SR.Connector(card, [140, 50], {
      id: "projected-link",
      fromAnchor: "right",
      padding: 0,
      startHead: "none",
      endHead: "none",
    });
    let maxError = 0;
    link.onUpdate(() => {
      const path = link.domElement.querySelector("path");
      if (!path) throw new Error("Missing connector path");
      const style = getComputedStyle(card.domElement);
      const matrix = new DOMMatrix(style.transform);
      const expected = matrix.transformPoint(
        new DOMPoint(Number.parseFloat(style.width), Number.parseFloat(style.height) / 2),
      );
      const actual = path.getPointAtLength(0);
      maxError = Math.max(
        maxError,
        Math.hypot(actual.x - expected.x / expected.w, actual.y - expected.y / expected.w),
      );
      link.domElement.dataset.maxError = String(maxError);
    });
    s.scene("Anchors").with(card, link);
    s.pause();
    effect.to({ rotationX: 18, rotationY: -35, z: 20 }).duration(0.4);
    card.to({ rotation: 12, width: 42.125, height: 24.375 }).duration(0.4);
    s.pause();
    return s;
  });
  const link = stage.locator("#projected-link");
  const initial = await link.locator("path").first().getAttribute("d");
  await stage.next();
  expect(Number(await link.getAttribute("data-max-error"))).toBeLessThan(0.1);
  await stage.prev();
  expect(Number(await link.getAttribute("data-max-error"))).toBeLessThan(0.1);
  expect(await link.locator("path").first().getAttribute("d")).toBe(initial);
});

test("bubble tails map projected targets into a tilted source plane", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const target = SR.Card("Speaker", {
      id: "tail-target",
      position: [100, 65],
      origin: "center",
      width: 24,
      height: 12,
    });
    const targetEffect = SR.transform({ perspective: 320, rotationY: -20, z: 10 });
    target.decorate(targetEffect);
    const bubble = SR.Shape(
      SR.paths.speechBubble({ tail: { to: target, anchor: "top", padding: 0 } }),
      {
        id: "tilted-bubble",
        position: [45, 25],
        origin: "center",
        width: 32,
        height: 18,
      },
    );
    const bubbleEffect = SR.transform({ perspective: 320, rotationX: -5, rotationY: 8 });
    bubble.decorate(bubbleEffect);
    let maxError = 0;
    bubble.onUpdate(() => {
      const path = bubble.domElement.querySelector(".sr-shape-path-main");
      const targetStyle = getComputedStyle(target.domElement);
      const expected = new DOMMatrix(targetStyle.transform).transformPoint(
        new DOMPoint(Number.parseFloat(targetStyle.width) / 2, 0),
      );
      const matrix = new DOMMatrix(getComputedStyle(bubble.domElement).transform);
      const vertices = [
        ...(path?.getAttribute("d") ?? "").matchAll(/L\s+([-\d.e+]+)\s+([-\d.e+]+)/g),
      ];
      const error = Math.min(
        ...vertices.map((match) => {
          const point = matrix.transformPoint(new DOMPoint(Number(match[1]), Number(match[2])));
          return Math.hypot(
            point.x / point.w - expected.x / expected.w,
            point.y / point.w - expected.y / expected.w,
          );
        }),
      );
      maxError = Math.max(maxError, error);
      bubble.domElement.dataset.maxError = String(maxError);
    });
    s.scene("Tail").with(target, bubble);
    s.pause();
    target.to({ position: [110, 60] }).duration(0.4);
    targetEffect.to({ rotationY: 30, rotationX: 12, z: 25 }).duration(0.4);
    bubble.to({ rotation: 5, width: 38 }).duration(0.4);
    bubbleEffect.to({ rotationY: -12 }).duration(0.4);
    s.pause();
    return s;
  });
  const bubble = stage.locator("#tilted-bubble");
  const initial = await bubble.locator(".sr-shape-path-main").getAttribute("d");
  expect(Number(await bubble.getAttribute("data-max-error"))).toBeLessThan(0.1);
  await stage.next();
  expect(Number(await bubble.getAttribute("data-max-error"))).toBeLessThan(0.1);
  await stage.prev();
  expect(Number(await bubble.getAttribute("data-max-error"))).toBeLessThan(0.1);
  expect(await bubble.locator(".sr-shape-path-main").getAttribute("d")).toBe(initial);
});
