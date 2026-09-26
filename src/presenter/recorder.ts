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

/**
 * In-browser screen recorder using MediaRecorder to capture and download presentation video.
 * @category Presenter
 */
export class PresenterRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private isStarting = false;
  private isMicEnabled = true;
  private micTrack: MediaStreamTrack | null = null;
  private micStream: MediaStream | null = null;
  private displayStream: MediaStream | null = null;
  private mixedAudioTrack: MediaStreamTrack | null = null;
  private audioContext: AudioContext | null = null;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private seconds = 0;
  private onStateChange?: (state: {
    isRecording: boolean;
    isMicEnabled: boolean;
    seconds: number;
    formattedTime: string;
  }) => void;

  onUpdate(
    callback: (state: {
      isRecording: boolean;
      isMicEnabled: boolean;
      seconds: number;
      formattedTime: string;
    }) => void,
  ): void {
    this.onStateChange = callback;
  }

  /** Toggles microphone audio track capture on or off. */
  toggleMic(): void {
    this.isMicEnabled = !this.isMicEnabled;
    if (this.micTrack) {
      this.micTrack.enabled = this.isMicEnabled;
    }
    this._emit();
  }

  /** Prompts for display capture and starts screen recording. */
  async start(): Promise<void> {
    if (this.isRecording || this.isStarting) return;
    this.isStarting = true;

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

      const displayOptions: ExtendedDisplayMediaOptions = {
        video: {
          frameRate: { ideal: 60, max: 60 },
          displaySurface: "browser",
        },
        audio: {
          suppressLocalAudioPlayback: false,
        },
        systemAudio: "include",
      };

      if (controller) {
        displayOptions.controller = controller;
      }

      this.displayStream = await navigator.mediaDevices.getDisplayMedia(displayOptions);

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

      const combinedTracks: MediaStreamTrack[] = [
        ...this.displayStream.getVideoTracks(),
        ...(recordingAudioTrack ? [recordingAudioTrack] : []),
      ];
      const stream = new MediaStream(combinedTracks);

      this.recordedChunks = [];
      let mimeType = "video/webm";
      let fileExtension = "webm";

      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
        mimeType = "video/webm;codecs=vp9,opus";
        fileExtension = "webm";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9";
        fileExtension = "webm";
      } else if (MediaRecorder.isTypeSupported("video/mp4;codecs=avc1,mp4a.40.2")) {
        mimeType = "video/mp4;codecs=avc1,mp4a.40.2";
        fileExtension = "mp4";
      } else if (MediaRecorder.isTypeSupported("video/mp4")) {
        mimeType = "video/mp4";
        fileExtension = "mp4";
      }

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 25_000_000,
        audioBitsPerSecond: 192_000,
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onerror = (e) => {
        logger.warn("MediaRecorder encountered an error:", e);
        this.stop();
      };

      this.mediaRecorder.onstop = () => {
        this._finishRecording(mimeType, fileExtension);
        this._cleanupHardware();
      };

      const videoTrack = this.displayStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.onended = () => {
          if (this.isRecording) {
            this.stop();
          }
        };
      }

      this.mediaRecorder.start(100);
      this.isRecording = true;
      this.seconds = 0;
      this._emit();

      this.timerInterval = setInterval(() => {
        this.seconds++;
        this._emit();
      }, 1000);
    } catch (err) {
      logger.warn("Screen recording failed or was cancelled:", err);
      this._cleanupHardware();
    } finally {
      this.isStarting = false;
    }
  }

  /** Stops recording and downloads the captured video. */
  stop(): void {
    if (!this.isRecording) return;
    this.isRecording = false;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.mediaRecorder) {
      if (this.mediaRecorder.state !== "inactive") {
        try {
          this.mediaRecorder.stop();
        } catch (err) {
          logger.warn("Failed to stop MediaRecorder cleanly:", err);
          this._cleanupHardware();
        }
      } else {
        this._cleanupHardware();
      }
    } else {
      this._cleanupHardware();
    }

    this._emit();
  }

  /** Starts recording if currently stopped, or stops if currently recording. */
  toggle(): void {
    if (this.isRecording) {
      this.stop();
    } else {
      void this.start();
    }
  }

  /** Returns the current recording state snapshot. */
  getRecordingState(): {
    isRecording: boolean;
    isMicEnabled: boolean;
    seconds: number;
    formattedTime: string;
  } {
    const mins = String(Math.floor(this.seconds / 60)).padStart(2, "0");
    const secs = String(this.seconds % 60).padStart(2, "0");
    return {
      isRecording: this.isRecording,
      isMicEnabled: this.isMicEnabled,
      seconds: this.seconds,
      formattedTime: `${mins}:${secs}`,
    };
  }

  private _cleanupHardware(): void {
    if (this.mixedAudioTrack) {
      this.mixedAudioTrack.stop();
      this.mixedAudioTrack = null;
    }
    if (this.displayStream) {
      for (const track of this.displayStream.getTracks()) {
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
      void this.audioContext.close();
      this.audioContext = null;
    }
  }

  private _emit(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getRecordingState());
    }
  }

  private _finishRecording(mimeType: string, fileExtension: string): void {
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
