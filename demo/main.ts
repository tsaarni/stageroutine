/**
 * Demo presentation script showing how to build animated presentations with StageRoutine.
 */

import {
  Annotation,
  AsciiFluid,
  BulletList,
  bracket,
  Card,
  CodeBlock,
  Connector,
  dream,
  Frame,
  glow,
  gradient,
  group,
  Image,
  Kicker,
  kenBurns,
  LaserPointer,
  layout,
  NavigationOverlay,
  paths,
  pulseSequence,
  replace,
  rule,
  SequenceDiagram,
  Shape,
  Stage,
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
import Cpu from "~iconify/lucide/cpu";
import Database from "~iconify/lucide/database";
import Globe from "~iconify/lucide/globe";
import Sparkles from "~iconify/lucide/sparkles";
import notesDoc from "./notes.md?raw";

// Initialize presentation stage with the ASCII Fluid background
const stage = new Stage().background(AsciiFluid().decorate(vignette())).notesDocument(notesDoc);

// Scene: Introduction

const sectionKicker = Kicker("00 / Core Runtime", {
  position: [80, 28.8],
  origin: "top",
});

const brandTitle = Title("StageRoutine", {
  variant: "hero",
  position: [80, 36],
  origin: "top",
});

const editorialLead = Title("Code-driven presentations built for the stage.", {
  variant: "serif",
  position: [80, 46.8],
  origin: "top",
})
  .decorate(gradient())
  .decorate(glow());

const heroBody = Text("An open-source presentation runtime for developers.", {
  position: [80, 57.6],
  origin: "top",
});

// Declare which elements are active in this scene.
stage.scene("Introduction").with(brandTitle, sectionKicker, editorialLead, heroBody);
stage.pause();

// Scene: Continuous Plane

// Create elements that enter with choreographed transitions.
const leftHeading = Title("Continuous Plane", {
  kicker: "01 / Architecture",
  opacity: 0,
});

const leftBody = Text(
  "Discrete slides swap entire frames with jarring cuts. StageRoutine preserves spatial continuity across transitions by treating the canvas as a persistent reactive state space.",
  { opacity: 0 },
);

const codePanel = CodeBlock(
  [
    "// Direct mutation schedules smooth transition",
    "node.x = 83.2;",
    "node.opacity = 1;",
    "",
    "// Pause defines presenter step boundary",
    "stage.pause();",
  ],
  { opacity: 0 },
).decorate(rule());

const [planeRule] = layout.hstack([[leftHeading, leftBody], codePanel], {
  x: 9.6,
  y: 20.7,
  width: [67.2, 70.4],
});
if (planeRule) planeRule.opacity = 0;
codePanel.x = 176;

// brandTitle glides to its new position instead of recreating.
stage.scene("Continuous Plane").with(brandTitle, leftHeading, leftBody, codePanel, planeRule);

// Reposition brandTitle to the top-left corner.
brandTitle
  .to({
    position: [9.6, 5.4],
    origin: "top-left",
    scale: 0.6,
  })
  .ease("cubicInOut");

// Choreographed exit for intro lead
editorialLead.to({ y: 55.8, opacity: 0 });

// Milestone triggers chain animations to start after another element completes.
leftHeading.opacity = to(1).after(brandTitle);
leftBody.opacity = to(1).when(leftHeading, "halfway");
if (planeRule) planeRule.opacity = to(1).when(leftHeading, "halfway");

// Slide code panel into the right column.
codePanel.x = to(83.2).ease("quartOut");
codePanel.opacity = to(1).when(leftHeading, "halfway");
stage.pause();

// Scene: Snapshot Engine

const rightHeading = Title("Snapshot Engine", {
  kicker: "02 / Mechanics",
  opacity: 0,
});

const rightBody = Text(
  "Every pause records an immutable state snapshot. The runtime computes dynamic property diffs for forward transitions and instant backward rewinds.",
  { opacity: 0 },
);

// BulletList items cascade sequentially with stagger.
const featureChecklist = BulletList(
  [
    "Bidirectional playback: jump to any step snapshot instantly",
    "High-precision cubic-Bézier numerical curve solver",
    "Interpolates spatial coordinates, scale, opacity, blur, and colors",
  ],
  { opacity: 0 },
);

layout.vstack([rightHeading, rightBody, featureChecklist], {
  x: 83.2,
  y: 16.2,
  gap: 3.6,
});

stage
  .scene("Snapshot Engine")
  .with(brandTitle, codePanel, rightHeading, rightBody, featureChecklist);

// Slide left column off-screen.
group(leftHeading, leftBody).to({ opacity: 0, x: -80 });
if (planeRule) planeRule.opacity = to(0);

// Move code panel from the right column over to the left column.
codePanel.x = to(brandTitle.x).ease("cubicInOut");

// Reveal right column after the code panel passes halfway.
rightHeading.opacity = to(1).when(codePanel, "halfway");
rightBody.opacity = to(1).when(rightHeading, "halfway");

// Cascade individual bullet items sequentially with stagger.
featureChecklist.reveal().when(rightBody, 0.5);
stage.pause();

// Scene: Presenter Telemetry

// TerminalBlock renders a styled macOS terminal component.
const terminalPanel = TerminalBlock({
  title: "stageroutine-dev",
  lines: [
    "$ pnpm dev",
    "✔ Stage live on http://localhost:5173",
    "✔ Presenter console synced on /presenter.html",
    "⚡ BroadcastChannel channel: stageroutine-channel",
  ],
  x: brandTitle.x,
  y: 108,
  opacity: 0,
  width: 70.4,
});

stage
  .scene("Presenter Telemetry")
  .with(brandTitle, terminalPanel, rightHeading, rightBody, featureChecklist);

// Slide code block upward off-screen and lift terminal up from below.
codePanel.to({ y: -45, opacity: 0 }).ease("cubicInOut");
terminalPanel.to({ y: 17.1, opacity: 1 }).when(codePanel, "halfway");
stage.pause();

// Scene: Component Showcase

const showcaseKicker = Kicker("03 / Design System");
const showcasePill = Shape(paths.pill(), "v1.0.0");
const customPill = Shape(paths.pill(), "Reactive", {
  color: "#38bdf8",
  background: "rgba(56, 189, 248, 0.1)",
  borderColor: "rgba(56, 189, 248, 0.25)",
});

layout.hstack([showcaseKicker, showcasePill, customPill], {
  x: 9.6,
  y: 16.2,
  gap: 3.2,
  align: "center",
  animate: true,
});

const showcaseTitle = Title("Component Primitives");
const showcaseText = Text(
  "Minimalist, typography-first building blocks styled for high-contrast dark canvases.",
);
const showcaseCard = Card(
  Text("A pure surface container for grouping presentation elements with frosted glass styling."),
);
const showcaseList = BulletList([
  "Direct-to-DOM zero VDOM",
  ["Sub-pixel layout fidelity", "Pure reactive element state"],
  "High-precision curve solvers",
]);
const showcaseCode = CodeBlock([
  "// Type-safe UI primitives",
  "const pill = Shape(paths.pill(), 'v1.0');",
  "const custom = Shape(paths.pill(), 'Live', { color: '#38bdf8' });",
  "const card = Card('Frosted surface');",
]);
const showcaseTerminal = TerminalBlock({
  title: "stageroutine-cli",
  lines: ["$ pnpm build", "✔ Bundled all components", "⚡ Ready for presentation"],
});

// layout.hstack distributes column widths to all children automatically
layout.hstack(
  [
    [showcaseTitle, showcaseText, showcaseCard, showcaseList],
    [showcaseCode, showcaseTerminal],
  ],
  { x: 9.6, y: 22.5, width: [67.2, 70.4], animate: true },
);

stage
  .scene("Component Showcase")
  .with(
    brandTitle,
    showcaseKicker,
    showcasePill,
    customPill,
    showcaseTitle,
    showcaseText,
    showcaseCard,
    showcaseList,
    showcaseCode,
    showcaseTerminal,
  );

// Animate previous terminal panel off-screen
terminalPanel.to({ y: 108, opacity: 0 }).ease("cubicInOut");
stage.pause();

// Scene: Element Decorators

const decoratorKicker = Kicker("04 / Decorators & Extensibility");
const decoratorHeading = Title("Element Decorators");

const decoratorGradientDemo = Title("Gradient Flow in Action", {
  variant: "serif",
}).decorate(
  gradient({
    colors: ["#ec4899", "#f43f5e", "#fb923c", "#facc15", "#ec4899"],
    duration: 5,
  }),
);

const decoratorTypewriterDemo = Text("").decorate(
  typewriter({
    delay: 0.6,
    script: [
      "Decorators can simulatte",
      { delete: 2 },
      "e realistic typing, including typos, backspaces, and corrections...",
    ],
  }),
);

const decoratorCode = CodeBlock([
  "// Isolated flowing gradient",
  "title.decorate(gradient({",
  "  colors: ['#ec4899', '#facc15'],",
  "  duration: 5,",
  "}));",
  "",
  "// Realistic typing with structured script",
  "text.decorate(typewriter({",
  "  delay: 0.6,",
  "  script: [",
  "    'Decorators can simulatte',",
  "    { delete: 2 },",
  "    'e realistic typing...',",
  "  ],",
  "}));",
]).decorate(bracket());

layout.hstack(
  [
    [decoratorKicker, decoratorHeading, decoratorGradientDemo, decoratorTypewriterDemo],
    decoratorCode,
  ],
  { x: 9.6, y: 16.2, width: [67.2, 70.4], animate: true },
);

stage
  .scene("Element Decorators")
  .with(
    brandTitle,
    decoratorKicker,
    decoratorHeading,
    decoratorGradientDemo,
    decoratorTypewriterDemo,
    decoratorCode,
  );
stage.pause();

// Scene: Structured Data & Metrics

const tableKicker = Kicker("05 / Structured Data & Focus", { opacity: 0 });
const tableHeading = Title("Glassmorphic DataGrid", { opacity: 0 });
const tableText = Text(
  "Interactive tables with column alignment and presenter click-and-drag range focus across metric rows.",
  { opacity: 0 },
);

const serviceMetricsTable = Table({
  headers: ["Service Cluster", "p99 Latency", "Error Rate", "Uptime"],
  rows: [
    ["Auth Gateway", "12ms", "0.01%", "99.99%"],
    ["Payment Engine", "145ms", "1.20%", "98.80%"],
    ["Vector Search", "24ms", "0.00%", "99.95%"],
    ["Edge Cache", "3ms", "0.00%", "100.00%"],
  ],
  align: ["left", "right", "right", "center"],
  opacity: 0,
  width: 67.2,
});

layout.vstack([tableKicker, tableHeading, tableText], {
  x: 9.6,
  y: 16.2,
  width: 67.2,
});
serviceMetricsTable.position = [9.6, 43.2];

const tableCode = CodeBlock(
  [
    "// Declarative glassmorphic table",
    "const metrics = Table({",
    "  headers: ['Service', 'p99', 'Error', 'Uptime'],",
    "  rows: [",
    "    ['Auth Gateway', '12ms', '0.01%', '99.99%'],",
    "    ['Payment Engine', '145ms', '1.20%', '98.80%'],",
    "    ['Vector Search', '24ms', '0.00%', '99.95%'],",
    "    ['Edge Cache', '3ms', '0.00%', '100.00%'],",
    "  ],",
    "  align: ['left', 'right', 'right', 'center'],",
    "});",
    "",
    "// Staggered row reveal",
    "metrics.reveal();",
  ],
  {
    position: [83.2, 0],
    opacity: 0,
    width: 67.2,
  },
);

stage
  .scene("Structured Data & Metrics")
  .with(brandTitle, tableKicker, tableHeading, tableText, serviceMetricsTable, tableCode);

// Animate previous code panel off-screen
decoratorCode.to({ opacity: 0, y: 72 });

// Reveal table elements with staggered spatial entrance
tableKicker.opacity = to(1).when(brandTitle, "start");
tableHeading.opacity = to(1).when(tableKicker, "halfway");
tableText.opacity = to(1).when(tableHeading, "halfway");

// Glide Table container into place
serviceMetricsTable.y = to(43.2).when(tableText, "start");

// Staggered cascade across table rows
serviceMetricsTable.reveal().when(tableText, 0.5);

// Glide code panel in from the right edge
tableCode.to({ y: 16.2, opacity: 1 }).when(tableText, "halfway");
stage.pause();

// Scene: Component Topology

const topologyKicker = Kicker("06 / Architecture Topology");
const topologyHeading = Title("Reactive Component Graphs", {
  width: 67.2,
});

layout.vstack([topologyKicker, topologyHeading], {
  x: 9.6,
  y: 16.2,
  gap: 1.8,
});

// Component Diagram Nodes
const cardOpts = { width: 15, height: 8.33, align: "center" as const };
const clientCard = Card("Client App", cardOpts);
const apiGateway = Card("API Gateway", cardOpts);
const authService = Card("Auth Service", cardOpts);
const databaseCard = Card("PostgreSQL DB", cardOpts);
const redisCache = Card("Redis Cache", cardOpts);

const topologyNote = Card(
  [Kicker("ARCHITECTURE NOTE"), Text("Perimeter routing with dynamic card boundary tracking.")],
  {
    variant: "ghost",
    align: "right",
    width: 38.4,
    opacity: 0,
    borderColor: "none",
  },
).decorate(rule({ side: "right" }));

// Position topology nodes via wider 2D matrix grid shifted to the right
layout.grid(
  [
    [clientCard, apiGateway, redisCache],
    [null, authService, databaseCard],
  ],
  { x: 32, y: 31.5, gapX: 25.6, gapY: 9 },
);

// Position architecture note lower and offset to the far left
topologyNote.position = [9.6, 66.6];

const connClientGateway = Connector(clientCard, apiGateway, {
  label: "HTTPS REST",
  routing: "bezier",
  end: 0,
});

const connGatewayAuth = Connector(apiGateway, authService, {
  label: "gRPC",
  routing: "corner",
  color: "#a855f7",
  end: 0,
});

const connAuthDb = Connector(authService, databaseCard, {
  label: "SQL Pool",
  color: "#f59e0b",
  end: 0,
});

const connGatewayRedis = Connector(apiGateway, redisCache, {
  label: "Session Cache",
  routing: "bezier",
  color: "#10b981",
  end: 0,
});

const noteConnector = Connector(topologyNote, authService, {
  dotted: true,
  flow: "traveling",
  endHead: "none",
  color: "rgba(255, 255, 255, 0.25)",
  fromAnchor: "right",
  opacity: 0,
});

stage
  .scene("Component Topology")
  .with(
    brandTitle,
    topologyKicker,
    topologyHeading,
    clientCard,
    apiGateway,
    authService,
    databaseCard,
    redisCache,
    topologyNote,
    noteConnector,
    connClientGateway,
    connGatewayAuth,
    connAuthDb,
    connGatewayRedis,
  );

stage.pause();

// Step 1: Ingress Traffic (Client -> API Gateway)
connClientGateway.end = to(1).duration(0.4);
connClientGateway.pulse();
stage.pause();

// Step 2: Cache Inspection (API Gateway -> Redis)
connGatewayRedis.end = to(1).duration(0.4);
connGatewayRedis.pulse();
stage.pause();

// Step 3: Microservice Routing & DB Query (Gateway -> Auth -> PostgreSQL)
connGatewayAuth.end = to(1).duration(0.35);
connGatewayAuth.pulse();

connAuthDb.end = to(1).duration(0.4).delay(0.2);
connAuthDb.pulse();
stage.pause();

// Step 4: Topology Annotation & Observability Callout
group(topologyNote, noteConnector).to({ opacity: 1 }).duration(0.35);
stage.pause();

clientCard.y = to(41.4).ease("cubicInOut");
stage.pause();
connClientGateway.pulse();
stage.pause();

// Scene: Sequence Protocol Flow

const sequenceKicker = Kicker("07 / Protocol Choreography");
const sequenceHeading = Title("Sequence Diagram & Protocols", {
  position: [9.6, 22.5],
  width: 51.2,
});

sequenceKicker.position = [9.6, 16.2];

// Initialize sequence diagram helper with participants
const seq = SequenceDiagram({
  participants: [clientCard, apiGateway, authService],
  lifelineOpacity: 0,
});

// Auto-spaced protocol messages
const msg1 = seq.message(clientCard, apiGateway, {
  label: "1. POST /api/v1/auth/login",
  end: 0,
});

const msg2 = seq.message(apiGateway, authService, {
  label: "2. Verify Password Hash",
  color: "#a855f7",
  end: 0,
});

const msg3 = seq.message(authService, apiGateway, {
  label: "3. User Roles & Identity",
  color: "#a855f7",
  dashed: true,
  endHead: "open",
  end: 0,
});

const msg4 = seq.message(authService, apiGateway, {
  label: "4. Issue Signed JWT Token",
  color: "#10b981",
  dashed: true,
  endHead: "open",
  end: 0,
});

const msg5 = seq.message(apiGateway, clientCard, {
  label: "5. 200 OK (Bearer Session)",
  color: "#10b981",
  dashed: true,
  endHead: "open",
  end: 0,
});

// Activation execution blocks bound automatically to message intervals
const gatewayActive = seq.activate(apiGateway, { from: msg1, to: msg5, opacity: 0 });
const authActive = seq.activate(authService, {
  from: msg2,
  to: msg4,
  color: "#a855f7",
  opacity: 0,
});

stage
  .scene("Sequence Protocol Flow")
  .with(
    brandTitle,
    sequenceKicker,
    sequenceHeading,
    clientCard,
    apiGateway,
    authService,
    ...seq.elements,
  );

// Reposition participant cards into sequence columns
layout.hstack([clientCard, apiGateway, authService], {
  x: 70.4,
  y: 19.8,
  gap: 20,
  animate: true,
});

// Drop down vertical lifelines only after participant cards arrive at destination
group(seq.lifelines).to({ opacity: 1 }).duration(0.35).after(clientCard);

// Step 1: Client -> Gateway draws automatically after lifelines appear
msg1.end = to(1).duration(0.4).after(seq.lifelines[0]);
gatewayActive.opacity = to(1).duration(0.3).after(seq.lifelines[0]);
msg1.pulse();
stage.pause();

// Step 2: Gateway -> Auth Server (Back & Forth)
msg2.end = to(1).duration(0.35);
authActive.opacity = to(1).duration(0.3);
msg3.end = to(1).duration(0.35).delay(0.2);
msg4.end = to(1).duration(0.35).delay(0.4);
stage.pause();

// Step 3: Gateway -> Client response
msg5.end = to(1).duration(0.4);
msg5.pulse();
stage.pause();

// Scene: State Machine Transitions

const stateKicker = Kicker("08 / State Machine Topologies");
const stateHeading = Title("Interactive State Transitions", {
  width: 57.6,
});

layout.vstack([stateKicker, stateHeading], {
  x: 9.6,
  y: 16.2,
  gap: 1.8,
});

// UML initial and final pseudostates
const stateInitial = Shape(paths.circle(), {
  size: 2.83,
  variant: "ghost",
  className: "sr-state-node sr-state-initial",
  borderColor: "rgba(255, 255, 255, 0.35)",
});

const stateFinal = Shape(paths.circle(), {
  size: 2.83,
  variant: "ghost",
  className: "sr-state-node sr-state-final",
  borderColor: "rgba(255, 255, 255, 0.55)",
  strokeWidth: 1.5,
});

// State nodes
const stateOpts = { width: 14.17, height: 5, align: "center" as const };
const stateIdle = Card("Idle", stateOpts);
const stateAuthenticating = Card("Authenticating", { ...stateOpts, width: 15.83 });
const stateActive = Card("Active", stateOpts);
const stateRejected = Card("Rejected", stateOpts);

// Arrange all nodes in a balanced circular topology
layout.circle([stateInitial, stateIdle, stateAuthenticating, stateRejected, stateFinal], {
  center: [102.4, 54],
  radius: 32,
  startAngle: -160,
  flatten: 0.2,
});

// Active sits directly above Authenticating (left edges aligned)
layout.above(stateActive, stateAuthenticating, { gap: 27 });

// Single-Curvature Arc Transitions
const tStart = Connector(stateInitial, stateIdle, {
  color: "rgba(255, 255, 255, 0.4)",
  routing: "arc",
  fromPadding: 2,
  toAnchor: "left",
  end: 0,
});

const tSubmit = Connector(stateIdle, stateAuthenticating, {
  label: "submit()",
  routing: "arc",
  fromAnchor: "right",
  toAnchor: "top",
  end: 0,
});

const tSuccess = Connector(stateAuthenticating, stateActive, {
  label: "[valid]",
  color: "#10b981",
  routing: "arc",
  fromAnchor: "right",
  toAnchor: "right",
  curvature: -0.45,
  end: 0,
});

const tFail = Connector(stateAuthenticating, stateRejected, {
  label: "[invalid]",
  color: "#f43f5e",
  routing: "arc",
  toAnchor: "right",
  end: 0,
});

const tRetry = Connector(stateRejected, stateAuthenticating, {
  label: "retry()",
  color: "rgba(255, 255, 255, 0.35)",
  routing: "arc",
  fromAnchor: "top",
  toAnchor: "left",
  curvature: 0.25,
  dashed: true,
  end: 0,
});

const tLogout = Connector(stateActive, stateIdle, {
  label: "logout()",
  color: "rgba(255, 255, 255, 0.35)",
  routing: "arc",
  fromAnchor: "left",
  curvature: -0.25,
  dashed: true,
  end: 0,
});

const tTerminate = Connector(stateRejected, stateFinal, {
  label: "terminate()",
  color: "rgba(255, 255, 255, 0.4)",
  routing: "arc",
  toPadding: 2,
  end: 0,
});

stage
  .scene("State Machine Transitions")
  .with(
    brandTitle,
    stateKicker,
    stateHeading,
    stateInitial,
    stateFinal,
    stateIdle,
    stateAuthenticating,
    stateActive,
    stateRejected,
    tStart,
    tSubmit,
    tSuccess,
    tFail,
    tRetry,
    tLogout,
    tTerminate,
  );

// Draw state edges
tStart.end = to(1).duration(0.3);
tSubmit.end = to(1).duration(0.4).after(tStart);
tSuccess.end = to(1).duration(0.4).after(tSubmit);
tFail.end = to(1).duration(0.4).after(tSubmit);
tRetry.end = to(1).duration(0.4).after(tFail);
tLogout.end = to(1).duration(0.4).after(tSuccess);
tTerminate.end = to(1).duration(0.4).after(tSuccess);

tSubmit.pulse();
stage.pause();

// Scene: Geometric Primitives & Reactive Sizing

const geoKicker = Kicker("09 / Geometric Primitives");
const geoHeading = Title("Reactive Sizing & Geometric Nodes", {
  width: 57.6,
});
const geoDescription = Text(
  "Shapes smoothly resize without scaling distortion. Width, height, and size animate as reactive properties while connectors track dynamic perimeters in real time.",
  { width: 57.6 },
);

layout.vstack([geoKicker, geoHeading, geoDescription], {
  x: 9.6,
  y: 16.2,
  gap: 1.8,
});

const morphBox = Card("Dynamic Layout Reflow", {
  width: 18.33,
  height: 9.17,
  borderColor: "#38bdf8",
});

const morphCircle = Shape(paths.circle(), "100%", {
  size: 9.17,
  color: "#a855f7",
  borderColor: "#a855f7",
  end: 0,
});

const morphDiamond = Shape(paths.diamond(), "Verify", {
  size: 9.58,
  color: "#f59e0b",
  borderColor: "#f59e0b",
});

const morphPill = Shape(paths.pill(), "Cluster Inactive", {
  width: 14.17,
  height: 4.5,
  color: "#ef4444",
  borderColor: "#ef4444",
});

const starMedia = Image(
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cdefs%3E%3ClinearGradient id='sg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23f43f5e'/%3E%3Cstop offset='50%25' stop-color='%23a855f7'/%3E%3Cstop offset='100%25' stop-color='%2338bdf8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='300' fill='url(%23sg)'/%3E%3Ccircle cx='150' cy='150' r='90' fill='none' stroke='white' stroke-width='6' opacity='0.35' stroke-dasharray='12 6'/%3E%3Ccircle cx='150' cy='150' r='45' fill='white' opacity='0.7'/%3E%3C/svg%3E",
  { fit: "cover" },
);

const starFrame = Frame(paths.star({ points: 5, innerRadius: 0.45 }), starMedia, {
  size: 9.58,
  borderColor: "#f43f5e",
  strokeWidth: 2,
});

layout.grid(
  [
    [morphBox, morphCircle],
    [morphDiamond, starFrame],
  ],
  {
    x: 83.2,
    y: 16.2,
    gapX: 12.8,
    gapY: 9,
  },
);

morphPill.position = [96, 66.6];

const connBoxCircle = Connector(morphBox, morphCircle, {
  label: "auto-tracking",
  routing: "bezier",
  end: 0,
});

const connCircleStar = Connector(morphCircle, starFrame, {
  label: "clipped-frame",
  routing: "bezier",
  toAnchor: "closest",
  color: "#f43f5e",
  end: 0,
});

const connDiamondStar = Connector(morphDiamond, starFrame, {
  label: "snap-sync",
  toAnchor: "closest",
  color: "#f59e0b",
  end: 0,
});

const connStarPill = Connector(starFrame, morphPill, {
  routing: "bezier",
  fromAnchor: "closest",
  color: "#10b981",
  end: 0,
});

stage
  .scene("Geometric Primitives")
  .with(
    brandTitle,
    geoKicker,
    geoHeading,
    geoDescription,
    morphBox,
    morphCircle,
    morphDiamond,
    starFrame,
    morphPill,
    connBoxCircle,
    connCircleStar,
    connDiamondStar,
    connStarPill,
  );

stage.pause();

// Step 1: Draw circle perimeter & activate diamond tail-chase
group(connBoxCircle, connCircleStar, connDiamondStar, connStarPill).to({ end: 1 }).duration(0.4);
morphCircle.end = to(1).duration(0.8).ease("linear");
morphDiamond.flow = "chase";
stage.pause();

// Step 2: Reactive Sizing & Live Text Reflow Animation
morphBox.to({ width: 28.33, height: 5.67 }).ease("cubicInOut");
morphCircle.size = to(12.5).ease("cubicInOut");
morphDiamond.size = to(12.5).ease("cubicInOut");
starFrame.to({ size: 12.5, rotation: 72 }).ease("cubicInOut");
morphPill.to({ width: 23.33, color: "#10b981", borderColor: "#10b981" }).ease("cubicInOut");
morphPill.text = "Cluster Active";
morphPill.flow = "ping";

connBoxCircle.pulse();
stage.pause();

// Scene: Edge AI Pipeline & Topology

const aiKicker = Kicker("10 / Real-Time Intelligence");
const aiHeading = Title("Edge AI & Vector Mesh", { width: 48 });
const aiDescription = Text(
  "Plug icon libraries on-demand and connect them directly into reactive topology networks with real-time signal pulses.",
  { width: 48 },
);

const aiNodeOpts = { width: 12.08, height: 10.83, align: "center" as const };
const aiClientNode = Card(
  [Globe({ size: 3, color: "#38bdf8" }), Kicker("Edge Client", { color: "#38bdf8" })],
  aiNodeOpts,
);
const aiGatewayNode = Card(
  [Cpu({ size: 3, color: "#a855f7" }), Kicker("AI Gateway", { color: "#a855f7" })],
  aiNodeOpts,
);
const aiVectorNode = Card(
  [Database({ size: 3, color: "#10b981" }), Kicker("Vector Memory", { color: "#10b981" })],
  aiNodeOpts,
);
const aiReasoningNode = Card(
  [Sparkles({ size: 3, color: "#f59e0b" }), Kicker("LLM Reasoning", { color: "#f59e0b" })],
  aiNodeOpts,
);

const [aiRule] = layout.hstack(
  [
    [aiKicker, aiHeading, aiDescription],
    [aiClientNode, aiGatewayNode, aiReasoningNode, aiVectorNode],
  ],
  {
    x: 9.6,
    y: 16.2,
    width: [46.4, 91.2],
    rule: true,
  },
);

layout.grid(
  [
    [aiClientNode, aiGatewayNode, aiReasoningNode],
    [null, aiVectorNode, null],
  ],
  {
    x: 64,
    y: 23.4,
    gapX: 23.2,
    gapY: 8.55,
  },
);

const connAiClientGateway = Connector(aiClientNode, aiGatewayNode, {
  label: "Prompt Ingress",
  routing: "bezier",
  fromAnchor: "right",
  toAnchor: "left",
  labelOffsetY: -1.5,
  end: 0,
});

const connAiGatewayVector = Connector(aiGatewayNode, aiVectorNode, {
  label: "Vector Search",
  color: "#10b981",
  routing: "corner",
  fromAnchor: "bottom",
  toAnchor: "top",
  labelOffsetX: 9,
  labelOffsetY: 0,
  end: 0,
});

const connAiGatewayLLM = Connector(aiGatewayNode, aiReasoningNode, {
  label: "Context Stream",
  color: "#f59e0b",
  routing: "bezier",
  fromAnchor: "right",
  toAnchor: "left",
  labelOffsetY: -1.5,
  end: 0,
});

pulseSequence([connAiClientGateway, connAiGatewayVector, connAiGatewayLLM]);

stage
  .scene("Edge AI Pipeline")
  .with(
    brandTitle,
    aiKicker,
    aiHeading,
    aiDescription,
    aiClientNode,
    aiGatewayNode,
    aiVectorNode,
    aiReasoningNode,
    connAiClientGateway,
    connAiGatewayVector,
    connAiGatewayLLM,
    aiRule,
  );

// Draw connector arrows only after the card move animations have settled
group(connAiClientGateway, connAiGatewayVector, connAiGatewayLLM)
  .to({ end: 1 })
  .after(aiReasoningNode);
stage.pause();

// Scene: Motion Orchestration & Crossfade

const motionKicker = Kicker("11 / Motion Orchestration");
const motionHeading = Title("In-Place Crossfade Choreography", {
  width: 67.2,
});
const motionDescription = Text(
  "Coordinate multi-element replacements in place with synchronized opacity, spatial alignment, and depth scaling.",
  { width: 67.2 },
);

const legacyCard = Card(
  [
    Kicker("LEGACY PIPELINE"),
    Text("Manual animation loops with imperative timeouts and callback spaghetti."),
  ],
  { width: 67.2 },
).decorate(rule({ color: "#f43f5e" }));

const reactiveCard = Card(
  [
    Kicker("STAGE ROUTINE"),
    Text("Deterministic snapshot graph with fluent, zero-boilerplate choreography."),
  ],
  { width: 67.2, opacity: 0 },
).decorate(rule({ color: "#38bdf8" }));

const replaceCode = CodeBlock(
  ["// Synchronized in-place replacement", "replace(legacyCard, reactiveCard);"],
  { width: 70.4 },
).decorate(bracket({ color: "rgba(56, 189, 248, 0.4)" }));

layout.hstack([[motionKicker, motionHeading, motionDescription, legacyCard], replaceCode], {
  x: 9.6,
  y: 16.2,
  width: [67.2, 70.4],
});
reactiveCard.position = legacyCard.position;

stage
  .scene("Motion & Replacement")
  .with(
    brandTitle,
    motionKicker,
    motionHeading,
    motionDescription,
    legacyCard,
    reactiveCard,
    replaceCode,
  );
stage.pause();

// Step 2: In-Place Replacement Animation
replace(legacyCard, reactiveCard);
stage.pause();

// Scene: Dream Appearance

const dreamKicker = Kicker("11 / Decorators");
const dreamHeading = Title("Dream Appearance", {
  variant: "serif",
});
const dreamLead = Text(
  "Custom decorator creating a dream-like entrance with liquid SVG displacement ripples that settle into focus.",
);

const dreamCard1 = Card(
  Text("Silky water ripple with optical defocus settling into sharp focus."),
).decorate(dream({ duration: 1.4, intensity: 56, blur: 6, float: 50 }));

const dreamCard2 = Card(
  Text("Staggered prismatic dispersion refracting light across fluid ripples."),
).decorate(
  dream({
    duration: 1.5,
    delay: 0.3,
    intensity: 54,
    blur: 8,
    prismatic: 0.18,
    float: 50,
  }),
);

const dreamCard3 = Card(
  Text("Deep spectral mirage with chromatic wave aberration and micro-drift."),
).decorate(
  dream({
    duration: 1.8,
    delay: 0.6,
    intensity: 52,
    blur: 10,
    prismatic: 0.25,
    float: 50,
  }),
);

layout.hstack(
  [
    [dreamKicker, dreamHeading, dreamLead],
    [dreamCard1, dreamCard2, dreamCard3],
  ],
  {
    x: 9.6,
    y: 16.2,
    width: [60.8, 80],
    gap: 2.7,
  },
);

stage
  .scene("Dream Appearance")
  .with(brandTitle, dreamKicker, dreamHeading, dreamLead, dreamCard1, dreamCard2, dreamCard3);
stage.pause();

// Scene: Callout Geometries & Dynamic Tails

const calloutKicker = Kicker("12 / Callout Geometries");
const calloutHeading = Title("Dynamic Speech & Thought Tails", {
  width: 54.4,
});
const calloutDescription = Text(
  "Speech and thought bubbles connect their tails to live targets. The tail re-aims every frame as the target moves, and points land on the target outline.",
  { width: 54.4 },
);

const agentAlpha = Card(
  [Sparkles({ size: 3, color: "#38bdf8" }), Kicker("Agent Alpha", { color: "#38bdf8" })],
  { width: 14.17, height: 9.17, align: "center" },
);

const agentBeta = Card(
  [Cpu({ size: 3, color: "#a855f7" }), Kicker("Agent Beta", { color: "#a855f7" })],
  { width: 14.17, height: 9.17, align: "center" },
);

const speechBubble = Shape(
  paths.speechBubble({ tail: { to: agentAlpha, anchor: "top" }, radius: 14 }),
  "Directing query to Alpha",
  {
    width: 20.83,
    height: 10,
    borderColor: "#38bdf8",
    strokeWidth: 2,
  },
);

const thoughtBubble = Shape(
  paths.thoughtBubble({ tail: { to: agentBeta, anchor: "top" }, lobes: 9 }),
  "Evaluating Beta response...",
  {
    width: 20.83,
    height: 10,
    borderColor: "#a855f7",
    strokeWidth: 2,
  },
);

layout.vstack([calloutKicker, calloutHeading, calloutDescription], {
  x: 9.6,
  y: 16.2,
  gap: 1.8,
});

layout.grid(
  [
    [speechBubble, thoughtBubble],
    [agentAlpha, agentBeta],
  ],
  {
    x: 70.4,
    y: 18,
    gapX: 6.4,
    gapY: 3.6,
  },
);

stage
  .scene("Callout Geometries")
  .with(
    brandTitle,
    calloutKicker,
    calloutHeading,
    calloutDescription,
    speechBubble,
    thoughtBubble,
    agentAlpha,
    agentBeta,
  );
stage.pause();

// Step 1: Agents slide apart. Tails track their live positions and re-aim.
agentAlpha.to({ x: (x: number) => x - 9 }).ease("cubicInOut");
agentBeta.to({ x: (x: number) => x + 9 }).ease("cubicInOut");
speechBubble.text = "Following Alpha left";
thoughtBubble.text = "Following Beta right";
speechBubble.to({ borderColor: "#f59e0b" }).ease("cubicInOut");
thoughtBubble.to({ borderColor: "#10b981" }).ease("cubicInOut");
stage.pause();

// Step 2: Agents drop lower. Tails stretch to stay attached.
agentAlpha.to({ y: (y: number) => y + 10 }).ease("cubicInOut");
agentBeta.to({ y: (y: number) => y + 10 }).ease("cubicInOut");
speechBubble.text = "Still attached to Alpha";
thoughtBubble.text = "Still attached to Beta";
stage.pause();

// Scene: Video & Live Camera

const mediaKicker = Kicker("13 / Live Media & Camera");
const mediaHeading = Title("Video, Photography & Camera", {
  variant: "serif",
});
const mediaDescription = Text(
  "Embedded HTML5 video player, reactive live webcam feeds, and Ken Burns slow zoom across deep space imagery.",
);

// Video: NASA - https://www.nasa.gov/video-detail/earth-solar-array-timelapse/
const sampleVideo = Video(
  "https://upload.wikimedia.org/wikipedia/commons/3/31/Earth-solar-array-timelapse.webm",
  {
    width: 44.8,
    height: 23.4,
    muted: true,
    loop: true,
    playing: true,
    fit: "cover",
  },
);

// Photo from https://images.nasa.gov/details/GSFC_20171208_Archive_e000383
const spaceImage = Image(
  "https://images-assets.nasa.gov/image/GSFC_20171208_Archive_e000383/GSFC_20171208_Archive_e000383~large.jpg",
  {
    fit: "cover",
    alt: "NASA Deep Space Cosmic Nebula",
  },
);

const spaceFrame = Frame(paths.box({ radius: 10 }), spaceImage, {
  width: 44.8,
  height: 23.4,
  borderColor: "rgba(255, 255, 255, 0.2)",
  strokeWidth: 1.5,
}).decorate(kenBurns({ scale: 1.5, focus: "top-right", duration: 15 }));

const presenterCam = Webcam({
  fit: "cover",
  mirror: true,
});

const camBubble = Frame(paths.circle(), presenterCam, {
  size: 13.33,
  borderColor: "#38bdf8",
  strokeWidth: 3,
  active: true,
});

layout.vstack([mediaKicker, mediaHeading, mediaDescription], {
  x: 9.6,
  y: 16.2,
  width: 86.4,
  gap: 1.35,
});

layout.hstack([sampleVideo, spaceFrame, camBubble], {
  x: 9.6,
  y: 39.6,
  gap: 4.8,
  align: "center",
});

stage
  .scene("Live Media & Video")
  .with(
    brandTitle,
    mediaKicker,
    mediaHeading,
    mediaDescription,
    sampleVideo,
    spaceFrame,
    camBubble,
  );
stage.pause();

// Step 1: Re-position video and image independently into a vertical column (one above another)
sampleVideo
  .to({ position: [19.2, 34.2] })
  .duration(0.65)
  .ease("cubicInOut");
spaceFrame.to({ x: 19.2, y: 60.3 }).duration(0.75).delay(0.12).ease("quartOut");
camBubble.to({ position: [108.8, 46.8], size: 26.67, borderColor: "#a855f7" }).ease("cubicInOut");
stage.pause();

// Step 2: Swap layout - webcam moves to presenter PIP corner, media returns side by side
sampleVideo
  .to({ position: [9.6, 39.6] })
  .duration(0.65)
  .ease("cubicInOut");
spaceFrame.to({ x: 59.2, y: 39.6 }).duration(0.75).delay(0.1).ease("cubicInOut");
camBubble.to({ position: [131.2, 64.8], size: 12, borderColor: "#38bdf8" }).ease("cubicInOut");
stage.pause();

// Scene: Conclusion

stage.scene("Conclusion").with(brandTitle, editorialLead, heroBody);

// Return title, lead, and body to hero center positions.
brandTitle.to({ position: [80, 34.2], origin: "top", scale: 1 }).ease("cubicInOut");
editorialLead.to({ y: 46.8, opacity: 1 }).when(brandTitle, "halfway");
heroBody.opacity = to(1).when(editorialLead, "halfway");
stage.pause();

// Register overlays and mount the stage into the DOM.
stage.overlay(Annotation());
stage.overlay(LaserPointer());
stage.overlay(NavigationOverlay());
stage.mount("#stage");
