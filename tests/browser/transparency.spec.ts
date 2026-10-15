import { expect, test } from "../helpers/stage";

for (const background of ["checkerboard", "fluid"] as const) {
  test(`preserves card frost across navigation and reload over ${background}`, async ({
    stage,
  }) => {
    // Freeze the procedural background and keep all rAF loops stopped at rest.
    await stage.page.emulateMedia({ reducedMotion: "reduce" });
    await stage.page.evaluate((value) => {
      sessionStorage.setItem("transparency-background", value);
    }, background);
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });
      s.background(
        sessionStorage.getItem("transparency-background") === "fluid"
          ? SR.AsciiFluid({ waveSpeed: 0 }).decorate(SR.vignette())
          : SR.CSSBackground("repeating-conic-gradient(#000 0% 25%, #fff 0% 50%) 0 0 / 40px 40px"),
      );
      s.scene("Introduction").with(SR.Title("Introduction"));
      s.pause();

      const card = SR.Card("Redis Cache", {
        id: "frost-card",
        position: [113.2, 31.5],
        width: 15,
        height: 8.33,
      });
      s.scene("Topology").with(card);
      s.pause();
      card.to({ position: [100, 40] }).duration(0.1);
      s.pause();
      return s;
    });

    const card = stage.locator("#frost-card");
    const frost = card.locator(".sr-shape-frost");
    const capture = async () => {
      const box = await card.boundingBox();
      if (!box) throw new Error("Card must be visible");
      // Element/clip screenshots change backdrop compositing and hide this bug.
      // Capture the viewport first, then crop the resulting bitmap offscreen.
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
          return canvas.toDataURL();
        },
        { data: full.toString("base64"), box },
      );
    };
    const expectSame = (actual: string, expected: string) => {
      expect(actual === expected, "Card pixels must match at the same step").toBe(true);
    };

    await stage.next();
    await stage.reload();
    await expect(card).toBeVisible();
    const fresh = await capture();

    await stage.prev();
    await stage.next();
    expectSame(await capture(), fresh);

    await stage.next();
    const moved = await capture();
    await stage.reload();
    await expect(card).toBeVisible();
    expectSame(await capture(), moved);

    await stage.prev();
    expectSame(await capture(), fresh);

    // Matching images alone could also mean the blur is broken on both paths.
    await frost.evaluate((el) => {
      el.style.backdropFilter = "none";
    });
    expect((await capture()) === fresh, "Frost must actually blur the background").toBe(false);
  });
}
