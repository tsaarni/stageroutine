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

## Using without the Vite plugin

The `stageroutine/vite` plugin is the recommended way to build a presentation:
it wires up JSX, the global stylesheet, the presenter console, and the
`--single-file` output for you.

The plugin (and the library) are published as raw TypeScript. Some runtimes
refuse to load raw `.ts` from `node_modules` at config-evaluation time — for
example Node.js ≥ 22 fails to import `stageroutine/vite` inside
`vite.config.ts` with:

```
ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING
```

If you hit this, you can configure Vite manually instead of using the plugin.
Two things the plugin normally does for you must then be done by hand:

1. **Configure the JSX runtime** so components compile:

   ```ts
   // vite.config.ts
   import { defineConfig } from "vite";

   export default defineConfig({
     esbuild: { jsx: "automatic", jsxImportSource: "stageroutine" },
     optimizeDeps: { exclude: ["stageroutine"] },
   });
   ```

2. **Import the global stylesheet explicitly** in your entry file:

   ```ts
   // main.ts
   import "stageroutine/styles.css";
   import { Stage, Title /* ... */ } from "stageroutine";
   ```

   The library's entry imports this stylesheet as a side effect, but that
   side-effect CSS can be dropped from the app bundle in a plugin-less setup.
   The stylesheet carries both the `@fontsource` `@font-face` rules and the
   `--sr-font-*` design tokens (sizes and families), so without it the deck
   silently falls back to system fonts at default sizes — the hero title that
   should be `6.5rem` Inter renders as small system text, and
   `document.fonts` is empty.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).
