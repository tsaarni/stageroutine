import { expect, test } from "../helpers/stage";

/**
 * Observed Chromium Backdrop Root Behavior / Suspected Bug:
 *
 * When an element combines a CSS transform (e.g. `translate3d(...)`) with an opacity
 * transition down and back to 1:
 *
 * 1. During `opacity < 1`, the parent forms an isolated W3C "Backdrop Root".
 *    Child elements with `backdrop-filter` cannot sample graphics outside that root.
 * 2. When `opacity` returns to 1, Chromium appears to retain the isolated backdrop root
 *    boundary on the existing GPU composited transform layer. The child remains bound to
 *    the parent's local surface, leaving the background unblurred.
 * 3. Workaround in code: `ShapeElementImpl._update()` in `src/dom/components/Shape.tsx`
 *    replaces the `.sr-shape-frost` DOM node upon returning to opacity 1, re-initializing
 *    its layer to sample the document backdrop again.
 *
 * Programmatic Detection without Vision Models:
 * - This test captures the viewport and crops an offscreen canvas to the card.
 * - Over a high-contrast black/white checkerboard, active blur acts as a low-pass filter,
 *   smoothing pixels into an even tone and reducing pixel standard deviation (contrast) to < 8.
 * - If the workaround is missing, sharp pattern edges show through, causing contrast to spike (> 60).
 */
test("preserves Card frost blur across opacity fade", async ({ stage }) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    s.background(
      SR.CSSBackground("repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 40px 40px"),
    );

    const card = SR.Card({
      id: "frost-card",
      position: [50, 50],
      width: 30,
      height: 20,
    });

    s.scene("Card").with(card);
    s.pause();

    card.to({ opacity: 0 }).duration(0.1);
    s.pause();

    card.to({ opacity: 1 }).duration(0.1);
    s.pause();

    return s;
  });

  const card = stage.locator("#frost-card");
  await expect(card).toBeVisible();

  const captureContrast = async () => {
    const box = await card.boundingBox();
    if (!box) throw new Error("Card must be visible");

    // Full viewport capture avoids clipping that alters compositor layer trees
    const full = await stage.page.screenshot();
    return stage.page.evaluate(
      async ({ data, box }) => {
        const img = new Image();
        img.src = `data:image/png;base64,${data}`;
        await img.decode();

        const canvas = document.createElement("canvas");
        canvas.width = Math.round(box.width);
        canvas.height = Math.round(box.height);
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Missing canvas context");
        ctx.drawImage(img, -box.x, -box.y);

        // Sample a wide central area of the card (no text interference)
        const pixels = ctx.getImageData(
          Math.round(canvas.width * 0.2),
          Math.round(canvas.height * 0.2),
          Math.round(canvas.width * 0.6),
          Math.round(canvas.height * 0.6),
        ).data;

        let sum = 0;
        let squares = 0;
        for (let i = 0; i < pixels.length; i += 4) {
          const luma = (pixels[i] + pixels[i + 1] + pixels[i + 2]) / 3;
          sum += luma;
          squares += luma * luma;
        }

        const n = pixels.length / 4;
        const mean = sum / n;
        return Math.sqrt(squares / n - mean * mean);
      },
      { data: full.toString("base64"), box },
    );
  };

  // 1. Initial state: high-contrast checkerboard background must be blurred into a smooth low-contrast gray
  const initialContrast = await captureContrast();
  expect(initialContrast, "Frost must smooth high-contrast checkerboard").toBeLessThan(8);

  // 2. Fade out and back in
  await stage.next(); // opacity -> 0
  await stage.next(); // opacity -> 1

  // 3. Post-fade: blur must remain intact (not revert to sharp checkerboard)
  const postFadeContrast = await captureContrast();
  expect(postFadeContrast, "Blur must be preserved after opacity fade").toBeLessThan(8);

  // 4. Verify test sensitivity: turning off backdrop-filter must produce sharp high contrast
  const frost = card.locator(".sr-shape-frost");
  await frost.evaluate((el) => {
    el.style.backdropFilter = "none";
  });
  const sharpContrast = await captureContrast();
  expect(
    sharpContrast,
    "Without blur, background contrast must be significantly higher",
  ).toBeGreaterThan(postFadeContrast * 1.5);
});
