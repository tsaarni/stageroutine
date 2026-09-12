# StageRoutine

[![CI](https://github.com/tsaarni/stageroutine/actions/workflows/ci.yml/badge.svg)](https://github.com/tsaarni/stageroutine/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-website-blue.svg)](https://tsaarni.github.io/stageroutine/)
[![Live Demo](https://img.shields.io/badge/demo-online-brightgreen.svg)](https://tsaarni.github.io/stageroutine/demo/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/tsaarni/stageroutine/blob/main/LICENSE)

**Code-driven presentations built for the stage.**

StageRoutine is a TypeScript library for creating presentations in code. Instead of flipping through separate slides, you define scenes on a stage: elements can enter, leave, or animate smoothly to new positions.

**[Live Demo](https://tsaarni.github.io/stageroutine/demo/)** &middot; **[Documentation](https://tsaarni.github.io/stageroutine/)** &middot; **[Quick Start](https://tsaarni.github.io/stageroutine/docs/getting-started/quickstart)**

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
