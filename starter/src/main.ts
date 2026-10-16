import {
  Card,
  CSSBackground,
  LaserPointer,
  layout,
  NavigationOverlay,
  Stage,
  stagger,
  Text,
  Title,
  to,
} from "stageroutine";

// Create the stage before creating elements.
const stage = new Stage().background(
  CSSBackground(
    "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(56, 189, 248, 0.35) 0%, rgba(9, 9, 11, 0) 70%), #09090b",
  ),
);

// The default 16:9 stage is 160 × 90 stage units.
const title = Title("Hello, World!", {
  variant: "hero",
  origin: "top-left",
  width: 120,
  opacity: 0,
});
const subtitle = Text("My first StageRoutine presentation", {
  width: 120,
  opacity: 0,
});
layout.vstack([title, subtitle], { x: "center", y: "center", gap: 3 });

stage.scene("Welcome").with(title, subtitle);
title.opacity = to(1);
subtitle.opacity = to(1).when(title, "halfway");

// Record this step; playback stops here for presenter input.
stage.pause();

const cards = [
  Card([Title("01", { color: "#38bdf8" }), Text("Edit src/main.ts")], { opacity: 0 }),
  Card([Title("02", { color: "#a855f7" }), Text("Add your scenes")], { opacity: 0 }),
  Card([Title("03", { color: "#34d399" }), Text("Press Space to present")], { opacity: 0 }),
];
layout.hstack(cards, { x: "center", y: 45, gap: 5, width: 38, align: "center" });

// Reuse the title. The omitted subtitle exits automatically.
stage.scene("Next Steps").with(title, ...cards);
title.to({ position: [10, 6], scale: 0.6 });
stagger(cards).after(title);
stage.pause();

// Mount after recording all scenes. Press P to toggle the laser pointer.
stage.overlay(NavigationOverlay()).overlay(LaserPointer()).mount("#stage");
