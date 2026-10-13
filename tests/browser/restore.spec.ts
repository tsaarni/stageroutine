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
    await expect(cardB).toHaveCSS("opacity", "0.5");

    const initialBoxA = await cardA.boundingBox();
    const initialBoxB = await cardB.boundingBox();
    if (!initialBoxA || !initialBoxB) {
      throw new Error("Initial bounding boxes must not be null");
    }

    // Advance to Step 1
    await stage.next();

    await expect(cardA).toHaveCSS("opacity", "0.2");
    await expect(cardB).toHaveCSS("opacity", "1");

    const step1BoxA = await cardA.boundingBox();
    if (!step1BoxA) throw new Error("Step 1 box must not be null");
    expect(step1BoxA.x).not.toEqual(initialBoxA.x);

    // Return backward to Step 0
    await stage.prev();

    await expect(cardA).toHaveCSS("opacity", "1");
    await expect(cardB).toHaveCSS("opacity", "0.5");

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
});
