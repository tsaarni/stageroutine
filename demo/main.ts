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
  pulseSequence,
  replace,
  rule,
  SequenceDiagram,
  Shape,
  Stage,
  Starfield,
  space,
  stagger,
  Table,
  TerminalBlock,
  Text,
  Title,
  to,
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

function codeHint(code: string) {
  return Text(code, {
    position: [148, 86],
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
  options: { width?: number; subtitleY?: number } = {},
) {
  const width = options.width ?? 140;
  const elements = [
    Kicker(section, { position: [10, 12] }),
    Title(title, { position: [10, 18], width }),
    Text(subtitle, { position: [10, options.subtitleY ?? 29], width }),
  ];
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
layout.vstack([brand, promise], { x: "center", y: "center", gap: 5, align: "center" });

const introCode = codeHint('stage.scene("Stage presence").with(Title("StageRoutine"));');
introCode.opacity = 0;
const intro = Text("A presentation written in TypeScript. Including this one.", {
  position: [80, 67],
  origin: "center",
  color: "var(--sr-text-muted)",
  opacity: 0,
});
const controls = Kicker("Arrow keys to advance · Go back whenever you like", {
  position: [12, 86],
  origin: "bottom-left",
});
stage.scene("Stage presence").with(brand, promise, introCode, intro, controls);
pause(
  "Open on the centered name and promise. Let the title settle before advancing to reveal how this presentation was made.",
);
intro.opacity = to(1).duration(0.65).ease("smooth");
introCode.opacity = to(1).duration(0.55).delay(0.2).ease("smooth");
pause(
  "A presentation written in TypeScript. Including this one. The bottom-right code hint shows a title being created and added to a scene. The centered title stays still. Go backward to hide the reveal, then advance to replay it.",
);

// A persistent title becomes the masthead; the same cards anchor the next scenes.
const launch = [
  { kicker: "01 / PLAN", title: "Make it clear" },
  { kicker: "02 / BUILD", title: "Make it work", background: surface(ink) },
  { kicker: "03 / PRESENT", title: "Make it land" },
].map(({ kicker, title, background }) =>
  Card([Kicker(kicker), Title(title, { variant: "serif" })], {
    background,
    width: 20,
    height: 8.5,
    opacity: 0,
  }),
);
layout.hstack(launch, { x: "center", y: 44, gap: 4 });
const composition = heading(
  "01 / COMPOSITION",
  "Same cast. Different scene",
  "The same cards move and resize. No disappearing act.",
  "stage.scene('Next').with(...cards) · stagger(cards)",
);
stage.scene("Same cast Different scene").with(brand, ...composition, ...launch);
brand.to({ position: [10, 4], origin: "top-left", scale: 0.3 });
stagger(launch).after(brand);
pause(
  "The opening title becomes our masthead. Cards arrive in a short cascade. These are independent elements positioned by a layout helper, and we will keep them for the next scene.",
);

const focus = heading(
  "02 / CONTINUITY",
  "Give the next idea room",
  "The Build card gets more space. The others step aside.",
  "card.to({ position, width })",
);
const focusCode = CodeBlock(
  [
    "stage.scene('Build')",
    "  .with(plan, build, present);",
    "build.to({ position: [69, 44], width: 48 });",
    "stage.pause();",
  ],
  { position: [69, 56.5], width: 48, opacity: 0 },
).decorate(rule());
stage.scene("Give the next idea room").with(brand, ...focus, ...launch, focusCode);
launch[0].to({ position: [43, 44], width: 20, opacity: 0.45 });
launch[1].to({ position: [69, 44], width: 48 });
launch[2].to({ position: [43, 56.5], width: 20, opacity: 0.45 });
focusCode.opacity = to(1).after(launch[1]);
pause(
  "The Build card expands while the other two become context. The code shows the same operation. Scene membership keeps shared objects alive; a pause records the next stop.",
);

// Compare four ways to move between the same two points.
const routes = heading(
  "03 / MOTION",
  "The scenic route",
  "Same start. Same finish. Four ways through.",
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
    detail: "A direct, steady handoff between endpoints.",
    code: ["runner.position = to(destination)", "  .duration(1.8)", "  .ease('cubicInOut');"],
    path: motion.arc(0),
    laneY: 11,
    laneHeight: 12,
  },
  {
    label: "02 / ARC",
    detail: "Curves smoothly around neighboring content.",
    code: ["runner.position = to(destination)", "  .path(motion.arc(80))", "  .duration(1.8);"],
    path: motion.arc(80),
    laneY: 27,
    laneHeight: 12,
  },
  {
    label: "03 / BÉZIER",
    detail: "Two control points bend the trajectory in flight.",
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
    laneY: 43,
    laneHeight: 12,
  },
  {
    label: "04 / SPIRAL",
    detail: "Loops past the target before coiling into place.",
    code: [
      "runner.position = to(destination)",
      "  .path(motion.spiral({ turns: 1.25 }))",
      "  .duration(1.8);",
    ],
    path: motion.spiral({ turns: 1.25 }),
    laneY: 68,
    laneHeight: 30,
  },
];
const routeDetails = routeExamples.map((example, i) =>
  Text(example.detail, {
    position: [10, 46],
    width: 58,
    color: "var(--sr-text)",
    opacity: i === 0 ? 1 : 0,
  }),
);
const routeCodeBlocks = routeExamples.map((example, i) =>
  CodeBlock(example.code, {
    position: [10, 56],
    width: 58,
    opacity: i === 0 ? 1 : 0,
    interactive: false,
  }).decorate(rule()),
);
const routeFromX = 94;
const routeToX = 128;
const routeBox = { left: 90, width: 66 };

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
  Kicker(label, { position: [76, laneY - 1.5], opacity: i === 0 ? 1 : 0.45 }),
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
  "Everything in its place",
  "Six cards rearrange themselves. Put the alignment ruler away.",
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
layout.hstack(tiles, { x: "center", y: 68.5, gap: 3.5 });
const formationLabel = Kicker("01 / THE LINEUP", { position: [10, 36] });
const orbitCamera = {
  position: [stage.unitsWide / 2, stage.unitsTall / 2, stage.perspective] as const,
};
const orbitPoint = (angle: number) =>
  [
    80 + 46 * Math.cos(angle),
    52 + 46 * Math.sin(angle) * Math.cos((78 * Math.PI) / 180),
    46 * Math.sin(angle) * Math.sin((78 * Math.PI) / 180),
  ] as const;
const orbitBox = { left: 10, top: 38, width: 140, height: 48 };
const orbitShape = (from: number, toAngle: number, borderColor: string, strokeWidth: number) =>
  Shape(
    sampleSvgPath(orbitBox, 180, (t) =>
      space.project(orbitPoint(from + (toAngle - from) * t), orbitCamera),
    ),
    {
      position: [orbitBox.left, orbitBox.top],
      width: orbitBox.width,
      height: orbitBox.height,
      variant: "ghost",
      borderColor,
      strokeWidth,
      opacity: 0,
    },
  );
const orbit = orbitShape(-Math.PI, 0, "rgba(205, 225, 245, 0.14)", 1);
const orbitFront = orbitShape(0, Math.PI, "rgba(205, 225, 245, 0.4)", 1.5);
const orbitPulse = orbitShape(-Math.PI, Math.PI, "rgba(205, 232, 255, 0.55)", 2);
orbitPulse.flow = "chase";
stage
  .scene("Everything in its place")
  .with(brand, ...arrangement, formationLabel, orbit, orbitFront, orbitPulse, ...tiles);
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
      rotationX: 5,
      rotationY: i % 2 === 0 ? 8 : -8,
    })
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
    .to({ rotation: 0, rotationX: 0, rotationY: 0 })
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
      z,
      opacity: z < 0 ? 0.72 : 1,
      brightness: z < 0 ? 0.7 : 1.12,
    })
    .duration(1.35)
    .delay(i * 0.07);
});
group(orbit, orbitFront).to({ opacity: 1 }).duration(0.7).delay(0.45);
orbitPulse.opacity = to(1).duration(0.7).delay(0.65);
pause(
  "The same cards now sit on a tilted ring in 3D. The near cards are much larger and brighter; the far cards recede. The orbit and cards use the same perspective projection, so their positions agree. The z property controls depth and perspective size.",
);

const topology = heading(
  "05 / CONNECTIONS",
  "Follow the publish button",
  "Move the server. Its arrows come along for the ride.",
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
const browser = actorCard(Globe, "Browser", [19, 46]);
const api = actorCard(Cpu, "Publish API", [71, 46], surface(ink));
const database = actorCard(Database, "Release store", [123, 46]);
const liveSite = actorCard(Rocket, "Live site", [123, 10], surface("#a5cdbf"));
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
// Release the ring before the topology enters the same area.
group(orbit, orbitFront, orbitPulse, formationLabel).to({ opacity: 0 }).duration(0.12);
tiles.forEach((tile, i) => {
  const delay = 0.12 + i * 0.045;
  tile
    .to({ y: 112, z: 0, rotation: i % 2 === 0 ? -6 : 6 })
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
pulseSequence(topologyConnectors, { loop: false });
liveSite
  .to({ position: [97, 10] })
  .duration(0.65)
  .ease("cubicInOut");
api.to({ position: [69, 62], width: 22 });
pause(
  "The live-site card moves left as the API moves and resizes. Its deployment arc follows the card. Next, the site exits and the sequence focuses on the browser, API, and release store.",
);

// Reuse the topology's actors as sequence participants.
const exchange = heading(
  "06 / SEQUENCES",
  "What happens after the click",
  "Follow a request out, then watch the replies return.",
  "SequenceDiagram() · message(a, b)",
);
const seq = SequenceDiagram({
  participants: [browser, api, database],
  startY: 53,
  gapY: 6.5,
  lifelineLength: 30,
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
  y: 36,
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
  "A card's very short career",
  "Backstage, entrance, spotlight, bow. Then encore?",
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
    ["Taking a bow", [121, 65], "#b7a4d9"],
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
  position: [43, 75],
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
  "One check away from the stage",
  "The talk starts in two minutes. The pre-flight check has a small objection.",
  "Table().reveal() · CodeBlock() · replace(a, b)",
);
const checks = Table({
  headers: ["Pre-flight check", "Result", "Detail"],
  rows: [
    ["Slides", "PASS", "Zero bullet points"],
    ["Confidence", "PASS", "High (unearned)"],
    ["Live demo", "FAIL", "localhost:30000 unreachable"],
  ],
  rowsHidden: true,
  columnAlign: ["left", "center", "left"],
  position: [10, 41],
  width: 66,
});
const code = CodeBlock(
  [
    "const talk = {",
    '  title: "How to Never Fail a Demo",',
    '  demoUrl: "http://localhost:30000",',
    "};",
  ],
  { position: [84, 41], width: 66 },
).decorate(bracket());
const transcript = TerminalBlock({
  title: "Recorded check output",
  lines: [
    "$ check-stage --preflight",
    "FAIL  Cannot reach port 30000",
    "1 extra zero. Very fixable.",
  ],
  position: [84, 62],
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
    '  title: "How to Never Fail a Demo",',
    '  demoUrl: "http://localhost:3000",',
    "};",
  ],
  { width: 66, opacity: 0 },
).decorate(bracket());
const ready = Card("All checks passed. The demo gods are appeased.", {
  position: [10, 66],
  width: 66,
  height: 7,
  background: surface(green),
  opacity: 0,
});
stage
  .scene("A small but useful correction")
  .with(brand, ...checkHeading, checks, code, fixedCode, ready);
replace(code, fixedCode);
ready.opacity = to(1).after(fixedCode);
pause(
  "Replace the code block in place. The old check results stay visible as evidence of the original failure. Go back once to restore the typo and the original output.",
);

const geometry = heading(
  "09 / SHAPES",
  "Room to grow",
  "One idea. From a Teams meeting to the main stage.",
  "card.to({ width: 44, height: 26 })",
);
const venueStep = Kicker("01 / THE TEAMS MEETING", { position: [10, 36] });
const idea = Card([Rocket({ size: 3.5 }), Text("Your idea")], {
  position: [26, 56],
  origin: "center",
  width: 20,
  height: 14,
  align: "center",
});
const venueTitle = Title("Workshop", { variant: "serif" });
const venueLabel = Kicker("ROOM FOR IDEAS");
const venue = Card([venueTitle, venueLabel], {
  position: [80, 56],
  origin: "center",
  width: 26,
  height: 18,
  align: "center",
  background: surface("#a7bfe8"),
});
const audiences = ["Teams", "Conference", "Livestream"].map((name, i) =>
  Shape(paths.pill(), name, {
    position: [128, 56],
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
const expansionNote = Text("Same idea. A bigger stage.", {
  position: [80, 75],
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
idea.to({ width: 22, height: 16, position: [25, 56] }).duration(1.2);
layout.vstack(audiences, {
  x: 122,
  y: 43,
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

const callouts = heading(
  "10 / CALLOUTS",
  "The comment stays with the work",
  "Move the people. Move the work. Keep the conversation attached.",
  "paths.speechBubble({ tail: { to: author } })",
);
const author = Card([Code({ size: 3.5, color: "#c4dcf1" }), Text("Speaker")], {
  position: [25, 68],
  origin: "center",
  width: 17,
  height: 11,
  align: "center",
  background: surface("#91b8da"),
});
const reviewer = Card([Flask({ size: 3.5, color: "#d5caeb" }), Text("Organizer")], {
  position: [125, 68],
  origin: "center",
  width: 18,
  height: 11,
  align: "center",
  background: surface("#b7a4d9"),
});
const reviewDocument = Card([FileText({ size: 3 }), Kicker("DECK.TS")], {
  position: [53, 68],
  origin: "center",
  width: 14,
  height: 9,
  align: "center",
  rotation: -5,
  background: surface("#b7c8dd"),
});
const speech = Shape(
  paths.speechBubble({ tail: { to: author, anchor: "top", padding: 6 }, radius: 16 }),
  "I swear the demo worked 5 minutes ago.",
  {
    position: [38, 46],
    origin: "center",
    width: 34,
    height: 8.5,
    opacity: 0,
    background: surface("#91b8da"),
  },
);
const thought = Shape(
  paths.thoughtBubble({ tail: { to: reviewer, anchor: "top", padding: 6 }, lobes: 10 }),
  "180 slides? In 15 minutes?",
  {
    position: [115, 46],
    origin: "center",
    width: 32,
    height: 11,
    style: { paddingInline: "calc(4 * var(--sr-space-sm))" },
    opacity: 0,
    background: surface("#b7a4d9"),
  },
);
const reviewStatus = Kicker("01 / DRAFT ZERO", { position: [12, 86], origin: "bottom-left" });
stage
  .scene("The comment stays with the work")
  .with(brand, ...callouts, reviewStatus, author, reviewer, reviewDocument, speech, thought);
speech.opacity = to(1).duration(0.7);
thought.opacity = to(1).duration(0.7).delay(0.2);
pause(
  "The speaker has a deck ready for review. Speech and thought bubbles point to the two people. The card between them is the talk being handed over.",
);

reviewStatus.text = "02 / BACKSTAGE REVIEW";
// The work leads; both people gather around it without changing sides.
reviewDocument
  .to({ position: to([80, 68]).path(motion.arc(-22)), rotation: 0 })
  .duration(1.4)
  .ease("cubicInOut");
[
  [author, 50],
  [reviewer, 110],
].forEach(([person, x]) => {
  (person as typeof author)
    .to({ position: to([x as number, 68]).path(motion.arc(12)) })
    .duration(1.4)
    .delay(0.12)
    .ease("cubicInOut");
});
// Stationary bubbles keep the text readable and make the tracking tails visible.
thought
  .to({ text: "Let’s just skip to the live demo." })
  .duration(0.35)
  .after(reviewer, "position");
pause(
  "The deck moves to the center and both people gather around it. The speech and thought bubbles stay readable above them while their tails follow the people. Once everyone settles, the organizer offers practical advice. Go backward to restore the original positions and conversation.",
);

const finishHeading = heading(
  "11 / FINISHING TOUCHES",
  "A little polish goes a long way",
  "Cards ripple into focus. The headline catches the light.",
  ".decorate(dream()) · .decorate(typewriter())",
);
const polished = Title("Ready for the spotlight.", {
  variant: "serif",
  position: [10, 44],
  width: 73,
})
  .decorate(gradient())
  .decorate(glow());
const typing = Text("", {
  position: [10, 58],
  width: 76,
  theme: { fontSizeBody: "1.5rem" },
}).decorate(
  typewriter({
    delay: 3.5,
    speed: 0.055,
    deleteSpeed: 0.06,
    script: [
      "This presentation is completely unrehearsed.",
      { pause: 1.4 },
      { delete: "unrehearsed.".length },
      "rehearsed 47 times in front of a mirror.",
    ],
  }),
);
const dreamReveals = [
  { kicker: "01 / THE SLIDES", title: "Crisp vector code", tint: "#9bc6ed" },
  { kicker: "02 / THE BACKUP", title: "Recorded offline transcripts", tint: "#b6a6dc" },
  { kicker: "03 / THE DELIVERY", title: "Unshakable stage presence", tint: "#a5cdbf" },
].map(({ kicker, title, tint }, i) =>
  Card([Kicker(kicker), Title(title, { variant: "serif" })], {
    width: 44,
    height: 10,
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
layout.vstack(dreamReveals, { x: 96, y: 39, gap: 2.5 });
stage
  .scene("A little polish goes a long way")
  .with(brand, ...finishHeading, polished, typing, ...dreamReveals);
pause(
  "Watch the dream cards first. Then the large typewriter line starts, pauses long enough to read, and confesses how rehearsed this demo is. On the right, three cards resolve into focus in a staggered dream sequence. Each entrance lasts 1.8 seconds, with 0.55 seconds between starts, so the ripple, blur, and prismatic edges remain visible before settling.",
);

const wardrobe = heading(
  "12 / THEMES",
  "Same content, different mood",
  "Change one theme. The whole dashboard gets dressed.",
  "stage.theme(defaultDark)",
);
const releaseSurface = Card("", {
  position: [10, 38],
  width: 88,
  height: 38,
  background: "var(--sr-surface)",
});
const dashboardKicker = Kicker("RELEASE / OVERVIEW", {
  position: [15, 43],
  color: "var(--sr-primary)",
});
const dashboardTitle = Title("Launch day, looking good", {
  variant: "serif",
  position: [15, 48],
  width: 75,
  color: "var(--sr-text)",
});
const dashboardDescription = Text("Everything is ready for your next big reveal.", {
  position: [15, 54],
  width: 75,
  color: "var(--sr-text-muted)",
});
const releaseIcon = Rocket({ position: [85, 43], size: 4, color: "var(--sr-text)" });
const dashboardTags = ["3 regions", "Checks passed"].map((text) =>
  Shape(paths.pill(), text, {
    width: 20,
    height: 4.5,
    background: "color-mix(in srgb, var(--sr-secondary) 12%, transparent)",
    color: "var(--sr-secondary)",
  }),
);
layout.hstack(dashboardTags, { x: 15, y: 60, gap: 3 });
const publishAction = Card("Publish release", {
  position: [15, 68],
  width: 22,
  height: 5.5,
  align: "center",
  background: "var(--sr-primary)",
  color: "var(--sr-background)",
});
const previewAction = Card("Preview", {
  position: [40, 68],
  width: 16,
  height: 5.5,
  align: "center",
  background: "color-mix(in srgb, var(--sr-secondary) 12%, transparent)",
  color: "var(--sr-secondary)",
});
const themeMetrics = [
  { label: "DESTINATIONS", value: "Worldwide", icon: Globe },
  { label: "PIPELINE", value: "All checks passed", icon: Flask },
  { label: "UP NEXT", value: "Your big moment", icon: Party },
].flatMap(({ label, value, icon }, i) => {
  const y = 38 + i * 12.5;
  return [
    Card("", { position: [106, y], width: 42, height: 10.5, background: "var(--sr-surface)" }),
    icon({ position: [111, y + 3.2], size: 3.5, color: "var(--sr-primary)" }),
    Kicker(label, { position: [118, y + 2.2], color: "var(--sr-text-dim)" }),
    Text(value, { position: [118, y + 5.6], width: 29, color: "var(--sr-text)" }),
  ];
});
const themeLabel = Kicker("DEFAULT DARK", { position: [12, 86], origin: "bottom-left" });
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
  {
    theme: defaultDark,
    label: "DEFAULT DARK",
    code: "stage.theme(defaultDark)",
    buttonColor: "var(--sr-background)",
    note: "Return to Default Dark. All four steps use the same elements and the same brand palette source. Navigate backward to compare the complete dashboard in each theme.",
  },
].forEach(({ theme, label, code, buttonColor, note }, i) => {
  if (i > 0) stage.theme(theme);
  publishAction.color = buttonColor;
  themeLabel.text = label;
  themeCode.text = code;
  pause(note);
});

const backdropHeading = heading(
  "13 / BACKGROUNDS",
  "Set the atmosphere",
  "Same stage. Four completely different worlds.",
  "stage.background(AsciiFluid())",
);
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
    title: "Thought in motion",
    detail: "A living field of characters, rather than a static texture.",
    code: "stage.background(AsciiFluid())",
    note: "ASCII fluid turns moving light into a field of characters. Keep the foreground simple so the background can carry the atmosphere. Advance to compare the other renderers on exactly the same stage.",
  },
  {
    bg: chromaticBackdrop,
    label: "02 / GRADIENT FLUID",
    title: "Make the atmosphere flow",
    detail: "Soft light and flowing color. No characters, no hard edges.",
    code: "stage.background(GradientFluid())",
    note: "Chromatic fluid replaces the character field with continuous flowing color. This is a different renderer, not a dimmer setting. The hidden ASCII renderer stops while this background is visible.",
  },
  {
    bg: spaceBackdrop,
    label: "03 / STARFIELD",
    title: "Give the idea some space",
    detail: "Depth, forward motion, and a much wider horizon.",
    code: "stage.background(Starfield())",
    note: "The starfield replaces the fluid with moving particles and perspective depth. The same title and caption stay in place. Go backward to restore the previous background without leaving hidden animation loops running.",
  },
  {
    bg: graphicBackdrop,
    label: "04 / CSS BACKGROUND",
    title: "Quiet can have character",
    detail: "A steady dot field. Slowly drifting light. Pure CSS keyframes.",
    code: "stage.background(CSSBackground())",
    note: "CSS keyframes slowly move the gradient layers over a stationary dot field, without a JavaScript render loop. Four distinct treatments, with the same foreground composition throughout.",
  },
];

const centeredOptions = (y: number, opacity: number) => ({
  position: [80, y] as Point,
  origin: "center" as const,
  width: 130,
  align: "center" as const,
  opacity,
});
const atmosphereTitles = atmosphereExamples.map(({ title }, i) =>
  Title(title, { variant: "serif", ...centeredOptions(49, i === 0 ? 1 : 0) }),
);
const atmosphereDescriptions = atmosphereExamples.map(({ detail }, i) =>
  Text(detail, centeredOptions(62, i === 0 ? 1 : 0)),
);
const atmosphereLabels = atmosphereExamples.map(({ label }, i) =>
  Kicker(label, { position: [12, 86], origin: "bottom-left", opacity: i === 0 ? 1 : 0 }),
);
const atmosphereCode = backdropHeading[3];

stage
  .scene("Set the atmosphere")
  .with(
    brand,
    ...backdropHeading,
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
  "Let the picture do the talking",
  "Video plays. The photo pans. The presenter joins in.",
  undefined,
  { width: 68, subtitleY: 32 },
);
const mediaCode = codeHint(".to({ rotationX, rotationY })");
const earth = Video(
  "https://upload.wikimedia.org/wikipedia/commons/3/31/Earth-solar-array-timelapse.webm",
  {
    position: [40, 62.875],
    origin: "center",
    width: 60,
    height: 33.75,
    muted: true,
    playing: true,
    loop: true,
    fit: "cover",
  },
);
const photo = Image(
  "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000383/GSFC_20171208_Archive_e000383~large.jpg",
  { fit: "cover", alt: "NASA nebula photograph" },
);
const photoFrame = Frame(paths.box({ radius: 14 }), photo, {
  position: [118, 30],
  origin: "center",
  width: 64,
  height: 36,
}).decorate(kenBurns({ scale: 1.3, focus: "top-right", duration: 20 }));
const camera = Frame(paths.circle(), Webcam({ mirror: true }), {
  position: [148, 80],
  origin: "bottom-right",
  size: 11,
  borderColor: "#a8c9e4",
  strokeWidth: 2,
});
const photoLabel = Kicker("01 / PHOTOGRAPH", { position: [86, 8] });
const videoLabel = Kicker("02 / EARTH IN MOTION", { position: [10, 42] });
const cameraLabel = Kicker("LIVE PRESENTER", { position: [96, 68] });
const mediaEncore = Title("Two views. One story.", {
  variant: "serif",
  position: [10, 20],
  width: 68,
  opacity: 0,
}).decorate(gradient());
const credit = Kicker("NASA imagery · Online media · Camera optional", {
  position: [12, 86],
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
    rotationX: 18,
    rotationY: -28,
  })
  .duration(1.15)
  .ease("cubicInOut")
  .after(mediaHeading[1]);
photoFrame
  .to({
    position: to([47, 58]).path(motion.arc(65)),
    rotation: -2,
    rotationX: -16,
    rotationY: 28,
  })
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
  "The demo can be the real thing",
  "A real website and a real shell. The demo has left the screenshot.",
  "BrowserWindow({ url }) · LiveTerminal()",
);
const web = BrowserWindow({
  url: "https://tsaarni.github.io/stageroutine/",
  title: "StageRoutine documentation",
  position: [10, 39],
  width: 78,
  height: 40,
});
const shell = LiveTerminal({
  title: "Live shell · local dev server",
  position: [94, 39],
  width: 56,
  height: 40,
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
  "You still run the show",
  "The real presenter console. Your notes, cues, and controls.",
  "BrowserWindow({ url }) · stage.note('Your cue')",
);
const presenterPreview = BrowserWindow({
  url: `${import.meta.env.BASE_URL}presenter.html`,
  title: "Live presenter console",
  position: [10, 39],
  width: 92,
  height: 39,
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
  { position: [110, 42], width: 39, itemsHidden: true, itemSpacing: 1 },
);
const pointerHelp = Text(
  "Click outside the browser first. Move the mouse to point; drag to draw.",
  {
    position: [110, 72],
    width: 39,
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

const closing = Title("Give your next idea the stage.", {
  variant: "serif",
  position: [80, 48],
  origin: "top",
}).decorate(gradient());
const closingCode = CodeBlock(
  [
    "const idea = Title('Your next big idea');",
    "stage.scene('Let’s begin').with(idea);",
    "stage.pause();",
    "stage.mount('#stage');",
  ],
  { position: [44, 62], width: 72 },
);
stage.scene("Your stage").with(brand, closing, closingCode);
backdrop.opacity = 1;
brand.to({ position: [80, 30], origin: "top", scale: 1 });
pause(
  "End where we started, with the same title. We have composed, rearranged, connected, inspected, styled, and presented ordinary elements with TypeScript. The next explanation is yours.",
);

stage.overlay(Annotation());
stage.overlay(LaserPointer());
stage.overlay(NavigationOverlay());
stage.mount("#stage");
