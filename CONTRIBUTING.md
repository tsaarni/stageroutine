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

This returns a flat key-value dictionary of engine stats. Look for `stage.is_animating` and `stage.active_raf_count` to ensure loops stop at rest. Check `animation.hidden_running` to spot CSS and SVG animations running on hidden elements. Monitor `dom.dormant_elements`, `dom.detached_elements`, and `dom.promoted_elements` to confirm inactive elements enter true dormancy and remain attached to the stage.

- **Promotion leaks**: `dom.promoted_elements` counts every element in the stage holding CSS `will-change`, including pulse packets and ken-burns targets. It should read `0` once all animations settle; a non-zero value while idle means a promoted layer was never released. When non-zero, inspect `dom.promoted.<index>` (`tag`, `class`, `will_change`) to identify the leaked element.

### Identifying CPU and GPU consumers

- **GPU load**: Check `gpu.canvas_pixels`. Check `background.<kind>.total_pixels` for large canvas surfaces.
- **CPU load**: Check `background.<kind>.is_running` and `stage.active_raf_count` to find continuous render loops. Check `animation.running.count` and `animation.hidden_running` for continuous animations. Use `performance_start_trace` to profile main thread execution.
- **Memory footprint**: Check `memory.heap_used_bytes` for JS heap allocation.

## Modifying the documentation site

To run the documentation site locally:

```bash
pnpm docs:serve
```
