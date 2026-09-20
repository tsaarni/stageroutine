/**
 * Demo presentation script showing how to build animated presentations with StageRoutine.
 */

import {
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
  vignette,
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
  position: ["center", 32],
});

const brandTitle = Title("StageRoutine", {
  variant: "hero",
  position: ["center", 40],
});

const editorialLead = Title("Code-driven presentations built for the stage.", {
  variant: "serif",
  position: ["center", 52],
})
  .decorate(gradient())
  .decorate(glow());

const heroBody = Text("An open-source presentation runtime for developers.", {
  position: ["center", 64],
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
    "node.x = 52;",
    "node.opacity = 1;",
    "",
    "// Pause defines presenter step boundary",
    "stage.pause();",
  ],
  { opacity: 0 },
).decorate(rule());

const [planeRule] = layout.hstack([[leftHeading, leftBody], codePanel], {
  x: 6,
  y: 23,
  width: [42, 44],
});
if (planeRule) planeRule.opacity = 0;
codePanel.x = 110;

// brandTitle glides to its new position instead of recreating.
stage.scene("Continuous Plane").with(brandTitle, leftHeading, leftBody, codePanel, planeRule);

// Reposition brandTitle to the top-left corner.
brandTitle.position = to([6, 6]).ease("cubicInOut");
brandTitle.scale = to(0.6).ease("cubicInOut");

// Choreographed exit for intro lead
editorialLead.to({ y: 62, opacity: 0 });

// Milestone triggers chain animations to start after another element completes.
leftHeading.opacity = to(1).after(brandTitle);
leftBody.opacity = to(1).when(leftHeading, "halfway");
if (planeRule) planeRule.opacity = to(1).when(leftHeading, "halfway");

// Slide code panel into the right column.
codePanel.x = to(52).ease("quartOut");
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
  x: 52,
  y: 18,
  gap: 4,
});

stage
  .scene("Snapshot Engine")
  .with(brandTitle, codePanel, rightHeading, rightBody, featureChecklist);

// Slide left column off-screen.
group(leftHeading, leftBody).to({ opacity: 0, x: -50 });
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
  y: 120,
  opacity: 0,
  width: "44cqw",
});

stage
  .scene("Presenter Telemetry")
  .with(brandTitle, terminalPanel, rightHeading, rightBody, featureChecklist);

// Slide code block upward off-screen and lift terminal up from below.
codePanel.to({ y: -50, opacity: 0 }).ease("cubicInOut");
terminalPanel.to({ y: 19, opacity: 1 }).when(codePanel, "halfway");
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
  x: 6,
  y: 18,
  gap: 2,
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
  { x: 6, y: 25, width: [42, 44], animate: true },
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
terminalPanel.to({ y: 120, opacity: 0 }).ease("cubicInOut");
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
  { x: 6, y: 18, width: [42, 44], animate: true },
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
  width: "42cqw",
});

layout.vstack([tableKicker, tableHeading, tableText], {
  x: 6,
  y: 18,
  width: 42,
});
serviceMetricsTable.x = 6;
serviceMetricsTable.y = 48;

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
    position: [52, 0],
    opacity: 0,
    width: "42cqw",
  },
);

stage
  .scene("Structured Data & Metrics")
  .with(brandTitle, tableKicker, tableHeading, tableText, serviceMetricsTable, tableCode);

// Animate previous code panel off-screen
decoratorCode.to({ opacity: 0, y: 80 });

// Reveal table elements with staggered spatial entrance
tableKicker.opacity = to(1).when(brandTitle, "start");
tableHeading.opacity = to(1).when(tableKicker, "halfway");
tableText.opacity = to(1).when(tableHeading, "halfway");

// Glide Table container into place
serviceMetricsTable.y = to(48).when(tableText, "start");

// Staggered cascade across table rows
serviceMetricsTable.reveal().when(tableText, 0.5);

// Glide code panel in from the right edge
tableCode.to({ y: 18, opacity: 1 }).when(tableText, "halfway");
stage.pause();

// Scene: Component Topology

const topologyKicker = Kicker("06 / Architecture Topology");
const topologyHeading = Title("Reactive Component Graphs", {
  width: "42cqw",
});

layout.vstack([topologyKicker, topologyHeading], {
  x: 6,
  y: 18,
  gap: 2,
});

// Component Diagram Nodes
const cardOpts = { width: 180, height: 100, align: "center" as const };
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
    width: "24cqw",
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
  { x: 20, y: 35, gapX: 16, gapY: 10 },
);

// Position architecture note lower and offset to the far left
topologyNote.position = [6, 74];

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

clientCard.y = to(46).ease("cubicInOut");
stage.pause();
connClientGateway.pulse();
stage.pause();

// Scene: Sequence Protocol Flow

const sequenceKicker = Kicker("07 / Protocol Choreography");
const sequenceHeading = Title("Sequence Diagram & Protocols", {
  position: [6, 25],
  width: "32cqw",
});

sequenceKicker.position = [6, 18];

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
  x: 44,
  y: 22,
  gap: 12.5,
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
  width: "36cqw",
});

layout.vstack([stateKicker, stateHeading], {
  x: 6,
  y: 18,
  gap: 2,
});

// UML initial and final pseudostates
const stateInitial = Shape(paths.circle(), {
  size: 34,
  variant: "ghost",
  className: "sr-state-node sr-state-initial",
  borderColor: "rgba(255, 255, 255, 0.35)",
});

const stateFinal = Shape(paths.circle(), {
  size: 34,
  variant: "ghost",
  className: "sr-state-node sr-state-final",
  borderColor: "rgba(255, 255, 255, 0.55)",
  strokeWidth: 1.5,
});

// State nodes
const stateOpts = { width: 170, height: 60, align: "center" as const };
const stateIdle = Card("Idle", stateOpts);
const stateAuthenticating = Card("Authenticating", { ...stateOpts, width: 190 });
const stateActive = Card("Active", stateOpts);
const stateRejected = Card("Rejected", stateOpts);

// Arrange all nodes in a balanced circular topology
layout.circle([stateInitial, stateIdle, stateAuthenticating, stateRejected, stateFinal], {
  center: [64, 60],
  radius: 20,
  startAngle: -160,
  flatten: 0.2,
});

// Active sits directly above Authenticating (left edges aligned)
layout.above(stateActive, stateAuthenticating, { gap: 30 });

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
  width: "36cqw",
});
const geoDescription = Text(
  "Shapes smoothly resize without scaling distortion. Width, height, and size animate as reactive properties while connectors track dynamic perimeters in real time.",
  { width: "36cqw" },
);

layout.vstack([geoKicker, geoHeading, geoDescription], {
  x: 6,
  y: 18,
  gap: 2,
});

const morphBox = Card("Dynamic Layout Reflow", {
  width: 220,
  height: 110,
  borderColor: "#38bdf8",
});

const morphCircle = Shape(paths.circle(), "100%", {
  size: 110,
  color: "#a855f7",
  borderColor: "#a855f7",
  end: 0,
});

const morphDiamond = Shape(paths.diamond(), "Verify", {
  size: 115,
  color: "#f59e0b",
  borderColor: "#f59e0b",
});

const morphPill = Shape(paths.pill(), "Cluster Inactive", {
  width: 170,
  height: 54,
  color: "#ef4444",
  borderColor: "#ef4444",
});

const starMedia = Image(
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 300 300'%3E%3Cdefs%3E%3ClinearGradient id='sg' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%23f43f5e'/%3E%3Cstop offset='50%25' stop-color='%23a855f7'/%3E%3Cstop offset='100%25' stop-color='%2338bdf8'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='300' height='300' fill='url(%23sg)'/%3E%3Ccircle cx='150' cy='150' r='90' fill='none' stroke='white' stroke-width='6' opacity='0.35' stroke-dasharray='12 6'/%3E%3Ccircle cx='150' cy='150' r='45' fill='white' opacity='0.7'/%3E%3C/svg%3E",
  { fit: "cover" },
);

const starFrame = Frame(paths.star({ points: 5, innerRadius: 0.45 }), starMedia, {
  size: 115,
  borderColor: "#f43f5e",
  strokeWidth: 2,
});

layout.grid(
  [
    [morphBox, morphCircle],
    [morphDiamond, starFrame],
  ],
  {
    x: 52,
    y: 18,
    gapX: 8,
    gapY: 10,
  },
);

morphPill.position = [60, 74];

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
morphBox.to({ width: 340, height: 68 }).ease("cubicInOut");
morphCircle.size = to(150).ease("cubicInOut");
morphDiamond.size = to(150).ease("cubicInOut");
starFrame.to({ size: 150, rotation: 72 }).ease("cubicInOut");
morphPill.to({ width: 280, color: "#10b981", borderColor: "#10b981" }).ease("cubicInOut");
morphPill.text = "Cluster Active";
morphPill.flow = "ping";

connBoxCircle.pulse();
stage.pause();

// Scene: Edge AI Pipeline & Topology

const aiKicker = Kicker("10 / Real-Time Intelligence");
const aiHeading = Title("Edge AI & Vector Mesh", { width: "30cqw" });
const aiDescription = Text(
  "Plug icon libraries on-demand and connect them directly into reactive topology networks with real-time signal pulses.",
  { width: "30cqw" },
);

const aiNodeOpts = { width: 145, height: 130, align: "center" as const };
const aiClientNode = Card(
  [Globe({ size: 36, color: "#38bdf8" }), Kicker("Edge Client", { color: "#38bdf8" })],
  aiNodeOpts,
);
const aiGatewayNode = Card(
  [Cpu({ size: 36, color: "#a855f7" }), Kicker("AI Gateway", { color: "#a855f7" })],
  aiNodeOpts,
);
const aiVectorNode = Card(
  [Database({ size: 36, color: "#10b981" }), Kicker("Vector Memory", { color: "#10b981" })],
  aiNodeOpts,
);
const aiReasoningNode = Card(
  [Sparkles({ size: 36, color: "#f59e0b" }), Kicker("LLM Reasoning", { color: "#f59e0b" })],
  aiNodeOpts,
);

const [aiRule] = layout.hstack(
  [
    [aiKicker, aiHeading, aiDescription],
    [aiClientNode, aiGatewayNode, aiReasoningNode, aiVectorNode],
  ],
  {
    x: 6,
    y: 18,
    width: [29, 57],
    rule: true,
  },
);

layout.grid(
  [
    [aiClientNode, aiGatewayNode, aiReasoningNode],
    [null, aiVectorNode, null],
  ],
  {
    x: 40,
    y: 26,
    gapX: 14.5,
    gapY: 9.5,
  },
);

const connAiClientGateway = Connector(aiClientNode, aiGatewayNode, {
  label: "Prompt Ingress",
  routing: "bezier",
  fromAnchor: "right",
  toAnchor: "left",
  labelOffsetY: -18,
  end: 0,
});

const connAiGatewayVector = Connector(aiGatewayNode, aiVectorNode, {
  label: "Vector Search",
  color: "#10b981",
  routing: "corner",
  fromAnchor: "bottom",
  toAnchor: "top",
  labelOffsetX: 108,
  labelOffsetY: 0,
  end: 0,
});

const connAiGatewayLLM = Connector(aiGatewayNode, aiReasoningNode, {
  label: "Context Stream",
  color: "#f59e0b",
  routing: "bezier",
  fromAnchor: "right",
  toAnchor: "left",
  labelOffsetY: -18,
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
  width: "42cqw",
});
const motionDescription = Text(
  "Coordinate multi-element replacements in place with synchronized opacity, spatial alignment, and depth scaling.",
  { width: "42cqw" },
);

const legacyCard = Card(
  [
    Kicker("LEGACY PIPELINE"),
    Text("Manual animation loops with imperative timeouts and callback spaghetti."),
  ],
  { width: "42cqw" },
).decorate(rule({ color: "#f43f5e" }));

const reactiveCard = Card(
  [
    Kicker("STAGE ROUTINE"),
    Text("Deterministic snapshot graph with fluent, zero-boilerplate choreography."),
  ],
  { width: "42cqw", opacity: 0 },
).decorate(rule({ color: "#38bdf8" }));

const replaceCode = CodeBlock(
  ["// Synchronized in-place replacement", "replace(legacyCard, reactiveCard);"],
  { width: "44cqw" },
).decorate(bracket({ color: "rgba(56, 189, 248, 0.4)" }));

layout.hstack([[motionKicker, motionHeading, motionDescription, legacyCard], replaceCode], {
  x: 6,
  y: 18,
  width: [42, 44],
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
    x: 6,
    y: 18,
    width: [38, 50],
    gap: 3,
  },
);

stage
  .scene("Dream Appearance")
  .with(brandTitle, dreamKicker, dreamHeading, dreamLead, dreamCard1, dreamCard2, dreamCard3);
stage.pause();

// Scene: Callout Geometries & Dynamic Tails

const calloutKicker = Kicker("12 / Callout Geometries");
const calloutHeading = Title("Dynamic Speech & Thought Tails", {
  width: "34cqw",
});
const calloutDescription = Text(
  "Speech and thought bubbles connect their tails to live targets. The tail re-aims every frame as the target moves, and points land on the target outline.",
  { width: "34cqw" },
);

const agentAlpha = Card(
  [Sparkles({ size: 36, color: "#38bdf8" }), Kicker("Agent Alpha", { color: "#38bdf8" })],
  { width: 170, height: 110, align: "center" },
);

const agentBeta = Card(
  [Cpu({ size: 36, color: "#a855f7" }), Kicker("Agent Beta", { color: "#a855f7" })],
  { width: 170, height: 110, align: "center" },
);

const speechBubble = Shape(
  paths.speechBubble({ tail: { to: agentAlpha, anchor: "top" }, radius: 14 }),
  "Directing query to Alpha",
  {
    width: 250,
    height: 120,
    borderColor: "#38bdf8",
    strokeWidth: 2,
  },
);

const thoughtBubble = Shape(
  paths.thoughtBubble({ tail: { to: agentBeta, anchor: "top" }, lobes: 9 }),
  "Evaluating Beta response...",
  {
    width: 250,
    height: 120,
    borderColor: "#a855f7",
    strokeWidth: 2,
  },
);

layout.vstack([calloutKicker, calloutHeading, calloutDescription], {
  x: 6,
  y: 18,
  gap: 2,
});

layout.grid(
  [
    [speechBubble, thoughtBubble],
    [agentAlpha, agentBeta],
  ],
  {
    x: 44,
    y: 20,
    gapX: 4,
    gapY: 4,
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

// Scene: Conclusion

stage.scene("Conclusion").with(brandTitle, editorialLead, heroBody);

// Return title, lead, and body to hero center positions.
brandTitle.to({ position: ["center", 38], scale: 1 }).ease("cubicInOut");
editorialLead.to({ y: 52, opacity: 1 }).when(brandTitle, "halfway");
heroBody.opacity = to(1).when(editorialLead, "halfway");
stage.pause();

// Register overlays and mount the stage into the DOM.
stage.overlay(LaserPointer());
stage.overlay(NavigationOverlay());
stage.mount("#stage");
