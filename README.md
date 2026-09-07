# StageRoutine

[![CI](https://github.com/tsaarni/stageroutine/actions/workflows/ci.yml/badge.svg)](https://github.com/tsaarni/stageroutine/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-website-blue.svg)](https://tsaarni.github.io/stageroutine/)
[![Live Demo](https://img.shields.io/badge/demo-online-brightgreen.svg)](https://tsaarni.github.io/stageroutine/demo/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/tsaarni/stageroutine/blob/main/LICENSE)

**Code-driven presentations built for the stage.**

StageRoutine is a TypeScript library for creating presentations in code. Instead of flipping through separate slides, you define scenes on a stage: elements can enter, leave, or animate smoothly to new positions.

[Documentation](https://tsaarni.github.io/stageroutine/) &middot; [Live Demo](https://tsaarni.github.io/stageroutine/demo/)

## Example

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

## Quick Start

Create a new presentation using the starter template:

```bash
pnpm dlx giget gh:tsaarni/stageroutine/starter my-presentation
cd my-presentation
pnpm install
pnpm dev
```

Or run the repository demo locally:

```bash
git clone https://github.com/tsaarni/stageroutine.git
cd stageroutine
pnpm install
pnpm dev
```

The dev server provides two views:

- **Presentation**: `http://localhost:5173/`
- **Presenter console**: `http://localhost:5173/presenter.html`

See [demo/main.ts](demo/main.ts) for the demo source code.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
