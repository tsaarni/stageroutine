import { expectCanvasPainted } from "../helpers/canvas";
import { expect, test } from "../helpers/stage";
import { dragTerminalCells, mockTerminal, selectedTerminalText } from "../helpers/terminal";

test("LiveTerminal releases focus on header, title, and background clicks", async ({
  stage,
  page,
}) => {
  const terminal = await mockTerminal(page);
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.scene("Terminal").with(
      SR.Title("Live demo", { id: "title", position: ["center", 14] }),
      SR.LiveTerminal({ id: "term", position: ["center", 34], width: 124, rows: 13 }),
    );
    s.pause();
    s.scene("Next").with(SR.Title("Next scene", { id: "next" }));
    s.pause();
    s.overlay(SR.NavigationOverlay()).overlay(SR.LaserPointer());
    return s;
  });

  const input = stage.locator("#term textarea");

  // 1. Focus terminal, click window title header -> releases focus
  await stage.locator("#term .xterm-screen").click();
  await expect(input).toBeFocused();
  await stage.locator("#term .sr-window-title").click();
  await expect(input).not.toBeFocused();

  // 2. Focus terminal, click scene title -> releases focus
  await stage.locator("#term .xterm-screen").click();
  await expect(input).toBeFocused();
  await stage.locator("#title").click();
  await expect(input).not.toBeFocused();

  // 3. Focus terminal, arrow key sends to terminal instead of advancing scene
  await stage.locator("#term .xterm-screen").click();
  await expect(input).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => terminal.input.join("")).toContain("\x1b[C");
  await expect(stage.locator("#next")).not.toBeVisible();

  // 4. Click background -> releases focus
  await stage.clickAtStageUnits(5, 5);
  await expect(input).not.toBeFocused();

  // 5. Arrow key now advances scene
  await stage.next();
  await expect(stage.locator("#next")).toBeVisible();
});

test("LiveTerminal releases focus with laser pointer enabled", async ({ stage, page }) => {
  const terminal = await mockTerminal(page);
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.scene("Terminal").with(
      SR.Title("Live demo", { id: "title", position: ["center", 14] }),
      SR.LiveTerminal({ id: "term", position: ["center", 34], width: 124, rows: 13 }),
    );
    s.pause();
    s.scene("Next").with(SR.Title("Next scene", { id: "next" }));
    s.pause();
    s.overlay(SR.NavigationOverlay()).overlay(SR.LaserPointer());
    return s;
  });

  await page.keyboard.press("p");
  await expect(page.locator(".sr-pointer-mode")).toHaveCount(1);
  await stage.locator("#term .xterm-screen").click();
  const input = stage.locator("#term textarea");
  await expect(input).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => terminal.input.join("")).toContain("\x1b[C");
  await expect(stage.locator("#next")).not.toBeVisible();

  await stage.clickAtStageUnits(5, 5);
  await expect(input).not.toBeFocused();

  await stage.next();
  await expect(stage.locator("#next")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".sr-pointer-mode")).toHaveCount(0);
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Test requires a viewport");
  await page.mouse.move(1, viewport.height - 2);
  await expect(stage.locator(".sr-nav-overlay")).toBeVisible();
});

test("annotation clicks leave ink instead of focusing the terminal", async ({ stage, page }) => {
  await mockTerminal(page);
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.scene("Terminal").with(
      SR.LiveTerminal({ id: "term", position: [20, 30], width: 120, rows: 13 }),
    );
    s.pause();
    s.overlay(SR.LaserPointer()).overlay(SR.Annotation());
    return s;
  });

  await page.keyboard.press("p");
  expect(await stage.getMetric("overlay_laser_active")).toBe(1);
  expect(await stage.getMetric("overlay_annotation_active")).toBe(1);
  await expect(stage.locator(".sr-annotation-canvas")).toHaveCSS("pointer-events", "auto");
  await stage.clickAtStageUnits(40, 40);
  expect(await stage.getMetric("overlay_annotation_strokes_count")).toBe(1);
  await expectCanvasPainted(stage.locator(".sr-annotation-canvas"));
  await expect(stage.locator("#term textarea")).not.toBeFocused();
});

test("terminal text selection works after turning the pointer off", async ({ stage, page }) => {
  const text = "Select this text";
  const server = await mockTerminal(page, text);
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.scene("Terminal").with(
      SR.LiveTerminal({ id: "term", position: [20, 30], width: 120, rows: 13 }),
    );
    s.pause();
    s.overlay(SR.LaserPointer()).overlay(SR.Annotation());
    return s;
  });
  const terminal = stage.locator("#term");
  await expect(terminal.locator(".xterm-rows")).toContainText(text);
  const grid = server.opened[0];
  if (!grid) throw new Error("Terminal session did not open");

  await page.keyboard.press("p");
  expect(await stage.getMetric("overlay_annotation_active")).toBe(1);
  await dragTerminalCells(page, terminal, grid, 0, 0, text.length);
  expect(await selectedTerminalText(terminal)).toBe("");
  expect(await stage.getMetric("overlay_annotation_strokes_count")).toBe(1);
  await expectCanvasPainted(stage.locator(".sr-annotation-canvas"));

  await page.keyboard.press("Escape");
  expect(await stage.getMetric("overlay_annotation_active")).toBe(0);
  await dragTerminalCells(page, terminal, grid, 0, 0, text.length);
  await expect.poll(() => selectedTerminalText(terminal)).toBe(text);
  expect(await stage.getMetric("overlay_annotation_strokes_count")).toBe(1);
});

test("annotation outside clicks release an already focused terminal", async ({ stage, page }) => {
  const terminal = await mockTerminal(page);
  await stage.mount(
    (SR) => {
      const s = new SR.Stage({ channel: false });
      s.scene("Terminal").with(
        SR.LiveTerminal({ id: "term", position: [20, 30], width: 120, rows: 13, autoFocus: true }),
      );
      s.pause();
      s.scene("Next").with(SR.Title("Next", { id: "next" }));
      s.pause();
      s.overlay(SR.NavigationOverlay())
        .overlay(SR.LaserPointer({ active: true }))
        .overlay(SR.Annotation());
      return s;
    },
    { waitForRest: false },
  ); // The focused terminal cursor blinks.

  const input = stage.locator("#term textarea");
  await expect(input).toBeFocused();
  await page.keyboard.press("x");
  await expect.poll(() => terminal.input.join("")).toBe("x");
  expect(await stage.getMetric("overlay_laser_active")).toBe(1);
  expect(await stage.getMetric("overlay_annotation_active")).toBe(1);
  await stage.clickAtStageUnits(5, 5);
  expect(await stage.getMetric("overlay_annotation_strokes_count")).toBe(1);
  await expectCanvasPainted(stage.locator(".sr-annotation-canvas"));

  await expect(input).not.toBeFocused();
  await stage.next();
  await expect(stage.locator("#next")).toBeVisible();
  await page.keyboard.press("Escape");
  expect(await stage.getMetric("overlay_laser_active")).toBe(0);
  expect(await stage.getMetric("overlay_annotation_active")).toBe(0);
  await expect(stage.locator(".sr-annotation-canvas")).toHaveCSS("pointer-events", "none");
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("Test requires a viewport");
  await page.mouse.move(1, viewport.height - 2);
  await expect(stage.locator(".sr-nav-overlay")).toBeVisible();
});
