import type { SidebarItem, SidebarsConfig } from "@docusaurus/plugin-content-docs";
// @ts-ignore
import typedocSidebar from "./docs/api/typedoc-sidebar.cjs";

interface DocItem {
  type: "doc";
  id: string;
  label: string;
}

interface CategoryItem {
  type: "category";
  label: string;
  items: (CategoryItem | DocItem)[];
}

function buildCategorySidebar(rawSidebar: CategoryItem[]): SidebarItem[] {
  const categoryOrder = [
    "Core",
    "Components",
    "Motion",
    "Decorators",
    "Backgrounds",
    "Layout",
    "Presenter",
  ];
  const primaryMap = new Map<string, DocItem[]>();
  const typesMap = new Map<string, DocItem[]>();

  for (const cat of categoryOrder) {
    primaryMap.set(cat, []);
    typesMap.set(cat, []);
  }

  for (const kindGroup of rawSidebar) {
    if (kindGroup.items) {
      for (const catGroup of kindGroup.items as CategoryItem[]) {
        const catName = catGroup.label;
        if (!primaryMap.has(catName)) {
          primaryMap.set(catName, []);
          typesMap.set(catName, []);
        }
        const targetPrimary = primaryMap.get(catName);
        const targetTypes = typesMap.get(catName);

        if (catGroup.items && targetPrimary && targetTypes) {
          for (const doc of catGroup.items as DocItem[]) {
            const isTypeOrInterface =
              doc.id.startsWith("api/interfaces/") || doc.id.startsWith("api/type-aliases/");
            const isDuplicateAlias = doc.id === "api/variables/sequenceDiagram";

            if (isDuplicateAlias) {
              continue;
            }

            if (isTypeOrInterface) {
              targetTypes.push(doc);
            } else {
              targetPrimary.push(doc);
            }
          }
        }
      }
    }
  }

  const result: SidebarItem[] = [];
  for (const cat of categoryOrder) {
    const primary = primaryMap.get(cat) || [];
    const types = typesMap.get(cat) || [];

    if (primary.length === 0 && types.length === 0) continue;

    primary.sort((a, b) => a.label.localeCompare(b.label));
    types.sort((a, b) => a.label.localeCompare(b.label));

    const categoryItems: (CategoryItem | DocItem | SidebarItem)[] = [...primary];

    if (types.length > 0) {
      categoryItems.push({
        type: "category",
        label: "Types & Options",
        collapsed: true,
        collapsible: true,
        items: types,
      });
    }

    result.push({
      type: "category",
      label: cat,
      items: categoryItems,
    });
  }
  return result;
}

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    "intro",
    {
      type: "category",
      label: "Guides",
      items: ["guides/getting-started", "guides/core-concepts"],
    },
    {
      type: "category",
      label: "API Reference",
      link: {
        type: "doc",
        id: "api/index",
      },
      items: buildCategorySidebar(typedocSidebar),
    },
  ],
};

export default sidebars;
