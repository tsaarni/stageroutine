/**
 * 3D starfield particle background using Three.js with smooth forward motion.
 */

import * as THREE from "three";
import type { StageContext } from "../../core/types";
import { BackgroundElement, type BackgroundOptions } from "./base";

/**
 * Configuration options for the 3D Starfield background.
 * @category Backgrounds
 */
export interface StarfieldOptions extends Omit<BackgroundOptions, "color"> {
  /** Number of star particles (default: 2000) */
  count?: number;
  /** Base travel speed through starfield (default: 1.0) */
  speed?: number;
  /** Color of stars (default: 0xffffff) */
  color?: number | string;
  /** Particle size in pixels (default: 2.5) */
  size?: number;
  /** Radius of space spread (default: 2000) */
  spread?: number;
}

/**
 * @internal
 */
export class StarfieldElement extends BackgroundElement {
  private renderer: THREE.WebGLRenderer | null = null;
  private scene: THREE.Scene | null = null;
  private camera: THREE.PerspectiveCamera | null = null;
  private stars: THREE.Points | null = null;
  private animFrameId: number | null = null;
  private unbindScene: (() => void) | null = null;

  private count: number;
  private baseSpeed: number;
  private spread: number;
  private targetSpeed: number;
  private targetRotX = 0;
  private targetRotY = 0;

  constructor(options: StarfieldOptions = {}) {
    const { color: _c, ...elementOpts } = options;
    super("Starfield", elementOpts);

    this.count = options.count ?? 2000;
    this.baseSpeed = options.speed ?? 1.0;
    this.targetSpeed = this.baseSpeed;
    this.spread = options.spread ?? 2000;
    const color = options.color ?? 0xffffff;
    const size = options.size ?? 2.5;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      1,
      this.spread * 1.5,
    );
    this.camera.position.z = 1000;

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    const canvas = this.renderer.domElement;
    canvas.style.position = "absolute";
    canvas.style.inset = "0";
    canvas.style.width = "100%";
    canvas.style.height = "100%";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "0";
    this.domElement.appendChild(canvas);

    // 3. Particles
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.count * 3);

    for (let i = 0; i < this.count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * this.spread;
      positions[i * 3 + 1] = (Math.random() - 0.5) * this.spread;
      positions[i * 3 + 2] = (Math.random() - 0.5) * this.spread;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

    const particleMaterial = new THREE.PointsMaterial({
      color: new THREE.Color(color),
      size,
      transparent: true,
      opacity: 0.8,
    });

    this.stars = new THREE.Points(geometry, particleMaterial);
    this.scene.add(this.stars);

    this.resume();
  }

  override attach(stage: StageContext): void {
    super.attach(stage);

    // Smooth tilt and warp burst on scene changes
    this.unbindScene = stage.on("nav:sceneChanged", ({ to }) => {
      this.targetSpeed = this.baseSpeed * 3.5;
      setTimeout(() => {
        this.targetSpeed = this.baseSpeed;
      }, 1200);

      let hash = 0;
      const name = to || "";
      for (let i = 0; i < name.length; i++) {
        hash = (hash << 5) - hash + name.charCodeAt(i);
      }
      this.targetRotX = ((hash % 100) / 100) * 0.4 - 0.2;
      this.targetRotY = (((hash >> 2) % 100) / 100) * 0.4 - 0.2;
    });
  }

  onResize(width: number, height: number): void {
    if (!this.camera || !this.renderer) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  resume(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    const animate = () => {
      if (!this.isRunning || !this.stars || !this.camera || !this.renderer || !this.scene) return;

      const posAttr = this.stars.geometry.attributes.position;
      const posArray = posAttr.array as Float32Array;

      for (let i = 2; i < this.count * 3; i += 3) {
        posArray[i] += this.targetSpeed * 2.0;
        if (posArray[i] > 1000) {
          posArray[i] -= this.spread;
        }
      }
      posAttr.needsUpdate = true;

      this.camera.rotation.x += (this.targetRotX - this.camera.rotation.x) * 0.05;
      this.camera.rotation.y += (this.targetRotY - this.camera.rotation.y) * 0.05;

      this.renderer.render(this.scene, this.camera);
      this.animFrameId = requestAnimationFrame(animate);
    };

    this.animFrameId = requestAnimationFrame(animate);
  }

  pause(): void {
    this.isRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  dispose(): void {
    this.pause();
    if (this.unbindScene) {
      this.unbindScene();
      this.unbindScene = null;
    }
    if (this.stars) {
      this.stars.geometry.dispose();
      (this.stars.material as THREE.Material).dispose();
      this.stars = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer.domElement.remove();
      this.renderer = null;
    }
    this.scene = null;
    this.camera = null;
  }
}

/**
 * Creates an interactive 3D Starfield background element.
 * @category Backgrounds
 */
export function Starfield(options: StarfieldOptions = {}): StarfieldElement {
  return new StarfieldElement(options);
}
