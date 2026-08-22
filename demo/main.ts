/**
 * Demo presentation script showing how to build animated slides with StageRoutine.
 */

import {
  BulletList,
  CodeBlock,
  Kicker,
  TerminalWindow,
  Text,
  Title,
  createStage,
  to,
} from "../src/index";

// Initialize the presentation stage (defaults to 1920x1080 virtual canvas).
const stage = createStage({
  defaultDuration: 0.8,
});

// Positioning components:
// - x, y: The spot on the stage (percentage from top-left, or "center").
// - anchor: Which part of the component sits on that spot (e.g. "top-left" corner or "center").

// --- Step 1: Introduction (Center Stage Hero) ---

// Create visual elements. Setting opacity to 0 keeps them hidden until animated.
const brandTitle = Title("StageRoutine", {
  hero: true,
  x: "center",
  y: 38,
  scale: 1,
  opacity: 0,
});

const sectionKicker = Kicker("00 / Core Runtime", {
  x: "center",
  y: 28,
  opacity: 0,
});

const editorialLead = Title("State mutation is motion.", {
  serif: true,
  className: "sr-neon-sweep",
  x: "center",
  y: 52,
  opacity: 0,
});

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

// Speaker notes displayed in the presenter console for this step.
stage.setNotes(
  "Welcome to StageRoutine.\n- State mutation drives animation.\n- Pauses define presenter steps.",
);

// Animate elements into view using property assignments with custom duration and easing.
sectionKicker.opacity = to(1).duration(0.5).ease("quartOut");
brandTitle.opacity = to(1).duration(0.6).ease("quartOut");
editorialLead.opacity = to(1).duration(0.7).ease("quartOut");
heroBody.opacity = to(1).duration(0.8).ease("quartOut");

// Pause marks a presenter step boundary. All animations above run together as one step.
stage.pause();

// --- Step 2: Continuous Plane (Pan to Header & Reveal Code Panel) ---

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
    x: 6,
    y: 38,
    opacity: 0,
    style: { width: "42cqw" },
  },
);

const codePanel = CodeBlock(
  `// Mutating a reactive property schedules transition\nnode.x = to(52).duration(0.8).ease("quartOut");\nnode.opacity = to(1).duration(0.6);\n\n// Pause defines presenter step boundary\nstage.pause();`,
  {
    x: 110,
    y: 28,
    opacity: 0,
    style: { width: "44cqw" },
  },
);

// brandTitle remains in this scene, so it smoothly glides to its new position instead of recreating.
stage.scene("Continuous Plane").with(brandTitle, leftHeading, leftBody, codePanel);
stage.setNotes(
  "Notice the continuous camera pan:\n- The brand title glides smoothly into the top-left corner.\n- The code block slides in from the right edge.",
);

// Reposition brandTitle to the top-left corner.
brandTitle.x = to(6).duration(0.85).ease("cubicInOut");
brandTitle.y = to(6).duration(0.85).ease("cubicInOut");
brandTitle.scale = to(0.6).duration(0.85).ease("cubicInOut");

// Fade out intro elements that are leaving this scene.
sectionKicker.opacity = to(0).duration(0.3);
editorialLead.y = to(62).duration(0.4);
editorialLead.opacity = to(0).duration(0.3);
heroBody.opacity = to(0).duration(0.3);

// Milestone triggers (.when): chain animations to start after another element completes ("end") or reaches "halfway".
leftHeading.x = to(6).when(brandTitle, "end").duration(0.6).ease("quartOut");
leftHeading.opacity = to(1).when(brandTitle, "end").duration(0.6).ease("quartOut");
leftBody.x = to(6).when(leftHeading, "halfway").duration(0.6).ease("quartOut");
leftBody.opacity = to(1).when(leftHeading, "halfway").duration(0.6).ease("quartOut");

// Slide code panel into the right column.
codePanel.x = to(52).duration(0.85).ease("quartOut");
codePanel.opacity = to(1).duration(0.8);
stage.pause();

// --- Step 3: Snapshot Engine (Code Glides Left, Mechanics Reveal on Right) ---

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
    x: 52,
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
    x: 52,
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
stage.setNotes(
  "Watch the horizontal spatial balance:\n- Code panel glides across to the left column.\n- Mechanics & staggered checklist glide in on the right.",
);

// Slide left column off-screen.
leftHeading.opacity = to(0).duration(0.3);
leftHeading.x = to(-50).duration(0.5);
leftBody.opacity = to(0).duration(0.3);
leftBody.x = to(-50).duration(0.5);

// Move code panel from the right column over to the left column.
codePanel.x = to(6).duration(0.9).ease("cubicInOut");

// Reveal right column after the code panel passes halfway.
rightHeading.x = to(52).when(codePanel, "halfway").duration(0.6).ease("quartOut");
rightHeading.opacity = to(1).when(codePanel, "halfway").duration(0.6).ease("quartOut");
rightBody.x = to(52).when(rightHeading, "halfway").duration(0.6).ease("quartOut");
rightBody.opacity = to(1).when(rightHeading, "halfway").duration(0.6).ease("quartOut");

// Cascade individual bullet items sequentially.
featureChecklist.opacity = to(1).when(rightBody, "halfway").duration(0.3);
featureChecklist.items.forEach((item, index) => {
  const prev = index > 0 ? featureChecklist.items[index - 1] : undefined;
  const trigger = prev ?? rightBody;
  item.opacity = to(1).when(trigger, "halfway").duration(0.45).ease("quartOut");
  item.x = to(0).when(trigger, "halfway").duration(0.45).ease("quartOut");
});
stage.pause();

// --- Step 4: Presenter Telemetry (Code Exits Up, Terminal Enters from Below) ---

// TerminalWindow renders a styled macOS terminal component.
const terminalPanel = TerminalWindow({
  title: "stageroutine-dev",
  lines: [
    "$ pnpm dev",
    "✔ Stage live on http://localhost:5173",
    "✔ Presenter console synced on /presenter.html",
    "⚡ BroadcastChannel channel: stageroutine-channel",
  ],
  x: 6,
  y: 120,
  opacity: 0,
  style: { width: "44cqw" },
});

stage
  .scene("Presenter Telemetry")
  .with(brandTitle, terminalPanel, rightHeading, rightBody, featureChecklist);
stage.setNotes(
  "Vertical camera glide:\n- Code block lifts off the screen.\n- Live dev terminal rises from below.",
);

// Slide code block upward off-screen and lift terminal up from below.
codePanel.y = to(-50).duration(0.7).ease("cubicInOut");
codePanel.opacity = to(0).duration(0.4);

terminalPanel.y = to(19).when(codePanel, "halfway").duration(0.75).ease("quartOut");
terminalPanel.opacity = to(1).when(codePanel, "halfway").duration(0.75).ease("quartOut");

// Keep right column in place.
rightHeading.opacity = to(1).duration(0.5);
rightBody.opacity = to(1).duration(0.5);
featureChecklist.opacity = to(1).duration(0.5);
stage.pause();

// --- Step 5: Conclusion (Camera Dollies Back to Center Stage) ---

stage.scene("Conclusion").with(brandTitle, editorialLead, heroBody);
stage.setNotes(
  "Concluding overview:\n- The title glides back to center stage.\n- Press Left Arrow anytime to smoothly rewind.",
);

// Dismiss terminal and right column.
terminalPanel.y = to(120).duration(0.5).ease("cubicInOut");
terminalPanel.opacity = to(0).duration(0.3);
rightHeading.opacity = to(0).duration(0.3);
rightBody.opacity = to(0).duration(0.3);
featureChecklist.x = to(110).duration(0.5).ease("cubicInOut");
featureChecklist.opacity = to(0).duration(0.3);

// Return title, lead, and body to hero center positions.
brandTitle.x = to("center").duration(0.9).ease("cubicInOut");
brandTitle.y = to(38).duration(0.9).ease("cubicInOut");
brandTitle.scale = to(1).duration(0.9).ease("cubicInOut");
brandTitle.opacity = to(1).duration(0.7);

editorialLead.x = to("center").when(brandTitle, "halfway").duration(0.7).ease("quartOut");
editorialLead.y = to(52).when(brandTitle, "halfway").duration(0.7).ease("quartOut");
editorialLead.opacity = to(1).when(brandTitle, "halfway").duration(0.7).ease("quartOut");

heroBody.x = to("center").when(editorialLead, "halfway").duration(0.7).ease("quartOut");
heroBody.y = to(64).when(editorialLead, "halfway").duration(0.7).ease("quartOut");
heroBody.opacity = to(1).when(editorialLead, "halfway").duration(0.7).ease("quartOut");
stage.pause();

// Mount the stage into the DOM and begin keyboard/hash navigation listeners.
stage.mount();
