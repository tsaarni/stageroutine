import { expect, test } from "../helpers/stage";

test.describe("Stage Diagnostics & Lifecycle", () => {
  test("tracks scene elements and dormancy through getMetrics", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });

      const cardA = SR.Card("A", { id: "card-a" });
      const cardB = SR.Card("B", { id: "card-b" });
      const cardC = SR.Card("C", { id: "card-c" });

      // Scene 1: only cardA and cardB are active
      s.scene("Scene 1").with(cardA, cardB);
      s.pause();

      // Scene 2: cardC enters, cardB exits
      s.scene("Scene 2").with(cardA, cardC);
      s.pause();

      return s;
    });

    // Step 0 (Scene 1):
    // 3 total elements registered, 2 active in scene, 1 dormant (cardC)
    expect(await stage.getMetric("dom_total_registered")).toBe(3);
    expect(await stage.getMetric("dom_active_in_scene")).toBe(2);
    expect(await stage.getMetric("dom_dormant_elements")).toBe(1);
    expect(await stage.getMetric("dom_detached_elements")).toBe(0);

    // Card C is dormant in Scene 1 (hidden)
    const cardC = stage.locator("#card-c");
    await expect(cardC).toBeHidden();

    // Advance to Scene 2
    await stage.next();

    // In Scene 2: cardA and cardC are active, cardB is dormant
    expect(await stage.getMetric("dom_active_in_scene")).toBe(2);
    expect(await stage.getMetric("dom_dormant_elements")).toBe(1);
    expect(await stage.getMetric("dom_detached_elements")).toBe(0);

    await expect(cardC).toBeVisible();
    await expect(stage.locator("#card-b")).toBeHidden();
  });

  test("outline matches declared presentation structure", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });

      const title = SR.Title("Intro Title");
      s.scene("Overview").with(title);
      s.pause();

      const card = SR.Card("Details");
      s.scene("Details").with(title, card);
      s.pause();

      return s;
    });

    const outline = await stage.getOutline();
    expect(outline).toHaveLength(2);
    expect(outline[0].name).toBe("Overview");
    expect(outline[0].steps).toHaveLength(1);
    expect(outline[0].steps[0].elements).toBe(1);

    expect(outline[1].name).toBe("Details");
    expect(outline[1].steps).toHaveLength(1);
    expect(outline[1].steps[0].elements).toBe(2);
  });

  test("perf probe samples frame cadence without dropped frames at rest", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      s.scene("Rest").with(SR.Card("Static Card"));
      s.pause();
      return s;
    });

    // Sample cadence for 300ms
    const stats = await stage.samplePerf(300);
    expect(stats.frames).toBeGreaterThan(5);
    expect(stats.hz).toBeGreaterThan(20);
    expect(stats.dropped).toBe(0);
  });
});
