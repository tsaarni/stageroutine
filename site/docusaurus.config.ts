import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import type * as Preset from "@docusaurus/preset-classic";
import type { Config, PluginConfig } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";
import { componentPreviewsPlugin } from "./plugins/component-previews";
import { demoPresentationPlugin } from "./plugins/demo-presentation";
import { remarkHideCodeLines } from "./plugins/remark-hide-code-lines";

const require = createRequire(import.meta.url);

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
      alwaysCreateEntryPointModule: false,
      excludeInternal: true,
      categorizeByGroup: false,
      visibilityFilters: {
        inherited: false,
        protected: false,
        private: false,
        external: false,
      },
      categoryOrder: [
        "Core",
        "Components",
        "Shape & Frame",
        "Layout",
        "Motion",
        "Decorators",
        "Backgrounds",
        "Presenter",
        "Theme",
        "*",
      ],
      sanitizeComments: true,
      disableSources: true,
      indexFormat: "table",
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
  onBrokenAnchors: "warn",

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
          sidebarItemsGenerator: async ({
            defaultSidebarItemsGenerator,
            item,
            version,
            ...args
          }) => {
            if (item.dirName === "api") {
              const sidebarPath = resolve(version.contentPath, "api/typedoc-sidebar.cjs");
              if (existsSync(sidebarPath)) {
                const rawItems = require(sidebarPath);

                const curatedCategories: Record<string, string[]> = {
                  Core: ["Stage", "group", "logger"],
                  Components: [
                    "BulletList",
                    "Card",
                    "CodeBlock",
                    "Connector",
                    "Icon",
                    "Image",
                    "Kicker",
                    "SequenceDiagram",
                    "Table",
                    "TerminalBlock",
                    "Text",
                    "Title",
                    "Video",
                    "Webcam",
                  ],
                  "Shape & Frame": ["Shape", "Frame", "paths"],
                  Layout: ["layout"],
                  Motion: ["to", "stagger", "replace", "pulseSequence"],
                  Decorators: [
                    "bracket",
                    "dream",
                    "glow",
                    "gradient",
                    "grain",
                    "kenBurns",
                    "rule",
                    "scrim",
                    "typewriter",
                    "vignette",
                  ],
                  Backgrounds: ["CSSBackground", "Starfield", "AsciiFluid", "GradientFluid"],
                  Presenter: [
                    "LaserPointer",
                    "NavigationOverlay",
                    "PresenterClient",
                    "PresenterRecorder",
                  ],
                  Theme: ["ThemeConfig", "themes"],
                };

                const categoryOrder = [
                  "Core",
                  "Components",
                  "Layout",
                  "Motion",
                  "Decorators",
                  "Backgrounds",
                  "Presenter",
                  "Theme",
                ];

                interface SidebarDocItem {
                  type: "doc";
                  id: string;
                  label: string;
                }

                interface SidebarCategoryItem {
                  type: "category";
                  label: string;
                  items: (SidebarDocItem | SidebarCategoryItem)[];
                  collapsed?: boolean;
                }

                const categoryMap = new Map<string, SidebarCategoryItem>();
                for (const cat of rawItems as SidebarCategoryItem[]) {
                  categoryMap.set(cat.label, cat);
                }

                const resultSidebar: SidebarCategoryItem[] = [];

                for (const catName of categoryOrder) {
                  const rawCat = categoryMap.get(catName);
                  if (!rawCat) continue;

                  const allowed = curatedCategories[catName] || [];
                  const filteredItems: (SidebarDocItem | SidebarCategoryItem)[] = [];
                  const secondaryItems: SidebarDocItem[] = [];

                  function collectDocs(items: (SidebarDocItem | SidebarCategoryItem)[]) {
                    for (const it of items) {
                      if (it.type === "doc") {
                        if (allowed.includes(it.label)) {
                          if (!filteredItems.some((f) => f.label === it.label)) {
                            filteredItems.push(it);
                          }
                        } else {
                          if (!secondaryItems.some((s) => s.label === it.label)) {
                            secondaryItems.push(it);
                          }
                        }
                      } else if (it.type === "category" && it.items) {
                        collectDocs(it.items);
                      }
                    }
                  }
                  collectDocs(rawCat.items || []);

                  filteredItems.sort((a, b) => allowed.indexOf(a.label) - allowed.indexOf(b.label));

                  if (catName === "Components") {
                    const rawShapeCat = categoryMap.get("Shape & Frame");
                    if (rawShapeCat) {
                      const shapeAllowed = curatedCategories["Shape & Frame"] || [];
                      const shapeFiltered: (SidebarDocItem | SidebarCategoryItem)[] = [];
                      const shapeSecondary: SidebarDocItem[] = [];
                      function collectShapeDocs(items: (SidebarDocItem | SidebarCategoryItem)[]) {
                        for (const it of items) {
                          if (it.type === "doc") {
                            if (shapeAllowed.includes(it.label)) {
                              if (!shapeFiltered.some((f) => f.label === it.label)) {
                                shapeFiltered.push(it);
                              }
                            } else {
                              if (!shapeSecondary.some((s) => s.label === it.label)) {
                                shapeSecondary.push(it);
                              }
                            }
                          } else if (it.type === "category" && it.items) {
                            collectShapeDocs(it.items);
                          }
                        }
                      }
                      collectShapeDocs(rawShapeCat.items || []);

                      shapeFiltered.sort(
                        (a, b) => shapeAllowed.indexOf(a.label) - shapeAllowed.indexOf(b.label),
                      );

                      if (shapeSecondary.length > 0) {
                        shapeFiltered.push({
                          type: "category",
                          label: "Types",
                          collapsed: true,
                          items: shapeSecondary.sort((a, b) => a.label.localeCompare(b.label)),
                        });
                      }

                      filteredItems.push({
                        type: "category",
                        label: "Shape & Frame",
                        items: shapeFiltered,
                      });
                    }
                  }

                  if (secondaryItems.length > 0) {
                    filteredItems.push({
                      type: "category",
                      label: "Types",
                      collapsed: true,
                      items: secondaryItems.sort((a, b) => a.label.localeCompare(b.label)),
                    });
                  }

                  resultSidebar.push({
                    type: "category",
                    label: catName,
                    items: filteredItems,
                  });
                }

                return resultSidebar;
              }
            }
            return defaultSidebarItemsGenerator({ item, version, ...args });
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
      copyright: `© ${new Date().getFullYear()} StageRoutine`,
    },
    prism: {
      theme: prismThemes.dracula,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,

  plugins,
};

export default config;
