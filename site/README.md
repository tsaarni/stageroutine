# StageRoutine Documentation Site

Website built with Docusaurus.

## Commands

```bash
# Start local development server
pnpm docs:serve

# Build production site
pnpm docs:build
```

## Build Process

The Docusaurus build runs three automated tasks during `loadContent`:

1. **API Documentation**: `docusaurus-plugin-typedoc` generates markdown files in `docs/api` from `src/index.ts`.
2. **Demo Presentation**: Builds root demo presentation with `stageroutine build --base /stageroutine/` and copies output to `static/demo`.
3. **Component Previews**:
   - Scans documentation files for code blocks marked with `preview="<name>.html"`.
   - Extracts code snippets to `.cache/previews/<name>.ts` and generates `<name>.html`.
   - Runs `vite build --config previews.config.ts` to bundle snippets into `static/previews/`.
   - Embedded in pages using `<DemoFrame src="/stageroutine/previews/<name>.html" />`.

## Preview Configuration

`previews.config.ts` is a Vite configuration file used only for building component previews:
- Compiles multiple HTML entry points from `.cache/previews/`.
- Disables presenter channel sync (`channel: false`).
- Sets virtual viewport dimensions to 1000x350 pixels (scaled at 80% to fit documentation typography).
