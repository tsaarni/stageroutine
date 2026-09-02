---
sidebar_position: 1
---

# Quick Start

## Installation

Clone the repository and install dependencies:

```bash
pnpm install
pnpm dev
```

The presentation dev server starts at `http://localhost:5173/`.

## Writing Your Presentation

Create a TypeScript presentation script:

```typescript
import { Stage, Title, Kicker, to, AsciiFluid, vignette, NavigationOverlay, LaserPointer } from "stageroutine";

// 1. Create the Stage
const stage = new Stage().background(AsciiFluid().decorate(vignette()));

// 2. Define Components
const kicker = Kicker("01 / ARCHITECTURE", { x: "center", y: 35, opacity: 0 });
const title = Title("StageRoutine", { x: "center", y: 45, opacity: 0 });

// 3. Create Scene & Step 1
stage.scene("Intro").with(kicker, title);
kicker.opacity = to(1);
title.opacity = to(1).when(kicker, "halfway");
stage.pause();

// 4. Attach Overlays & Mount
stage.overlay(NavigationOverlay());
stage.overlay(LaserPointer());
stage.mount("#stage");
```

## Navigation Controls

### Keyboard Shortcuts

| Key | Action |
|---|---|
| `→` / `Space` / `PageDown` | Next step |
| `←` / `PageUp` | Previous step |
| `Shift+→` / `Shift+PageDown` | Next scene |
| `Shift+←` / `Shift+PageUp` | Previous scene |
| `Home` / `End` | First / Last step |
| `L` | Toggle laser pointer |

### URL Hash Navigation
Jump directly to any point in the presentation:
- `#/16` — Jump to step 16
- `#architecture` — Jump to first step of scene "Architecture"
- `#architecture/2` — Jump to step 2 of scene "Architecture"

## Presenter Console

Open `http://localhost:5173/presenter.html` on a second monitor:
- Displays upcoming step preview and live speaker notes.
- Synchronizes with main presentation via `BroadcastChannel`.
- Includes presentation timer, wall clock, and WebM video recorder.
