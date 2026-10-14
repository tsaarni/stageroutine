import { expect, type Locator } from "@playwright/test";

/** Asserts that a 2D canvas contains at least one nontransparent pixel. */
export async function expectCanvasPainted(canvas: Locator): Promise<void> {
  await expect
    .poll(() =>
      canvas.evaluate((node: HTMLCanvasElement) => {
        const context = node.getContext("2d");
        if (!context) throw new Error("Expected a 2D canvas");
        const pixels = context.getImageData(0, 0, node.width, node.height).data;
        return pixels.some((value, index) => index % 4 === 3 && value > 0);
      }),
    )
    .toBe(true);
}
