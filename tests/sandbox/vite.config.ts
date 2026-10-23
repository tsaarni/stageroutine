import { defineConfig } from "vite";

export default defineConfig({
  // A separate server must not replace a running presentation's optimized dependencies.
  cacheDir: "../../node_modules/.vite-tests",
  optimizeDeps: { include: ["@observablehq/plot"] },
});
