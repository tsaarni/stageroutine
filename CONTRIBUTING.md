# Contributing

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Build production bundles for stage and presenter console |
| `pnpm verify` | Format code, fix safe issues, and run TypeScript check |
| `pnpm chrome-dev` | Launch Chrome with remote debugging on port 9222 (macOS & Linux) |
| `pnpm docs:serve` | Start local documentation server |
| `pnpm docs:build` | Build production documentation site |

## Troubleshooting with Chrome DevTools MCP

Inspect runtime performance and background tasks programmatically by querying the global diagnostics hook with the Chrome DevTools MCP `evaluate_script` tool:

```js
window.__STAGEROUTINE_DEV__.getMetrics()
```

This returns a flat key-value dictionary of engine stats. Look for `stage.is_animating` and `stage.active_raf_count` to ensure loops stop at rest. Check `browser.animations.hidden_running` to spot CSS and SVG animations running on hidden elements. Monitor component-specific metrics and active timer keys to confirm background tasks pause when inactive.

### Identifying CPU and GPU consumers

- **GPU load**: Check `browser.canvas.total_megapixels` and `background.<kind>.total_pixels` for large canvas surfaces. Check `browser.animations.running` for continuous SVG or CSS animations.
- **CPU load**: Check `background.<kind>.is_running` and `stage.active_raf_count` to find continuous render loops. Use `performance_start_trace` to profile main thread execution.

## Modifying the documentation site

To run the documentation site locally:

```bash
pnpm docs:serve
```
