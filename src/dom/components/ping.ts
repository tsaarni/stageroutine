/**
 * Shared glowing ping packet motion along SVG paths (Connectors and Shapes).
 */

export interface PingPacketOptions {
  /** Color of the glowing packet particle. */
  color?: string;
  /** Duration of the traversal in seconds (default: 0.8s). */
  duration?: number;
  /** Diameter of the particle in virtual canvas pixels (default: 12). */
  size?: number;
  /** Easing function (default: "linear"). */
  easing?: string;
  /** Start trim offset from 0.0 to 1.0 (default: 0). */
  start?: number;
  /** End trim offset from 0.0 to 1.0 (default: 1). */
  end?: number;
  /** Callback invoked when traversal completes. */
  onComplete?: () => void;
}

export interface PingHandle {
  element: SVGElement;
  animation: Animation;
  cancel: () => void;
}

/**
 * Spawns an incandescent glowing packet particle traveling along an SVG path.
 */
export function spawnPingPacket(
  svgContainer: SVGSVGElement,
  pathD: string,
  options: PingPacketOptions = {},
): PingHandle | null {
  if (!pathD) return null;

  const duration = (options.duration ?? 0.8) * 1000;
  const color = options.color ?? "#38bdf8";
  const size = options.size ?? 12;
  const easing = options.easing ?? "linear";
  const startVal = options.start ?? 0;
  const endVal = options.end ?? 1;
  const dist = endVal - startVal;

  const g = document.createElementNS("http://www.w3.org/2000/svg", "g");
  g.classList.add("sr-pulse-packet");
  g.style.offsetPath = `path('${pathD}')`;
  g.style.offsetRotate = "auto";
  g.style.willChange = "offset-distance, opacity";

  // Outer blooming neon aura
  const halo = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  halo.setAttribute("r", String(size / 2 + 1));
  halo.setAttribute("fill", color);
  halo.style.filter = `drop-shadow(0 0 4px ${color}) drop-shadow(0 0 10px ${color}) drop-shadow(0 0 18px ${color})`;

  // High-intensity incandescent center
  const core = document.createElementNS("http://www.w3.org/2000/svg", "circle");
  core.setAttribute("r", String(Math.max(2, size / 3.5)));
  core.setAttribute("fill", "#ffffff");

  g.appendChild(halo);
  g.appendChild(core);
  svgContainer.appendChild(g);

  const anim = g.animate(
    [
      { offsetDistance: `${startVal * 100}%`, opacity: 0 },
      { offsetDistance: `${(startVal + dist * 0.1) * 100}%`, opacity: 1, offset: 0.1 },
      { offsetDistance: `${(startVal + dist * 0.82) * 100}%`, opacity: 1, offset: 0.82 },
      { offsetDistance: `${endVal * 100}%`, opacity: 0, offset: 1.0 },
    ],
    {
      duration,
      easing,
      fill: "forwards",
    },
  );

  let finished = false;
  const cancel = () => {
    if (finished) return;
    finished = true;
    try {
      anim.cancel();
    } catch {
      // ignore
    }
    g.remove();
  };

  anim.onfinish = () => {
    if (finished) return;
    finished = true;
    g.remove();
    options.onComplete?.();
  };

  anim.oncancel = () => {
    if (finished) return;
    finished = true;
    g.remove();
  };

  return { element: g, animation: anim, cancel };
}
