/**
 * Presenter annotation overlay: smooth variable-width ink drawn over the stage.
 *
 * Drawing is part of the shared presenter pointer tool. Activating the pointer
 * (`req:pointer:setState`) enables both the laser beam and annotation input, so
 * there is no separate draw mode.
 */

import type { OverlayContext, OverlayPlugin } from "../core/types";

/**
 * Configuration options for the annotation overlay.
 * @category Presenter
 * @inline
 */
export interface AnnotationOptions {
  /** Ink color. Defaults to the active theme primary color. */
  color?: string;
  /** Base stroke width in virtual canvas pixels. Defaults to 3. */
  strokeWidth?: number;
  /**
   * Pointer position smoothing from 0 (raw and responsive) to 1 (maximum).
   * Defaults to 0.8. Higher values remove hand tremor at the cost of slight lag.
   */
  smoothing?: number;
  /** Clear annotations when the scene changes. Defaults to true. */
  autoClearOnScene?: boolean;
  /** Clear annotations on every step advance, e.g. bullet reveals. Defaults to false. */
  autoClearOnStep?: boolean;
  /** Enable the presenter pointer tool immediately. Defaults to false. */
  active?: boolean;
}

/**
 * Controller interface for the annotation overlay.
 * @category Presenter
 */
export interface AnnotationController {
  /** Whether the presenter pointer tool is active. */
  active: boolean;
  /** Active ink color. */
  color: string;
  /** Number of recorded strokes on the current scene. */
  readonly strokeCount: number;
  /** Whether there are strokes that can be undone. */
  readonly canUndo: boolean;
  /** Whether there are undone strokes that can be redone. */
  readonly canRedo: boolean;
  /** Clears all annotations, optionally with a 150ms dissolve. */
  clear(animate?: boolean): void;
  /** Removes the last drawn stroke. */
  undo(): void;
  /** Restores the most recently undone stroke. */
  redo(): void;
}

/** A 2D point in virtual stage pixels. */
interface Pt {
  x: number;
  y: number;
}

/** A single sample of a stroke, in virtual stage pixels. */
interface InkPoint extends Pt {
  width: number;
}

interface Stroke {
  points: InkPoint[];
  color: string;
}

const DEFAULT_INK = "#38bdf8";
const TWO_PI = Math.PI * 2;

/** Click-without-drag dots are drawn this much wider than the stroke width. */
const DOT_SCALE = 1.6;

/** Position smoothing. The `smoothing` option maps 0 (raw) to 1 (maximum). */
const SMOOTHING = {
  /** Default smoothing strength when the option is omitted. */
  defaultStrength: 0.8,
  /** EMA alpha at rest; lower filters more aggressively. */
  minAlpha: 0.1,
  /** Alpha gained per virtual px/ms so fast strokes stay responsive instead of lagging. */
  speedBoost: 0.3,
} as const;

/** Smallest pointer step accepted, in virtual px. Filters duplicate samples. */
const MIN_SAMPLE_DIST = 1.5;

/** Smallest rendered stroke width, in virtual px. */
const MIN_WIDTH = 1.5;

/** Number of samples the width EMA takes to settle toward the target. */
const WIDTH_EMA = 0.25;

/** Glow pass proportions. */
const GLOW = {
  /** Extra width of the additive halo, relative to the core. */
  widthScale: 1.8,
  /** Halo opacity. */
  alpha: 0.12,
  /** Blur radius as a multiple of the base stroke width. */
  blurScale: 2.5,
} as const;

/** Cap on stored samples so a long presentation cannot grow memory without bound. */
const MAX_POINTS = 20000;

/** Delay before the expensive glow redraw after a resize burst. */
const RESIZE_REDRAW_MS = 120;

/**
 * Creates an annotation overlay plugin enabling the presenter to draw smooth,
 * luminous ink directly over slide content.
 *
 * Annotation is part of the shared pointer tool, so it activates together with
 * {@link LaserPointer}. Toggle the tool with `P`; press `Escape` to exit.
 * `C` clears ink. `Cmd/Ctrl+Z` or `Z` undo, and `Cmd/Ctrl+Shift+Z` or `Shift+Z`
 * redo. These act on existing ink regardless of whether the pointer tool is active.
 *
 * @example
 * ```ts
 * stage.overlay(Annotation());
 * stage.overlay(LaserPointer());
 * ```
 *
 * @category Presenter
 */
export function Annotation(options: AnnotationOptions = {}): OverlayPlugin & AnnotationController {
  const baseWidth = options.strokeWidth ?? 3;
  const smoothingStrength = Math.max(
    0,
    Math.min(1, options.smoothing ?? SMOOTHING.defaultStrength),
  );
  const minPositionAlpha = 1 - smoothingStrength * (1 - SMOOTHING.minAlpha);
  const autoClearOnScene = options.autoClearOnScene ?? true;
  const autoClearOnStep = options.autoClearOnStep ?? false;

  let inkOverride: string | undefined = options.color;
  let isActive = options.active ?? false;

  let ctx: OverlayContext | null = null;

  /** Resolves the ink color live so theme changes apply without a subscription. */
  const inkColor = () => inkOverride ?? ctx?.theme.primary ?? DEFAULT_INK;

  let canvas: HTMLCanvasElement | null = null;
  let canvasCtx: CanvasRenderingContext2D | null = null;
  let dpr = 1;

  // Cached layout metrics to avoid forced reflows while drawing or redrawing.
  let cachedViewportRect = { left: 0, top: 0, width: 1920, height: 1080 };
  let cachedScale = 1;

  let strokeHistory: Stroke[] = [];
  let redoStack: Stroke[] = [];
  let isDrawing = false;
  let activePointerId = -1;

  // Live stroke state and per-sample smoothing, all in virtual stage pixels.
  let currentStrokePoints: InkPoint[] = [];
  let drawnSegments = 0;
  let lastX = 0;
  let lastY = 0;
  let smoothedX = 0;
  let smoothedY = 0;
  let lastTime = 0;
  let smoothedSpeed = 0;
  let currentWidth = baseWidth;

  let clearTimer: number | null = null;
  let fullRedrawTimer: number | null = null;
  let cheapRenderTimer: number | null = null;
  let lastCheapRenderMs = 0;
  let lastRedrawMs = 0;

  let unsubClear: (() => void) | null = null;
  let unsubUndo: (() => void) | null = null;
  let unsubRedo: (() => void) | null = null;
  let unsubStepChanged: (() => void) | null = null;
  let unsubSceneChanged: (() => void) | null = null;
  let unsubPointerState: (() => void) | null = null;
  let boundResize: (() => void) | null = null;

  let boundPointerDown: ((e: PointerEvent) => void) | null = null;
  let boundPointerMove: ((e: PointerEvent) => void) | null = null;
  let boundPointerUp: ((e: PointerEvent) => void) | null = null;
  let boundPointerCancel: ((e: PointerEvent) => void) | null = null;
  let boundKeyDown: ((e: KeyboardEvent) => void) | null = null;

  const updateCachedViewport = () => {
    if (!ctx) return;
    const rect = ctx.viewport.getBoundingClientRect();
    cachedViewportRect = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    cachedScale = rect.width / (ctx.width || 1920);
  };

  const midpoint = (a: Pt, b: Pt) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

  // One smoothed piece of a stroke. `ctrl` is null for the straight ends, so a
  // stroke of two points is a plain line. Even indices chain through midpoints,
  // keeping the curve C1-continuous.
  const segmentAt = (pts: InkPoint[], s: number) => {
    const n = pts.length;
    if (n === 2) return { start: pts[0], ctrl: null, end: pts[1] };
    if (s === 0) return { start: pts[0], ctrl: pts[1], end: midpoint(pts[1], pts[2]) };
    if (s === n - 2) {
      return { start: midpoint(pts[n - 2], pts[n - 1]), ctrl: null, end: pts[n - 1] };
    }
    return {
      start: midpoint(pts[s], pts[s + 1]),
      ctrl: pts[s + 1],
      end: midpoint(pts[s + 1], pts[s + 2]),
    };
  };

  const segmentWidth = (pts: InkPoint[], s: number) => (pts[s].width + pts[s + 1].width) / 2;

  const pathSegment = (c: CanvasRenderingContext2D, start: Pt, ctrl: Pt | null, end: Pt) => {
    c.beginPath();
    c.moveTo(start.x, start.y);
    if (ctrl) c.quadraticCurveTo(ctrl.x, ctrl.y, end.x, end.y);
    else c.lineTo(end.x, end.y);
  };

  const tracePath = (c: CanvasRenderingContext2D, pts: InkPoint[]) => {
    c.beginPath();
    c.moveTo(pts[0].x, pts[0].y);
    for (let s = 0; s < pts.length - 1; s++) {
      const { ctrl, end } = segmentAt(pts, s);
      if (ctrl) c.quadraticCurveTo(ctrl.x, ctrl.y, end.x, end.y);
      else c.lineTo(end.x, end.y);
    }
  };

  const averageWidth = (pts: InkPoint[]) => {
    let sum = 0;
    for (const p of pts) sum += p.width;
    return sum / pts.length;
  };

  // shadowBlur is in device pixels and ignores the transform, so scale it here.
  const glowBlur = () => baseWidth * GLOW.blurScale * cachedScale * dpr;

  const paintDot = (
    targetCtx: CanvasRenderingContext2D,
    p: InkPoint,
    color: string,
    withGlow: boolean,
  ) => {
    const radius = Math.max(0.5, p.width / 2);

    targetCtx.save();
    targetCtx.fillStyle = color;

    if (withGlow) {
      targetCtx.shadowColor = color;
      targetCtx.shadowBlur = glowBlur();
      targetCtx.globalCompositeOperation = "lighter";
      targetCtx.globalAlpha = GLOW.alpha;
      targetCtx.beginPath();
      targetCtx.arc(p.x, p.y, radius, 0, TWO_PI);
      targetCtx.fill();
    }

    targetCtx.shadowBlur = 0;
    targetCtx.globalCompositeOperation = "source-over";
    targetCtx.globalAlpha = 1;
    targetCtx.beginPath();
    targetCtx.arc(p.x, p.y, radius, 0, TWO_PI);
    targetCtx.fill();
    targetCtx.restore();
  };

  const paintStroke = (
    targetCtx: CanvasRenderingContext2D,
    pts: InkPoint[],
    color: string,
    withGlow: boolean,
  ) => {
    if (pts.length === 0) return;
    if (pts.length === 1) {
      paintDot(targetCtx, pts[0], color, withGlow);
      return;
    }

    targetCtx.save();
    targetCtx.lineCap = "round";
    targetCtx.lineJoin = "round";
    targetCtx.strokeStyle = color;

    // Soft ambient bloom: one blurred pass over the whole stroke.
    if (withGlow) {
      targetCtx.save();
      targetCtx.shadowColor = color;
      targetCtx.shadowBlur = glowBlur();
      targetCtx.globalCompositeOperation = "lighter";
      targetCtx.globalAlpha = GLOW.alpha;
      targetCtx.lineWidth = averageWidth(pts);
      tracePath(targetCtx, pts);
      targetCtx.stroke();
      targetCtx.restore();
    }

    // Core: per-segment so the width follows the stroke.
    targetCtx.shadowBlur = 0;
    targetCtx.globalCompositeOperation = "source-over";
    targetCtx.globalAlpha = 1;
    for (let s = 0; s < pts.length - 1; s++) {
      const { start, ctrl, end } = segmentAt(pts, s);
      targetCtx.lineWidth = Math.max(0.5, segmentWidth(pts, s));
      pathSegment(targetCtx, start, ctrl, end);
      targetCtx.stroke();
    }

    targetCtx.restore();
  };

  const renderAll = (withGlow: boolean) => {
    if (!canvasCtx || !ctx) return;
    if (cheapRenderTimer !== null) {
      window.clearTimeout(cheapRenderTimer);
      cheapRenderTimer = null;
    }
    if (withGlow && fullRedrawTimer !== null) {
      window.clearTimeout(fullRedrawTimer);
      fullRedrawTimer = null;
    }
    const start = performance.now();
    canvasCtx.clearRect(0, 0, ctx.width, ctx.height);
    for (const stroke of strokeHistory) {
      paintStroke(canvasCtx, stroke.points, stroke.color, withGlow);
    }
    lastRedrawMs = performance.now() - start;
  };

  const scheduleFullRedraw = () => {
    if (fullRedrawTimer !== null) window.clearTimeout(fullRedrawTimer);
    fullRedrawTimer = window.setTimeout(() => {
      fullRedrawTimer = null;
      renderAll(true);
    }, RESIZE_REDRAW_MS);
  };

  // Cheap, unblurred redraw during a resize burst, rate-limited to one per frame-ish.
  const scheduleCheapRender = () => {
    if (cheapRenderTimer !== null) return;
    cheapRenderTimer = window.setTimeout(() => {
      cheapRenderTimer = null;
      renderAll(false);
    }, RESIZE_REDRAW_MS);
  };

  const renderCheapThrottled = () => {
    const now = performance.now();
    if (now - lastCheapRenderMs >= RESIZE_REDRAW_MS) {
      lastCheapRenderMs = now;
      renderAll(false);
    } else {
      scheduleCheapRender();
    }
  };

  const resizeCanvas = () => {
    if (!canvas || !canvasCtx || !ctx) return;
    updateCachedViewport();
    dpr = window.devicePixelRatio || 1;

    canvas.style.left = `${cachedViewportRect.left}px`;
    canvas.style.top = `${cachedViewportRect.top}px`;
    canvas.style.width = `${cachedViewportRect.width}px`;
    canvas.style.height = `${cachedViewportRect.height}px`;

    canvas.width = Math.floor(cachedViewportRect.width * dpr);
    canvas.height = Math.floor(cachedViewportRect.height * dpr);

    // Draw in virtual coordinates; the transform maps them to the backing store.
    canvasCtx.setTransform(cachedScale * dpr, 0, 0, cachedScale * dpr, 0, 0);

    renderCheapThrottled();
    scheduleFullRedraw();
  };

  const drawLiveSegments = () => {
    if (!canvasCtx) return;
    const pts = currentStrokePoints;

    // Wait for the following sample so every drawn piece has real neighbours.
    while (drawnSegments <= pts.length - 3) {
      const { start, ctrl, end } = segmentAt(pts, drawnSegments);

      canvasCtx.save();
      canvasCtx.lineCap = "round";
      canvasCtx.lineJoin = "round";
      canvasCtx.strokeStyle = inkColor();
      canvasCtx.lineWidth = Math.max(0.5, segmentWidth(pts, drawnSegments));
      pathSegment(canvasCtx, start, ctrl, end);
      canvasCtx.stroke();
      canvasCtx.restore();

      drawnSegments++;
    }
  };

  const updateInterception = () => {
    if (!ctx || !canvas) return;
    canvas.style.pointerEvents = isActive ? "auto" : "none";
    if (isActive) {
      ctx.container.classList.add("sr-annotation-mode");
    } else {
      ctx.container.classList.remove("sr-annotation-mode");
    }
  };

  const cancelClearTimer = () => {
    if (clearTimer !== null) {
      window.clearTimeout(clearTimer);
      clearTimer = null;
    }
    if (canvas) {
      canvas.style.transition = "";
      canvas.style.opacity = "1";
    }
  };

  const cancelActiveDrawing = () => {
    if (!isDrawing || !canvas) return;
    isDrawing = false;
    try {
      canvas.releasePointerCapture(activePointerId);
    } catch {
      // Pointer capture may not be active.
    }
    currentStrokePoints = [];
    drawnSegments = 0;
  };

  const applyTaperOut = (points: InkPoint[]) => {
    const count = Math.min(8, points.length - 1);
    if (count <= 0) return;
    for (let k = 0; k < count; k++) {
      const index = points.length - count + k;
      points[index].width *= 1 - 0.6 * ((k + 1) / count);
    }
  };

  // Adds a finished stroke, dropping the oldest once the point cap is exceeded.
  const pushStroke = (stroke: Stroke) => {
    strokeHistory.push(stroke);
    let total = 0;
    for (const s of strokeHistory) total += s.points.length;
    while (total > MAX_POINTS && strokeHistory.length > 1) {
      total -= (strokeHistory.shift() as Stroke).points.length;
    }
  };

  const clear = (animate = true) => {
    cancelActiveDrawing();
    cancelClearTimer();

    if (!animate || strokeHistory.length === 0) {
      strokeHistory = [];
      redoStack = [];
      renderAll(false);
      ctx?.emit("evt:annotation:cleared");
      return;
    }

    if (!canvas) return;

    canvas.style.transition = "opacity 150ms ease-out";
    canvas.style.opacity = "0";

    clearTimer = window.setTimeout(() => {
      clearTimer = null;
      strokeHistory = [];
      redoStack = [];
      renderAll(false);
      if (canvas) {
        canvas.style.transition = "";
        canvas.style.opacity = "1";
      }
      ctx?.emit("evt:annotation:cleared");
    }, 150);
  };

  const setActive = (active: boolean) => {
    if (isActive === active) return;
    isActive = active;
    updateInterception();
  };

  const undo = () => {
    cancelActiveDrawing();
    const popped = strokeHistory.pop();
    if (!popped) return;
    redoStack.push(popped);
    renderAll(true);
    ctx?.emit("evt:annotation:undone");
  };

  const redo = () => {
    cancelActiveDrawing();
    const restored = redoStack.pop();
    if (!restored) return;
    strokeHistory.push(restored);
    renderAll(true);
    ctx?.emit("evt:annotation:redone");
  };

  const controller: OverlayPlugin & AnnotationController = {
    id: "annotation",

    get active(): boolean {
      return isActive;
    },

    set active(value: boolean) {
      ctx?.emit("req:pointer:setState", { active: value });
    },

    get color(): string {
      return inkColor();
    },

    set color(value: string) {
      inkOverride = value;
    },

    get strokeCount(): number {
      return strokeHistory.length;
    },

    get canUndo(): boolean {
      return strokeHistory.length > 0;
    },

    get canRedo(): boolean {
      return redoStack.length > 0;
    },

    clear(animate = true) {
      clear(animate);
    },

    undo() {
      undo();
    },

    redo() {
      redo();
    },

    show() {
      ctx?.emit("req:pointer:setState", { active: true });
    },

    hide() {
      ctx?.emit("req:pointer:setState", { active: false });
    },

    mount(context: OverlayContext) {
      ctx = context;

      canvas = document.createElement("canvas");
      canvas.className = "sr-annotation-canvas";
      canvas.style.cssText = `
        position: fixed;
        pointer-events: none;
        z-index: 999998;
        touch-action: none;
      `;

      canvasCtx = canvas.getContext("2d");
      ctx.container.appendChild(canvas);
      resizeCanvas();

      boundResize = resizeCanvas;
      window.addEventListener("resize", boundResize);

      boundPointerDown = (e: PointerEvent) => {
        if (!isActive) return;

        if (e.button === 2 || e.detail === 2) {
          e.preventDefault();
          clear(true);
          return;
        }

        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();

        cancelClearTimer();

        activePointerId = e.pointerId;
        try {
          canvas?.setPointerCapture(e.pointerId);
        } catch {
          // Pointer capture may be unavailable.
        }

        isDrawing = true;
        redoStack = [];
        drawnSegments = 0;

        updateCachedViewport();

        const x = (e.clientX - cachedViewportRect.left) / cachedScale;
        const y = (e.clientY - cachedViewportRect.top) / cachedScale;

        lastX = x;
        lastY = y;
        smoothedX = x;
        smoothedY = y;
        lastTime = e.timeStamp;
        smoothedSpeed = 0;
        currentWidth = Math.max(MIN_WIDTH, baseWidth * 0.4);

        currentStrokePoints = [{ x, y, width: currentWidth }];
      };
      canvas.addEventListener("pointerdown", boundPointerDown);

      boundPointerMove = (e: PointerEvent) => {
        if (!isDrawing || !canvasCtx) return;

        const events = typeof e.getCoalescedEvents === "function" ? e.getCoalescedEvents() : null;
        const samples = events && events.length > 0 ? events : [e];
        const { left, top } = cachedViewportRect;

        for (const ev of samples) {
          const x = (ev.clientX - left) / cachedScale;
          const y = (ev.clientY - top) / cachedScale;
          const dist = Math.hypot(x - lastX, y - lastY);
          if (dist < MIN_SAMPLE_DIST) continue;

          // Speed is distance over elapsed time. Per-sample distance alone is
          // meaningless because coalesced events are densely packed.
          const dt = Math.max(1, ev.timeStamp - lastTime);
          lastTime = ev.timeStamp;
          smoothedSpeed += (dist / dt - smoothedSpeed) * 0.3;

          // Adaptive position filter: heavy while slow (kills tremor), light
          // while fast (keeps the tip under the cursor).
          const positionAlpha = Math.min(
            1,
            minPositionAlpha + smoothedSpeed * SMOOTHING.speedBoost,
          );
          smoothedX += (x - smoothedX) * positionAlpha;
          smoothedY += (y - smoothedY) * positionAlpha;

          let pressureRatio: number;
          if (ev.pointerType === "pen" && ev.pressure > 0) {
            pressureRatio = ev.pressure;
          } else {
            // Slow strokes are thick, fast flicks taper thin (px/ms).
            pressureRatio = Math.max(0.45, Math.min(1.3, 1.3 - smoothedSpeed * 0.27));
          }

          const targetWidth = Math.max(MIN_WIDTH, baseWidth * pressureRatio);
          currentWidth += (targetWidth - currentWidth) * WIDTH_EMA;

          lastX = x;
          lastY = y;
          currentStrokePoints.push({ x: smoothedX, y: smoothedY, width: currentWidth });
        }

        drawLiveSegments();
      };
      window.addEventListener("pointermove", boundPointerMove, { passive: true });

      const endStroke = (e: PointerEvent) => {
        if (!isDrawing) return;
        isDrawing = false;

        try {
          canvas?.releasePointerCapture(e.pointerId);
        } catch {
          // Pointer capture may not be active.
        }

        if (currentStrokePoints.length > 0) {
          if (currentStrokePoints.length === 1) {
            // A click with no drag leaves a round dot, slightly larger than the pen.
            currentStrokePoints[0].width = baseWidth * DOT_SCALE;
          } else {
            applyTaperOut(currentStrokePoints);
          }
          pushStroke({ points: currentStrokePoints, color: inkColor() });
          renderAll(true);
        }

        currentStrokePoints = [];
        drawnSegments = 0;
      };

      boundPointerUp = endStroke;
      boundPointerCancel = endStroke;
      window.addEventListener("pointerup", boundPointerUp);
      window.addEventListener("pointercancel", boundPointerCancel);

      // Annotation shortcuts act on content, independent of the pointer tool.
      boundKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
        if (e.altKey) return;

        const isMod = e.metaKey || e.ctrlKey;

        if ((e.key === "c" || e.key === "C") && !isMod) {
          if (strokeHistory.length > 0) {
            e.preventDefault();
            clear(true);
          }
          return;
        }

        if (e.key !== "z" && e.key !== "Z") return;

        // Cmd/Ctrl+Z undoes; Shift adds redo. Bare Z / Shift+Z are aliases.
        if (e.shiftKey) {
          if (redoStack.length > 0) {
            e.preventDefault();
            redo();
          }
        } else if (strokeHistory.length > 0) {
          e.preventDefault();
          undo();
        }
      };
      window.addEventListener("keydown", boundKeyDown);

      unsubClear = ctx.on("req:annotation:clear", () => clear(true));
      unsubUndo = ctx.on("req:annotation:undo", () => undo());
      unsubRedo = ctx.on("req:annotation:redo", () => redo());

      if (autoClearOnScene) {
        unsubSceneChanged = ctx.on("evt:nav:sceneChanged", () => {
          if (strokeHistory.length > 0) clear(true);
        });
      }
      if (autoClearOnStep) {
        unsubStepChanged = ctx.on("evt:nav:stepChanged", () => {
          if (strokeHistory.length > 0) clear(true);
        });
      }

      unsubPointerState = ctx.on("evt:pointer:stateChanged", ({ active }) => setActive(active));

      if (isActive) {
        ctx.emit("req:pointer:setState", { active: true });
      } else {
        updateInterception();
      }
    },

    destroy() {
      cancelClearTimer();
      cancelActiveDrawing();
      if (fullRedrawTimer !== null) {
        window.clearTimeout(fullRedrawTimer);
        fullRedrawTimer = null;
      }
      if (cheapRenderTimer !== null) {
        window.clearTimeout(cheapRenderTimer);
        cheapRenderTimer = null;
      }

      if (boundResize) window.removeEventListener("resize", boundResize);
      if (boundPointerDown && canvas) canvas.removeEventListener("pointerdown", boundPointerDown);
      if (boundPointerMove) window.removeEventListener("pointermove", boundPointerMove);
      if (boundPointerUp) window.removeEventListener("pointerup", boundPointerUp);
      if (boundPointerCancel) window.removeEventListener("pointercancel", boundPointerCancel);
      if (boundKeyDown) window.removeEventListener("keydown", boundKeyDown);

      if (unsubClear) unsubClear();
      if (unsubUndo) unsubUndo();
      if (unsubRedo) unsubRedo();
      if (unsubStepChanged) unsubStepChanged();
      if (unsubSceneChanged) unsubSceneChanged();
      if (unsubPointerState) unsubPointerState();

      if (ctx) ctx.container.classList.remove("sr-annotation-mode");

      if (canvas) {
        canvas.remove();
        canvas = null;
      }
      canvasCtx = null;
      ctx = null;
    },

    getMetrics() {
      let points = 0;
      for (const stroke of strokeHistory) points += stroke.points.length;
      return {
        is_active: isActive ? 1 : 0,
        stroke_count: strokeHistory.length,
        points_count: points,
        can_undo: strokeHistory.length > 0 ? 1 : 0,
        can_redo: redoStack.length > 0 ? 1 : 0,
        has_canvas: canvas !== null ? 1 : 0,
        last_redraw_ms: Math.round(lastRedrawMs * 100) / 100,
      };
    },
  };

  return controller;
}
