import type { Locator } from "@playwright/test";

/** Sample a viewport bitmap without clipping the browser's backdrop compositing. */
export async function captureContrast(
  target: Locator,
  region = { x: 0.2, y: 0.2, width: 0.6, height: 0.6 },
): Promise<number> {
  // DOM bounds already include stage scaling and letterboxing, in viewport CSS px.
  // Capture the full viewport: element/clip screenshots can alter backdrop compositing.
  const box = await target.boundingBox();
  if (!box) throw new Error("Contrast target must be visible");
  const page = target.page();
  const viewport = await page.evaluate(() => ({ width: innerWidth, height: innerHeight }));
  const full = await page.screenshot({ scale: "css" });
  return page.evaluate(
    async ({ data, box, region, viewport }) => {
      const img = new Image();
      img.src = `data:image/png;base64,${data}`;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Missing canvas context");
      ctx.drawImage(img, 0, 0);
      // Map CSS px to bitmap px explicitly; do not multiply by devicePixelRatio again.
      const scaleX = canvas.width / viewport.width;
      const scaleY = canvas.height / viewport.height;
      const x = Math.round((box.x + box.width * region.x) * scaleX);
      const y = Math.round((box.y + box.height * region.y) * scaleY);
      const width = Math.max(1, Math.round(box.width * region.width * scaleX));
      const height = Math.max(1, Math.round(box.height * region.height * scaleY));
      if (x < 0 || y < 0 || x + width > canvas.width || y + height > canvas.height) {
        throw new Error("Contrast sample must fit inside the viewport");
      }
      const pixels = ctx.getImageData(x, y, width, height).data;
      let sum = 0;
      let squares = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        const luma = 0.2126 * pixels[i] + 0.7152 * pixels[i + 1] + 0.0722 * pixels[i + 2];
        sum += luma;
        squares += luma * luma;
      }
      const count = pixels.length / 4;
      return Math.sqrt(Math.max(0, squares / count - (sum / count) ** 2));
    },
    { data: full.toString("base64"), box, region, viewport },
  );
}
