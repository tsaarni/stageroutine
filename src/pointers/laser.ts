import type { PointerContext, PointerCoordinates, PointerPlugin } from "./types";

/**
 * Configuration options for the laser pointer plugin.
 * @category Presenter
 */
export interface LaserPointerOptions {
  /** Base laser beam color in RGB hex. Defaults to neon laser ruby ('#ff0055'). */
  color?: string;
  /** Trail persistence in milliseconds. Defaults to 160ms. */
  trailDurationMs?: number;
  /** Inactivity delay before the pointer sleeps. Defaults to 2000ms. */
  idleTimeoutMs?: number;
}

const VERTEX_SHADER_SRC = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SRC = `
precision highp float;

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
uniform vec3 u_color;

#define MAX_SEGMENTS 48
uniform vec4 u_segments[MAX_SEGMENTS]; // p0.x, p0.y, p1.x, p1.y
uniform vec2 u_segment_ages[MAX_SEGMENTS]; // age0, age1 (0.0=fresh, 1.0=expired)
uniform int u_segment_count;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 fragCoord = vec2(gl_FragCoord.x, u_resolution.y - gl_FragCoord.y);

  // 1. Continuous Polyline Signed Distance Field (SDF) Trail
  float minRibbonDist = 99999.0;
  float ribbonAge = 1.0;

  for (int i = 0; i < MAX_SEGMENTS; i++) {
    if (i >= u_segment_count) break;

    vec2 p0 = u_segments[i].xy;
    vec2 p1 = u_segments[i].zw;
    vec2 pa = fragCoord - p0;
    vec2 ba = p1 - p0;
    float lenSq = dot(ba, ba);
    float h = clamp(dot(pa, ba) / max(lenSq, 0.001), 0.0, 1.0);
    float dist = length(pa - ba * h);

    if (dist < minRibbonDist) {
      minRibbonDist = dist;
      ribbonAge = mix(u_segment_ages[i].x, u_segment_ages[i].y, h);
    }
  }

  float trailWeight = pow(clamp(1.0 - ribbonAge, 0.0, 1.0), 1.5);
  float ribbonRadius = mix(0.8, 5.0, trailWeight);
  float ribbonGlow = exp(-max(0.0, minRibbonDist - ribbonRadius) * 0.1) * trailWeight * 0.7;
  float ribbonCore = exp(-minRibbonDist * 0.35) * trailWeight * 1.6;

  // 2. Focal Diode Core & Quantum Shimmer
  float d = length(fragCoord - u_mouse);
  float speckle = (hash(fragCoord + sin(u_time * 12.0)) - 0.5) * 0.12;

  float core = exp(-d * 0.32) * 1.6;
  float halo = exp(-d * 0.04) * 0.6 + exp(-d * 0.012) * 0.2 + speckle * exp(-d * 0.04);

  // 3. Final Additive Composition
  vec3 finalColor = u_color * (halo + ribbonGlow);
  finalColor += vec3(1.0, 0.95, 0.9) * (core + ribbonCore);

  float alpha = clamp(max(finalColor.r, max(finalColor.g, finalColor.b)), 0.0, 1.0);
  gl_FragColor = vec4(finalColor, alpha);
}
`;

function hexToRgb(hex: string): [number, number, number] {
  let clean = hex.replace("#", "");
  if (clean.length === 3) {
    clean = clean
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = Number.parseInt(clean, 16);
  return [((num >> 16) & 255) / 255, ((num >> 8) & 255) / 255, (num & 255) / 255];
}

interface RawPoint {
  x: number;
  y: number;
  time: number;
}

/**
 * WebGL-accelerated virtual laser pointer plugin with dynamic glowing comet tail.
 * @category Presenter
 */
export function laserPointer(options: LaserPointerOptions = {}): PointerPlugin {
  const colorRgb = hexToRgb(options.color ?? "#ff0055");
  const trailDurationMs = options.trailDurationMs ?? 160;
  const idleTimeoutMs = options.idleTimeoutMs ?? 2000;

  let ctx: PointerContext | null = null;
  let canvas: HTMLCanvasElement | null = null;
  let gl: WebGLRenderingContext | null = null;
  let program: WebGLProgram | null = null;

  let uResolutionLoc: WebGLUniformLocation | null = null;
  let uMouseLoc: WebGLUniformLocation | null = null;
  let uTimeLoc: WebGLUniformLocation | null = null;
  let uColorLoc: WebGLUniformLocation | null = null;
  let uSegmentsLoc: WebGLUniformLocation | null = null;
  let uSegmentAgesLoc: WebGLUniformLocation | null = null;
  let uSegmentCountLoc: WebGLUniformLocation | null = null;

  let width = 0;
  let height = 0;
  let dpr = 1;

  let isActive = false;
  let currentX = -100;
  let currentY = -100;

  let rawPoints: RawPoint[] = [];

  let rafId: number | null = null;
  let idleTimer: number | null = null;

  const initGL = () => {
    if (!canvas) return;
    gl = canvas.getContext("webgl", { alpha: true, premultipliedAlpha: false, antialias: false });
    if (!gl) return;

    const createShader = (type: number, src: string) => {
      if (!gl) return null;
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      return shader;
    };

    const vs = createShader(gl.VERTEX_SHADER, VERTEX_SHADER_SRC);
    const fs = createShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SRC);
    if (!vs || !fs) return;

    program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);

    const aPosLoc = gl.getAttribLocation(program, "a_position");
    gl.enableVertexAttribArray(aPosLoc);
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0);

    uResolutionLoc = gl.getUniformLocation(program, "u_resolution");
    uMouseLoc = gl.getUniformLocation(program, "u_mouse");
    uTimeLoc = gl.getUniformLocation(program, "u_time");
    uColorLoc = gl.getUniformLocation(program, "u_color");
    uSegmentsLoc = gl.getUniformLocation(program, "u_segments");
    uSegmentAgesLoc = gl.getUniformLocation(program, "u_segment_ages");
    uSegmentCountLoc = gl.getUniformLocation(program, "u_segment_count");

    gl.uniform3f(uColorLoc, colorRgb[0], colorRgb[1], colorRgb[2]);
  };

  const resize = () => {
    if (!canvas || !gl) return;
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const render = (timeMs: number) => {
    if (!gl || !program || !canvas || !isActive) {
      rafId = null;
      return;
    }

    const now = performance.now();
    const timeSec = timeMs * 0.001;

    // Clean expired points
    rawPoints = rawPoints.filter((p) => now - p.time < trailDurationMs);

    // Build Continuous Spline Segments (up to 48 segments)
    const maxSegments = 48;
    const segmentsData = new Float32Array(maxSegments * 4);
    const agesData = new Float32Array(maxSegments * 2);
    let segmentCount = 0;

    if (rawPoints.length > 1) {
      for (let i = 0; i < rawPoints.length - 1 && segmentCount < maxSegments; i++) {
        const p0 = rawPoints[i];
        const p1 = rawPoints[i + 1];
        const age0 = Math.min(1.0, (now - p0.time) / trailDurationMs);
        const age1 = Math.min(1.0, (now - p1.time) / trailDurationMs);

        segmentsData[segmentCount * 4 + 0] = p0.x * dpr;
        segmentsData[segmentCount * 4 + 1] = p0.y * dpr;
        segmentsData[segmentCount * 4 + 2] = p1.x * dpr;
        segmentsData[segmentCount * 4 + 3] = p1.y * dpr;

        agesData[segmentCount * 2 + 0] = age0;
        agesData[segmentCount * 2 + 1] = age1;
        segmentCount++;
      }
    }

    gl.useProgram(program);
    gl.uniform2f(uResolutionLoc, canvas.width, canvas.height);
    gl.uniform2f(uMouseLoc, currentX * dpr, currentY * dpr);
    gl.uniform1f(uTimeLoc, timeSec);

    gl.uniform4fv(uSegmentsLoc, segmentsData);
    gl.uniform2fv(uSegmentAgesLoc, agesData);
    gl.uniform1i(uSegmentCountLoc, segmentCount);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    const isSettled = rawPoints.length === 0;

    if (!isSettled) {
      rafId = requestAnimationFrame(render);
    } else {
      rafId = null;
    }
  };

  const startLoop = () => {
    if (rafId === null && isActive) {
      rafId = requestAnimationFrame(render);
    }
  };

  const resetIdleTimer = () => {
    if (idleTimer !== null) {
      window.clearTimeout(idleTimer);
    }
    if (canvas) {
      canvas.style.opacity = "1";
    }
    if (isActive && idleTimeoutMs > 0) {
      idleTimer = window.setTimeout(() => {
        if (canvas) {
          canvas.style.opacity = "0";
        }
      }, idleTimeoutMs);
    }
  };

  return {
    id: "laser-pointer",

    mount(context: PointerContext) {
      ctx = context;

      canvas = document.createElement("canvas");
      canvas.className = "sr-laser-gl-canvas";
      canvas.style.cssText = `
        position: fixed;
        inset: 0;
        pointer-events: none;
        z-index: 999999;
        opacity: 0;
        transition: opacity 0.25s ease-out;
      `;

      initGL();
      resize();
      window.addEventListener("resize", resize);

      ctx.container.appendChild(canvas);
    },

    setActive(active: boolean) {
      isActive = active;
      if (active) {
        if (canvas) canvas.style.opacity = "1";
        resetIdleTimer();
        startLoop();
      } else {
        if (canvas) canvas.style.opacity = "0";
        rawPoints = [];
        if (idleTimer !== null) {
          window.clearTimeout(idleTimer);
          idleTimer = null;
        }
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        if (gl) {
          gl.clear(gl.COLOR_BUFFER_BIT);
        }
      }
    },

    moveTo(coords: PointerCoordinates) {
      if (!ctx) return;

      currentX = coords.screenX;
      currentY = coords.screenY;
      const now = performance.now();

      const last = rawPoints[0];
      if (!last || Math.hypot(last.x - currentX, last.y - currentY) > 1.0) {
        rawPoints.unshift({ x: currentX, y: currentY, time: now });
      }

      ctx.viewport.style.setProperty("--sr-pointer-x", `${coords.virtualX}px`);
      ctx.viewport.style.setProperty("--sr-pointer-y", `${coords.virtualY}px`);

      if (isActive) {
        resetIdleTimer();
        startLoop();
      }
    },

    destroy() {
      if (idleTimer !== null) {
        window.clearTimeout(idleTimer);
        idleTimer = null;
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      window.removeEventListener("resize", resize);
      if (canvas) {
        canvas.remove();
        canvas = null;
      }
      gl = null;
      ctx = null;
    },

    getMetrics() {
      return {
        is_active: isActive ? 1 : 0,
        raf_loop_active: rafId !== null ? 1 : 0,
        active_points_count: rawPoints.length,
        has_canvas: canvas !== null ? 1 : 0,
      };
    },
  };
}
