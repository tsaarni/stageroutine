import { captureContrast } from "../helpers/contrast";
import { expect, type StageDriver, test } from "../helpers/stage";
import { mockTerminal } from "../helpers/terminal";

const cases = [
  "Card",
  "Shape",
  "TerminalBlock",
  "LiveTerminal",
  "BrowserWindow",
  "Table",
  "Title scrim",
  "Element scrim",
  "custom mask",
  "custom clip",
  "custom rounded",
  "custom rectangle",
  "Frame with Card",
] as const;
type SurfaceCase = (typeof cases)[number];

async function mountSurface(stage: StageDriver, kind: SurfaceCase): Promise<void> {
  await stage.page.evaluate((value) => sessionStorage.setItem("backdrop-case", value), kind);
  if (kind === "LiveTerminal") await mockTerminal(stage.page, "");
  if (kind === "BrowserWindow") {
    await stage.page.route("**/backdrop-empty", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><title>Empty test page</title>",
      }),
    );
  }
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.background(
      SR.CSSBackground("repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 8px 8px"),
    );
    const kind = sessionStorage.getItem("backdrop-case");
    const options = {
      id: "surface",
      position: [40, 25] as [number, number],
      width: 90,
      height: 55,
    };
    let surface: ReturnType<typeof SR.Element>;
    if (kind === "Card") surface = SR.Card(options);
    else if (kind === "Shape") surface = SR.Shape(SR.paths.box(), options);
    else if (kind === "TerminalBlock")
      surface = SR.TerminalBlock({ ...options, title: "", lines: [] });
    else if (kind === "LiveTerminal") surface = SR.LiveTerminal({ ...options, title: "", rows: 8 });
    else if (kind === "BrowserWindow")
      surface = SR.BrowserWindow({ ...options, title: "", url: "/backdrop-empty" });
    else if (kind === "Table") surface = SR.Table({ ...options, rows: [], interactive: false });
    else if (kind === "Title scrim" || kind === "Element scrim") {
      surface =
        kind === "Title scrim"
          ? SR.Title("", options)
          : SR.Element(document.createElement("div"), options);
      surface.decorate(SR.scrim({ blur: 16, opacity: 0.35, spread: "tight" }));
    } else if (kind === "Frame with Card") {
      surface = SR.Frame(SR.paths.box(), SR.Card({ width: 90, height: 55 }), options);
    } else {
      const node = document.createElement("div");
      const frost = document.createElement("div");
      frost.className = "sr-test-frost";
      frost.style.cssText =
        "position:absolute;inset:0;backdrop-filter:blur(16px);background:rgb(20 20 20 / 20%)";
      if (kind === "custom mask") frost.style.maskImage = "linear-gradient(#000, #000)";
      if (kind === "custom clip") frost.style.clipPath = "inset(0 round 12px)";
      if (kind === "custom rounded") frost.style.borderRadius = "12px";
      node.appendChild(frost);
      surface = SR.Element(node, options);
    }
    s.scene("Surface").with(surface);
    s.pause();
    surface.to({ opacity: 0.5 }).duration(0.1);
    s.pause();
    surface.to({ opacity: 0 }).duration(0.1);
    s.pause();
    surface.to({ opacity: 1 }).duration(0.1);
    s.pause();
    s.scene("Away").with(SR.Title("Away"));
    s.pause();
    s.scene("Return").with(surface);
    s.pause();
    return s;
  });
}

function blurLayer(stage: StageDriver, kind: SurfaceCase) {
  const root = stage.locator("#surface");
  if (kind === "Card" || kind === "Shape") return root.locator(":scope > .sr-shape-frost");
  if (kind.endsWith("scrim")) return root.locator(".sr-scrim");
  if (kind.startsWith("custom")) return root.locator(".sr-test-frost");
  if (kind === "Frame with Card") return root.locator(".sr-shape-frost");
  return root;
}

async function contrast(stage: StageDriver, kind: SurfaceCase) {
  if (["BrowserWindow", "LiveTerminal", "TerminalBlock"].includes(kind)) {
    // Sample empty header space, avoiding text, controls, and opaque page/terminal bodies.
    return captureContrast(stage.locator("#surface .sr-window-header"), {
      x: 0.5,
      y: 0.25,
      width: 0.25,
      height: 0.5,
    });
  }
  return captureContrast(stage.locator("#surface"));
}

// Calibrate each blank sample against itself with blur disabled. A shared contrast
// threshold cannot classify arbitrary text, gradients, or partial opacity reliably.
// Keep the observed DOM intact until the baseline capture; remounts can hide the bug.
async function expectActiveBlur(stage: StageDriver, kind: SurfaceCase) {
  const layer = blurLayer(stage, kind);
  expect(await layer.evaluate((el) => getComputedStyle(el).backdropFilter)).not.toBe("none");
  const blurred = await contrast(stage, kind);
  const original = await layer.evaluate((el) => {
    const value = el.style.backdropFilter;
    el.style.backdropFilter = "none";
    return value;
  });
  try {
    const sharp = await contrast(stage, kind);
    expect(sharp, `${kind}: blur must reduce contrast at this opacity`).toBeGreaterThan(
      blurred + 10,
    );
  } finally {
    await layer.evaluate((el, value) => {
      el.style.backdropFilter = value;
    }, original);
  }
}

test.describe("Card and Shape opacity", () => {
  // Full-viewport pixel sampling checks blur without changing the card's compositing.
  test("preserves Card frost blur across opacity fade", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      s.background(
        SR.CSSBackground("repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 40px 40px"),
      );

      const card = SR.Card({
        id: "frost-card",
        position: [50, 50],
        width: 30,
        height: 20,
      });

      s.scene("Card").with(card);
      s.pause();

      card.to({ opacity: 0.5 }).duration(0.1);
      s.pause();

      card.to({ opacity: 0 }).duration(0.1);
      s.pause();

      card.to({ opacity: 1 }).duration(0.1);
      s.pause();

      return s;
    });

    const card = stage.locator("#frost-card");
    await expect(card).toBeVisible();

    // 1. Initial state: high-contrast checkerboard background must be blurred into a smooth low-contrast gray
    const initialContrast = await captureContrast(card);
    expect(initialContrast, "Frost must smooth high-contrast checkerboard").toBeLessThan(8);

    const frost = card.locator(".sr-shape-frost");
    const originalFrost = await frost.elementHandle();
    await stage.next(); // opacity -> 0.5
    await expect(card).toHaveCSS("opacity", "1");
    await expect(frost).toHaveCSS("opacity", "0.5");
    const fadedContrast = await captureContrast(card);

    // Calibrate partial-opacity blur against the same layer with blur disabled.
    await frost.evaluate((el) => {
      el.style.backdropFilter = "none";
    });
    const fadedSharpContrast = await captureContrast(card);
    expect(fadedSharpContrast).toBeGreaterThan(fadedContrast * 1.2);
    await frost.evaluate((el) => {
      el.style.backdropFilter = "";
    });

    await stage.next(); // opacity -> 0
    await expect(card).toBeHidden();
    await expect(card).toHaveCSS("pointer-events", "none");
    await stage.next(); // opacity -> 1
    const postFadeContrast = await captureContrast(card);
    expect(postFadeContrast, "Blur must survive the fade").toBeLessThan(8);
    expect(await originalFrost?.evaluate((el) => el.isConnected)).toBe(true);

    await stage.prev(); // opacity -> 0
    await stage.prev(); // opacity -> 0.5
    await expect(frost).toHaveCSS("opacity", "0.5");
    await expect(card).toHaveCSS("opacity", "1");
    await stage.prev(); // opacity -> 1
    expect(await captureContrast(card)).toBeLessThan(8);
    await stage.reload();
    expect(await captureContrast(card)).toBeLessThan(8);

    // 4. Verify test sensitivity: turning off backdrop-filter must produce sharp high contrast
    await card.locator(".sr-shape-frost").evaluate((el) => {
      el.style.backdropFilter = "none";
    });
    const sharpContrast = await captureContrast(card);
    expect(
      sharpContrast,
      "Without blur, background contrast must be significantly higher",
    ).toBeGreaterThan(postFadeContrast * 1.5);
  });

  test("multiplies Shape layer opacity without changing child state", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      const label = SR.Title("Child", { id: "frost-label", opacity: 0.4 });
      const authored = document.createElement("span");
      authored.textContent = "Authored";
      authored.id = "authored-layer";
      authored.style.opacity = "0.6";
      const nested = SR.Card("Nested", { id: "nested-card", opacity: 0.5 });
      const shape = SR.Shape(
        SR.paths.box(),
        [label, authored, nested, document.createTextNode("Raw")],
        {
          id: "layered-shape",
          opacity: 0.5,
          width: 40,
          height: 25,
        },
      );
      s.scene("Layers").with(shape);
      s.pause();
      shape.to({ opacity: 1 }).duration(0.1);
      s.pause();
      return s;
    });
    const shape = stage.locator("#layered-shape");
    await expect(shape).toHaveCSS("opacity", "1");
    await expect(shape.locator(":scope > .sr-shape-frost")).toHaveCSS("opacity", "0.5");
    await expect(shape.locator(":scope > .sr-shape-stroke-svg")).toHaveCSS("opacity", "0.5");
    await expect(stage.locator("#frost-label")).toHaveCSS("opacity", "0.2");
    await expect(stage.locator("#authored-layer")).toHaveCSS("opacity", "0.3");
    await expect(stage.locator("#nested-card")).toHaveCSS("opacity", "1");
    await expect(stage.locator("#nested-card > .sr-shape-frost")).toHaveCSS("opacity", "0.25");
    await expect(shape.locator(":scope > .sr-shape-text").filter({ hasText: "Raw" })).toHaveCSS(
      "opacity",
      "0.5",
    );
    await stage.next();
    await expect(stage.locator("#nested-card > .sr-shape-frost")).toHaveCSS("opacity", "0.5");
    await expect(stage.locator("#frost-label")).toHaveCSS("opacity", "0.4");
    await expect(stage.locator("#authored-layer")).toHaveCSS("opacity", "0.6");
    await stage.prev();
    await expect(stage.locator("#frost-label")).toHaveCSS("opacity", "0.2");
    await expect(stage.locator("#authored-layer")).toHaveCSS("opacity", "0.3");
  });
});

test.describe("Backdrop discovery", () => {
  test("discovers CSS backdrop filters through nested DOM and preserves layer opacity", async ({
    stage,
  }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      s.background(
        SR.CSSBackground("repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 8px 8px"),
      );
      const style = document.createElement("style");
      style.textContent =
        ".sr-test-css-blur { position: absolute; inset: 0; backdrop-filter: blur(16px); }";
      document.head.appendChild(style);
      const root = document.createElement("div");
      const middle = document.createElement("div");
      middle.id = "blur-middle";
      middle.style.cssText = "position: absolute; inset: 0; opacity: 0.8";
      const frost = document.createElement("div");
      frost.className = "sr-test-css-blur";
      middle.append(frost);
      root.append("Label", middle);
      const element = SR.Element(root, {
        id: "css-backdrop",
        position: [40, 25],
        width: 90,
        height: 55,
      });
      s.scene("CSS backdrop").with(element);
      s.pause();
      element.to({ opacity: 0.5 }).duration(0.1);
      s.pause();
      return s;
    });
    const root = stage.locator("#css-backdrop");
    const frost = root.locator(".sr-test-css-blur");
    await stage.next();
    await expect(root).toHaveCSS("opacity", "1");
    await expect(root.locator("#blur-middle")).toHaveCSS("opacity", "1");
    await expect(root.locator(":scope > span")).toHaveCSS("opacity", "0.5");
    await expect(frost).toHaveCSS("opacity", "0.4");
    const blurred = await captureContrast(root);
    await frost.evaluate((el) => {
      el.style.backdropFilter = "none";
    });
    expect(await captureContrast(root)).toBeGreaterThan(blurred + 10);
    await frost.evaluate((el) => {
      el.style.backdropFilter = "";
    });
    await stage.prev();
    await expect(frost).toHaveCSS("opacity", "0.8");
    await expect(root.locator(":scope > span")).toHaveCSS("opacity", "1");
  });
});

test.describe("Backdrop surfaces", () => {
  for (const kind of cases.filter((kind) => kind !== "Frame with Card")) {
    test(`${kind}: backdrop blur remains active at half opacity`, async ({ stage }) => {
      await mountSurface(stage, kind);
      await stage.next();
      await expectActiveBlur(stage, kind);
    });
  }

  test("Card: backdrop survives fades, navigation, and reload", async ({ stage }) => {
    await mountSurface(stage, "Card");
    const baseline = await contrast(stage, "Card");
    await expectActiveBlur(stage, "Card");
    const originalLayer = await blurLayer(stage, "Card").elementHandle();
    await stage.next();
    await stage.next();
    await expect(stage.locator("#surface")).toBeHidden();
    await expect(stage.locator("#surface")).toHaveCSS("pointer-events", "none");
    await stage.next();
    expect(await contrast(stage, "Card")).toBeLessThan(baseline + 5);
    expect(await originalLayer?.evaluate((el) => el.isConnected)).toBe(true);
    await stage.next(); // Scene exit.
    await expect(stage.locator("#surface")).toBeHidden();
    await stage.next(); // Scene entrance.
    expect(await contrast(stage, "Card")).toBeLessThan(baseline + 5);
    await stage.prev();
    await stage.prev();
    expect(await contrast(stage, "Card")).toBeLessThan(baseline + 5);
    await stage.reload();
    expect(await contrast(stage, "Card")).toBeLessThan(baseline + 5);
    await expectActiveBlur(stage, "Card");
  });

  test("Frame preserves its content mask and restores opacity around nested Card", async ({
    stage,
  }) => {
    await mountSurface(stage, "Frame with Card");
    const content = stage.locator("#surface > .sr-frame-content");
    const mask = await content.evaluate((el) => getComputedStyle(el).maskImage);
    expect(mask).not.toBe("none");
    // A masked ancestor deliberately bounds backdrop sampling, even at opacity 1.
    const blurred = await contrast(stage, "Frame with Card");
    const frost = blurLayer(stage, "Frame with Card");
    await frost.evaluate((el) => {
      el.style.backdropFilter = "none";
    });
    expect(await contrast(stage, "Frame with Card")).toBeCloseTo(blurred, 0);
    await frost.evaluate((el) => {
      el.style.backdropFilter = "";
    });
    await stage.next();
    await expect(stage.locator("#surface")).toHaveCSS("opacity", "1");
    await expect(frost).toHaveCSS("opacity", "0.5");
    await stage.prev();
    await expect(frost).toHaveCSS("opacity", "1");
    expect(await content.evaluate((el) => getComputedStyle(el).maskImage)).toBe(mask);
  });

  test("navigation overlay retains blur after repeated visibility fades", async ({
    stage,
    page,
  }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      s.background(
        SR.CSSBackground("repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 8px 8px"),
      );
      s.scene("Overlay").with(SR.Title("Overlay", { position: [10, 10] }));
      s.pause();
      s.overlay(SR.NavigationOverlay());
      return s;
    });
    const overlay = page.locator(".sr-nav-overlay");
    const viewport = page.viewportSize();
    if (!viewport) throw new Error("Viewport is required");
    const region = { x: 0.1, y: 0.04, width: 0.8, height: 0.02 };
    await page.mouse.move(1, viewport.height - 2);
    await expect(overlay).toHaveCSS("opacity", "1");
    const baseline = await captureContrast(overlay, region);
    await page.mouse.move(1, 1);
    await expect(overlay).toHaveCSS("opacity", "0");
    await expect(overlay).toHaveCSS("pointer-events", "none");
    await page.mouse.move(1, viewport.height - 2);
    await expect(overlay).toHaveCSS("opacity", "1");
    const blurred = await captureContrast(overlay, region);
    expect(blurred).toBeLessThan(baseline + 5);
    await overlay.evaluate((el) => {
      el.style.backdropFilter = "none";
    });
    expect(await captureContrast(overlay, region)).toBeGreaterThan(blurred + 10);
    await stage.expectAtRest();
  });

  for (const variant of ["solid", "ghost"] as const) {
    test(`Shape ${variant} fades the whole container including pseudo-elements`, async ({
      stage,
    }) => {
      await stage.page.evaluate((value) => sessionStorage.setItem("shape-variant", value), variant);
      await stage.mount((SR) => {
        const s = new SR.Stage({ channel: false });
        const style = document.createElement("style");
        style.textContent =
          '#plain-shape::before { content: ""; position: absolute; inset: 10px; border-radius: 50%; background: white; }';
        document.head.appendChild(style);
        const shape = SR.Shape(SR.paths.box(), "Content", {
          id: "plain-shape",
          width: 50,
          height: 30,
          variant: sessionStorage.getItem("shape-variant") as "solid" | "ghost",
        });
        s.scene("Variant").with(shape);
        s.pause();
        shape.to({ opacity: 0.5 }).duration(0.1);
        s.pause();
        return s;
      });
      const root = stage.locator("#plain-shape");
      await stage.next();
      // Ancestor opacity fades the pseudo-element together with fill, text, and stroke.
      await expect(root).toHaveCSS("opacity", "0.5");
      await expect(root.locator(".sr-shape-text")).toHaveCSS("opacity", "1");
      await expect(root.locator(".sr-shape-stroke-svg")).toHaveCSS("opacity", "1");
      await stage.prev();
      await expect(root).toHaveCSS("opacity", "1");
      await expect(root.locator(".sr-shape-text")).toHaveCSS("opacity", "1");
      await expect(root.locator(".sr-shape-stroke-svg")).toHaveCSS("opacity", "1");
    });
  }
});
