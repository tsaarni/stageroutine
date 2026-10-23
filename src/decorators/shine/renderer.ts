import type { DOMElement } from "../../dom/element";

interface ShineSurface {
  canvas: SVGSVGElement;
  outline: SVGPathElement;
  kind: "outline" | "fill";
}

const svgNS = "http://www.w3.org/2000/svg";
let nextSurface = 1;
function svg<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
) {
  const node = document.createElementNS(svgNS, tag);
  for (const [key, value] of Object.entries(attributes)) node.setAttribute(key, String(value));
  return node;
}

interface Measurement {
  matrix: DOMMatrix;
  box: DOMRect;
  corners: DOMPoint[];
}

interface LightAppearance {
  angle: number;
  width: number;
  intensity: number;
  color?: string;
  highlight?: string;
}

/** One layer per receiver; original component geometry remains the source of truth. */
function createReceiver(element: DOMElement, surface: ShineSurface) {
  const id = `sr-shine-${nextSurface++}`;
  const { canvas, outline, kind } = surface;
  const hadId = !!outline.id;
  outline.id ||= `${id}-outline`;
  const defs = svg("defs");
  const gradient = svg("linearGradient", { id: `${id}-light`, gradientUnits: "userSpaceOnUse" });
  for (const [offset, color, opacity] of [
    [0, "var(--sr-shine-color)", 0],
    [0.2, "var(--sr-shine-color)", 0.12],
    [0.4, "var(--sr-shine-color)", 0.7],
    [0.5, "var(--sr-shine-highlight)", 1],
    [0.6, "var(--sr-shine-color)", 0.7],
    [0.8, "var(--sr-shine-color)", 0.12],
    [1, "var(--sr-shine-color)", 0],
  ] as const)
    gradient.append(svg("stop", { offset, "stop-color": color, "stop-opacity": opacity }));
  const mask = svg("mask", { id: `${id}-mask`, maskUnits: "userSpaceOnUse" });
  mask.style.maskType = "alpha";
  const maskPath = svg("path", { fill: "white" });
  if (kind === "outline") {
    const boost = svg("filter", { id: `${id}-alpha`, "color-interpolation-filters": "sRGB" });
    const transfer = svg("feComponentTransfer");
    transfer.append(svg("feFuncA", { type: "linear", slope: 3 }));
    boost.append(transfer);
    defs.append(boost);
    mask.append(svg("use", { href: `#${outline.id}`, filter: `url(#${id}-alpha)` }));
  } else mask.append(maskPath);
  const blur = svg("filter", {
    id: `${id}-halo`,
    x: "-100%",
    y: "-100%",
    width: "300%",
    height: "300%",
  });
  blur.append(svg("feGaussianBlur", { stdDeviation: 2.5 }));
  defs.append(gradient, mask, blur);
  const overlay = svg("g", {
    "data-sr-shine": kind,
    "pointer-events": "none",
    "aria-hidden": "true",
    opacity: 0,
  });
  // A card's reflection belongs below its text, icons, and other child content.
  const halo = svg("g", { filter: `url(#${id}-halo)`, opacity: 0.8 });
  const core = svg("g");
  const rectangles = [halo, core].map((group) => {
    const rectangle = svg("rect", { fill: `url(#${id}-light)`, mask: `url(#${id}-mask)` });
    group.append(rectangle);
    return rectangle;
  });
  overlay.append(halo, core);
  canvas.append(defs, overlay);
  return {
    element,
    canvas,
    outline,
    overlay,
    gradient,
    hide() {
      overlay.setAttribute("opacity", "0");
    },
    measure() {
      const style = getComputedStyle(canvas);
      if (
        !element.isActive ||
        !canvas.getClientRects().length ||
        style.visibility === "hidden" ||
        Number(style.opacity) === 0
      )
        return;
      const matrix = canvas.getScreenCTM();
      if (!matrix || Math.abs(matrix.a * matrix.d - matrix.b * matrix.c) < 1e-10) return;
      const box = outline.getBBox();
      if (!box.width || !box.height) return;
      const corners = [
        new DOMPoint(box.x, box.y),
        new DOMPoint(box.x + box.width, box.y),
        new DOMPoint(box.x + box.width, box.y + box.height),
        new DOMPoint(box.x, box.y + box.height),
      ].map((point) => point.matrixTransform(matrix));
      return { matrix, box, corners };
    },
    draw(
      measurement: Measurement,
      start: DOMPoint,
      end: DOMPoint,
      appearance: LightAppearance,
      color: string,
      highlight: string,
    ) {
      const { matrix, box } = measurement;
      const inverse = matrix.inverse();
      gradient.setAttribute("x1", String(start.x));
      gradient.setAttribute("y1", String(start.y));
      gradient.setAttribute("x2", String(end.x));
      gradient.setAttribute("y2", String(end.y));
      gradient.setAttribute(
        "gradientTransform",
        `matrix(${inverse.a} ${inverse.b} ${inverse.c} ${inverse.d} ${inverse.e} ${inverse.f})`,
      );
      defs.style.setProperty("--sr-shine-color", color);
      defs.style.setProperty("--sr-shine-highlight", highlight);
      // Filled masks read the exact path produced by the component, with no second geometry calculation.
      if (kind === "fill") maskPath.setAttribute("d", outline.getAttribute("d") ?? "");
      for (const target of [mask, ...rectangles]) {
        target.setAttribute("x", String(box.x - 16));
        target.setAttribute("y", String(box.y - 16));
        target.setAttribute("width", String(box.width + 32));
        target.setAttribute("height", String(box.height + 32));
      }
      overlay.setAttribute("opacity", String(Math.min(1, appearance.intensity)));
      overlay.style.filter = appearance.intensity > 1 ? `brightness(${appearance.intensity})` : "";
    },
    dispose() {
      defs.remove();
      overlay.remove();
      if (!hadId && outline.id === `${id}-outline`) outline.removeAttribute("id");
    },
  };
}

type Receiver = ReturnType<typeof createReceiver>;

/** A single stage-aligned light field rendered through component-provided masks. */
export function createShineRenderer(appearance: LightAppearance) {
  const receivers = new Set<Receiver>();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  return {
    attach(element: DOMElement, surface: ShineSurface) {
      const receiver = createReceiver(element, surface);
      receivers.add(receiver);
      return () => {
        receiver.dispose();
        receivers.delete(receiver);
      };
    },
    render(progress: number, context: HTMLElement) {
      for (const receiver of receivers) receiver.hide();
      if (progress <= 0 || progress >= 1 || !appearance.intensity || reducedMotion.matches) return;
      const visible = [...receivers].flatMap((receiver) => {
        const measurement = receiver.measure();
        return measurement ? [{ receiver, measurement }] : [];
      });
      if (!visible.length) return;
      const angle = ((appearance.angle % 360) * Math.PI) / 180;
      const dx = Math.cos(angle),
        dy = Math.sin(angle);
      const projected = visible.flatMap(({ measurement }) =>
        measurement.corners.map((point) => point.x * dx + point.y * dy),
      );
      const minimum = Math.min(...projected),
        maximum = Math.max(...projected);
      const band = Math.max(1, (maximum - minimum) * appearance.width);
      const center = minimum - band / 2 + progress * (maximum - minimum + band);
      const start = new DOMPoint((center - band / 2) * dx, (center - band / 2) * dy);
      const end = new DOMPoint((center + band / 2) * dx, (center + band / 2) * dy);
      context.style.setProperty("--sr-shine-palette", appearance.color ?? "var(--sr-secondary)");
      context.style.setProperty(
        "--sr-shine-core",
        appearance.highlight ?? "color-mix(in srgb, var(--sr-shine-palette) 15%, white)",
      );
      const theme = getComputedStyle(context);
      const color = theme.getPropertyValue("--sr-shine-palette").trim();
      const highlight = theme.getPropertyValue("--sr-shine-core").trim();
      for (const { receiver, measurement } of visible)
        receiver.draw(measurement, start, end, appearance, color, highlight);
    },
  };
}
