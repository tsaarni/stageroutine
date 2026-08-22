/**
 * Vite bundler configuration setting up dev server routes, aliases, and multi-page builds.
 */

import { resolve } from "node:path";
import { type Plugin, defineConfig } from "vite";

/**
 * Built-in StageRoutine Presenter Console server middleware.
 */
function presenterPlugin(): Plugin {
  return {
    name: "stageroutine-presenter",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url === "/" || req.url === "/index.html") {
          req.url = "/demo/index.html";
        } else if (req.url === "/presenter" || req.url === "/presenter.html") {
          req.url = "/src/presenter/presenter.html";
        }
        next();
      });
    },
  };
}

export default defineConfig({
  plugins: [presenterPlugin()],
  resolve: {
    alias: {
      "stageroutine/styles.css": resolve(__dirname, "src/dom/styles.css"),
      "stageroutine/jsx-runtime": resolve(__dirname, "src/dom/jsx-runtime.ts"),
      "stageroutine/jsx-dev-runtime": resolve(__dirname, "src/dom/jsx-dev-runtime.ts"),
      stageroutine: resolve(__dirname, "src/index.ts"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "demo/index.html"),
        presenter: resolve(__dirname, "src/presenter/presenter.html"),
      },
    },
  },
});
