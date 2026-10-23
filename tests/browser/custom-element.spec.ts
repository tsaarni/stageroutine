import { expect, test } from "../helpers/stage";

test("custom properties interpolate together and restore on the draw callback", async ({
  stage,
  page,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const element = SR.Element(document.createElement("div"), {
      id: "custom-drawing",
      props: { amount: 0, offset: 10 },
      onDraw({ amount, offset }, node) {
        node.textContent = `${amount.toFixed(2)} / ${offset.toFixed(2)}`;
        node.dataset.amount = String(amount);
        node.dataset.offset = String(offset);
      },
    });
    s.scene("Drawing").with(element);
    s.pause();
    element.to({ amount: 100, offset: 30 }).duration(0.8).ease("linear");
    s.pause();
    s.scene("End").with(SR.Title("End"));
    s.pause();
    return s;
  });
  const drawing = page.locator("#custom-drawing");
  await expect(drawing).toHaveText("0.00 / 10.00");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Number(await drawing.getAttribute("data-amount")))
    .toBeGreaterThan(0);
  const sample = await drawing.evaluate((node) => ({
    amount: Number(node.dataset.amount),
    offset: Number(node.dataset.offset),
  }));
  expect(sample.amount).toBeLessThan(100);
  expect(sample.offset).toBeCloseTo(10 + sample.amount / 5, 5);
  await stage.expectAtRest();
  await expect(drawing).toHaveText("100.00 / 30.00");
  await stage.prev();
  await expect(drawing).toHaveText("0.00 / 10.00");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () => Number(await drawing.getAttribute("data-amount")))
    .toBeGreaterThan(0);
  await page.keyboard.press("ArrowRight");
  await stage.expectAtRest();
  await stage.prev();
  await expect(drawing).toHaveText("100.00 / 30.00");
});

test("custom property names and initial values are validated", async ({ stage, page }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.scene("Start").with(SR.Title("Start"));
    s.pause();
    return s;
  });
  const errors = await page.evaluate(() => {
    return [{ opacity: 0 }, { _private: 0 }, { amount: Number.NaN }].map((props) => {
      try {
        window.__SR__.Element(document.createElement("div"), { props, onDraw() {} });
        return null;
      } catch (error) {
        return String(error);
      }
    });
  });
  expect(errors[0]).toContain("conflicts");
  expect(errors[1]).toContain("conflicts");
  expect(errors[2]).toContain("finite");
});

test("custom drawing receives immutable, complete frames and rejects invalid targets", async ({
  stage,
  page,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const node = document.createElement("div");
    let incoherent = false;
    const element = SR.Element(node, {
      id: "complete-frames",
      props: { amount: 0, values: 10 },
      onDraw(props, node) {
        incoherent ||=
          !Object.isFrozen(props) || Math.abs(props.values - (10 + props.amount / 5)) > 1e-8;
        node.dataset.incoherent = String(incoherent);
        node.textContent = `${props.amount} / ${props.values}`;
      },
    });
    const errors: string[] = [];
    for (const target of [Number.NaN, Number.POSITIVE_INFINITY]) {
      try {
        element.to({ amount: target }).apply();
      } catch (error) {
        errors.push(String(error));
      }
    }
    node.dataset.errors = JSON.stringify(errors);
    s.scene("Draw").with(element);
    s.pause();
    element.to({ amount: 100, values: 30 }).duration(0.3).ease("linear");
    s.pause();
    return s;
  });
  const node = stage.locator("#complete-frames");
  expect(JSON.parse((await node.getAttribute("data-errors")) ?? "[]")).toHaveLength(2);
  await stage.next();
  await expect(node).toHaveAttribute("data-incoherent", "false");
  await expect(node).toHaveText("100 / 30");
  await stage.prev();
  await expect(node).toHaveAttribute("data-incoherent", "false");
  await expect(node).toHaveText("0 / 10");
  expect(await page.evaluate(() => window.__STAGE_INSTANCE__?.isMounted)).toBe(true);
});
