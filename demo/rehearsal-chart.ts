import * as Plot from "@observablehq/plot";
import { Element, type ElementOptions } from "stageroutine";

export interface RehearsalTiming {
  section: string;
  /** Duration in seconds. */
  planned: number;
  /** Duration in seconds. */
  rehearsed: number;
}

export interface RehearsalChartOptions extends ElementOptions {
  data: readonly RehearsalTiming[];
  /** Allocated talk duration in seconds. Default: 300. */
  allocatedSeconds?: number;
  /** Bar entrance progress, from 0 to 1. Default: 0. */
  reveal?: number;
  /** Planned-to-rehearsed progress, from 0 to 1. Default: 0. */
  comparison?: number;
}

const clamp = (value: number) => Math.max(0, Math.min(1, value));
let nextChartId = 1;

function chartPart(name: string): Plot.RenderFunction {
  return (index, scales, values, dimensions, context, next) => {
    if (!next) throw new Error("A chart render transform needs the next renderer.");
    const group = next(index, scales, values, dimensions, context);
    group?.setAttribute("data-chart-part", name);
    return group;
  };
}

function svgNode<K extends keyof SVGElementTagNameMap>(
  tag: K,
  attributes: Record<string, string | number> = {},
) {
  const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
  for (const [name, value] of Object.entries(attributes)) node.setAttribute(name, String(value));
  return node;
}

function createChart(timings: readonly RehearsalTiming[], allocatedSeconds: number) {
  const maximum = Math.max(...timings.flatMap(({ planned, rehearsed }) => [planned, rehearsed]));
  const axisMaximum = Math.max(60, Math.ceil((maximum * 1.1) / 60) * 60);
  const ticks = Array.from({ length: 7 }, (_, i) => (axisMaximum * i) / 6);
  const node = document.createElement("div");
  const gradientId = `rehearsal-gradient-${nextChartId++}`;
  const plot = Plot.plot({
    width: 800,
    height: 440,
    marginTop: 100,
    marginBottom: 90,
    marginLeft: 136,
    marginRight: 104,
    style: {
      background: "transparent",
      color: "var(--sr-text-muted)",
      fontFamily: "var(--sr-font-sans)",
      fontSize: "18px",
    },
    x: {
      domain: [0, axisMaximum],
      label: null,
      tickSize: 0,
      tickPadding: 14,
      ticks,
      tickFormat: (value) => `${value} s`,
    },
    y: { domain: timings.map((d) => d.section), axis: null, padding: 0.48 },
    marks: [
      Plot.ruleX(ticks, {
        stroke: "var(--sr-text-muted)",
        strokeOpacity: 0.1,
      }),
      Plot.barX(timings, {
        y: "section",
        x: axisMaximum,
        fill: "var(--sr-text)",
        fillOpacity: 0.04,
        rx: 5,
      }),
      Plot.barX(timings, {
        y: "section",
        x: "rehearsed",
        render: chartPart("timing-bars"),
        fill: `url(#${gradientId})`,
        rx: 5,
      }),
      Plot.tickX(timings, {
        y: "section",
        x: "planned",
        render: chartPart("planned-markers"),
        stroke: "var(--sr-text)",
        strokeWidth: 2,
        strokeDasharray: "3 3",
        insetTop: -5,
        insetBottom: -5,
      }),
      Plot.text(timings, {
        y: "section",
        x: 0,
        dx: -18,
        text: "section",
        textAnchor: "end",
        fontSize: 20,
        fill: "var(--sr-text)",
      }),
      Plot.text(timings, {
        y: "section",
        x: axisMaximum,
        dx: 72,
        render: chartPart("timing-values"),
        text: (d) => `${d.rehearsed} s`,
        textAnchor: "end",
        fontSize: 26,
        fontWeight: 600,
        fill: "var(--sr-text)",
      }),
    ],
  });
  if (!(plot instanceof SVGSVGElement)) throw new Error("Expected Plot to produce an SVG chart.");
  Object.assign(plot.style, { width: "100%", height: "100%", display: "block" });
  plot.setAttribute("role", "img");
  node.append(plot);
  const highlighted = timings.reduce((best, row) =>
    row.rehearsed - row.planned > best.rehearsed - best.planned ? row : best,
  );
  const rehearsedTotal = timings.reduce((sum, row) => sum + row.rehearsed, 0);
  const { badgeText, subtitle, footer, callout } = decorateChart(
    plot,
    gradientId,
    highlighted,
    allocatedSeconds,
  );
  const markers = plot.querySelector<SVGGElement>('[data-chart-part="planned-markers"]');
  const bars = plot.querySelectorAll<SVGRectElement>('[data-chart-part="timing-bars"] rect');
  const values = plot.querySelectorAll<SVGTextElement>('[data-chart-part="timing-values"] text');
  if (!markers || bars.length !== timings.length || values.length !== timings.length)
    throw new Error("Plot did not produce the expected rehearsal marks.");
  const scale = plot.scale("x");
  if (!scale) throw new Error("Plot did not produce the rehearsal time scale.");
  const x = (value: number) => Number(scale.apply(value));
  // Capture Plot's mark order once. Drawing only updates these retained nodes.
  const marks = timings.map((_, i) => ({ bar: bars[i], value: values[i] }));

  return {
    node,
    draw({ blend, label, rows, footerOpacity }: ReturnType<typeof chartState>) {
      badgeText.textContent = blend > 0 ? "REHEARSED" : "THE PLAN";
      subtitle.textContent =
        blend > 0
          ? `Rehearsed: ${formatDuration(rehearsedTotal)} / ${formatDuration(allocatedSeconds)} allocated.`
          : "On paper, there is even time for questions.";
      for (const [i, row] of rows.entries()) {
        marks[i].bar.setAttribute("width", String(x(row.seconds) - x(0)));
        marks[i].value.textContent = `${Math.round(row.seconds)} s`;
        marks[i].value.setAttribute("opacity", String(row.opacity));
        if (row.section === highlighted.section) {
          marks[i].bar.setAttribute("fill", `url(#${gradientId}${blend > 0 ? "-demo" : ""})`);
          marks[i].bar.style.filter =
            blend > 0 ? `drop-shadow(0 0 9px rgb(52 211 153 / ${row.comparison * 0.55}))` : "none";
          marks[i].value.setAttribute("fill", blend > 0 ? "#6ee7b7" : "var(--sr-text)");
        }
      }
      markers.setAttribute("opacity", String(clamp(blend * 3) * 0.8));
      footer.setAttribute("opacity", String(footerOpacity));
      callout.setAttribute("transform", `translate(0,${(1 - footerOpacity) * 8})`);
      plot.setAttribute(
        "aria-label",
        `${label} timings: ${rows.map((row) => `${row.section} ${Math.round(row.seconds)} seconds`).join(", ")}. Dashed markers show planned durations.`,
      );
    },
  };
}

// A bounded entrance stagger leaves every row enough time to finish at reveal = 1.
function chartState(timings: readonly RehearsalTiming[], reveal: number, comparison: number) {
  const blend = clamp(comparison);
  return {
    blend,
    label: blend > 0 ? "Rehearsed" : "Planned",
    footerOpacity: clamp((blend - 0.65) / 0.35),
    rows: timings.map((timing, i) => {
      const delay = timings.length === 1 ? 0 : (i / (timings.length - 1)) * 0.3;
      const progress = clamp((reveal - delay) / 0.7);
      const growth = 1 - (1 - progress) ** 3;
      return {
        section: timing.section,
        seconds: (timing.planned + (timing.rehearsed - timing.planned) * blend) * growth,
        opacity: clamp(progress * 2),
        comparison: blend,
      };
    }),
  };
}

export function formatDuration(seconds: number): string {
  const rounded = Math.round(seconds);
  const minutes = Math.floor(rounded / 60);
  const remainder = rounded % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes} min ${remainder} s`;
}

/** A rehearsal chart with stage-controlled reveal and comparison progress. */
export function RehearsalChart(options: RehearsalChartOptions) {
  const { data, allocatedSeconds = 300, reveal = 0, comparison = 0, ...elementOptions } = options;
  if (data.length === 0 || !Number.isFinite(allocatedSeconds) || allocatedSeconds <= 0)
    throw new TypeError("RehearsalChart requires timing data and a positive allocation.");
  const timings = data.map((row) => ({ ...row }));
  if (
    new Set(timings.map((row) => row.section)).size !== timings.length ||
    timings.some(
      (row) =>
        !row.section.trim() ||
        !Number.isFinite(row.planned) ||
        !Number.isFinite(row.rehearsed) ||
        row.planned < 0 ||
        row.rehearsed < 0,
    )
  )
    throw new TypeError(
      "Rehearsal timings require unique sections and finite, nonnegative seconds.",
    );
  const chart = createChart(timings, allocatedSeconds);
  return Element(chart.node, {
    width: 80,
    height: 44,
    origin: "center",
    ...elementOptions,
    props: { reveal, comparison },
    onDraw({ reveal, comparison }) {
      chart.draw(chartState(timings, reveal, comparison));
    },
  });
}

// Visual decoration stays separate from Plot construction and frame updates.
function decorateChart(
  plot: SVGSVGElement,
  gradientId: string,
  highlighted: RehearsalTiming,
  allocatedSeconds: number,
) {
  const panel = svgNode("rect", {
    x: 0.5,
    y: 0.5,
    width: 799,
    height: 439,
    rx: 22,
    fill: "var(--sr-background)",
    "fill-opacity": 0.92,
    stroke: "var(--sr-surface-border-color)",
  });
  plot.prepend(panel);
  const defs = svgNode("defs");
  for (const [suffix, bright, dark] of [
    ["", "#7dd3fc", "#0284c7"],
    ["-demo", "#a7f3d0", "#10b981"],
  ]) {
    const gradient = svgNode("linearGradient", {
      id: `${gradientId}${suffix}`,
      x1: "0%",
      y1: "0%",
      x2: "100%",
      y2: "0%",
    });
    gradient.append(
      svgNode("stop", { offset: "0%", "stop-color": dark }),
      svgNode("stop", { offset: "100%", "stop-color": bright }),
    );
    defs.append(gradient);
  }
  plot.prepend(defs);
  const text = (
    x: number,
    y: number,
    size: number,
    color: string,
    content: string,
    anchor = "start",
  ) => {
    const label = svgNode("text", { x, y, "font-size": size, "text-anchor": anchor, fill: color });
    label.textContent = content;
    return label;
  };
  const title = text(32, 37, 23, "var(--sr-text)", `The ${allocatedSeconds / 60}-minute talk`);
  title.setAttribute("font-weight", "600");
  const subtitle = text(
    32,
    63,
    13,
    "var(--sr-text-muted)",
    "On paper, there is even time for questions.",
  );
  const badge = svgNode("g");
  const badgeText = text(700, 39, 15, "#7dd3fc", "THE PLAN", "middle");
  badgeText.setAttribute("letter-spacing", "1.4");
  badge.append(
    svgNode("rect", {
      x: 632,
      y: 18,
      width: 136,
      height: 32,
      rx: 16,
      fill: "#38bdf8",
      "fill-opacity": 0.1,
    }),
    badgeText,
  );
  const footer = svgNode("g");
  footer.append(
    svgNode("path", {
      d: "M34 402v14",
      stroke: "var(--sr-text-muted)",
      "stroke-width": 2,
      "stroke-dasharray": "3 3",
    }),
    text(48, 414, 16, "var(--sr-text-muted)", "Planned duration"),
  );
  const callout = text(
    768,
    414,
    17,
    "#6ee7b7",
    `${highlighted.section} · ${formatDuration(highlighted.rehearsed)}`,
    "end",
  );
  callout.setAttribute("font-weight", "600");
  footer.append(callout);
  plot.append(title, subtitle, badge, footer);
  return { badgeText, subtitle, footer, callout };
}
