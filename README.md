# StageRoutine

StageRoutine is a presentation framework in TypeScript and TSX for building continuous presentations, where elements animate smoothly on screen as you advance without discrete slide boundaries.

**Core Concepts**

- **Stage**: The presentation engine and canvas. It manages the viewport, runs animations, and captures state snapshots.
- **Components**: Functions or templates (like `Title`, `Card`, or `CodeBlock`) that define markup, styles, and default properties.
- **Elements**: Component instances. Each element wraps a DOM node with reactive properties (`x`, `y`, `scale`, `opacity`). Changing a property (e.g. `title.x = 50`) animates the element.
- **Scenes**: Sections of the presentation (analogous to slides). Declared with `stage.scene("Name").with(...)` to set which elements are visible. Elements included in consecutive scenes stay on screen and animate to their new positions instead of disappearing.
- **Steps & Pauses**: Click boundaries (analogous to slide builds). Calling `stage.pause()` groups property changes into a step and saves a state snapshot, defining where playback pauses for presenter clicks.
- **Decorators**: Helper functions (`gradient`, `glow`, `typewriter`) attached via `.decorate()` to add visual styles or effects to elements.
- **Script**: The TypeScript file where you create elements, place them into scenes, and sequence steps from top to bottom.

## Quick Start

```bash
pnpm install
pnpm dev
```

- Main presentation: `http://localhost:5173/`
- Presenter console: `http://localhost:5173/presenter`

See [demo/main.ts](demo/main.ts) for an example presentation.

## Presenter Console

The presenter console (`/presenter`) is a separate page which synchronizes with the main presentation window over `BroadcastChannel`.

Features:
- **Speaker Notes**: Live notes for the presenter.
- **Upcoming Preview**: Displays the title and notes for the next upcoming step/scene.
- **Scene Navigation**: Dropdown menu to jump directly to any scene, with next/previous controls to step through animations.
- **Timers**: Presentation elapsed timer with pause/reset controls and a local wall clock.
- **Screen Recording**: In-browser video recording, saved directly as WebM.
