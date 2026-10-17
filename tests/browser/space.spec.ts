import { createPositionSampler } from "../../src/core/position-motion";
import { space } from "../../src/core/space";
import { motion } from "../../src/motion/paths";
import { expect, test } from "../helpers/stage";

test("3D projection preserves flat rectangles and rotates before projection", () => {
  expect(space.project([100, 55, 60])).toEqual([120, 65]);
  const flat = space.corners({ position: [80, 45, 0], size: [40, 20] });
  expect(flat).toEqual([
    [60, 35],
    [100, 35],
    [100, 55],
    [60, 55],
  ]);
  expect(space.bounds(flat)).toEqual({ x: 60, y: 35, width: 40, height: 20 });
  const turned = space.corners({ position: [80, 45, 0], size: [40, 20], rotation: [0, 0, 90] });
  for (let i = 0; i < 4; i++) {
    expect(turned[i][0]).toBeCloseTo([90, 90, 70, 70][i]);
    expect(turned[i][1]).toBeCloseTo([25, 65, 65, 25][i]);
  }
  const close = space.bounds(space.corners({ position: [80, 45, 60], size: [40, 20] }));
  expect(close.width).toBe(80);
  expect(close.height).toBe(40);
  expect(() => space.project([80, 45, 120])).toThrow(RangeError);
});

test("the media exchange keeps every projected corner within the stage", () => {
  const photoRoute = createPositionSampler(motion.arc(65), [118, 30], [47, 61]);
  for (let frame = 0; frame <= 120; frame++) {
    const t = frame / 120;
    const cases = [
      {
        position: [40 + 76 * t, 62.875 - 31.875 * t, 0] as const,
        size: [60, 33.75] as const,
        scale: 1 - 0.15 * t,
        rotation: [18 * t, -28 * t, 2 * t] as const,
      },
      {
        position: [...photoRoute(t), 0] as const,
        size: [64, 36] as const,
        scale: 1,
        rotation: [-16 * t, 28 * t, -2 * t] as const,
      },
    ];
    for (const plane of cases) {
      const quad = space.corners(plane, {
        position: [80, 45, 120],
      });
      for (const [x, y] of quad) {
        expect(x).toBeGreaterThanOrEqual(4);
        expect(x).toBeLessThanOrEqual(156);
        expect(y).toBeGreaterThanOrEqual(4);
        expect(y).toBeLessThanOrEqual(86);
      }
    }
  }
});

test("rendered corner projection matches the public geometry helpers", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false, perspective: 90 });
    const panel = SR.Card("Projection", {
      id: "projection-panel",
      width: 48,
      height: 24,
      position: [110, 60],
      origin: "center",
      rotationX: 18,
      rotationY: -28,
      rotation: 3,
      z: 12,
      scale: 0.85,
    });
    s.scene("Projection").with(panel);
    s.pause();
    panel.to({ rotationX: 0, rotationY: 90 }).duration(0.2);
    s.pause();
    return s;
  });
  const projected = await stage.locator("#projection-panel").evaluate((node) => {
    const unit = (window.__STAGE_INSTANCE__?.height ?? 1080) / 90;
    const matrix = new DOMMatrix(getComputedStyle(node).transform);
    return [
      [0, 0],
      [48 * unit, 0],
      [48 * unit, 24 * unit],
      [0, 24 * unit],
    ].map(([x, y]) => {
      const point = matrix.transformPoint(new DOMPoint(x, y));
      return [point.x / point.w / unit, point.y / point.w / unit];
    });
  });
  const expected = space.corners(
    { position: [110, 60, 12], size: [48, 24], rotation: [18, -28, 3], scale: 0.85 },
    { position: [80, 45, 90] },
  );
  for (let i = 0; i < 4; i++) {
    // CSSOM rounds the matrix coefficients when serializing them.
    expect(Math.abs(projected[i][0] - expected[i][0])).toBeLessThan(0.02);
    expect(Math.abs(projected[i][1] - expected[i][1])).toBeLessThan(0.02);
  }
  await stage.next();
  expect(
    await stage.locator("#projection-panel").evaluate((node) => node.style.transform),
  ).not.toMatch(/NaN|Infinity/);
});

test("the ring formation keeps cards inside the stage throughout their depth transition", () => {
  // The preceding grid measures the cards while their 2D rotation is still 4 degrees.
  const rotation = (4 * Math.PI) / 180;
  const gridWidth = 20 * Math.cos(rotation) + 15 * Math.sin(rotation);
  const gridHeight = 15 * Math.cos(rotation) + 20 * Math.sin(rotation);
  for (let i = 0; i < 6; i++) {
    const angle = ((-150 + i * 60) * Math.PI) / 180;
    const target = [
      80 + 46 * Math.cos(angle),
      52 + 46 * Math.sin(angle) * Math.cos((78 * Math.PI) / 180),
      46 * Math.sin(angle) * Math.sin((78 * Math.PI) / 180),
    ] as const;
    const route = createPositionSampler(
      motion.arc(i % 2 === 0 ? 35 : -35),
      [
        30 + gridWidth / 2 + (i % 3) * (gridWidth + 20),
        42 + gridHeight / 2 + Math.floor(i / 3) * (gridHeight + 8),
      ],
      [target[0], target[1]],
    );
    for (let frame = 0; frame <= 120; frame++) {
      const t = frame / 120;
      const [x, y] = route(t);
      const bounds = space.bounds(
        space.corners({
          position: [x, y, target[2] * t],
          size: [20, 15],
        }),
      );
      expect(bounds.x).toBeGreaterThanOrEqual(4);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(156);
      expect(bounds.y).toBeGreaterThanOrEqual(4);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(86);
    }
  }
});
