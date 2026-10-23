import { expect, test } from "../helpers/stage";

test("frame limits preserve scene timing, runtime changes, live motion, and navigation", async ({
  page,
  stage: _stage,
}) => {
  const result = await page.evaluate(async () => {
    const SR = window.__SR__;
    const raf = window.requestAnimationFrame;
    const cancel = window.cancelAnimationFrame;
    const nativeNow = performance.now.bind(performance);
    let now = 1000;
    let nextId = 0;
    const callbacks = new Map<number, FrameRequestCallback>();
    window.requestAnimationFrame = (callback) => {
      callbacks.set(++nextId, callback);
      return nextId;
    };
    window.cancelAnimationFrame = (id) => {
      callbacks.delete(id);
    };
    Object.defineProperty(performance, "now", { configurable: true, value: () => now });
    const advance = (frames: number) => {
      for (let frame = 0; frame < frames; frame++) {
        now += 1000 / 120;
        const pending = [...callbacks.values()];
        callbacks.clear();
        for (const callback of pending) callback(now);
      }
    };
    const s = new SR.Stage({ channel: false, frameRate: 20, defaultDuration: 0 });
    try {
      const card = SR.Card("Motion", { x: 10 });
      const samples: { time: number; x: number }[] = [];
      card.onUpdate(() => samples.push({ time: now, x: card.x }));
      s.scene("Motion").with(card);
      s.pause();
      card.to({ x: 110 }).duration(1).ease("linear");
      s.pause();
      card.to({ x: 120 }).duration(0.05);
      s.pause();
      s.mount("#stage");
      advance(2);
      samples.length = 0;
      s.emit("req:nav:nextStep");
      const start = now;
      advance(120);
      // Finish at the first display frame after the endpoint despite floating-point rounding.
      advance(1);
      const scene = samples.filter(({ x }) => x > 10 && x < 110);
      const sceneEnd = samples.find(({ x }) => x === 110);
      const scenePending = callbacks.size;
      s.frameRate = 30;
      s.emit("req:nav:prevStep");
      const restored = { x: card.x, frameRate: s.frameRate };
      samples.length = 0;
      s.emit("req:nav:nextStep");
      advance(30);
      const limitedCount = samples.filter(({ x }) => x > 10 && x < 110).length;
      const beforeAuto = samples.length;
      s.frameRate = "auto";
      advance(30);
      const autoCount = samples.length - beforeAuto;
      s.emit("req:nav:prevStep");
      s.frameRate = 10;
      samples.length = 0;
      card.to({ x: 60 }).duration(0.5).ease("linear").apply();
      await Promise.resolve();
      advance(61);
      const live = samples.filter(({ x }) => x > 10 && x < 60);
      const liveEnd = card.x;
      const livePending = callbacks.size;
      // A transition shorter than the update interval must still finish on time.
      s.frameRate = 1;
      card.to({ x: 80 }).duration(0.05).ease("linear").apply();
      await Promise.resolve();
      advance(7);
      const shortLive = { x: card.x, moving: s.isMoving, pending: callbacks.size };
      s.emit("req:nav:gotoStep", { index: 1 });
      s.emit("req:nav:nextStep");
      advance(7);
      const shortScene = { x: card.x, moving: s.isMoving, pending: callbacks.size };
      const background = SR.Starfield({ count: 24 });
      let backgroundFrames = 0;
      background.onUpdate?.(() => {
        backgroundFrames++;
      });
      s.background(background);
      card.to({ x: 90 }).duration(0.5).apply();
      await Promise.resolve();
      advance(61);
      const ambientPending = callbacks.size;
      s.background("black");
      const hiddenPending = callbacks.size;
      return {
        scene,
        sceneElapsed: (sceneEnd?.time ?? 0) - start,
        scenePending,
        restored,
        limitedCount,
        autoCount,
        live,
        liveEnd,
        livePending,
        shortLive,
        shortScene,
        backgroundFrames,
        ambientPending,
        hiddenPending,
      };
    } finally {
      s.dispose();
      window.requestAnimationFrame = raf;
      window.cancelAnimationFrame = cancel;
      Object.defineProperty(performance, "now", { configurable: true, value: nativeNow });
    }
  });
  expect(result.scene).toHaveLength(20);
  for (let i = 1; i < result.scene.length; i++) {
    expect(result.scene[i].time - result.scene[i - 1].time).toBeCloseTo(50, 3);
    expect(result.scene[i].x - result.scene[i - 1].x).toBeCloseTo(5, 3);
  }
  expect(result.sceneElapsed).toBeGreaterThanOrEqual(1000);
  expect(result.sceneElapsed).toBeLessThan(1010);
  expect(result.scenePending).toBe(0);
  expect(result.restored).toEqual({ x: 10, frameRate: 30 });
  expect(result.limitedCount).toBeGreaterThanOrEqual(7);
  expect(result.limitedCount).toBeLessThanOrEqual(8);
  expect(result.autoCount).toBe(30);
  expect(result.live).toHaveLength(5);
  expect(result.liveEnd).toBe(60);
  expect(result.livePending).toBe(0);
  expect(result.shortLive).toEqual({ x: 80, moving: false, pending: 0 });
  expect(result.shortScene).toEqual({ x: 120, moving: false, pending: 0 });
  expect(result.backgroundFrames).toBeGreaterThanOrEqual(14);
  expect(result.ambientPending).toBe(1);
  expect(result.hiddenPending).toBe(0);
});

test("frame rate defaults to auto and rejects invalid values without changing the setting", async ({
  page,
  stage: _stage,
}) => {
  const result = await page.evaluate(() => {
    const SR = window.__SR__;
    const s = new SR.Stage({ channel: false });
    const initial = s.frameRate;
    const errors: string[] = [];
    for (const value of [0, -30, NaN, Infinity]) {
      try {
        s.frameRate = value;
      } catch (error) {
        errors.push((error as Error).name);
      }
      try {
        new SR.Stage({ channel: false, frameRate: value });
      } catch (error) {
        errors.push((error as Error).name);
      }
    }
    const after = s.frameRate;
    s.frameRate = 29.97;
    const fractional = s.frameRate;
    s.dispose();
    return { initial, after, fractional, errors };
  });
  expect(result.initial).toBe("auto");
  expect(result.after).toBe("auto");
  expect(result.fractional).toBe(29.97);
  expect(result.errors).toEqual(Array(8).fill("RangeError"));
});
