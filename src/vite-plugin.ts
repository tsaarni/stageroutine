/**
 * Vite dev and preview server plugin that routes presentation and presenter console pages.
 */

import type { Plugin } from "vite";

/**
 * Built-in StageRoutine Vite plugin.
 * Rewrites `/` and `/presenter` routes to their respective HTML entry points
 * in both Vite dev and preview servers.
 */
export function stageRoutinePlugin(): Plugin {
  const rewriteUrl = (url: string | undefined): string | undefined => {
    if (!url) return url;
    const [path, query] = url.split("?");
    const cleanPath = path.replace(/\/$/, "");
    let target: string | null = null;

    if (cleanPath === "" || cleanPath === "/index.html") {
      target = "/demo/index.html";
    } else if (cleanPath === "/presenter" || cleanPath === "/presenter.html") {
      target = "/src/presenter/presenter.html";
    }

    if (target) {
      return query ? `${target}?${query}` : target;
    }
    return url;
  };

  return {
    name: "stageroutine-plugin",
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          const rewritten = rewriteUrl(req.url);
          if (rewritten) req.url = rewritten;
        }
        next();
      });
    },
    configurePreviewServer(server) {
      server.middlewares.use((req, _res, next) => {
        if (req.url) {
          const rewritten = rewriteUrl(req.url);
          if (rewritten) req.url = rewritten;
        }
        next();
      });
    },
  };
}
