/**
 * Demo presentation script showing how to build animated slides with StageRoutine.
 */

import {
  AsciiFluid,
  Badge,
  BulletList,
  Card,
  CodeBlock,
  Kicker,
  Stage,
  TerminalWindow,
  Text,
  Title,
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
  hero: true,
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
  serif: true,
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

// Cascade individual bullet items sequentially.
featureChecklist.opacity = to(1).when(rightBody, "halfway");
featureChecklist.items.forEach((item, index) => {
  const prev = index > 0 ? featureChecklist.items[index - 1] : undefined;
  const trigger = prev ?? rightBody;
  item.opacity = to(1).when(trigger, "halfway");
  item.x = to(0).when(trigger, "halfway");
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

const showcaseCard = Card(
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
    "const card = Card('Frosted surface');",
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
  "- Displays Title, Text, Kicker, Badges, Card, BulletList, CodeBlock, and TerminalWindow together.",
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

const decoratorTypewriterDemo = Text(
  "Decorators can simulatte<del:2>e realistic typing, including typos, backspaces, and corrections...",
  {
    x: decoratorKicker.x,
    y: 48,
    opacity: 0,
    style: { width: "42cqw" },
  },
).decorate(typewriter({ delay: 0.6 }));

const decoratorCode = CodeBlock(
  [
    "// Isolated flowing gradient",
    "title.decorate(gradient({",
    "  colors: ['#ec4899', '#facc15'],",
    "  duration: 5,",
    "}));",
    "",
    "// Realistic typing with typos and backspaces",
    "text.decorate(typewriter({ delay: 0.6 }));",
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

// --- Scene: Conclusion ---

stage.scene("Conclusion").with(brandTitle, editorialLead, heroBody);
stage.setNotes([
  "Concluding overview:",
  "- The title glides back to center stage.",
  "- Press Left Arrow anytime to smoothly rewind.",
]);

// Dismiss decorator elements
decoratorKicker.opacity = 0;
decoratorHeading.opacity = 0;
decoratorGradientDemo.opacity = 0;
decoratorTypewriterDemo.opacity = 0;
decoratorCode.opacity = 0;

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
