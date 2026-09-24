/**
 * In-browser presentation screen recorder and audio capture engine using MediaRecorder.
 */

import { logger } from "../core/logger";

/**
 * In-browser screen recorder using MediaRecorder to capture and download presentation video.
 * @category Presenter
 */
export class PresenterRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private isMicEnabled = true;
  private micTrack: MediaStreamTrack | null = null;
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
    if (this.isRecording) return;

    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 60, max: 60 },
          displaySurface: "browser",
        },
        audio: false,
      });

      // Optionally capture microphone
      let micStream: MediaStream | null = null;
      try {
        micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.micTrack = micStream.getAudioTracks()[0] ?? null;
        if (this.micTrack) {
          this.micTrack.enabled = this.isMicEnabled;
        }
      } catch (micErr) {
        logger.warn("Microphone access not granted or unavailable:", micErr);
        this.micTrack = null;
      }

      // Combine display video and optional mic audio into one stream
      const combinedTracks: MediaStreamTrack[] = [
        ...displayStream.getVideoTracks(),
        ...(this.micTrack ? [this.micTrack] : []),
      ];
      const stream = new MediaStream(combinedTracks);

      this.recordedChunks = [];
      let mimeType = "video/webm";
      if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
        mimeType = "video/webm;codecs=vp9,opus";
      } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9")) {
        mimeType = "video/webm;codecs=vp9";
      }

      this.mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        videoBitsPerSecond: 25_000_000, // 25 Mbps ultra-crisp GPU encoding
      });

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this._finishRecording();
        for (const track of stream.getTracks()) {
          track.stop();
        }
        this.micTrack = null;
      };

      stream.getVideoTracks()[0].onended = () => {
        if (this.isRecording) {
          this.stop();
        }
      };

      this.mediaRecorder.start(100);
      this.isRecording = true;
      this.seconds = 0;
      this._emit();

      this.timerInterval = setInterval(() => {
        this.seconds++;
        this._emit();
      }, 1000);
    } catch (err) {
      logger.warn("Screen recording cancelled or not permitted:", err);
    }
  }

  /** Stops recording and downloads the captured video. */
  stop(): void {
    if (!this.isRecording || !this.mediaRecorder) return;
    this.mediaRecorder.stop();
    this.isRecording = false;

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
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

  private _emit(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getRecordingState());
    }
  }

  private _finishRecording(): void {
    const blob = new Blob(this.recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `stageroutine_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}.webm`;
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 100);
  }
}
