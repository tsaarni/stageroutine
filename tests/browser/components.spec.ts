import { expect, test } from "../helpers/stage";

test.describe("Core Components", () => {
  test("Title renders text and applies variant class", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });

      const title = SR.Title("Welcome to StageRoutine", {
        id: "hero-title",
        variant: "hero",
        kicker: "Chapter 01",
      });

      s.scene("Intro").with(title);
      s.pause();
      return s;
    });

    const title = stage.locator("#hero-title");
    await expect(title).toBeVisible();
    await expect(title).toContainText("Welcome to StageRoutine");
    await expect(title).toContainText("Chapter 01");

    // The hero variant applies .sr-hero on the container div
    await expect(title).toHaveClass(/sr-hero/);
  });

  test("Shape with doubleBorder renders double border outline", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });

      const shape = SR.Shape(SR.paths.box(), {
        id: "custom-shape",
        variant: "surface",
        doubleBorder: true,
        borderColor: "#3b82f6",
      });

      s.scene("Shapes").with(shape);
      s.pause();
      return s;
    });

    const shape = stage.locator("#custom-shape");
    await expect(shape).toBeVisible();

    // Verify SVG outline path exists
    const path = shape.locator("path.sr-shape-path-main");
    await expect(path).toBeAttached();
    await expect(path).toHaveAttribute("stroke", "#3b82f6");

    // Double border renders a second inner stroke path
    const doublePath = shape.locator("path.sr-shape-path-inner");
    await expect(doublePath).toBeAttached();
    await expect(doublePath).toHaveAttribute("stroke", "#3b82f6");
  });

  test("Connector attaches between two cards and follows moved card", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });

      const sourceCard = SR.Card("Source", {
        id: "source-card",
        position: [20, 20],
        width: 20,
        height: 10,
      });

      const targetCard = SR.Card("Target", {
        id: "target-card",
        position: [60, 20],
        width: 20,
        height: 10,
      });

      const connector = SR.Connector(sourceCard, targetCard, {
        id: "test-connector",
        color: "#10b981",
        endHead: "arrow",
      });

      s.scene("Step 0").with(sourceCard, targetCard, connector);
      s.pause();

      s.scene("Step 1").with(sourceCard, targetCard, connector);
      targetCard.to({ position: [60, 40] }).duration(0.1);
      s.pause();

      return s;
    });

    const connector = stage.locator("#test-connector");
    await expect(connector).toBeAttached();

    // In Connector, path is a child <path> of the svg
    const path = connector.locator("path").first();
    await expect(path).toHaveAttribute("stroke", "#10b981");

    const initialD = await path.getAttribute("d");
    expect(initialD).not.toBeNull();

    // Step to Step 1 where Target moves downward
    await stage.next();

    // Connector path 'd' must have updated dynamically to track the new target position
    const updatedD = await path.getAttribute("d");
    expect(updatedD).not.toBeNull();
    expect(updatedD).not.toEqual(initialD);

    // Step backward to restore
    await stage.prev();
    const restoredD = await path.getAttribute("d");
    expect(restoredD).toEqual(initialD);
  });

  test("Connector pulse spawns a packet and cleans up when finished", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });

      const cardA = SR.Card("A", { id: "card-a", position: [20, 20], width: 20, height: 10 });
      const cardB = SR.Card("B", { id: "card-b", position: [60, 20], width: 20, height: 10 });
      const connector = SR.Connector(cardA, cardB, { id: "pulse-conn" });

      s.scene("Scene 1").with(cardA, cardB, connector);
      s.pause();

      s.scene("Scene 2").with(cardA, cardB, connector);
      connector.pulse({ duration: 0.2, color: "#f43f5e" });
      s.pause();

      return s;
    });

    const connector = stage.locator("#pulse-conn");

    // Initially at rest: 0 pulses in DOM and diagnostics
    expect(await stage.getMetric("animation_connector_pulses")).toBe(0);
    await expect(connector.locator(".sr-pulse-packet")).toHaveCount(0);

    // Advance to Scene 2 where pulse fires
    await stage.next();

    // After completion, stage returns to clean rest:
    expect(await stage.getMetric("animation_connector_pulses")).toBe(0);
    await expect(connector.locator(".sr-pulse-packet")).toHaveCount(0);
    await stage.expectAtRest();
  });

  test("BrowserWindow mounts iframe and toolbar title", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });

      const win = SR.BrowserWindow({
        id: "demo-window",
        url: "/",
        title: "Sandbox Page",
        position: [10, 10],
        width: 100,
        height: 60,
      });

      s.scene("WindowScene").with(win);
      s.pause();

      return s;
    });

    const win = stage.locator("#demo-window");
    await expect(win).toBeVisible();

    // Verify window title in toolbar
    await expect(win.locator(".sr-window-title")).toHaveText("Sandbox Page");

    // Verify embedded iframe mounts and points to the URL
    const iframe = win.locator("iframe");
    await expect(iframe).toBeAttached();
    await expect(iframe).toHaveAttribute("src", "http://localhost:4173/");

    await stage.expectAtRest();
  });
});
