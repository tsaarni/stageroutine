/**
 * Dynamic sandbox entry point for Playwright component and presentation tests.
 * Exports the entire StageRoutine library onto window.__SR__ and exposes a clean stage mounting function.
 */
import * as SR from "../../src/index.ts";

declare global {
  interface Window {
    __SR__: typeof SR;
    __STAGE_INSTANCE__?: SR.Stage;
    __SR_SETUP__?: (sr: typeof SR) => void;
  }
}

window.__SR__ = SR;

// When the test injects a setup function, run it and mount
window.__SR_RUN_SETUP__ = (setupFnString: string) => {
  try {
    sessionStorage.setItem("__SR_SETUP_FN__", setupFnString);
  } catch {
    // ignore
  }

  // Clean up any previous stage
  if (window.__STAGE_INSTANCE__) {
    window.__STAGE_INSTANCE__.dispose();
    window.__STAGE_INSTANCE__ = undefined;
  }

  const container = document.getElementById("stage");
  if (container) {
    container.innerHTML = "";
  }

  const fn = new Function("SR", `"use strict";\nreturn (${setupFnString})(SR);`);
  const stage = fn(SR);
  if (stage && typeof stage.mount === "function") {
    window.__STAGE_INSTANCE__ = stage;
    stage.mount("#stage");
  }
};

try {
  const saved = sessionStorage.getItem("__SR_SETUP_FN__");
  if (saved) {
    window.__SR_RUN_SETUP__(saved);
  }
} catch {
  // ignore
}
