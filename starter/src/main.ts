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

const stage = new Stage().background(
  CSSBackground({
    background:
      "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(56, 189, 248, 0.15) 0%, rgba(9, 9, 11, 0) 70%), #09090b",
  }),
);

// 1. Scene: Welcome
const title = Title("Hello, World!", { variant: "hero", x: "center", y: 44, opacity: 0 });
const subtitle = Title("My first StageRoutine presentation", {
  variant: "serif",
  x: "center",
  y: 56,
  opacity: 0,
});

stage.scene("Welcome").with(title, subtitle);
title.opacity = to(1);
subtitle.opacity = to(1).when(title, "halfway");
stage.pause();

// 2. Scene: Next Steps
const step1 = Card([Title("01", { color: "#38bdf8" }), Text("Edit src/main.ts")]);
const step2 = Card([Title("02", { color: "#a855f7" }), Text("Add your scenes")]);
const step3 = Card([Title("03", { color: "#34d399" }), Text("Press Space to present")]);

layout.hstack([step1, step2, step3], {
  x: "center",
  y: 50,
  gap: 3,
  width: [24, 24, 24],
  align: "center",
});

step1.opacity = 0;
step2.opacity = 0;
step3.opacity = 0;

stage.scene("Next Steps").with(title, step1, step2, step3);
subtitle.opacity = to(0);
title.x = to(6);
title.y = to(6);
title.scale = to(0.6);

step1.opacity = to(1).when(title, "halfway");
step2.opacity = to(1).when(step1, 0.15);
step3.opacity = to(1).when(step2, 0.15);
stage.pause();

// 3. Mount
stage.overlay(NavigationOverlay());
stage.overlay(LaserPointer());
stage.mount("#stage");
