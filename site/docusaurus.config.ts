import { existsSync } from "node:fs";
import { resolve } from "node:path";
import type * as Preset from "@docusaurus/preset-classic";
import type { Config, PluginConfig } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";
import { componentPreviewsPlugin } from "./plugins/component-previews";
import { demoPresentationPlugin } from "./plugins/demo-presentation";
import { remarkHideCodeLines } from "./plugins/remark-hide-code-lines";

const isDevStart = process.argv.includes("start");
const apiDocsExist = existsSync(resolve(__dirname, "docs/api/typedoc-sidebar.cjs"));
const shouldGenerateTypedoc = !isDevStart || !apiDocsExist;

const plugins: PluginConfig[] = [componentPreviewsPlugin, demoPresentationPlugin];

if (shouldGenerateTypedoc) {
  plugins.push([
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
  ]);
}

const config: Config = {
  title: "StageRoutine",
  tagline: "Code-driven presentations built for the stage",
  favicon: "img/stageroutine-logo-micro.svg",

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
          beforeDefaultRemarkPlugins: [remarkHideCodeLines],
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
      logo: {
        alt: "StageRoutine Logo",
        src: "img/stageroutine-logo-micro.svg",
        width: 24,
        height: 24,
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Docs",
        },
        {
          href: "pathname:///demo/",
          position: "right",
          label: "Demo",
          target: "_top",
        },
        {
          href: "https://github.com/tsaarni/stageroutine",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          html: `© ${new Date().getFullYear()} StageRoutine`,
        },
        {
          label: "Brand Guidelines",
          to: "/brand",
        },
      ],
    },
    prism: {
      theme: prismThemes.dracula,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

  plugins,
};

export default config;
