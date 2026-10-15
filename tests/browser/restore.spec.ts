import { expect, test } from "../helpers/stage";

test.describe("Stage Navigation & Restoration", () => {
  test("restores positions and opacities when navigating backward", async ({ stage }) => {
    // 1. Instantiate stage, elements, and steps right here in the test case:
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });

      const cardA = SR.Card("Card A", {
        id: "card-a",
        position: [100, 100],
        opacity: 1,
      });

      const cardB = SR.Card("Card B", {
        id: "card-b",
        position: [400, 100],
        opacity: 0.5,
      });

      // Step 0
      s.scene("Step 0").with(cardA, cardB);
      s.pause();

      // Step 1
      s.scene("Step 1").with(cardA, cardB);
      cardA.to({ position: [200, 200], opacity: 0.2 }).duration(0.1);
      cardB.to({ position: [600, 200], opacity: 1 }).duration(0.1);
      s.pause();

      return s;
    });

    const cardA = stage.locator("#card-a");
    const cardB = stage.locator("#card-b");

    // Check initial state
    await expect(cardA).toHaveCSS("opacity", "1");
    await expect(cardB.locator(".sr-shape-frost")).toHaveCSS("opacity", "0.5");

    const initialBoxA = await cardA.boundingBox();
    const initialBoxB = await cardB.boundingBox();
    if (!initialBoxA || !initialBoxB) {
      throw new Error("Initial bounding boxes must not be null");
    }

    // Advance to Step 1
    await stage.next();

    await expect(cardA.locator(".sr-shape-frost")).toHaveCSS("opacity", "0.2");
    await expect(cardB).toHaveCSS("opacity", "1");

    const step1BoxA = await cardA.boundingBox();
    if (!step1BoxA) throw new Error("Step 1 box must not be null");
    expect(step1BoxA.x).not.toEqual(initialBoxA.x);

    // Return backward to Step 0
    await stage.prev();

    await expect(cardA).toHaveCSS("opacity", "1");
    await expect(cardB.locator(".sr-shape-frost")).toHaveCSS("opacity", "0.5");

    const restoredBoxA = await cardA.boundingBox();
    const restoredBoxB = await cardB.boundingBox();
    if (!restoredBoxA || !restoredBoxB) {
      throw new Error("Restored boxes must not be null");
    }

    expect(restoredBoxA.x).toBeCloseTo(initialBoxA.x, 1);
    expect(restoredBoxA.y).toBeCloseTo(initialBoxA.y, 1);
    expect(restoredBoxB.x).toBeCloseTo(initialBoxB.x, 1);
    expect(restoredBoxB.y).toBeCloseTo(initialBoxB.y, 1);
  });

  test("elements declared in later scene remain hidden when mounting at earlier scene", async ({
    stage,
    page,
  }) => {
    await page.evaluate(() => {
      window.location.hash = "#scene-0/1";
    });

    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });

      const cardA = SR.Card("A", { id: "card-a", position: [100, 100] });

      // Scene 0: only cardA, cardA changes position in step 1
      s.scene("scene-0").with(cardA);
      s.pause();

      cardA.y = SR.to(200);
      s.pause();

      // Scene 1: cardB observes cardA
      const cardB = SR.Card("B", { id: "card-b", opacity: 0 });
      cardA.onUpdate(() => {
        cardB.height = 50;
      });

      s.scene("scene-1").with(cardA, cardB);
      cardB.to({ opacity: 1 }).duration(0.2).after(cardA);
      s.pause();

      return s;
    });

    const cardB = stage.locator("#card-b");
    await expect(cardB).toHaveCSS("display", "none");
  });
});
