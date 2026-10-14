/**
 * Shared reactive media surface for Image, Video, and Webcam.
 */

import { logger } from "../../core/index";
import { DOMElementImpl } from "../element";

/**
 * Media object-fit scaling mode:
 * - "contain" (default): Scales media to fit inside bounds while preserving aspect ratio.
 * - "cover": Zooms and fills bounds completely, cropping overflow.
 * - "fill": Stretches media to exact bounds.
 * - "none": Displays media at intrinsic pixel size.
 * - "scale-down": Scales down like "contain" if larger than container, otherwise behaves like "none".
 * @category Components
 */
export type ImageFit = "contain" | "cover" | "fill" | "none" | "scale-down";

/**
 * @internal Base class for elements wrapping a single media node.
 */
export abstract class MediaSurface extends DOMElementImpl {
  private _fit: ImageFit = "contain";

  /** Media node that receives `object-fit`. @internal */
  protected abstract get mediaNode(): HTMLElement;

  get fit(): ImageFit {
    return this._fit;
  }

  set fit(val: ImageFit) {
    this._fit = val;
    this.mediaNode.style.objectFit = val;
  }

  /** Applies the initial fit without recording a reactive mutation. */
  protected applyInitialFit(fit: ImageFit): void {
    this._fit = fit;
    this.mediaNode.style.objectFit = fit;
  }
}

/**
 * @internal Base class for elements wrapping an HTMLVideoElement.
 */
export abstract class VideoSurface extends MediaSurface {
  private _playing = false;
  private playbackRequest?: Promise<void>;

  /** The video node controlled by this surface. @internal */
  protected abstract get videoNode(): HTMLVideoElement;

  protected override get mediaNode(): HTMLElement {
    return this.videoNode;
  }

  get playing(): boolean {
    return this._playing;
  }

  set playing(val: boolean) {
    this._playing = val;
    if (val) {
      this.resumePlayback();
    } else {
      this.pausePlayback();
    }
  }

  async play(): Promise<void> {
    this.playing = true;
    await this.playbackRequest;
  }

  pause(): void {
    this.playing = false;
  }

  /** Resumes playback on scene activate and pauses on deactivate. */
  protected bindPlaybackLifecycle(): void {
    this.onActivate(() => this.resumePlayback());
    this.onDeactivate(() => this.pausePlayback());
  }

  private resumePlayback(): void {
    if (!this._playing || !this.isActive || !this.videoNode.paused) return;
    this.playbackRequest = this.videoNode.play();
    this.playbackRequest.catch((err) => {
      logger.warn("[StageRoutine] Video playback failed:", err);
    });
  }

  private pausePlayback(): void {
    if (!this.videoNode.paused) {
      this.videoNode.pause();
    }
  }
}
