import { interpolateValue } from "../../src/core/interpolators";
import { expect, test } from "../helpers/stage";

test("3D tilt and depth interpolate between numeric values", () => {
  for (const property of ["rotationX", "rotationY", "z"]) {
    expect(interpolateValue(0, 20, 0.25, property)).toBe(5);
    expect(interpolateValue(0, 20, 0.5, property)).toBe(10);
    expect(interpolateValue(0, 20, 0.75, property)).toBe(15);
  }
});

test("SVG cards keep their rendering path through zero tilt while ordinary text stays 2D", async ({
  stage,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const svg =
      '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    const card = SR.Card(SR.Icon(svg, { size: 3.5 }), {
      id: "svg-card",
      position: [80, 50],
      origin: "center",
      width: 20,
      height: 15,
    });
    const plain = SR.Text("Ordinary text", { id: "plain-text", position: [10, 10] });
    const samples: { is2D: boolean; stroke: string }[] = [];
    card.onUpdate(() => {
      const path = card.domElement.querySelector(".sr-icon path");
      if (!path) throw new Error("Missing SVG icon path");
      samples.push({
        is2D: new DOMMatrix(getComputedStyle(card.domElement).transform).is2D,
        stroke: getComputedStyle(path).strokeWidth,
      });
      card.domElement.dataset.samples = JSON.stringify(samples);
    });
    s.scene("Tilt").with(card, plain);
    s.pause();
    card.to({ rotationX: 5, rotationY: 8 }).duration(0.2);
    s.pause();
    card.to({ rotationX: 0, rotationY: 0 }).duration(0.2);
    s.pause();
    return s;
  });
  const card = stage.locator("#svg-card");
  const readTransform = () => card.evaluate((node) => getComputedStyle(node).transform);
  const initial = await readTransform();
  expect(
    await stage
      .locator("#plain-text")
      .evaluate((node) => new DOMMatrix(getComputedStyle(node).transform).is2D),
  ).toBe(true);
  await stage.next();
  await stage.next();
  const samples = JSON.parse((await card.getAttribute("data-samples")) ?? "[]") as {
    is2D: boolean;
    stroke: string;
  }[];
  expect(samples.length).toBeGreaterThan(3);
  expect(samples.every(({ is2D, stroke }) => !is2D && stroke === "2px")).toBe(true);
  expect(await readTransform()).toBe(initial);
  await stage.prev();
  await stage.prev();
  expect(await readTransform()).toBe(initial);
});

test("3D tilt composes with motion and restores across steps", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false, perspective: 100 });
    const panel = SR.Card("Tilt", {
      id: "tilted-panel",
      position: [80, 45],
      origin: "center",
      width: 40,
      height: 20,
      rotationX: 4,
      rotationY: -8,
      z: 10,
    });
    panel.onUpdate((progress) => {
      if (progress > 0.1 && progress < 0.9)
        panel.domElement.dataset.midTransform = getComputedStyle(panel.domElement).transform;
    });
    s.scene("Tilt").with(panel);
    s.pause();
    panel
      .to({
        position: [90, 50],
        scale: 0.8,
        rotation: 3,
        rotationX: -12,
        rotationY: 16,
        z: 25,
      })
      .duration(0.3)
      .ease("linear");
    s.pause();
    panel.to({ rotationX: 0, rotationY: 0, z: 0 }).duration(0.3);
    s.pause();
    return s;
  });
  const panel = stage.locator("#tilted-panel");
  const initial = await panel.evaluate((node) => getComputedStyle(node).transform);
  expect(initial).toContain("matrix3d(");
  await stage.next();
  const intermediate = await panel.getAttribute("data-mid-transform");
  expect(intermediate).not.toBeNull();
  const tilted = await panel.evaluate((node) => getComputedStyle(node).transform);
  expect(tilted).toContain("matrix3d(");
  expect(intermediate).not.toBe(initial);
  expect(intermediate).not.toBe(tilted);
  expect(tilted).not.toEqual(initial);
  await stage.next();
  expect(await panel.evaluate((node) => getComputedStyle(node).transform)).toContain("matrix3d(");
  await stage.prev();
  expect(await panel.evaluate((node) => getComputedStyle(node).transform)).toBe(tilted);
  await stage.prev();
  expect(await panel.evaluate((node) => getComputedStyle(node).transform)).toBe(initial);
});

test("depth projects around a non-widescreen stage center and restores independent scale", async ({
  stage,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false, width: 1080, height: 1080, perspective: 100 });
    const panel = SR.Card("Depth", {
      id: "depth-panel",
      position: [60, 55],
      origin: "center",
      width: 20,
      height: 10,
      scale: 0.8,
    });
    s.scene("Depth").with(panel);
    s.pause();
    panel.to({ z: 50 }).duration(0.2).ease("linear");
    s.pause();
    panel.z = (z) => z - 100;
    s.pause();
    return s;
  });
  const panel = stage.locator("#depth-panel");
  const measure = () =>
    panel.evaluate((node) => {
      const unit = 12;
      const matrix = new DOMMatrix(getComputedStyle(node).transform);
      const point = matrix.transformPoint(new DOMPoint(10 * unit, 5 * unit));
      const left = matrix.transformPoint(new DOMPoint(0, 0));
      const right = matrix.transformPoint(new DOMPoint(20 * unit, 0));
      return {
        x: point.x / point.w / unit,
        y: point.y / point.w / unit,
        width: (right.x / right.w - left.x / left.w) / unit,
      };
    });
  const initial = await panel.evaluate((node) => getComputedStyle(node).transform);
  await stage.next();
  const close = await measure();
  expect(close.x).toBeCloseTo(75);
  expect(close.y).toBeCloseTo(65);
  expect(close.width).toBeCloseTo(32);
  await stage.next();
  const far = await measure();
  expect(far.x).toBeCloseTo(55);
  expect(far.y).toBeCloseTo(45 + 10 / 1.5);
  expect(far.width).toBeCloseTo(16 / 1.5);
  await stage.prev();
  expect((await measure()).width).toBeCloseTo(32);
  await stage.prev();
  expect(await panel.evaluate((node) => getComputedStyle(node).transform)).toBe(initial);
});
