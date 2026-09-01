# Contributing

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Build production bundles for stage and presenter console |
| `pnpm preview` | Preview production build |
| `pnpm typecheck` | Run TypeScript check (`tsc --noEmit`) |
| `pnpm check` | Run Biome linter and formatter check |
| `pnpm format` | Format files with Biome |
| `pnpm chrome-dev` | Launch Chrome with remote debugging on port 9222 |

## Troubleshooting with Chrome DevTools MCP

Inspect runtime performance and background tasks programmatically by querying the global diagnostics hook with the Chrome DevTools MCP `evaluate_script` tool:

```js
window.__STAGEROUTINE_DEV__.getMetrics()
```

This returns a flat key-value dictionary of engine stats. Look for `stage.is_animating` and `stage.active_raf_count` to ensure loops stop at rest. Check `browser.animations.hidden_running` to spot CSS and SVG animations running on hidden elements. Monitor component-specific metrics and active timer keys to confirm background tasks pause when inactive.

## Modifying the documentation site

To run the documentation site locally:

```bash
pnpm docs:serve
```
