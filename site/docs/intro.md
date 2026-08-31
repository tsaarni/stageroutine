---
sidebar_position: 1
---

# Introduction

Welcome to **StageRoutine** — a stage-based presentation and technical motion graphics framework.

## What is StageRoutine?

StageRoutine lets you create declarative, step-driven presentations and technical graphics with ease. It is designed for:

- **Presentations** — build slides with smooth transitions
- **Data visualization** — animate charts and graphs step by step
- **Interactive demos** — control playback with keyboard or click events

## Quick Example

```typescript
import { Stage, Title, Kicker, to, AsciiFluid, vignette } from 'stageroutine';

// 1. Initialize stage
const stage = new Stage().background(AsciiFluid().decorate(vignette()));

// 2. Create elements
const kicker = Kicker("01 / ARCHITECTURE", { x: "center", y: 35, opacity: 0 });
const title = Title("StageRoutine", { variant: "hero", x: "center", y: 45, opacity: 0 });

// 3. Declare scene & animate
stage.scene("Intro").with(kicker, title);
kicker.opacity = to(1);
title.opacity = to(1).when(kicker, "halfway");

// 4. Pause for presenter step
stage.pause();
```

## Next Steps

- [Getting Started](./guides/getting-started) — install and run your first presentation
- [Core Concepts](./guides/core-concepts) — continuous canvas, coordinate system, reactive elements, and motion
- [Configuration](./guides/configuration) — customize behavior
- [API Reference](./api/) — full API documentation
