/**
 * Demo presentation script showing how to build animated slides with StageRoutine.
 */

import {
  AsciiFluid,
  Badge,
  BulletList,
  CodeBlock,
  Connector,
  Kicker,
  Lifeline,
  Shape,
  Stage,
  Table,
  TerminalWindow,
  Text,
  Title,
  arrange,
  glow,
  gradient,
  to,
  typewriter,
  vignette,
} from "../src/index";

// Initialize presentation stage with the ASCII Fluid background
const stage = new Stage().background(AsciiFluid().decorate(vignette()));

// Positioning components:
// - x, y: The spot on the stage (percentage from top-left, or "center").
// - anchor: Which part of the component sits on that spot (e.g. "top-left" corner or "center").

// --- Scene: Introduction ---

// Create visual elements. Setting opacity to 0 keeps them hidden until animated.
const brandTitle = Title("StageRoutine", {
  variant: "hero",
  x: "center",
  y: 38,
  opacity: 0,
});

const sectionKicker = Kicker("00 / Core Runtime", {
  x: "center",
  y: 28,
  opacity: 0,
});

const editorialLead = Title("State mutation is motion.", {
  variant: "serif",
  x: "center",
  y: 52,
  opacity: 0,
})
  .decorate(gradient())
  .decorate(glow());

const heroBody = Text(
  "A minimalist presentation framework where variable mutation drives smooth animation.",
  {
    x: "center",
    y: 64,
    opacity: 0,
    style: { width: "65cqw", textAlign: "center" },
  },
);

// Declare which elements are active in this scene.
stage.scene("Introduction").with(brandTitle, sectionKicker, editorialLead, heroBody);

// Speaker notes for this scene.
stage.setNotes([
  "Welcome to StageRoutine.",
  "- State mutation drives animation.",
  "- Canvas acts as a continuous reactive space.",
]);

// Animate elements into view using direct property assignments.
sectionKicker.opacity = 1;
brandTitle.opacity = 1;
editorialLead.opacity = 1;
heroBody.opacity = 1;
stage.pause();

// --- Scene: Continuous Plane ---

// Create elements that enter in this scene.
const leftHeading = Title("Continuous Plane", {
  kicker: "01 / Architecture",
  x: 6,
  y: 23,
  opacity: 0,
  style: { width: "44cqw" },
});

const leftBody = Text(
  "Discrete slides swap entire frames with jarring cuts. StageRoutine preserves spatial continuity across transitions by treating the canvas as a persistent reactive state space.",
  {
    x: leftHeading.x,
    y: 38,
    opacity: 0,
    style: { width: "42cqw" },
  },
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
  {
    x: 110,
    y: 28,
    opacity: 0,
    style: { width: "44cqw" },
  },
);

// brandTitle remains in this scene, so it smoothly glides to its new position instead of recreating.
stage.scene("Continuous Plane").with(brandTitle, leftHeading, leftBody, codePanel);
stage.setNotes([
  "Notice the continuous camera pan:",
  "- The brand title glides smoothly into the top-left corner.",
  "- The code block slides in from the right edge.",
]);

// Reposition brandTitle to the top-left corner.
brandTitle.x = to(6).ease("cubicInOut");
brandTitle.y = to(6).ease("cubicInOut");
brandTitle.scale = to(0.6).ease("cubicInOut");

// Fade out intro elements that are leaving this scene.
sectionKicker.opacity = 0;
editorialLead.y = 62;
editorialLead.opacity = 0;
heroBody.opacity = 0;

// Milestone triggers (.when): chain animations to start after another element completes ("end") or reaches "halfway".
leftHeading.opacity = to(1).when(brandTitle, "end");
leftBody.opacity = to(1).when(leftHeading, "halfway");

// Slide code panel into the right column.
codePanel.x = 52;
codePanel.opacity = 1;
stage.pause();

// --- Scene: Snapshot Engine ---

const rightHeading = Title("Snapshot Engine", {
  kicker: "02 / Mechanics",
  x: 52,
  y: 18,
  opacity: 0,
  style: { width: "44cqw" },
});

const rightBody = Text(
  "Every pause records an immutable state snapshot. The runtime computes dynamic property diffs for forward transitions and instant backward rewinds.",
  {
    x: rightHeading.x,
    y: 36,
    opacity: 0,
    style: { width: "42cqw" },
  },
);

// BulletList provides animatable child proxies via .items.
const featureChecklist = BulletList(
  [
    "Bidirectional playback: jump to any step snapshot instantly",
    "High-precision cubic-Bézier numerical curve solver",
    "Interpolates spatial coordinates, scale, opacity, blur, and colors",
  ],
  {
    x: rightHeading.x,
    y: 56,
    opacity: 0,
    style: { width: "44cqw" },
  },
);

for (const item of featureChecklist.items) {
  item.opacity = 0;
  item.x = 2;
}

stage
  .scene("Snapshot Engine")
  .with(brandTitle, codePanel, rightHeading, rightBody, featureChecklist);
stage.setNotes([
  "Watch the horizontal spatial balance:",
  "- Code panel glides across to the left column.",
  "- Mechanics & staggered checklist glide in on the right.",
]);

// Slide left column off-screen.
leftHeading.opacity = 0;
leftHeading.x = -50;
leftBody.opacity = 0;
leftBody.x = -50;

// Move code panel from the right column over to the left column.
codePanel.x = to(brandTitle.x).ease("cubicInOut");

// Reveal right column after the code panel passes halfway.
rightHeading.opacity = to(1).when(codePanel, "halfway");
rightBody.opacity = to(1).when(rightHeading, "halfway");

// Cascade individual bullet items sequentially with 200ms stagger.
featureChecklist.opacity = to(1).when(rightBody, "halfway");
featureChecklist.items.forEach((item, index) => {
  const prev = index > 0 ? featureChecklist.items[index - 1] : undefined;
  const trigger = prev ?? rightBody;
  item.opacity = to(1).duration(0.4).when(trigger, 0.5);
  item.x = to(0).duration(0.4).when(trigger, 0.5);
});
stage.pause();

// --- Scene: Presenter Telemetry ---

// TerminalWindow renders a styled macOS terminal component.
const terminalPanel = TerminalWindow({
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
  style: { width: "44cqw" },
});

stage
  .scene("Presenter Telemetry")
  .with(brandTitle, terminalPanel, rightHeading, rightBody, featureChecklist);
stage.setNotes([
  "Vertical camera glide:",
  "- Code block lifts off the screen.",
  "- Live dev terminal rises from below.",
]);

// Slide code block upward off-screen and lift terminal up from below.
codePanel.y = to(-50).ease("cubicInOut");
codePanel.opacity = 0;

terminalPanel.y = to(19).when(codePanel, "halfway");
terminalPanel.opacity = to(1).when(codePanel, "halfway");
stage.pause();

// --- Scene: Component Showcase ---

const showcaseKicker = Kicker("03 / Design System", {
  x: 6,
  y: 18,
  opacity: 0,
});

const showcaseBadge = Badge("v1.0.0", {
  x: 26,
  y: 17.5,
  opacity: 0,
});

const customBadge = Badge("Reactive", {
  x: 35,
  y: showcaseBadge.y,
  color: "#38bdf8",
  background: "rgba(56, 189, 248, 0.1)",
  borderColor: "rgba(56, 189, 248, 0.25)",
  opacity: 0,
});

const showcaseTitle = Title("Component Primitives", {
  x: showcaseKicker.x,
  y: 25,
  opacity: 0,
  style: { width: "42cqw" },
});

const showcaseText = Text(
  "Minimalist, typography-first building blocks styled for high-contrast dark canvases.",
  {
    x: showcaseKicker.x,
    y: 39,
    opacity: 0,
    style: { width: "42cqw" },
  },
);

const showcaseCard = Shape(
  Text("A pure surface container for grouping slide elements with frosted glass styling."),
  {
    x: showcaseKicker.x,
    y: 52,
    opacity: 0,
    style: { width: "42cqw" },
  },
);

const showcaseList = BulletList(
  ["Direct-to-DOM zero Virtual DOM architecture", "High-precision numerical cubic curve solvers"],
  {
    x: showcaseKicker.x,
    y: 73,
    opacity: 0,
    style: { width: "42cqw" },
  },
);

const showcaseCode = CodeBlock(
  [
    "// Type-safe UI components",
    "const badge = Badge('v1.0');",
    "const custom = Badge('Live', { color: '#38bdf8' });",
    "const card = Shape('Frosted surface');",
  ],
  {
    x: rightHeading.x,
    y: 18,
    opacity: 0,
    style: { width: "42cqw" },
  },
);

const showcaseTerminal = TerminalWindow({
  title: "stageroutine-cli",
  lines: ["$ pnpm build", "✔ Bundled all components", "⚡ Ready for presentation"],
  x: showcaseCode.x,
  y: 52,
  opacity: 0,
  style: { width: "42cqw" },
});

stage
  .scene("Component Showcase")
  .with(
    brandTitle,
    showcaseKicker,
    showcaseBadge,
    customBadge,
    showcaseTitle,
    showcaseText,
    showcaseCard,
    showcaseList,
    showcaseCode,
    showcaseTerminal,
  );
stage.setNotes([
  "Component Showcase:",
  "- Displays Title, Text, Kicker, Badges, Shape, BulletList, CodeBlock, and TerminalWindow together.",
]);

// Dismiss previous telemetry scene elements
terminalPanel.y = to(120).ease("cubicInOut");
terminalPanel.opacity = 0;
rightHeading.opacity = 0;
rightBody.opacity = 0;
featureChecklist.opacity = 0;

// Reveal showcase elements
showcaseKicker.opacity = 1;
showcaseBadge.opacity = 1;
customBadge.opacity = 1;
showcaseTitle.opacity = 1;
showcaseText.opacity = 1;
showcaseCard.opacity = 1;
showcaseList.opacity = 1;
showcaseCode.opacity = 1;
showcaseTerminal.opacity = 1;
stage.pause();

// --- Scene: Element Decorators ---

const decoratorKicker = Kicker("04 / Decorators & Extensibility", {
  x: 6,
  y: 18,
  opacity: 0,
});

const decoratorHeading = Title("Element Decorators", {
  x: decoratorKicker.x,
  y: 25,
  opacity: 0,
  style: { width: "42cqw" },
});

const decoratorGradientDemo = Title("Gradient Flow in Action", {
  serif: true,
  x: decoratorKicker.x,
  y: 36,
  opacity: 0,
  style: { width: "42cqw" },
}).decorate(
  gradient({
    colors: ["#ec4899", "#f43f5e", "#fb923c", "#facc15", "#ec4899"],
    duration: 5,
  }),
);

const decoratorTypewriterDemo = Text("", {
  x: decoratorKicker.x,
  y: 48,
  opacity: 0,
  style: { width: "42cqw" },
}).decorate(
  typewriter({
    delay: 0.6,
    script: [
      "Decorators can simulatte",
      { delete: 2 },
      "e realistic typing, including typos, backspaces, and corrections...",
    ],
  }),
);

const decoratorCode = CodeBlock(
  [
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
  ],
  {
    x: rightHeading.x,
    y: 18,
    opacity: 0,
    style: { width: "42cqw" },
  },
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
stage.setNotes([
  "Element Decorators Scene:",
  "- Shows how decorators cleanly extend elements without coupling styles or stylesheets.",
  "- Demonstrates gradient with custom warm palette.",
  "- Demonstrates typewriter with realistic cadence and blinking cursor.",
]);

// Dismiss showcase elements
showcaseKicker.opacity = 0;
showcaseBadge.opacity = 0;
customBadge.opacity = 0;
showcaseTitle.opacity = 0;
showcaseText.opacity = 0;
showcaseCard.opacity = 0;
showcaseList.opacity = 0;
showcaseCode.opacity = 0;
showcaseTerminal.opacity = 0;

// Reveal decorator elements
decoratorKicker.opacity = 1;
decoratorHeading.opacity = 1;
decoratorGradientDemo.opacity = 1;
decoratorTypewriterDemo.opacity = 1;
decoratorCode.opacity = 1;
stage.pause();

// --- Scene: Structured Data & Metrics ---

const tableKicker = Kicker("05 / Structured Data & Focus", {
  x: 6,
  y: 18,
  opacity: 0,
});

const tableHeading = Title("Glassmorphic DataGrid", {
  x: tableKicker.x,
  y: 25,
  opacity: 0,
  style: { width: "42cqw" },
});

const tableText = Text(
  "Interactive tables with column alignment and presenter click-and-drag range focus across metric rows.",
  {
    x: tableKicker.x,
    y: 36,
    opacity: 0,
    style: { width: "42cqw" },
  },
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
  x: tableKicker.x,
  y: 60,
  opacity: 0,
  style: { width: "42cqw" },
});

for (const row of serviceMetricsTable.rows) {
  row.opacity = 0;
  row.x = 2;
}

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
    "// Programmatic or click/drag focus",
    "metrics.focusRows(1); // highlights degraded service",
  ],
  {
    x: 110,
    y: 18,
    opacity: 0,
    style: { width: "42cqw" },
  },
);

stage
  .scene("Structured Data & Metrics")
  .with(brandTitle, tableKicker, tableHeading, tableText, serviceMetricsTable, tableCode);
stage.setNotes([
  "Structured Data & Interactive Metrics Scene:",
  "- Displays the glassmorphic Table component with metric column alignments.",
  "- Demonstrates click-and-drag multi-row selection for focusing audience attention during talks.",
]);

// Dismiss decorator elements
decoratorKicker.opacity = 0;
decoratorHeading.opacity = 0;
decoratorGradientDemo.opacity = 0;
decoratorTypewriterDemo.opacity = 0;
decoratorCode.opacity = 0;
decoratorCode.x = to(-50);

// Reveal table elements with staggered spatial entrance
tableKicker.opacity = to(1).when(brandTitle, "start");
tableHeading.opacity = to(1).when(tableKicker, "halfway");
tableText.opacity = to(1).when(tableHeading, "halfway");

// Glide Table container into place
serviceMetricsTable.y = to(48).ease("cubicOut").when(tableText, "start");
serviceMetricsTable.opacity = to(1).when(tableText, "start");

// 200ms staggered cascade across table rows
serviceMetricsTable.rows.forEach((row, index) => {
  const prev = index > 0 ? serviceMetricsTable.rows[index - 1] : undefined;
  const trigger = prev ?? serviceMetricsTable;
  row.opacity = to(1).duration(0.4).when(trigger, 0.5);
  row.x = to(0).duration(0.4).when(trigger, 0.5);
});

// Glide code panel in from the right edge
tableCode.x = to(52).ease("cubicOut").when(tableText, "halfway");
tableCode.opacity = to(1).when(tableText, "halfway");
stage.pause();

// --- Scene: Component Topology ---

const topologyKicker = Kicker("06 / Architecture Topology", {
  x: 6,
  y: 18,
  opacity: 0,
});

const topologyHeading = Title("Reactive Component Graphs", {
  x: topologyKicker.x,
  y: 25,
  opacity: 0,
  style: { width: "42cqw" },
});

// Component Diagram Nodes
const clientCard = Shape("Client App", {
  x: 8,
  y: 36,
  opacity: 0,
  width: 200,
  align: "center",
});
const apiGateway = Shape(Text("API Gateway"), {
  x: 40,
  y: 36,
  opacity: 0,
  width: 220,
});
const authService = Shape(Text("Auth Service"), {
  x: 40,
  y: 66,
  opacity: 0,
  width: 220,
});
const databaseCard = Shape(Text("PostgreSQL DB"), {
  x: 72,
  y: 66,
  opacity: 0,
  width: 220,
});
const redisCache = Shape(Text("Redis Cache"), {
  x: 72,
  y: 36,
  opacity: 0,
  width: 220,
});

const connClientGateway = Connector(clientCard, apiGateway, {
  label: "HTTPS REST",
  routing: "bezier",
  color: "#38bdf8",
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
  routing: "straight",
  color: "#f59e0b",
  end: 0,
});

const connGatewayRedis = Connector(apiGateway, redisCache, {
  label: "Session Cache",
  routing: "bezier",
  color: "#10b981",
  end: 0,
});

const topologyNote = Shape(
  [Kicker("ARCHITECTURE NOTE"), Text("Perimeter routing with dynamic card boundary tracking.")],
  {
    variant: "note",
    side: "right",
    align: "right",
    width: "24cqw",
    x: 8,
    y: 66,
    opacity: 0,
  },
);

const noteConnector = Connector(topologyNote, authService, {
  dotted: true,
  traveling: true,
  arrow: false,
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

stage.setNotes([
  "Component Architecture Request Flow:",
  "- Step 1: Ingress traffic enters through API Gateway via HTTPS.",
  "- Step 2: Gateway queries Redis cache for session token.",
  "- Step 3: Gateway routes to Auth Service over gRPC, querying PostgreSQL.",
  "- Step 4: Live callout annotates active perimeter-tracked service.",
]);

// Dismiss table elements
tableKicker.opacity = 0;
tableHeading.opacity = 0;
tableText.opacity = 0;
serviceMetricsTable.opacity = 0;
tableCode.opacity = 0;
tableCode.x = 110;

// Reveal Topology layout nodes
topologyKicker.opacity = 1;
topologyHeading.opacity = 1;
clientCard.opacity = 1;
apiGateway.opacity = 1;
authService.opacity = 1;
databaseCard.opacity = 1;
redisCache.opacity = 1;
stage.pause();

// --- Step 1: Ingress Traffic (Client -> API Gateway) ---
connClientGateway.end = to(1).duration(0.4);
connClientGateway.pulse({ color: "#38bdf8", duration: 0.6 });
stage.pause();

// --- Step 2: Cache Inspection (API Gateway -> Redis) ---
connGatewayRedis.end = to(1).duration(0.4);
connGatewayRedis.pulse({ color: "#10b981", duration: 0.5 });
stage.pause();

// --- Step 3: Microservice Routing & DB Query (Gateway -> Auth -> PostgreSQL) ---
connGatewayAuth.end = to(1).duration(0.35);
connGatewayAuth.pulse({ color: "#a855f7", duration: 0.5 });

connAuthDb.end = to(1).duration(0.4).delay(0.2);
connAuthDb.pulse({ color: "#f59e0b", duration: 0.6 });
stage.pause();

// --- Step 4: Topology Annotation & Observability Callout ---
topologyNote.opacity = to(1).duration(0.35);
noteConnector.opacity = to(1).duration(0.35);
stage.pause();

clientCard.y = to(46).ease("cubicInOut");
stage.pause();
connClientGateway.pulse({ color: "#38bdf8", duration: 0.5 });
stage.pause();

// --- Scene: Sequence Protocol Flow ---

const sequenceKicker = Kicker("07 / Protocol Choreography", {
  x: 6,
  y: 18,
  opacity: 0,
});

const sequenceHeading = Title("Sequence Diagram & Protocols", {
  x: sequenceKicker.x,
  y: 25,
  opacity: 0,
  style: { width: "42cqw" },
});

// 3 Participants across the stage
const seqClient = Shape("Client App", {
  opacity: 0,
  width: 180,
  align: "center",
});
const seqGateway = Shape("API Gateway", {
  opacity: 0,
  width: 180,
  align: "center",
});
const seqAuth = Shape("Auth Server", {
  opacity: 0,
  width: 180,
  align: "center",
});
arrange.row([seqClient, seqGateway, seqAuth], { x: 16, y: 22, gap: 14 });

const seqClientLine = Lifeline(seqClient, { length: 440, color: "#475569" });
const seqGatewayLine = Lifeline(seqGateway, { length: 440, color: "#475569" });
const seqAuthLine = Lifeline(seqAuth, { length: 440, color: "#475569" });

const gatewayActive = seqGatewayLine.activation({
  y: 70,
  height: 280,
  color: "#38bdf8",
  opacity: 0,
});
const authActive = seqAuthLine.activation({ y: 130, height: 160, color: "#a855f7", opacity: 0 });

// Multiple protocol messages back and forth
const msg1 = Connector(
  { x: 21, y: 35 },
  { x: 53, y: 35 },
  { label: "1. POST /api/v1/auth/login", color: "#38bdf8", end: 0 },
);

const msg2 = Connector(
  { x: 53, y: 43 },
  { x: 85, y: 43 },
  { label: "2. Verify Password Hash", color: "#a855f7", end: 0 },
);

const msg3 = Connector(
  { x: 85, y: 51 },
  { x: 53, y: 51 },
  { label: "3. User Roles & Identity", color: "#a855f7", dashed: true, end: 0 },
);

const msg4 = Connector(
  { x: 85, y: 59 },
  { x: 53, y: 59 },
  { label: "4. Issue Signed JWT Token", color: "#10b981", dashed: true, end: 0 },
);

const msg5 = Connector(
  { x: 53, y: 67 },
  { x: 21, y: 67 },
  { label: "5. 200 OK (Bearer Session)", color: "#10b981", dashed: true, end: 0 },
);

stage
  .scene("Sequence Protocol Flow")
  .with(
    brandTitle,
    sequenceKicker,
    sequenceHeading,
    seqClient,
    seqGateway,
    seqAuth,
    seqClientLine,
    seqGatewayLine,
    seqAuthLine,
    gatewayActive,
    authActive,
    msg1,
    msg2,
    msg3,
    msg4,
    msg5,
  );

stage.setNotes([
  "Sequence Protocol Flow Scene:",
  "- Step 1: Client sends login request to API Gateway.",
  "- Step 2: Gateway validates credentials against Auth Server.",
  "- Step 3: Auth Server returns claims and signed JWT to Gateway.",
  "- Step 4: Gateway returns 200 OK Bearer session to Client.",
]);

// Dismiss topology elements
topologyKicker.opacity = 0;
topologyHeading.opacity = 0;
clientCard.opacity = 0;
apiGateway.opacity = 0;
authService.opacity = 0;
databaseCard.opacity = 0;
redisCache.opacity = 0;
topologyNote.opacity = 0;
noteConnector.opacity = 0;

// Reveal Sequence participants
sequenceKicker.opacity = 1;
sequenceHeading.opacity = 1;
seqClient.opacity = 1;
seqGateway.opacity = 1;
seqAuth.opacity = 1;
seqClientLine.opacity = 1;
seqGatewayLine.opacity = 1;
seqAuthLine.opacity = 1;

// Step 1: Client -> Gateway
msg1.end = to(1).duration(0.4);
gatewayActive.opacity = to(1).duration(0.3);
msg1.pulse({ color: "#38bdf8" });
stage.pause();

// Step 2: Gateway -> Auth Server (Back & Forth)
msg2.end = to(1).duration(0.35);
authActive.opacity = to(1).duration(0.3);
msg3.end = to(1).duration(0.35).delay(0.2);
msg4.end = to(1).duration(0.35).delay(0.4);
stage.pause();

// Step 3: Gateway -> Client response
msg5.end = to(1).duration(0.4);
msg5.pulse({ color: "#10b981" });
stage.pause();

// --- Scene: State Machine Transitions ---

const stateKicker = Kicker("08 / State Machine Topologies", {
  x: 6,
  y: 18,
  opacity: 0,
});

const stateHeading = Title("Interactive State Transitions", {
  x: stateKicker.x,
  y: 25,
  opacity: 0,
  style: { width: "42cqw" },
});

// State Machine Nodes in a circuit layout using geometric Shape primitives
const stateIdle = Shape("IDLE", {
  shape: "circle",
  active: true,
  size: 90,
  x: 18,
  y: 52,
  opacity: 0,
});
const stateAuthenticating = Shape("AUTH?", {
  shape: "diamond",
  size: 100,
  x: 48,
  y: 36,
  opacity: 0,
});
const stateActive = Shape("ACTIVE", {
  shape: "circle",
  doubleBorder: true,
  size: 90,
  x: 78,
  y: 52,
  opacity: 0,
});
const stateRejected = Shape("REJECTED", {
  shape: "pill",
  height: 48,
  x: 48,
  y: 68,
  opacity: 0,
  color: "#f43f5e",
  borderColor: "#f43f5e",
});

const tSubmit = Connector(stateIdle, stateAuthenticating, {
  label: "login()",
  routing: "bezier",
  color: "#38bdf8",
  end: 0,
});

const tSuccess = Connector(stateAuthenticating, stateActive, {
  label: "validToken",
  routing: "bezier",
  color: "#10b981",
  end: 0,
});

const tFail = Connector(stateAuthenticating, stateRejected, {
  label: "invalidCredentials",
  routing: "straight",
  color: "#f43f5e",
  end: 0,
});

const tRetry = Connector(stateRejected, stateIdle, {
  label: "retry()",
  routing: "corner",
  color: "#f59e0b",
  dashed: true,
  end: 0,
});

const tLogout = Connector(stateActive, stateIdle, {
  label: "logout()",
  routing: "bezier",
  color: "#64748b",
  dashed: true,
  end: 0,
});

stage
  .scene("State Machine Transitions")
  .with(
    brandTitle,
    stateKicker,
    stateHeading,
    stateIdle,
    stateAuthenticating,
    stateActive,
    stateRejected,
    tSubmit,
    tSuccess,
    tFail,
    tRetry,
    tLogout,
  );

stage.setNotes([
  "State Machine Scene:",
  "- Step 1: IDLE state active.",
  "- Step 2: Transition from IDLE to AUTHENTICATING.",
  "- Step 3: Transition from AUTHENTICATING to ACTIVE.",
]);

// Dismiss sequence elements
sequenceKicker.opacity = 0;
sequenceHeading.opacity = 0;
seqClient.opacity = 0;
seqGateway.opacity = 0;
seqAuth.opacity = 0;
seqClientLine.opacity = 0;
seqGatewayLine.opacity = 0;
seqAuthLine.opacity = 0;
gatewayActive.opacity = 0;
authActive.opacity = 0;

// Reveal State Machine nodes
stateKicker.opacity = 1;
stateHeading.opacity = 1;
stateIdle.opacity = 1;
stateAuthenticating.opacity = 1;
stateActive.opacity = 1;
stateRejected.opacity = 1;

// Draw state edges
tSubmit.end = to(1).duration(0.4);
tSuccess.end = to(1).duration(0.4);
tFail.end = to(1).duration(0.4);
tRetry.end = to(1).duration(0.4);
tLogout.end = to(1).duration(0.4);

tSubmit.pulse({ color: "#38bdf8" });
stage.pause();

// --- Scene: Conclusion ---

stage.scene("Conclusion").with(brandTitle, editorialLead, heroBody);
stage.setNotes([
  "Concluding overview:",
  "- The title glides back to center stage.",
  "- Press Left Arrow anytime to smoothly rewind.",
]);

// Dismiss table elements
tableKicker.opacity = 0;
tableHeading.opacity = 0;
tableText.opacity = 0;
serviceMetricsTable.opacity = 0;
serviceMetricsTable.y = 60;
for (const row of serviceMetricsTable.rows) {
  row.opacity = 0;
  row.x = 2;
}
tableCode.opacity = 0;
tableCode.x = 110;

// Return title, lead, and body to hero center positions.
brandTitle.x = to("center").ease("cubicInOut");
brandTitle.y = to(38).ease("cubicInOut");
brandTitle.scale = to(1).ease("cubicInOut");

editorialLead.y = to(52).when(brandTitle, "halfway");
editorialLead.opacity = to(1).when(brandTitle, "halfway");

heroBody.opacity = to(1).when(editorialLead, "halfway");
stage.pause();

// Mount the stage into the DOM and begin keyboard/hash navigation listeners.
stage.mount();
