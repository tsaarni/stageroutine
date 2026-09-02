/**
 * Standalone reactive Video element for screen recordings, video walkthroughs, and animated media.
 */

import { getActiveStage } from "../../core/index";
import type { ReactiveProp } from "../../core/types";
import { DOMElement, type ElementOptions } from "../element";
import type { ImageFit } from "./Image";

/**
 * Configuration options for the Video component.
 * @category Components
 */
export interface VideoOptions extends ElementOptions {
  /** Video source URL or media asset path (optional if passed as first argument). */
  src?: string;
  /** Whether the video is currently playing. Defaults to false. */
  playing?: ReactiveProp<boolean>;
  /** Initial or target playback position in seconds. */
  currentTime?: ReactiveProp<number>;
  /** Playback speed multiplier (e.g. 1.0, 1.5, 2.0). Defaults to 1.0. */
  playbackRate?: ReactiveProp<number>;
  /** Volume level from 0.0 (silent) to 1.0 (maximum). Defaults to 1.0. */
  volume?: ReactiveProp<number>;
  /** Whether audio track is muted. Defaults to true (required for browser autoplay). */
  muted?: boolean;
  /** Whether the video loops automatically when reaching the end. Defaults to false. */
  loop?: boolean;
  /** Sizing fit: "contain" (default) | "cover" | "fill" | "none" | "scale-down". */
  fit?: ImageFit;
  /** Preload policy: "metadata" (default) | "auto" | "none". */
  preload?: "metadata" | "auto" | "none";
  /** Whether clicking the video toggles play/pause interactively. Defaults to true. */
  interactive?: boolean;
  /** Whether to show native browser video controls. Defaults to false. */
  controls?: boolean;
}

/**
 * Reactive Video element wrapping a native <video> DOM node.
 * @internal
 */
export class VideoElement extends DOMElement {
  readonly videoElement: HTMLVideoElement;
  private _fit: ImageFit = "contain";

  get fit(): ImageFit {
    return this._fit;
  }

  set fit(val: ImageFit) {
    this._fit = val;
    this.videoElement.style.objectFit = val;
  }

  get src(): string {
    return this.videoElement.src;
  }

  set src(val: string) {
    this.videoElement.src = val;
  }

  get playing(): boolean {
    return !this.videoElement.paused && !this.videoElement.ended;
  }

  set playing(val: boolean) {
    if (val) {
      this.videoElement.play().catch(() => {
        // Autoplay may require user interaction or muted audio
      });
    } else {
      this.videoElement.pause();
    }
  }

  get currentTime(): number {
    return this.videoElement.currentTime;
  }

  set currentTime(val: number) {
    if (
      typeof (this.videoElement as HTMLVideoElement & { fastSeek?: (t: number) => void })
        .fastSeek === "function"
    ) {
      (this.videoElement as HTMLVideoElement & { fastSeek: (t: number) => void }).fastSeek(val);
    } else {
      this.videoElement.currentTime = val;
    }
  }

  get playbackRate(): number {
    return this.videoElement.playbackRate;
  }

  set playbackRate(val: number) {
    this.videoElement.playbackRate = val;
  }

  get volume(): number {
    return this.videoElement.volume;
  }

  set volume(val: number) {
    this.videoElement.volume = Math.max(0, Math.min(1, val));
  }

  get muted(): boolean {
    return this.videoElement.muted;
  }

  set muted(val: boolean) {
    this.videoElement.muted = val;
  }

  get loop(): boolean {
    return this.videoElement.loop;
  }

  set loop(val: boolean) {
    this.videoElement.loop = val;
  }

  constructor(srcOrOptions: string | VideoOptions = {}, maybeOptions: VideoOptions = {}) {
    const options =
      typeof srcOrOptions === "string" ? { ...maybeOptions, src: srcOrOptions } : srcOrOptions;
    const video = document.createElement("video");
    video.className = ["sr-video", options.className].filter(Boolean).join(" ");
    video.preload = options.preload ?? "metadata";
    video.playsInline = true;
    video.muted = options.muted ?? true;
    video.loop = !!options.loop;

    if (options.src) video.src = options.src;
    if (options.playbackRate !== undefined && typeof options.playbackRate === "number") {
      video.playbackRate = options.playbackRate;
    }
    if (options.volume !== undefined && typeof options.volume === "number") {
      video.volume = options.volume;
    }

    const fit = options.fit ?? "contain";
    video.style.objectFit = fit;

    super("Video", video, options);

    this.videoElement = video;
    this._fit = fit;

    if (options.currentTime !== undefined && typeof options.currentTime === "number") {
      this.currentTime = options.currentTime;
    }
    if (options.playing !== undefined && typeof options.playing === "boolean") {
      this.playing = options.playing;
    }
    if (options.controls) {
      video.controls = true;
    }

    const isInteractive = options.interactive ?? true;
    if (isInteractive) {
      video.style.cursor = "pointer";
      video.addEventListener("click", (e) => {
        e.stopPropagation();
        this.playing = !this.playing;
      });
    }

    // Resume video playback when active and pause when hidden
    this.onActivate(() => {
      if (this.playing && this.videoElement.paused) {
        this.videoElement.play().catch(() => {});
      }
    });

    this.onDeactivate(() => {
      if (!this.videoElement.paused) {
        this.videoElement.pause();
      }
    });
  }
}

/**
 * Creates a reactive native Video player element on stage.
 *
 * @category Components
 * @example
 * ```tsx
 * const demo = Video("./screencast.mp4", {
 *   x: "center",
 *   y: "center",
 *   scale: 0.8,
 *   muted: true,
 *   playing: false,
 * });
 *
 * // In step:
 * demo.playing = true;
 * ```
 */
export function Video(
  srcOrOptions: string | VideoOptions = {},
  maybeOptions: VideoOptions = {},
): VideoElement {
  const stage = getActiveStage();
  const el = new VideoElement(srcOrOptions, maybeOptions);
  if (stage && typeof stage.registerElement === "function") {
    return stage.registerElement(el) as VideoElement;
  }
  return el;
}
