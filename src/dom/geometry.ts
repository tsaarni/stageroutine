/**
 * Geometric calculation utilities for connector routing, bounding boxes, and perimeter intersections.
 */

import { resolveAnchor, resolveCoordToPx } from "../core/interpolators";
import type { AnchorMode, ElementAnchor, Point } from "../core/types";

export type { AnchorMode, Point };

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  scale?: number;
  rotation?: number;
}

export type CardinalSide = "top" | "bottom" | "left" | "right" | "center";

/**
 * Resolved attachment point on a target element.
 * All coordinates are in world (stage) space.
 */
export interface AnchorPoint {
  /** Attachment point, already offset outward by the connector padding. */
  point: Point;
  /**
   * Dominant axis of the outward normal, used by orthogonal routing.
   * Always derived in world space, so a rotated element reports the face that actually points that way.
   */
  side: CardinalSide;
  /** Outward unit normal, or undefined when the target has no distinct face to leave from. */
  normal?: Point;
}

/**
 * Implemented by elements that can resolve attachment points against their SVG outline.
 */
export interface PerimeterProvider {
  getPerimeterPoint(box: Box, target: Point, padding?: number, mode?: AnchorMode): AnchorPoint;
}

/** Narrows an arbitrary connector target to an element that can resolve outline attachment points. */
export function isPerimeterProvider(target: unknown): target is PerimeterProvider {
  return (
    typeof target === "object" &&
    target !== null &&
    typeof (target as PerimeterProvider).getPerimeterPoint === "function"
  );
}

/** Whether an anchor value selects an attachment mode rather than a named face or a point. */
export function isAnchorMode(anchor: unknown): anchor is AnchorMode {
  return anchor === "auto" || anchor === "closest" || anchor === "ray";
}

const DEG_PER_RAD = Math.PI / 180;

/** Box scale, guarding against zero which would collapse the local coordinate mapping. */
function boxScale(box: Box): number {
  const scale = box.scale ?? 1;
  return Math.abs(scale) > 1e-6 ? scale : 1;
}

/** Rotates a vector by `degrees` around the origin. */
function rotateVector(vector: Point, degrees: number): Point {
  if (degrees === 0) return vector;
  const rad = degrees * DEG_PER_RAD;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [vector[0] * cos - vector[1] * sin, vector[0] * sin + vector[1] * cos];
}

/** Normalizes a non-zero vector. */
function normalize(vector: Point): Point {
  const len = Math.hypot(vector[0], vector[1]);
  return len > 1e-6 ? [vector[0] / len, vector[1] / len] : [0, 0];
}

/** Maps a world-space point into the box's local, unrotated and unscaled space. */
export function toLocalPoint(box: Box, target: Point): Point {
  const scale = boxScale(box);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rotated = rotateVector(
    [(target[0] - cx) / scale, (target[1] - cy) / scale],
    -(box.rotation ?? 0),
  );
  return [box.width / 2 + rotated[0], box.height / 2 + rotated[1]];
}

/** Maps a local-space point of the box back to world space, applying box scale and rotation. */
function toWorldPoint(box: Box, local: Point): Point {
  const scale = boxScale(box);
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const offset = rotateVector(
    [(local[0] - box.width / 2) * scale, (local[1] - box.height / 2) * scale],
    box.rotation ?? 0,
  );
  return [cx + offset[0], cy + offset[1]];
}

/** Local-space outward normal of a cardinal face, or undefined for "center". */
function faceNormal(side: CardinalSide): Point | undefined {
  switch (side) {
    case "top":
      return [0, -1];
    case "bottom":
      return [0, 1];
    case "left":
      return [-1, 0];
    case "right":
      return [1, 0];
    default:
      return undefined;
  }
}

/** Dominant axis of a world-space vector, preferring the horizontal axis on ties. */
function dominantSide(vector: Point): CardinalSide {
  if (Math.abs(vector[0]) >= Math.abs(vector[1])) {
    if (Math.abs(vector[0]) < 1e-6) return "center";
    return vector[0] > 0 ? "right" : "left";
  }
  return vector[1] > 0 ? "bottom" : "top";
}

/**
 * Resolves an anchor point on the box against a world-space target.
 * Supports named cardinal faces, "auto" face selection facing the target, or custom [x, y] percentage anchors.
 * Accounts for element scale and rotation.
 */
export function getBoxAnchorPoint(
  box: Box,
  anchor: "auto" | ElementAnchor = "auto",
  targetPt?: Point,
  padding = 6,
): AnchorPoint {
  const gap = padding / boxScale(box);
  let localX = box.width / 2;
  let localY = box.height / 2;
  let normalLocal: Point | undefined;

  if (anchor === "auto") {
    if (targetPt) {
      // Face selection happens in local space, so rotation picks the face that points at the target.
      const localTarget = toLocalPoint(box, targetPt);
      const dx = localTarget[0] - box.width / 2;
      const dy = localTarget[1] - box.height / 2;
      const horizontal = Math.abs(dx) * (box.height / 2) >= Math.abs(dy) * (box.width / 2);
      let side: CardinalSide;
      if (horizontal) side = dx >= 0 ? "right" : "left";
      else side = dy >= 0 ? "bottom" : "top";
      normalLocal = faceNormal(side);
      if (side === "top") localY = -gap;
      else if (side === "bottom") localY = box.height + gap;
      else if (side === "left") localX = -gap;
      else localX = box.width + gap;
    }
  } else {
    const [pctX, pctY] = resolveAnchor(anchor);
    localX = (pctX / 100) * box.width;
    localY = (pctY / 100) * box.height;

    let nx = 0;
    let ny = 0;
    if (pctX >= 99) {
      localX += gap;
      nx = 1;
    } else if (pctX <= 1) {
      localX -= gap;
      nx = -1;
    }
    if (pctY >= 99) {
      localY += gap;
      ny = 1;
    } else if (pctY <= 1) {
      localY -= gap;
      ny = -1;
    }
    if (nx !== 0 || ny !== 0) normalLocal = normalize([nx, ny]);
  }

  const normal = normalLocal ? rotateVector(normalLocal, box.rotation ?? 0) : undefined;
  return {
    point: toWorldPoint(box, [localX, localY]),
    side: normal ? dominantSide(normal) : "center",
    normal,
  };
}

/**
 * Computes the intersection point where a ray from the box center crosses the box boundary,
 * supporting rounded corners and outer padding (ideal for circular nodes / diagonal connections).
 * All arguments are expected in the same coordinate space.
 */
export function getPerimeterPoint(box: Box, target: Point, r = 12, padding = 6): Point {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const dx = target[0] - cx;
  const dy = target[1] - cy;

  if (dx === 0 && dy === 0) return [cx, cy];

  const hw = box.width / 2 + padding;
  const hh = box.height / 2 + padding;
  const t = Math.min(hw / Math.abs(dx), hh / Math.abs(dy));

  let px = dx * t;
  let py = dy * t;
  const innerW = hw - r;
  const innerH = hh - r;

  // Round corner intersection
  if (Math.abs(px) > innerW && Math.abs(py) > innerH) {
    const signX = Math.sign(dx);
    const signY = Math.sign(dy);
    const cornerX = signX * innerW;
    const cornerY = signY * innerH;
    const angle = Math.atan2(py - cornerY, px - cornerX);
    px = cornerX + Math.cos(angle) * r;
    py = cornerY + Math.sin(angle) * r;
  }

  return [cx + px, cy + py];
}

/**
 * Calculates the nearest point on a box perimeter to a target point.
 * Accounts for element scale and rotation. Corners resolve to a diagonal normal.
 */
export function getClosestBoxPoint(box: Box, target: Point, padding = 6): AnchorPoint {
  const hw = box.width / 2;
  const hh = box.height / 2;
  const local = toLocalPoint(box, target);

  let x = local[0] - hw;
  let y = local[1] - hh;

  if (Math.abs(x) <= hw && Math.abs(y) <= hh) {
    // Target is inside: project onto the nearest face.
    const distances = [hw - x, hw + x, hh - y, hh + y];
    const nearest = Math.min(...distances);
    if (nearest === distances[0]) x = hw;
    else if (nearest === distances[1]) x = -hw;
    else if (nearest === distances[2]) y = hh;
    else y = -hh;
  } else {
    x = Math.max(-hw, Math.min(hw, x));
    y = Math.max(-hh, Math.min(hh, y));
  }

  let nx = 0;
  let ny = 0;
  if (Math.abs(x - hw) < 1e-4) nx = 1;
  else if (Math.abs(x + hw) < 1e-4) nx = -1;
  if (Math.abs(y - hh) < 1e-4) ny = 1;
  else if (Math.abs(y + hh) < 1e-4) ny = -1;

  const normalLocal = nx !== 0 || ny !== 0 ? normalize([nx, ny]) : undefined;
  const gap = padding / boxScale(box);
  const padded: Point = [
    hw + x + (normalLocal ? normalLocal[0] * gap : 0),
    hh + y + (normalLocal ? normalLocal[1] * gap : 0),
  ];

  const normal = normalLocal ? rotateVector(normalLocal, box.rotation ?? 0) : undefined;
  return {
    point: toWorldPoint(box, padded),
    side: normal ? dominantSide(normal) : "center",
    normal,
  };
}

/** Bisection steps that resolve an outline crossing to ~0.1px on a 2000px element. */
const BISECTION_STEPS = 14;
/** Coarse bisection steps used while scanning angles for the nearest outline point. */
const COARSE_BISECTION_STEPS = 5;
/** Angle scans for the nearest outline point, each shrinking around the previous best: [samples, steps]. */
const CLOSEST_PASSES: readonly (readonly [number, number])[] = [
  [48, COARSE_BISECTION_STEPS],
  [16, BISECTION_STEPS],
  [8, BISECTION_STEPS],
];
/** Direction probe either side of a crossing, as a fraction of the shorter box side. */
const PROBE_FRACTION = 0.1;
/** Largest turn (degrees) across the probe window for an outline to count as a straight side. */
const STRAIGHT_TURN = (3 * Math.PI) / 180;
/**
 * Largest gap in local units between a box side midpoint and the outline that still counts as lying on
 * the outline. Covers the half stroke width that shape paths are inset by (default stroke is 2).
 */
const FACE_SNAP_TOLERANCE = 4;

/** Outline crossing in local space, with the direction of the outline there. */
interface OutlineHit {
  point: Point;
  /** Angle of the crossing around the origin. */
  angle: number;
  /** Distance from the origin to the crossing. */
  radius: number;
  /** Unit direction of the outline at the crossing. */
  tangent: Point;
  /** Turn of the outline across the probe window; zero on a straight side. */
  turn: number;
}

/** Local-space midpoint of a box side, or undefined for "center". */
function boxFaceCentre(box: Box, side: CardinalSide): Point | undefined {
  switch (side) {
    case "left":
      return [0, box.height / 2];
    case "right":
      return [box.width, box.height / 2];
    case "top":
      return [box.width / 2, 0];
    case "bottom":
      return [box.width / 2, box.height];
    default:
      return undefined;
  }
}

/**
 * Box side that faces a local-space target, comparing the direction against the box aspect ratio.
 * Matches the face selection used for targets that have no outline.
 */
function facingSide(box: Box, origin: Point, target: Point): CardinalSide {
  const dx = target[0] - origin[0];
  const dy = target[1] - origin[1];
  if (Math.hypot(dx, dy) < 1e-6) return "center";
  const halfWidth = box.width / 2;
  const halfHeight = box.height / 2;
  if (Math.abs(dx) * halfHeight >= Math.abs(dy) * halfWidth) return dx >= 0 ? "right" : "left";
  return dy >= 0 ? "bottom" : "top";
}

let queryCtx: CanvasRenderingContext2D | null = null;

/** Reusable 2D context for outline queries. */
function getQueryContext(): CanvasRenderingContext2D | null {
  if (!queryCtx) {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    queryCtx = canvas.getContext("2d");
  }
  return queryCtx;
}

/** Parses the outline of a path element for point queries. */
function getQueryPath(pathEl: SVGGeometryElement | null | undefined): Path2D | null {
  if (!pathEl || typeof Path2D === "undefined") return null;
  const d = pathEl.getAttribute("d");
  if (!d) return null;
  try {
    return new Path2D(d);
  } catch {
    return null;
  }
}

/**
 * Distance from `origin` along `angle` to the filled outline, found by bisection.
 * Assumes the origin lies inside the fill and that the ray leaves it exactly once, which holds for
 * silhouettes that are star-shaped about the origin.
 */
function boundaryRadius(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  origin: Point,
  angle: number,
  maxRadius: number,
  steps = BISECTION_STEPS,
): number {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  let low = 0;
  let high = maxRadius;
  for (let i = 0; i < steps; i++) {
    const mid = (low + high) / 2;
    if (ctx.isPointInPath(path, origin[0] + mid * cos, origin[1] + mid * sin)) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Outline crossing along `angle`, with its distance from the origin. */
function boundaryPoint(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  origin: Point,
  angle: number,
  maxRadius: number,
  steps: number,
): { point: Point; radius: number } {
  const radius = boundaryRadius(ctx, path, origin, angle, maxRadius, steps);
  return {
    point: [origin[0] + Math.cos(angle) * radius, origin[1] + Math.sin(angle) * radius],
    radius,
  };
}

/** Perpendicular of `tangent`, oriented away from `origin`, falling back to the radial direction. */
function outwardNormal(tangent: Point, at: Point, origin: Point): Point {
  const ox = at[0] - origin[0];
  const oy = at[1] - origin[1];
  const radialLength = Math.hypot(ox, oy);
  const radial: Point = radialLength > 1e-6 ? [ox / radialLength, oy / radialLength] : [0, -1];
  if (Math.hypot(tangent[0], tangent[1]) < 1e-6) return radial;

  const normal: Point = [tangent[1], -tangent[0]];
  return normal[0] * ox + normal[1] * oy < 0 ? [-normal[0], -normal[1]] : normal;
}

/**
 * Outline crossing at `angle`, with the direction across a probe window either side of it.
 * `turn` is zero along a straight side and grows with curvature, which separates sides from curves.
 */
function probeOutline(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  origin: Point,
  angle: number,
  radius: number,
  probe: number,
  maxRadius: number,
): OutlineHit {
  const delta = probe / Math.max(radius, 1);
  const point: Point = [origin[0] + Math.cos(angle) * radius, origin[1] + Math.sin(angle) * radius];
  const back = boundaryPoint(ctx, path, origin, angle - delta, maxRadius, BISECTION_STEPS);
  const forward = boundaryPoint(ctx, path, origin, angle + delta, maxRadius, BISECTION_STEPS);

  const ax = point[0] - back.point[0];
  const ay = point[1] - back.point[1];
  const bx = forward.point[0] - point[0];
  const by = forward.point[1] - point[1];
  const aLength = Math.hypot(ax, ay);
  const bLength = Math.hypot(bx, by);

  if (aLength < 1e-6 || bLength < 1e-6) return { point, angle, radius, tangent: [0, 0], turn: 0 };

  const sumX = ax / aLength + bx / bLength;
  const sumY = ay / aLength + by / bLength;
  const sumLength = Math.hypot(sumX, sumY);
  return {
    point,
    angle,
    radius,
    tangent: sumLength > 1e-6 ? [sumX / sumLength, sumY / sumLength] : [ax / aLength, ay / aLength],
    turn: Math.abs(Math.atan2(ax * by - ay * bx, ax * bx + ay * by)),
  };
}

/** Outline crossing where the direction towards the target leaves the silhouette. */
function rayOnOutline(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  origin: Point,
  target: Point,
  probe: number,
  maxRadius: number,
): OutlineHit | null {
  const dx = target[0] - origin[0];
  const dy = target[1] - origin[1];
  if (Math.hypot(dx, dy) < 1e-6) return null;

  const angle = Math.atan2(dy, dx);
  const radius = boundaryRadius(ctx, path, origin, angle, maxRadius);
  return probeOutline(ctx, path, origin, angle, radius, probe, maxRadius);
}

/** Nearest point on the silhouette to a local-space target, found by scanning the crossing angle. */
function closestOnOutline(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  origin: Point,
  target: Point,
  probe: number,
  maxRadius: number,
): OutlineHit {
  let from = -Math.PI;
  let to = Math.PI;
  let bestAngle = from;
  let bestPoint: Point = origin;
  let bestRadius = 0;

  for (const [samples, steps] of CLOSEST_PASSES) {
    const step = (to - from) / samples;
    let bestDistSq = Number.POSITIVE_INFINITY;
    for (let i = 0; i <= samples; i++) {
      const angle = from + i * step;
      const candidate = boundaryPoint(ctx, path, origin, angle, maxRadius, steps);
      const distX = candidate.point[0] - target[0];
      const distY = candidate.point[1] - target[1];
      const distSq = distX * distX + distY * distY;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestAngle = angle;
        bestPoint = candidate.point;
        bestRadius = candidate.radius;
      }
    }
    from = bestAngle - step;
    to = bestAngle + step;
  }

  const hit = probeOutline(ctx, path, origin, bestAngle, bestRadius, probe, maxRadius);
  return { ...hit, point: bestPoint };
}

/**
 * Pins the attachment to the midpoint of the box side facing the target, but only when the outline runs
 * straight through that midpoint. Round, slanted, hollow and spiked silhouettes keep the exact crossing,
 * so the attachment still points at the target.
 */
function straightSidePin(
  ctx: CanvasRenderingContext2D,
  path: Path2D,
  box: Box,
  origin: Point,
  target: Point,
  probe: number,
  maxRadius: number,
): { point: Point; normal: Point } | null {
  const side = facingSide(box, origin, target);
  const centre = boxFaceCentre(box, side);
  const normal = faceNormal(side);
  if (!centre || !normal) return null;

  const dx = centre[0] - origin[0];
  const dy = centre[1] - origin[1];
  const extent = Math.hypot(dx, dy);
  if (extent < 1e-6) return null;

  const angle = Math.atan2(dy, dx);
  const radius = boundaryRadius(ctx, path, origin, angle, maxRadius);
  if (Math.abs(radius - extent) > FACE_SNAP_TOLERANCE) return null;

  const midpoint = probeOutline(ctx, path, origin, angle, radius, probe, maxRadius);
  return midpoint.turn <= STRAIGHT_TURN ? { point: centre, normal } : null;
}

/**
 * Calculates the attachment point on an SVG path outline, assuming the outline encloses the box center.
 * "auto" pins to the midpoint of the facing straight side when there is one, "closest" takes the nearest
 * outline point, and "ray" takes the crossing of the direction towards the target.
 * Accounts for element scale and rotation, and falls back to box geometry when the outline cannot be queried.
 */
export function getPathAnchorPoint(
  pathEl: SVGGeometryElement | null | undefined,
  box: Box,
  target: Point,
  padding = 6,
  mode: AnchorMode = "auto",
): AnchorPoint {
  const ctx = getQueryContext();
  const path = ctx ? getQueryPath(pathEl) : null;
  const origin: Point = [box.width / 2, box.height / 2];

  // Hollow and open outlines leave the center unfilled, where box geometry is the better answer.
  if (ctx && path && ctx.isPointInPath(path, origin[0], origin[1])) {
    const maxRadius = Math.hypot(box.width, box.height);
    const probe = Math.min(box.width, box.height) * PROBE_FRACTION;
    const localTarget = toLocalPoint(box, target);

    const hit =
      mode === "closest"
        ? closestOnOutline(ctx, path, origin, localTarget, probe, maxRadius)
        : rayOnOutline(ctx, path, origin, localTarget, probe, maxRadius);

    if (hit) {
      const pinned =
        mode === "auto"
          ? straightSidePin(ctx, path, box, origin, localTarget, probe, maxRadius)
          : null;
      const point = pinned?.point ?? hit.point;
      const localNormal = pinned?.normal ?? outwardNormal(hit.tangent, hit.point, origin);
      const gap = padding / boxScale(box);
      const padded: Point = [point[0] + localNormal[0] * gap, point[1] + localNormal[1] * gap];
      const normal = rotateVector(localNormal, box.rotation ?? 0);
      return { point: toWorldPoint(box, padded), side: dominantSide(normal), normal };
    }
  }

  if (mode === "closest") return getClosestBoxPoint(box, target, padding);

  // Box fallback for outlines that cannot be queried. No reliable surface normal is available.
  const localBox: Box = { x: 0, y: 0, width: box.width, height: box.height };
  const localPoint = getPerimeterPoint(
    localBox,
    toLocalPoint(box, target),
    Math.min(box.width, box.height) / 2,
    padding / boxScale(box),
  );
  return {
    point: toWorldPoint(box, localPoint),
    side: dominantSide([target[0] - (box.x + box.width / 2), target[1] - (box.y + box.height / 2)]),
    normal: undefined,
  };
}

/**
 * Resolved target geometry in world (stage) coordinates.
 * @category Shape & Frame
 */
export interface ResolvedTarget {
  /** World-space center point of the target. */
  point: Point;
  /** World-space box, present when the target is a DOM element. */
  box?: Box;
}

/**
 * Resolves a connector or tail target to world (stage) coordinates.
 * Accepts a DOM element, an [x, y] point, or coordinate strings and percentages.
 * Shared by Connector endpoints and live bubble tails.
 * @category Shape & Frame
 */
export function resolveTargetBox(target: unknown, stageW = 1920, stageH = 1080): ResolvedTarget {
  if (
    typeof target === "object" &&
    target !== null &&
    "domElement" in target &&
    (target as { domElement: unknown }).domElement instanceof HTMLElement
  ) {
    const el = target as {
      domElement: HTMLElement;
      scale?: number | string;
      rotation?: number | string;
      x?: number | string;
      y?: number | string;
    };
    const dom = el.domElement;
    const viewport =
      (dom.parentElement?.closest("[style*='container-type']") as HTMLElement) || dom.parentElement;

    if (viewport && dom.isConnected) {
      const vRect = viewport.getBoundingClientRect();
      const dRect = dom.getBoundingClientRect();
      const scale = vRect.width > 0 ? vRect.width / stageW : 1;
      const cx = (dRect.left - vRect.left + dRect.width / 2) / scale;
      const cy = (dRect.top - vRect.top + dRect.height / 2) / scale;
      let width = dom.offsetWidth;
      let height = dom.offsetHeight;
      if (width <= 0) width = Number.parseFloat(dom.style.width) || dRect.width / scale;
      if (height <= 0) height = Number.parseFloat(dom.style.height) || dRect.height / scale;

      return {
        point: [cx, cy],
        box: {
          x: cx - width / 2,
          y: cy - height / 2,
          width,
          height,
          scale: typeof el.scale === "number" ? el.scale : 1,
          rotation: typeof el.rotation === "number" ? el.rotation : 0,
        },
      };
    }

    const width = dom.offsetWidth || 120;
    const height = dom.offsetHeight || 60;
    const rawX = resolveCoordToPx(
      typeof el.x === "number" || typeof el.x === "string" ? el.x : 0,
      stageW,
    );
    const rawY = resolveCoordToPx(
      typeof el.y === "number" || typeof el.y === "string" ? el.y : 0,
      stageH,
    );

    return {
      point: [rawX + width / 2, rawY + height / 2],
      box: { x: rawX, y: rawY, width, height },
    };
  }

  if (Array.isArray(target) && target.length >= 2) {
    return {
      point: [
        resolveCoordToPx(target[0] as number | string, stageW),
        resolveCoordToPx(target[1] as number | string, stageH),
      ],
    };
  }

  return { point: [0, 0] };
}

/**
 * Resolves the attachment point on a target outline (or its box) towards a reference point.
 * Reuses perimeter providers (Shape/Frame) plus closest-point and box-anchor math.
 * @category Shape & Frame
 */
export function resolveTargetAnchor(
  target: unknown,
  box: Box,
  targetPt: Point,
  anchor: AnchorMode | ElementAnchor,
  padding = 6,
): AnchorPoint {
  if (isAnchorMode(anchor)) {
    if (isPerimeterProvider(target)) {
      return target.getPerimeterPoint(box, targetPt, padding, anchor);
    }
    if (anchor === "closest") return getClosestBoxPoint(box, targetPt, padding);
    return getBoxAnchorPoint(box, "auto", targetPt, padding);
  }
  return getBoxAnchorPoint(box, anchor, targetPt, padding);
}

/**
 * Resolves a live tail target to a point in the source element's local coordinate space.
 * `self` is the source element, `target` is the element or point the tail points to.
 * @category Shape & Frame
 */
export function resolveTailLocalPoint(
  self: unknown,
  target: unknown,
  anchor: AnchorMode | ElementAnchor,
  padding: number,
  stageW: number,
  stageH: number,
): Point | null {
  const selfResolved = resolveTargetBox(self, stageW, stageH);
  if (!selfResolved.box) return null;
  const targetResolved = resolveTargetBox(target, stageW, stageH);
  const tipWorld = targetResolved.box
    ? resolveTargetAnchor(target, targetResolved.box, selfResolved.point, anchor, padding).point
    : targetResolved.point;
  return toLocalPoint(selfResolved.box, tipWorld);
}

/**
 * Computes a clean 90-degree orthogonal path between two points with cardinal awareness.
 */
export function computeOrthogonalPath(
  start: Point,
  end: Point,
  startSide: CardinalSide = "center",
  endSide: CardinalSide = "center",
): string {
  // If perfectly aligned on an axis (straight line)
  if (Math.abs(start[0] - end[0]) < 3) {
    return `M ${start[0]} ${start[1]} L ${start[0]} ${end[1]}`;
  }
  if (Math.abs(start[1] - end[1]) < 3) {
    return `M ${start[0]} ${start[1]} L ${end[0]} ${start[1]}`;
  }

  // If start exits horizontally (left or right)
  if (startSide === "left" || startSide === "right") {
    if (endSide === "left" || endSide === "right" || endSide === "center") {
      // Step-Z horizontal
      const midX = (start[0] + end[0]) / 2;
      return `M ${start[0]} ${start[1]} L ${midX} ${start[1]} L ${midX} ${end[1]} L ${end[0]} ${end[1]}`;
    }
    // Exits horizontal, enters vertical (L-shape)
    return `M ${start[0]} ${start[1]} L ${end[0]} ${start[1]} L ${end[0]} ${end[1]}`;
  }

  // If start exits vertically (top or bottom)
  if (startSide === "top" || startSide === "bottom") {
    if (endSide === "top" || endSide === "bottom" || endSide === "center") {
      // Step-Z vertical
      const midY = (start[1] + end[1]) / 2;
      return `M ${start[0]} ${start[1]} L ${start[0]} ${midY} L ${end[0]} ${midY} L ${end[0]} ${end[1]}`;
    }
    // Exits vertical, enters horizontal (L-shape)
    return `M ${start[0]} ${start[1]} L ${start[0]} ${end[1]} L ${end[0]} ${end[1]}`;
  }

  // Fallback based on dominant axis
  const dx = Math.abs(end[0] - start[0]);
  const dy = Math.abs(end[1] - start[1]);
  if (dx >= dy) {
    const midX = (start[0] + end[0]) / 2;
    return `M ${start[0]} ${start[1]} L ${midX} ${start[1]} L ${midX} ${end[1]} L ${end[0]} ${end[1]}`;
  }
  const midY = (start[1] + end[1]) / 2;
  return `M ${start[0]} ${start[1]} L ${start[0]} ${midY} L ${end[0]} ${midY} L ${end[0]} ${end[1]}`;
}

/**
 * Computes a smooth cubic Bézier between two points.
 * Control points extend along the outward normals, so the curve leaves and enters perpendicular to the
 * attached faces. Endpoints without a normal fall back to the chord direction.
 */
export function computeBezierPath(
  start: Point,
  end: Point,
  startNormal?: Point,
  endNormal?: Point,
): string {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dist = Math.hypot(dx, dy);

  if (dist < 1e-4) {
    return `M ${start[0]} ${start[1]} L ${end[0]} ${end[1]}`;
  }

  const chord: Point = [dx / dist, dy / dist];
  const n1 = normalize(startNormal ?? chord);
  const n2 = normalize(endNormal ?? [-chord[0], -chord[1]]);

  // Handles stay proportional to the chord, which keeps the curve tame at any distance.
  const handle = dist * 0.4;
  const cp1x = start[0] + n1[0] * handle;
  const cp1y = start[1] + n1[1] * handle;
  const cp2x = end[0] + n2[0] * handle;
  const cp2y = end[1] + n2[1] * handle;

  return `M ${start[0]} ${start[1]} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end[0]} ${end[1]}`;
}

/**
 * Computes a single-curvature arc (quadratic Bézier) between two points with zero inflection.
 * The control point bows to the RIGHT of the travel direction (outward for clockwise layouts).
 * @param start Start point
 * @param end End point
 * @param curvature Bow factor relative to chord length (default 0.25). Negative bows left (inward).
 */
export function computeArcPath(start: Point, end: Point, curvature = 0.25): string {
  const dx = end[0] - start[0];
  const dy = end[1] - start[1];
  const dist = Math.hypot(dx, dy);

  if (dist < 1e-4) {
    return `M ${start[0]} ${start[1]} L ${end[0]} ${end[1]}`;
  }

  // Midpoint
  const midX = (start[0] + end[0]) * 0.5;
  const midY = (start[1] + end[1]) * 0.5;

  // Right-perpendicular unit vector (90° clockwise from travel direction)
  // This bows outward for nodes arranged clockwise around a circle
  const perpX = dy / dist;
  const perpY = -dx / dist;

  // Offset control point along perpendicular vector
  const offset = dist * curvature;
  const cpX = midX + perpX * offset;
  const cpY = midY + perpY * offset;

  return `M ${start[0]} ${start[1]} Q ${cpX} ${cpY} ${end[0]} ${end[1]}`;
}
