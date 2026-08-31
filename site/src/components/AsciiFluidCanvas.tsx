import type React from "react";
import { useEffect, useRef } from "react";
import * as THREE from "three";

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

const simplexNoiseGlsl = `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m;
    m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
`;

const sharedWaveMathGlsl = `
  vec2 waveCoord = vUv * aspect;

  // Multi-octave organic rolling swells
  float flow1 = snoise(waveCoord * 1.3 + vec2(t * 0.12, -t * 0.08));
  float flow2 = snoise(waveCoord * 1.6 - vec2(t * 0.09, t * 0.11));

  // Primary rolling ocean swell
  vec2 dir1 = vec2(0.85, 0.52);
  float p1 = dot(waveCoord, dir1) * 7.5 + flow1 * 2.8 - t * 0.95;
  float crest1 = pow(0.5 + 0.5 * sin(p1), 3.0);
  vec2 waveDisp1 = (dir1 + vec2(-dir1.y, dir1.x) * flow1 * 0.4) * cos(p1) * 0.35;

  // Secondary counter-swell
  vec2 dir2 = vec2(0.55, -0.83);
  float p2 = dot(waveCoord, dir2) * 6.0 + flow2 * 2.2 - t * 0.70;
  float crest2 = pow(0.5 + 0.5 * sin(p2), 2.5) * 0.40;
  vec2 waveDisp2 = dir2 * cos(p2) * 0.15;

  // Curving surface displacement & intensity
  float ambientSwells = crest1 * 0.85 + crest2;
  vec2 totalDisplacement = (waveDisp1 + waveDisp2) * 0.018;
  float intensity = clamp(ambientSwells * 0.52 + 0.48, 0.0, 0.999);
`;

const asciiFragmentShader = `
  uniform sampler2D u_atlas;
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_cellSize;
  uniform float u_charCount;
  uniform float u_opacity;
  uniform vec3 u_charColor;
  uniform vec3 u_bgColor;

  varying vec2 vUv;

  ${simplexNoiseGlsl}

  void main() {
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
    float t = u_time * 0.38;

    ${sharedWaveMathGlsl}

    // Grid cell quantification on the undulating fluid wave surface
    vec2 displacedUv = vUv - totalDisplacement;
    vec2 pixelCoord = displacedUv * u_resolution;
    vec2 cellUv = fract(pixelCoord / u_cellSize);

    // Letter glyph sampling
    float charIndex = floor(intensity * u_charCount);
    vec2 glyphUv = clamp(cellUv - totalDisplacement * 0.5, 0.02, 0.98);
    float atlasU = (charIndex + glyphUv.x) / u_charCount;
    float glyphAlpha = texture2D(u_atlas, vec2(atlasU, 1.0 - glyphUv.y)).r;

    // Harmonious chromatic palette (sky cyan on deep void black)
    vec3 deepTone   = mix(u_bgColor, u_charColor, 0.35);
    vec3 brightTone = mix(u_charColor, vec3(0.55, 0.80, 0.95), 0.35);
    vec3 activeColor = mix(deepTone, brightTone, smoothstep(0.15, 0.90, intensity));

    activeColor += vec3(0.04, 0.10, 0.15) * length(totalDisplacement) * 5.0;

    float charBrightness = glyphAlpha * (0.30 + intensity * 0.60);
    float cellGlow = smoothstep(0.7, 0.0, length(cellUv - 0.5)) * intensity * 0.10;

    float totalAlpha = clamp((charBrightness + cellGlow) * u_opacity, 0.0, 1.0);
    vec3 color = mix(u_bgColor, activeColor, totalAlpha);

    // Subtle edge vignette
    vec2 uvVignette = vUv * (1.0 - vUv.yx);
    float vig = uvVignette.x * uvVignette.y * 15.0;
    vig = clamp(pow(vig, 0.35), 0.0, 1.0);
    color = mix(u_bgColor, color, vig);

    gl_FragColor = vec4(color, 1.0);
  }
`;

function createGlyphAtlas(chars: string): { texture: THREE.CanvasTexture; charCount: number } {
  const charCount = chars.length;
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size * charCount;
  canvas.height = size;

  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.font = `bold ${Math.floor(size * 0.78)}px monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff";

    for (let i = 0; i < charCount; i++) {
      ctx.fillText(chars[i], i * size + size / 2, size / 2);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return { texture, charCount };
}

export interface AsciiFluidCanvasProps {
  characters?: string;
  cellSize?: number;
  color?: string;
  backgroundColor?: string;
  opacity?: number;
  waveSpeed?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function AsciiFluidCanvas({
  characters = " .:-=+*#%@",
  cellSize = 16,
  color = "#38bdf8",
  backgroundColor = "#09090b",
  opacity = 0.45,
  waveSpeed = 1.0,
  className,
  style,
}: AsciiFluidCanvasProps): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { texture: atlasTexture, charCount } = createGlyphAtlas(characters);

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const charColor = new THREE.Color(color);
    const bgColor = new THREE.Color(backgroundColor);

    const getDimensions = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth || window.innerWidth || 1920;
      const h = parent?.clientHeight || window.innerHeight || 1080;
      return { width: Math.max(w, 100), height: Math.max(h, 100) };
    };

    const initialDim = getDimensions();

    const uniforms = {
      u_atlas: { value: atlasTexture },
      u_cellSize: { value: cellSize },
      u_charCount: { value: charCount },
      u_opacity: { value: opacity },
      u_charColor: { value: charColor },
      u_bgColor: { value: bgColor },
      u_resolution: { value: new THREE.Vector2(initialDim.width, initialDim.height) },
      u_time: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader: asciiFragmentShader,
      uniforms,
      depthWrite: false,
      depthTest: false,
    });

    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      alpha: false,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(initialDim.width, initialDim.height, false);

    let animFrameId: number | null = null;
    const startTimestamp = performance.now();

    const renderLoop = (now: number) => {
      const elapsed = (now - startTimestamp) * 0.001;
      uniforms.u_time.value = elapsed * waveSpeed;
      renderer.render(scene, camera);
      animFrameId = requestAnimationFrame(renderLoop);
    };

    animFrameId = requestAnimationFrame(renderLoop);

    const updateSize = () => {
      const dim = getDimensions();
      renderer.setSize(dim.width, dim.height, false);
      uniforms.u_resolution.value.set(dim.width, dim.height);
    };

    const resizeObserver = new ResizeObserver(() => {
      updateSize();
    });

    if (canvas.parentElement) {
      resizeObserver.observe(canvas.parentElement);
    }
    window.addEventListener("resize", updateSize);

    return () => {
      if (animFrameId !== null) {
        cancelAnimationFrame(animFrameId);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateSize);
      geometry.dispose();
      material.dispose();
      atlasTexture.dispose();
      renderer.dispose();
    };
  }, [characters, cellSize, color, backgroundColor, opacity, waveSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        display: "block",
        overflow: "hidden",
        pointerEvents: "none",
        zIndex: 0,
        ...style,
      }}
    />
  );
}
