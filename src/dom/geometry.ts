import { resolveAnchor } from "../core/interpolators";
import type { ElementAnchor, Point } from "../core/types";

export type { Point };

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
 * Calculates the attachment point on a box, supporting named cardinal faces,
 * "auto" face selection facing target, or custom [x, y] percentage anchors.
 */
export function getBoxAnchorPoint(
  box: Box,
  anchor: "auto" | ElementAnchor = "auto",
  targetPt?: Point,
  padding = 6,
): { point: Point; side: CardinalSide } {
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;

  if (anchor === "auto") {
    let chosenSide: CardinalSide = "center";
    if (targetPt) {
      const dx = targetPt[0] - cx;
      const dy = targetPt[1] - cy;
      const hw = box.width / 2;
      const hh = box.height / 2;

      // Compare slope to box aspect ratio
      if (Math.abs(dx) * hh >= Math.abs(dy) * hw) {
        chosenSide = dx >= 0 ? "right" : "left";
      } else {
        chosenSide = dy >= 0 ? "bottom" : "top";
      }
    }

    switch (chosenSide) {
      case "top":
        return { point: [cx, box.y - padding], side: "top" };
      case "bottom":
        return {
          point: [cx, box.y + box.height + padding],
          side: "bottom",
        };
      case "left":
        return { point: [box.x - padding, cy], side: "left" };
      case "right":
        return {
          point: [box.x + box.width + padding, cy],
          side: "right",
        };
      default:
        return { point: [cx, cy], side: "center" };
    }
  }

  const [pctX, pctY] = resolveAnchor(anchor);
  const px = box.x + (pctX / 100) * box.width;
  const py = box.y + (pctY / 100) * box.height;

  let padX = 0;
  let padY = 0;
  let side: CardinalSide = "center";

  if (pctX >= 99) {
    padX = padding;
    side = "right";
  } else if (pctX <= 1) {
    padX = -padding;
    side = "left";
  }

  if (pctY >= 99) {
    padY = padding;
    side = "bottom";
  } else if (pctY <= 1) {
    padY = -padding;
    side = "top";
  }

  return { point: [px + padX, py + padY], side };
}

/**
 * Computes the intersection point where a ray from box center crosses the boundary,
 * supporting rounded corners and outer padding (ideal for circular nodes / diagonal connections).
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
 * Computes perimeter intersection accounting for rotation and scale.
 */
export function getTransformedPerimeterPoint(box: Box, target: Point, r = 12, padding = 6): Point {
  const scale = box.scale ?? 1;
  const rotation = box.rotation ?? 0;

  if (rotation === 0 && scale === 1) {
    return getPerimeterPoint(box, target, r, padding);
  }

  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const rad = (-rotation * Math.PI) / 180;

  const dx = (target[0] - cx) / scale;
  const dy = (target[1] - cy) / scale;
  const localTarget: Point = [
    cx + (dx * Math.cos(rad) - dy * Math.sin(rad)),
    cy + (dx * Math.sin(rad) + dy * Math.cos(rad)),
  ];

  const localPoint = getPerimeterPoint(box, localTarget, r, padding);

  const lx = (localPoint[0] - cx) * scale;
  const ly = (localPoint[1] - cy) * scale;
  const worldRad = (rotation * Math.PI) / 180;

  return [
    cx + (lx * Math.cos(worldRad) - ly * Math.sin(worldRad)),
    cy + (lx * Math.sin(worldRad) + ly * Math.cos(worldRad)),
  ];
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
 * Computes a smooth cubic Bézier curve between two points with cardinal curvature.
 */
export function computeBezierPath(
  start: Point,
  end: Point,
  startSide: CardinalSide = "center",
  endSide: CardinalSide = "center",
): string {
  if (startSide === "top" || startSide === "bottom") {
    const dy = (end[1] - start[1]) * 0.5;
    const cp1x = start[0];
    const cp1y = start[1] + dy;
    const cp2x = end[0];
    const cp2y = end[1] - dy;
    return `M ${start[0]} ${start[1]} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end[0]} ${end[1]}`;
  }

  const dx = (end[0] - start[0]) * 0.5;
  const cp1x = start[0] + dx;
  const cp1y = start[1];
  const cp2x = end[0] - dx;
  const cp2y = end[1];

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
