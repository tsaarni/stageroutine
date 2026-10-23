import { expect, test } from "../helpers/stage";

test("objects keep independent perspective and appearance while moving", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const near = SR.transform({ perspective: 120, rotationY: -30 });
    const far = SR.transform({ perspective: 600, rotationY: -30 });
    const first = SR.Card("Near", {
      id: "near",
      position: [40, 45],
      origin: "center",
      width: 30,
      height: 20,
    }).decorate(near);
    const second = SR.Element(document.createElement("div"), {
      id: "far",
      position: [110, 45],
      origin: "center",
      width: 30,
      height: 20,
    }).decorate(far);
    s.scene("Independent").with(first, second);
    s.pause();
    first.to({ position: [105, 55] }).duration(0.25);
    s.pause();
    near.to({ perspective: 600, rotationX: 12 }).duration(0.25);
    s.pause();
    return s;
  });
  const sample = (selector: string) =>
    stage.locator(selector).evaluate((node) => {
      const matrix = new DOMMatrix(getComputedStyle(node).transform);
      const points = [
        [0, 0],
        [360, 0],
        [360, 240],
        [0, 240],
      ].map(([x, y]) => {
        const point = matrix.transformPoint(new DOMPoint(x, y));
        return [point.x / point.w, point.y / point.w];
      });
      return { transform: node.style.transform, points };
    });
  const initial = await sample("#near");
  const other = await sample("#far");
  expect(initial.points[1][1] - initial.points[0][1]).not.toBeCloseTo(
    other.points[1][1] - other.points[0][1],
  );
  await stage.next();
  const moved = await sample("#near");
  for (let i = 0; i < 4; i++) {
    expect(moved.points[i][0] - initial.points[i][0]).toBeCloseTo(65 * 12, 1);
    expect(moved.points[i][1] - initial.points[i][1]).toBeCloseTo(10 * 12, 1);
  }
  expect(await sample("#far")).toEqual(other);
  await stage.next();
  expect((await sample("#near")).transform).not.toBe(moved.transform);
  expect(await sample("#far")).toEqual(other);
  await stage.prev();
  expect(await sample("#near")).toEqual(moved);
  await stage.prev();
  expect(await sample("#near")).toEqual(initial);
});

test("an attached transform keeps SVG rendering stable through zero tilt", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const effect = SR.transform();
    const svg =
      '<svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z" fill="none" stroke="currentColor" stroke-width="2"/></svg>';
    const card = SR.Card(SR.Icon(svg, { size: 3.5 }), {
      id: "svg-card",
      position: [80, 50],
      origin: "center",
      width: 20,
      height: 15,
    }).decorate(effect);
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
    effect.to({ rotationX: 5, rotationY: 8 }).duration(0.2);
    s.pause();
    effect.to({ rotationX: 0, rotationY: 0 }).duration(0.2);
    s.pause();
    return s;
  });
  const card = stage.locator("#svg-card");
  const initial = await card.evaluate((node) => node.style.transform);
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
  expect(await card.evaluate((node) => node.style.transform)).toBe(initial);
  await stage.prev();
  await stage.prev();
  expect(await card.evaluate((node) => node.style.transform)).toBe(initial);
});

test("local depth preserves stage position on a square stage and supports orthographic projection", async ({
  stage,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false, width: 1080, height: 1080 });
    const effect = SR.transform({ perspective: 100 });
    const panel = SR.Card("Depth", {
      id: "depth",
      position: [60, 55],
      origin: "center",
      width: 20,
      height: 10,
      scale: 0.8,
    }).decorate(effect);
    panel.onUpdate(() => {
      panel.domElement.dataset.values = JSON.stringify(effect.values);
    });
    s.scene("Depth").with(panel);
    s.pause();
    effect.to({ z: 50 }).duration(0.2).ease("linear");
    s.pause();
    effect.to({ perspective: "none" }).duration(0.1);
    s.pause();
    return s;
  });
  const panel = stage.locator("#depth");
  const measure = () =>
    panel.evaluate((node) => {
      const matrix = new DOMMatrix(getComputedStyle(node).transform);
      const project = (x: number, y: number) => {
        const p = matrix.transformPoint(new DOMPoint(x * 12, y * 12));
        return [p.x / p.w / 12, p.y / p.w / 12];
      };
      const center = project(10, 5);
      return { center, width: project(20, 0)[0] - project(0, 0)[0] };
    });
  await stage.next();
  expect((await measure()).center).toEqual([60, 55]);
  expect((await measure()).width).toBeCloseTo(32);
  await stage.next();
  expect((await measure()).width).toBeCloseTo(16);
  await stage.prev();
  expect((await measure()).width).toBeCloseTo(32);
  expect(JSON.parse((await panel.getAttribute("data-values")) ?? "{}").perspective).toBe(100);
});

test("transform controllers support live interruption and attachment after an earlier snapshot", async ({
  stage,
  page,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const panel = SR.Card("Turn", {
      id: "live-turn",
      position: [80, 45],
      origin: "center",
      width: 30,
      height: 20,
    });
    s.scene("Start").with(panel);
    s.pause();
    const effect = SR.transform();
    panel.decorate(effect);
    panel.onUpdate(() => {
      panel.domElement.dataset.rotation = String(effect.values.rotationY);
    });
    panel.domElement.addEventListener("turn", () => {
      effect.to({ rotationY: 60 }).duration(0.8).ease("linear");
    });
    effect.to({ rotationY: -20 }).duration(0.2);
    s.pause();
    return s;
  });
  const panel = stage.locator("#live-turn");
  const initial = await panel.evaluate((node) => node.style.transform);
  await expect(panel).toHaveAttribute("data-rotation", "0");
  await panel.dispatchEvent("turn");
  await expect
    .poll(async () => Number(await panel.getAttribute("data-rotation")))
    .toBeGreaterThan(0);
  expect(Number(await panel.getAttribute("data-rotation"))).toBeLessThan(60);
  await page.keyboard.press("ArrowRight");
  await stage.expectAtRest();
  await expect(panel).toHaveAttribute("data-rotation", "-20");
  await stage.prev();
  await expect(panel).toHaveAttribute("data-rotation", "0");
  expect(await panel.evaluate((node) => node.style.transform)).toBe(initial);
});

test("transform controllers validate values and reject ambiguous attachment", async ({
  stage,
  page,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.scene("Start").with(SR.Title("Start"));
    s.pause();
    return s;
  });
  const errors = await page.evaluate(() => {
    const SR = window.__SR__;
    const errors: string[] = [];
    const attempt = (action: () => void) => {
      try {
        action();
      } catch (error) {
        errors.push(String(error));
      }
    };
    attempt(() => {
      SR.transform({ perspective: 0 });
    });
    attempt(() => {
      SR.transform({ perspective: 100, z: 100 });
    });
    attempt(() => {
      SR.transform({ rotationX: Number.NaN });
    });
    const effect = SR.transform();
    attempt(() => {
      effect.to({ rotationY: 20 });
    });
    const first = SR.Card("First").decorate(effect);
    attempt(() => {
      first.decorate(effect);
    });
    attempt(() => {
      SR.Card("Second").decorate(effect);
    });
    attempt(() => {
      effect.to({ rotationY: Number.POSITIVE_INFINITY }).apply();
    });
    return { errors, values: effect.values, frozen: Object.isFrozen(effect.values) };
  });
  expect(errors.errors).toHaveLength(7);
  expect(errors.values.rotationY).toBe(0);
  expect(errors.frozen).toBe(true);
});

test("frame transforms compose with Ken Burns content animation", async ({ stage, page }) => {
  await stage.mount(
    (SR) => {
      const s = new SR.Stage({ channel: false, defaultDuration: 0.1 });
      const effect = SR.transform({ perspective: 400 });
      const image = SR.Image(
        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450"><rect width="800" height="450" fill="navy"/></svg>',
      );
      const frame = SR.Frame(SR.paths.box({ radius: 14 }), image, {
        id: "moving-photo",
        position: [45, 45],
        origin: "center",
        width: 50,
        height: 28.125,
      })
        .decorate(SR.kenBurns({ scale: 1.3, duration: 1.2 }))
        .decorate(effect);
      frame.onUpdate(() => {
        frame.domElement.dataset.rotation = String(effect.values.rotationY);
      });
      s.scene("Photo").with(frame);
      s.pause();
      frame.to({ position: [110, 50] }).duration(0.3);
      effect.to({ rotationY: 28, rotationX: -16 }).duration(0.3);
      s.pause();
      s.scene("End").with(SR.Title("End"));
      s.pause();
      return s;
    },
    { waitForRest: false },
  );
  const frame = stage.locator("#moving-photo");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Number(await frame.getAttribute("data-rotation")))
    .toBeGreaterThan(0);
  expect(await frame.evaluate((node) => node.getAnimations().length)).toBe(0);
  expect(
    await frame
      .locator(".sr-frame-content > *")
      .evaluate((node) =>
        node.getAnimations().some((animation) => animation.playState === "running"),
      ),
  ).toBe(true);
  await stage.expectAtRest();
  await expect(frame).toHaveAttribute("data-rotation", "28");
  const turned = await frame.evaluate((node) => node.style.transform);
  await stage.prev();
  await expect(frame).toHaveAttribute("data-rotation", "0");
  expect(await frame.evaluate((node) => node.style.transform)).not.toBe(turned);
  await stage.next();
  await stage.next();
  expect(
    await frame.evaluate((node) =>
      node.getAnimations({ subtree: true }).some((animation) => animation.playState === "running"),
    ),
  ).toBe(false);
});
