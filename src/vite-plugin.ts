/**
 * Vite dev and preview server plugin that routes presentation, presenter console pages, JSX, and icons.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Icons from "unplugin-icons/vite";
import type { PluginOption } from "vite";

/**
 * Options for configuring the StageRoutine Vite plugin.
 */
export interface StageRoutinePluginOptions {
  /** Base public path for production builds (e.g. "/my-presentation/"). Defaults to process.env.BASE_URL or "/". */
  base?: string;
  /** Output directory for production build. Defaults to "dist". */
  outDir?: string;
  /** Main HTML entry path. Automatically detected from root or demo/ if omitted. */
  entry?: string;
  /**
   * BroadcastChannel name for dual-screen presenter synchronization.
   * Pass `false` to disable presenter sync (e.g. for component preview builds).
   * Defaults to `"stageroutine-channel"`.
   */
  channel?: string | false;
  /** Virtual stage width in pixels. Defaults to process.env.STAGEROUTINE_WIDTH or 1920. */
  width?: number;
  /** Virtual stage height in pixels. Defaults to process.env.STAGEROUTINE_HEIGHT or 1080. */
  height?: number;
  /**
   * Enable or disable the built-in presenter console.
   * Defaults to true. Pass `false` to omit it from builds and the dev server.
   */
  presenter?: boolean;
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
export function stageRoutine(options: StageRoutinePluginOptions = {}): PluginOption[] {
  const rootDir = process.cwd();
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const presenterDir = resolve(__dirname, "presenter");
  const presenterHtmlPath = resolve(presenterDir, "presenter.html");
  const presenterTsxPath = resolve(presenterDir, "presenter.tsx");
  const isPresenterEnabled = options.presenter !== false;

  const resolveMainEntry = (): string => {
    if (options.entry) return resolve(rootDir, options.entry);
    const rootIndex = resolve(rootDir, "index.html");
    if (existsSync(rootIndex)) return rootIndex;
    const demoIndex = resolve(rootDir, "demo/index.html");
    if (existsSync(demoIndex)) return demoIndex;
    return rootIndex;
  };

  const corePlugin: PluginOption = {
    name: "stageroutine-plugin",
    config(userConfig) {
      const defaultBase = options.base ?? process.env.BASE_URL ?? "/";
      const width = options.width ?? (Number(process.env.STAGEROUTINE_WIDTH) || undefined);
      const height = options.height ?? (Number(process.env.STAGEROUTINE_HEIGHT) || undefined);

      return {
        base: userConfig.base ?? defaultBase,
        define: {
          __STAGEROUTINE_CHANNEL__: JSON.stringify(options.channel ?? "stageroutine-channel"),
          ...(width ? { __STAGEROUTINE_WIDTH__: JSON.stringify(width) } : {}),
          ...(height ? { __STAGEROUTINE_HEIGHT__: JSON.stringify(height) } : {}),
          ...userConfig.define,
        },
        server: {
          fs: {
            allow: [rootDir, resolve(__dirname, "..")],
          },
          ...userConfig.server,
        },
        build: {
          target: userConfig.build?.target ?? "es2022",
          outDir: userConfig.build?.outDir ?? options.outDir ?? "dist",
          emptyOutDir: userConfig.build?.emptyOutDir ?? true,
          rollupOptions: {
            input: userConfig.build?.rollupOptions?.input ?? {
              main: resolveMainEntry(),
              ...(isPresenterEnabled ? { presenter: resolve(rootDir, "presenter.html") } : {}),
            },
          },
        },
        esbuild: {
          jsx: "automatic",
          jsxImportSource: "stageroutine",
          ...userConfig.esbuild,
        },
        optimizeDeps: {
          exclude: ["stageroutine", ...(userConfig.optimizeDeps?.exclude || [])],
          ...userConfig.optimizeDeps,
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
      server.middlewares.use(async (req, res, next) => {
        if (!req.url) return next();
        const [rawPath] = req.url.split("?");
        const cleanPath = rawPath.replace(/\/$/, "");

        if (isPresenterEnabled && cleanPath === "/presenter.html") {
          try {
            const html = readFileSync(presenterHtmlPath, "utf-8").replace(
              'src="./presenter.tsx"',
              `src="/@fs${presenterTsxPath}"`,
            );

            const transformed = await server.transformIndexHtml(req.url, html);
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            res.statusCode = 200;
            res.end(transformed);
            return;
          } catch (err) {
            return next(err);
          }
        }

        if (cleanPath === "" || cleanPath === "/index.html") {
          const main = resolveMainEntry();
          const rootIndex = resolve(rootDir, "index.html");
          if (main !== rootIndex && main.startsWith(rootDir)) {
            req.url = `/${main.slice(rootDir.length).replace(/^\//, "")}`;
          }
        }
        next();
      });
    },
    resolveId(id) {
      if (isPresenterEnabled && (id === "/presenter.html" || id.endsWith("presenter.html"))) {
        return resolve(rootDir, "presenter.html");
      }
    },
    load(id) {
      if (isPresenterEnabled && id === resolve(rootDir, "presenter.html")) {
        return readFileSync(presenterHtmlPath, "utf-8").replace(
          'src="./presenter.tsx"',
          `src="${presenterTsxPath}"`,
        );
      }
    },
    transformIndexHtml(html, ctx) {
      if (!ctx.server) return html;
      const rootDirJson = JSON.stringify(rootDir);
      const errorOverlayScript = `
(() => {
  const BANNER_ID = "stageroutine-dev-error-banner";
  const ROOT_DIR = ${rootDirJson};

  function clearBanner() {
    const existing = document.getElementById(BANNER_ID);
    if (existing) existing.remove();
  }

  function openInEditor(filePath, line, column) {
    const target = column ? \`\${filePath}:\${line}:\${column}\` : line ? \`\${filePath}:\${line}\` : filePath;
    fetch(\`/__open-in-editor?file=\${encodeURIComponent(target)}\`).catch(() => {});
  }

  function formatStack(stack, message) {
    if (!stack) return null;
    let lines = stack.split("\\n");
    if (lines.length > 0 && lines[0].includes(message)) {
      lines = lines.slice(1);
    }

    const container = document.createElement("div");
    container.style.cssText = "margin:0;padding:14px;background:#09090b;border-radius:8px;border:1px solid #27272a;overflow-x:auto;font-size:12px;color:#94a3b8;line-height:1.7;word-break:break-word;";

    for (const rawLine of lines) {
      const lineDiv = document.createElement("div");
      // Match URL patterns like http://localhost:5173/demo/main.ts?t=123:49:41
      const urlMatch = rawLine.match(/(https?:\\/\\/[^/\\s]+)(\\/[^?:\\s)]+)(?:\\?[^:\\s)]*)?:(\\d+)(?::(\\d+))?/);
      if (urlMatch) {
        const [fullUrlMatch, host, relPath, lineNum, colNum] = urlMatch;
        const absPath = ROOT_DIR + (relPath.startsWith("/") ? relPath : "/" + relPath);
        const displayPath = relPath.replace(/^\\//, "") + ":" + lineNum + (colNum ? ":" + colNum : "");

        const before = rawLine.slice(0, urlMatch.index);
        const after = rawLine.slice((urlMatch.index || 0) + fullUrlMatch.length);

        if (before) lineDiv.appendChild(document.createTextNode(before));

        const link = document.createElement("span");
        link.textContent = displayPath;
        link.title = \`Click to open \${absPath}:\${lineNum} in editor\`;
        link.style.cssText = "color:#38bdf8;text-decoration:underline;cursor:pointer;font-weight:600;";
        link.addEventListener("click", (e) => {
          e.stopPropagation();
          openInEditor(absPath, lineNum, colNum);
        });
        lineDiv.appendChild(link);

        if (after) lineDiv.appendChild(document.createTextNode(after));
      } else {
        lineDiv.textContent = rawLine;
      }
      container.appendChild(lineDiv);
    }
    return container;
  }

  function showError(title, message, stack) {
    clearBanner();
    const banner = document.createElement("div");
    banner.id = BANNER_ID;
    banner.style.cssText = "position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(9,9,11,0.94);backdrop-filter:blur(10px);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:24px;font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace;box-sizing:border-box;color:#f8fafc;";

    const card = document.createElement("div");
    card.style.cssText = "position:relative;max-width:820px;width:100%;background:#18181b;border:1px solid #ef4444;border-radius:12px;padding:24px;box-shadow:0 20px 40px rgba(0,0,0,0.7);box-sizing:border-box;";

    const header = document.createElement("div");
    header.style.cssText = "display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;";

    const titleRow = document.createElement("div");
    titleRow.style.cssText = "display:flex;align-items:center;gap:10px;color:#ef4444;font-size:16px;font-weight:700;";
    titleRow.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> StageRoutine Runtime Error';

    const actions = document.createElement("div");
    actions.style.cssText = "display:flex;align-items:center;gap:10px;";

    const copyBtn = document.createElement("button");
    copyBtn.textContent = "Copy";
    copyBtn.style.cssText = "background:#27272a;color:#cbd5e1;border:1px solid #3f3f46;border-radius:6px;padding:4px 10px;font-size:12px;cursor:pointer;";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(\`\${message}\\n\\n\${stack || ""}\`);
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy"; }, 1500);
    });

    const closeBtn = document.createElement("button");
    closeBtn.innerHTML = "&times;";
    closeBtn.title = "Dismiss (Esc)";
    closeBtn.style.cssText = "background:transparent;color:#94a3b8;border:none;font-size:22px;line-height:1;cursor:pointer;padding:0 4px;";
    closeBtn.addEventListener("click", clearBanner);

    actions.appendChild(copyBtn);
    actions.appendChild(closeBtn);
    header.appendChild(titleRow);
    header.appendChild(actions);

    const msg = document.createElement("div");
    msg.style.cssText = "color:#f87171;font-size:15px;margin-bottom:16px;line-height:1.5;font-weight:600;";
    msg.textContent = message || title;

    card.appendChild(header);
    card.appendChild(msg);

    const stackEl = formatStack(stack, message);
    if (stackEl) card.appendChild(stackEl);

    banner.appendChild(card);
    if (document.body) {
      document.body.appendChild(banner);
    } else {
      document.addEventListener("DOMContentLoaded", () => document.body?.appendChild(banner));
    }
  }

  window.addEventListener("error", (e) => {
    const filename = e.filename || "";
    if (filename && !filename.includes(window.location.host) && !filename.includes("/demo/") && !filename.includes("/src/")) {
      return;
    }
    showError("Unhandled Error", e.message || String(e), e.error?.stack);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    const stack = reason?.stack || "";
    showError("Unhandled Promise Rejection", reason?.message || String(reason), stack);
  });

  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") clearBanner();
  });

  if (import.meta.hot) {
    import.meta.hot.on("vite:beforeUpdate", clearBanner);
  }
})();
`;
      return [
        {
          tag: "script",
          attrs: { type: "module" },
          children: errorOverlayScript,
          injectTo: "head-prepend",
        },
      ];
    },
  };

  const plugins: PluginOption[] = [corePlugin];

  if (options.icons !== false) {
    const processLocalSvg = async (rawSvg: string): Promise<string> => {
      const { SVG, cleanupSVG, parseColors, runSVGO } = await import("@iconify/tools");
      const svg = new SVG(rawSvg);
      await cleanupSVG(svg);
      const parsed = await parseColors(svg);
      if (parsed.colors.length <= 1) {
        await parseColors(svg, {
          callback: (_attr, _colorStr, parsedColor) => {
            if (!parsedColor || parsedColor.type === "none" || parsedColor.type === "transparent") {
              return "none";
            }
            return "currentColor";
          },
        });
      }
      await runSVGO(svg);
      return svg.toMinifiedString();
    };

    // Dedicated plugin for local project icons (~icons/...)
    const localIconsPlugin: PluginOption = {
      name: "stageroutine:local-icons",
      resolveId(id) {
        if (id.startsWith("~icons/")) {
          return `\0${id}`;
        }
      },
      async load(id) {
        if (!id.startsWith("\0~icons/")) return null;
        const rawIconPath = id.slice("\0~icons/".length);
        const iconPath = rawIconPath.replace(/\.svg$/, "");
        const parts = iconPath.split("/");

        // Supports flat (icons/gateway.svg) and nested (icons/mycompany/edge-device.svg)
        const filePath =
          parts.length === 1
            ? resolve(rootDir, "icons", `${parts[0]}.svg`)
            : resolve(rootDir, "icons", ...parts.slice(0, -1), `${parts[parts.length - 1]}.svg`);

        if (existsSync(filePath)) {
          const raw = readFileSync(filePath, "utf-8");
          const svg = await processLocalSvg(raw);
          return `
import { Icon } from "stageroutine";
export default function(options = {}) {
  return Icon(${JSON.stringify(svg)}, options);
}
`;
        }
        throw new Error(
          `StageRoutine could not find local icon "~icons/${iconPath}". Looked for file at: ${filePath}`,
        );
      },
    };

    // Rewriter allowing ~iconify/<collection>/<icon> to resolve via unplugin-icons
    const iconifyRewriter: PluginOption = {
      name: "stageroutine:iconify-rewriter",
      async resolveId(id, importer, resolveOptions) {
        if (id.startsWith("~iconify/")) {
          const target = id.replace(/^~iconify\//, "~icons/");
          return this.resolve(target, importer, { skipSelf: true, ...resolveOptions });
        }
      },
    };

    plugins.push(
      localIconsPlugin,
      iconifyRewriter,
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
