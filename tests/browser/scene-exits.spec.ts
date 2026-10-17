import { expect, test } from "../helpers/stage";

test("outgoing cards finish their fall before incoming content appears and restore on return", async ({
  stage,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const cards = [40, 80, 120].map((x, i) =>
      SR.Card(`Card ${i}`, {
        id: `fall-${i}`,
        position: [x, 55],
        origin: "center",
        width: 20,
        height: 15,
        z: 20,
      }),
    );
    const incoming = SR.Card("Next scene", {
      id: "incoming",
      position: [40, 45],
      width: 80,
      height: 30,
      enterDelay: 0.38,
    });
    const samples: { y: number; opacity: number }[] = [];
    cards[0].onUpdate(() => {
      samples.push({ y: cards[0].y, opacity: cards[0].opacity });
      cards[0].domElement.dataset.samples = JSON.stringify(samples);
    });
    incoming.onUpdate(() => {
      if (incoming.opacity > 0 && cards.some((card) => card.opacity > 0)) {
        incoming.domElement.dataset.overlap = "true";
      }
    });
    s.scene("Cards").with(...cards);
    s.pause();
    s.scene("Next").with(incoming);
    cards.forEach((card, i) => {
      const delay = 0.06 + i * 0.02;
      card
        .to({ y: 112, z: 0, rotation: i % 2 ? 6 : -6 })
        .duration(0.22)
        .delay(delay)
        .ease((t) => t * t);
      card.opacity = SR.to(0)
        .duration(0.1)
        .delay(delay + 0.12)
        .ease("linear");
    });
    s.pause();
    return s;
  });
  const initial = await stage.locator("#fall-0").evaluate((node) => node.style.transform);
  await stage.next();
  const samples = JSON.parse(
    (await stage.locator("#fall-0").getAttribute("data-samples")) ?? "[]",
  ) as {
    y: number;
    opacity: number;
  }[];
  expect(samples.some(({ y, opacity }) => y > 90 && opacity > 0 && opacity < 1)).toBe(true);
  await expect(stage.locator("#incoming")).not.toHaveAttribute("data-overlap", "true");
  await expect(stage.locator("#fall-0")).toBeHidden();
  await stage.prev();
  expect(await stage.locator("#fall-0").evaluate((node) => node.style.transform)).toBe(initial);
});

test("sequence lifelines visibly retract after messages and restore after a scene exit", async ({
  stage,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const a = SR.Card("A", { position: [20, 30], width: 25, height: 12 });
    const b = SR.Card("B", { position: [110, 30], width: 25, height: 12 });
    const seq = SR.SequenceDiagram({ participants: [a, b], startY: 55, lifelineLength: 32 });
    const request = seq.message(a, b, { end: 1 });
    const reply = seq.message(b, a, { end: 1 });
    const next = SR.Text("Next", { id: "sequence-next", position: [50, 50], enterDelay: 0.38 });
    const line = seq.lifelines[0];
    line.domElement.id = "retracting-line";
    const samples: { height: number; messages: number[] }[] = [];
    line.onUpdate(() => {
      samples.push({
        height: line.domElement.getBoundingClientRect().height,
        messages: [request.end, reply.end],
      });
      line.domElement.dataset.samples = JSON.stringify(samples);
    });
    s.scene("Exchange").with(a, b, ...seq.elements);
    s.pause();
    a.to({ y: 10 }).duration(0.1);
    s.pause();
    s.scene("Next").with(next);
    [reply, request].forEach((message, i) => {
      message.end = SR.to(0)
        .duration(0.06)
        .delay(i * 0.05);
      message.opacity = SR.to(0)
        .duration(0.03)
        .delay((i + 1) * 0.05);
    });
    for (const lifeline of seq.lifelines) {
      lifeline.to({ height: 0 }).duration(0.12).delay(0.2);
      lifeline.opacity = SR.to(0).duration(0.04).delay(0.3);
    }
    SR.group(a, b).to({ opacity: 0 }).duration(0.1).delay(0.3);
    s.pause();
    return s;
  });
  const line = stage.locator("#retracting-line");
  const originalHeight = await line.evaluate((node) => node.getBoundingClientRect().height);
  await stage.next();
  const initial = await line.evaluate((node) => node.getBoundingClientRect().height);
  expect(initial).toBeGreaterThan(originalHeight);
  await stage.next();
  const samples = JSON.parse((await line.getAttribute("data-samples")) ?? "[]") as {
    height: number;
    messages: number[];
  }[];
  expect(
    samples.some(
      ({ height, messages }) =>
        height > 1 && height < initial * 0.5 && messages.every((end) => end === 0),
    ),
  ).toBe(true);
  await expect(line).toBeHidden();
  await stage.prev();
  expect(await line.evaluate((node) => node.getBoundingClientRect().height)).toBeCloseTo(initial);
});

test("tilted frames slide apart before the next scene and restore their masks and transforms", async ({
  stage,
}) => {
  await stage.mount((SR) => {
    const s = new SR.Stage({ channel: false });
    const photo = SR.Frame(SR.paths.box({ radius: 14 }), SR.Text("Photo"), {
      id: "exit-photo",
      position: [47, 61],
      origin: "center",
      width: 64,
      height: 36,
      rotation: -2,
      rotationX: -16,
      rotationY: 28,
    });
    const video = SR.Frame(SR.paths.box(), SR.Text("Video"), {
      id: "exit-video",
      position: [116, 31],
      origin: "center",
      width: 60,
      height: 33.75,
      scale: 0.85,
      rotation: 2,
      rotationX: 18,
      rotationY: -28,
    });
    const incoming = SR.Card("Live tools", {
      id: "media-next",
      position: [10, 39],
      width: 140,
      height: 40,
      enterDelay: 0.26,
    });
    const samples: number[][] = [];
    photo.onUpdate(() => {
      samples.push([photo.x, video.x, photo.opacity, video.opacity]);
      photo.domElement.dataset.samples = JSON.stringify(samples);
    });
    incoming.onUpdate(() => {
      if (incoming.opacity > 0 && (photo.opacity > 0 || video.opacity > 0)) {
        incoming.domElement.dataset.overlap = "true";
      }
    });
    s.scene("Media").with(photo, video);
    s.pause();
    s.scene("Live").with(incoming);
    photo.to({ x: -48 }).duration(0.25).ease("cubicInOut");
    video.to({ x: 205 }).duration(0.25).ease("cubicInOut");
    SR.group(photo, video).to({ opacity: 0 }).duration(0.12).delay(0.12).ease("linear");
    s.pause();
    return s;
  });
  const photo = stage.locator("#exit-photo");
  const readStyles = () =>
    photo.evaluate((node) => ({
      transform: node.style.transform,
      masks: Array.from(node.querySelectorAll<HTMLElement>("[style]")).map(
        (child) => child.style.clipPath,
      ),
    }));
  const initial = await readStyles();
  await stage.next();
  const samples = JSON.parse((await photo.getAttribute("data-samples")) ?? "[]") as number[][];
  expect(
    samples.some(([x, otherX, opacity]) => x < 0 && otherX > 160 && opacity > 0 && opacity < 1),
  ).toBe(true);
  await expect(stage.locator("#media-next")).not.toHaveAttribute("data-overlap", "true");
  await expect(photo).toBeHidden();
  await expect(stage.locator("#exit-video")).toBeHidden();
  await stage.prev();
  expect(await readStyles()).toEqual(initial);
});
