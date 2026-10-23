import { fileURLToPath } from "node:url";
import { expect, test } from "../helpers/stage";

const chartModuleUrl = `/@fs${fileURLToPath(new URL("../../demo/rehearsal-chart.ts", import.meta.url))}`;

test("Plot chart animates on the stage clock and restores planned data", async ({
  stage,
  page,
}) => {
  await page.evaluate(async (moduleUrl) => {
    const { RehearsalChart } = await import(moduleUrl);
    const { Stage, Title } = window.__SR__;
    const s = new Stage({ channel: false, defaultDuration: 0.1 });
    const chart = RehearsalChart({
      data: [
        { section: "Opening", planned: 30, rehearsed: 45 },
        { section: "Explain", planned: 70, rehearsed: 100 },
        { section: "Live demo", planned: 65, rehearsed: 300 },
        { section: "Closing", planned: 25, rehearsed: 45 },
      ],
    });
    s.scene("Opening").with(Title("Opening"));
    s.pause();
    s.scene("Chart").with(chart);
    chart.to({ reveal: 1 }).duration(0.8).ease("linear");
    s.pause();
    chart.to({ comparison: 1 }).duration(0.8);
    s.pause();
    s.scene("End").with(Title("End"));
    s.pause();
    window.__STAGE_INSTANCE__ = s;
    s.mount("#stage");
  }, chartModuleUrl);

  await stage.next();
  const svg = page.locator('svg[role="img"]');
  await expect(svg).toHaveAttribute("aria-label", /^Planned timings:/);
  // Both the entrance and the counting labels settle on the same stage clock.
  await expect(svg.getByText("65 s", { exact: true })).toHaveCount(1);
  await stage.next();
  await expect(svg).toHaveAttribute("aria-label", /^Rehearsed timings:/);
  await expect(
    svg.locator('[data-chart-part="timing-values"]').getByText("300 s", { exact: true }),
  ).toHaveCount(1);
  await expect(svg.getByText("Live demo · 5 min", { exact: true }).locator("..")).toHaveAttribute(
    "opacity",
    "1",
  );

  await stage.prev();
  await expect(svg).toHaveAttribute("aria-label", /^Planned timings:/);
  await expect(svg.getByText("65 s", { exact: true })).toHaveCount(1);
  await expect(svg.getByText("Live demo · 5 min", { exact: true }).locator("..")).toHaveAttribute(
    "opacity",
    "0",
  );

  // Leave in mid-animation, without waiting for the counting labels to finish.
  await page.keyboard.press("ArrowRight");
  await expect(svg).toHaveAttribute("aria-label", /^Rehearsed timings:/);
  await page.keyboard.press("ArrowRight");
  await stage.expectAtRest();
  await stage.prev();
  await expect(svg).toHaveAttribute("aria-label", /^Rehearsed timings:/);
  await expect(
    svg.locator('[data-chart-part="timing-values"]').getByText("300 s", { exact: true }),
  ).toHaveCount(1);
});

test("chart options, transforms, and SVG identity survive navigation together", async ({
  stage,
  page,
}) => {
  await page.evaluate(async (moduleUrl) => {
    const { RehearsalChart } = await import(moduleUrl);
    const { Stage, Title, layout, transform } = window.__SR__;
    const s = new Stage({ channel: false, defaultDuration: 0.1 });
    const chartTransform = transform({ perspective: 320 });
    const chart = RehearsalChart({
      id: "component-chart",
      data: [{ section: "Demo", planned: 65, rehearsed: 300 }],
      reveal: 1,
      width: 64,
      height: 35.2,
    }).decorate(chartTransform);
    const second = RehearsalChart({
      id: "second-chart",
      data: [{ section: "Different data", planned: 20, rehearsed: 300 }],
      reveal: 1,
      comparison: 1,
      width: 40,
      height: 22,
    });
    layout.hstack([chart, second], { x: "center", y: 45, gap: 10 });
    chart.domElement.querySelector("svg")?.setAttribute("data-instance", "original");
    s.scene("Charts").with(chart, second);
    s.pause();
    chart.to({ comparison: 1, scale: 0.85, width: 72, height: 39.6 }).duration(0.4).ease("linear");
    chartTransform.to({ rotationX: 8, rotationY: -25 }).duration(0.4).ease("linear");
    s.pause();
    s.scene("End").with(Title("End"));
    s.pause();
    window.__STAGE_INSTANCE__ = s;
    s.mount("#stage");
  }, chartModuleUrl);
  await stage.expectAtRest();
  const chart = stage.locator("#component-chart");
  const svg = chart.locator('svg[role="img"]');
  const initial = await chart.evaluate((node) => ({
    transform: node.style.transform,
    width: node.style.width,
    height: node.style.height,
  }));
  await expect(svg.getByText("65 s", { exact: true })).toHaveCount(1);
  await expect(
    stage
      .locator('#second-chart [data-chart-part="timing-values"]')
      .getByText("300 s", { exact: true }),
  ).toHaveCount(1);
  const ids = await page
    .locator("linearGradient")
    .evaluateAll((nodes) => nodes.map((node) => node.id));
  expect(new Set(ids).size).toBe(ids.length);
  await stage.next();
  await expect(
    svg.locator('[data-chart-part="timing-values"]').getByText("300 s", { exact: true }),
  ).toHaveCount(1);
  expect(await chart.evaluate((node) => node.style.transform)).not.toBe(initial.transform);
  await stage.prev();
  await expect(svg.getByText("65 s", { exact: true })).toHaveCount(1);
  expect(
    await chart.evaluate((node) => ({
      transform: node.style.transform,
      width: node.style.width,
      height: node.style.height,
    })),
  ).toEqual(initial);
  await page.keyboard.press("ArrowRight");
  await expect(svg).toHaveAttribute("aria-label", /^Rehearsed timings:/);
  await page.keyboard.press("ArrowRight");
  await stage.expectAtRest();
  await stage.prev();
  await expect(svg).toHaveAttribute("data-instance", "original");
  await expect(
    svg.locator('[data-chart-part="timing-values"]').getByText("300 s", { exact: true }),
  ).toHaveCount(1);
  await stage.prev();
  await expect(svg.getByText("65 s", { exact: true })).toHaveCount(1);
});

test("data-driven charts finish every row and comparison maps directly to values", async ({
  stage,
  page,
}) => {
  await page.evaluate(async (moduleUrl) => {
    const { RehearsalChart } = await import(moduleUrl);
    const { Stage } = window.__SR__;
    const s = new Stage({ channel: false });
    const data = Array.from({ length: 8 }, (_, i) => ({
      section: `Section ${i + 1}`,
      planned: (i + 1) * 10,
      rehearsed: (i + 1) * 30,
    }));
    const chart = RehearsalChart({ data, id: "many-rows" });
    const middle = RehearsalChart({ data, id: "middle", reveal: 1, comparison: 0.5 });
    // The component owns a copy, so later edits cannot invalidate earlier snapshots.
    data[0].planned = 999;
    s.scene("Data").with(chart, middle);
    s.pause();
    chart.to({ reveal: 1 }).duration(0.3);
    s.pause();
    chart.to({ comparison: 1 }).duration(0.3);
    s.pause();
    window.__STAGE_INSTANCE__ = s;
    s.mount("#stage");
  }, chartModuleUrl);
  const values = page.locator('#many-rows [data-chart-part="timing-values"] text');
  await stage.expectAtRest();
  await expect(page.locator('#middle [data-chart-part="timing-values"] text')).toHaveText(
    Array.from({ length: 8 }, (_, i) => `${(i + 1) * 20} s`),
  );
  await stage.next();
  await expect(values).toHaveText(Array.from({ length: 8 }, (_, i) => `${(i + 1) * 10} s`));
  await stage.next();
  await expect(values).toHaveText(Array.from({ length: 8 }, (_, i) => `${(i + 1) * 30} s`));
  await stage.prev();
  await expect(values).toHaveText(Array.from({ length: 8 }, (_, i) => `${(i + 1) * 10} s`));
});
