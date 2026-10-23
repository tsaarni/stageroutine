import { resolveAnchor } from "../core/interpolators";
import type { ElementAnchor, Point } from "../core/types";
import { cssLength } from "../core/units";
import type { TransformOptions } from "../decorators/transform";

type TransformContribution = (props: Readonly<Record<string, unknown>>) => string;
const contributions = new WeakMap<HTMLElement, TransformContribution[]>();

/** Registers a local transform without taking ownership of DOM rendering. */
export function addTransformContribution(node: HTMLElement, render: TransformContribution): void {
  const entries = contributions.get(node) ?? [];
  entries.push(render);
  contributions.set(node, entries);
}

export function hasTransformContribution(node: HTMLElement): boolean {
  return contributions.has(node);
}

/** The DOM renderer is the only writer of the element's composed transform. */
export function renderElementTransform(
  node: HTMLElement,
  props: Readonly<Record<string, unknown>>,
): void {
  const [ox, oy] = resolveAnchor(props.origin as ElementAnchor | undefined);
  const local =
    contributions
      .get(node)
      ?.map((render) => render(props))
      .join(" ") ?? "";
  node.style.transformOrigin = "0px 0px";
  node.style.transform = `translate(${cssLength((props.x as number) ?? 0)}, ${cssLength((props.y as number) ?? 0)}) rotate(${(props.rotation as number) ?? 0}deg) scale(${(props.scale as number) ?? 1}) ${local} translate(${-ox}%, ${-oy}%)`;
}

/** Resolves a local projection independently of stage position or stage size. */
export function localTransform(options: TransformOptions = {}) {
  const {
    rotationX = 0,
    rotationY = 0,
    rotation = 0,
    scale = 1,
    z = 0,
    perspective = 220,
  } = options;
  if (
    ![rotationX, rotationY, rotation, scale, z].every(Number.isFinite) ||
    (perspective !== "none" &&
      (!Number.isFinite(perspective) || perspective <= 0 || z >= perspective))
  ) {
    throw new RangeError(
      "A transform needs finite values, positive perspective, and depth below its perspective distance.",
    );
  }
  const [a, b, c] = [rotationX, rotationY, rotation].map((degrees) => (degrees * Math.PI) / 180);
  const [sx, sy, sz] = [Math.sin(a), Math.sin(b), Math.sin(c)];
  const [cx, cy, cz] = [Math.cos(a), Math.cos(b), Math.cos(c)];
  const matrix = [
    cz * cy,
    sz * cy,
    -sy,
    cz * sy * sx - sz * cx,
    sz * sy * sx + cz * cx,
    cy * sx,
    cz * sy * cx + sz * sx,
    sz * sy * cx - cz * sx,
    cy * cx,
  ] as const;
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = matrix;
  const projection = perspective === "none" ? "" : `perspective(${cssLength(perspective)})`;
  return {
    css: `${projection} translateZ(${cssLength(z)}) matrix3d(${m0},${m1},${m2},0,${m3},${m4},${m5},0,${m6},${m7},${m8},0,0,0,0,1) scale(${scale})`,
    project([x, y]: Point): Point {
      const px = scale * (m0 * x + m3 * y);
      const py = scale * (m1 * x + m4 * y);
      const depth = z + scale * (m2 * x + m5 * y);
      if (perspective === "none") return [px, py];
      if (depth >= perspective)
        throw new RangeError("A projected point must be in front of the eye plane.");
      const factor = perspective / (perspective - depth);
      return [px * factor, py * factor];
    },
  };
}
