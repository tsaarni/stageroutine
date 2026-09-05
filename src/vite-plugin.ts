/**
 * Vite dev and preview server plugin that routes presentation, presenter console pages, JSX, and icons.
 */

import { existsSync } from "node:fs";
import { resolve } from "node:path";
import Icons from "unplugin-icons/vite";
import type { PluginOption } from "vite";

/**
 * Options for configuring the StageRoutine Vite plugin.
 */
export interface StageRoutinePluginOptions {
  /** Base public path for production builds (e.g. "/my-slides/"). Defaults to process.env.BASE_URL or "/". */
  base?: string;
  /** Output directory for production build. Defaults to "dist". */
  outDir?: string;
  /** Main HTML entry path. Automatically detected from root or demo/ if omitted. */
  entry?: string;
  /** Enable automatic on-demand icon resolution (defaults to true). */
  icons?: boolean;
  /** Additional custom options forwarded to unplugin-icons. */
  iconsOptions?: Record<string, unknown>;
}

/**
 * Built-in StageRoutine Vite plugin.
 * Configures:
 * - Direct-to-DOM JSX compilation
 * - Multi-page build bundling (presentation + presenter console)
 * - Dev and preview server route rewriting for presentations and /presenter.html
 * - On-demand, tree-shaken icon imports (~icons/...) with zero config
 */
export function stageRoutinePlugin(options: StageRoutinePluginOptions = {}): PluginOption[] {
  const rootDir = process.cwd();

  const resolveMainEntry = (): string => {
    if (options.entry) return resolve(rootDir, options.entry);
    const rootIndex = resolve(rootDir, "index.html");
    if (existsSync(rootIndex)) return rootIndex;
    const demoIndex = resolve(rootDir, "demo/index.html");
    if (existsSync(demoIndex)) return demoIndex;
    return rootIndex;
  };

  const presenterHtmlPath = resolve(__dirname, "presenter/presenter.html");

  const rewriteUrl = (url: string | undefined): string | undefined => {
    if (!url) return url;
    const [path, query] = url.split("?");
    const cleanPath = path.replace(/\/$/, "");
    let target: string | null = null;

    if (cleanPath === "" || cleanPath === "/index.html") {
      const main = resolveMainEntry();
      target = main.startsWith(rootDir)
        ? `/${main.slice(rootDir.length).replace(/^\//, "")}`
        : "/index.html";
    } else if (cleanPath === "/presenter.html") {
      target = presenterHtmlPath.startsWith(rootDir)
        ? `/${presenterHtmlPath.slice(rootDir.length).replace(/^\//, "")}`
        : "/src/presenter/presenter.html";
    }

    if (target) {
      return query ? `${target}?${query}` : target;
    }
    return url;
  };

  const corePlugin: PluginOption = {
    name: "stageroutine-plugin",
    config(userConfig, { command }) {
      const defaultBase =
        options.base ?? process.env.BASE_URL ?? (command === "build" ? "/stageroutine/" : "/");

      return {
        base: userConfig.base ?? defaultBase,
        build: {
          outDir: userConfig.build?.outDir ?? options.outDir ?? "dist",
          emptyOutDir: userConfig.build?.emptyOutDir ?? true,
          rollupOptions: {
            input: {
              main: resolveMainEntry(),
              presenter: presenterHtmlPath,
              ...((typeof userConfig.build?.rollupOptions?.input === "object" &&
              !Array.isArray(userConfig.build?.rollupOptions?.input)
                ? userConfig.build.rollupOptions.input
                : {}) as Record<string, string>),
            },
          },
        },
        esbuild: {
          jsxImportSource: "stageroutine",
        },
        resolve: {
          alias: [
            {
              find: /^stageroutine\/backgrounds$/,
              replacement: resolve(__dirname, "dom/backgrounds/index.ts"),
            },
            {
              find: /^stageroutine\/overlays$/,
              replacement: resolve(__dirname, "overlays/index.ts"),
            },
            {
              find: /^stageroutine\/presenter$/,
              replacement: resolve(__dirname, "presenter/index.ts"),
            },
            {
              find: /^stageroutine\/jsx-runtime$/,
              replacement: resolve(__dirname, "dom/jsx-runtime.ts"),
            },
            {
              find: /^stageroutine\/jsx-dev-runtime$/,
              replacement: resolve(__dirname, "dom/jsx-dev-runtime.ts"),
            },
            {
              find: /^stageroutine\/styles\.css$/,
              replacement: resolve(__dirname, "dom/style.css"),
            },
            {
              find: /^stageroutine\/style\.css$/,
              replacement: resolve(__dirname, "dom/style.css"),
            },
            {
              find: /^stageroutine\/vite$/,
              replacement: resolve(__dirname, "vite-plugin.ts"),
            },
            {
              find: /^stageroutine$/,
              replacement: resolve(__dirname, "index.ts"),
            },
          ],
        },
      };
    },
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

  const plugins: PluginOption[] = [corePlugin];

  if (options.icons !== false) {
    plugins.push(
      Icons({
        compiler: {
          compiler: (svg) => {
            return `
import { Icon } from "stageroutine";
export default function(options = {}) {
  return Icon(${JSON.stringify(svg)}, options);
}
`;
          },
        },
        ...options.iconsOptions,
      }),
    );
  }

  return plugins;
}
