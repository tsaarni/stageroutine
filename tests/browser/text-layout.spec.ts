import { expect, test } from "../helpers/stage";

test("text fades preserve card layout", async ({ stage, page }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const label = SR.Kicker("AFTER ONE REHEARSAL", { id: "label" });
    const total = SR.Title("8 min 10 s", { id: "total", variant: "serif" });
    const caption = SR.Text("The demo alone took five minutes. Any questions?", {
      id: "caption",
      style: { minHeight: "2lh", width: "100%" },
    });
    const card = SR.Card([label, total, caption], { id: "card", width: 38, height: 24 });
    s.scene("Text").with(card);
    s.pause();
    label.to({ text: "STILL THREE MINUTES OVER" }).duration(1);
    caption.to({ text: "“Maybe it looks shorter from this angle.”" }).duration(1);
    s.pause();
    return s;
  });
  const measure = () =>
    page.evaluate(() =>
      Object.fromEntries(
        ["label", "total", "caption"].map((id) => {
          const node = document.getElementById(id);
          if (!node) throw new Error(`Missing element ${id}`);
          const bounds = node.getBoundingClientRect();
          return [id, { y: bounds.y, height: bounds.height, width: bounds.width }];
        }),
      ),
    );
  const before = await measure();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#label .sr-text-transition")).toBeVisible();
  const during = await measure();
  const incoming = page.locator("#caption .sr-text-transition > span").last();
  await expect
    .poll(async () => incoming.evaluate((node) => Number(node.style.opacity)))
    .toBeGreaterThan(0.96);
  const almostFinished = await measure();
  await stage.expectAtRest();
  const after = await measure();
  for (const sample of [during, almostFinished, after]) {
    for (const id of ["label", "total", "caption"]) {
      expect(sample[id].y).toBeCloseTo(before[id].y, 1);
      expect(sample[id].height).toBeCloseTo(before[id].height, 1);
    }
  }
  await stage.prev();
  expect((await measure()).total.y).toBeCloseTo(before.total.y, 1);
});
