import * as THREE from "three";
import type { Background, StageContext } from "../core/types";

// ---------------------------------------------------------------------------
// Configuration Interfaces
// ---------------------------------------------------------------------------

export interface BaseFluidOptions {
  /** Background color behind the fluid (default: "#09090b") */
  backgroundColor?: string;
  /** Overall opacity / brightness factor (default: 0.28) */
  opacity?: number;
  /** Speed of wave rolling across screen (default: 0.24) */
  waveSpeed?: number;
}

export interface AsciiFluidOptions extends BaseFluidOptions {
  /** ASCII character ramp ordered from darkest to brightest */
  characters?: string;
  /** Size of each ASCII character cell in pixels (default: 13) */
  cellSize?: number;
  /** Primary accent color for characters (default: "#38bdf8") */
  color?: string;
}

export interface GradientFluidOptions extends BaseFluidOptions {
  /**
   * Color palette from dark depth to luminous crest highlights.
   * Default: ["#09090b", "#0284c7", "#38bdf8", "#e0f2fe"]
   */
  colors?: [string, string, string, string] | string[];
  /** Strength of surface refraction / liquid gloss (default: 1.0) */
  gloss?: number;
}

// ---------------------------------------------------------------------------
// Shared Fullscreen Quad Vertex Shader & Atlas Utility
// ---------------------------------------------------------------------------

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position, 1.0);
  }
`;

/**
 * Generates an ASCII character glyph texture atlas.
 */
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

// ---------------------------------------------------------------------------
// Procedural Wave Synthesis GLSL
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// 1. ASCII Fragment Shader
// ---------------------------------------------------------------------------

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

    // Harmonious chromatic palette
    vec3 deepTone   = mix(u_bgColor, u_charColor, 0.35);
    vec3 brightTone = mix(u_charColor, vec3(0.55, 0.80, 0.95), 0.35);
    vec3 activeColor = mix(deepTone, brightTone, smoothstep(0.15, 0.90, intensity));

    activeColor += vec3(0.04, 0.10, 0.15) * length(totalDisplacement) * 5.0;

    float charBrightness = glyphAlpha * (0.30 + intensity * 0.60);
    float cellGlow = smoothstep(0.7, 0.0, length(cellUv - 0.5)) * intensity * 0.10;

    float totalAlpha = clamp((charBrightness + cellGlow) * u_opacity, 0.0, 1.0);
    vec3 color = mix(u_bgColor, activeColor, totalAlpha);

    gl_FragColor = vec4(color, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// 2. Continuous Chromatic Gradient Fluid Render Shader
// ---------------------------------------------------------------------------

const gradientFragmentShader = `
  uniform vec2 u_resolution;
  uniform float u_time;
  uniform float u_opacity;
  uniform float u_gloss;
  uniform vec3 u_color0; // Background / Deep void
  uniform vec3 u_color1; // Deep ocean swell
  uniform vec3 u_color2; // Vibrant mid-body
  uniform vec3 u_color3; // Luminous crest highlight

  varying vec2 vUv;

  ${simplexNoiseGlsl}

  // Branchless 4-color piecewise gradient interpolation
  vec3 getPaletteColor(float t) {
    vec3 c01 = mix(u_color0, u_color1, smoothstep(0.0, 0.33, t));
    vec3 c12 = mix(u_color1, u_color2, smoothstep(0.33, 0.66, t));
    vec3 c23 = mix(u_color2, u_color3, smoothstep(0.66, 1.0, t));
    return mix(mix(c01, c12, step(0.33, t)), c23, step(0.66, t));
  }

  void main() {
    vec2 aspect = vec2(u_resolution.x / u_resolution.y, 1.0);
    float t = u_time * 0.38;

    ${sharedWaveMathGlsl}

    vec3 liquidColor = getPaletteColor(intensity);

    // Liquid surface normal & specular sheen
    vec3 normal = normalize(vec3(-totalDisplacement * 35.0 * u_gloss, 1.0));
    vec3 lightDir = normalize(vec3(0.3, 0.5, 0.8));
    vec3 halfVec = normalize(lightDir + vec3(0.0, 0.0, 1.0));
    float specular = pow(max(dot(normal, halfVec), 0.0), 22.0) * 0.48 * u_gloss;

    vec3 finalColor = liquidColor + vec3(specular) * u_color3;
    float alpha = clamp((0.38 + intensity * 0.62) * u_opacity, 0.0, 1.0);

    vec3 composite = mix(u_color0, finalColor, alpha);
    gl_FragColor = vec4(composite, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Fluid Engine Factory
// ---------------------------------------------------------------------------

interface FluidEngineConfig {
  fragmentShader: string;
  uniforms: Record<string, { value: unknown }>;
  waveSpeed: number;
  atlasTexture?: THREE.CanvasTexture;
}

function createFluidEngine(config: FluidEngineConfig): Background {
  let animFrameId: number | null = null;
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.OrthographicCamera | null = null;
  let material: THREE.ShaderMaterial | null = null;
  let unbindResize: (() => void) | null = null;

  return {
    attach(stage: StageContext) {
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      const allUniforms = {
        ...config.uniforms,
        u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        u_time: { value: 0 },
      };

      material = new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader: config.fragmentShader,
        uniforms: allUniforms,
        depthWrite: false,
        depthTest: false,
      });

      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
      scene.add(quad);

      renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "high-performance" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      renderer.setSize(window.innerWidth, window.innerHeight);

      const canvas = renderer.domElement;
      canvas.style.position = "absolute";
      canvas.style.inset = "0";
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "0";
      stage.container.prepend(canvas);

      unbindResize = stage.on("resize", ({ width, height }) => {
        if (!renderer || !material) return;
        renderer.setSize(width, height);
        material.uniforms.u_resolution.value.set(width, height);
      });

      const clock = new THREE.Clock();

      const animate = () => {
        if (!renderer || !scene || !camera || !material) return;

        const time = clock.getElapsedTime() * (config.waveSpeed / 0.24);
        material.uniforms.u_time.value = time;
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
      if (unbindResize) {
        unbindResize();
        unbindResize = null;
      }
      if (config.atlasTexture) config.atlasTexture.dispose();
      if (material) material.dispose();
      if (renderer) {
        renderer.dispose();
        renderer.domElement.remove();
        renderer = null;
      }
      scene = null;
      camera = null;
    },
  };
}

// ---------------------------------------------------------------------------
// Public Component Exports
// ---------------------------------------------------------------------------

/**
 * Creates a procedural ASCII Fluid background.
 */
export function AsciiFluid(options: AsciiFluidOptions = {}): Background {
  const characters = options.characters ?? " .:-=+*#%@";
  const cellSize = options.cellSize ?? 13;
  const charColor = new THREE.Color(options.color ?? "#38bdf8");
  const bgColor = new THREE.Color(options.backgroundColor ?? "#09090b");
  const opacity = options.opacity ?? 0.28;
  const waveSpeed = options.waveSpeed ?? 0.24;

  const { texture: atlasTexture, charCount } = createGlyphAtlas(characters);

  return createFluidEngine({
    fragmentShader: asciiFragmentShader,
    atlasTexture,
    waveSpeed,
    uniforms: {
      u_atlas: { value: atlasTexture },
      u_cellSize: { value: cellSize },
      u_charCount: { value: charCount },
      u_opacity: { value: opacity },
      u_charColor: { value: charColor },
      u_bgColor: { value: bgColor },
    },
  });
}

/**
 * Creates a procedural continuous Chromatic Gradient Fluid background.
 */
export function GradientFluid(options: GradientFluidOptions = {}): Background {
  const rawColors = options.colors ?? ["#09090b", "#0284c7", "#38bdf8", "#e0f2fe"];
  const color0 = new THREE.Color(options.backgroundColor ?? rawColors[0] ?? "#09090b");
  const color1 = new THREE.Color(rawColors[1] ?? "#0284c7");
  const color2 = new THREE.Color(rawColors[2] ?? "#38bdf8");
  const color3 = new THREE.Color(rawColors[3] ?? "#e0f2fe");

  const opacity = options.opacity ?? 0.28;
  const waveSpeed = options.waveSpeed ?? 0.24;
  const gloss = options.gloss ?? 1.0;

  return createFluidEngine({
    fragmentShader: gradientFragmentShader,
    waveSpeed,
    uniforms: {
      u_opacity: { value: opacity },
      u_gloss: { value: gloss },
      u_color0: { value: color0 },
      u_color1: { value: color1 },
      u_color2: { value: color2 },
      u_color3: { value: color3 },
    },
  });
}
