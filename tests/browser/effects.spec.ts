import { expect, test } from "../helpers/stage";

test.describe("Effects & Decorators", () => {
  test("typewriter completes text typing and leaves stage at rest", async ({ stage }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });

      // Fast typewriter effect (speed in seconds: 0.01s = 10ms/char)
      const text = SR.Text("Real browser test", {
        id: "typed-text",
        position: [20, 20],
      }).decorate(
        SR.typewriter({
          speed: 0.01,
          jitter: 0,
          cursor: false,
        }),
      );

      s.scene("Typing").with(text);
      s.pause();

      s.scene("Rest").with(text);
      s.pause();

      return s;
    });

    const typedEl = stage.locator("#typed-text");

    // Poll until typing completes
    await expect(typedEl).toHaveText("Real browser test", { timeout: 3000 });

    // Verify stage settles into clean rest (all timers stopped)
    await stage.expectAtRest();

    // Advance to next scene
    await stage.next();
    await stage.expectAtRest();
    await expect(typedEl).toHaveText("Real browser test");
  });

  test("kenBurns animation plays smoothly and pauses on scene exit", async ({ stage }) => {
    await stage.mount(
      (SR) => {
        const s = new SR.Stage({ channel: false });

        // Ken Burns motion: 1.0 to 1.5 over 1.0s
        const card = SR.Card("Cinematic Card", {
          id: "ken-card",
          position: [20, 20],
          width: 40,
          height: 30,
        }).decorate(
          SR.kenBurns({
            scale: 1.5,
            duration: 1.0,
          }),
        );

        s.scene("Scene 1").with(card);
        s.pause();

        s.scene("Scene 2").with(); // Exit scene
        s.pause();

        return s;
      },
      { waitForRest: false },
    );

    const card = stage.locator("#ken-card");

    // 1. Verify Web Animation is running
    await expect
      .poll(async () => {
        return card.evaluate((el) => {
          const anims = el.getAnimations({ subtree: true });
          return anims.length > 0 && anims[0].playState === "running";
        });
      })
      .toBe(true);

    // 2. Wait until animation advances in time
    await expect
      .poll(async () => {
        return card.evaluate((el) => {
          const anim = el.getAnimations({ subtree: true })[0];
          return (anim?.currentTime ?? 0) > 50;
        });
      })
      .toBe(true);

    // 4. Advance to Scene 2 (exit scene)
    await stage.next();

    // 5. Verify animation is stopped and stage is at rest
    const stillRunning = await card.evaluate((el) => {
      const anims = el.getAnimations({ subtree: true });
      return anims.some((a) => a.playState === "running");
    });
    expect(stillRunning).toBe(false);
    await stage.expectAtRest();
  });

  test("ambient flow animations continue running on active elements and pause on scene exit", async ({
    stage,
  }) => {
    await stage.mount((SR) => {
      const s = new SR.Stage({ channel: false });

      const shape = SR.Shape(SR.paths.box(), {
        id: "flow-shape",
        position: [20, 20],
        width: 30,
        height: 20,
        flow: "traveling",
      });

      s.scene("Active").with(shape);
      s.pause();

      s.scene("Exit").with();
      s.pause();

      return s;
    });

    const shape = stage.locator("#flow-shape");
    const path = stage.locator("#flow-shape .sr-shape-path-main");

    // 1. CSS animation runs while element is active
    await expect(path).toHaveCSS("animation-play-state", "running");

    // 2. Animation continues running over time
    await expect
      .poll(async () => {
        return shape.evaluate((el) => {
          const anims = el.getAnimations({ subtree: true });
          return (
            anims.length > 0 &&
            anims[0].playState === "running" &&
            (anims[0].currentTime ?? 0) > 100
          );
        });
      })
      .toBe(true);

    // 3. Exit scene
    await stage.next();

    // 4. Animation stops when element leaves the scene
    await expect(shape).toHaveCSS("display", "none");
    const stillRunning = await shape.evaluate((el) => {
      const anims = el.getAnimations({ subtree: true });
      return anims.some((a) => a.playState === "running");
    });
    expect(stillRunning).toBe(false);
    await stage.expectAtRest();
  });
});
