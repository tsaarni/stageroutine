import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "stageroutine",
  },
  optimizeDeps: {
    exclude: ["stageroutine"],
  },
});
