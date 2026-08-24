/**
 * Vite bundler configuration setting up dev server routes, aliases, and multi-page builds.
 */

import { resolve } from "node:path";
import { defineConfig } from "vite";
import { stageRoutinePlugin } from "./src/vite-plugin";

export default defineConfig({
  plugins: [stageRoutinePlugin()],
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
