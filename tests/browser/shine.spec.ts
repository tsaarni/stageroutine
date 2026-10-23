import { expect, test } from "../helpers/stage";

test("one decorator shares a reflection and restores its own state", async ({ stage, page }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const light = SR.shine();
    const first = SR.Shape(SR.paths.diamond(), {
      id: "first",
      size: 16,
      variant: "ghost",
      position: [30, 40],
    }).decorate(light);
    const second = SR.Shape(SR.paths.star(), {
      id: "second",
      size: 16,
      variant: "ghost",
      position: [100, 40],
    }).decorate(light);
    first.onUpdate(() => {
      first.domElement.dataset.progress = String(light.values.progress);
    });
    s.scene("Shine").with(first, second);
    s.pause();
    light.to({ progress: 1 }).duration(0.8).ease("linear");
    s.pause();
    s.scene("End").with(SR.Title("End"));
    s.pause();
    return s;
  });
  const layers = page.locator("[data-sr-shine]");
  await expect(layers).toHaveCount(2);
  await expect(layers.first()).toHaveAttribute("opacity", "0");
  await page.keyboard.press("ArrowRight");
  await expect(layers.first()).toHaveAttribute("opacity", "1");
  await expect(layers.last()).toHaveAttribute("opacity", "1");
  const fields = await layers.evaluateAll((nodes) =>
    nodes.map((node) => {
      const canvas = node.ownerSVGElement;
      const gradient = canvas?.querySelector("linearGradient");
      const reference = canvas?.querySelector("mask use");
      const href = reference?.getAttribute("href");
      if (!gradient || !href || !document.querySelector(href))
        throw new Error("Missing original outline reference");
      return ["x1", "x2", "y1", "y2"].map((key) => gradient.getAttribute(key));
    }),
  );
  expect(fields[0]).toEqual(fields[1]);
  await stage.prev();
  await expect(page.locator("#first")).toHaveAttribute("data-progress", "0");
  await expect(layers.first()).toHaveAttribute("opacity", "0");
  await stage.next();
  await expect(layers.first()).toHaveAttribute("opacity", "0");
  await expect(page.locator("#first")).toHaveAttribute("data-progress", "1");
  await stage.next();
  await stage.prev();
  await expect(page.locator("#first")).toHaveAttribute("data-progress", "1");
});

test("separate lights are independent and late attachments retain snapshot defaults", async ({
  stage,
  page,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false, defaultDuration: 0.05 });
    const first = SR.Shape(SR.paths.diamond(), { id: "first", variant: "ghost", size: 16 });
    const second = SR.Shape(SR.paths.star(), { id: "second", variant: "ghost", size: 16, x: 40 });
    const independent = SR.shine({ progress: 0.5, color: "#fbbf24", highlight: "#fff4ce" });
    second.decorate(independent);
    s.scene("Surfaces").with(first, second);
    s.pause();
    const light = SR.shine();
    first.decorate(light);
    light.to({ progress: 1 }).duration(0.2);
    s.pause();
    return s;
  });
  await expect(page.locator("#first [data-sr-shine]")).toHaveAttribute("opacity", "0");
  await expect(page.locator("#second [data-sr-shine]")).toHaveAttribute("opacity", "1");
  await stage.next();
  await expect(page.locator("#second [data-sr-shine]")).toHaveAttribute("opacity", "1");
  await stage.prev();
  await expect(page.locator("#first [data-sr-shine]")).toHaveAttribute("opacity", "0");
  const color = await page.locator("#second defs").evaluate((node) => ({
    color: node.style.getPropertyValue("--sr-shine-color"),
    highlight: node.style.getPropertyValue("--sr-shine-highlight"),
  }));
  expect(color).toEqual({ color: "#fbbf24", highlight: "#fff4ce" });
});

test("card fill uses its geometry beneath content and follows stage theme and resizing", async ({
  stage,
  page,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.theme({ secondary: "#123456" });
    const light = SR.shine({ progress: 0.5 });
    const card = SR.Card([SR.Text("Readable", { id: "caption" })], {
      id: "card",
      width: 30,
      height: 15,
      theme: { secondary: "#ff0000" },
    }).decorate(light);
    s.scene("Card").with(card);
    s.pause();
    card.to({ width: 50, height: 20, position: [40, 30], rotation: 20 }).duration(0.4);
    s.pause();
    return s;
  });
  const card = page.locator("#card");
  await expect(card.locator("[data-sr-shine]")).toHaveAttribute("data-sr-shine", "fill");
  const inspect = () =>
    card.evaluate((node) => {
      const outline = node.querySelector(".sr-shape-path-main");
      const mask = node.querySelector("mask path");
      const gradient = node.querySelector("linearGradient");
      const defs = node.querySelector("defs");
      const canvas = node.querySelector("svg");
      const caption = node.querySelector("#caption");
      if (!outline || !mask || !gradient || !defs || !canvas || !caption)
        throw new Error("Missing card surface");
      return {
        original: outline.getAttribute("d"),
        mask: mask.getAttribute("d"),
        matrix: gradient.getAttribute("gradientTransform"),
        color: defs.style.getPropertyValue("--sr-shine-color"),
        captionZ: Number(getComputedStyle(caption).zIndex),
        surfaceZ: Number(getComputedStyle(canvas).zIndex),
        captionAfterSurface: !!(
          canvas.compareDocumentPosition(caption) & Node.DOCUMENT_POSITION_FOLLOWING
        ),
      };
    });
  const before = await inspect();
  expect(before.mask).toBe(before.original);
  expect(before.color).toBe("#123456");
  expect(before.captionZ).toBeGreaterThanOrEqual(before.surfaceZ);
  expect(before.captionAfterSurface).toBe(true);
  await stage.next();
  const after = await inspect();
  expect(after.mask).toBe(after.original);
  expect(after.mask).not.toBe(before.mask);
  expect(after.matrix).not.toBe(before.matrix);
  await page.evaluate(() => window.__STAGE_INSTANCE__?.theme({ secondary: "#abcdef" }));
  await expect.poll(async () => (await inspect()).color).toBe("#abcdef");
  await stage.prev();
  await expect.poll(async () => (await inspect()).color).toBe("#123456");
});

test("hidden receivers do not enlarge the shared field and reduced motion hides it", async ({
  stage,
  page,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const light = SR.shine({ progress: 0.5, angle: 0 });
    const first = SR.Shape(SR.paths.diamond(), { id: "first", size: 16 }).decorate(light);
    const hidden = SR.Shape(SR.paths.star(), {
      id: "hidden",
      position: [140, 40],
      opacity: 0,
      size: 16,
    }).decorate(light);
    s.scene("Visible").with(first, hidden);
    s.pause();
    hidden.to({ opacity: 1 }).duration(0.1);
    s.pause();
    return s;
  });
  const gradient = page.locator("#first linearGradient");
  const initialX = Number(await gradient.getAttribute("x1"));
  await expect(page.locator("#hidden [data-sr-shine]")).toHaveAttribute("opacity", "0");
  await stage.next();
  expect(Number(await gradient.getAttribute("x1"))).toBeGreaterThan(initialX + 100);
  await stage.prev();
  await expect.poll(async () => Number(await gradient.getAttribute("x1"))).toBeCloseTo(initialX, 1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("#first [data-sr-shine]")).toHaveAttribute("opacity", "0");
});

test("shine validates surfaces and ownership and cleans up before or after mount", async ({
  stage,
  page,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.scene("Start").with(SR.Title("Start"));
    s.pause();
    return s;
  });
  const result = await page.evaluate(() => {
    const SR = window.__SR__;
    const errors: string[] = [];
    const attempt = (action: () => void) => {
      try {
        action();
      } catch (error) {
        errors.push(String(error));
      }
    };
    for (const options of [
      { width: 0 },
      { angle: Infinity },
      { intensity: -1 },
      { progress: 2 },
      { color: "invalid-color" },
    ])
      attempt(() => {
        SR.shine(options);
      });
    const light = SR.shine();
    attempt(() => light.to({ progress: 1 }));
    attempt(() => SR.Title("Unsupported").decorate(light));
    const card = SR.Card("Receiver").decorate(light);
    const wrapper = document.createElement("div");
    wrapper.appendChild(card.domElement.cloneNode(true));
    attempt(() => SR.Element(wrapper).decorate(SR.shine()));
    attempt(() => card.decorate(light));
    const other = new SR.Stage({ channel: false });
    attempt(() => SR.Card("Another stage").decorate(light));
    const fresh = SR.shine({ progress: 0.5 });
    const unmounted = SR.Card("Never mounted").decorate(fresh);
    const before = unmounted.domElement.querySelectorAll("[data-sr-shine]").length;
    other.dispose();
    const after = unmounted.domElement.querySelectorAll("[data-sr-shine]").length;
    return { errors, before, after, frozen: Object.isFrozen(light.values) };
  });
  expect(result.errors).toHaveLength(10);
  expect(result.before).toBe(1);
  expect(result.after).toBe(0);
  expect(result.frozen).toBe(true);
  await page.evaluate(() => window.__STAGE_INSTANCE__?.dispose());
  await expect(page.locator("[data-sr-shine]")).toHaveCount(0);
});

test("shared light remains live when its first receiver leaves the scene", async ({
  stage,
  page,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false, defaultDuration: 0.05 });
    const light = SR.shine({ progress: 0.5 });
    const first = SR.Card("First", { id: "first", width: 25, height: 12 }).decorate(light);
    const second = SR.Card("Second", { id: "second", width: 25, height: 12 }).decorate(light);
    second.onClick(() => light.to({ progress: 1 }).duration(0.2));
    s.scene("First").with(first);
    s.pause();
    s.scene("Second").with(second);
    s.pause();
    return s;
  });
  await expect(page.locator("#first [data-sr-shine]")).toHaveAttribute("opacity", "1");
  await stage.next();
  await expect(page.locator("#first")).toBeHidden();
  await expect(page.locator("#second [data-sr-shine]")).toHaveAttribute("opacity", "1");
  await page.locator("#second").dispatchEvent("click");
  await stage.expectAtRest();
  await expect(page.locator("#second [data-sr-shine]")).toHaveAttribute("opacity", "0");
  await stage.prev();
  await expect(page.locator("#first [data-sr-shine]")).toHaveAttribute("opacity", "1");
});
