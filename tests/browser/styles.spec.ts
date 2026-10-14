import { expect, test } from "../helpers/stage";

test("stage scale and local themes resolve at their own boundary", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({
      channel: false,
      scale: 2,
      theme: { text: "#000000", background: "#ffffff" },
    });
    const local = SR.Card(SR.Text("Local", { id: "local-text" }), {
      id: "local-card",
      position: [20, 30],
      theme: { text: "#ff0000", primary: "#008000", surfaceBorderWidth: "3px" },
    });
    s.scene("Theme").with(
      SR.Text("Stage", { id: "stage-text", position: [20, 10] }),
      local,
      SR.Title("Explicit", {
        id: "explicit",
        position: [20, 60],
        theme: { fontSizeTitle: "30px" },
      }),
    );
    s.pause();
    return s;
  });
  await expect(stage.locator("#stage-text")).toHaveCSS("font-size", "49.6px");
  await expect(stage.locator("#stage-text")).toHaveCSS("color", "color(srgb 0 0 0 / 0.72)");
  await expect(stage.locator("#local-text")).toHaveCSS("color", "color(srgb 1 0 0 / 0.72)");
  await expect(stage.locator("#local-card")).toHaveCSS("padding-left", "40px");
  await expect(stage.locator("#explicit")).toHaveCSS("font-size", "30px");
  const localTokens = await stage.locator("#local-card").evaluate((el) => {
    const css = getComputedStyle(el);
    return {
      accent: css.getPropertyValue("--sr-accent").trim(),
      border: css.getPropertyValue("--sr-surface-border").trim(),
    };
  });
  expect(localTokens.accent).toBe("#008000");
  expect(localTokens.border).toContain("3px solid");
});

test("backward navigation removes later theme overrides", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const title = SR.Title("Theme", { id: "title", position: [20, 20] });
    s.scene("Default").with(title);
    s.pause();
    s.theme({
      text: "#000000",
      background: "#ffffff",
      surface: "pink",
      fontSizeTitle: "80px",
      textMuted: "red",
    });
    s.scene("Custom").with(title);
    s.pause();
    return s;
  });
  const read = () =>
    stage.locator("#stage").evaluate((el) => {
      const css = getComputedStyle(el);
      return ["--sr-surface", "--sr-font-size-title", "--sr-text-muted"].map((key) =>
        css.getPropertyValue(key),
      );
    });
  const initial = await read();
  await stage.next();
  await expect(stage.locator("#title")).toHaveCSS("font-size", "80px");
  expect(await read()).not.toEqual(initial);
  await stage.prev();
  expect(await read()).toEqual(initial);
  await expect(stage.locator("#title")).toHaveCSS("font-size", "52px");
});

test("framework selectors leave host content alone", async ({ stage, page }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.scene("Stage").with(SR.Text("Inside"));
    s.pause();
    return s;
  });
  const result = await page.evaluate(() => {
    const outside = document.createElement("div");
    outside.dataset.align = "bottom-right";
    outside.style.display = "flex";
    // biome-ignore lint/plugin: test an unrelated host node outside the stage
    document.body.appendChild(outside);
    const css = getComputedStyle(outside);
    const result = { align: css.alignItems, select: css.userSelect };
    outside.remove();
    return result;
  });
  expect(result.align).toBe("normal");
  expect(result.select).toBe("auto");
});

test("shared surface and frame geometry remain overridable", async ({ stage, page }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const media = document.createElement("div");
    media.textContent = "Clipped";
    s.scene("Frame").with(
      SR.Frame(SR.paths.box(), media, {
        id: "frame",
        position: [10, 10],
        width: 40,
        height: 20,
        borderColor: "red",
      }),
      SR.Table({ id: "table", position: [80, 10], headers: ["Name"], rows: [["Value"]] }),
    );
    s.pause();
    return s;
  });
  const geometry = await stage.locator("#frame").evaluate((el) => {
    const frame = el.getBoundingClientRect();
    const content = el.querySelector(".sr-frame-content")?.getBoundingClientRect();
    const stroke = el.querySelector("svg")?.getBoundingClientRect();
    return {
      frame: [frame.width, frame.height],
      content: [content?.width, content?.height],
      stroke: [stroke?.width, stroke?.height],
    };
  });
  expect(geometry.content).toEqual(geometry.frame);
  expect(geometry.stroke).toEqual(geometry.frame);
  await expect(stage.locator("#table")).toHaveCSS("border-radius", "8px");
  await page.addStyleTag({
    content:
      ".sr-frame-content { overflow: visible; } .sr-table-container { border-radius: 20px; }",
  });
  await expect(stage.locator(".sr-frame-content")).toHaveCSS("overflow", "visible");
  await expect(stage.locator("#table")).toHaveCSS("border-radius", "20px");
});

test("decorative CSS loops run only during transitions", async ({ stage, page }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const title = SR.Title("Glow", { id: "glow", position: [20, 20] })
      .decorate(SR.glow())
      .decorate(SR.gradient());
    s.scene("Start").with(title);
    s.pause();
    title.to({ x: 40 }).duration(0.6);
    s.pause();
    return s;
  });
  await expect(stage.locator("#glow")).toHaveCSS("animation-play-state", "paused");
  await page.keyboard.press("ArrowRight");
  await expect(stage.locator("#glow")).toHaveCSS("animation-play-state", "running");
  await stage.expectAtRest();
  await expect(stage.locator("#glow")).toHaveCSS("animation-play-state", "paused");
  await stage.prev();
  await expect(stage.locator("#glow")).toHaveCSS("animation-play-state", "paused");
  await expect(page.locator("#sr-decorators-style")).toHaveCount(0);
});

test("reduced motion disables decorative CSS effects", async ({ stage, page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.scene("Reduced").with(
      SR.Title("Static", { id: "static" }).decorate(SR.glow()).decorate(SR.gradient()),
    );
    s.pause();
    return s;
  });
  await expect(stage.locator("#static")).toHaveCSS("animation-name", "none");
  await expect(stage.locator("#static .sr-gradient-text")).toHaveCSS("animation-name", "none");
});

test("offscreen layout measures the configured theme and scale", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false, scale: 2, theme: { fontSans: "monospace" } });
    const first = SR.Title("First", { id: "first" });
    const second = SR.Title("Second", { id: "second" });
    SR.layout.vstack([first, second], { x: 20, y: 10, gap: 0 });
    s.scene("Layout").with(first, second);
    s.pause();
    return s;
  });
  const first = await stage.locator("#first").boundingBox();
  const second = await stage.locator("#second").boundingBox();
  if (!first || !second) throw new Error("Missing layout elements");
  expect(second.y - first.y).toBeCloseTo(first.height, 0);
  await expect(stage.locator(".sr-measurement")).toHaveCount(0);
});

test("background fills stage, remains full-bleed when decorated, and honors reduced motion", async ({
  stage,
  page,
}) => {
  await stage.mount(
    (SR) => {
      const s = new SR.Stage({ channel: false });
      s.background(SR.AsciiFluid().decorate(SR.vignette()));
      s.scene("Scene").with(SR.Title("A"));
      s.pause();
      return s;
    },
    { waitForRest: false },
  );

  const bg = stage.locator(".sr-background");
  await expect(bg).toBeVisible();
  await expect(bg).toHaveCSS("position", "absolute");

  const canvas = stage.locator(".sr-background canvas");
  await expect(canvas).toBeVisible();

  const bgBox = await bg.boundingBox();
  const canvasBox = await canvas.boundingBox();
  expect(bgBox?.width).toBeGreaterThan(500);
  expect(bgBox?.height).toBeGreaterThan(300);
  expect(canvasBox?.width).toBeGreaterThan(500);
  expect(canvasBox?.height).toBeGreaterThan(300);

  expect(await stage.getMetric("background_running")).toBe(1);

  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(() => stage.getMetric("background_running")).toBe(0);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect.poll(() => stage.getMetric("background_running")).toBe(1);
});

test("navigation controls retain a visible keyboard focus ring", async ({ stage, page }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.scene("Navigation").with(SR.Title("A"));
    s.pause();
    s.overlay(SR.NavigationOverlay());
    return s;
  });
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Missing viewport");
  await page.mouse.move(viewport.width / 2, viewport.height - 2);
  await expect(stage.locator(".sr-nav-overlay")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(stage.locator(".sr-nav-btn:focus-visible")).toHaveCSS("outline-style", "solid");
  await expect(stage.locator(".sr-nav-btn:focus-visible")).toHaveCSS("outline-width", "2px");
});

test("layout vstack prevents vertical overlap between stacked elements", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const a = SR.Title("A", { id: "a", kicker: "Kicker" });
    const b = SR.Text("B", { id: "b" });
    SR.layout.vstack([a, b], { x: 10, y: 10, width: 60 });
    s.scene("Scene").with(a, b);
    s.pause();
    return s;
  });

  const aBox = await stage.locator("#a").boundingBox();
  const bBox = await stage.locator("#b").boundingBox();
  const kickerBox = await stage.locator("#a .sr-kicker").boundingBox();

  expect(aBox).not.toBeNull();
  expect(bBox).not.toBeNull();
  expect(kickerBox).not.toBeNull();

  expect(kickerBox?.y).toBeLessThanOrEqual(aBox?.y ?? 0);
  expect(bBox?.y).toBeGreaterThanOrEqual((aBox?.y ?? 0) + (aBox?.height ?? 0) - 1);
});
