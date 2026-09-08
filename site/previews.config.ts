import { existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { stageRoutinePlugin } from "../src/vite-plugin";

const previewsCacheDir = resolve(__dirname, ".cache/previews");

const previewEntries: Record<string, string> = {};
if (existsSync(previewsCacheDir)) {
  for (const file of readdirSync(previewsCacheDir)) {
    if (file.endsWith(".html")) {
      const name = file.replace(/\.html$/, "");
      previewEntries[name] = resolve(previewsCacheDir, file);
    }
  }
}

export default defineConfig({
  root: previewsCacheDir,
  base: "/stageroutine/previews/",
  build: {
    target: "es2022",
    outDir: resolve(__dirname, "static/previews"),
    emptyOutDir: true,
    rollupOptions: {
      input: previewEntries,
    },
  },
  plugins: [stageRoutinePlugin({ channel: false })],
});
