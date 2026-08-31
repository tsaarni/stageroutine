# StageRoutine

[![CI](https://github.com/tsaarni/stageroutine/actions/workflows/ci.yml/badge.svg)](https://github.com/tsaarni/stageroutine/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-website-blue.svg)](https://tsaarni.github.io/stageroutine/)
[![Live Demo](https://img.shields.io/badge/demo-online-brightgreen.svg)](https://tsaarni.github.io/stageroutine/demo/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/tsaarni/stageroutine/blob/main/LICENSE)

StageRoutine is a presentation framework in TypeScript and TSX for building continuous presentations, where elements animate smoothly on screen as you advance without discrete slide boundaries.

**Core Concepts**

- **Stage**: The presentation engine and canvas. It manages the viewport, runs animations, and captures state snapshots.
- **Components**: Functions or templates (like `Title`, `Card`, or `CodeBlock`) that define markup, styles, and default properties.
- **Elements**: Component instances. Each element wraps a DOM node with reactive properties (`x`, `y`, `scale`, `opacity`). Changing a property (e.g. `title.x = to(50)` or `title.x = 50`) animates the element.
- **Scenes**: Sections of the presentation (analogous to slides). Declared with `stage.scene("Name").with(...)` to set which elements are visible. Elements included in consecutive scenes stay on screen and animate to their new positions instead of disappearing.
- **Steps & Pauses**: Click boundaries (analogous to slide builds). Calling `stage.pause()` groups property changes into a step and saves a state snapshot, defining where playback pauses for presenter clicks.
- **Decorators**: Helper functions (`gradient`, `glow`, `rail`, `bracket`, `typewriter`) attached via `.decorate()` to add visual styles or effects to elements.
- **Script**: The TypeScript file where you create elements, place them into scenes, and sequence steps from top to bottom.

**Presenter Console**

The presenter console is a separate window that synchronizes in real time with the main presentation over `BroadcastChannel`:

- **Speaker Notes**: Live notes for the presenter.
- **Upcoming Preview**: Next step title, notes, and progress preview.
- **Scene Navigation**: Direct dropdown scene jump with forward/backward step controls.
- **Timers**: Presentation elapsed timer, pause/reset controls, and wall clock.
- **Screen Recording**: Direct in-browser video recording saved to WebM.

## Example

```typescript
import { Stage, Title, Kicker, to, AsciiFluid, vignette } from "stageroutine";

// 1. Initialize stage with dynamic background
const stage = new Stage().background(AsciiFluid().decorate(vignette()));

// 2. Create reactive elements
const kicker = Kicker("01 / ARCHITECTURE", { x: "center", y: 35, opacity: 0 });
const title = Title("StageRoutine", { variant: "hero", x: "center", y: 45, opacity: 0 });

// 3. Declare scene & animate
stage.scene("Intro").with(kicker, title);
kicker.opacity = to(1);
title.opacity = to(1).when(kicker, "halfway");

// 4. Pause for presenter click
stage.pause();
```

## Quick Start

```bash
pnpm install
pnpm dev
```

- **Main presentation**: `http://localhost:5173/`
- **Presenter console**: `http://localhost:5173/presenter`

See [demo/main.ts](https://github.com/tsaarni/stageroutine/blob/main/demo/main.ts) for a full presentation example.

## Contributing

See [CONTRIBUTING.md](https://github.com/tsaarni/stageroutine/blob/main/CONTRIBUTING.md).
