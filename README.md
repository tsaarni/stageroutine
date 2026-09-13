<div align="center">
  <img src="site/static/img/stageroutine-lockup.svg" alt="StageRoutine" width="340" />
  <p><strong>Code-driven presentations built for the stage.</strong></p>

  <p>
    <a href="https://github.com/tsaarni/stageroutine/actions/workflows/ci.yml"><img src="https://github.com/tsaarni/stageroutine/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
    <a href="https://tsaarni.github.io/stageroutine/"><img src="https://img.shields.io/badge/docs-website-blue.svg" alt="Documentation" /></a>
    <a href="https://tsaarni.github.io/stageroutine/demo/"><img src="https://img.shields.io/badge/demo-online-brightgreen.svg" alt="Live Demo" /></a>
    <a href="https://github.com/tsaarni/stageroutine/blob/main/LICENSE"><img src="https://img.shields.io/badge/License-Apache_2.0-blue.svg" alt="License: Apache-2.0" /></a>
  </p>

  <p>
    <a href="https://tsaarni.github.io/stageroutine/demo/"><strong>Live Demo</strong></a> &middot;
    <a href="https://tsaarni.github.io/stageroutine/"><strong>Documentation</strong></a> &middot;
    <a href="https://tsaarni.github.io/stageroutine/docs/getting-started/quickstart"><strong>Quick Start</strong></a>
  </p>
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
  x: "center",
  y: 44,
});
const card = Card("Press Space to begin", {
  x: "center",
  y: 56,
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
