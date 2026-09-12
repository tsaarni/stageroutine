/**
 * Remark plugin to strip hidden lines from code blocks in documentation pages.
 *
 * Supported conventions:
 * - `// hide-next-line` (or `/* hide-next-line *\/`) - hides the immediately following line
 * - `// hide-start` ... `// hide-end` (or `/* hide-start *\/` ... `/* hide-end *\/`) - hides all lines between start and end
 * - `// hide-line` at the end of a line - hides the entire line
 */

interface AstNode {
  type: string;
  value?: string;
  children?: AstNode[];
  [key: string]: unknown;
}

export function stripHiddenCodeLines(code: string): string {
  const lines = code.replace(/\r\n/g, "\n").split("\n");
  const result: string[] = [];
  let hiding = false;
  let skipNext = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for hide-start
    if (/^\s*(?:\/\/|\/\*)\s*hide-start(?:\s*\*\/)?\s*$/i.test(line)) {
      hiding = true;
      continue;
    }

    // Check for hide-end
    if (/^\s*(?:\/\/|\/\*)\s*hide-end(?:\s*\*\/)?\s*$/i.test(line)) {
      hiding = false;
      continue;
    }

    // Check for hide-next-line
    if (/^\s*(?:\/\/|\/\*)\s*hide-next-line(?:\s*\*\/)?\s*$/i.test(line)) {
      skipNext = true;
      continue;
    }

    // Inside a hide-start ... hide-end block
    if (hiding) {
      continue;
    }

    // Line targeted by hide-next-line
    if (skipNext) {
      skipNext = false;
      continue;
    }

    // Trailing inline comment: e.g. `stage.pause(); // hide-line`
    if (/(?:\/\/|\/\*)\s*hide-line(?:\s*\*\/)?\s*$/i.test(line)) {
      continue;
    }

    result.push(line);
  }

  // Trim trailing empty lines that were left by stripping lines at the end
  while (result.length > 0 && result[result.length - 1].trim() === "") {
    result.pop();
  }

  return result.join("\n");
}

export function remarkHideCodeLines() {
  return (tree: AstNode) => {
    function walk(node: AstNode) {
      if (!node || typeof node !== "object") return;
      if (node.type === "code" && typeof node.value === "string") {
        node.value = stripHiddenCodeLines(node.value);
      }
      if (Array.isArray(node.children)) {
        for (const child of node.children) {
          walk(child);
        }
      }
    }
    walk(tree);
  };
}
