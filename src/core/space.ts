import type { Point } from "./types";

/** A 3D coordinate in stage units; positive Z points toward the viewer. @category Motion */
export type Point3D = readonly [number, number, number];
/** Projected source corners: top-left, top-right, bottom-right, bottom-left. Coordinates use stage units. @category Motion */
export type ProjectedQuad = readonly [Point, Point, Point, Point];
/** Perspective camera looking down negative Z. @category Motion */
export interface Camera3D {
  /** Camera coordinate in stage units. Default: [80, 45, 120]. */
  position?: Point3D;
}
/** A flat element placed in 3D. @category Motion */
export interface Plane3D {
  /** Pivot coordinate in stage units. No default. */
  position: Point3D;
  /** Unscaled width and height in stage units. No default. */
  size: Point;
  /** X, Y, then Z rotation in degrees. Default: [0, 0, 0]. */
  rotation?: Point3D;
  /** Pivot as percentages of width and height. Default: [50, 50]. */
  origin?: Point;
  /** Uniform 3D scale. Default: 1. */
  scale?: number;
}

function project(point: Point3D, camera: Camera3D = {}): Point {
  const [cx, cy, distance] = camera.position ?? [80, 45, 120];
  if (
    !point.every(Number.isFinite) ||
    ![cx, cy, distance].every(Number.isFinite) ||
    distance <= 0 ||
    point[2] >= distance
  ) {
    throw new RangeError(
      "Projection requires finite coordinates in front of a camera at positive Z.",
    );
  }
  const scale = distance / (distance - point[2]);
  return [cx + (point[0] - cx) * scale, cy + (point[1] - cy) * scale];
}

function rotate([x, y, z]: Point3D, [rx, ry, rz]: Point3D): Point3D {
  const [a, b, c] = [rx, ry, rz].map((degrees) => (degrees * Math.PI) / 180);
  const y1 = y * Math.cos(a) - z * Math.sin(a);
  const z1 = y * Math.sin(a) + z * Math.cos(a);
  const x2 = x * Math.cos(b) + z1 * Math.sin(b);
  const z2 = -x * Math.sin(b) + z1 * Math.cos(b);
  return [x2 * Math.cos(c) - y1 * Math.sin(c), x2 * Math.sin(c) + y1 * Math.cos(c), z2];
}

function worldCorners(plane: Plane3D): readonly [Point3D, Point3D, Point3D, Point3D] {
  const [width, height] = plane.size;
  const [ox, oy] = plane.origin ?? [50, 50];
  const scale = plane.scale ?? 1;
  const rotation = plane.rotation ?? [0, 0, 0];
  if (
    width <= 0 ||
    height <= 0 ||
    ![width, height, ox, oy, scale, ...rotation].every(Number.isFinite)
  ) {
    throw new RangeError(
      "A projected plane needs positive dimensions and finite transform values.",
    );
  }
  const corner = (x: number, y: number): Point3D => {
    const offset = rotate(
      [(x - (width * ox) / 100) * scale, (y - (height * oy) / 100) * scale, 0],
      rotation,
    );
    return [
      plane.position[0] + offset[0],
      plane.position[1] + offset[1],
      plane.position[2] + offset[2],
    ];
  };
  return [corner(0, 0), corner(width, 0), corner(width, height), corner(0, height)];
}

function corners(plane: Plane3D, camera?: Camera3D): ProjectedQuad {
  const points = worldCorners(plane);
  return [
    project(points[0], camera),
    project(points[1], camera),
    project(points[2], camera),
    project(points[3], camera),
  ];
}

function bounds(quad: ProjectedQuad) {
  const xs = quad.map(([x]) => x);
  const ys = quad.map(([, y]) => y);
  const x = Math.min(...xs);
  const y = Math.min(...ys);
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y };
}

/** Pure 3D rotation, perspective projection, and bounds helpers. @category Motion */
export const space = {
  /** Projects a 3D point into stage coordinates. Default camera: [80, 45, 120]. */
  project,
  /** Rotates and projects four corners. Default rotation: [0, 0, 0] degrees. */
  corners,
  /** Measures a projected quad's axis-aligned bounds in stage units. */
  bounds,
};
