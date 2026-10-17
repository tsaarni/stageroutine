import { expect, test } from "../helpers/stage";

test("background selection and properties restore across forward and backward steps", async ({
  stage,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false, defaultDuration: 0.01 });
    const first = SR.CSSBackground({ className: "first-background", background: "#223344" });
    const second = SR.CSSBackground({ className: "second-background", background: "#443322" });
    s.scene("Backgrounds").with(SR.Title("Same foreground"));
    s.pause();
    s.background(first);
    s.pause();
    s.background(second);
    s.pause();
    first.opacity = 0.35;
    s.background(first);
    s.pause();
    s.background("#112233");
    s.pause();
    return s;
  });
  const first = stage.locator(".first-background");
  const second = stage.locator(".second-background");
  await expect(first).toHaveCount(0);
  await stage.next();
  await expect(first).toBeVisible();
  await expect(first).toHaveCSS("opacity", "1");
  await stage.next();
  await expect(first).toBeHidden();
  await expect(second).toBeVisible();
  await stage.next();
  await expect(second).toBeHidden();
  await expect(first).toHaveCSS("opacity", "0.35");
  await stage.next();
  await expect(first).toBeHidden();
  await expect(stage.page.locator("#stage")).toHaveCSS("background-color", "rgb(17, 34, 51)");
  await stage.prev();
  await expect(first).toBeVisible();
  await expect(first).toHaveCSS("opacity", "0.35");
  await stage.prev();
  await expect(second).toBeVisible();
  await stage.prev();
  await expect(first).toBeVisible();
  await expect(first).toHaveCSS("opacity", "1");
  await stage.prev();
  await expect(first).toBeHidden();
  await expect(second).toBeHidden();
});

test("hidden procedural backgrounds stop and resume without duplicate canvases", async ({
  stage,
  page,
}) => {
  await stage.mount(
    (SR) => {
      const s = new SR.Stage({ channel: false, defaultDuration: 0.01 });
      const fluid = SR.AsciiFluid({ className: "fluid-background" });
      s.background(fluid);
      s.scene("Fluid").with(SR.Title("Same foreground"));
      s.pause();
      s.background(SR.Starfield({ className: "star-background", count: 100 }));
      s.pause();
      s.background(SR.CSSBackground("#101421"));
      s.pause();
      return s;
    },
    { waitForRest: false },
  );
  await expect.poll(() => stage.getMetric("background_running")).toBe(1);
  await page.keyboard.press("ArrowRight");
  await expect(stage.locator(".fluid-background")).toBeHidden();
  await expect(stage.locator(".star-background")).toBeVisible();
  await page.keyboard.press("ArrowRight");
  await stage.expectAtRest();
  await expect(stage.locator(".fluid-background")).toBeHidden();
  await expect(stage.locator(".star-background")).toBeHidden();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => stage.getMetric("background_running")).toBe(1);
  await expect(stage.locator(".star-background canvas")).toHaveCount(1);
  await page.keyboard.press("ArrowLeft");
  await expect.poll(() => stage.getMetric("background_running")).toBe(1);
  await expect(stage.locator(".fluid-background canvas")).toHaveCount(1);
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("ArrowRight");
  await stage.expectAtRest();
});

test("CSS background keyframes pause while hidden and resume on return", async ({
  stage,
  page,
}) => {
  await page.addStyleTag({
    content: `
    .animated-background { animation: background-test-drift 30s linear infinite; }
    @keyframes background-test-drift {
      from { background-position: 0% 0%; }
      to { background-position: 100% 100%; }
    }
  `,
  });
  await stage.mount(
    (SR) => {
      const s = new SR.Stage({ channel: false, defaultDuration: 0.01 });
      s.background(
        SR.CSSBackground({
          className: "animated-background",
          background: "linear-gradient(90deg, #101421, #38345b)",
        }),
      );
      s.scene("Animated").with(SR.Title("Same foreground"));
      s.pause();
      s.background("#101421");
      s.pause();
      return s;
    },
    { waitForRest: false },
  );
  const background = stage.locator(".animated-background");
  await expect(background).toHaveCSS("animation-play-state", "running");
  await page.keyboard.press("ArrowRight");
  await expect(background).toHaveCSS("animation-play-state", "paused");
  await stage.expectAtRest();
  await page.keyboard.press("ArrowLeft");
  await expect(background).toBeVisible();
  await expect(background).toHaveCSS("animation-play-state", "running");
});
