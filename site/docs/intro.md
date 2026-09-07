---
sidebar_position: 1
---

# Introduction

Welcome to **StageRoutine** — code-driven presentations built for the stage.

StageRoutine is a TypeScript library for creating presentations in code. Instead of flipping through separate slides, you define scenes on a stage: elements can enter, leave, or animate smoothly to new positions.

## Key Features

- **Scene Transitions**: Elements shared between scenes move smoothly to their new positions, while unused elements exit cleanly.
- **Step-Driven Playback**: Group animations into click steps. You can step forward or backward cleanly.
- **Automatic Layout**: Arrange elements into rows, columns, and grids without manual positioning.
- **Ready-to-Use Components**: Text, syntax-highlighted code, terminal windows, and architecture diagrams.
- **Extensible**: Build custom components, visual decorators, and icon sets.
- **Presenter Tools**: Dual-screen presenter view with speaker notes, live timer, and laser pointer.

## How It Works

Create elements once, assign them to scenes, and update properties between presenter pauses:

```typescript
import { Stage, Title, CodeBlock, to } from "stageroutine";

const stage = new Stage();
const title = Title("Architecture", { x: "center", y: "center" });
const code = CodeBlock(["const app = new Stage();"], { x: "center", y: 60, opacity: 0 });

// Scene 1: Title in the center
stage.scene("Intro").with(title);
stage.pause();

// Scene 2: Title moves up, code appears
stage.scene("Details").with(title, code);
title.y = to(15);
code.opacity = to(1);
stage.pause();

stage.mount("#stage");
```

## Documentation Guide

1. **[Quick Start](./getting-started/quickstart)** — Install and run your first presentation.
2. **[Concepts](./getting-started/concepts)** — Learn the 4 core parts: Stage, Scene, Step, and Element.
3. **[Building Presentations](./building/coordinates)** — Guides for coordinates, scenes, animation, layout, and visual effects.
4. **[Under the Hood](./advanced/under-the-hood)** — How the internal engine, snapshots, and animation loop work.
