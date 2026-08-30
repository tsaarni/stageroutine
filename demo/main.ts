/**
 * Demo presentation script showing how to build animated slides with StageRoutine.
 */

import {
  AsciiFluid,
  BulletList,
  Card,
  Circle,
  CodeBlock,
  Connector,
  Diamond,
  Kicker,
  Pill,
  SequenceDiagram,
  Stage,
  Table,
  TerminalWindow,
  Text,
  Title,
  arrange,
  bracket,
  crossfade,
  glow,
  gradient,
  rail,
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
const sectionKicker = Kicker("00 / Core Runtime", {
  x: "center",
  y: 32,
  anchor: "center",
  opacity: 0,
});

const brandTitle = Title("StageRoutine", {
  variant: "hero",
  x: "center",
  y: 40,
  anchor: "center",
  opacity: 0,
});

const editorialLead = Title("State mutation is motion.", {
  variant: "serif",
  x: "center",
  y: 52,
  anchor: "center",
  opacity: 0,
})
  .decorate(gradient())
  .decorate(glow());

const heroBody = Text(
  "A minimalist presentation framework where variable mutation drives smooth animation.",
  {
    x: "center",
    y: 65,
    anchor: "center",
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
  opacity: 0,
});

const leftBody = Text(
  "Discrete slides swap entire frames with jarring cuts. StageRoutine preserves spatial continuity across transitions by treating the canvas as a persistent reactive state space.",
  {
    opacity: 0,
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
    y: 24,
    opacity: 0,
    width: "44cqw",
  },
).decorate(rail());

const { rule: planeRule } = arrange.split([leftHeading, leftBody], codePanel, {
  leftX: 6,
  rightX: 52,
  y: 23,
  gap: 3.5,
  rule: { color: "rgba(255, 255, 255, 0.12)", dashed: true },
});
if (planeRule) planeRule.opacity = 0;
codePanel.x = 110;

// brandTitle remains in this scene, so it smoothly glides to its new position instead of recreating.
stage
  .scene("Continuous Plane")
  .with(brandTitle, leftHeading, leftBody, codePanel, ...(planeRule ? [planeRule] : []));
stage.setNotes([
  "Notice the continuous camera pan:",
  "- The brand title glides smoothly into the top-left corner.",
  "- The code block slides in from the right edge with an accent rail.",
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
if (planeRule) planeRule.opacity = to(1).when(leftHeading, "halfway");

// Slide code panel into the right column.
codePanel.x = to(52).ease("quartOut");
codePanel.opacity = to(1).when(leftHeading, "halfway");
stage.pause();

// --- Scene: Snapshot Engine ---

const rightHeading = Title("Snapshot Engine", {
  kicker: "02 / Mechanics",
  opacity: 0,
});

const rightBody = Text(
  "Every pause records an immutable state snapshot. The runtime computes dynamic property diffs for forward transitions and instant backward rewinds.",
  {
    opacity: 0,
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
    opacity: 0,
  },
);

arrange.column([rightHeading, rightBody, featureChecklist], {
  x: 52,
  y: 18,
  gap: 4,
});

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
if (planeRule) planeRule.opacity = 0;

// Move code panel from the right column over to the left column.
codePanel.x = to(brandTitle.x).ease("cubicInOut");

// Reveal right column after the code panel passes halfway.
rightHeading.opacity = to(1).when(codePanel, "halfway");
rightBody.opacity = to(1).when(rightHeading, "halfway");

// Cascade individual bullet items sequentially with stagger.
featureChecklist.reveal().duration(0.4).when(rightBody, 0.5);
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
  width: "44cqw",
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
  opacity: 0,
});

const showcasePill = Pill("v1.0.0", {
  opacity: 0,
});

const customPill = Pill("Reactive", {
  color: "#38bdf8",
  background: "rgba(56, 189, 248, 0.1)",
  borderColor: "rgba(56, 189, 248, 0.25)",
  opacity: 0,
});

arrange.row([showcaseKicker, showcasePill, customPill], {
  x: 6,
  y: 18,
  gap: 2,
});

const showcaseTitle = Title("Component Primitives", {
  opacity: 0,
  width: "42cqw",
});

const showcaseText = Text(
  "Minimalist, typography-first building blocks styled for high-contrast dark canvases.",
  {
    opacity: 0,
    width: "42cqw",
  },
);

const showcaseCard = Card(
  Text("A pure surface container for grouping slide elements with frosted glass styling."),
  {
    opacity: 0,
    width: "42cqw",
  },
);

const showcaseList = BulletList(
  ["Direct-to-DOM zero Virtual DOM architecture", "High-precision numerical cubic curve solvers"],
  {
    opacity: 0,
    width: "42cqw",
  },
);

const showcaseCode = CodeBlock(
  [
    "// Type-safe UI primitives",
    "const pill = Pill('v1.0');",
    "const custom = Pill('Live', { color: '#38bdf8' });",
    "const card = Card('Frosted surface');",
  ],
  {
    opacity: 0,
    width: "42cqw",
  },
);

const showcaseTerminal = TerminalWindow({
  title: "stageroutine-cli",
  lines: ["$ pnpm build", "✔ Bundled all components", "⚡ Ready for presentation"],
  opacity: 0,
  width: "42cqw",
});

arrange.split(
  [showcaseTitle, showcaseText, showcaseCard, showcaseList],
  [showcaseCode, showcaseTerminal],
  { leftX: 6, rightX: 52, y: 25, gap: 3.5 },
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
stage.setNotes([
  "Component Showcase:",
  "- Displays Title, Text, Kicker, Pill, Card, BulletList, CodeBlock, and TerminalWindow together.",
]);

// Dismiss previous telemetry scene elements
terminalPanel.y = to(120).ease("cubicInOut");
terminalPanel.opacity = 0;
rightHeading.opacity = 0;
rightBody.opacity = 0;
featureChecklist.opacity = 0;

// Reveal showcase elements
showcaseKicker.opacity = 1;
showcasePill.opacity = 1;
customPill.opacity = 1;
showcaseTitle.opacity = 1;
showcaseText.opacity = 1;
showcaseCard.opacity = 1;
showcaseList.opacity = 1;
showcaseCode.opacity = 1;
showcaseTerminal.opacity = 1;
stage.pause();

// --- Scene: Element Decorators ---

const decoratorKicker = Kicker("04 / Decorators & Extensibility", {
  opacity: 0,
});

const decoratorHeading = Title("Element Decorators", {
  opacity: 0,
});

const decoratorGradientDemo = Title("Gradient Flow in Action", {
  serif: true,
  opacity: 0,
}).decorate(
  gradient({
    colors: ["#ec4899", "#f43f5e", "#fb923c", "#facc15", "#ec4899"],
    duration: 5,
  }),
);

const decoratorTypewriterDemo = Text("", {
  opacity: 0,
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
    opacity: 0,
  },
).decorate(bracket({ side: "left", style: "curly", color: "rgba(255, 255, 255, 0.2)" }));

arrange.split(
  [decoratorKicker, decoratorHeading, decoratorGradientDemo, decoratorTypewriterDemo],
  decoratorCode,
  { leftX: 6, rightX: 52, y: 18, leftWidth: 42, rightWidth: 44, gap: 3 },
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
showcasePill.opacity = 0;
customPill.opacity = 0;
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
  opacity: 0,
});

const tableHeading = Title("Glassmorphic DataGrid", {
  opacity: 0,
});

const tableText = Text(
  "Interactive tables with column alignment and presenter click-and-drag range focus across metric rows.",
  {
    opacity: 0,
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
  opacity: 0,
  width: "42cqw",
});

arrange.column([tableKicker, tableHeading, tableText], {
  x: 6,
  y: 18,
  width: 42,
  gap: 3,
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
    "// Programmatic or click/drag focus",
    "metrics.focusRows(1); // highlights degraded service",
  ],
  {
    x: 110,
    y: 18,
    opacity: 0,
    width: "42cqw",
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

// Staggered cascade across table rows
serviceMetricsTable.reveal().duration(0.4).when(tableText, 0.5);

// Glide code panel in from the right edge
tableCode.x = to(52).ease("cubicOut").when(tableText, "halfway");
tableCode.opacity = to(1).when(tableText, "halfway");
stage.pause();

// --- Scene: Component Topology ---

const topologyKicker = Kicker("06 / Architecture Topology", {
  opacity: 0,
});

const topologyHeading = Title("Reactive Component Graphs", {
  opacity: 0,
  width: "42cqw",
});

arrange.column([topologyKicker, topologyHeading], {
  x: 6,
  y: 18,
  gap: 2,
});

// Component Diagram Nodes
const clientCard = Card("Client App", {
  opacity: 0,
  width: 180,
  height: 100,
  align: "center",
});
const apiGateway = Card("API Gateway", {
  opacity: 0,
  width: 180,
  height: 100,
  align: "center",
});
const authService = Card("Auth Service", {
  opacity: 0,
  width: 180,
  height: 100,
  align: "center",
});
const databaseCard = Card("PostgreSQL DB", {
  opacity: 0,
  width: 180,
  height: 100,
  align: "center",
});
const redisCache = Card("Redis Cache", {
  opacity: 0,
  width: 180,
  height: 100,
  align: "center",
});

const topologyNote = Card(
  [Kicker("ARCHITECTURE NOTE"), Text("Perimeter routing with dynamic card boundary tracking.")],
  {
    variant: "ghost",
    align: "right",
    width: "24cqw",
    opacity: 0,
  },
).decorate(rail({ side: "right" }));

// Position topology nodes via wider 2D matrix grid shifted to the right
arrange.grid(
  [
    [clientCard, apiGateway, redisCache],
    [null, authService, databaseCard],
  ],
  { x: 20, y: 35, gapX: 16, gapY: 10 },
);

// Position architecture note lower and offset to the far left
topologyNote.x = 6;
topologyNote.y = 74;

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

const noteConnector = Connector(topologyNote, authService, {
  dotted: true,
  traveling: true,
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
  width: "32cqw",
});

// Initialize sequence diagram helper with participants and vertical spacing
const seq = SequenceDiagram({
  participants: [clientCard, apiGateway, authService],
  startY: 36,
  gapY: 9.5,
  lifelineLength: 540,
});

// Auto-spaced protocol messages
const msg1 = seq.message(clientCard, apiGateway, {
  label: "1. POST /api/v1/auth/login",
  color: "#38bdf8",
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
const gatewayActive = seq.activate(apiGateway, {
  from: msg1,
  to: msg5,
  color: "#38bdf8",
  opacity: 0,
});
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

stage.setNotes([
  "Sequence Protocol Flow Scene:",
  "- Step 1: Client App, API Gateway, and Auth Service fly smoothly into timeline positions.",
  "- Step 2: Client sends login request to API Gateway.",
  "- Step 3: Gateway validates credentials against Auth Server.",
  "- Step 4: Auth Server returns claims and signed JWT to Gateway.",
  "- Step 5: Gateway returns 200 OK Bearer session to Client.",
]);

// Reveal Sequence heading
sequenceKicker.opacity = 1;
sequenceHeading.opacity = 1;

// Fly shared participant components smoothly into Sequence Timeline positions via arrange.row!
arrange.row([clientCard, apiGateway, authService], {
  x: 44,
  y: 22,
  gap: 12.5,
  animate: true,
  duration: 0.6,
});

// Drop down vertical lifelines only after participant cards arrive at destination
for (const line of seq.lifelines) {
  line.opacity = to(1).duration(0.35).after(clientCard);
}

// Step 1: Client -> Gateway draws automatically after lifelines appear
msg1.end = to(1).duration(0.4).after(seq.lifelines[0]);
gatewayActive.opacity = to(1).duration(0.3).after(seq.lifelines[0]);
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
  opacity: 0,
});

const stateHeading = Title("Interactive State Transitions", {
  opacity: 0,
  width: "36cqw",
});

arrange.column([stateKicker, stateHeading], {
  x: 6,
  y: 18,
  gap: 2,
});

/// UML Initial Pseudostate (subtle frosted glass disc with solid center dot)
const stateInitial = Circle("●", {
  size: 38,
  opacity: 0,
  variant: "surface",
  style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
    color: "var(--sr-text)",
  },
});

// UML Final Pseudostate (subtle frosted glass bullseye with double border)
const stateFinal = Circle("●", {
  size: 38,
  opacity: 0,
  doubleBorder: true,
  variant: "surface",
  style: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "1.1rem",
    color: "var(--sr-text)",
  },
});

// Clean Glassmorphic UML State Cards (consistent with presentation design system)
const stateIdle = Card("Idle", {
  width: 170,
  height: 60,
  opacity: 0,
  align: "center",
});

const stateAuthenticating = Card("Authenticating", {
  width: 190,
  height: 60,
  opacity: 0,
  align: "center",
});

const stateActive = Card("Active", {
  width: 170,
  height: 60,
  opacity: 0,
  align: "center",
});

const stateRejected = Card("Rejected", {
  width: 170,
  height: 60,
  opacity: 0,
  align: "center",
});

// Arrange all nodes in a balanced circular topology
arrange.circle(
  [stateInitial, stateIdle, stateAuthenticating, stateActive, stateRejected, stateFinal],
  {
    centerX: 64,
    centerY: 52,
    radiusX: 25,
    radiusY: 20,
    startAngle: -160,
    span: 320,
  },
);

// Elegant Single-Curvature Arc Transitions
const tStart = Connector(stateInitial, stateIdle, {
  color: "rgba(255, 255, 255, 0.4)",
  routing: "arc",
  end: 0,
});

const tSubmit = Connector(stateIdle, stateAuthenticating, {
  label: "submit()",
  color: "#38bdf8",
  routing: "arc",
  end: 0,
});

const tSuccess = Connector(stateAuthenticating, stateActive, {
  label: "[valid]",
  color: "#10b981",
  routing: "arc",
  end: 0,
});

const tFail = Connector(stateAuthenticating, stateRejected, {
  label: "[invalid]",
  color: "#f43f5e",
  routing: "bezier",
  end: 0,
});

const tRetry = Connector(stateRejected, stateAuthenticating, {
  label: "retry()",
  color: "rgba(255, 255, 255, 0.35)",
  routing: "arc",
  curvature: -0.25,
  dashed: true,
  end: 0,
});

const tLogout = Connector(stateActive, stateIdle, {
  label: "logout()",
  color: "rgba(255, 255, 255, 0.35)",
  routing: "bezier",
  curvature: -0.25,
  dashed: true,
  end: 0,
});

const tTerminate = Connector(stateRejected, stateFinal, {
  label: "terminate()",
  color: "rgba(255, 255, 255, 0.4)",
  routing: "arc",
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

stage.setNotes([
  "State Machine Topologies Scene:",
  "- Step 1: Initial pseudostate transitions to Idle.",
  "- Step 2: Idle transitions to Authenticating on submit().",
  "- Step 3: Success transitions to Active; failure branches to Rejected with retry.",
  "- Step 4: Active state can terminate into the Final state.",
]);

// Dismiss sequence elements
sequenceKicker.opacity = 0;
sequenceHeading.opacity = 0;
clientCard.opacity = 0;
apiGateway.opacity = 0;
authService.opacity = 0;
for (const line of seq.lifelines) {
  line.opacity = 0;
}
gatewayActive.opacity = 0;
authActive.opacity = 0;
msg1.opacity = 0;
msg2.opacity = 0;
msg3.opacity = 0;
msg4.opacity = 0;
msg5.opacity = 0;

// Reveal State Machine nodes
stateKicker.opacity = 1;
stateHeading.opacity = 1;
stateInitial.opacity = 1;
stateFinal.opacity = 1;
stateIdle.opacity = 1;
stateAuthenticating.opacity = 1;
stateActive.opacity = 1;
stateRejected.opacity = 1;

// Draw state edges
tStart.end = to(1).duration(0.3);
tSubmit.end = to(1).duration(0.4).after(tStart);
tSuccess.end = to(1).duration(0.4).after(tSubmit);
tFail.end = to(1).duration(0.4).after(tSubmit);
tRetry.end = to(1).duration(0.4).after(tFail);
tLogout.end = to(1).duration(0.4).after(tSuccess);
tTerminate.end = to(1).duration(0.4).after(tSuccess);

tSubmit.pulse({ color: "#38bdf8" });
stage.pause();

// --- Scene: Geometric Primitives & Reactive Sizing ---

const geoKicker = Kicker("09 / Geometric Primitives", {
  opacity: 0,
});

const geoHeading = Title("Reactive Sizing & Geometric Nodes", {
  opacity: 0,
  width: "42cqw",
});

const geoDescription = Text(
  "Shapes smoothly resize without scaling distortion. Width, height, and size animate as reactive properties while connectors track dynamic perimeters in real time.",
  {
    opacity: 0,
    width: "42cqw",
  },
);

arrange.column([geoKicker, geoHeading, geoDescription], {
  x: 6,
  y: 18,
  gap: 3,
});

const morphBox = Card("Dynamic Layout Reflow", {
  width: 220,
  height: 110,
  opacity: 0,
  borderColor: "#38bdf8",
});

const morphCircle = Circle("100%", {
  size: 110,
  opacity: 0,
  color: "#a855f7",
  borderColor: "#a855f7",
});

const morphDiamond = Diamond("Verify", {
  size: 115,
  opacity: 0,
  color: "#f59e0b",
  borderColor: "#f59e0b",
});

const morphPill = Pill("Cluster Active", {
  width: 170,
  height: 54,
  opacity: 0,
  color: "#10b981",
  borderColor: "#10b981",
});

arrange.grid([morphBox, morphCircle, morphDiamond, morphPill], {
  cols: 2,
  x: 52,
  y: 28,
  gapX: 8,
  gapY: 7,
});

const connBoxCircle = Connector(morphBox, morphCircle, {
  label: "auto-tracking",
  color: "#38bdf8",
  routing: "bezier",
  end: 0,
});

const connDiamondPill = Connector(morphDiamond, morphPill, {
  label: "snap-sync",
  color: "#f59e0b",
  routing: "straight",
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
    morphPill,
    connBoxCircle,
    connDiamondPill,
  );

stage.setNotes([
  "Geometric Primitives Scene:",
  "- Step 1: Initial compact shapes enter with connected auto-tracking lines.",
  "- Step 2: Shapes dynamically resize and text naturally reflows across line breaks in real time.",
]);

// Dismiss state machine elements
stateKicker.opacity = 0;
stateHeading.opacity = 0;
stateIdle.opacity = 0;
stateAuthenticating.opacity = 0;
stateActive.opacity = 0;
stateRejected.opacity = 0;
tSubmit.opacity = 0;
tSuccess.opacity = 0;
tFail.opacity = 0;
tRetry.opacity = 0;
tLogout.opacity = 0;

// Reveal geo elements
geoKicker.opacity = 1;
geoHeading.opacity = 1;
geoDescription.opacity = 1;
morphBox.opacity = 1;
morphCircle.opacity = 1;
morphDiamond.opacity = 1;
morphPill.opacity = 1;

connBoxCircle.end = to(1).duration(0.4);
connDiamondPill.end = to(1).duration(0.4);
stage.pause();

// --- Step 2: Reactive Sizing & Live Text Reflow Animation ---
morphBox.width = to(420).duration(0.6).ease("cubicInOut");
morphBox.height = to(68).duration(0.6).ease("cubicInOut");
morphCircle.size = to(160).duration(0.6).ease("cubicInOut");
morphDiamond.size = to(165).duration(0.6).ease("cubicInOut");
morphPill.width = to(280).duration(0.6).ease("cubicInOut");

connBoxCircle.pulse({ color: "#38bdf8", duration: 0.5 });
stage.pause();

// --- Scene: Motion Orchestration & Crossfade ---

const motionKicker = Kicker("10 / Motion Orchestration", {
  opacity: 0,
});

const motionHeading = Title("In-Place Crossfade Choreography", {
  opacity: 0,
  width: "42cqw",
});

const motionDescription = Text(
  "Coordinate multi-element replacements in place with synchronized opacity, spatial alignment, and depth scaling.",
  {
    opacity: 0,
    width: "42cqw",
  },
);

const legacyCard = Card(
  [
    Kicker("LEGACY PIPELINE"),
    Text("Manual animation loops with imperative timeouts and callback spaghetti."),
  ],
  {
    opacity: 0,
    width: "42cqw",
  },
).decorate(rail({ color: "#f43f5e" }));

const reactiveCard = Card(
  [
    Kicker("STAGE ROUTINE"),
    Text("Deterministic snapshot graph with fluent, zero-boilerplate choreography."),
  ],
  {
    opacity: 0,
    width: "42cqw",
  },
).decorate(rail({ color: "#38bdf8" }));

const crossfadeCode = CodeBlock(
  [
    "// Synchronized in-place crossfade",
    "crossfade(legacyCard, reactiveCard)",
    "  .duration(0.6)",
    "  .scale(0.95);",
  ],
  {
    opacity: 0,
    width: "44cqw",
  },
).decorate(bracket({ side: "left", style: "curly", color: "rgba(56, 189, 248, 0.4)" }));

arrange.split([motionKicker, motionHeading, motionDescription, legacyCard], crossfadeCode, {
  leftX: 6,
  rightX: 52,
  y: 18,
  leftWidth: 42,
  rightWidth: 44,
  gap: 3.5,
});

// Match position and dimensions exactly for in-place crossfade
reactiveCard.x = legacyCard.x;
reactiveCard.y = legacyCard.y;
reactiveCard.width = legacyCard.width;

stage
  .scene("Motion & Crossfade")
  .with(
    brandTitle,
    motionKicker,
    motionHeading,
    motionDescription,
    legacyCard,
    reactiveCard,
    crossfadeCode,
  );

stage.setNotes([
  "Motion Orchestration & Crossfade Scene:",
  "- Step 1: Legacy pipeline card and code example enter.",
  "- Step 2: In-place crossfade swaps legacy card with StageRoutine reactive card with depth scaling.",
]);

// Dismiss geometry elements
geoKicker.opacity = 0;
geoHeading.opacity = 0;
geoDescription.opacity = 0;
morphBox.opacity = 0;
morphCircle.opacity = 0;
morphDiamond.opacity = 0;
morphPill.opacity = 0;
connBoxCircle.opacity = 0;
connDiamondPill.opacity = 0;

// Reveal crossfade elements
motionKicker.opacity = 1;
motionHeading.opacity = 1;
motionDescription.opacity = 1;
legacyCard.opacity = 1;
crossfadeCode.opacity = 1;
stage.pause();

// --- Step 2: In-Place Crossfade Animation ---
crossfade(legacyCard, reactiveCard).duration(0.6).scale(0.95);
stage.pause();

// --- Scene: Conclusion ---

stage.scene("Conclusion").with(brandTitle, editorialLead, heroBody);
stage.setNotes([
  "Concluding overview:",
  "- The title glides back to center stage.",
  "- Press Left Arrow anytime to smoothly rewind.",
]);

// Dismiss motion elements
motionKicker.opacity = 0;
motionHeading.opacity = 0;
motionDescription.opacity = 0;
legacyCard.opacity = 0;
reactiveCard.opacity = 0;
crossfadeCode.opacity = 0;

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
