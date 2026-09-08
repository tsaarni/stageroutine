import { execSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "@docusaurus/types";

/**
 * Docusaurus plugin that builds and synchronizes the root StageRoutine presentation
 * and presenter console into the documentation site.
 */
export function demoPresentationPlugin(): Plugin {
  const rootDir = resolve(__dirname, "../..");
  const siteStaticDir = resolve(__dirname, "../static");
  const distDir = resolve(rootDir, "dist");

  function syncDemoAssets(targetDir: string): void {
    mkdirSync(resolve(targetDir, "demo"), { recursive: true });
    cpSync(resolve(distDir, "demo/index.html"), resolve(targetDir, "demo/index.html"));
    cpSync(resolve(distDir, "src/presenter/presenter.html"), resolve(targetDir, "presenter.html"));
    cpSync(
      resolve(distDir, "src/presenter/presenter.html"),
      resolve(targetDir, "demo/presenter.html"),
    );
    cpSync(resolve(distDir, "assets"), resolve(targetDir, "assets"), { recursive: true });
  }

  return {
    name: "stageroutine-demo-presentation",

    getPathsToWatch() {
      // Only watch demo source files
      return [resolve(rootDir, "demo/**/*"), resolve(rootDir, "src/presenter/**/*")];
    },

    async loadContent() {
      const demoTargetHtml = resolve(siteStaticDir, "demo/index.html");
      const demoPresenterHtml = resolve(siteStaticDir, "presenter.html");

      // In dev mode, skip rebuild if assets are already built and synced
      if (existsSync(demoTargetHtml) && existsSync(demoPresenterHtml)) {
        return;
      }

      // Build root demo presentation and presenter console
      execSync("pnpm --filter stageroutine build", {
        cwd: rootDir,
        stdio: "inherit",
      });

      // Sync demo presentation assets into site/static/ for dev and preview
      syncDemoAssets(siteStaticDir);
    },

    async postBuild({ outDir }) {
      // Ensure root build exists for production site
      execSync("pnpm --filter stageroutine build", {
        cwd: rootDir,
        stdio: "inherit",
      });

      // Ensure production build output has demo presentation assets
      syncDemoAssets(outDir);
    },
  };
}
