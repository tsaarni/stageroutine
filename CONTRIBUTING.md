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

You can also press **`Shift + M`** on the presentation at any time to open or refresh a dedicated browser tab displaying the formatted metrics.

This returns engine stats with inline descriptions. Look for `stage_is_animating` and `stage_active_raf_count` to ensure loops stop at rest. Check `animation_hidden_running` to spot CSS and SVG animations running on hidden elements. Monitor `dom_dormant_elements`, `dom_detached_elements`, and `dom_promoted_count` to confirm inactive elements enter true dormancy and remain attached to the stage.

- **Promotion leaks**: `dom_promoted_count` counts elements holding CSS `will-change`. It must be `0` when the stage is at rest. When non-zero, inspect `dom_promoted` to identify which elements leaked animation promotion.

### Identifying CPU and GPU consumers

- **GPU load**: Check `gpu_canvas_pixels` and `background_canvas_pixels` for large canvas surfaces.
- **CPU load**: Check `background_running` and `stage_active_raf_count` to find continuous render loops. Check `animation_running_count` and `animation_hidden_running` for continuous animations. Use `performance_start_trace` to profile main thread execution.
- **Memory footprint**: Check `memory_heap_used_bytes` for JS heap allocation.

## Modifying the documentation site

To run the documentation site locally:

```bash
pnpm docs:serve
```
