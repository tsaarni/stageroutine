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
      secondary: css.getPropertyValue("--sr-secondary").trim(),
      border: css.getPropertyValue("--sr-surface-border").trim(),
    };
  });
  expect(localTokens.secondary).toBe("#818cf8");
  expect(localTokens.border).toContain("3px solid");
});

test("backward navigation removes later theme overrides", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const title = SR.Title("Theme", { id: "title", position: [20, 20] }).decorate(
      SR.glow({ pulse: false }),
    );
    const target = SR.Card("Target", { id: "target", position: [70, 60] });
    const connector = SR.Connector(title, target, { id: "theme-connector" });
    s.scene("Default").with(title, target, connector);
    s.pause();
    s.theme({
      text: "#000000",
      background: "#ffffff",
      surface: "pink",
      fontSizeTitle: "80px",
      textMuted: "red",
      primary: "#008000",
      secondary: "#ff00ff",
    });
    s.scene("Custom").with(title, target, connector);
    s.pause();
    return s;
  });
  const read = () =>
    stage.locator("#stage").evaluate((el) => {
      const css = getComputedStyle(el);
      return [
        "--sr-surface",
        "--sr-font-size-title",
        "--sr-text-muted",
        "--sr-primary",
        "--sr-secondary",
      ].map((key) => css.getPropertyValue(key));
    });
  const initial = await read();
  const stroke = stage.locator("#theme-connector path").first();
  await expect(stroke).toHaveCSS("stroke", "rgb(56, 189, 248)");
  await stage.next();
  await expect(stroke).toHaveCSS("stroke", "rgb(0, 128, 0)");
  await expect(stage.locator("#title")).toHaveCSS("font-size", "80px");
  expect(await read()).not.toEqual(initial);
  await stage.prev();
  expect(await read()).toEqual(initial);
  await expect(stroke).toHaveCSS("stroke", "rgb(56, 189, 248)");
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

test("decorative CSS loops run continuously while active and pause on scene exit", async ({
  stage,
  page,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const title = SR.Title("Glow", { id: "glow", position: [20, 20] })
      .decorate(SR.glow())
      .decorate(SR.gradient());
    s.scene("Start").with(title);
    s.pause();
    s.scene("Exit").with();
    s.pause();
    return s;
  });
  await expect(stage.locator("#glow")).toHaveCSS("animation-play-state", "running");
  await expect(stage.locator("#glow .sr-gradient-text")).toHaveCSS(
    "animation-play-state",
    "running",
  );
  await stage.expectAtRest();
  await stage.next();
  await expect(stage.locator("#glow")).toHaveCSS("display", "none");
  await stage.expectAtRest();
  await stage.prev();
  await expect(stage.locator("#glow")).toHaveCSS("animation-play-state", "running");
  await expect(stage.locator("#glow .sr-gradient-text")).toHaveCSS(
    "animation-play-state",
    "running",
  );
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

test("secondary themes update surfaces and effects independently", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({
      channel: false,
      theme: { ...SR.themes.defaultLight, textMuted: "red" },
    });
    const local = SR.Card(SR.Kicker("Label", { id: "secondary-kicker" }), {
      id: "secondary-card",
      theme: { secondary: "#ff00ff", surface: "pink", surfaceShadow: "none" },
    });
    s.scene("Palette").with(
      local,
      SR.Title("Effects", { id: "theme-effects", theme: { secondary: "#008000" } })
        .decorate(SR.gradient({ flow: false }))
        .decorate(SR.glow({ pulse: false })),
      SR.Title("Custom", { id: "custom-gradient" }).decorate(
        SR.gradient({ colors: ["red", "blue"], flow: false }),
      ),
    );
    s.pause();
    return s;
  });
  await expect(stage.locator("#secondary-kicker")).toHaveCSS("color", "rgb(2, 132, 199)");
  const palette = await stage.locator("#secondary-card").evaluate((el) => {
    const css = getComputedStyle(el);
    return {
      primary: css.getPropertyValue("--sr-primary").trim(),
      secondary: css.getPropertyValue("--sr-secondary").trim(),
      surface: css.getPropertyValue("--sr-surface").trim(),
      shadow: css.getPropertyValue("--sr-surface-shadow").trim(),
      muted: css.getPropertyValue("--sr-text-muted").trim(),
    };
  });
  expect(palette).toEqual({
    primary: "#0284c7",
    secondary: "#ff00ff",
    surface: "pink",
    shadow: "none",
    muted: "red",
  });
  const filter = await stage
    .locator("#theme-effects")
    .evaluate((el) => getComputedStyle(el).filter);
  expect(filter).toContain("0 0.501961 0");
  const gradient = await stage
    .locator("#theme-effects .sr-gradient-text")
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(gradient).toContain("rgb(0, 128, 0)");
  const custom = await stage
    .locator("#custom-gradient .sr-gradient-text")
    .evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(custom).toContain("rgb(255, 0, 0)");
  expect(custom).toContain("rgb(0, 0, 255)");
  await stage.expectAtRest();
});

test("card strings and embedded Text preserve body typography", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const standalone = SR.Text("Body", { id: "standalone-body", position: [20, 10] });
    const plain = SR.Card("Body", { id: "plain-body-card", position: [20, 30] });
    const embedded = SR.Card(SR.Text("Body", { id: "embedded-body" }), {
      id: "embedded-body-card",
      position: [60, 30],
    });
    const local = SR.Card(SR.Text("Local", { id: "local-body" }), {
      id: "local-body-card",
      position: [60, 60],
      theme: { fontSizeBody: "28px" },
    });
    s.scene("Default sizes").with(standalone, plain, embedded, local);
    s.pause();
    s.theme({ fontSizeBody: "32px", fontSizeCode: "18px" });
    s.scene("Custom sizes").with(standalone, plain, embedded, local);
    s.pause();
    return s;
  });

  const readTypography = async (selector: string) =>
    stage.locator(selector).evaluate((el) => {
      const css = getComputedStyle(el);
      return {
        size: Number.parseFloat(css.fontSize),
        lineHeight: Number.parseFloat(css.lineHeight),
        weight: css.fontWeight,
        color: css.color,
      };
    });

  const standalone = await readTypography("#standalone-body");
  const plain = await readTypography("#plain-body-card .sr-shape-text");
  const embedded = await readTypography("#embedded-body");
  expect(standalone.size).toBeCloseTo(24.8);
  expect(plain).toEqual(standalone);
  expect(embedded.size).toBe(standalone.size);
  expect(standalone.lineHeight).toBeCloseTo(24.8 * 1.65);
  expect(plain.lineHeight).toBeCloseTo(24.8 * 1.65);
  expect(embedded).toEqual(standalone);
  expect(plain.weight).toBe("400");
  expect(embedded.weight).toBe("400");
  expect(embedded.color).toBe(standalone.color);
  expect(plain.color).toBe(embedded.color);
  await expect(stage.locator("#local-body")).toHaveCSS("font-size", "28px");

  await stage.next();
  await expect(stage.locator("#standalone-body")).toHaveCSS("font-size", "32px");
  await expect(stage.locator("#embedded-body")).toHaveCSS("font-size", "32px");
  await expect(stage.locator("#plain-body-card .sr-shape-text")).toHaveCSS("font-size", "32px");
  await expect(stage.locator("#local-body")).toHaveCSS("font-size", "28px");

  await stage.prev();
  expect(await readTypography("#standalone-body")).toEqual(standalone);
  expect(await readTypography("#plain-body-card .sr-shape-text")).toEqual(plain);
  expect(await readTypography("#embedded-body")).toEqual(embedded);
  await stage.expectAtRest();
});

test("text roles survive composition, scaling, and theme restoration", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false, scale: 2 });
    const title = SR.Title("Heading", { id: "role-title", variant: "serif", kicker: "Label" });
    const table = SR.Table({
      id: "role-table",
      headers: ["Column"],
      rows: [["Body"], [SR.Text("Body", { id: "role-cell" })]],
    });
    const list = SR.BulletList(["Body", ["Nested"]], { id: "role-list" });
    const explicit = SR.Text("Explicit", {
      id: "role-explicit",
      style: { fontSize: "22px", lineHeight: "2", fontWeight: "600" },
    });
    const card = SR.Card([title, table, list, explicit], { id: "role-card" });
    const strings = SR.Card(["First", "Second"], { id: "role-strings" });
    const changed = SR.Shape(SR.paths.box(), { text: "Initial", id: "role-changed" });
    s.scene("Defaults").with(card, strings, changed);
    s.pause();
    changed.text = "Later";
    s.theme({ fontSizeBody: "30px", fontSizeLead: "40px", fontSizeKicker: "12px" });
    s.scene("Custom").with(card, strings, changed);
    s.pause();
    return s;
  });

  const body = [
    "#role-table td",
    "#role-cell",
    "#role-list .sr-bullet-item",
    "#role-strings .sr-shape-text",
    "#role-changed .sr-shape-text",
  ];
  const checkBody = async (size: string) => {
    await expect(stage.locator("#role-explicit")).toHaveCSS("font-size", "22px");
    await expect(stage.locator("#role-explicit")).toHaveCSS("line-height", "44px");
    await expect(stage.locator("#role-explicit")).toHaveCSS("font-weight", "600");
    for (const selector of body) {
      for (const el of await stage.locator(selector).all()) {
        await expect(el).toHaveCSS("font-size", size);
        await expect(el).toHaveCSS("font-weight", "400");
        await expect(el).toHaveCSS("font-style", "normal");
        const ratio = await el.evaluate((node) => {
          const css = getComputedStyle(node);
          return Number.parseFloat(css.lineHeight) / Number.parseFloat(css.fontSize);
        });
        expect(ratio).toBeCloseTo(1.65);
      }
    }
  };
  await checkBody("49.6px");
  await expect(stage.locator("#role-title")).toHaveCSS("line-height", "84px");
  await expect(stage.locator("#role-title .sr-kicker")).toHaveCSS("font-style", "normal");
  await expect(stage.locator("#role-title .sr-kicker")).toHaveCSS("line-height", "40px");
  await expect(stage.locator("#role-table table")).toHaveCSS("text-align", "left");
  await stage.next();
  await checkBody("30px");
  await expect(stage.locator("#role-title")).toHaveCSS("line-height", "50px");
  await expect(stage.locator("#role-changed .sr-shape-text")).toHaveText("Later");
  await stage.prev();
  await checkBody("49.6px");
  await expect(stage.locator("#role-changed .sr-shape-text")).toHaveText("Initial");
  await stage.expectAtRest();
});

test("code, terminal transcripts, and chrome keep their typography inside cards", async ({
  stage,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const code = SR.CodeBlock("const count = 1;", { id: "type-code", interactive: false });
    const terminal = SR.TerminalBlock({ lines: ["echo hello"], id: "type-terminal" });
    const live = SR.LiveTerminal({
      id: "type-live",
      transcript: ["echo hello"],
      interactive: false,
    });
    const card = SR.Card([code, terminal, live]);
    s.scene("Default").with(card);
    s.pause();
    s.theme({ fontSizeCode: "24px", fontSizeKicker: "14px" });
    s.scene("Theme").with(card);
    s.pause();
    return s;
  });
  const check = async (size: string, lineHeight: string, label: string) => {
    for (const selector of [
      "#type-code",
      "#type-code code",
      "#type-terminal .sr-terminal-body",
      "#type-live .sr-terminal-body",
    ]) {
      await expect(stage.locator(selector)).toHaveCSS("font-size", size);
      await expect(stage.locator(selector)).toHaveCSS("line-height", lineHeight);
      await expect(stage.locator(selector)).toHaveCSS("font-weight", "400");
      await expect(stage.locator(selector)).toHaveCSS("text-align", "left");
    }
    await expect(stage.locator("#type-terminal .sr-window-title")).toHaveCSS("font-size", label);
  };
  await check("20px", "30px", "16px");
  await stage.next();
  await check("24px", "36px", "14px");
  await stage.prev();
  await check("20px", "30px", "16px");
  await stage.expectAtRest();
});

test("live terminal refreshes its renderer when theme sizes change", async ({ stage, page }) => {
  await page.route("**/__typography_terminal/token", (route) =>
    route.fulfill({ body: "test-token" }),
  );
  await page.routeWebSocket("**/__typography_terminal", (socket) => {
    socket.onMessage((raw) => {
      const message = JSON.parse(String(raw));
      if (message.type === "open") {
        socket.send(
          JSON.stringify({ ...message, type: "ready", running: true, replay: "Hello\r\n" }),
        );
      }
    });
  });
  await page.evaluate(() => {
    Object.assign(globalThis, { __STAGEROUTINE_TERMINAL__: "/__typography_terminal" });
  });
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const terminal = SR.LiveTerminal({
      id: "renderer-terminal",
      width: 80,
      height: 40,
      interactive: false,
    });
    s.scene("Default").with(terminal);
    s.pause();
    s.theme({ fontSizeCode: "28px" });
    s.scene("Large").with(terminal);
    s.pause();
    return s;
  });
  const measure = stage.locator("#renderer-terminal .xterm-char-measure-element").first();
  await expect(measure).toHaveCSS("font-size", "20px");
  await stage.next();
  await expect(measure).toHaveCSS("font-size", "28px");
  await stage.prev();
  await expect(measure).toHaveCSS("font-size", "20px");
  await stage.expectAtRest();
});

test("connector label bounds follow theme typography", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const from = SR.Card("From", { position: [20, 30] });
    const to = SR.Card("To", { position: [80, 30] });
    const connector = SR.Connector(from, to, { id: "type-connector", label: "Message" });
    s.scene("Default").with(from, to, connector);
    s.pause();
    s.theme({ fontSizeKicker: "30px" });
    s.scene("Large").with(from, to, connector);
    s.pause();
    return s;
  });
  const label = stage.locator("#type-connector .sr-connector-label-group text");
  const check = async (size: string) => {
    await expect(label).toHaveCSS("font-size", size);
    const bounds = await label.evaluate((node) => {
      const text = (node as unknown as SVGGraphicsElement).getBBox();
      const background = (node.previousElementSibling as SVGGraphicsElement).getBBox();
      return {
        textWidth: text.width,
        textHeight: text.height,
        width: background.width,
        height: background.height,
      };
    });
    expect(bounds.width).toBeGreaterThan(bounds.textWidth);
    expect(bounds.height).toBeGreaterThan(bounds.textHeight);
  };
  await check("16px");
  await stage.next();
  await check("30px");
  await stage.prev();
  await check("16px");
  await stage.expectAtRest();
});
