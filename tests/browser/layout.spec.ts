import { expect, test } from "../helpers/stage";

test("stacks and grid center visual bounds with mixed origins and scales", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const elements = [];
    for (const method of ["hstack", "vstack", "grid"] as const) {
      const a = SR.Card("A", {
        id: `a-${method}`,
        width: 20,
        height: 10,
        origin: "center",
        scale: 1.5,
      });
      const b = SR.Card("B", { id: `b-${method}`, width: 10, height: 8, origin: "bottom-right" });
      const options = {
        region: { x: 40, y: 20, width: 80, height: 50 },
        x: "center" as const,
        y: "center" as const,
        gap: 6,
      };
      if (method === "grid") SR.layout.grid([[a, b]], options);
      else SR.layout[method]([a, b], options);
      elements.push(a, b);
    }
    s.scene("Layout").with(...elements);
    s.pause();
    return s;
  });
  for (const method of ["hstack", "vstack", "grid"]) {
    const a = await stage.locator(`#a-${method}`).boundingBox();
    const b = await stage.locator(`#b-${method}`).boundingBox();
    if (!a || !b) throw new Error("Missing bounds");
    const center = await stage.stageUnitsToClientPixels(80, 45);
    expect((Math.min(a.x, b.x) + Math.max(a.x + a.width, b.x + b.width)) / 2).toBeCloseTo(
      center.x,
      0,
    );
    expect((Math.min(a.y, b.y) + Math.max(a.y + a.height, b.y + b.height)) / 2).toBeCloseTo(
      center.y,
      0,
    );
  }
});

test("constraints match rendered wrapping and override existing sizes", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const a = SR.Text(
      "Long text that must wrap to the width selected by the layout helper. ".repeat(5),
      { id: "a", width: 80 },
    );
    const b = SR.Card("B", { id: "b", width: 50, height: 10 });
    SR.layout.vstack([a, b], { x: 10, y: 10, width: 30, gap: 3 });
    s.scene("Layout").with(a, b);
    s.pause();
    return s;
  });
  const a = await stage.locator("#a").boundingBox();
  const b = await stage.locator("#b").boundingBox();
  if (!a || !b) throw new Error("Missing bounds");
  const start = await stage.stageUnitsToClientPixels(0, 0);
  const unit = await stage.stageUnitsToClientPixels(1, 1);
  expect(a.width).toBeCloseTo(30 * (unit.x - start.x), 0);
  expect(b.width).toBeCloseTo(a.width, 0);
  expect(b.y - a.y - a.height).toBeCloseTo(3 * (unit.y - start.y), 0);
});

test("relative placement and alignment preserve origins", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const a = SR.Card("A", {
      id: "a",
      position: [80, 30],
      origin: "center",
      width: 30,
      height: 10,
    });
    const b = SR.Card("B", { id: "b", origin: "bottom-right", width: 10, height: 6 });
    const c = SR.Card("C", { id: "c", origin: "top", width: 12, height: 4 });
    SR.layout.below(b, a, { align: "center", gap: 5 });
    SR.layout.rightOf(c, a, { align: "center", gap: 5 });
    SR.layout.align([b, c], { axis: "x", align: "end" });
    s.scene("Layout").with(a, b, c);
    s.pause();
    return s;
  });
  const a = await stage.locator("#a").boundingBox();
  const b = await stage.locator("#b").boundingBox();
  const c = await stage.locator("#c").boundingBox();
  if (!a || !b || !c) throw new Error("Missing bounds");
  expect(b.x + b.width).toBeCloseTo(c.x + c.width, 0);
  expect(c.y + c.height / 2).toBeCloseTo(a.y + a.height / 2, 0);
  const from = await stage.stageUnitsToClientPixels(0, 0);
  const gap = await stage.stageUnitsToClientPixels(0, 5);
  expect(b.y - a.y - a.height).toBeCloseTo(gap.y - from.y, 0);
});

test("stack distributes items within a region", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const cards = [10, 20, 15].map((width, i) =>
      SR.Card(String(i), { id: `card-${i}`, width, height: 8 }),
    );
    SR.layout.hstack(cards, {
      region: { x: 20, y: 10, width: 100, height: 40 },
      justify: "space-between",
    });
    s.scene("Layout").with(...cards);
    s.pause();
    return s;
  });
  const boxes = await Promise.all([0, 1, 2].map((i) => stage.locator(`#card-${i}`).boundingBox()));
  const [a, b, c] = boxes;
  if (!a || !b || !c) throw new Error("Missing bounds");
  expect(b.x - a.x - a.width).toBeCloseTo(c.x - b.x - b.width, 0);
  const left = await stage.stageUnitsToClientPixels(20, 10);
  const right = await stage.stageUnitsToClientPixels(120, 10);
  expect(a.x).toBeCloseTo(left.x, 0);
  expect(c.x + c.width).toBeCloseTo(right.x, 0);
});

test("repeated group scaling preserves geometry and restores snapshots", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const a = SR.Card("A", {
      id: "a",
      position: [30, 30],
      width: 20,
      height: 10,
      origin: "center",
      scale: 0.8,
    });
    const b = SR.Card("B", { id: "b", position: [80, 30], width: 10, height: 10 });
    const link = SR.Connector(a, b, { id: "link" });
    s.scene("Layout").with(a, b, link);
    s.pause();
    SR.layout.group([a, b, link], { scale: 0.5, animate: true, duration: 0.05 });
    s.pause();
    SR.layout.group([a, b, link], { scale: 2, animate: true, duration: 0.05 });
    s.pause();
    return s;
  });
  const initial = await stage.locator("#a").boundingBox();
  if (!initial) throw new Error("Missing bounds");
  await stage.next();
  const small = await stage.locator("#a").boundingBox();
  if (!small) throw new Error("Missing bounds");
  expect(small.width).toBeCloseTo(initial.width / 2, 0);
  await stage.next();
  const restored = await stage.locator("#a").boundingBox();
  if (!restored) throw new Error("Missing bounds");
  expect(restored.x).toBeCloseTo(initial.x, 0);
  expect(restored.width).toBeCloseTo(initial.width, 0);
  await stage.prev();
  const previous = await stage.locator("#a").boundingBox();
  if (!previous) throw new Error("Missing bounds");
  expect(previous.x).toBeCloseTo(small.x, 0);
  expect(previous.width).toBeCloseTo(small.width, 0);
});

test("circle uses an origin-aware center and supplies callback indices", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const center = SR.Card("Center", {
      id: "center",
      position: [80, 45],
      origin: "center",
      width: 20,
      height: 10,
      scale: 1.5,
    });
    const a = SR.Card("A", { id: "a", origin: "bottom-right", width: 10, height: 6 });
    const b = SR.Card("B", { id: "b", origin: "top", width: 12, height: 8 });
    s.scene("Orbit").with(center, a, b);
    s.pause();
    const indices = new Set<number>();
    SR.layout.circle([a, b], {
      center,
      radius: 25,
      startAngle: 0,
      span: 180,
      animate: (coordinate, _element, index) => {
        indices.add(index);
        if (coordinate.some((value) => value < 0) || index > 1)
          throw new Error("Unexpected callback values");
        return SR.to(coordinate)
          .duration(0.05)
          .delay(index * 0.01);
      },
    });
    if (!indices.has(0) || !indices.has(1)) throw new Error("Missing callback index");
    s.pause();
    return s;
  });
  await stage.next();
  const center = await stage.locator("#center").boundingBox();
  const a = await stage.locator("#a").boundingBox();
  const b = await stage.locator("#b").boundingBox();
  if (!center || !a || !b) throw new Error("Missing bounds");
  expect((a.x + a.width / 2 + b.x + b.width / 2) / 2).toBeCloseTo(center.x + center.width / 2, 0);
  expect(a.y + a.height / 2).toBeCloseTo(center.y + center.height / 2, 0);
  expect(b.y + b.height / 2).toBeCloseTo(center.y + center.height / 2, 0);
});

test("nested stacks and grid respect row and column sizing", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const a = SR.Card("A", { id: "a", width: 40, height: 10 });
    const b = SR.Card("B", { id: "b", width: 30, height: 8 });
    const c = SR.Card("C", { id: "c", width: 10, height: 4, origin: "center" });
    const d = SR.Card("D", { id: "d", width: 12, height: 6 });
    SR.layout.hstack([[a, b], c], { width: [20, 30], x: 10, y: 10, gap: 6 });
    const e = SR.Card("E", { id: "e" });
    SR.layout.grid(
      [
        [d, null],
        [null, e],
      ],
      { x: 70, y: 10, width: [15, 25], height: [8, 12], gap: 4 },
    );
    s.scene("Layout").with(a, b, c, d, e);
    s.pause();
    return s;
  });
  const a = await stage.locator("#a").boundingBox();
  const b = await stage.locator("#b").boundingBox();
  const c = await stage.locator("#c").boundingBox();
  if (!a || !b || !c) throw new Error("Missing bounds");
  expect(a.x).toBeCloseTo(b.x, 0);
  expect(a.width).toBeCloseTo(b.width, 0);
  expect(c.width / a.width).toBeCloseTo(1.5, 1);
  const zero = await stage.stageUnitsToClientPixels(0, 0);
  const point = await stage.stageUnitsToClientPixels(6, 3);
  expect(b.y - a.y - a.height).toBeCloseTo(point.y - zero.y, 0);
  expect(c.x - a.x - a.width).toBeCloseTo(point.x - zero.x, 0);
  const d = await stage.locator("#d").boundingBox();
  const e = await stage.locator("#e").boundingBox();
  if (!d || !e) throw new Error("Missing grid bounds");
  expect(e.width / d.width).toBeCloseTo(25 / 15, 1);
  expect(e.height / d.height).toBeCloseTo(12 / 8, 1);
  const gridGap = await stage.stageUnitsToClientPixels(4, 4);
  expect(e.x - d.x - d.width).toBeCloseTo(gridGap.x - zero.x, 0);
  expect(e.y - d.y - d.height).toBeCloseTo(gridGap.y - zero.y, 0);
});

test("rotated elements align using their visual bounds", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const a = SR.Card("A", { id: "a", width: 20, height: 10, origin: "center", rotation: 90 });
    const b = SR.Card("B", { id: "b", width: 10, height: 8, origin: "bottom", rotation: 30 });
    SR.layout.hstack([a, b], { x: 20, y: 20, align: "end", gap: 5 });
    s.scene("Layout").with(a, b);
    s.pause();
    return s;
  });
  const a = await stage.locator("#a").boundingBox();
  const b = await stage.locator("#b").boundingBox();
  if (!a || !b) throw new Error("Missing bounds");
  expect(a.y + a.height).toBeCloseTo(b.y + b.height, 0);
  const zero = await stage.stageUnitsToClientPixels(0, 0);
  const gap = await stage.stageUnitsToClientPixels(5, 0);
  expect(b.x - a.x - a.width).toBeCloseTo(gap.x - zero.x, 0);
});
