import { Children, isValidElement, type ReactNode } from "react";
import styles from "./FileTree.module.css";

interface FileTreeProps {
  title?: string;
  children: ReactNode;
}

interface TreeNode {
  name: string;
  comment?: string;
  isFolder: boolean;
  children: TreeNode[];
}

function FolderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <title>Folder</title>
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  );
}

function SvgVectorIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <title>Document</title>
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  );
}

function DefaultFileIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <title>File</title>
      <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
      <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    </svg>
  );
}

function isListElement(child: unknown): boolean {
  if (!isValidElement(child)) return false;
  if (child.type === "ul" || child.type === "ol") return true;
  const props = child.props as { originalType?: string; mdxType?: string } | null;
  if (
    props?.originalType === "ul" ||
    props?.originalType === "ol" ||
    props?.mdxType === "ul" ||
    props?.mdxType === "ol"
  ) {
    return true;
  }
  if (typeof child.type === "function") {
    const name = child.type.name.toLowerCase();
    if (name.includes("ul") || name.includes("ol") || name.includes("list")) return true;
  }
  return false;
}

function isListItemElement(child: unknown): boolean {
  if (!isValidElement(child)) return false;
  if (child.type === "li") return true;
  const props = child.props as { originalType?: string; mdxType?: string } | null;
  if (props?.originalType === "li" || props?.mdxType === "li") return true;
  if (typeof child.type === "function") {
    const name = child.type.name.toLowerCase();
    if (name.includes("li") || name.includes("listitem")) return true;
  }
  return false;
}

function parseComment(text: string): { name: string; comment?: string } {
  const hashIndex = text.indexOf(" # ");
  const slashIndex = text.indexOf(" // ");

  if (hashIndex !== -1 && (slashIndex === -1 || hashIndex < slashIndex)) {
    return {
      name: text.substring(0, hashIndex).trim(),
      comment: text.substring(hashIndex + 3).trim(),
    };
  }
  if (slashIndex !== -1) {
    return {
      name: text.substring(0, slashIndex).trim(),
      comment: text.substring(slashIndex + 4).trim(),
    };
  }
  return { name: text.trim() };
}

function parseTextLinesToTree(text: string): TreeNode[] {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const root: TreeNode = { name: "root", isFolder: true, children: [] };
  const stack: { node: TreeNode; indent: number }[] = [{ node: root, indent: -1 }];

  for (const rawLine of lines) {
    const indentMatch = rawLine.match(/^(\s*)/);
    const indent = indentMatch ? indentMatch[1].length : 0;
    let content = rawLine.trim();

    // Strip ASCII tree characters or markdown bullet prefixes
    content = content.replace(/^([│|]\s*)+/, "");
    content = content.replace(/^(├──|└──|\|--|\\--)\s*/, "");
    content = content.replace(/^[-*+]\s+/, "").trim();

    if (!content) continue;

    const { name, comment } = parseComment(content);
    const isFolder = name.endsWith("/");
    const node: TreeNode = { name, comment, isFolder, children: [] };

    while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
      stack.pop();
    }

    const parent = stack[stack.length - 1].node;
    parent.children.push(node);
    parent.isFolder = true;
    stack.push({ node, indent });
  }

  return root.children;
}

function extractText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }
  if (Array.isArray(node)) {
    return node.map(extractText).join("");
  }
  if (isValidElement(node) && node.props && (node.props as { children?: ReactNode }).children) {
    return extractText((node.props as { children?: ReactNode }).children);
  }
  return "";
}

function parseReactNodesToTree(children: ReactNode): TreeNode[] {
  const nodes: TreeNode[] = [];

  Children.forEach(children, (child) => {
    if (!child) return;

    if (typeof child === "string") {
      const trimmed = child.trim();
      if (trimmed) {
        const parsed = parseTextLinesToTree(child);
        nodes.push(...parsed);
      }
      return;
    }

    if (isValidElement(child)) {
      if (isListElement(child)) {
        const nested = parseReactNodesToTree((child.props as { children?: ReactNode }).children);
        nodes.push(...nested);
        return;
      }

      if (isListItemElement(child)) {
        const rawChildren = Children.toArray((child.props as { children?: ReactNode }).children);
        const nestedTree: TreeNode[] = [];
        let itemText = "";

        rawChildren.forEach((c) => {
          if (isListElement(c)) {
            const nested = parseReactNodesToTree(
              (c as React.ReactElement<{ children?: ReactNode }>).props.children,
            );
            nestedTree.push(...nested);
          } else if (typeof c === "string" || typeof c === "number") {
            itemText += String(c);
          } else if (isValidElement(c)) {
            itemText += extractText(c);
          }
        });

        const trimmedText = itemText.trim();
        if (trimmedText || nestedTree.length > 0) {
          const { name, comment } = parseComment(trimmedText);
          const isFolder = name.endsWith("/") || nestedTree.length > 0;
          nodes.push({
            name,
            comment,
            isFolder,
            children: nestedTree,
          });
        }
        return;
      }

      // If it's another container component (e.g. p, div, fragment), recurse on its children
      if ((child.props as { children?: ReactNode }).children) {
        const nested = parseReactNodesToTree((child.props as { children?: ReactNode }).children);
        nodes.push(...nested);
      }
    }
  });

  return nodes;
}

function getNodePresentation(isFolder: boolean, isSvg: boolean) {
  if (isFolder) {
    return {
      iconClass: styles.iconFolder,
      iconComponent: <FolderIcon />,
      nameClass: styles.folderName,
    };
  }
  if (isSvg) {
    return {
      iconClass: styles.iconSvg,
      iconComponent: <SvgVectorIcon />,
      nameClass: styles.fileName,
    };
  }
  return {
    iconClass: styles.iconFile,
    iconComponent: <DefaultFileIcon />,
    nameClass: styles.fileName,
  };
}

function renderTree(nodes: TreeNode[], isNested = false): ReactNode {
  return (
    <ul className={isNested ? styles.nestedList : styles.treeList}>
      {nodes.map((node) => {
        const isSvg = node.name.toLowerCase().endsWith(".svg");
        const { iconClass, iconComponent, nameClass } = getNodePresentation(node.isFolder, isSvg);

        return (
          <li className={styles.treeItem} key={`${node.name}-${node.comment || ""}`}>
            <div className={styles.row}>
              <div className={`${styles.icon} ${iconClass}`}>{iconComponent}</div>
              <span className={nameClass}>{node.name}</span>
              {node.comment && <span className={styles.comment}>{node.comment}</span>}
            </div>

            {node.children.length > 0 && renderTree(node.children, true)}
          </li>
        );
      })}
    </ul>
  );
}

export function FileTree({ title, children }: FileTreeProps) {
  const treeNodes = parseReactNodesToTree(children);

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.windowDots}>
          <span />
          <span />
          <span />
        </div>
        {title && <div className={styles.title}>{title}</div>}
        <div style={{ width: 39 }} />
      </div>
      <div className={styles.body}>{renderTree(treeNodes)}</div>
    </div>
  );
}
