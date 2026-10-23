/**
 * In-browser presentation screen recorder and audio capture engine using MediaRecorder.
 */

import { logger } from "../core/logger";

interface ExtendedDisplayMediaOptions extends DisplayMediaStreamOptions {
  controller?: unknown;
  audio?:
    | boolean
    | (MediaTrackConstraints & {
        suppressLocalAudioPlayback?: boolean;
      });
  systemAudio?: "include" | "exclude";
}

const recordingWidth = 2560;
const recordingHeight = 1440;
const recordingFrameRate = 60;

/** Recorder lifecycle and microphone state. @category Presenter */
export interface PresenterRecorderState {
  /** Lifecycle phase. Default: "idle". */
  readonly status: "idle" | "starting" | "recording" | "stopping" | "disposed";
  /** Whether microphone capture is enabled. Default: true. */
  readonly isMicEnabled: boolean;
  /** Elapsed recording time in whole seconds. Default: 0. */
  readonly seconds: number;
  /** Most recent failure; cleared on the next start. Default: null. */
  readonly error: Error | null;
}

/** Records a presentation at 1440p, up to 60 fps and 24 Mbps. @category Presenter */
export class PresenterRecorder {
  private status: PresenterRecorderState["status"] = "idle";
  private error: Error | null = null;
  private startTask: Promise<boolean> | null = null;
  private stopTask: Promise<void> | null = null;
  private disposeTask: Promise<void> | null = null;
  private disposing = false;
  private completion: Promise<void> | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isMicEnabled = true;
  private micTrack: MediaStreamTrack | null = null;
  private micStream: MediaStream | null = null;
  private displayStream: MediaStream | null = null;
  private recordingStream: MediaStream | null = null;
  private captureVideo: HTMLVideoElement | null = null;
  private captureClock: Worker | null = null;
  private mixedAudioTrack: MediaStreamTrack | null = null;
  private audioContext: AudioContext | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private startedAt: number | null = null;
  private seconds = 0;
  private readonly listeners = new Set<(state: PresenterRecorderState) => void>();

  /** Subscribes to state, immediately delivers it, and returns an unsubscribe function. */
  onUpdate(callback: (state: PresenterRecorderState) => void): () => void {
    this.listeners.add(callback);
    callback(this.getState());
    return () => this.listeners.delete(callback);
  }

  /** Returns an immutable state snapshot. */
  getState(): PresenterRecorderState {
    return Object.freeze({
      status: this.status,
      isMicEnabled: this.isMicEnabled,
      seconds:
        this.startedAt === null
          ? this.seconds
          : Math.floor((performance.now() - this.startedAt) / 1000),
      error: this.error,
    });
  }

  /** Toggles the microphone; initially enabled. */
  toggleMic(): void {
    this._assertUsable();
    this.isMicEnabled = !this.isMicEnabled;
    if (this.micTrack) this.micTrack.enabled = this.isMicEnabled;
    this._emit();
  }

  /** Starts capture; returns false if declined or cancelled. Other failures reject. */
  start(): Promise<boolean> {
    try {
      this._assertUsable();
      if (this.stopTask)
        throw new DOMException("Recording is still stopping.", "InvalidStateError");
    } catch (error) {
      return Promise.reject(error);
    }
    if (this.startTask) return this.startTask;
    if (this.status === "recording") return Promise.resolve(true);
    this.error = null;
    this.seconds = 0;
    this.status = "starting";
    this.startTask = this._start().finally(() => {
      this.startTask = null;
      if (this.status === "starting") {
        this.status = "idle";
        this._emit();
      }
    });
    this._emit();
    return this.startTask;
  }

  /** Finalizes and downloads the video before resolving. Idle calls do nothing. */
  stop(): Promise<void> {
    return this._stop(true);
  }

  /** Discards the current recording and releases resources. This instance cannot restart. */
  dispose(): Promise<void> {
    if (this.disposeTask) return this.disposeTask;
    this.disposing = true;
    this.disposeTask = this._stop(false).finally(() => {
      this.status = "disposed";
      this._emit();
      this.listeners.clear();
    });
    return this.disposeTask;
  }

  private _assertUsable(): void {
    if (this.disposing || this.status === "disposed") {
      throw new DOMException("Recorder has been disposed.", "InvalidStateError");
    }
  }

  private async _start(): Promise<boolean> {
    let started = false;

    try {
      let controller: unknown;
      const CaptureControllerCtor = (
        window as unknown as {
          CaptureController?: new () => {
            setFocusBehavior?: (behavior: string) => void;
          };
        }
      ).CaptureController;

      if (CaptureControllerCtor) {
        const c = new CaptureControllerCtor();
        if (typeof c.setFocusBehavior === "function") {
          try {
            c.setFocusBehavior("no-focus-change");
          } catch {
            // Ignore if focus change behavior is not permitted or rejected
          }
        }
        controller = c;
      }

      const video: MediaTrackConstraints = {
        frameRate: { ideal: recordingFrameRate, max: recordingFrameRate },
        displaySurface: "browser",
        width: { ideal: recordingWidth },
        height: { ideal: recordingHeight },
      };
      const displayOptions: ExtendedDisplayMediaOptions = {
        video,
        audio: {
          suppressLocalAudioPlayback: false,
        },
        systemAudio: "include",
      };

      if (controller) {
        displayOptions.controller = controller;
      }

      this.displayStream = await navigator.mediaDevices.getDisplayMedia(displayOptions);
      if (this.status !== "starting") return false;
      const videoTrack = this.displayStream.getVideoTracks()[0];
      if (!videoTrack) throw new Error("Display capture returned no video track.");
      videoTrack.onended = () => {
        void this.stop().catch((error) => logger.warn("Recording stopped with an error:", error));
      };
      this.recordingStream = await this._createRecordingVideo(this.displayStream);
      if (this.status !== "starting") return false;

      // Capture microphone with acoustic echo cancellation and noise suppression
      try {
        this.micStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000,
          },
        });
        this.micTrack = this.micStream.getAudioTracks()[0] ?? null;
        if (this.micTrack) {
          this.micTrack.enabled = this.isMicEnabled;
        }
      } catch (micErr) {
        logger.warn("Microphone access not granted or unavailable:", micErr);
        this.micStream = null;
        this.micTrack = null;
      }

      if (this.status !== "starting") return false;
      const displayAudioTrack = this.displayStream.getAudioTracks()[0] ?? null;
      let recordingAudioTrack: MediaStreamTrack | null = null;

      // Mix display audio + mic if both are available
      if (displayAudioTrack && this.micTrack) {
        this.audioContext = new AudioContext();
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }

        const compressor = this.audioContext.createDynamicsCompressor();
        const dest = this.audioContext.createMediaStreamDestination();
        compressor.connect(dest);

        const displaySource = this.audioContext.createMediaStreamSource(
          new MediaStream([displayAudioTrack]),
        );
        displaySource.connect(compressor);

        const micSource = this.audioContext.createMediaStreamSource(
          new MediaStream([this.micTrack]),
        );
        micSource.connect(compressor);

        this.mixedAudioTrack = dest.stream.getAudioTracks()[0] ?? null;
        recordingAudioTrack = this.mixedAudioTrack;
      } else if (this.micTrack) {
        recordingAudioTrack = this.micTrack;
      } else if (displayAudioTrack) {
        recordingAudioTrack = displayAudioTrack;
      }

      if (this.status !== "starting" || videoTrack.readyState === "ended") return false;
      const combinedTracks: MediaStreamTrack[] = [
        ...this.recordingStream.getVideoTracks(),
        ...(recordingAudioTrack ? [recordingAudioTrack] : []),
      ];
      const stream = new MediaStream(combinedTracks);

      this.recordedChunks = [];
      let mimeType = "video/webm";

      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
        mimeType = "video/webm;codecs=vp9,opus";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9";
      } else if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2")) {
        mimeType = "video/mp4;codecs=avc1,mp4a.40.2";
      } else if (MediaRecorder.isTypeSupported("video/mp4")) {
        mimeType = "video/mp4";
      }

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 24_000_000,
        audioBitsPerSecond: 192_000,
      });
      this.mediaRecorder = mediaRecorder;

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onerror = (event) => {
        this.error =
          (event as Event & { error?: DOMException }).error ?? new Error("Video encoding failed.");
        void this.stop().catch((error) => logger.warn("Recording failed:", error));
      };

      this.completion = new Promise<void>((resolve) => {
        mediaRecorder.onstop = () => {
          resolve();
          if (this.status === "recording") {
            void this.stop().catch((error) =>
              logger.warn("Recording stopped with an error:", error),
            );
          }
        };
      });
      this.mediaRecorder.start(100);
      started = true;
      this.status = "recording";
      this.startedAt = performance.now();
      this.timerInterval = setInterval(() => this._emit(), 1000);
      this._emit();
      return true;
    } catch (error) {
      if (this.status !== "starting") return false;
      if (error instanceof DOMException && error.name === "NotAllowedError") return false;
      this.error = error instanceof Error ? error : new Error(String(error));
      throw this.error;
    } finally {
      if (!started) {
        await this._cleanupHardware();
        this.mediaRecorder = null;
        this.completion = null;
      }
    }
  }

  private _stop(download: boolean): Promise<void> {
    if (this.stopTask) return this.stopTask;
    if (this.status === "idle" || this.status === "disposed") return Promise.resolve();
    this.seconds = this.getState().seconds;
    this.startedAt = null;
    if (this.timerInterval) clearInterval(this.timerInterval);
    this.timerInterval = null;
    this.status = "stopping";
    this.stopTask = this._finish(download).finally(() => {
      this.stopTask = null;
      this.status = this.disposing ? "disposed" : "idle";
      this._emit();
    });
    this._emit();
    return this.stopTask;
  }

  private async _finish(download: boolean): Promise<void> {
    try {
      await this.startTask?.catch(() => false);
      if (this.mediaRecorder) {
        if (this.mediaRecorder.state !== "inactive") this.mediaRecorder.stop();
        await this.completion;
        if (this.error) throw this.error;
        if (download && !this.disposing && this.recordedChunks.length > 0) {
          this._download(this.mediaRecorder.mimeType);
        }
      }
    } catch (error) {
      this.error = error instanceof Error ? error : new Error(String(error));
      throw this.error;
    } finally {
      await this._cleanupHardware();
      this.mediaRecorder = null;
      this.completion = null;
      this.recordedChunks = [];
    }
  }

  private async _cleanupHardware(): Promise<void> {
    this.captureClock?.terminate();
    this.captureClock = null;
    if (this.captureVideo) {
      this.captureVideo.pause();
      this.captureVideo.srcObject = null;
      this.captureVideo = null;
    }
    if (this.recordingStream) {
      for (const track of this.recordingStream.getTracks()) track.stop();
      this.recordingStream = null;
    }
    if (this.mixedAudioTrack) {
      this.mixedAudioTrack.stop();
      this.mixedAudioTrack = null;
    }
    if (this.displayStream) {
      for (const track of this.displayStream.getTracks()) {
        track.onended = null;
        track.stop();
      }
      this.displayStream = null;
    }
    if (this.micStream) {
      for (const track of this.micStream.getTracks()) {
        track.stop();
      }
      this.micStream = null;
    }
    this.micTrack = null;

    if (this.audioContext && this.audioContext.state !== "closed") {
      await this.audioContext.close();
      this.audioContext = null;
    }
  }

  private async _createRecordingVideo(source: MediaStream): Promise<MediaStream> {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.srcObject = source;
    this.captureVideo = video;
    await video.play();

    // Source dimensions may change when switching tabs or entering fullscreen.
    const canvas = document.createElement("canvas");
    canvas.width = recordingWidth;
    canvas.height = recordingHeight;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("Recording canvas is unavailable.");
    const draw = () => {
      if (!video.videoWidth || !video.videoHeight) return;
      // The stage is centered and fitted inside the captured presentation tab.
      const scale = Math.max(canvas.width / video.videoWidth, canvas.height / video.videoHeight);
      const width = canvas.width / scale;
      const height = canvas.height / scale;
      context.drawImage(
        video,
        (video.videoWidth - width) / 2,
        (video.videoHeight - height) / 2,
        width,
        height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
    };
    draw();
    // A worker clock keeps drawing when the presenter tab is in the background.
    const clockURL = URL.createObjectURL(
      new Blob([`setInterval(() => postMessage(null), 1000 / ${recordingFrameRate})`], {
        type: "text/javascript",
      }),
    );
    try {
      this.captureClock = new Worker(clockURL);
    } finally {
      URL.revokeObjectURL(clockURL);
    }
    this.captureClock.onmessage = draw;
    return canvas.captureStream(recordingFrameRate);
  }

  private _emit(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (error) {
        logger.warn("Recorder state listener failed:", error);
      }
    }
  }

  private _download(mimeType: string): void {
    const fileExtension = mimeType.startsWith("video/mp4") ? "mp4" : "webm";
    const blob = new Blob(this.recordedChunks, { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stageroutine_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}.${fileExtension}`;
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }
}
