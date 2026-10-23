import { expect, test } from "../helpers/stage";

test("recording stays at 1440p when the selected source changes dimensions", async ({
  page,
  stage: _stage,
}) => {
  const foreground = await page.context().newPage();
  await foreground.bringToFront();
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 640;
    canvas.height = 400;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Missing canvas context");
    context.fillStyle = "#123456";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#ff0000";
    context.fillRect(0, 0, canvas.width, 20);
    context.fillRect(0, 380, canvas.width, 20);
    const stream = canvas.captureStream(30);
    let requested: DisplayMediaStreamOptions | undefined;
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      value: async (options: DisplayMediaStreamOptions) => {
        requested = options;
        return stream;
      },
    });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => new MediaStream(),
    });
    const createURL = URL.createObjectURL.bind(URL);
    const downloaded = new Promise<Blob>((resolve) => {
      URL.createObjectURL = (blob) => {
        if (blob instanceof Blob && blob.type.startsWith("video/")) resolve(blob);
        return createURL(blob);
      };
    });
    HTMLAnchorElement.prototype.click = () => {};
    const recorder = new window.__SR__.PresenterRecorder();
    const statuses: string[] = [];
    const unsubscribe = recorder.onUpdate((state) => statuses.push(state.status));
    const started = await recorder.start();
    const recording = recorder.getState().status === "recording";
    await new Promise((resolve) => setTimeout(resolve, 350));
    canvas.width = 800;
    canvas.height = 450;
    context.fillStyle = "#ff0000";
    context.fillRect(0, 0, canvas.width, canvas.height);
    await new Promise((resolve) => setTimeout(resolve, 350));
    await recorder.stop();
    const blob = await downloaded;
    const video = document.createElement("video");
    video.src = createURL(blob);
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("Recorded video cannot be decoded"));
    });
    const dimensions = [video.videoWidth, video.videoHeight];
    video.currentTime = 0.5;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });
    const sample = document.createElement("canvas");
    sample.width = 1;
    sample.height = 1;
    const sampleContext = sample.getContext("2d");
    if (!sampleContext) throw new Error("Missing sample context");
    sampleContext.drawImage(video, 1280, 720, 1, 1, 0, 0, 1, 1);
    const red = sampleContext.getImageData(0, 0, 1, 1).data[0];
    const resizedDimensions = [video.videoWidth, video.videoHeight];
    video.currentTime = 0.15;
    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });
    sampleContext.drawImage(video, 1280, 4, 1, 1, 0, 0, 1, 1);
    const croppedEdge = sampleContext.getImageData(0, 0, 1, 1).data[0];
    URL.revokeObjectURL(video.src);
    unsubscribe();
    return {
      requested: requested?.video,
      dimensions,
      resizedDimensions,
      red,
      croppedEdge,
      recording,
      started,
      statuses,
      state: recorder.getState(),
      frozen: Object.isFrozen(recorder.getState()),
      stopped: stream.getTracks().every((track) => track.readyState === "ended"),
      bytes: blob.size,
    };
  });
  expect(result.requested).toMatchObject({
    width: { ideal: 2560 },
    height: { ideal: 1440 },
    frameRate: { ideal: 60, max: 60 },
  });
  expect(result.recording).toBe(true);
  expect(result.started).toBe(true);
  expect(result.state.status).toBe("idle");
  expect(result.frozen).toBe(true);
  expect(result.statuses.filter((status, index, all) => status !== all[index - 1])).toEqual([
    "idle",
    "starting",
    "recording",
    "stopping",
    "idle",
  ]);
  expect(result.dimensions).toEqual([2560, 1440]);
  expect(result.resizedDimensions).toEqual([2560, 1440]);
  expect(result.red).toBeGreaterThan(200);
  expect(result.croppedEdge).toBeLessThan(50);
  expect(result.stopped).toBe(true);
  expect(result.bytes).toBeGreaterThan(0);
});

test("capture cancellation and failures have distinct API results", async ({
  page,
  stage: _stage,
}) => {
  const result = await page.evaluate(async () => {
    let failure = new DOMException("Picker dismissed", "NotAllowedError");
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      value: async () => {
        throw failure;
      },
    });
    const recorder = new window.__SR__.PresenterRecorder();
    const statuses: string[] = [];
    const unsubscribe = recorder.onUpdate((state) => statuses.push(state.status));
    const cancelled = await recorder.start();
    const afterCancel = recorder.getState();
    failure = new DOMException("Capture unavailable", "NotReadableError");
    const rejected = await recorder.start().then(
      () => "resolved",
      (error: Error) => error.name,
    );
    const afterFailure = recorder.getState();
    const errorMessage = afterFailure.error?.message;
    failure = new DOMException("Picker dismissed", "NotAllowedError");
    await recorder.start();
    const cleared = recorder.getState().error === null;
    unsubscribe();
    const count = statuses.length;
    recorder.toggleMic();
    await recorder.dispose();
    return {
      cancelled,
      afterCancel,
      rejected,
      status: afterFailure.status,
      errorMessage,
      cleared,
      unsubscribed: statuses.length === count,
      disposed: recorder.getState().status,
    };
  });
  expect(result.cancelled).toBe(false);
  expect(result.afterCancel).toMatchObject({ status: "idle", error: null });
  expect(result.rejected).toBe("NotReadableError");
  expect(result.status).toBe("idle");
  expect(result.errorMessage).toBe("Capture unavailable");
  expect(result.cleared).toBe(true);
  expect(result.unsubscribed).toBe(true);
  expect(result.disposed).toBe("disposed");
});

test("dispose during the picker releases late capture and prevents restart", async ({
  page,
  stage: _stage,
}) => {
  const result = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    const source = canvas.captureStream();
    let accept: ((stream: MediaStream) => void) | undefined;
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      value: () =>
        new Promise<MediaStream>((resolve) => {
          accept = resolve;
        }),
    });
    const recorder = new window.__SR__.PresenterRecorder();
    const starting = recorder.start();
    const sharedStart = recorder.start() === starting;
    const pending = recorder.getState().status;
    const disposing = recorder.dispose();
    const sharedDispose = recorder.dispose() === disposing;
    const stopping = recorder.getState().status;
    accept?.(source);
    const started = await starting;
    await disposing;
    const rejected = await recorder.start().then(
      () => "resolved",
      (error: Error) => error.name,
    );
    return {
      sharedStart,
      sharedDispose,
      pending,
      stopping,
      started,
      rejected,
      status: recorder.getState().status,
      ended: source.getTracks().every((track) => track.readyState === "ended"),
    };
  });
  expect(result).toEqual({
    sharedStart: true,
    sharedDispose: true,
    pending: "starting",
    stopping: "stopping",
    started: false,
    rejected: "InvalidStateError",
    status: "disposed",
    ended: true,
  });
});

test("stop awaits download and cleanup, permits restart, and dispose discards", async ({
  page,
  stage: _stage,
}) => {
  const result = await page.evaluate(async () => {
    const sources: MediaStream[] = [];
    Object.defineProperty(navigator.mediaDevices, "getDisplayMedia", {
      value: async () => {
        const canvas = document.createElement("canvas");
        canvas.width = 64;
        canvas.height = 36;
        canvas.getContext("2d")?.fillRect(0, 0, 64, 36);
        const stream = canvas.captureStream(60);
        sources.push(stream);
        return stream;
      },
    });
    Object.defineProperty(navigator.mediaDevices, "getUserMedia", {
      value: async () => new MediaStream(),
    });
    let downloads = 0;
    HTMLAnchorElement.prototype.click = () => {
      downloads++;
    };
    const recorder = new window.__SR__.PresenterRecorder();
    const original = recorder.getState();
    recorder.toggleMic();
    await recorder.start();
    await new Promise((resolve) => setTimeout(resolve, 150));
    const stopping = recorder.stop();
    const sharedStop = recorder.stop() === stopping;
    const statusWhileStopping = recorder.getState().status;
    const blocked = await recorder.start().then(
      () => "resolved",
      (error: Error) => error.name,
    );
    await stopping;
    const afterStop = {
      status: recorder.getState().status,
      downloads,
      ended: sources[0].getTracks().every((track) => track.readyState === "ended"),
    };
    const restarted = await recorder.start();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await recorder.dispose();
    await recorder.stop();
    return {
      originalUnchanged: original.isMicEnabled,
      muted: !recorder.getState().isMicEnabled,
      sharedStop,
      statusWhileStopping,
      blocked,
      afterStop,
      restarted,
      downloads,
      disposed: recorder.getState().status,
      ended: sources.every((source) =>
        source.getTracks().every((track) => track.readyState === "ended"),
      ),
    };
  });
  expect(result.originalUnchanged).toBe(true);
  expect(result.muted).toBe(true);
  expect(result.sharedStop).toBe(true);
  expect(result.statusWhileStopping).toBe("stopping");
  expect(result.blocked).toBe("InvalidStateError");
  expect(result.afterStop).toEqual({ status: "idle", downloads: 1, ended: true });
  expect(result.restarted).toBe(true);
  expect(result.downloads).toBe(1);
  expect(result.disposed).toBe("disposed");
  expect(result.ended).toBe(true);
});
