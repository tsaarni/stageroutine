import { execSync } from "node:child_process";
import { cpSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
import type * as Preset from "@docusaurus/preset-classic";
import type { Config, Plugin } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

function stageRoutineDemoPlugin(): Plugin {
  return {
    name: "stageroutine-demo-plugin",
    async loadContent() {
      const rootDir = resolve(__dirname, "..");
      const siteStaticDir = resolve(__dirname, "static");
      const distDir = resolve(rootDir, "dist");

      execSync("pnpm --filter stageroutine build", {
        cwd: rootDir,
        stdio: "inherit",
      });

      mkdirSync(resolve(siteStaticDir, "demo"), { recursive: true });
      cpSync(resolve(distDir, "demo/index.html"), resolve(siteStaticDir, "demo/index.html"));
      cpSync(
        resolve(distDir, "src/presenter/presenter.html"),
        resolve(siteStaticDir, "presenter.html"),
      );
      cpSync(
        resolve(distDir, "src/presenter/presenter.html"),
        resolve(siteStaticDir, "demo/presenter.html"),
      );
      cpSync(resolve(distDir, "assets"), resolve(siteStaticDir, "assets"), { recursive: true });
    },
    async postBuild({ outDir }) {
      const distDir = resolve(__dirname, "../dist");
      mkdirSync(resolve(outDir, "demo"), { recursive: true });
      cpSync(resolve(distDir, "demo/index.html"), resolve(outDir, "demo/index.html"));
      cpSync(resolve(distDir, "src/presenter/presenter.html"), resolve(outDir, "presenter.html"));
      cpSync(
        resolve(distDir, "src/presenter/presenter.html"),
        resolve(outDir, "demo/presenter.html"),
      );
      cpSync(resolve(distDir, "assets"), resolve(outDir, "assets"), { recursive: true });
    },
  };
}

const config: Config = {
  title: "StageRoutine",
  tagline: "Stage-based animation library",
  favicon: "img/favicon.ico",

  url: "https://tsaarni.github.io",
  baseUrl: "/stageroutine/",

  organizationName: "tsaarni",
  projectName: "stageroutine",
  deploymentBranch: "gh-pages",
  trailingSlash: false,

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "warn",

  markdown: {
    format: "detect",
  },

  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          editUrl: "https://github.com/tsaarni/stageroutine/tree/main/site/",
          // "current" is the docs/ directory (development/main)
          // lastVersion: 'current' means /docs/ shows the current (main) version
          lastVersion: "current",
          versions: {
            current: {
              label: "main",
            },
          },
        },
        blog: false,
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: "dark",
      disableSwitch: true,
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: "StageRoutine",
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Docs",
        },
        {
          href: "pathname:///demo/",
          position: "left",
          label: "Demo",
          target: "_top",
        },
        // Version dropdown - shows "main" + any released versions
        {
          type: "docsVersionDropdown",
          position: "right",
        },
        {
          href: "https://github.com/tsaarni/stageroutine",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    prism: {
      theme: prismThemes.dracula,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

  plugins: [
    stageRoutineDemoPlugin,
    [
      "docusaurus-plugin-typedoc",
      {
        entryPoints: ["../src/index.ts"],
        tsconfig: "../tsconfig.json",
        out: "docs/api",
        readme: "none",
        excludeInternal: true,
        categorizeByGroup: true,
        categoryOrder: [
          "Core",
          "Components",
          "Motion",
          "Decorators",
          "Backgrounds",
          "Layout",
          "Presenter",
          "*",
        ],
        sanitizeComments: true,
        disableSources: true,
        expandParameters: true,
        parametersFormat: "table",
        propertiesFormat: "table",
        typeDeclarationFormat: "table",
        enumMembersFormat: "table",
        tableColumnSettings: {
          hideSources: true,
          hideModifiers: true,
          hideOverrides: true,
          hideInherited: true,
        },
        sidebar: {
          autoConfiguration: true,
        },
      },
    ],
  ],
};

export default config;
