import * as THREE from "three";
import type { Background, StageContext } from "../core/types";

export interface StarfieldOptions {
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
 * Creates an interactive 3D Starfield background using Three.js.
 * Renders continuously in the background and smoothly tilts/speeds up on scene changes.
 */
export function Starfield(options: StarfieldOptions = {}): Background {
  const count = options.count ?? 2000;
  const baseSpeed = options.speed ?? 1.0;
  const color = options.color ?? 0xffffff;
  const size = options.size ?? 2.5;
  const spread = options.spread ?? 2000;

  let animFrameId: number | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let stars: THREE.Points | null = null;

  // Camera animation target values for smooth interpolation
  let targetRotX = 0;
  let targetRotY = 0;
  let targetSpeed = baseSpeed;

  return {
    attach(stage: StageContext) {
      // 1. Scene & Camera
      scene = new THREE.Scene();
      camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        1,
        spread * 1.5,
      );
      camera.position.z = 1000;

      // 2. Renderer
      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(window.innerWidth, window.innerHeight);

      const canvas = renderer.domElement;
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "0";

      // Prepend canvas behind slide viewport
      stage.container.prepend(canvas);

      // 3. Create Star Geometry
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * spread;
        positions[i + 1] = (Math.random() - 0.5) * spread;
        positions[i + 2] = (Math.random() - 0.5) * spread;
      }

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

      const material = new THREE.PointsMaterial({
        color: new THREE.Color(color),
        size,
        transparent: true,
        opacity: 0.85,
      });

      stars = new THREE.Points(geometry, material);
      scene.add(stars);

      // 4. Handle Scene Changes (Smooth Camera Shift & Warp pulse)
      stage.on("sceneChange", ({ stepIndex }) => {
        // Shift camera angle slightly depending on scene index
        targetRotY = ((stepIndex % 4) - 1.5) * 0.15;
        targetRotX = ((stepIndex % 3) - 1) * 0.08;

        // Temporary speed boost on scene switch
        targetSpeed = baseSpeed * 3.5;
        setTimeout(() => {
          targetSpeed = baseSpeed;
        }, 600);
      });

      // 5. Handle Window Resize
      stage.on("resize", ({ width, height }) => {
        if (!camera || !renderer) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
      });

      // 6. Continuous Render Loop
      let currentSpeed = baseSpeed;
      const animate = () => {
        if (!renderer || !scene || !camera || !stars) return;

        // Smoothly interpolate camera rotation
        camera.rotation.y += (targetRotY - camera.rotation.y) * 0.05;
        camera.rotation.x += (targetRotX - camera.rotation.x) * 0.05;

        // Smoothly interpolate speed
        currentSpeed += (targetSpeed - currentSpeed) * 0.08;

        // Fly stars forward
        const posAttr = stars.geometry.attributes.position as THREE.BufferAttribute;
        const array = posAttr.array as Float32Array;

        for (let i = 2; i < count * 3; i += 3) {
          array[i] += currentSpeed * 2.0;
          // Wrap around if passed camera
          if (array[i] > 1000) {
            array[i] -= spread;
          }
        }
        posAttr.needsUpdate = true;

        renderer.render(scene, camera);
        animFrameId = requestAnimationFrame(animate);
      };

      animate();
    },

    dispose() {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
      if (stars) {
        stars.geometry.dispose();
        (stars.material as THREE.Material).dispose();
      }
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
        renderer = null;
      }
      scene = null;
      camera = null;
      stars = null;
    },
  };
}
