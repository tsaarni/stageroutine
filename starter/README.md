# StageRoutine Presentation

Built with [StageRoutine](https://github.com/tsaarni/stageroutine) - code-driven presentations for the stage.

## Getting Started

Requires [Node.js](https://nodejs.org/). Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

*(or use `pnpm` / `bun`)*

Open `http://localhost:5173/` for the presentation, or `http://localhost:5173/presenter.html` for the presenter console. Navigate with the arrow keys or Space, and press `L` to toggle the laser pointer.

Edit `src/main.ts` to build your scenes. The browser updates automatically as you save.

To generate static files with presenter console for web hosting:

```bash
npm run build
```

To generate a single self-contained HTML file for offline sharing or emailing:

```bash
npm run build:single
```

See the [StageRoutine documentation](https://tsaarni.github.io/stageroutine/) for guides and examples.
