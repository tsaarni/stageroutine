/**
 * Standalone reactive Webcam component for live presenter video feeds.
 */

import "./Media.css";
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

/** Public controls for a webcam. @category Components */
export interface WebcamElement extends DOMElement {
  fit: ImageFit;
  mirror: boolean;
  deviceId: string | undefined;
  start(): Promise<void>;
  stop(): void;
  cycleCamera(): Promise<void>;
}

/**
 * Reactive Webcam element wrapping a native <video> element connected to getUserMedia stream.
 * @internal
 */
class WebcamElementImpl extends DOMElement implements WebcamElement {
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
      storage.local.set("components.webcam.deviceId", val);
    }
    if (this.stream) {
      void this.start();
    }
  }

  /**
   * Discovers and lists all connected video input cameras.
   */
  static async getCameras(): Promise<CameraDevice[]> {
    // mediaDevices is undefined in insecure contexts (non-HTTPS/non-localhost)
    if (!navigator.mediaDevices?.enumerateDevices) {
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

  override update(): void {
    if (this.videoElement) {
      if (this._fit && this.videoElement.style.objectFit !== this._fit) {
        this.videoElement.style.objectFit = this._fit;
      }
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
    this._deviceId =
      options.deviceId ?? storage.local.get<string | undefined>("components.webcam.deviceId");
    this._facingMode = options.facingMode ?? "user";
    this.idealWidth = options.idealWidth ?? 1280;
    this.idealHeight = options.idealHeight ?? 720;

    if (options.cycleOnClick ?? true) {
      video.style.cursor = "pointer";
      video.title = "Double-click to cycle cameras";
      video.addEventListener("dblclick", (e) => {
        e.stopPropagation();
        void this.cycleCamera();
      });
    }

    // React to multi-window / presenter console camera switches
    storage.local.subscribe<string>("components.webcam.deviceId", (newId) => {
      if (newId && newId !== this._deviceId) {
        this._deviceId = newId;
        void this.start();
      }
    });

    this.onActivate(() => {
      void this.start();
    });

    this.onDeactivate(() => {
      this.stop();
    });
  }

  /**
   * Starts the webcam video stream.
   */
  async start(): Promise<void> {
    // mediaDevices is undefined in insecure contexts (non-HTTPS/non-localhost)
    if (!navigator.mediaDevices?.getUserMedia) {
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
    } catch {
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
    const cameras = await WebcamElementImpl.getCameras();
    if (cameras.length <= 1) return;

    const currentIndex = cameras.findIndex((c) => c.id === this._deviceId);
    const nextIndex = (currentIndex + 1) % cameras.length;
    const nextCam = cameras[nextIndex];
    if (nextCam) {
      this._deviceId = nextCam.id;
      storage.local.set("components.webcam.deviceId", nextCam.id);
      await this.start();
    }
  }
}

/**
 * Creates a live reactive Webcam element on stage.
 *
 * @category Components
 * @example
 * ```tsx
 * // Presenter bubble avatar in the bottom-right corner:
 * const presenter = Frame(paths.circle(), Webcam({ mirror: true }), {
 *   x: "bottom-right",
 *   size: 180,
 *   active: true,
 * });
 * ```
 */
export function Webcam(options: WebcamOptions = {}): WebcamElement {
  const stage = getActiveStage();
  const el = new WebcamElementImpl(options);
  if (stage && typeof stage.registerElement === "function") {
    return stage.registerElement(el) as WebcamElement;
  }
  return el;
}

export namespace Webcam {
  /** Discovers and lists all connected video input cameras. */
  export async function getCameras(): Promise<CameraDevice[]> {
    return WebcamElementImpl.getCameras();
  }
}
