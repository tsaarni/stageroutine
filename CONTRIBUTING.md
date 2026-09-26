# Contributing

## Commands

| Command | Description |
|---|---|
| `pnpm dev` | Start Vite dev server |
| `pnpm build` | Build production bundles |
| `pnpm verify` | Format, fix, and type-check |
| `pnpm chrome-dev` | Launch Chrome with remote debugging (port 9222) |
| `pnpm docs:serve` | Start local documentation server |
| `pnpm docs:build` | Build production documentation site |

## DevTools diagnostics

The presentation exposes a diagnostics hook. Query it with the Chrome DevTools MCP `evaluate_script` tool, or press `Shift + M` for formatted metrics.

```js
window.__STAGEROUTINE_DEV__.getMetrics()                           // gauges/counters
window.__STAGEROUTINE_DEV__.showMetrics()                          // open metrics in a tab
window.__STAGEROUTINE_DEV__.perf.sample(ms?)                       // frame cadence right now
window.__STAGEROUTINE_DEV__.perf.run({ first, last, ms?, minHz? }) // walk steps; rest + entering Hz
window.__STAGEROUTINE_DEV__.outline()                              // scenes -> steps map
```

- `getMetrics()`: read at rest (`stage_is_animating` = `0`). Then these must be `0` — `stage_active_raf_count`, `dom_detached_elements`, `dom_promoted`, `animation_running`, `animation_hidden_running`; `media_visible_videos` must be `< 2`; `background_running` may be `1`. Resource load: `gpu_canvas_pixels`, `background_canvas_pixels`, `memory_heap_used_bytes`.
- `perf`: `sample` measures current cadence (`hz`, `p50Ms`, `p95Ms`, `maxMs`, `dropped`). `run` navigates steps and reports `restHz` / `enterHz` plus `bestHz` (display-refresh proxy). `minHz` flags steps below a floor.
- `outline()`: returns `[{ name, steps: [{ step, notes?, elements }] }]`.

## Gotchas

- `stage_fps` and the two frame-duration gauges update only during transitions; they read stale at rest. Cross-check `stage_is_animating`.
- Two visible `<video>` elements lock Chrome to 30fps (issue 543049039). Hide one and re-measure.
- Compare against display refresh (`bestHz`), not 60fps.
- Pin viewport/DPR (`emulate`) before comparing runs.
- Transitions emit a `sr/<scene>/<step>` measure (cleared right after); run `performance_start_trace` during one to see step boundaries.

