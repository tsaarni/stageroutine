import {
  CSSBackground,
  Card,
  LaserPointer,
  NavigationOverlay,
  Stage,
  Text,
  Title,
  layout,
  to,
} from "stageroutine";

// Initialize stage with a background
const stage = new Stage().background(
  CSSBackground(
    "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(56, 189, 248, 0.35) 0%, rgba(9, 9, 11, 0) 70%), #09090b",
  ),
);

// 1. Scene: Welcome
// Coordinates use percentage of stage dimensions (0-100)
const title = Title("Hello, World!", { variant: "hero", x: "center", y: 44, opacity: 0 });
const subtitle = Title("My first StageRoutine presentation", {
  variant: "serif",
  x: "center",
  y: 56,
  opacity: 0,
});

// Declare the scene and attach its active elements
stage.scene("Welcome").with(title, subtitle);

// Animate properties with to() and chain timing with .when()
title.opacity = to(1);
subtitle.opacity = to(1).when(title, "halfway");

// Pause playback and wait for presenter input (Space / Arrow key)
stage.pause();

// 2. Scene: Next Steps
const step1 = Card([Title("01", { color: "#38bdf8" }), Text("Edit src/main.ts")], { opacity: 0 });
const step2 = Card([Title("02", { color: "#a855f7" }), Text("Add your scenes")], { opacity: 0 });
const step3 = Card([Title("03", { color: "#34d399" }), Text("Press Space to present")], {
  opacity: 0,
});

// Arrange cards in a horizontal row
layout.hstack([step1, step2, step3], { x: "center", y: 50, gap: 3, width: 24, align: "center" });

stage.scene("Next Steps").with(title, step1, step2, step3);

// Existing elements smoothly transition to their new state
subtitle.opacity = to(0);
title.x = to(6);
title.y = to(6);
title.scale = to(0.6);

// Stagger step animations
step1.opacity = to(1).when(title, "halfway");
step2.opacity = to(1).when(step1, 0.15);
step3.opacity = to(1).when(step2, 0.15);
stage.pause();

// 3. Mount
// Add navigation controls and laser pointer ('P' key),
// then render the presentation into the "#stage" element.
stage.overlay(NavigationOverlay()).overlay(LaserPointer()).mount("#stage");
