---
sidebar_position: 1
---

# Getting Started

## Installation

```bash
pnpm install
pnpm dev
```

## Writing a Presentation

Create elements, place them into scenes, and sequence steps:

```typescript
import { Stage, Title, Kicker, to, AsciiFluid, vignette } from "stageroutine";

const stage = new Stage().background(AsciiFluid().decorate(vignette()));

const kicker = Kicker("01 / ARCHITECTURE", { x: "center", y: 35, opacity: 0 });
const title = Title("StageRoutine", { x: "center", y: 45, opacity: 0 });

stage.scene("Intro").with(kicker, title);
kicker.opacity = to(1);
title.opacity = to(1).when(kicker, "halfway");
stage.pause();

stage.overlay(NavigationOverlay());
stage.overlay(LaserPointer());
stage.mount();
```

See [demo/main.ts](https://github.com/tsaarni/stageroutine/blob/main/demo/main.ts) for a full example and [Core Concepts](./core-concepts) for detailed explanations.

## Presenting

Open the main presentation at `http://localhost:5173/`.

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `→` / `Space` / `PageDown` | Next step |
| `←` / `PageUp` | Previous step |
| `Shift+→` / `Shift+PageDown` | Next scene |
| `Shift+←` / `Shift+PageUp` | Previous scene |
| `Home` | First step |
| `End` | Last step |
| `L` | Toggle pointer |

### URL Navigation

You can jump to any point in the presentation by URL hash:

- `#scene-name/16` — go to step 16
- `#scene-name` — go to first step of that scene
- `#/16` — go to step 16

The URL automatically updates to the fully qualified format as you navigate.

### Presenter Console

Open `http://localhost:5173/presenter.html` in a separate window. It synchronizes with the main presentation in real time and provides:

- Speaker notes for the current step
- Preview of the upcoming step
- Scene navigation dropdown
- Presentation timer and wall clock
- In-browser screen recording to WebM

## Next Steps

- [Core Concepts](./core-concepts) — how stages, scenes, elements, and events work
- [API Reference](../api/) — detailed API docs
