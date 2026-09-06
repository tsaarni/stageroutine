/**
 * Public API Surface Reporter & Validator
 *
 * Why:
 *   Tracks and locks the public API surface of the package across releases.
 *   Prevents accidental breaking changes and catches internal types that are
 *   exposed in function signatures but forgotten from public exports.
 *
 * What it inspects:
 *   All package entry points defined under "exports" in package.json (e.g. ".",
 *   "./backgrounds", "./overlays", etc.), examining exported functions, classes,
 *   interfaces, type aliases, enums, and constants alongside their JSDoc comments.
 *
 * How:
 *   Uses the TypeScript Compiler API (ts.createProgram, ts.TypeChecker) to parse
 *   source files, extract declarations and signatures, and trace referenced types
 *   to ensure all exposed types are properly exported.
 *
 * What it produces:
 *   A formatted Markdown report at `etc/api-report.md` listing the entire public
 *   API surface, documentation, and any diagnostic warnings for unexported types.
 *
 * How to run:
 *   pnpm api:report                 # Generate and update etc/api-report.md
 *   pnpm api:report -- --check      # Check if etc/api-report.md is up-to-date (used in CI)
 *   pnpm api:report -- --strict     # Fail if there are unexported types or warnings
 *   pnpm api:report -- --stdout     # Output markdown directly to stdout
 */

import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

interface EntryPoint {
  readonly name: string;
  readonly file: string;
}

interface ExportItem {
  readonly name: string;
  readonly category: "function" | "class" | "interface" | "type" | "enum" | "variable";
  readonly signature: string;
  readonly doc?: string;
}

interface EntryResult {
  readonly name: string;
  readonly warnings: string[];
  readonly items: ExportItem[];
}

const ROOT_DIR = process.cwd();
const PRINTER = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

function getEntryPointsFromPackageJson(): readonly EntryPoint[] {
  const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT_DIR, "package.json"), "utf8"));
  const entries: EntryPoint[] = [];

  for (const [subpath, target] of Object.entries(pkg.exports ?? {})) {
    const targetObj =
      typeof target === "object" && target !== null
        ? (target as { types?: string; import?: string })
        : null;
    const entryFile = typeof target === "string" ? target : (targetObj?.types ?? targetObj?.import);

    if (
      typeof entryFile === "string" &&
      (entryFile.endsWith(".ts") || entryFile.endsWith(".tsx"))
    ) {
      const cleanSubpath = subpath.replace(/^\.\/?/, "");
      entries.push({
        name: cleanSubpath ? `${pkg.name}/${cleanSubpath}` : pkg.name,
        file: entryFile.replace(/^\.\//, ""),
      });
    }
  }

  return entries;
}

function cleanTypeString(text: string): string {
  return text.replace(
    /import\("(?:\.{1,2}\/|\/|[A-Za-z]:[/\\]|src\/)[^"]*"\)\.([A-Za-z0-9_$]+(?:\.[A-Za-z0-9_$]+)*)/g,
    "$1",
  );
}

function printNode(node: ts.Node): string {
  return cleanTypeString(
    PRINTER.printNode(ts.EmitHint.Unspecified, node, node.getSourceFile()).trim(),
  );
}

function formatJSDoc(symbol: ts.Symbol, checker?: ts.TypeChecker, indent = ""): string | undefined {
  const parts: string[] = [];

  const deprecatedTag = symbol.getJsDocTags(checker).find((t) => t.name === "deprecated");
  if (deprecatedTag) {
    const comment = deprecatedTag.text ? ts.displayPartsToString(deprecatedTag.text).trim() : "";
    parts.push(comment ? `@deprecated ${comment}` : "@deprecated");
  }

  const doc = ts.displayPartsToString(symbol.getDocumentationComment(checker)).trim();
  if (doc) {
    parts.push(doc);
  }

  const otherTags = symbol
    .getJsDocTags(checker)
    .filter((t) => t.name !== "deprecated" && t.name !== "internal" && t.name !== "category");

  for (const tag of otherTags) {
    const text = tag.text ? ts.displayPartsToString(tag.text).trim() : "";
    parts.push(text ? `@${tag.name} ${text}` : `@${tag.name}`);
  }

  if (parts.length === 0) return undefined;

  const lines = parts.flatMap((p) => p.split("\n").map((l) => l.trimEnd()));

  if (lines.length === 1 && !lines[0].startsWith("@")) {
    return `${indent}/** ${lines[0]} */`;
  }

  return [
    `${indent}/**`,
    ...lines.map((line) => `${indent} *${line ? ` ${line}` : ""}`),
    `${indent} */`,
  ].join("\n");
}

function formatSignatureJSDoc(
  sig: ts.Signature,
  checker?: ts.TypeChecker,
  indent = "",
): string | undefined {
  const parts: string[] = [];

  const deprecatedTag = sig.getJsDocTags().find((t) => t.name === "deprecated");
  if (deprecatedTag) {
    const comment = deprecatedTag.text ? ts.displayPartsToString(deprecatedTag.text).trim() : "";
    parts.push(comment ? `@deprecated ${comment}` : "@deprecated");
  }

  const doc = ts.displayPartsToString(sig.getDocumentationComment(checker)).trim();
  if (doc) {
    parts.push(doc);
  }

  const otherTags = sig
    .getJsDocTags()
    .filter((t) => t.name !== "deprecated" && t.name !== "internal" && t.name !== "category");

  for (const tag of otherTags) {
    const text = tag.text ? ts.displayPartsToString(tag.text).trim() : "";
    parts.push(text ? `@${tag.name} ${text}` : `@${tag.name}`);
  }

  if (parts.length === 0) return undefined;

  const lines = parts.flatMap((p) => p.split("\n").map((l) => l.trimEnd()));

  if (lines.length === 1 && !lines[0].startsWith("@")) {
    return `${indent}/** ${lines[0]} */`;
  }

  return [
    `${indent}/**`,
    ...lines.map((line) => `${indent} *${line ? ` ${line}` : ""}`),
    `${indent} */`,
  ].join("\n");
}

function isInternalProjectSymbol(symbol: ts.Symbol | undefined, program: ts.Program): boolean {
  if (!symbol || symbol.flags & ts.SymbolFlags.TypeParameter || symbol.name.startsWith("__")) {
    return false;
  }

  const parent = (symbol as { parent?: ts.Symbol }).parent;
  if (parent && (parent.name === "JSX" || parent.name === "global")) {
    return false;
  }

  const decl = symbol.declarations?.[0];
  if (!decl) return false;
  const sourceFile = decl.getSourceFile();
  return (
    !program.isSourceFileDefaultLibrary(sourceFile) &&
    !program.isSourceFileFromExternalLibrary(sourceFile) &&
    sourceFile.fileName.includes("/src/")
  );
}

function collectReferencedProjectSymbols(
  type: ts.Type,
  program: ts.Program,
  checker: ts.TypeChecker,
  visited = new Set<ts.Type>(),
): ts.Symbol[] {
  if (visited.has(type)) return [];
  visited.add(type);

  const symbols: ts.Symbol[] = [];

  if (type.aliasSymbol && isInternalProjectSymbol(type.aliasSymbol, program)) {
    symbols.push(type.aliasSymbol);
  }
  if (type.aliasTypeArguments) {
    for (const arg of type.aliasTypeArguments) {
      symbols.push(...collectReferencedProjectSymbols(arg, program, checker, visited));
    }
  }

  const sym = type.getSymbol();
  if (sym && isInternalProjectSymbol(sym, program)) {
    const isTypeSymbol = Boolean(
      sym.flags &
        (ts.SymbolFlags.Class |
          ts.SymbolFlags.Interface |
          ts.SymbolFlags.TypeAlias |
          ts.SymbolFlags.Enum),
    );
    if (isTypeSymbol) symbols.push(sym);
  }

  if (type.isUnionOrIntersection()) {
    for (const subType of type.types) {
      symbols.push(...collectReferencedProjectSymbols(subType, program, checker, visited));
    }
  }

  if (type.flags & ts.TypeFlags.Object) {
    const objType = type as ts.ObjectType;
    if (objType.objectFlags & ts.ObjectFlags.Reference) {
      for (const arg of checker.getTypeArguments(type as ts.TypeReference)) {
        symbols.push(...collectReferencedProjectSymbols(arg, program, checker, visited));
      }
    }
  }

  return symbols;
}

function inspectEntryPoint(
  entry: EntryPoint,
  program: ts.Program,
  checker: ts.TypeChecker,
  packageExportsMap: Map<string, string[]>,
): EntryResult {
  const absPath = path.resolve(ROOT_DIR, entry.file);
  const sourceFile = program.getSourceFile(absPath);
  if (!sourceFile) {
    throw new Error(`Could not find source file: ${entry.file}`);
  }

  const moduleSymbol = checker.getSymbolAtLocation(sourceFile);
  if (!moduleSymbol) {
    return {
      name: entry.name,
      warnings: [`No exports found in ${entry.file}`],
      items: [],
    };
  }

  const exports = checker.getExportsOfModule(moduleSymbol);
  const exportedNames = new Set(exports.map((e) => e.name));
  const warnings = new Set<string>();

  const checkType = (type: ts.Type, contextDesc: string) => {
    for (const sym of collectReferencedProjectSymbols(type, program, checker)) {
      if (exportedNames.has(sym.name)) continue;

      const availableIn = packageExportsMap.get(sym.name);
      if (availableIn && availableIn.length > 0) {
        warnings.add(
          `${contextDesc} uses type \`${sym.name}\` (not exported in \`${entry.name}\`, but exported in \`${availableIn.join(", ")}\`).`,
        );
      } else {
        warnings.add(`${contextDesc} uses unexported internal type \`${sym.name}\`.`);
      }
    }
  };

  const checkSignatureTypes = (
    sig: ts.Signature,
    returnDesc: string,
    paramDesc: (paramName: string) => string,
  ) => {
    checkType(checker.getReturnTypeOfSignature(sig), returnDesc);
    for (const param of sig.getParameters()) {
      const paramDecl = param.declarations?.[0];
      if (paramDecl) {
        checkType(checker.getTypeOfSymbolAtLocation(param, paramDecl), paramDesc(param.name));
      }
    }
  };

  const checkHeritageClauses = (
    clauses: readonly ts.HeritageClause[] | undefined,
    targetDesc: string,
  ) => {
    if (!clauses) return;
    for (const hc of clauses) {
      for (const typeNode of hc.types) {
        checkType(checker.getTypeFromTypeNode(typeNode), `${targetDesc} heritage clause`);
      }
    }
  };

  const sortedExports = [...exports].sort((a, b) => a.name.localeCompare(b.name));
  const items: ExportItem[] = [];

  for (const exp of sortedExports) {
    const target = exp.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(exp) : exp;
    const decl = target.declarations?.[0];
    const doc = formatJSDoc(exp, checker) ?? formatJSDoc(target, checker);

    // 1. Functions (with overload support)
    const funcDecls = target.declarations?.filter(ts.isFunctionDeclaration);
    if (funcDecls && funcDecls.length > 0) {
      const type = checker.getTypeOfSymbolAtLocation(target, sourceFile);
      const callSignatures = type.getCallSignatures();

      if (callSignatures.length > 0) {
        for (const sig of callSignatures) {
          const sigDoc = formatSignatureJSDoc(sig, checker) ?? doc;
          const sigStr = checker.signatureToString(
            sig,
            sourceFile,
            ts.TypeFormatFlags.NoTruncation,
          );
          items.push({
            name: exp.name,
            category: "function",
            signature: cleanTypeString(`export function ${exp.name}${sigStr};`),
            doc: sigDoc,
          });

          checkSignatureTypes(
            sig,
            `Function \`${exp.name}()\` return type`,
            (name) => `Parameter \`${name}\` of \`${exp.name}()\``,
          );
        }
        continue;
      }
    }

    // 2. Class
    if (decl && ts.isClassDeclaration(decl)) {
      const constructorType = checker.getTypeOfSymbolAtLocation(target, decl);
      const instanceType = checker.getDeclaredTypeOfSymbol(target);

      const isAbstract =
        ts.canHaveModifiers(decl) &&
        ts.getModifiers(decl)?.some((m) => m.kind === ts.SyntaxKind.AbstractKeyword);
      const classKeyword = isAbstract ? "export abstract class" : "export class";

      const typeParamsStr = decl.typeParameters?.length
        ? `<${decl.typeParameters.map((tp) => printNode(tp)).join(", ")}>`
        : "";

      const heritageStr = decl.heritageClauses
        ? ` ${cleanTypeString(decl.heritageClauses.map((hc) => printNode(hc)).join(" "))}`
        : "";
      checkHeritageClauses(decl.heritageClauses, `Class \`${exp.name}\``);

      const members: string[] = [];

      for (const sig of constructorType.getConstructSignatures()) {
        const sigDoc = formatSignatureJSDoc(sig, checker, "  ");
        if (sigDoc) {
          members.push(sigDoc);
        }
        const sigStr = checker.signatureToString(sig, sourceFile, ts.TypeFormatFlags.NoTruncation);
        members.push(`  constructor${cleanTypeString(sigStr)};`);
      }

      const formatMembers = (props: ts.Symbol[], isStatic: boolean) => {
        for (const prop of props) {
          if (
            isStatic &&
            (prop.name === "prototype" || prop.name === "length" || prop.name === "name")
          ) {
            continue;
          }
          const propDecl = prop.declarations?.[0];
          if (!propDecl) continue;

          const modifiers = ts.canHaveModifiers(propDecl) ? ts.getModifiers(propDecl) : undefined;
          const isPrivate = modifiers?.some(
            (m) =>
              m.kind === ts.SyntaxKind.PrivateKeyword || m.kind === ts.SyntaxKind.ProtectedKeyword,
          );
          if (!isStatic && (isPrivate || prop.name.startsWith("_"))) continue;

          const memberDoc = formatJSDoc(prop, checker, "  ");
          const isReadonly =
            !isStatic && modifiers?.some((m) => m.kind === ts.SyntaxKind.ReadonlyKeyword);
          const propType = checker.getTypeOfSymbolAtLocation(prop, propDecl);
          const propSigs = propType.getCallSignatures();

          if (propSigs.length > 0) {
            const prefix = isStatic ? "static " : "";
            for (const s of propSigs) {
              const sigDoc = formatSignatureJSDoc(s, checker, "  ") ?? memberDoc;
              if (sigDoc) {
                members.push(sigDoc);
              }
              const sigStr = checker.signatureToString(
                s,
                sourceFile,
                ts.TypeFormatFlags.NoTruncation,
              );
              members.push(`  ${prefix}${prop.name}${cleanTypeString(sigStr)};`);
            }
          } else {
            if (memberDoc) {
              members.push(memberDoc);
            }
            const prefix = isStatic ? "static " : isReadonly ? "readonly " : "";
            const typeStr = checker.typeToString(
              propType,
              sourceFile,
              ts.TypeFormatFlags.NoTruncation,
            );
            members.push(`  ${prefix}${prop.name}: ${cleanTypeString(typeStr)};`);
          }
        }
      };

      formatMembers(checker.getPropertiesOfType(constructorType), true);
      formatMembers(checker.getPropertiesOfType(instanceType), false);

      const classHeader = [classKeyword, `${exp.name}${typeParamsStr}`, heritageStr.trim()]
        .filter(Boolean)
        .join(" ");

      items.push({
        name: exp.name,
        category: "class",
        signature: `${classHeader} {\n${members.join("\n")}\n}`,
        doc,
      });
      continue;
    }

    // 3. Enums
    if (decl && ts.isEnumDeclaration(decl)) {
      items.push({
        name: exp.name,
        category: "enum",
        signature: printNode(decl),
        doc,
      });
      continue;
    }

    // 4. Interfaces
    if (decl && ts.isInterfaceDeclaration(decl)) {
      items.push({
        name: exp.name,
        category: "interface",
        signature: printNode(decl),
        doc,
      });

      checkHeritageClauses(decl.heritageClauses, `Interface \`${exp.name}\``);

      const ifaceType = checker.getDeclaredTypeOfSymbol(target);
      for (const prop of checker.getPropertiesOfType(ifaceType)) {
        if (prop.name.startsWith("_")) continue;
        const propDecl = prop.declarations?.[0];
        if (!propDecl) continue;
        const propType = checker.getTypeOfSymbolAtLocation(prop, propDecl);
        const sigs = propType.getCallSignatures();

        if (sigs.length > 0) {
          for (const sig of sigs) {
            checkSignatureTypes(
              sig,
              `Method \`${prop.name}()\` return type of interface \`${exp.name}\``,
              (name) =>
                `Parameter \`${name}\` of method \`${prop.name}()\` in interface \`${exp.name}\``,
            );
          }
        } else {
          checkType(propType, `Property \`${prop.name}\` of interface \`${exp.name}\``);
        }
      }
      continue;
    }

    // 5. Type Aliases
    if (decl && ts.isTypeAliasDeclaration(decl)) {
      items.push({
        name: exp.name,
        category: "type",
        signature: printNode(decl),
        doc,
      });

      checkType(checker.getTypeFromTypeNode(decl.type), `Type alias \`${exp.name}\``);
      continue;
    }

    // 6. Variables / Constants
    const type = checker.getTypeOfSymbolAtLocation(exp, sourceFile);
    const typeStr = checker.typeToString(type, sourceFile, ts.TypeFormatFlags.NoTruncation);
    items.push({
      name: exp.name,
      category: "variable",
      signature: cleanTypeString(`export const ${exp.name}: ${typeStr};`),
      doc,
    });

    checkType(type, `Constant \`${exp.name}\``);
  }

  return {
    name: entry.name,
    warnings: Array.from(warnings).sort(),
    items,
  };
}

const ENTRY_POINT_DESCRIPTIONS: Record<string, string> = {
  stageroutine:
    "Primary entry point providing the stage director, built-in components, motion transitions, decorators, and layout functions.",
  "stageroutine/backgrounds":
    "Procedural WebGL and canvas background renderers, packaged separately to keep 2D presentations lightweight.",
  "stageroutine/overlays":
    "Interactive presentation overlays mounted above the stage, including laser pointer and navigation controls.",
  "stageroutine/presenter":
    "Presenter console synchronization client over BroadcastChannel and in-browser screen recorder.",
  "stageroutine/jsx-runtime":
    "Production JSX factory compiling TSX markup directly into native DOM elements without a virtual DOM.",
  "stageroutine/jsx-dev-runtime":
    "Development JSX factory providing element creation with debugging metadata and source inspection.",
  "stageroutine/vite":
    "Vite plugin configuring JSX transforms, automatic icon resolution, and presenter view routing.",
};

export function generateApiReport(): { content: string; warningCount: number } {
  const configPath = ts.findConfigFile(ROOT_DIR, ts.sys.fileExists, "tsconfig.json");
  if (!configPath) {
    throw new Error("Could not find tsconfig.json");
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile);
  const parsedCommandLine = ts.parseJsonConfigFileContent(configFile.config, ts.sys, ROOT_DIR);

  const entryPoints = getEntryPointsFromPackageJson();
  const entryFilePaths = entryPoints.map((e) => path.resolve(ROOT_DIR, e.file));

  const program = ts.createProgram({
    rootNames: entryFilePaths,
    options: {
      ...parsedCommandLine.options,
      declaration: true,
      noEmit: true,
    },
  });

  const checker = program.getTypeChecker();

  // Pre-pass: Map each exported symbol to the entry points exporting it
  const packageExportsMap = new Map<string, string[]>();
  for (const entry of entryPoints) {
    const absPath = path.resolve(ROOT_DIR, entry.file);
    const sourceFile = program.getSourceFile(absPath);
    if (!sourceFile) continue;
    const modSymbol = checker.getSymbolAtLocation(sourceFile);
    if (!modSymbol) continue;
    for (const exp of checker.getExportsOfModule(modSymbol)) {
      const existing = packageExportsMap.get(exp.name) ?? [];
      existing.push(entry.name);
      packageExportsMap.set(exp.name, existing);
    }
  }

  const results = entryPoints.map((entry) =>
    inspectEntryPoint(entry, program, checker, packageExportsMap),
  );

  const lines: string[] = [
    "<!-- Generated by scripts/api-report.ts. Do not edit directly. -->",
    "",
    "# StageRoutine Public API Surface",
    "",
    "> Canonical snapshot of all exported runtime symbols, types, and documentation.",
    "> Run `pnpm api:report` to refresh.",
    "",
    "## How to Read This Document",
    "",
    "This document records all public symbols exported by StageRoutine. Each chapter documents one package entry point.",
    "Exports within a chapter are grouped into functions, classes, interfaces, types, and constants.",
    "Signatures define type constraints and parameters. JSDoc comments explain runtime behavior, options, default values, and measurement units.",
    "",
  ];

  // Warnings section
  const allWarnings = results.flatMap((r) => r.warnings.map((w) => `- \`[${r.name}]\` ${w}`));

  if (allWarnings.length > 0) {
    lines.push("## Diagnostics & Forgotten Exports", "");
    lines.push(...allWarnings);
    lines.push("");
  }

  // Summary table
  lines.push("## Summary", "");
  lines.push("| Entry Point | Exports |");
  lines.push("| :--- | :--- |");
  for (const r of results) {
    lines.push(`| \`${r.name}\` | ${r.items.length} symbols |`);
  }
  lines.push("");

  const sections = [
    { title: "Functions", category: "function", includeDoc: true },
    { title: "Classes", category: "class", includeDoc: true },
    { title: "Enums", category: "enum", includeDoc: true },
    { title: "Interfaces", category: "interface", includeDoc: false },
    { title: "Types", category: "type", includeDoc: false },
    { title: "Constants & Variables", category: "variable", includeDoc: true },
  ] as const;

  // Detailed entry point blocks
  for (const r of results) {
    lines.push(`## \`${r.name}\``, "");
    const description =
      ENTRY_POINT_DESCRIPTIONS[r.name] ??
      `Exports and types available from the \`${r.name}\` entry point.`;
    lines.push(description, "");

    for (const { title, category, includeDoc } of sections) {
      const categoryItems = r.items.filter((i) => i.category === category);
      if (categoryItems.length === 0) continue;

      lines.push(`### ${title}`, "", "```ts");
      let lastPrintedName = "";
      let lastPrintedDoc = "";
      for (const item of categoryItems) {
        if (
          includeDoc &&
          item.doc &&
          (item.name !== lastPrintedName || item.doc !== lastPrintedDoc)
        ) {
          lines.push(item.doc);
          lastPrintedDoc = item.doc;
        }
        lastPrintedName = item.name;
        lines.push(item.signature, "");
      }
      lines.push("```", "");
    }
  }

  return {
    content: `${lines.join("\n").trim()}\n`,
    warningCount: allWarnings.length,
  };
}

// CLI Execution & Flags
const args = new Set(process.argv.slice(2));
const isStdout = args.has("--stdout");
const isCheck = args.has("--check");
const isStrict = args.has("--strict");

const { content: reportContent, warningCount } = generateApiReport();
const outputPath = path.resolve(ROOT_DIR, "etc/api-report.md");

if (isStdout) {
  process.stdout.write(reportContent);
} else if (isCheck) {
  const existingContent = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : null;
  if (existingContent === null) {
    console.error("etc/api-report.md does not exist. Run pnpm api:report to generate it.");
    process.exit(1);
  }
  if (existingContent !== reportContent) {
    console.error("Public API report is outdated. Run pnpm api:report to update.");
    process.exit(1);
  }
  if (isStrict && warningCount > 0) {
    console.error(`Found ${warningCount} forgotten exports or diagnostic issues.`);
    process.exit(1);
  }
  console.log("Public API report is up to date.");
} else {
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, reportContent, "utf8");
  console.log(`Public API report written to ${path.relative(ROOT_DIR, outputPath)}`);
  if (isStrict && warningCount > 0) {
    console.error(`Found ${warningCount} forgotten exports or diagnostic issues.`);
    process.exit(1);
  }
}
