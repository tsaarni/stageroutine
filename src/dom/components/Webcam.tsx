/**
 * Standalone reactive Webcam component for live presenter video feeds.
 */

import { getActiveStage } from "../../core/index";
import { storage } from "../../core/storage";
import { DOMElement, type ElementOptions } from "../element";
import type { ImageFit } from "./Image";

/**
 * Camera device info descriptor.
 * @category Components
 */
export interface CameraDevice {
  id: string;
  label: string;
}

/**
 * Configuration options for the Webcam component.
 * @category Components
 */
export interface WebcamOptions extends ElementOptions {
  /** Explicit device ID or camera label substring. */
  deviceId?: string;
  /** Camera orientation: "user" (front selfie) | "environment" (rear camera). Defaults to "user". */
  facingMode?: "user" | "environment";
  /** Mirror horizontally so presenter movement feels natural. Defaults to true for "user" camera. */
  mirror?: boolean;
  /** Sizing fit: "cover" (default, ideal for round avatars) | "contain". */
  fit?: ImageFit;
  /** Ideal video capture width in pixels. Defaults to 1280. */
  idealWidth?: number;
  /** Ideal video capture height in pixels. Defaults to 720. */
  idealHeight?: number;
  /** Double-click webcam to cycle through connected cameras. Defaults to true. */
  cycleOnClick?: boolean;
}

/**
 * Reactive Webcam element wrapping a native <video> element connected to getUserMedia stream.
 * @internal
 */
export class WebcamElement extends DOMElement {
  readonly videoElement: HTMLVideoElement;
  private stream: MediaStream | null = null;
  private _fit: ImageFit = "cover";
  private _mirror = true;
  private _deviceId?: string;
  private _facingMode: "user" | "environment" = "user";
  private idealWidth = 1280;
  private idealHeight = 720;

  get fit(): ImageFit {
    return this._fit;
  }

  set fit(val: ImageFit) {
    this._fit = val;
    this.videoElement.style.objectFit = val;
  }

  get mirror(): boolean {
    return this._mirror;
  }

  set mirror(val: boolean) {
    this._mirror = val;
    if (val) {
      this.videoElement.classList.add("is-mirrored");
    } else {
      this.videoElement.classList.remove("is-mirrored");
    }
  }

  get deviceId(): string | undefined {
    return this._deviceId;
  }

  set deviceId(val: string | undefined) {
    this._deviceId = val;
    if (val) {
      storage.set("webcam.deviceId", val);
    }
    if (this.stream) {
      this.start();
    }
  }

  /**
   * Discovers and lists all connected video input cameras.
   */
  static async getCameras(): Promise<CameraDevice[]> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return [];
    }
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices
        .filter((d) => d.kind === "videoinput")
        .map((d, index) => ({
          id: d.deviceId,
          label: d.label || `Camera ${index + 1}`,
        }));
    } catch {
      return [];
    }
  }

  constructor(options: WebcamOptions = {}) {
    const video = document.createElement("video");
    video.className = ["sr-webcam", options.className].filter(Boolean).join(" ");
    video.autoplay = true;
    video.playsInline = true;
    video.muted = true; // prevent any audio feedback loops

    const fit = options.fit ?? "cover";
    video.style.objectFit = fit;

    const mirror = options.mirror ?? options.facingMode !== "environment";
    if (mirror) {
      video.classList.add("is-mirrored");
    }

    super("Webcam", video, options);

    this.videoElement = video;
    this._fit = fit;
    this._mirror = mirror;
    this._deviceId = options.deviceId ?? storage.get<string | undefined>("webcam.deviceId");
    this._facingMode = options.facingMode ?? "user";
    this.idealWidth = options.idealWidth ?? 1280;
    this.idealHeight = options.idealHeight ?? 720;

    if (options.cycleOnClick ?? true) {
      video.style.cursor = "pointer";
      video.title = "Double-click to cycle cameras";
      video.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        this.cycleCamera();
      });
    }

    // React to multi-window / presenter console camera switches
    storage.subscribe<string>("webcam.deviceId", (newId) => {
      if (newId && newId !== this._deviceId) {
        this._deviceId = newId;
        this.start();
      }
    });

    this.onPlay(() => {
      this.start();
    });

    this.onPause(() => {
      this.stop();
    });

    // Start stream if element is initialized
    this.start();
  }

  /**
   * Starts the webcam video stream.
   */
  async start(): Promise<void> {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    // Stop existing stream tracks first
    this.stop();

    const constraints: MediaStreamConstraints = {
      audio: false,
      video: {
        width: { ideal: this.idealWidth },
        height: { ideal: this.idealHeight },
        ...(this._deviceId
          ? { deviceId: { exact: this._deviceId } }
          : { facingMode: this._facingMode }),
      },
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.stream = stream;
      this.videoElement.srcObject = stream;
      await this.videoElement.play();
    } catch (err) {
      // Fallback: try default without strict constraints if exact deviceId failed
      if (this._deviceId) {
        try {
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          this.stream = fallbackStream;
          this.videoElement.srcObject = fallbackStream;
          await this.videoElement.play();
        } catch {
          // webcam access denied or unavailable
        }
      }
    }
  }

  /**
   * Stops the webcam video stream and releases the camera hardware.
   */
  stop(): void {
    if (this.stream) {
      for (const track of this.stream.getTracks()) {
        track.stop();
      }
      this.stream = null;
      this.videoElement.srcObject = null;
    }
  }

  /**
   * Cycles to the next connected camera.
   */
  async cycleCamera(): Promise<void> {
    const cameras = await WebcamElement.getCameras();
    if (cameras.length <= 1) return;

    const currentIndex = cameras.findIndex((c) => c.id === this._deviceId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCam = cameras[nextIndex];
    if (nextCam) {
      this._deviceId = nextCam.id;
      storage.set("webcam.deviceId", nextCam.id);
      await this.start();
    }
  }

  override pause(): void {
    super.pause();
    this.stop();
  }
}

/**
 * Creates a live reactive Webcam element on stage.
 *
 * @category Components
 * @example
 * ```tsx
 * // Presenter bubble avatar in the bottom-right corner:
 * const presenter = Circle(Webcam({ mirror: true }), {
 *   x: "bottom-right",
 *   size: 180,
 *   active: true,
 * });
 * ```
 */
export function Webcam(options: WebcamOptions = {}): WebcamElement {
  const stage = getActiveStage();
  const el = new WebcamElement(options);
  if (stage && typeof stage.registerElement === "function") {
    return stage.registerElement(el) as WebcamElement;
  }
  return el;
}

// Attach static method to factory function for convenient discovery
Webcam.getCameras = WebcamElement.getCameras;
