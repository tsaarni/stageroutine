import { expect, test } from "../helpers/stage";

test("text crossfades preserve components and restore clean snapshots", async ({ stage, page }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const title = SR.Title("Before", { id: "heading" });
    const card = SR.Card("Plan", { id: "card" });
    s.scene("Text").with(title, card);
    s.pause();
    title.to({ text: "After", x: 30 }).duration(0.8).ease("linear");
    card.to({ text: "Reality" }).duration(0.8).ease("linear");
    s.pause();
    return s;
  });
  const heading = page.locator("#heading");
  await page.keyboard.press("ArrowRight");
  await expect(heading.locator(".sr-text-transition")).toBeVisible();
  await expect(heading).toHaveText("BeforeAfter");
  const opacity = await heading
    .locator(".sr-text-transition > span")
    .last()
    .evaluate((node) => Number(getComputedStyle(node).opacity));
  expect(opacity).toBeGreaterThan(0);
  expect(opacity).toBeLessThan(1);
  await expect(page.locator("#card .sr-text-transition")).toBeVisible();
  await stage.prev();
  await expect(heading).toHaveText("Before");
  await expect(page.locator(".sr-text-transition")).toHaveCount(0);
  await stage.next();
  await expect(heading).toHaveText("After");
  await expect(page.locator("#card")).toHaveText("Reality");
  await expect(page.locator(".sr-text-transition")).toHaveCount(0);
});

test("direct assignments cancel live text transitions", async ({ stage, page }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const title = SR.Title("Before", { id: "heading" });
    title.domElement.addEventListener("click", () => title.to({ text: "After" }).duration(0.8));
    title.domElement.addEventListener("dblclick", () => {
      title.text = "Immediate";
    });
    s.scene("Text").with(title);
    s.pause();
    return s;
  });
  const heading = page.locator("#heading");
  await heading.dispatchEvent("click");
  await expect(heading.locator(".sr-text-transition")).toBeVisible();
  await heading.dispatchEvent("dblclick");
  await stage.expectAtRest();
  await expect(heading).toHaveText("Immediate");
  await expect(page.locator(".sr-text-transition")).toHaveCount(0);
});
