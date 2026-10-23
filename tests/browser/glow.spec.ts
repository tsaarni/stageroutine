import { expect, test } from "../helpers/stage";

test("glow intensity composes with filters and restores interrupted snapshots", async ({
  stage,
  page,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const light = SR.glow({ intensity: 0, pulse: false });
    const title = SR.Title("Light", { id: "light", blur: 2, brightness: 1.2 }).decorate(light);
    s.scene("Light").with(title);
    s.pause();
    light.to({ intensity: 1.4 }).duration(0.8).ease("linear");
    title.to({ blur: 0, brightness: 1 }).duration(0.8);
    s.pause();
    s.scene("End").with(SR.Title("End"));
    s.pause();
    return s;
  });
  const title = page.locator("#light");
  await expect(title).toHaveCSS("filter", "blur(2px) brightness(1.2)");
  await page.keyboard.press("ArrowRight");
  await expect
    .poll(async () =>
      title.evaluate((node) => Number(node.style.getPropertyValue("--sr-glow-intensity"))),
    )
    .toBeGreaterThan(0);
  const filter = await title.evaluate((node) => getComputedStyle(node).filter);
  expect(filter).toContain("blur(");
  expect(filter).toContain("brightness(");
  expect(filter).toContain("drop-shadow(");
  await stage.prev();
  await expect(title).toHaveCSS("filter", "blur(2px) brightness(1.2)");
  await stage.next();
  expect(await title.evaluate((node) => getComputedStyle(node).filter)).toContain("drop-shadow(");
  await expect(title).toHaveCSS("--sr-glow-intensity", "1.4");
  await page.keyboard.press("ArrowRight");
  await stage.expectAtRest();
  await stage.prev();
  await expect(title).toHaveCSS("--sr-glow-intensity", "1.4");
});

test("ambient pulse preserves brightness and pauses while hidden", async ({ stage, page }) => {
  await stage.mount(
    (SR) => {
      const s = new SR.Stage({ channel: false, defaultDuration: 0.01 });
      const title = SR.Title("Pulse", { id: "pulse", brightness: 1.2 }).decorate(
        SR.glow({ duration: 0.5 }),
      );
      s.scene("Pulse").with(title);
      s.pause();
      s.scene("End").with(SR.Title("End"));
      s.pause();
      return s;
    },
    { waitForRest: false },
  );
  const title = page.locator("#pulse");
  await expect
    .poll(async () =>
      title.evaluate((node) =>
        Number(getComputedStyle(node).getPropertyValue("--sr-glow-pulse-factor")),
      ),
    )
    .toBeGreaterThan(1.1);
  const filter = await title.evaluate((node) => getComputedStyle(node).filter);
  expect(filter).toContain("brightness(1.2)");
  expect(filter).toContain("drop-shadow(");
  await page.keyboard.press("ArrowRight");
  await stage.expectAtRest();
  const paused = await title.evaluate((node) =>
    node.getAnimations().every((animation) => animation.playState === "paused"),
  );
  expect(paused).toBe(true);
  await page.keyboard.press("ArrowLeft");
  await expect
    .poll(async () =>
      title.evaluate((node) =>
        node.getAnimations().some((animation) => animation.playState === "running"),
      ),
    )
    .toBe(true);
});

test("live glow can brighten and stop its ambient pulse at zero", async ({ stage, page }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const light = SR.glow({ intensity: 0 });
    const title = SR.Title("Toggle", { id: "toggle" }).decorate(light);
    title.domElement.addEventListener("click", () => light.to({ intensity: 1 }).duration(0.15));
    title.domElement.addEventListener("dblclick", () => light.to({ intensity: 0 }).duration(0.15));
    s.scene("Live").with(title);
    s.pause();
    return s;
  });
  const title = page.locator("#toggle");
  await expect(title).toHaveCSS("filter", "none");
  await title.dispatchEvent("click");
  await expect(title).toHaveCSS("--sr-glow-intensity", "1");
  await expect(title).toHaveClass(/sr-glow-pulse/);
  await title.dispatchEvent("dblclick");
  await stage.expectAtRest();
  await expect(title).toHaveCSS("filter", "none");
  await expect(title).not.toHaveClass(/sr-glow-pulse/);
});

test("glow validates strength and attachment without exporting controller internals", async ({
  stage,
  page,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.scene("Start").with(SR.Title("Start"));
    s.pause();
    return s;
  });
  const result = await page.evaluate(() => {
    const SR = window.__SR__;
    const errors: string[] = [];
    const attempt = (fn: () => void) => {
      try {
        fn();
      } catch (error) {
        errors.push(String(error));
      }
    };
    for (const intensity of [-1, NaN, Infinity])
      attempt(() => {
        SR.glow({ intensity });
      });
    attempt(() => {
      SR.glow({ duration: 0 });
    });
    const light = SR.glow({ pulse: false });
    attempt(() => light.to({ intensity: 1 }));
    const first = SR.Title("First").decorate(light);
    attempt(() => first.decorate(light));
    attempt(() => first.decorate(SR.glow()));
    attempt(() => light.to({ intensity: -1 }).apply());
    return { errors, frozen: Object.isFrozen(light.values), intensity: light.values.intensity };
  });
  expect(result.errors).toHaveLength(8);
  expect(result.frozen).toBe(true);
  expect(result.intensity).toBe(1);
});
