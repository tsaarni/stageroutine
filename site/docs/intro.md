---
sidebar_position: 1
---

# Introduction

Welcome to **StageRoutine** — a stage-based presentation and technical motion graphics framework.

StageRoutine lets you build declarative, step-driven presentations and graphics where elements animate smoothly across continuous scenes instead of jumping through discrete slide pages.

## Why StageRoutine?

- **Continuous Canvas**: Elements persist and morph between scenes instead of abruptly disappearing.
- **Declarative Motion**: Animate spatial and visual properties with `to()` and synchronize transitions with `.when()` without manual millisecond math.
- **Presenter Ready**: Built-in presenter console with dual-screen sync, speaker notes, live timer, and screen recording.

## Quick Example

```typescript
import { Stage, Title, Kicker, to, AsciiFluid, vignette } from "stageroutine";

// 1. Initialize stage
const stage = new Stage().background(AsciiFluid().decorate(vignette()));

// 2. Create elements
const kicker = Kicker("01 / ARCHITECTURE", { x: "center", y: 35, opacity: 0 });
const title = Title("StageRoutine", { variant: "hero", x: "center", y: 45, opacity: 0 });

// 3. Declare scene & animate
stage.scene("Intro").with(kicker, title);
kicker.opacity = to(1);
title.opacity = to(1).when(kicker, "halfway");

// 4. Pause for presenter click
stage.pause();

// 5. Mount to DOM
stage.mount("#stage");
```

## How to Learn

1. **[Quick Start](./getting-started/quickstart)** — Install and run your first presentation.
2. **[Basic Concepts](./getting-started/concepts)** — Understand the 4 main parts: Stage, Scene, Step, and Element.
3. **[Building Presentations](./building/canvas-and-coordinates)** — Step-by-step guides for coordinates, scenes, motion, layouts, and visuals.
4. **[Under the Hood](./advanced/under-the-hood)** — How the internal engine, Proxies, snapshots, and animation loop work.
