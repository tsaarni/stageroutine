import type { OverlayContext, OverlayPlugin } from "../core/types";

/**
 * Configuration options for the laser pointer overlay.
 * @category Overlays
 */
export interface LaserPointerOptions {
  /** Base laser beam color in RGB hex. Defaults to neon laser ruby ('#ff0055'). */
  color?: string;
  /** Trail persistence in milliseconds. Defaults to 160ms. */
  trailDurationMs?: number;
  /** Inactivity delay before the pointer canvas sleeps. Defaults to 2000ms. */
  idleTimeoutMs?: number;
  /** Inactivity delay before the cursor is hidden. Defaults to 2000ms. */
  cursorIdleMs?: number;
  /** Keyboard key to toggle pointer on/off. Defaults to 'l'. Set to null to disable. */
  toggleKey?: string | null;
  /** Start with the pointer active. Defaults to false. */
  active?: boolean;
}

/**
 * Extended controller for the laser pointer overlay, beyond the base OverlayPlugin interface.
 * @category Overlays
 */
export interface LaserPointerController {
  /** Whether the laser pointer is currently active. */
  active: boolean;
  /** Returns diagnostic metrics for the pointer. */
  getMetrics(): Record<string, unknown>;
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
 * WebGL-accelerated virtual laser pointer overlay with dynamic glowing comet tail.
 *
 * Manages its own pointer event listeners, cursor visibility, and keyboard toggle.
 * Toggle with the L key (configurable) or programmatically via the returned controller.
 *
 * @example
 * ```ts
 * stage.overlay(LaserPointer());
 * ```
 *
 * @category Overlays
 */
export function LaserPointer(
  options: LaserPointerOptions = {},
): OverlayPlugin & LaserPointerController {
  const colorRgb = hexToRgb(options.color ?? "#ff0055");
  const trailDurationMs = options.trailDurationMs ?? 160;
  const idleTimeoutMs = options.idleTimeoutMs ?? 2000;
  const cursorIdleMs = options.cursorIdleMs ?? 2000;
  const toggleKey = options.toggleKey === undefined ? "l" : options.toggleKey;

  let ctx: OverlayContext | null = null;
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

  let canvasWidth = 0;
  let canvasHeight = 0;
  let dpr = 1;

  let isActive = options.active ?? false;
  let currentX = -100;
  let currentY = -100;

  let rawPoints: RawPoint[] = [];

  let rafId: number | null = null;
  let pointerIdleTimer: number | null = null;
  let cursorIdleTimer: number | null = null;

  let boundOnResize: (() => void) | null = null;
  let boundOnPointerMove: ((e: PointerEvent) => void) | null = null;
  let boundOnPointerDown: ((e: PointerEvent) => void) | null = null;
  let boundOnPointerUp: ((e: PointerEvent) => void) | null = null;
  let boundOnKeyDown: ((e: KeyboardEvent) => void) | null = null;

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

  const resizeCanvas = () => {
    if (!canvas || !gl) return;
    dpr = window.devicePixelRatio || 1;
    canvasWidth = window.innerWidth;
    canvasHeight = window.innerHeight;

    canvas.width = Math.floor(canvasWidth * dpr);
    canvas.height = Math.floor(canvasHeight * dpr);
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;

    gl.viewport(0, 0, canvas.width, canvas.height);
  };

  const render = (timeMs: number) => {
    if (!gl || !program || !canvas || !isActive) {
      rafId = null;
      return;
    }

    const now = performance.now();
    const timeSec = timeMs * 0.001;

    rawPoints = rawPoints.filter((p) => now - p.time < trailDurationMs);

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

    if (rawPoints.length > 0) {
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

  const resetPointerIdleTimer = () => {
    if (pointerIdleTimer !== null) {
      window.clearTimeout(pointerIdleTimer);
    }
    if (canvas) {
      canvas.style.opacity = "1";
    }
    if (isActive && idleTimeoutMs > 0) {
      pointerIdleTimer = window.setTimeout(() => {
        if (canvas) {
          canvas.style.opacity = "0";
        }
      }, idleTimeoutMs);
    }
  };

  const updateCursorVisibility = () => {
    if (!ctx) return;
    const container = ctx.container;
    if (isActive) {
      container.classList.add("sr-pointer-mode");
      container.classList.remove("sr-cursor-hidden");
      if (cursorIdleTimer !== null) {
        window.clearTimeout(cursorIdleTimer);
        cursorIdleTimer = null;
      }
      return;
    }

    container.classList.remove("sr-pointer-mode");
    container.classList.remove("sr-cursor-hidden");
    if (cursorIdleTimer !== null) {
      window.clearTimeout(cursorIdleTimer);
    }
    cursorIdleTimer = window.setTimeout(() => {
      if (ctx && !isActive) {
        ctx.container.classList.add("sr-cursor-hidden");
      }
    }, cursorIdleMs);
  };

  const toPointerCoords = (e: MouseEvent | PointerEvent) => {
    const screenX = e.clientX;
    const screenY = e.clientY;
    if (!ctx) {
      return { screenX, screenY, virtualX: screenX, virtualY: screenY };
    }
    const rect = ctx.viewport.getBoundingClientRect();
    const scale = rect.width / ctx.width;
    const virtualX = (e.clientX - rect.left) / scale;
    const virtualY = (e.clientY - rect.top) / scale;
    return { screenX, screenY, virtualX, virtualY };
  };

  const setActive = (active: boolean) => {
    isActive = active;
    if (active) {
      if (canvas) canvas.style.opacity = "1";
      resetPointerIdleTimer();
      startLoop();
    } else {
      if (canvas) canvas.style.opacity = "0";
      rawPoints = [];
      if (pointerIdleTimer !== null) {
        window.clearTimeout(pointerIdleTimer);
        pointerIdleTimer = null;
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (gl) {
        gl.clear(gl.COLOR_BUFFER_BIT);
      }
    }
    updateCursorVisibility();
  };

  const moveTo = (screenX: number, screenY: number, virtualX: number, virtualY: number) => {
    if (!ctx) return;

    currentX = screenX;
    currentY = screenY;
    const now = performance.now();

    const last = rawPoints[0];
    if (!last || Math.hypot(last.x - currentX, last.y - currentY) > 1.0) {
      rawPoints.unshift({ x: currentX, y: currentY, time: now });
    }

    ctx.viewport.style.setProperty("--sr-pointer-x", `${virtualX}px`);
    ctx.viewport.style.setProperty("--sr-pointer-y", `${virtualY}px`);

    if (isActive) {
      resetPointerIdleTimer();
      startLoop();
    }
  };

  return {
    get active(): boolean {
      return isActive;
    },

    set active(value: boolean) {
      setActive(value);
    },

    mount(context: OverlayContext) {
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
      resizeCanvas();

      boundOnResize = resizeCanvas;
      window.addEventListener("resize", boundOnResize);

      ctx.container.appendChild(canvas);

      boundOnPointerMove = (e: PointerEvent) => {
        updateCursorVisibility();
        const coords = toPointerCoords(e);
        if (typeof e.getCoalescedEvents === "function") {
          const events = e.getCoalescedEvents();
          if (events && events.length > 0) {
            for (const ce of events) {
              const c = toPointerCoords(ce);
              moveTo(c.screenX, c.screenY, c.virtualX, c.virtualY);
            }
            return;
          }
        }
        moveTo(coords.screenX, coords.screenY, coords.virtualX, coords.virtualY);
      };
      window.addEventListener("pointermove", boundOnPointerMove, { passive: true });

      boundOnPointerDown = (_e: PointerEvent) => {};
      window.addEventListener("pointerdown", boundOnPointerDown);

      boundOnPointerUp = (_e: PointerEvent) => {};
      window.addEventListener("pointerup", boundOnPointerUp);

      if (toggleKey !== null) {
        boundOnKeyDown = (e: KeyboardEvent) => {
          if (e.key === toggleKey || e.key === toggleKey.toUpperCase()) {
            setActive(!isActive);
          }
        };
        window.addEventListener("keydown", boundOnKeyDown);
      }

      if (isActive) {
        setActive(true);
      } else {
        updateCursorVisibility();
      }
    },

    show() {
      setActive(true);
    },

    hide() {
      setActive(false);
    },

    destroy() {
      if (pointerIdleTimer !== null) {
        window.clearTimeout(pointerIdleTimer);
        pointerIdleTimer = null;
      }
      if (cursorIdleTimer !== null) {
        window.clearTimeout(cursorIdleTimer);
        cursorIdleTimer = null;
      }
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (boundOnResize) window.removeEventListener("resize", boundOnResize);
      if (boundOnPointerMove) window.removeEventListener("pointermove", boundOnPointerMove);
      if (boundOnPointerDown) window.removeEventListener("pointerdown", boundOnPointerDown);
      if (boundOnPointerUp) window.removeEventListener("pointerup", boundOnPointerUp);
      if (boundOnKeyDown) window.removeEventListener("keydown", boundOnKeyDown);
      if (ctx) {
        ctx.container.classList.remove("sr-pointer-mode");
        ctx.container.classList.remove("sr-cursor-hidden");
      }
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
