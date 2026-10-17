import { expect, test } from "../helpers/stage";

test.use({ hasTouch: true });

test.beforeEach(async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.scene("First").with(SR.Title("First", { id: "first" }));
    s.pause();
    s.scene("Second").with(SR.Title("Second", { id: "second" }));
    s.pause();
    s.overlay(SR.NavigationOverlay());
    return s;
  });
});

test("mouse hover and touch taps control visibility independently", async ({ page }) => {
  const size = page.viewportSize();
  if (!size) throw new Error("Viewport required");
  const bar = page.locator(".sr-nav-overlay");
  await page.mouse.move(1, size.height - 2);
  await expect(bar).toBeVisible();
  await page.mouse.move(1, 1);
  await expect(bar).toBeHidden();
  await page.touchscreen.tap(20, 20);
  await expect(bar).toBeHidden();
  await page.touchscreen.tap(20, size.height - 20);
  await expect(bar).toBeVisible();
  const next = page.getByRole("button", { name: "Next step (→)", exact: true });
  const bounds = await next.boundingBox();
  expect(bounds?.width).toBeGreaterThanOrEqual(48);
  expect(bounds?.height).toBeGreaterThanOrEqual(48);
  await expect(next).toHaveCSS("font-size", "32px");

  await expect(page.getByRole("button", { name: "Pointer and annotate" })).toBeHidden();
  await page.getByRole("button", { name: "Next step (→)", exact: true }).tap();
  await expect(page.locator("#second")).toBeVisible();
  await expect(bar).toBeVisible();
  await page.getByRole("button", { name: "Previous step (←)", exact: true }).tap();
  await expect(page.locator("#first")).toBeVisible();
  await page.touchscreen.tap(20, 20);
  await expect(bar).toBeHidden();
  await page.mouse.move(20, size.height - 20);
  await expect(bar).toBeVisible();
  await page.mouse.click(20, size.height - 20);
  await expect(bar).toBeVisible();
  await page.mouse.move(20, 20);
  await expect(bar).toBeHidden();
  await page.touchscreen.tap(20, size.height - 20);
  await expect(bar).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(bar).toBeHidden();
});

test("touch swipes navigate once and ignore vertical, canceled, and interactive gestures", async ({
  page,
}) => {
  const session = await page.context().newCDPSession(page);
  const swipe = async (x: number, y: number, dx: number, dy = 0, cancel = false) => {
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ x, y }],
    });
    for (let i = 1; i <= 4; i++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: x + (dx * i) / 4, y: y + (dy * i) / 4 }],
      });
    }
    await session.send("Input.dispatchTouchEvent", {
      type: cancel ? "touchCancel" : "touchEnd",
      touchPoints: [],
    });
  };
  await swipe(800, 300, -200);
  await expect(page.locator("#second")).toBeVisible();
  await expect(page.locator(".sr-nav-overlay")).toBeHidden();
  await swipe(600, 300, 200);
  await expect(page.locator("#first")).toBeVisible();
  await swipe(800, 300, -200, 0, true);
  await swipe(800, 300, 0, 100);
  await expect(page.locator("#first")).toBeVisible();
  await page.evaluate(() => {
    const el = document.createElement("div");
    el.dataset.preventSwipe = "";
    el.style.cssText = "position:fixed;inset:100px 0 100px;z-index:99999";
    document.querySelector("#stage")?.append(el);
  });
  await swipe(800, 300, -200);
  await expect(page.locator("#first")).toBeVisible();
  await page.evaluate(() => {
    document.querySelector("[data-prevent-swipe]")?.remove();
    const scroller = document.createElement("div");
    scroller.id = "touch-scroller";
    scroller.style.cssText =
      "position:fixed;left:100px;top:200px;width:900px;height:200px;overflow:auto;z-index:99999";
    const content = document.createElement("div");
    content.style.cssText = "width:2400px;height:180px";
    scroller.append(content);
    document.querySelector("#stage")?.append(scroller);
  });
  await swipe(800, 300, -200);
  await expect
    .poll(() => page.locator("#touch-scroller").evaluate((el) => el.scrollLeft))
    .toBeGreaterThan(0);
  await expect(page.locator("#first")).toBeVisible();
  await page.locator("#touch-scroller").evaluate((el) => el.remove());
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: 600, y: 300 },
      { x: 800, y: 300 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [
      { x: 400, y: 300 },
      { x: 600, y: 300 },
    ],
  });
  await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(page.locator("#first")).toBeVisible();
  await session.detach();
});
