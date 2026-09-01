/**
 * Vite configuration for StageRoutine demo and presentation runtime.
 */

import { defineConfig } from "vite";
import { stageRoutinePlugin } from "./src/vite-plugin";

export default defineConfig({
  plugins: [stageRoutinePlugin()],
});
