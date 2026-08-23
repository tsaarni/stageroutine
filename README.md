# StageRoutine

StageRoutine is a presentation framework for building animated slides in TypeScript and TSX, where elements animate smoothly on screen as you advance.

**Core Concepts**

- **Stage**: The presentation engine and canvas. It manages the virtual viewport and runs all animations during playback.
- **Components**: Reusable functions or TSX templates (like `Title`, `Card`, or `CodeBlock`) that define markup, styles, and default properties.
- **Elements**: Instantiated components. Each element wraps a native DOM node (`HTMLElement`) with reactive properties like `x`, `y`, `scale`, and `opacity`. Assigning to these properties (e.g. `title.x = 50`) tells the stage to animate the underlying DOM node.
- **Scenes**: Declarations of which elements are visible on the stage. Elements kept across consecutive scenes stay on screen and smoothly transition to their new positions.
- **Pauses**: Stopping points created with `stage.pause()`. When presenting, playback stops at each pause to wait for user input, animating all property changes made up to that point.
- **Script**: The top-to-bottom TypeScript file where you orchestrate your stage, elements, scenes, and pauses into a complete presentation.

## Quick Start

```bash
pnpm install
pnpm dev
```

- Main presentation: `http://localhost:5173/`
- Presenter console: `http://localhost:5173/presenter`

See [demo/main.ts](demo/main.ts) for an example presentation.


## Presenter Console

The presenter console (`/presenter`) opens in a separate window or screen and synchronizes with the main presentation over `BroadcastChannel` without needing a server.

Features:
- **Speaker Notes**: Live notes for the current scene with markdown bullet formatting and font size adjustment.
- **Upcoming Scene**: Displays the title and notes for the next scene.
- **Scene Navigation**: Dropdown menu to jump directly to any scene and next/previous buttons to advance the presentation.
- **Timers**: Presentation elapsed timer with pause/reset controls and a local wall clock.
- **Screen Recording**: In-browser video recording, saved directly as WebM.
