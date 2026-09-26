<div align="center">
  <img src="site/static/img/stageroutine-lockup.svg" alt="StageRoutine" width="340" />
  <p><i>Code-driven presentations built for the stage.</i></p>

  [Live Demo](https://tsaarni.github.io/stageroutine/demo/) ·
  [Documentation](https://tsaarni.github.io/stageroutine/) ·
  [Quick Start](https://tsaarni.github.io/stageroutine/docs/getting-started/quickstart)
</div>

StageRoutine is a TypeScript library for creating presentations in code. Instead of flipping through separate slides, you define scenes on a stage: elements can enter, leave, or animate smoothly to new positions.

> [!WARNING]
> StageRoutine is under active development. The API is not stable and is subject to change.

## Example

```typescript
import { Card, Stage, Title, to } from "stageroutine";

const stage = new Stage();
const title = Title("Hello, World!", {
  variant: "hero",
  position: ["center", 44],
});
const card = Card("Press Space to begin", {
  position: ["center", 56],
  opacity: 0,
});

// Scene 1: Welcome
stage.scene("Welcome").with(title);
stage.pause();

// Scene 2: Title glides up, card appears
stage.scene("Overview").with(title, card);
title.y = to(12);
card.opacity = to(1).when(title, "halfway");
stage.pause();
```

## Demo

Run the [demo](https://tsaarni.github.io/stageroutine/demo/) in [demo/main.ts](demo/main.ts):

```bash
git clone https://github.com/tsaarni/stageroutine.git
cd stageroutine
pnpm install
pnpm dev
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
