import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

function findChrome() {
  if (process.env.CHROME_BIN && existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  if (process.platform === "darwin") {
    const macPaths = [
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      `${process.env.HOME}/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`,
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    ];
    return macPaths.find(existsSync);
  }

  if (process.platform === "linux") {
    const linuxBins = ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"];
    const pathDirs = (process.env.PATH || "").split(":");
    for (const bin of linuxBins) {
      for (const dir of pathDirs) {
        const fullPath = join(dir, bin);
        if (existsSync(fullPath)) {
          return fullPath;
        }
      }
    }
  }

  return null;
}

const chromePath = findChrome();
if (!chromePath) {
  console.error("Chrome or Chromium executable not found. Set CHROME_BIN environment variable.");
  process.exit(1);
}

const args = [
  "--remote-debugging-port=9222",
  "--user-data-dir=.chrome-profile",
  "http://localhost:5173",
];

const child = spawn(chromePath, args, { stdio: "inherit" });
child.on("exit", (code) => {
  process.exit(code ?? 0);
});
