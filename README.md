# StageRoutine

[![CI](https://github.com/tsaarni/stageroutine/actions/workflows/ci.yml/badge.svg)](https://github.com/tsaarni/stageroutine/actions/workflows/ci.yml)
[![Documentation](https://img.shields.io/badge/docs-website-blue.svg)](https://tsaarni.github.io/stageroutine/)
[![Live Demo](https://img.shields.io/badge/demo-online-brightgreen.svg)](https://tsaarni.github.io/stageroutine/demo/)
[![License: Apache-2.0](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](https://github.com/tsaarni/stageroutine/blob/main/LICENSE)

StageRoutine is a presentation framework in TypeScript and TSX for building continuous presentations, where elements animate smoothly on screen as you advance without discrete slide boundaries.

[Documentation](https://tsaarni.github.io/stageroutine/) &middot; [Live Demo](https://tsaarni.github.io/stageroutine/demo/)

## Example

```typescript
import { Stage, Title, Kicker, to, vignette } from "stageroutine";
import { AsciiFluid } from "stageroutine/backgrounds";

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
git clone https://github.com/tsaarni/stageroutine.git
cd stageroutine
pnpm install
pnpm dev
```

- **Main presentation**: `http://localhost:5173/`
- **Presenter console**: `http://localhost:5173/presenter.html`

See [demo/main.ts](demo/main.ts) for a full presentation example.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
