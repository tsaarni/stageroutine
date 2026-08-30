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

This returns a flat key-value dictionary of engine stats. Look for `stage.is_animating` and `stage.active_raf_count` to ensure loops stop at rest. Check `browser.animations.hidden_running` to spot CSS animations on hidden elements. Monitor component keys like `connector.<id>.raf_loop_active` and `pointer.raf_loop_active` to confirm background loops pause when inactive.
