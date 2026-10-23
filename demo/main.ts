import "./atmosphere.css";
import type { DOMElement, MotionPath, Point, ReactiveElementBase } from "stageroutine";
import {
  Annotation,
  AsciiFluid,
  BrowserWindow,
  BulletList,
  bracket,
  Card,
  CodeBlock,
  Connector,
  CSSBackground,
  defaultDark,
  defaultLight,
  dracula,
  dream,
  Frame,
  GradientFluid,
  glow,
  gradient,
  group,
  Image,
  Kicker,
  kenBurns,
  LaserPointer,
  LiveTerminal,
  layout,
  motion,
  NavigationOverlay,
  paths,
  replace,
  rule,
  SequenceDiagram,
  Shape,
  Stage,
  Starfield,
  shine,
  stagger,
  Table,
  TerminalBlock,
  Text,
  Title,
  to,
  transform,
  typewriter,
  Video,
  vignette,
  Webcam,
} from "stageroutine";
import Code from "~iconify/lucide/code-2";
import Cpu from "~iconify/lucide/cpu";
import Database from "~iconify/lucide/database";
import FileText from "~iconify/lucide/file-text";
import Flask from "~iconify/lucide/flask-conical";
import Globe from "~iconify/lucide/globe";
import Palette from "~iconify/lucide/palette";
import Party from "~iconify/lucide/party-popper";
import Rocket from "~iconify/lucide/rocket";
import { formatDuration, RehearsalChart } from "./rehearsal-chart";

const backdrop = AsciiFluid().decorate(vignette());
const stage = new Stage().background(backdrop);
const ink = "#38bdf8";
const green = "#34d399";

function surface(tint: string) {
  return `linear-gradient(135deg, color-mix(in srgb, ${tint} 18%, transparent), color-mix(in srgb, ${tint} 3%, transparent))`;
}

// Notes live beside their steps so the spoken explanation follows the choreography.
function pause(note: string) {
  stage.note(note);
  stage.pause();
}

const page = { left: 12, right: 148, footer: 85 };

function codeHint(code: string) {
  return Text(code, {
    position: [page.right, page.footer],
    origin: "bottom-right",
    color: "var(--sr-text-dim)",
    theme: { fontSans: "var(--sr-font-mono)", fontSizeBody: "var(--sr-font-size-kicker)" },
  });
}

function heading(
  section: string,
  title: string,
  subtitle: string,
  code?: string,
  options: { width?: number; x?: number; y?: number } = {},
) {
  const width = options.width ?? 112;
  const elements = [
    Kicker(section),
    Title(title, { width }),
    Text(subtitle, { width: Math.min(width, 96) }),
  ];
  layout.vstack(elements, { x: options.x ?? page.left, y: options.y ?? 11, gap: 1.5 });
  if (code) elements.push(codeHint(code));
  return elements;
}

function sampleSvgPath(
  box: { left: number; top: number; width: number; height: number },
  steps: number,
  pointAt: (t: number) => Point,
) {
  return (width: number, height: number) =>
    Array.from({ length: steps + 1 }, (_, step) => {
      const [x, y] = pointAt(step / steps);
      return `${step === 0 ? "M" : "L"} ${((x - box.left) / box.width) * width} ${((y - box.top) / box.height) * height}`;
    }).join(" ");
}

function chainConnectors(
  connectors: { end: unknown }[],
  options: { durations?: number[]; startDelay?: number } = {},
) {
  connectors.forEach((connector, i) => {
    const transition = to(1);
    if (options.durations?.[i] !== undefined) transition.duration(options.durations[i]);
    if (i === 0 && options.startDelay !== undefined) transition.delay(options.startDelay);
    if (i > 0) transition.after(connectors[i - 1] as unknown as ReactiveElementBase);
    connector.end = transition;
  });
}

function setEnterDelay(elements: DOMElement[], delay: number) {
  for (const element of elements) element.enterDelay = delay;
}

const brand = Title("StageRoutine", {
  variant: "hero",
  origin: "top",
});
const promise = Title("Code-driven presentations built for the stage.", {
  variant: "serif",
  origin: "top",
})
  .decorate(gradient())
  .decorate(glow());
layout.vstack([brand, promise], { x: "center", y: "center", gap: 2.5, align: "center" });

const introCode = codeHint('stage.scene("Stage presence").with(Title("StageRoutine"));');
introCode.opacity = 0;
const intro = Text("A presentation written in TypeScript. Including this one.", {
  position: [80, 59],
  origin: "center",
  color: "var(--sr-text-muted)",
  opacity: 0,
});
const controls = Kicker("Arrow keys to advance · Go back whenever you like", {
  position: [page.left, page.footer],
  origin: "bottom-left",
});
stage.scene("Stage presence").with(brand, promise, introCode, intro, controls);
pause(
  "Open on the centered name and promise. Let the title settle before advancing to reveal how this presentation was made.",
);
intro.opacity = to(1).duration(0.65).ease("smooth");
introCode.opacity = to(1).duration(0.55).delay(0.2).ease("smooth");
pause(
  "A presentation written in TypeScript. Including this one. The footer code hint shows a title being created and added to a scene. The centered title stays still. Go backward to hide the reveal, then advance to replay it.",
);

// A persistent title becomes the masthead; the same cards anchor the next scenes.
const launch = [
  { kicker: "01 / PLAN", title: "Outline the talk" },
  { kicker: "02 / BUILD", title: "Build the demo", background: surface(ink) },
  { kicker: "03 / PRESENT", title: "Rehearse the talk" },
].map(({ kicker, title, background }) =>
  Card([Kicker(kicker), Title(title, { variant: "serif" })], {
    background,
    width: 20,
    height: 8.5,
    opacity: 0,
  }),
);
layout.hstack(launch, { x: "center", y: 47, gap: 6 });
const composition = heading(
  "01 / COMPOSITION",
  "Reusing elements",
  "Reuse the same cards in the next scene.",
  "stage.scene('Next').with(...cards) · stagger(cards)",
  { x: 44, y: 27, width: 72 },
);
stage.scene("Same cast Different scene").with(brand, ...composition, ...launch);
brand.to({ position: [page.right, 9], origin: "top-right", scale: 0.24 });
stagger(launch).after(brand);
pause(
  "The opening title becomes our masthead. Cards arrive in a short cascade. These are independent elements positioned by a layout helper, and we will keep them for the next scene.",
);

const focus = heading(
  "02 / CONTINUITY",
  "Moving and resizing cards",
  "Expand one card. Keep the others nearby.",
  "card.to({ position, width })",
);
const focusCode = CodeBlock(
  [
    "stage.scene('Build')",
    "  .with(plan, build, present);",
    "build.to({ position: [66, 40], width: 66 });",
    "stage.pause();",
  ],
  { position: [66, 52], width: 66, opacity: 0 },
).decorate(rule());
stage.scene("Give the next idea room").with(brand, ...focus, ...launch, focusCode);
launch[0].to({ position: [28, 40], width: 26, opacity: 0.45 });
launch[1].to({ position: [66, 40], width: 66 });
launch[2].to({ position: [28, 52], width: 26, opacity: 0.45 });
focusCode.opacity = to(1).after(launch[1]);
pause(
  "The Build card expands while the other two become context. The code shows the same operation. Scene membership keeps shared objects alive; a pause records the next stop.",
);

// Compare four ways to move between the same two points.
const routes = heading(
  "03 / MOTION",
  "Motion paths",
  "Four routes between the same two points.",
  undefined,
  { width: 58 },
);
const routeExamples: {
  label: string;
  detail: string;
  code: string[];
  path: MotionPath;
  laneY: number;
  laneHeight: number;
}[] = [
  {
    label: "01 / DIRECT",
    detail: "Straight from start to finish.",
    code: ["runner.position = to(destination)", "  .duration(1.8)", "  .ease('cubicInOut');"],
    path: motion.arc(0),
    laneY: 25,
    laneHeight: 12,
  },
  {
    label: "02 / ARC",
    detail: "Take a curve around nearby content.",
    code: ["runner.position = to(destination)", "  .path(motion.arc(80))", "  .duration(1.8);"],
    path: motion.arc(80),
    laneY: 39,
    laneHeight: 12,
  },
  {
    label: "03 / BÉZIER",
    detail: "Set two control points to shape the curve.",
    code: [
      "runner.position = to(destination)",
      "  .path(motion.bezier({ control1, control2 }))",
      "  .duration(1.8);",
    ],
    path: motion.bezier((from, destination) => {
      const dx = destination[0] - from[0];
      return {
        control1: [from[0] + dx * 0.32, from[1] - dx * 0.3],
        control2: [from[0] + dx * 0.68, from[1] + dx * 0.3],
      };
    }),
    laneY: 53,
    laneHeight: 12,
  },
  {
    label: "04 / SPIRAL",
    detail: "Circle the destination before settling in.",
    code: [
      "runner.position = to(destination)",
      "  .path(motion.spiral({ turns: 1.25 }))",
      "  .duration(1.8);",
    ],
    path: motion.spiral({ turns: 1.25 }),
    laneY: 71,
    laneHeight: 22,
  },
];
const routeDetails = routeExamples.map((example, i) =>
  Text(example.detail, {
    position: [page.left, 40],
    width: 58,
    color: "var(--sr-text)",
    opacity: i === 0 ? 1 : 0,
  }),
);
const routeCodeBlocks = routeExamples.map((example, i) =>
  CodeBlock(example.code, {
    position: [page.left, 49],
    width: 58,
    opacity: i === 0 ? 1 : 0,
    interactive: false,
  }).decorate(rule()),
);
const routeFromX = 94;
const routeToX = 128;
const routeBox = { left: 90, width: 58 };

function fitRouteToLane(
  path: MotionPath,
  from: Point,
  destination: Point,
  laneHeight: number,
): MotionPath {
  const rawPath = path(from, destination);
  let maxYDeviation = 0;
  for (let i = 0; i <= 240; i++) {
    const t = i / 240;
    const [, y] = rawPath(t);
    const baselineY = from[1] + (destination[1] - from[1]) * t;
    maxYDeviation = Math.max(maxYDeviation, Math.abs(y - baselineY));
  }
  const yScale = maxYDeviation > 0 ? Math.min(1, (laneHeight / 2 - 1) / maxYDeviation) : 1;

  return (start, end) => {
    const sample = path(start, end);
    return (t) => {
      const [x, y] = sample(t);
      const baselineY = start[1] + (end[1] - start[1]) * t;
      return [x, baselineY + (y - baselineY) * yScale];
    };
  };
}

const laneFrom = (laneY: number): Point => [routeFromX, laneY];
const laneTo = (laneY: number): Point => [routeToX, laneY];
const fittedRoutes = routeExamples.map(({ path, laneY, laneHeight }) =>
  fitRouteToLane(path, laneFrom(laneY), laneTo(laneY), laneHeight),
);
const routeLabels = routeExamples.map(({ label, laneY }, i) =>
  Kicker(label, { position: [80, laneY - 4], opacity: i === 0 ? 1 : 0.45 }),
);
const routeGuides = routeExamples.map(({ laneY, laneHeight }, i) => {
  const top = laneY - laneHeight / 2;
  const sample = fittedRoutes[i](laneFrom(laneY), laneTo(laneY));
  return Shape(sampleSvgPath({ ...routeBox, top, height: laneHeight }, 240, sample), {
    position: [routeBox.left, top],
    width: routeBox.width,
    height: laneHeight,
    variant: "ghost",
    borderColor: i === 0 ? green : "rgba(255, 255, 255, 0.28)",
    strokeWidth: 1.7,
  });
});
const laneEnds = routeExamples.flatMap(({ laneY }) => [
  Shape(paths.circle(), {
    position: laneFrom(laneY),
    origin: "center",
    size: 2.5,
    background: "rgba(255, 255, 255, 0.5)",
  }),
  Shape(paths.circle(), {
    position: laneTo(laneY),
    origin: "center",
    size: 3.5,
    variant: "ghost",
    borderColor: "rgba(255, 255, 255, 0.55)",
    strokeWidth: 1.2,
  }),
]);
const runner = Shape(paths.circle(), {
  position: laneFrom(routeExamples[0].laneY),
  origin: "center",
  size: 4,
  opacity: 0,
  background: "radial-gradient(circle at 30% 25%, #ffffff, #b9e9ff 38%, #529ac5)",
  borderColor: "rgba(255,255,255,0.35)",
}).decorate(glow({ pulse: false }));
stage
  .scene("The scenic route")
  .with(
    brand,
    ...routes,
    ...routeDetails,
    ...routeCodeBlocks,
    ...routeLabels,
    ...routeGuides,
    ...laneEnds,
    runner,
  );
routeExamples.forEach((example, i) => {
  routeLabels.forEach((label, lane) => {
    label.opacity = to(lane === i ? 1 : 0.45).duration(0.2);
    routeGuides[lane].borderColor = to(lane === i ? green : "rgba(255, 255, 255, 0.28)").duration(
      0.2,
    );
  });
  if (i === 0) {
    runner.opacity = to(1).duration(0.2);
  } else {
    replace(routeDetails[i - 1], routeDetails[i], { duration: 0.6, scale: false });
    replace(routeCodeBlocks[i - 1], routeCodeBlocks[i], { duration: 0.6, scale: false });
    runner.position = laneFrom(example.laneY);
  }
  runner.position = to(laneTo(example.laneY))
    .path(fittedRoutes[i])
    .duration(1.8)
    .ease("cubicInOut");
  pause(
    `${example.label}: ${example.detail} The four lanes share the same endpoints, and the bright marker follows the highlighted route.`,
  );
});

const arrangement = heading(
  "04 / LAYOUT",
  "Rows, grids, and depth",
  "Arrange six cards in a row, a grid, and a ring.",
  "layout.hstack() → layout.grid() → .to({ z })",
);
const tiles = [
  { label: "Brief", icon: FileText },
  { label: "Design", icon: Palette },
  { label: "Build", icon: Code },
  { label: "Test", icon: Flask },
  { label: "Ship", icon: Rocket },
  { label: "Celebrate", icon: Party },
].map(({ label, icon }, i) => {
  const tint = i % 2 === 0 ? "#91b8da" : "#b7a4d9";
  return Card([icon({ size: 2.7, color: "#c5dded" }), Text(label)], {
    width: 13.5,
    height: 8,
    align: "center",
    origin: "center",
    opacity: 0,
    scale: 1,
    rotation: 0,
    background: `linear-gradient(135deg, color-mix(in srgb, ${tint} 24%, var(--sr-background)), color-mix(in srgb, ${tint} 8%, var(--sr-background)))`,
  });
});
const tileTransforms = tiles.map((tile) => {
  const effect = transform();
  tile.decorate(effect);
  return effect;
});
layout.hstack(tiles, { x: "center", y: 68.5, gap: 3.5 });
const formationLabel = Kicker("01 / THE LINEUP", {
  position: [page.left, page.footer],
  origin: "bottom-left",
});
const orbitPoint = (angle: number) =>
  [
    80 + 46 * Math.cos(angle),
    52 + 46 * Math.sin(angle) * Math.cos((78 * Math.PI) / 180),
    46 * Math.sin(angle) * Math.sin((78 * Math.PI) / 180),
  ] as const;
stage.scene("Everything in its place").with(brand, ...arrangement, formationLabel, ...tiles);
layout.hstack(tiles, {
  x: "center",
  y: 52,
  gap: 3.5,
  animate: (position, _, i) =>
    to(position)
      .path(motion.arc(-25))
      .duration(0.85)
      .delay(i * 0.09),
});
tiles.forEach((tile, i) => {
  tile
    .to({
      opacity: 1,
      scale: 1,
      rotation: i % 2 === 0 ? -4 : 4,
    })
    .duration(0.85)
    .delay(i * 0.09);
  tileTransforms[i]
    .to({ rotationX: 5, rotationY: i % 2 === 0 ? 8 : -8 })
    .duration(0.85)
    .delay(i * 0.09);
});
pause(
  "The launch team arrives in a staggered sweep. Each card is a flat stage element, with its own icon and a subtle tinted surface. The row is calculated by layout.hstack.",
);

formationLabel.text = "02 / THE PLAN";
layout.grid([tiles.slice(0, 3), tiles.slice(3)], {
  x: "center",
  y: 44,
  gapX: 12,
  gapY: 5,
  animate: (position, _, i) =>
    to(position)
      .path(motion.arc(i < 3 ? 45 : -45))
      .duration(1.15)
      .delay(i * 0.06),
});
tiles.forEach((tile, i) => {
  tile
    .to({ rotation: 0 })
    .duration(0.8)
    .delay(i * 0.06);
  tileTransforms[i]
    .to({ rotationX: 0, rotationY: 0 })
    .duration(0.8)
    .delay(i * 0.06);
});
pause(
  "The lineup separates into two curved streams and settles into a balanced grid. Brief, Design, and Build form the top row; Test, Ship, and Celebrate form the second. The same six cards stay on stage.",
);

formationLabel.text = "03 / A LITTLE DEPTH";
tiles.forEach((tile, i) => {
  const [x, y, z] = orbitPoint(((-150 + i * 60) * Math.PI) / 180);
  // Establish stable layers before the stagger starts; equal depths keep a fixed order.
  tile.zIndex = Math.round(100 + z) * tiles.length + i;
  tile
    .to({
      position: to([x, y]).path(motion.arc(i % 2 === 0 ? 35 : -35)),
      opacity: z < 0 ? 0.72 : 1,
      brightness: z < 0 ? 0.7 : 1.12,
    })
    .duration(1.35)
    .delay(i * 0.07);
  tileTransforms[i]
    .to({ z })
    .duration(1.35)
    .delay(i * 0.07);
});
pause(
  "The same cards now sit on a tilted ring in 3D. The near cards are larger and brighter; the far cards recede. Each card’s transform effect controls its depth and perspective size.",
);

const topology = heading(
  "05 / CONNECTIONS",
  "Connecting elements",
  "Lines connect the cards and stay attached when they move.",
  "routing: 'straight' | 'corner' | 'arc' | 'bezier'",
);
const actorCard = (icon: typeof Globe, label: string, position: Point, background?: string) =>
  Card([icon({ size: 2.7 }), Text(label)], {
    width: 16.5,
    height: 8.5,
    align: "center",
    position,
    background,
  });
const browser = actorCard(Globe, "Browser", [24, 47]);
const api = actorCard(Cpu, "Publish API", [72, 47], surface(ink));
const database = actorCard(Database, "Release store", [120, 47]);
const liveSite = actorCard(Rocket, "Live site", [120, 24], surface("#a5cdbf"));
const request = Connector(browser, api, {
  label: "publish",
  routing: "straight",
  fromAnchor: "right",
  toAnchor: "left",
  end: 0,
});
const save = Connector(api, database, {
  label: "save release",
  routing: "corner",
  fromAnchor: "right",
  toAnchor: "left",
  end: 0,
  color: green,
});
const deploy = Connector(database, liveSite, {
  label: "deploy",
  routing: "bezier",
  fromAnchor: "top",
  toAnchor: "bottom",
  end: 0,
  color: green,
});
const accepted = Connector(api, browser, {
  label: "202 Accepted",
  routing: "arc",
  curvature: 0.45,
  fromAnchor: "bottom",
  toAnchor: "bottom",
  end: 0,
  strokePattern: "dashed",
});
const topologyConnectors = [request, save, deploy, accepted];
stage
  .scene("Follow the publish button")
  .with(brand, ...topology, browser, api, database, liveSite, ...topologyConnectors);
formationLabel.to({ opacity: 0 }).duration(0.12);
tiles.forEach((tile, i) => {
  const delay = 0.12 + i * 0.045;
  tileTransforms[i]
    .to({ z: 0 })
    .duration(0.42)
    .delay(delay)
    .ease((t) => t * t);
  tile
    .to({ y: 112, rotation: i % 2 === 0 ? -6 : 6 })
    .duration(0.42)
    .delay(delay)
    .ease((t) => t * t);
  tile.opacity = to(0)
    .duration(0.18)
    .delay(delay + 0.24)
    .ease("linear");
});
setEnterDelay([...topology, browser, api, database, liveSite], 0.78);
chainConnectors(topologyConnectors, { startDelay: 0.78 });
pause(
  "The browser sends the release to the API. It is saved, deployed to the live site, and acknowledged. Straight, corner, arc, and Bézier connectors stay attached to their cards.",
);
// Pulse callbacks only advance the packet. Authored transitions keep highlights snapshot-safe.
const packetDuration = 0.85;
request.pulse({
  duration: packetDuration,
  color: green,
  size: 20,
  onComplete: () =>
    save.pulse({
      duration: packetDuration,
      color: green,
      size: 20,
      onComplete: () => deploy.pulse({ duration: packetDuration, color: green, size: 20 }),
    }),
});
[api, database, liveSite].forEach((destination, i) => {
  destination
    .to({ borderColor: green })
    .duration(0.16)
    .delay(packetDuration * (i + 1));
});
pause(
  "Follow one green packet: publish to the API, save to the release store, then deploy to the live site. Each destination lights up on arrival. The packet stops after deployment; go back and advance to replay it.",
);

liveSite
  .to({ position: [96, 24] })
  .duration(0.65)
  .ease("cubicInOut");
api.to({ position: [70, 63], width: 22 });
pause(
  "The live-site card moves left as the API moves and resizes. Its deployment arc follows the card. Next, the site exits and the sequence focuses on the browser, API, and release store.",
);

// Reuse the topology's actors as sequence participants.
const exchange = heading(
  "06 / SEQUENCES",
  "Sequence diagrams",
  "Follow a release from request to response.",
  "SequenceDiagram() · message(a, b)",
);
const seq = SequenceDiagram({
  participants: [browser, api, database],
  startY: 49,
  gapY: 6.5,
  lifelineLength: 34,
  lifelineOpacity: 0,
});
const publish = seq.message(browser, api, { label: "POST /releases", end: 0 });
const write = seq.message(api, database, { label: "store draft", end: 0, color: green });
const stored = seq.message(database, api, {
  label: "saved",
  end: 0,
  strokePattern: "dashed",
  color: green,
});
const response = seq.message(api, browser, {
  label: "201 Created",
  end: 0,
  strokePattern: "dashed",
});
const activation = seq.activate(api, { from: publish, to: response, opacity: 0 });
stage
  .scene("What happens after the click")
  .with(brand, ...exchange, browser, api, database, ...seq.elements);
group(api, database).to({ borderColor: "var(--sr-surface-border-color)" });
// The deployment card leaves as the same three actors reset for the sequence.
deploy.opacity = to(0).duration(0.08);
deploy.end = to(0).duration(0.18).delay(0.04).ease("cubicInOut");
liveSite
  .to({ y: -16, rotation: -5 })
  .duration(0.42)
  .delay(0.18)
  .ease((t) => t * t);
liveSite.opacity = to(0).duration(0.18).delay(0.42).ease("linear");
layout.hstack([browser, api, database], {
  x: "center",
  y: 33,
  width: 16.5,
  gap: 34,
  animate: true,
});
group(seq.lifelines).to({ opacity: 1 }).after(api);
publish.end = to(1).after(seq.lifelines[0]);
activation.opacity = to(1).after(seq.lifelines[0]);
pause(
  "The live-site card exits as the same three actors rearrange. Their lifelines appear, followed by the first request. The API activation marks work in progress.",
);
chainConnectors([write, stored, response]);
pause(
  "Save the draft, acknowledge it, then return the response. The exchange unfolds in one presenter step with explicit dependencies.",
);

const lifecycle = heading(
  "07 / STATE MACHINES",
  "State diagrams",
  "A card’s life on stage.",
  "Shape() + Card() + Connector() · state transitions",
);
const initialState = Shape(paths.circle(), {
  position: [17, 47],
  origin: "center",
  size: 3.5,
  variant: "solid",
  background: "var(--sr-text)",
});
const [backstage, entrance, spotlight, bow] = (
  [
    ["Backstage", [43, 47], "#91b8da"],
    ["Making an entrance", [82, 47], "#b7a4d9"],
    ["Stealing the scene", [121, 47], "#a5cdbf"],
    ["Taking a bow", [121, 67], "#b7a4d9"],
  ] as const
).map(([label, position, tint]) =>
  Card(label, {
    position: [...position],
    origin: "center",
    width: 23,
    height: 8,
    align: "center",
    background: surface(tint),
  }),
);
const finalState = Shape(paths.circle(), {
  position: [43, 72],
  origin: "center",
  size: 5,
  variant: "ghost",
  borderColor: "var(--sr-text)",
  doubleBorder: true,
});
const stateLink = (
  from: DOMElement,
  toState: DOMElement,
  fromAnchor: "right" | "bottom" | "left",
  toAnchor: "left" | "top" | "bottom",
  options: Parameters<typeof Connector>[2] = {},
) => Connector(from, toState, { fromAnchor, toAnchor, padding: 0, end: 0, ...options });
const stateTransitions = [
  stateLink(initialState, backstage, "right", "left", { padding: 1 }),
  stateLink(backstage, entrance, "right", "left", { label: "cue" }),
  stateLink(entrance, spotlight, "right", "left", { label: "lights up", color: green }),
  stateLink(spotlight, bow, "bottom", "top", { label: "applause" }),
  stateLink(bow, backstage, "left", "bottom", {
    label: "encore?",
    routing: "arc",
    curvature: 0.15,
  }),
  stateLink(backstage, finalState, "bottom", "top", { label: "show's over" }),
];
const stateDiagramElements = [
  initialState,
  backstage,
  entrance,
  spotlight,
  bow,
  finalState,
  ...stateTransitions,
];
stage.scene("A card's very short career").with(brand, ...lifecycle, ...stateDiagramElements);
// Clear the sequence before the state cards arrive in the same area.
[response, stored, write, publish].forEach((message, i) => {
  message.end = to(0)
    .duration(0.1)
    .delay(i * 0.1)
    .ease("cubicInOut");
  message.opacity = to(0)
    .duration(0.04)
    .delay((i + 1) * 0.1);
});
activation.opacity = to(0).duration(0.12).delay(0.28);
for (const line of seq.lifelines) {
  line.to({ height: 0 }).duration(0.18).delay(0.4).ease("cubicInOut");
  line.opacity = to(0).duration(0.06).delay(0.58);
}
group(browser, api, database).to({ opacity: 0 }).duration(0.16).delay(0.58);
setEnterDelay(stateDiagramElements, 0.76);
pause(
  "This is a UML state diagram: the filled dot starts it, the boxes are states, and the double circle marks the end.",
);
chainConnectors(stateTransitions, { durations: [0.25, 0.3, 0.35, 0.35, 0.35, 0.3] });
pause(
  "Cue, lights, applause, encore: the card returns backstage. When the show is over, the double circle marks the final state.",
);

const checkHeading = heading(
  "08 / CODE & DATA",
  "Tables, code, and terminal output",
  "Find the typo in the demo URL.",
  "Table().reveal() · CodeBlock() · replace(a, b)",
);
const checks = Table({
  headers: ["Pre-flight check", "Result", "Detail"],
  rows: [
    ["Presentation", "PASS", "Ready to present"],
    ["Backup", "PASS", "Recorded terminal output"],
    ["Live demo", "FAIL", "localhost:30000 unreachable"],
  ],
  rowsHidden: true,
  columnAlign: ["left", "center", "left"],
  position: [page.left, 37],
  width: 62,
});
const code = CodeBlock(
  [
    "const talk = {",
    '  title: "Ready for the live demo",',
    '  demoUrl: "http://localhost:30000",',
    "};",
  ],
  { position: [82, 37], width: 66 },
).decorate(bracket());
const transcript = TerminalBlock({
  title: "Recorded check output",
  lines: [
    "$ check-stage --preflight",
    "FAIL  Cannot reach port 30000",
    "The server is on port 3000.",
  ],
  position: [82, 51],
  width: 66,
});
stage.scene("One check away from the stage").with(brand, ...checkHeading, checks, code, transcript);
checks.reveal().after(code);
pause(
  "Pre-flight stage checks are ready. Drag across a table row or code line to focus it. The terminal is a recorded transcript, so this part is repeatable offline.",
);
const fixedCode = CodeBlock(
  [
    "const talk = {",
    '  title: "Ready for the live demo",',
    '  demoUrl: "http://localhost:3000",',
    "};",
  ],
  { width: 66, opacity: 0 },
).decorate(bracket());
const passedChecks = Table({
  headers: ["Pre-flight check", "Result", "Detail"],
  rows: [
    ["Presentation", "PASS", "Ready to present"],
    ["Backup", "PASS", "Recorded terminal output"],
    ["Live demo", "PASS", "localhost:3000 reachable"],
  ],
  columnAlign: ["left", "center", "left"],
  width: 62,
  opacity: 0,
});
const passedTranscript = TerminalBlock({
  title: "Recorded check output",
  lines: [
    "$ check-stage --preflight",
    "PASS  Connected to port 3000",
    "All checks passed. Stop editing things.",
  ],
  width: 66,
  opacity: 0,
});
const ready = Card("One character changed. The demo works.", {
  position: [page.left, 58],
  width: 62,
  height: 7,
  background: surface(green),
  opacity: 0,
});
stage
  .scene("A small but useful correction")
  .with(
    brand,
    ...checkHeading,
    checks,
    passedChecks,
    code,
    fixedCode,
    transcript,
    passedTranscript,
    ready,
  );
replace(code, fixedCode);
replace(transcript, passedTranscript).after(fixedCode);
replace(checks, passedChecks).after(passedTranscript);
ready.opacity = to(1).after(passedChecks);
pause(
  "The correction happens first, then the recorded check succeeds and the table reports success. Go back once: the typo, failed check, and original terminal output return together. Advance to replay the fix.",
);

// Draw the contours first, then let one reflection catch their edges.
const shapeHeading = heading(
  "09 / SHAPES",
  "Give the outline a role",
  "Draw an outline. Catch the light. Give the star its moment.",
  "paths.diamond() · paths.star() · glow().to({ intensity: 1 })",
);
const contourExamples = [
  { label: "DIAMOND", path: paths.diamond() },
  { label: "HEXAGON", path: paths.hexagon({ orientation: "flat" }) },
  { label: "SQUIRCLE", path: paths.squircle() },
  { label: "POLYGON", path: paths.polygon({ sides: 7 }) },
  { label: "STAR", path: paths.star({ points: 5 }) },
];
const contours = contourExamples.map(({ path }, i) =>
  Shape(path, {
    size: 16,
    origin: "center",
    variant: "ghost",
    end: 0,
    strokeWidth: 3,
    borderColor: "rgba(210, 225, 245, 0.45)",
    highlighted: false,
    theme: i === 4 ? { secondary: green } : undefined,
  }),
);
const contourStar = contours[4];
const starLight = glow({ intensity: 0, pulse: false });
contourStar.decorate(starLight);
layout.hstack(contours, { x: "center", y: 39, gap: 10 });
const contourLabels = contourExamples.map(({ label }, i) => {
  const caption = Kicker(label);
  layout.below(caption, contours[i], { gap: 3, align: "center" });
  return caption;
});
const contourStatus = Text("Five contours. The same drawing controls.", {
  position: [80, 69],
  origin: "center",
  width: 112,
  align: "center",
});
const contourShine = shine({ color: green });
for (const shape of contours) shape.decorate(contourShine);
stage
  .scene("More than rounded rectangles")
  .with(brand, ...shapeHeading, ...contours, ...contourLabels, contourStatus);
const contourDrawDuration = 0.75;
const contourDrawStagger = 0.3;
contours.forEach((shape, i) => {
  shape.end = to(1)
    .duration(contourDrawDuration)
    .delay(i * contourDrawStagger);
});
pause(
  "Five different contours draw in gray, one after another. They share the same end property even though their geometry differs. Pause here to compare the outlines. Advance to sweep a reflection across their edges and give the star its moment.",
);
contourStatus.to({ text: "Catch the light → let the star keep it" }).duration(0.35);
const shineDuration = 2.4;
const shineDelay = 0.15;
contourShine.to({ progress: 1 }).duration(shineDuration).delay(shineDelay).ease("linear");
const starBloom = shineDelay + shineDuration * 0.82;
contourStar
  .to({ highlighted: true, scale: 1.12, borderColor: green, strokeWidth: 5 })
  .duration(0.55)
  .delay(starBloom);
starLight
  .to({ intensity: 1.4 })
  .duration(2.15)
  .delay(starBloom)
  .ease((t) => t + 0.65 * Math.sin(Math.PI * t));
contourStar.rotation = to(360)
  .duration(1.6)
  .delay(shineDelay + shineDuration + 0.1)
  .ease("cubicInOut");
pause(
  "One diagonal band of light crosses the entire row. Only the outlines catch the reflection: a white core, mint shoulders, and a soft halo. Each shape returns to gray as the light passes. The star catches it last and blooms into a steady glow. Once the reflection clears, the star makes one centered turn. Go back once to restore the gray outlines and replay the shine.",
);

const geometry = heading(
  "09 / SHAPES",
  "Resizing shapes",
  "Connectors follow the card as it grows.",
  "card.to({ width: 44, height: 26 })",
);
const venueStep = Kicker("01 / THE TEAMS MEETING", {
  position: [page.left, page.footer],
  origin: "bottom-left",
});
const idea = Card([Rocket({ size: 3.5 }), Text("Your idea")], {
  position: [28, 53],
  origin: "center",
  width: 20,
  height: 14,
  align: "center",
});
const venueTitle = Title("Workshop", { variant: "serif" });
const venueLabel = Kicker("ROOM FOR IDEAS");
const venue = Card([venueTitle, venueLabel], {
  position: [80, 53],
  origin: "center",
  width: 26,
  height: 18,
  align: "center",
  background: surface("#a7bfe8"),
});
const audiences = ["Teams", "Conference", "Livestream"].map((name, i) =>
  Shape(paths.pill(), name, {
    position: [132, 53],
    origin: "center",
    width: 20,
    height: 6.5,
    opacity: i === 0 ? 1 : 0,
    background: surface("#a4c8c0"),
  }),
);
const ideaLink = Connector(idea, venue, {
  fromAnchor: "right",
  toAnchor: "left",
  end: 0,
  color: "rgba(210, 225, 245, 0.6)",
});
const audienceLinks = audiences.map((region, i) =>
  Connector(venue, region, {
    fromAnchor: "right",
    toAnchor: "left",
    routing: "bezier",
    end: 0,
    opacity: i === 0 ? 1 : 0,
    color: "rgba(190, 220, 215, 0.65)",
  }),
);
const expansionNote = Text("The card grows. The connectors follow.", {
  position: [80, 71],
  origin: "center",
  opacity: 0,
});
stage
  .scene("Room to grow")
  .with(
    brand,
    ...geometry,
    venueStep,
    ideaLink,
    ...audienceLinks,
    idea,
    venue,
    ...audiences,
    expansionNote,
  );
chainConnectors([ideaLink, audienceLinks[0]], { durations: [0.65, 0.65] });
pause(
  "Start with a workshop in a Teams meeting. Your idea enters a small presentation space. The API clue shows how the center card will grow.",
);

venueStep.text = "02 / THE MAIN STAGE";
venue.to({ width: 44, height: 26 }).duration(1.4).ease("cubicInOut");
venueTitle.to({ text: "Keynote" }).duration(0.7);
idea.to({ width: 22, height: 16, position: [28, 53] }).duration(1.2);
layout.vstack(audiences, {
  x: 122,
  y: 39,
  gap: 3.5,
  animate: (position, _, i) =>
    to(position)
      .path(motion.arc((i - 1) * 35))
      .duration(1.2)
      .delay(i * 0.12),
});
audiences.forEach((region, i) => {
  if (i > 0)
    region.opacity = to(1)
      .duration(0.7)
      .delay(0.35 + i * 0.12);
});
audienceLinks.forEach((connection, i) => {
  connection.opacity = to(1)
    .duration(0.5)
    .delay(0.35 + i * 0.12);
  connection.end = to(1).duration(0.7).after(audiences[i]);
});
expansionNote.opacity = to(1).duration(0.6).after(venue);
ideaLink.pulse({ duration: 1.2, color: "#dceaff" });
pause(
  "The workshop opens into a keynote. The stage grows while conference and livestream audiences fan out. The arrows keep following the resizing card. Go back to return to the Teams meeting.",
);

// Plot generates the SVG once; custom properties animate it on the stage clock.
const chartHeading = heading(
  "09 / CUSTOM COMPONENTS",
  "Bring your chart library",
  "Observable Plot, integrated as a custom StageRoutine component.",
  "Plot.plot() → Element({ props, onDraw })",
);
const chartTransform = transform({ perspective: 220 });
const rehearsalTimings = [
  { section: "Opening", planned: 30, rehearsed: 45 },
  { section: "Explain", planned: 70, rehearsed: 100 },
  { section: "Live demo", planned: 65, rehearsed: 300 },
  { section: "Closing", planned: 25, rehearsed: 45 },
];
const plannedTotal = rehearsalTimings.reduce((sum, row) => sum + row.planned, 0);
const rehearsedTotal = rehearsalTimings.reduce((sum, row) => sum + row.rehearsed, 0);
const rehearsalChart = RehearsalChart({ data: rehearsalTimings, opacity: 0 }).decorate(
  chartTransform,
);
const rehearsalTotal = Title(formatDuration(plannedTotal), { variant: "serif" });
const rehearsalCaption = Text("Five-minute slot. “I’ll leave time for questions.”", {
  style: { minHeight: "2lh", width: "100%" },
});
const rehearsalLabel = Kicker("ON PAPER");
const rehearsalSummary = Card([rehearsalLabel, rehearsalTotal, rehearsalCaption], {
  width: 38,
  height: 24,
  origin: "center",
  background: surface(ink),
  opacity: 0,
});
layout.hstack([rehearsalChart, rehearsalSummary], {
  region: { x: page.left, y: 28, width: page.right - page.left, height: 50 },
  x: "center",
  y: "center",
  gap: 10,
  align: "center",
});
stage.scene("Bring your own chart").with(brand, ...chartHeading, rehearsalChart, rehearsalSummary);
stagger([rehearsalChart, rehearsalSummary]).duration(0.65);
rehearsalChart.to({ reveal: 1 }).duration(1.3).delay(0.2).ease("linear");
pause(
  "This chart comes from Observable Plot, a separate chart library. RehearsalChart wraps its SVG with Element() to make a custom StageRoutine component. Plot builds the chart; the component's onDraw hook updates its bars and labels as StageRoutine animates reveal. The planned talk takes three minutes and ten seconds. In a five-minute slot, that leaves a suspicious amount of time for questions. Advance for the rehearsal.",
);
chartHeading[1].to({ text: "Then reality joins the rehearsal" }).duration(0.4);
chartHeading[2].to({ text: "Animate the custom component with the same .to() API." }).duration(0.4);
chartHeading[3].to({ text: "chart.to({ comparison: 1 }).duration(1.3)" }).duration(0.4);
rehearsalLabel.to({ text: "AFTER ONE REHEARSAL" }).duration(0.4);
rehearsalTotal.to({ text: formatDuration(rehearsedTotal) }).duration(0.4);
rehearsalCaption.to({ text: "The demo alone took five minutes. Any questions?" }).duration(0.4);
rehearsalSummary.to({ background: surface(green) }).duration(0.7);
rehearsalChart.to({ comparison: 1 }).duration(1.3).ease("cubicInOut");
pause(
  "The custom component exposes comparison as an animatable property. The usual .to() call grows the bars from planned to rehearsed timings; dashed markers keep the original plan visible. The live demo alone takes five minutes: the entire allocated slot. The whole talk now takes eight minutes and ten seconds, more than three minutes over time. So much for leaving time for questions. Go backward to restore the chart's planned values, just like any built-in component.",
);
chartHeading[1].to({ text: "Give the chart a new angle" }).duration(0.4);
chartHeading[2]
  .to({ text: "Custom components share the same layout and transform effects." })
  .duration(0.4);
chartHeading[3]
  .to({ text: "layout.hstack(...) · chartTransform.to({ rotationY: -35 })" })
  .duration(0.4);
rehearsalLabel.to({ text: "STILL THREE MINUTES OVER" }).duration(0.4);
rehearsalCaption.to({ text: "“Maybe it looks shorter from this angle.”" }).duration(0.4);
layout.hstack([rehearsalSummary, rehearsalChart], {
  region: { x: page.left, y: 28, width: page.right - page.left, height: 50 },
  x: "center",
  y: "center",
  gap: 10,
  align: "center",
  animate: (position, _, i) =>
    to(position)
      .path(motion.arc(i === 0 ? -20 : 20))
      .duration(1.6)
      .ease("cubicInOut"),
});
// Let the exchange finish so the turn reads as a distinct motion.
chartTransform
  .to({ rotationY: -35 })
  .duration(1.1)
  .ease("smooth")
  .after(rehearsalSummary, "position");

pause(
  "The Observable Plot component and the built-in card exchange places using the same layout helper. A reusable transform effect then turns the chart 35 degrees. None of this positioning or rotation belongs in the chart component: RehearsalChart handles its drawing, and the presentation handles the choreography. Viewing the numbers from another angle does not make the rehearsal shorter. Go backward to restore the layout, text, and turn.",
);

const callouts = heading(
  "10 / CALLOUTS",
  "Speech and thought bubbles",
  "Move the speakers. The bubble tails follow.",
  "paths.speechBubble({ tail: { to: author } })",
);
const author = Card([Code({ size: 3.5, color: "#c4dcf1" }), Text("Speaker")], {
  position: [37, 70],
  origin: "center",
  width: 17,
  height: 11,
  align: "center",
  background: surface("#91b8da"),
  opacity: 0,
  scale: 0.94,
  rotation: -3,
});
const reviewer = Card([Flask({ size: 3.5, color: "#d5caeb" }), Text("Organizer")], {
  position: [123, 70],
  origin: "center",
  width: 18,
  height: 11,
  align: "center",
  background: surface("#b7a4d9"),
  opacity: 0,
  scale: 0.94,
  rotation: 3,
});
const reviewDocument = Card([FileText({ size: 3 }), Kicker("DECK.TS")], {
  position: [59, 69],
  origin: "center",
  width: 14,
  height: 9,
  align: "center",
  rotation: -10,
  scale: 0.86,
  opacity: 0,
  background: surface("#b7c8dd"),
});
const speech = Shape(
  paths.speechBubble({ tail: { to: author, anchor: "top", padding: 6 }, radius: 16 }),
  "The talk is ready.",
  {
    position: [40, 45],
    origin: "center",
    width: 37,
    height: 11,
    scale: 0.94,
    opacity: 0,
    background: "linear-gradient(135deg, #fbbf244d, #f59e0b24)",
    borderColor: "#fbbf2480",
  },
);
const thought = Shape(
  paths.thoughtBubble({ tail: { to: reviewer, anchor: "top", padding: 6 }, lobes: 10 }),
  "Including the live demo?",
  {
    position: [120, 45],
    origin: "center",
    width: 39,
    height: 14,
    scale: 0.94,
    style: { paddingInline: "calc(2 * var(--sr-space-sm))" },
    opacity: 0,
    background: "linear-gradient(135deg, #6ee7b74d, #10b98124)",
    borderColor: "#6ee7b780",
  },
);
const reviewStatus = Kicker("01 / DRAFT ZERO", {
  position: [page.left, page.footer],
  origin: "bottom-left",
});
stage
  .scene("The comment stays with the work")
  .with(brand, ...callouts, reviewStatus, author, reviewer, reviewDocument, speech, thought);
author
  .to({ position: [37, 65], opacity: 1, scale: 1, rotation: 0 })
  .duration(0.6)
  .ease("cubicOut");
reviewer
  .to({ position: [123, 65], opacity: 1, scale: 1, rotation: 0 })
  .duration(0.6)
  .delay(0.12)
  .ease("cubicOut");
reviewDocument
  .to({ position: [59, 65], opacity: 1, scale: 1, rotation: -6 })
  .duration(0.65)
  .delay(0.25)
  .ease("cubicOut");
speech.to({ opacity: 1, scale: 1 }).duration(0.45).delay(0.55).ease("cubicOut");
thought.to({ opacity: 1, scale: 1 }).duration(0.5).delay(1.05).ease("cubicOut");
pause(
  "The speaker arrives with the deck ready to hand over. Amber marks what is said aloud; mint marks the organizer’s private doubts. The speaker says the talk is ready. A beat later, the organizer wonders whether that includes the live demo.",
);

reviewStatus.to({ text: "02 / BACKSTAGE REVIEW" }).duration(0.3);
// The deck leads the handoff. Its lift, turn, and landing share the stage clock.
reviewDocument
  .to({ position: to([94, 65]).path(motion.arc(28)) })
  .duration(1.5)
  .ease("cubicInOut");
const handoffLift = (progress: number) => progress + 2.5 * Math.sin(Math.PI * progress);
reviewDocument.to({ rotation: -2, scale: 1.04 }).duration(1.5).ease(handoffLift);
author
  .to({ position: to([45, 65]).path(motion.arc(10)), rotation: 1 })
  .duration(0.75)
  .ease("cubicInOut");
reviewer
  .to({ position: to([114, 65]).path(motion.arc(-10)), rotation: -1 })
  .duration(0.9)
  .delay(0.35)
  .ease("cubicInOut");
// Stationary bubbles keep the text readable and make the tracking tails visible.
speech.to({ text: "Yes. I even tested it." }).duration(0.35).after(reviewDocument, "position");
thought.to({ text: "On this laptop?" }).duration(0.35).delay(0.6).after(speech);
pause(
  "The speaker offers the deck. It lifts, turns, and lands beside the organizer, who steps forward to receive it. The bubbles stay in place while their tails follow the people. After the handoff, the speaker says the demo was tested. Let the confidence settle before the organizer’s thought appears: on this laptop? Go backward to restore the deck, people, and conversation.",
);

const finishHeading = [
  Kicker("11 / FINISHING TOUCHES", { position: [page.left, 33] }),
  codeHint(".decorate(dream()) · .decorate(typewriter())"),
];
const polished = Title("Text effects", {
  width: 68,
})
  .decorate(gradient())
  .decorate(glow());
const typing = Text("", {
  width: 68,
}).decorate(
  typewriter({
    delay: 0.6,
    speed: 0.055,
    deleteSpeed: 0.035,
    script: [
      "The demo works flawlessly.",
      { pause: 1.1 },
      { delete: "flawlessly.".length },
      "in the recording.",
    ],
  }),
);
const dreamReveals = [
  { kicker: "01 / THE PRESENTATION", title: "Keep the idea clear", tint: "#9bc6ed" },
  { kicker: "02 / THE BACKUP", title: "Keep a recorded run", tint: "#b6a6dc" },
  { kicker: "03 / THE DELIVERY", title: "Leave room to pause", tint: "#a5cdbf" },
].map(({ kicker, title, tint }, i) =>
  Card([Kicker(kicker), Title(title, { variant: "serif" })], {
    width: 48,
    height: 10,
    align: "left",
    background: surface(tint),
  }).decorate(
    dream({
      duration: 1.8,
      delay: i * 0.55,
      intensity: 48,
      blur: 8,
      prismatic: 0.16,
      float: 24,
    }),
  ),
);
layout.vstack(dreamReveals, { x: 100, y: 30, gap: 3 });
layout.vstack([polished, typing], { x: page.left, y: 39, gap: 2 });
stage
  .scene("A little polish goes a long way")
  .with(brand, ...finishHeading, polished, typing, ...dreamReveals);
pause(
  "The typewriter starts while the dream cards arrive. It confidently claims the demo works flawlessly, then revises that to: in the recording. The backup card on the right suddenly feels like good advice. The three cards resolve into focus in a staggered dream sequence, with ripple, blur, and prismatic edges.",
);

const wardrobe = heading(
  "12 / THEMES",
  "Changing themes",
  "Compare the same dashboard in three themes.",
  "stage.theme(defaultDark)",
);
const releaseSurface = Card("", {
  position: [page.left, 35],
  width: 88,
  height: 39,
  background: "var(--sr-surface)",
});
const dashboardKicker = Kicker("RELEASE / OVERVIEW", {
  position: [17, 40],
  color: "var(--sr-primary)",
});
const dashboardTitle = Title("Ready to publish", {
  variant: "serif",
  position: [17, 45],
  width: 75,
  color: "var(--sr-text)",
});
const dashboardDescription = Text("All checks passed in three regions.", {
  position: [17, 51],
  width: 75,
  color: "var(--sr-text-muted)",
});
const releaseIcon = Rocket({ position: [88, 40], size: 4, color: "var(--sr-text)" });
const dashboardTags = ["3 regions", "Checks passed"].map((text) =>
  Shape(paths.pill(), text, {
    width: 20,
    height: 4.5,
    background: "color-mix(in srgb, var(--sr-secondary) 12%, transparent)",
    color: "var(--sr-secondary)",
  }),
);
layout.hstack(dashboardTags, { x: 17, y: 58, gap: 3 });
const publishAction = Card("Publish release", {
  position: [17, 66],
  width: 22,
  height: 5.5,
  align: "center",
  background: "var(--sr-primary)",
  color: "var(--sr-background)",
});
const publishShine = shine({ intensity: 0.65, width: 0.35 });
publishAction.decorate(publishShine);
const previewAction = Card("Preview", {
  position: [42, 66],
  width: 16,
  height: 5.5,
  align: "center",
  background: "color-mix(in srgb, var(--sr-secondary) 12%, transparent)",
  color: "var(--sr-secondary)",
});
const themeMetrics = [
  { label: "DESTINATIONS", value: "Worldwide", icon: Globe },
  { label: "PIPELINE", value: "All checks passed", icon: Flask },
  { label: "UP NEXT", value: "Publish release", icon: Party },
].flatMap(({ label, value, icon }, i) => {
  const y = 35 + i * 14;
  return [
    Card("", { position: [108, y], width: 40, height: 11, background: "var(--sr-surface)" }),
    icon({ position: [112, y + 3.75], size: 3.5, color: "var(--sr-primary)" }),
    Kicker(label, { position: [119, y + 2.2], color: "var(--sr-text-dim)" }),
    Text(value, { position: [119, y + 5.6], width: 26, color: "var(--sr-text)" }),
  ];
});
const themeLabel = Kicker("DEFAULT DARK", {
  position: [page.left, page.footer],
  origin: "bottom-left",
});
const themeCode = wardrobe[3];
stage
  .scene("Same content different mood")
  .with(
    brand,
    ...wardrobe,
    releaseSurface,
    dashboardKicker,
    dashboardTitle,
    dashboardDescription,
    releaseIcon,
    ...dashboardTags,
    publishAction,
    previewAction,
    ...themeMetrics,
    themeLabel,
  );
backdrop.opacity = 0;
[
  {
    theme: defaultDark,
    label: "DEFAULT DARK",
    code: "stage.theme(defaultDark)",
    buttonColor: "var(--sr-background)",
    note: "The launch keeps its place in the presentation. Standard surfaces and the brand palette style the release card, while text, icons, status pills, actions, and metrics all follow theme tokens.",
  },
  {
    theme: defaultLight,
    label: "CLEAN LIGHT",
    code: "stage.theme(defaultLight)",
    buttonColor: "#ffffff",
    note: "Clean Light changes the entire dashboard together. As in the brand preview, the primary action uses white text in the light preset. Surfaces and secondary text derive from the theme rather than custom accent gradients.",
  },
  {
    theme: dracula,
    label: "DRACULA",
    code: "stage.theme(dracula)",
    buttonColor: "var(--sr-background)",
    note: "Dracula changes the canvas, ambient light, text, action, icons, and secondary accents. The content and layout remain identical, making the theme's effect easy to compare.",
  },
].forEach(({ theme, label, code, buttonColor, note }, i) => {
  if (i > 0) stage.theme(theme);
  else publishShine.to({ progress: 1 }).duration(1.2).delay(0.3);
  publishAction.color = buttonColor;
  themeLabel.text = label;
  themeCode.text = code;
  pause(note);
});

stage.theme(defaultDark);
const backdropSection = Kicker("13 / BACKGROUNDS", { position: [page.left, 11] });
const atmosphereCode = codeHint("stage.background(AsciiFluid())");
const chromaticBackdrop = GradientFluid({
  colors: ["#101222", "#3f4a92", "#8674b6", "#9acddd"],
  opacity: 0.85,
  waveSpeed: 0.4,
}).decorate(vignette());
const spaceBackdrop = Starfield({ count: 2400, speed: 0.8, color: "#d2e7ff", size: 3 }).decorate(
  vignette(),
);
const graphicBackdrop = CSSBackground({
  className: "demo-atmosphere-graphic",
  background:
    "radial-gradient(ellipse at center, rgba(12, 16, 29, 0.94) 0%, rgba(12, 16, 29, 0.75) 35%, transparent 72%), radial-gradient(ellipse 32% 36% at center, #403c61 0%, rgba(64, 60, 97, 0.5) 35%, transparent 70%) 0% 0% / 200% 200%, radial-gradient(circle, rgba(195, 205, 235, 0.18) 1px, transparent 1.5px) 0 0 / 28px 28px, linear-gradient(135deg, #101421, #192235)",
});

const atmosphereExamples = [
  {
    bg: backdrop,
    label: "01 / ASCII FLUID",
    title: "ASCII fluid",
    detail: "ASCII characters follow the moving fluid.",
    code: "stage.background(AsciiFluid())",
    note: "ASCII fluid turns moving light into a field of characters. Keep the foreground simple so the background can carry the atmosphere. Advance to compare the other renderers on exactly the same stage.",
  },
  {
    bg: chromaticBackdrop,
    label: "02 / GRADIENT FLUID",
    title: "Gradient fluid",
    detail: "A slowly moving gradient fills the background.",
    code: "stage.background(GradientFluid())",
    note: "Chromatic fluid replaces the character field with continuous flowing color. This is a different renderer, not a dimmer setting. The hidden ASCII renderer stops while this background is visible.",
  },
  {
    bg: spaceBackdrop,
    label: "03 / STARFIELD",
    title: "Starfield",
    detail: "Fly through a field of stars.",
    code: "stage.background(Starfield())",
    note: "The starfield turns into view with a short speed burst, then settles into forward flight. The turn replays whenever this background becomes visible; while it stays visible, changing scenes picks a new direction. The same title and caption stay in place. Go backward to restore the previous background without leaving hidden animation loops running.",
  },
  {
    bg: graphicBackdrop,
    label: "04 / CSS BACKGROUND",
    title: "CSS background",
    detail: "Fixed dots and drifting gradients, animated with CSS.",
    code: "stage.background(CSSBackground())",
    note: "CSS keyframes slowly move the gradient layers over a stationary dot field, without a JavaScript render loop. Four distinct treatments, with the same foreground composition throughout.",
  },
];

const centeredOptions = (y: number, opacity: number) => ({
  position: [80, y] as Point,
  origin: "center" as const,
  width: 112,
  align: "center" as const,
  opacity,
});
const atmosphereTitles = atmosphereExamples.map(({ title }, i) =>
  Title(title, { ...centeredOptions(44, i === 0 ? 1 : 0) }),
);
const atmosphereDescriptions = atmosphereExamples.map(({ detail }, i) =>
  Text(detail, centeredOptions(51, i === 0 ? 1 : 0)),
);
const atmosphereLabels = atmosphereExamples.map(({ label }, i) =>
  Kicker(label, {
    position: [page.left, page.footer],
    origin: "bottom-left",
    opacity: i === 0 ? 1 : 0,
  }),
);

stage
  .scene("Set the atmosphere")
  .with(
    brand,
    backdropSection,
    atmosphereCode,
    ...atmosphereTitles,
    ...atmosphereDescriptions,
    ...atmosphereLabels,
  );

atmosphereExamples.forEach((example, i) => {
  stage.background(example.bg);
  atmosphereCode.text = example.code;
  if (i === 0) {
    backdrop.opacity = 1;
  } else {
    replace(atmosphereTitles[i - 1], atmosphereTitles[i], { duration: 0.5, scale: false });
    replace(atmosphereDescriptions[i - 1], atmosphereDescriptions[i], {
      duration: 0.5,
      scale: false,
    });
    replace(atmosphereLabels[i - 1], atmosphereLabels[i], { duration: 0.4, scale: false });
  }
  pause(example.note);
});

const mediaHeading = heading(
  "14 / MEDIA",
  "Images, video, and webcam",
  "Display media in frames and animate it.",
  undefined,
  { width: 60 },
);
const mediaCode = codeHint(".decorate(transform()) · .decorate(kenBurns())");
const earthTransform = transform({ perspective: 220 });
const photoTransform = transform({ perspective: 400 });
const earth = Video(
  "https://upload.wikimedia.org/wikipedia/commons/3/31/Earth-solar-array-timelapse.webm",
  {
    position: [42, 60.875],
    origin: "center",
    width: 60,
    height: 33.75,
    muted: true,
    playing: true,
    loop: true,
    fit: "cover",
  },
).decorate(earthTransform);
const photo = Image(
  "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000383/GSFC_20171208_Archive_e000383~large.jpg",
  { fit: "cover", alt: "NASA nebula photograph" },
);
const photoFrame = Frame(paths.box({ radius: 14 }), photo, {
  position: [116, 31],
  origin: "center",
  width: 64,
  height: 36,
})
  .decorate(kenBurns({ scale: 1.3, focus: "top-right", duration: 20 }))
  .decorate(photoTransform);
const camera = Frame(paths.circle(), Webcam({ mirror: true }), {
  position: [page.right, 77],
  origin: "bottom-right",
  size: 11,
  borderColor: "#a8c9e4",
  strokeWidth: 2,
});
const photoLabel = Kicker("01 / PHOTOGRAPH", { position: [84, 9] });
const videoLabel = Kicker("02 / EARTH IN MOTION", { position: [page.left, 40] });
const cameraLabel = Kicker("LIVE PRESENTER", { position: [132, 71.5], origin: "right" });
const mediaEncore = Title("Moving media", {
  variant: "serif",
  position: [page.left, 20],
  width: 64,
  opacity: 0,
}).decorate(gradient());
const credit = Kicker("NASA imagery · Online media · Camera optional", {
  position: [page.left, page.footer],
  origin: "bottom-left",
});
stage
  .scene("Let the picture do the talking")
  .with(
    brand,
    ...mediaHeading,
    mediaCode,
    photoLabel,
    videoLabel,
    cameraLabel,
    earth,
    photoFrame,
    camera,
    credit,
    mediaEncore,
  );
stage.background(backdrop);
backdrop.opacity = 1;
pause(
  "The photograph occupies the upper-right with a slow twenty-second Ken Burns move. The Earth timelapse has its own space on the left. The optional webcam sits in the open lower-right area. Remote media requires a connection; the camera requires browser permission.",
);
// Clear the headline before the media cross through its former space.
group(...mediaHeading, photoLabel, videoLabel, cameraLabel)
  .to({ opacity: 0 })
  .duration(0.3);
earth
  .to({
    position: to([116, 31]).path(motion.arc(0)),
    scale: 0.85,
    rotation: 2,
  })
  .duration(1.15)
  .ease("cubicInOut")
  .after(mediaHeading[1]);
photoFrame
  .to({
    position: to([46, 57]).path(motion.arc(65)),
    rotation: -2,
  })
  .duration(1.35)
  .delay(0.12)
  .ease("cubicInOut")
  .after(mediaHeading[1]);
earthTransform
  .to({ rotationX: 18, rotationY: -28 })
  .duration(1.15)
  .ease("cubicInOut")
  .after(mediaHeading[1]);
photoTransform
  .to({ rotationX: -16, rotationY: 28 })
  .duration(1.35)
  .delay(0.12)
  .ease("cubicInOut")
  .after(mediaHeading[1]);
camera
  .to({ scale: 2, borderColor: "#c8a5ed" })
  .duration(0.6)
  .ease("linear")
  .when(photoFrame, "halfway");
mediaEncore.opacity = to(1).duration(0.65).after(photoFrame);
pause(
  "The headline clears and the two media views exchange places: the video travels to the upper-right while the photograph sweeps into the lower-left on a curved route. Opposing X and Y tilts give the exchanging panels perspective depth. The webcam doubles in size in 0.6 seconds with linear timing, and its border shifts from ice blue to lavender. Transform scaling preserves the media dimensions and clipping masks during the movement.",
);

const liveHeading = heading(
  "15 / LIVE DEMOS",
  "Embedded websites and terminals",
  "Use a website and a terminal during your talk.",
  "BrowserWindow({ url }) · LiveTerminal()",
);
const web = BrowserWindow({
  url: "https://tsaarni.github.io/stageroutine/",
  title: "StageRoutine documentation",
  position: [page.left, 34],
  width: 78,
  height: 43,
});
const shell = LiveTerminal({
  title: "Live shell · local dev server",
  position: [96, 34],
  width: 52,
  height: 43,
  transcript: [
    "xterm.js displays the terminal in your browser.",
    "WebSocket + node-pty connect it to a shell.",
    "",
    "The dev server enables the live shell.",
    "Without it, a sample transcript like this appears.",
    "",
    "Ready for launch",
  ],
  autoFocus: false,
});
stage.scene("The demo can be the real thing").with(brand, ...liveHeading, web, shell);
// Open the stage for the live tools after the exchanged media clear the edges.
photoFrame.to({ x: -48 }).duration(0.5).ease("cubicInOut");
earth.to({ x: 205 }).duration(0.5).ease("cubicInOut");
group(photoFrame, earth).to({ opacity: 0 }).duration(0.25).delay(0.25).ease("linear");
group(camera, mediaEncore, credit, mediaCode).to({ opacity: 0 }).duration(0.25);
setEnterDelay([...liveHeading, web, shell], 0.52);
pause(
  "The browser embeds the documentation, subject to network and embedding policy. The live terminal connects in local development; static exports use the labeled fallback transcript. These external sessions are live: navigating backward restores the presentation, not a website or shell session.",
);

const presenterHeading = heading(
  "16 / PRESENTING",
  "Presenter notes and controls",
  "Read your notes, point, and draw while presenting.",
  "BrowserWindow({ url }) · stage.note('Your cue')",
);
const presenterPreview = BrowserWindow({
  url: `${import.meta.env.BASE_URL}presenter.html`,
  title: "Live presenter console",
  position: [page.left, 34],
  width: 88,
  height: 43,
});
const tools = BulletList(
  [
    "← / →  Back / next",
    "P  Pointer on / off",
    "Drag  Draw on the stage",
    "Z / Shift+Z  Undo / redo",
    "C  Clear annotations",
    "Esc  Exit pointer",
  ],
  { position: [108, 37], width: 40, itemsHidden: true, itemSpacing: 1 },
);
const pointerHelp = Text(
  "Click outside the browser first. Move the mouse to point; drag to draw.",
  {
    position: [108, 64],
    width: 40,
    color: "var(--sr-text-muted)",
  },
);
stage
  .scene("You still run the show")
  .with(brand, ...presenterHeading, presenterPreview, tools, pointerHelp);
tools.reveal();
pause(
  "DEMO CUE: The embedded browser is the actual presenter console at presenter.html, connected to this stage. Point out these live speaker notes, the next-scene cue, and the navigation controls. This scene deliberately shows the console to demonstrate it; in a normal talk, open it on your private presenter screen. Click outside the browser, then press P. Move the mouse to point and drag to draw. Press Z to undo, Shift+Z to redo, C to clear ink, and Escape to exit the pointer. Cmd/Ctrl+Z and Cmd/Ctrl+Shift+Z also work for undo and redo.",
);

const closing = Title("Start your own presentation", {
  variant: "serif",
  position: [80, 43],
  origin: "top",
}).decorate(gradient());
const closingCode = CodeBlock(
  [
    "const idea = Title('My next talk');",
    "stage.scene('Let’s begin').with(idea);",
    "stage.pause();",
    "stage.mount('#stage');",
  ],
  { width: 62 },
);
stage.scene("Your stage").with(brand, closing, closingCode);
backdrop.opacity = 1;
brand.to({ position: [80, 29], origin: "top", scale: 1 });
layout.vstack([closing, closingCode], { x: "center", y: 43, gap: 5, align: "center" });
pause(
  "End where we started, with the same title. We have composed, rearranged, connected, inspected, styled, and presented ordinary elements with TypeScript. Start with a title and a scene, then add a pause.",
);

stage.overlay(Annotation());
stage.overlay(LaserPointer());
stage.overlay(NavigationOverlay());
stage.mount("#stage");
