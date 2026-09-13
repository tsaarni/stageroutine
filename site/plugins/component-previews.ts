import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { Plugin } from "@docusaurus/types";

/**
 * Docusaurus plugin that extracts component previews from markdown code blocks,
 * generates standalone HTML runners, and builds them using Vite.
 */
export function componentPreviewsPlugin(): Plugin {
  const rootDir = resolve(__dirname, "../..");
  const previewsCacheDir = resolve(__dirname, "../.cache/previews");
  const staticPreviewsDir = resolve(__dirname, "../static/previews");
  const docsDir = resolve(__dirname, "../docs");

  function findDocsFiles(dir: string): string[] {
    const results: string[] = [];
    if (!existsSync(dir)) return results;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (entry.name !== "api" && entry.name !== "node_modules") {
          results.push(...findDocsFiles(resolve(dir, entry.name)));
        }
      } else if (entry.isFile() && (entry.name.endsWith(".mdx") || entry.name.endsWith(".md"))) {
        results.push(resolve(dir, entry.name));
      }
    }
    return results;
  }

  function renderPreviewHtml(name: string, tsFile: string): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${name} Preview</title>
  <style>
    html { font-size: 13px; }
    body { margin: 0; background: #0c0e12; overflow: hidden; }
  </style>
</head>
<body>
  <div id="stage"></div>
  <script type="module" src="./${tsFile}"></script>
</body>
</html>
`;
  }

  function cleanPreviewCode(code: string): string {
    const cleaned = code
      .split("\n")
      .filter((line) => {
        return !/^\s*(?:\/\/|\/\*)\s*(?:hide-start|hide-end|hide-next-line)(?:\s*\*\/)?\s*$/i.test(
          line,
        );
      })
      .map((line) => line.replace(/\s*(?:\/\/|\/\*)\s*hide-line(?:\s*\*\/)?\s*$/i, ""))
      .join("\n")
      .trim();
    return `${cleaned}\n`;
  }

  return {
    name: "stageroutine-component-previews",

    getPathsToWatch() {
      // Only watch doc sections that may contain component previews (never watch generated api docs)
      const docSubdirs = ["components", "building", "getting-started", "advanced"];
      const paths: string[] = [];
      for (const sub of docSubdirs) {
        paths.push(resolve(docsDir, `${sub}/**/*.mdx`), resolve(docsDir, `${sub}/**/*.md`));
      }
      paths.push(resolve(docsDir, "*.md"), resolve(docsDir, "*.mdx"));
      return paths;
    },

    async loadContent() {
      mkdirSync(previewsCacheDir, { recursive: true });

      const tsConfigPath = resolve(previewsCacheDir, "tsconfig.json");
      if (!existsSync(tsConfigPath)) {
        writeFileSync(
          tsConfigPath,
          `${JSON.stringify({ extends: "../../../tsconfig.json" }, null, 2)}\n`,
          "utf-8",
        );
      }

      // Extract typescript code blocks with preview="<filename>.html" attribute
      const previewRegex =
        /```typescript[^\n]*\bpreview=["']?([^"'\s>]+)["']?[^\n]*\n([\s\S]*?)```/g;

      const extracted = new Map<string, string>();

      for (const filePath of findDocsFiles(docsDir)) {
        const content = readFileSync(filePath, "utf-8");
        for (const match of content.matchAll(previewRegex)) {
          const previewAttr = match[1];
          const rawCode = `${match[2].trim()}\n`;
          const code = cleanPreviewCode(rawCode);
          const name = previewAttr.replace(/\.html$/, "").replace(/\.ts$/, "");
          extracted.set(name, code);
        }
      }

      // Check whether any preview snippet or generated preview output has actually changed
      let hasChanges = false;

      // 1. Check if all extracted previews already match the cached .ts files and static output exists
      for (const [name, code] of extracted.entries()) {
        const tsPath = resolve(previewsCacheDir, `${name}.ts`);
        const htmlStaticPath = resolve(staticPreviewsDir, `${name}.html`);
        if (!existsSync(tsPath) || !existsSync(htmlStaticPath)) {
          hasChanges = true;
          break;
        }
        const existingCode = readFileSync(tsPath, "utf-8");
        if (existingCode !== code) {
          hasChanges = true;
          break;
        }
      }

      // 2. Check if any extra / stale previews exist in the cache directory
      if (!hasChanges) {
        const existingCached = readdirSync(previewsCacheDir).filter(
          (f) => f.endsWith(".ts") && f !== "tsconfig.json",
        );
        if (existingCached.length !== extracted.size) {
          hasChanges = true;
        }
      }

      if (!hasChanges) {
        return;
      }

      // Clean cache directory of old files
      for (const existing of readdirSync(previewsCacheDir)) {
        if (existing !== "tsconfig.json") {
          rmSync(resolve(previewsCacheDir, existing), { recursive: true, force: true });
        }
      }

      // Write updated preview files
      for (const [name, code] of extracted.entries()) {
        const tsFile = `${name}.ts`;
        writeFileSync(resolve(previewsCacheDir, tsFile), code, "utf-8");
        writeFileSync(
          resolve(previewsCacheDir, `${name}.html`),
          renderPreviewHtml(name, tsFile),
          "utf-8",
        );
      }

      // Build standalone documentation previews using site previews config
      execSync("pnpm --filter stageroutine-docs build:previews", {
        cwd: rootDir,
        stdio: "inherit",
      });
    },

    configureWebpack() {
      return {
        module: {
          rules: [
            {
              resourceQuery: /raw/,
              type: "asset/source",
            },
          ],
        },
      };
    },
  };
}
