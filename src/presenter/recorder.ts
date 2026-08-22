/**
 * In-browser screen recorder using MediaRecorder to capture and download presentation video.
 */
export class PresenterRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private isRecording = false;
  private timerInterval: ReturnType<typeof setInterval> | null = null;
  private seconds = 0;
  private onStateChange?: (state: {
    isRecording: boolean;
    seconds: number;
    formattedTime: string;
  }) => void;

  onUpdate(
    callback: (state: {
      isRecording: boolean;
      seconds: number;
      formattedTime: string;
    }) => void,
  ): void {
    this.onStateChange = callback;
  }

  async start(): Promise<void> {
    if (this.isRecording) return;

    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          frameRate: { ideal: 60, max: 60 },
          displaySurface: "browser",
        },
        audio: false,
      });

      this.recordedChunks = [];
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";

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
      console.warn("Screen recording cancelled or not permitted:", err);
    }
  }

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

  toggle(): void {
    if (this.isRecording) {
      this.stop();
    } else {
      this.start();
    }
  }

  getRecordingState(): { isRecording: boolean; seconds: number; formattedTime: string } {
    const mins = String(Math.floor(this.seconds / 60)).padStart(2, "0");
    const secs = String(this.seconds % 60).padStart(2, "0");
    return {
      isRecording: this.isRecording,
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
    a.style.display = "none";
    a.href = url;
    a.download = `stageroutine_${new Date().toISOString().slice(0, 19).replace(/[:.]/g, "-")}.webm`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }
}
