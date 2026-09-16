/**
 * Geometric SVG path generators for shapes and clipping frames.
 */

export interface PathContext {
  /** Stroke width in virtual canvas pixels, used to center the stroke within bounds. */
  strokeWidth?: number;
  /** Inset padding in pixels from the element bounds. */
  inset?: number;
}

/**
 * A function that calculates an SVG path string ('d' attribute) for given dimensions.
 * @category Geometry
 */
export type PathFunction = (width: number, height: number, context?: PathContext) => string;

interface GeometryBounds {
  pad: number;
  pw: number;
  ph: number;
  cx: number;
  cy: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
}

function getGeometryBounds(w: number, h: number, context?: PathContext): GeometryBounds | null {
  const sw = context?.strokeWidth ?? 0;
  const inset = context?.inset ?? 0;
  const pad = sw / 2 + inset;
  const pw = w - pad * 2;
  const ph = h - pad * 2;
  if (pw <= 0 || ph <= 0) return null;

  return {
    pad,
    pw,
    ph,
    cx: w / 2,
    cy: h / 2,
    left: pad,
    right: pad + pw,
    top: pad,
    bottom: pad + ph,
  };
}

interface CornerRadii {
  tl: number;
  tr: number;
  br: number;
  bl: number;
}

function roundedRectPerCorner(pad: number, pw: number, ph: number, radii: CornerRadii): string {
  const { tl, tr, br, bl } = radii;
  const left = pad;
  const right = pad + pw;
  const top = pad;
  const bottom = pad + ph;

  if (tl <= 0 && tr <= 0 && br <= 0 && bl <= 0) {
    return `M ${left} ${top} H ${right} V ${bottom} H ${left} Z`;
  }

  const pathParts: string[] = [];

  pathParts.push(`M ${left + tl} ${top}`);

  pathParts.push(`H ${right - tr}`);
  if (tr > 0) {
    pathParts.push(`A ${tr} ${tr} 0 0 1 ${right} ${top + tr}`);
  }

  pathParts.push(`V ${bottom - br}`);
  if (br > 0) {
    pathParts.push(`A ${br} ${br} 0 0 1 ${right - br} ${bottom}`);
  }

  pathParts.push(`H ${left + bl}`);
  if (bl > 0) {
    pathParts.push(`A ${bl} ${bl} 0 0 1 ${left} ${bottom - bl}`);
  }

  pathParts.push(`V ${top + tl}`);
  if (tl > 0) {
    pathParts.push(`A ${tl} ${tl} 0 0 1 ${left + tl} ${top}`);
  }

  pathParts.push("Z");
  return pathParts.join(" ");
}

/**
 * Options for the box (rounded rectangle) path generator.
 * @category Geometry
 */
export interface BoxPathOptions {
  /** Corner radius in pixels (default: 12). */
  radius?: number;
}

/**
 * Options for the circle / ellipse path generator.
 * @category Geometry
 */
export interface CirclePathOptions {
  /**
   * Sizing mode:
   * - "contain" (default): preserves a 1:1 circular aspect ratio centered inside the bounds.
   * - "fill": stretches to the bounding box as a smooth ellipse.
   */
  fit?: "contain" | "fill";
}

/**
 * Options for the diamond path generator.
 * @category Geometry
 */
export interface DiamondPathOptions {
  /** Corner tip radius in pixels (default: 10.5). */
  radius?: number;
}

/**
 * Options for the triangle path generator.
 * @category Geometry
 */
export interface TrianglePathOptions {
  /** Triangle orientation: "up" (default), "down", "left", or "right". */
  direction?: "up" | "down" | "left" | "right";
  /** Corner rounding radius in pixels (default: 10). */
  radius?: number;
}

/**
 * Options for the hexagon path generator.
 * @category Geometry
 */
export interface HexagonPathOptions {
  /** Hexagon orientation: "pointy" (default, vertex at top) or "flat" (flat horizontal top). */
  orientation?: "pointy" | "flat";
}

/**
 * Options for the star path generator.
 * @category Geometry
 */
export interface StarPathOptions {
  /** Number of star points (default: 5). */
  points?: number;
  /** Ratio of inner radius to outer radius between 0 and 1 (default: 0.45). */
  innerRadius?: number;
}

/**
 * Options for the squircle (superellipse) path generator.
 * @category Geometry
 */
export interface SquirclePathOptions {
  /** Curvature tension between 0 (sharp) and 1 (round, default: 0.82). */
  curvature?: number;
}

/**
 * Options for the regular polygon path generator.
 * @category Geometry
 */
export interface PolygonPathOptions {
  /** Number of sides (minimum: 3, default: 5). */
  sides?: number;
}

/**
 * Geometric SVG path generators for shapes, cards, and clipping frames.
 * @category Geometry
 */
export const paths = {
  /**
   * Generates a rectangle with optional rounded corners.
   */
  box(options: BoxPathOptions = {}): PathFunction {
    const defaultRadius = options.radius ?? 12;
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const maxR = Math.min(geo.pw / 2, geo.ph / 2);
      const r = Math.min(Math.max(0, defaultRadius), maxR);
      let tl = r;
      let tr = r;
      let br = r;
      let bl = r;

      const ruleSide = (ctx as { ruleSide?: string } | undefined)?.ruleSide;
      if (ruleSide === "left") {
        tl = 0;
        bl = 0;
      } else if (ruleSide === "right") {
        tr = 0;
        br = 0;
      } else if (ruleSide === "top") {
        tl = 0;
        tr = 0;
      } else if (ruleSide === "bottom") {
        bl = 0;
        br = 0;
      }

      return roundedRectPerCorner(geo.pad, geo.pw, geo.ph, { tl, tr, br, bl });
    };
  },

  /**
   * Generates a circle or ellipse fitting inside bounds.
   * - `fit: "contain"` (default): forces a 1:1 circular aspect ratio.
   * - `fit: "fill"`: stretches to the full bounding box as an ellipse.
   */
  circle(options: CirclePathOptions = {}): PathFunction {
    const fit = options.fit ?? "contain";
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const rx = fit === "fill" ? geo.pw / 2 : Math.min(geo.pw, geo.ph) / 2;
      const ry = fit === "fill" ? geo.ph / 2 : rx;
      if (rx <= 0 || ry <= 0) return "";
      const k = 0.5522847498307935;
      const kx = rx * k;
      const ky = ry * k;
      const { cx, cy } = geo;
      return (
        `M ${cx} ${cy - ry} ` +
        `C ${cx + kx} ${cy - ry} ${cx + rx} ${cy - ky} ${cx + rx} ${cy} ` +
        `C ${cx + rx} ${cy + ky} ${cx + kx} ${cy + ry} ${cx} ${cy + ry} ` +
        `C ${cx - kx} ${cy + ry} ${cx - rx} ${cy + ky} ${cx - rx} ${cy} ` +
        `C ${cx - rx} ${cy - ky} ${cx - kx} ${cy - ry} ${cx} ${cy - ry} Z`
      );
    };
  },

  /**
   * Generates a capsule / pill path with fully rounded ends.
   */
  pill(): PathFunction {
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const cr = Math.min(geo.pw, geo.ph) / 2;
      return roundedRectPerCorner(geo.pad, geo.pw, geo.ph, { tl: cr, tr: cr, br: cr, bl: cr });
    };
  },

  /**
   * Generates a diamond (rhombus) decision shape with softly rounded tips.
   */
  diamond(options: DiamondPathOptions = {}): PathFunction {
    const maxRadius = options.radius ?? 10.5;
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { pad, pw, ph, cx, cy } = geo;
      const cr = Math.min(maxRadius, pw * 0.15, ph * 0.15);
      const f = cr / Math.SQRT2;
      return (
        `M ${cx + f} ${pad + f} ` +
        `L ${pad + pw - f} ${cy - f} ` +
        `A ${cr} ${cr} 0 0 1 ${pad + pw - f} ${cy + f} ` +
        `L ${cx + f} ${pad + ph - f} ` +
        `A ${cr} ${cr} 0 0 1 ${cx - f} ${pad + ph - f} ` +
        `L ${pad + f} ${cy + f} ` +
        `A ${cr} ${cr} 0 0 1 ${pad + f} ${cy - f} ` +
        `L ${cx - f} ${pad + f} ` +
        `A ${cr} ${cr} 0 0 1 ${cx + f} ${pad + f} Z`
      );
    };
  },

  /**
   * Generates a triangle pointing in the specified direction with rounded corners.
   */
  triangle(options: TrianglePathOptions = {}): PathFunction {
    const direction = options.direction ?? "up";
    const requestedRadius = options.radius ?? 10;

    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { cx, cy, pw, ph, left, right, top, bottom } = geo;

      // Calculate 3 vertices based on direction
      let v1: [number, number];
      let v2: [number, number];
      let v3: [number, number];

      switch (direction) {
        case "down":
          v1 = [cx, bottom];
          v2 = [left, top];
          v3 = [right, top];
          break;
        case "left":
          v1 = [left, cy];
          v2 = [right, top];
          v3 = [right, bottom];
          break;
        case "right":
          v1 = [right, cy];
          v2 = [left, bottom];
          v3 = [left, top];
          break;
        default:
          v1 = [cx, top];
          v2 = [right, bottom];
          v3 = [left, bottom];
          break;
      }

      const cr = Math.min(requestedRadius, pw * 0.15, ph * 0.15);
      if (cr <= 0) {
        return `M ${v1[0]} ${v1[1]} L ${v2[0]} ${v2[1]} L ${v3[0]} ${v3[1]} Z`;
      }

      // Helper to calculate arc points at each corner
      const roundCorner = (
        prev: [number, number],
        curr: [number, number],
        next: [number, number],
      ): { inPoint: [number, number]; outPoint: [number, number] } => {
        const dxIn = prev[0] - curr[0];
        const dyIn = prev[1] - curr[1];
        const lenIn = Math.hypot(dxIn, dyIn) || 1;

        const dxOut = next[0] - curr[0];
        const dyOut = next[1] - curr[1];
        const lenOut = Math.hypot(dxOut, dyOut) || 1;

        const offset = Math.min(cr * 1.5, lenIn * 0.35, lenOut * 0.35);

        return {
          inPoint: [curr[0] + (dxIn / lenIn) * offset, curr[1] + (dyIn / lenIn) * offset],
          outPoint: [curr[0] + (dxOut / lenOut) * offset, curr[1] + (dyOut / lenOut) * offset],
        };
      };

      const c1 = roundCorner(v3, v1, v2);
      const c2 = roundCorner(v1, v2, v3);
      const c3 = roundCorner(v2, v3, v1);

      return (
        `M ${c1.outPoint[0]} ${c1.outPoint[1]} ` +
        `L ${c2.inPoint[0]} ${c2.inPoint[1]} ` +
        `A ${cr} ${cr} 0 0 1 ${c2.outPoint[0]} ${c2.outPoint[1]} ` +
        `L ${c3.inPoint[0]} ${c3.inPoint[1]} ` +
        `A ${cr} ${cr} 0 0 1 ${c3.outPoint[0]} ${c3.outPoint[1]} ` +
        `L ${c1.inPoint[0]} ${c1.inPoint[1]} ` +
        `A ${cr} ${cr} 0 0 1 ${c1.outPoint[0]} ${c1.outPoint[1]} Z`
      );
    };
  },

  /**
   * Generates a regular hexagon.
   */
  hexagon(options: HexagonPathOptions = {}): PathFunction {
    const orientation = options.orientation ?? "pointy";
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { cx, cy, pw, ph } = geo;
      const rx = pw / 2;
      const ry = ph / 2;

      const points: [number, number][] = [];
      const offsetAngle = orientation === "pointy" ? -Math.PI / 2 : 0;
      for (let i = 0; i < 6; i++) {
        const angle = offsetAngle + (i * Math.PI) / 3;
        points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
      }

      const [start, ...rest] = points;
      return `M ${start[0]} ${start[1]} ${rest.map((p) => `L ${p[0]} ${p[1]}`).join(" ")} Z`;
    };
  },

  /**
   * Generates a multi-point star shape.
   */
  star(options: StarPathOptions = {}): PathFunction {
    const pointsCount = Math.max(3, options.points ?? 5);
    const innerRatio = Math.max(0.1, Math.min(0.9, options.innerRadius ?? 0.45));

    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { cx, cy, pw, ph } = geo;
      const rx = pw / 2;
      const ry = ph / 2;

      const totalVertices = pointsCount * 2;
      const vertices: [number, number][] = [];
      const step = Math.PI / pointsCount;
      const startAngle = -Math.PI / 2;

      for (let i = 0; i < totalVertices; i++) {
        const angle = startAngle + i * step;
        const rRatio = i % 2 === 0 ? 1 : innerRatio;
        vertices.push([cx + rx * rRatio * Math.cos(angle), cy + ry * rRatio * Math.sin(angle)]);
      }

      const [start, ...rest] = vertices;
      return `M ${start[0]} ${start[1]} ${rest.map((p) => `L ${p[0]} ${p[1]}`).join(" ")} Z`;
    };
  },

  /**
   * Generates a squircle (superellipse) with continuous G2 curvature.
   */
  squircle(options: SquirclePathOptions = {}): PathFunction {
    const tension = Math.max(0.2, Math.min(0.98, options.curvature ?? 0.82));

    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { pad, pw, ph, cx, cy } = geo;
      const rx = pw / 2;
      const ry = ph / 2;

      const right = pad + pw;
      const bottom = pad + ph;
      const top = pad;
      const left = pad;

      const dx = rx * tension;
      const dy = ry * tension;

      return (
        `M ${cx} ${top} ` +
        `C ${cx + dx} ${top}, ${right} ${cy - dy}, ${right} ${cy} ` +
        `C ${right} ${cy + dy}, ${cx + dx} ${bottom}, ${cx} ${bottom} ` +
        `C ${cx - dx} ${bottom}, ${left} ${cy + dy}, ${left} ${cy} ` +
        `C ${left} ${cy - dy}, ${cx - dx} ${top}, ${cx} ${top} Z`
      );
    };
  },

  /**
   * Generates a symmetrical heart shape.
   */
  heart(): PathFunction {
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { pad, pw, ph, cx } = geo;
      const top = pad;
      const bottom = pad + ph;
      const right = pad + pw;
      const left = pad;

      const cleftY = top + ph * 0.26;

      return (
        `M ${cx} ${cleftY} ` +
        `C ${cx - pw * 0.18} ${top}, ${left} ${top + ph * 0.05}, ${left} ${top + ph * 0.38} ` +
        `C ${left} ${top + ph * 0.62}, ${cx - pw * 0.22} ${top + ph * 0.82}, ${cx} ${bottom} ` +
        `C ${cx + pw * 0.22} ${top + ph * 0.82}, ${right} ${top + ph * 0.62}, ${right} ${top + ph * 0.38} ` +
        `C ${right} ${top + ph * 0.05}, ${cx + pw * 0.18} ${top}, ${cx} ${cleftY} Z`
      );
    };
  },

  /**
   * Generates a regular N-sided polygon (pentagon, octagon, etc.).
   */
  polygon(options: PolygonPathOptions = {}): PathFunction {
    const sideCount = Math.max(3, options.sides ?? 5);
    return (w, h, ctx) => {
      const geo = getGeometryBounds(w, h, ctx);
      if (!geo) return "";
      const { cx, cy, pw, ph } = geo;
      const rx = pw / 2;
      const ry = ph / 2;

      const points: [number, number][] = [];
      const offsetAngle = -Math.PI / 2;
      for (let i = 0; i < sideCount; i++) {
        const angle = offsetAngle + (i * 2 * Math.PI) / sideCount;
        points.push([cx + rx * Math.cos(angle), cy + ry * Math.sin(angle)]);
      }

      const [start, ...rest] = points;
      return `M ${start[0]} ${start[1]} ${rest.map((p) => `L ${p[0]} ${p[1]}`).join(" ")} Z`;
    };
  },
};
