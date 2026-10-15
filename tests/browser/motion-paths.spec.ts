import { readFileSync } from "node:fs";
import { createPositionSampler } from "../../src/core/position-motion";
import type { MotionPath, Point } from "../../src/core/types";
import type * as StageRoutine from "../../src/index";
import { motionPaths } from "../../src/motion/paths";
import { expect, test } from "../helpers/stage";

test.describe("Geometry and validation", () => {
  test("Bézier and spiral paths map progress to travel distance", () => {
    const paths = [
      motionPaths.bezier({ control1: [10, 90], control2: [15, -70] }),
      motionPaths.spiral(),
      motionPaths.spiral({ turns: -2 }),
      motionPaths.spiral({ turns: 10 }),
    ];
    for (const path of paths) {
      const sample = createPositionSampler(path, [0, 0], [100, 0]);
      expect(sample(0)).toEqual([0, 0]);
      expect(sample(1)).toEqual([100, 0]);
      const distances = [];
      for (let interval = 0; interval < 20; interval++) {
        let distance = 0;
        let previous = sample(interval / 20);
        for (let part = 1; part <= 128; part++) {
          const next = sample((interval + part / 128) / 20);
          distance += Math.hypot(next[0] - previous[0], next[1] - previous[1]);
          previous = next;
        }
        distances.push(distance);
      }
      expect(Math.max(...distances) / Math.min(...distances)).toBeLessThan(1.01);
    }
  });

  test("paths copy control points, validate inputs, and handle closed curves", () => {
    const control1: [number, number] = [50, -20];
    const path = motionPaths.bezier({ control1, control2: [50, 120] });
    control1[0] = 999;
    expect(path).toMatchObject({ control1: [50, -20] });
    expect(Object.isFrozen(path)).toBe(true);
    if (path.kind === "bezier") expect(Object.isFrozen(path.control1)).toBe(true);
    expect(() => motionPaths.bezier({ control1: [NaN, 0], control2: [0, 0] })).toThrow(TypeError);
    for (const turns of [NaN, Infinity, -11, 11])
      expect(() => motionPaths.spiral({ turns })).toThrow(RangeError);
    const closed = createPositionSampler(path, [20, 50], [20, 50]);
    expect(closed(0.5)).not.toEqual([20, 50]);
    expect(closed(1)).toEqual([20, 50]);
    const stationary = createPositionSampler(motionPaths.spiral(), [20, 50], [20, 50]);
    expect(stationary(0.5)).toEqual([20, 50]);
    const straight = createPositionSampler(motionPaths.spiral({ turns: 0 }), [0, 0], [100, 0]);
    expect(straight(0.5)[0]).toBeCloseTo(50, 5);
  });

  test("arc validation rejects invalid sweeps and numeric property paths", async ({
    stage,
    page,
  }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      const card = SR.Card("A", { id: "arc" });
      let rejected = false;
      try {
        card.x = SR.to([20, 50]).arc(90) as unknown as number;
      } catch (error) {
        rejected = error instanceof TypeError;
      }
      if (!rejected) throw new Error("Numeric property accepted an arc");
      s.scene("Validation").with(card);
      s.pause();
      return s;
    });
    const results = await page.evaluate(() => {
      const SR = window.__SR__;
      return [NaN, Infinity, -181, 181].map((degrees) => {
        try {
          SR.to([20, 50]).arc(degrees);
          return false;
        } catch (error) {
          return error instanceof RangeError;
        }
      });
    });
    expect(results).toEqual([true, true, true, true]);
  });
});

test.describe("Stage movement and choreography", () => {
  test("position arcs follow a circle, land exactly, and restore snapshots", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      const card = SR.Card("Arc", { id: "arc", position: [20, 50], width: 10, height: 8 });
      const samples: unknown[] = [];
      card.onUpdate((progress) => {
        if (progress > 0 && progress < 1) samples.push(card.position);
        card.domElement.dataset.samples = JSON.stringify(samples);
        card.domElement.dataset.position = JSON.stringify(card.position);
      });
      s.scene("Arc").with(card);
      s.pause();
      card.position = SR.to([100, 50]).arc(180).duration(0.25).ease("linear");
      s.pause();
      return s;
    });
    await stage.next();
    const card = stage.locator("#arc");
    const samples = JSON.parse((await card.getAttribute("data-samples")) ?? "[]") as number[][];
    expect(samples.length).toBeGreaterThan(2);
    expect(samples.some(([, y]) => y < 20)).toBe(true);
    for (const [x, y] of samples) expect((x - 60) ** 2 + (y - 50) ** 2).toBeCloseTo(1600, 5);
    await expect(card).toHaveAttribute("data-position", "[100,50]");
    await stage.prev();
    await expect(card).toHaveAttribute("data-position", "[20,50]");
    await stage.next();
    await expect(card).toHaveAttribute("data-position", "[100,50]");
  });

  test("layout callbacks run once per position and support negative, zero, and shallow arcs", async ({
    stage,
  }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      const cards = ["negative", "straight", "shallow"].map((id) => {
        const card = SR.Card(id, { id, position: [20, 50], width: 10, height: 8 });
        const samples: unknown[] = [];
        card.onUpdate((progress) => {
          if (progress > 0 && progress < 1) samples.push(card.position);
          card.domElement.dataset.samples = JSON.stringify(samples);
        });
        return card;
      });
      s.scene("Routes").with(...cards);
      s.pause();
      let calls = 0;
      SR.layout.grid([cards], {
        x: 100,
        y: 50,
        gap: 4,
        animate: (position, _element, index) => {
          calls++;
          return SR.to(position).arc([-90, 0, 0.00000001][index]).duration(0.2).ease("linear");
        },
      });
      if (calls !== 3) throw new Error("Expected one callback per element");
      s.pause();
      return s;
    });
    await stage.next();
    const samples = async (id: string) =>
      JSON.parse(
        (await stage.locator(`#${id}`).getAttribute("data-samples")) ?? "[]",
      ) as number[][];
    const negative = await samples("negative");
    expect(negative.some(([, y]) => y > 55)).toBe(true);
    for (const id of ["straight", "shallow"]) {
      const points = await samples(id);
      expect(points.length).toBeGreaterThan(2);
      for (const [x, y] of points) {
        expect(Number.isFinite(x)).toBe(true);
        expect(y).toBeCloseTo(50, 6);
      }
    }
  });

  test("element and stagger builders preserve position paths", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      const a = SR.Card("A", { id: "a", position: [20, 50], width: 10, height: 8 });
      const b = SR.Card("B", { id: "b", position: [20, 70], width: 10, height: 8 });
      for (const card of [a, b]) {
        const samples: unknown[] = [];
        card.onUpdate((progress) => {
          if (progress > 0 && progress < 1) samples.push(card.position);
          card.domElement.dataset.samples = JSON.stringify(samples);
        });
      }
      s.scene("Builders").with(a, b);
      s.pause();
      a.to({ position: SR.to([100, 50]).arc(-90) }).duration(0.2);
      SR.stagger([b], { props: { position: SR.to([100, 70]).arc(90) }, duration: 0.2 });
      s.pause();
      return s;
    });
    await stage.next();
    const a = JSON.parse(
      (await stage.locator("#a").getAttribute("data-samples")) ?? "[]",
    ) as number[][];
    const b = JSON.parse(
      (await stage.locator("#b").getAttribute("data-samples")) ?? "[]",
    ) as number[][];
    expect(a.some(([, y]) => y > 55)).toBe(true);
    expect(b.some(([, y]) => y < 65)).toBe(true);
  });
});

test.describe("Group formations", () => {
  test("group arcs share timing and scale their formation together", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      const a = SR.Card("A", { id: "a", position: [20, 50], width: 10, height: 10 });
      const b = SR.Card("B", { id: "b", position: [40, 50], width: 10, height: 10 });
      const samples: unknown[] = [];
      a.onUpdate((progress) => {
        if (progress > 0 && progress < 1) samples.push([a.position, b.position, a.scale]);
        a.domElement.dataset.samples = JSON.stringify(samples);
      });
      s.scene("Formation").with(a, b);
      s.pause();
      let calls = 0;
      SR.layout.group([a, b], {
        position: [110, 55],
        scale: 1.5,
        animate: (position, element, index) => {
          if (element !== a || index !== 0) throw new Error("Unexpected group callback");
          calls++;
          return SR.to(position).arc(90).duration(0.25).ease("linear");
        },
      });
      if (calls !== 1) throw new Error("Group callback must run once");
      s.pause();
      return s;
    });
    await stage.next();
    const samples = JSON.parse(
      (await stage.locator("#a").getAttribute("data-samples")) ?? "[]",
    ) as [number[], number[], number][];
    expect(samples.length).toBeGreaterThan(2);
    for (const [a, b, scale] of samples) {
      expect(b[0] - a[0]).toBeCloseTo(20 * scale, 5);
      expect(b[1]).toBeCloseTo(a[1], 5);
      const center = [a[0] + 15 * scale, a[1] + 5 * scale];
      expect((center[0] - 72.5) ** 2 + (center[1] - 92.5) ** 2).toBeCloseTo(2812.5, 4);
    }
    await stage.prev();
  });

  for (const kind of ["bezier", "spiral"] as const) {
    test(`${kind} paths work for formations, exact arrivals, and snapshot restoration`, async ({
      stage,
      page,
    }) => {
      await page.evaluate((kind) => sessionStorage.setItem("motion-path-kind", kind), kind);
      await stage.mount((SR) => {
        const s = new SR.Stage({ channel: false });
        const a = SR.Card("A", { id: "a", position: [20, 50], width: 10, height: 10 });
        const b = SR.Card("B", { id: "b", position: [40, 50], width: 10, height: 10 });
        const samples: unknown[] = [];
        a.onUpdate((progress) => {
          if (progress > 0 && progress < 1) samples.push([a.position, b.position, a.scale]);
          a.domElement.dataset.samples = JSON.stringify(samples);
          a.domElement.dataset.position = JSON.stringify(a.position);
        });
        s.scene("Formation").with(a, b);
        s.pause();
        const path =
          sessionStorage.getItem("motion-path-kind") === "bezier"
            ? SR.motionPaths.bezier({ control1: [50, 5], control2: [90, 95] })
            : SR.motionPaths.spiral({ turns: 0.75 });
        SR.layout.group([a, b], {
          position: [110, 55],
          scale: 1.5,
          animate: (position) => SR.to(position).path(path).duration(0.3).ease("linear"),
        });
        s.pause();
        return s;
      });
      await stage.next();
      const samples = JSON.parse(
        (await stage.locator("#a").getAttribute("data-samples")) ?? "[]",
      ) as [number[], number[], number][];
      expect(samples.length).toBeGreaterThan(2);
      const path: MotionPath =
        kind === "bezier"
          ? motionPaths.bezier({ control1: [50, 5], control2: [90, 95] })
          : motionPaths.spiral({ turns: 0.75 });
      const sample = createPositionSampler(path, [35, 55], [110, 55]);
      for (const [a, b, scale] of samples) {
        expect(b[0] - a[0]).toBeCloseTo(20 * scale, 5);
        expect(b[1]).toBeCloseTo(a[1], 5);
        const progress = (scale - 1) / 0.5;
        const center: Point = [a[0] + 15 * scale, a[1] + 5 * scale];
        const expected = sample(progress);
        expect(center[0]).toBeCloseTo(expected[0], 5);
        expect(center[1]).toBeCloseTo(expected[1], 5);
      }
      await expect(stage.locator("#a")).toHaveAttribute("data-position", "[87.5,47.5]");
      await stage.prev();
      await expect(stage.locator("#a")).toHaveAttribute("data-position", "[20,50]");
    });
  }
});

test.describe("Replacement and interruption", () => {
  test("last overlapping scene assignment wins without a competing position transition", async ({
    stage,
  }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      const cards = ["axis", "static", "position", "repeat"].map((id) => {
        const card = SR.Card(id, { id, position: [20, 50], width: 10, height: 8 });
        card.onUpdate(() => {
          card.domElement.dataset.position = JSON.stringify(card.position);
        });
        return card;
      });
      s.scene("Overrides").with(...cards);
      s.pause();
      cards[0].position = SR.to([100, 70]).arc(90);
      cards[0].x = SR.to(120).duration(0.2);
      cards[1].position = SR.to([100, 70]).arc(90);
      cards[1].x = 120;
      cards[2].x = SR.to(120);
      cards[2].position = SR.to([100, 70]).arc(-90).duration(0.2);
      cards[3].position = SR.to([100, 70]).arc(90);
      cards[3].position = SR.to([80, 40]).arc(-90).duration(0.2);
      const samples: unknown[] = [];
      cards[0].onUpdate((progress) => {
        if (progress > 0 && progress < 1) samples.push(cards[0].position);
        cards[0].domElement.dataset.samples = JSON.stringify(samples);
      });
      s.pause();
      return s;
    });
    await stage.next();
    for (const [id, target] of [
      ["axis", "[120,50]"],
      ["static", "[120,50]"],
      ["position", "[100,70]"],
      ["repeat", "[80,40]"],
    ])
      await expect(stage.locator(`#${id}`)).toHaveAttribute("data-position", target);
    const samples = JSON.parse(
      (await stage.locator("#axis").getAttribute("data-samples")) ?? "[]",
    ) as number[][];
    expect(samples.length).toBeGreaterThan(2);
    for (const [, y] of samples) expect(y).toBe(50);
    await stage.prev();
    for (const id of ["axis", "static", "position", "repeat"])
      await expect(stage.locator(`#${id}`)).toHaveAttribute("data-position", "[20,50]");
  });

  test("live position motion supports delays, interruption, axis cancellation, and navigation", async ({
    stage,
    page,
  }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      const card = SR.Card("Arc", { id: "arc", position: [20, 50], width: 10, height: 8 });
      card.onUpdate(() => {
        card.domElement.dataset.position = JSON.stringify(card.position);
      });
      card.domElement.addEventListener("fly", () => {
        card.position = SR.to([100, 50]).arc(90).duration(0.4);
      });
      card.domElement.addEventListener("replace", () => {
        card.domElement.dataset.before = JSON.stringify(card.position);
        card.position = SR.to([80, 60]).arc(-90).delay(0.1).duration(0.15);
      });
      card.domElement.addEventListener("cancel", () => {
        card.domElement.dataset.before = JSON.stringify(card.position);
        card.x = 30;
      });
      card.domElement.addEventListener("delayed", () => {
        card.position = SR.to([100, 50]).arc(90).delay(0.15).duration(0.15);
        s._setCurrentPropertyValue(card.id, "position", [40, 60]);
      });
      s.scene("Interaction").with(card);
      s.pause();
      s.pause();
      return s;
    });
    const card = stage.locator("#arc");
    await card.dispatchEvent("fly");
    await expect.poll(() => card.getAttribute("data-position")).not.toBe("[20,50]");
    await card.dispatchEvent("replace");
    const interrupted = await card.getAttribute("data-before");
    await page.waitForTimeout(40);
    await expect(card).toHaveAttribute("data-position", interrupted ?? "");
    await stage.expectAtRest();
    await expect(card).toHaveAttribute("data-position", "[80,60]");
    await card.dispatchEvent("fly");
    await expect.poll(() => card.getAttribute("data-position")).not.toBe("[80,60]");
    await card.dispatchEvent("cancel");
    const before = JSON.parse((await card.getAttribute("data-before")) ?? "[]") as number[];
    await stage.expectAtRest();
    const after = JSON.parse((await card.getAttribute("data-position")) ?? "[]") as number[];
    expect(after).toEqual([30, before[1]]);
    await card.dispatchEvent("delayed");
    await stage.expectAtRest();
    await expect(card).toHaveAttribute("data-position", "[100,50]");
    await card.dispatchEvent("fly");
    await stage.next();
    await expect(card).toHaveAttribute("data-position", "[20,50]");
  });
});

test.describe("Website preview", () => {
  test("website preview runs all three paths for both flights and stops at rest", async ({
    stage,
    page,
  }) => {
    const doc = readFileSync(
      new URL("../../site/docs/building/animation.mdx", import.meta.url),
      "utf8",
    );
    const match = doc.match(/```typescript preview="circular-movement.html"\n([\s\S]*?)```/);
    if (!match) throw new Error("Missing circular movement preview");
    const code = match[1]
      .replace(/^import .* from "stageroutine";\n/m, "")
      .replace('stage.mount("#stage");', "return stage;");
    const setup = new Function(
      "SR",
      `const { Stage, Card, Text, layout, motionPaths, to } = SR;\n${code}`,
    ) as (sr: typeof StageRoutine) => StageRoutine.Stage;
    await stage.mount(setup);
    const a = page.getByText("A", { exact: true });
    const initial = await a.boundingBox();
    await page.getByText("Fly into grid", { exact: true }).click();
    await stage.expectAtRest();
    const grid = await a.boundingBox();
    expect(grid?.x).toBeGreaterThan(initial?.x ?? 0);
    await page.getByText("Move together", { exact: true }).click();
    await stage.expectAtRest();
    const formation = await a.boundingBox();
    expect(formation?.x).toBeGreaterThan(initial?.x ?? 0);
    expect(formation?.x).not.toEqual(grid?.x);
    for (const label of ["Bézier", "Spiral"]) {
      await page.getByText(label, { exact: true }).click();
      await expect(
        page.getByText(`${label} selected · choose a flight`, { exact: true }),
      ).toBeVisible();
      for (const flight of ["Fly into grid", "Move together"]) {
        await page.getByText(flight, { exact: true }).click();
        await stage.expectAtRest();
        const target = await a.boundingBox();
        expect(target?.x).toBeGreaterThan(initial?.x ?? 0);
      }
    }
  });
});
