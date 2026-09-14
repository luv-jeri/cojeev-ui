import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { format } from "prettier";
import {
  exampleManifest,
  type ExampleId,
} from "@/components/examples/manifest";

// Read the same example functions that the live preview renders. This module only
// runs on the server during static builds and development page requests.
const cache = new Map<
  string,
  { code: string; name: string; modified: string }
>();
export async function exampleSource(
  id: string,
  variant = "default",
  size: string | string[] = "default",
) {
  const entry = exampleManifest[id as ExampleId];
  if (!entry) throw new Error(`Missing documentation example: ${id}`);
  const filename = path.join(
    process.cwd(),
    "components",
    "examples",
    `${entry.file}.tsx`,
  );
  const propsFilename = path.join(
    process.cwd(),
    "components",
    "examples",
    "types.ts",
  );
  const modified = `${fs.statSync(filename).mtimeMs}:${fs.statSync(propsFilename).mtimeMs}`;
  let source = cache.get(id);
  if (!source || source.modified !== modified) {
    const text = fs.readFileSync(filename, "utf8");
    const tree = ts.createSourceFile(
      filename,
      text,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const declaration = tree.statements.find(
      (node) =>
        ts.isFunctionDeclaration(node) && node.name?.text === entry.name,
    );
    if (!declaration)
      throw new Error(`Missing example function: ${entry.name}`);
    const identifiers = new Set<string>();
    function visit(node: ts.Node) {
      if (ts.isIdentifier(node)) identifiers.add(node.text);
      ts.forEachChild(node, visit);
    }
    visit(declaration);
    // A runnable example includes its local datasets, types and helper functions.
    // Follow only declarations referenced by the selected example, recursively.
    const localDeclarations = new Map<string, ts.Statement>();
    for (const statement of tree.statements) {
      if (
        (ts.isFunctionDeclaration(statement) ||
          ts.isTypeAliasDeclaration(statement) ||
          ts.isInterfaceDeclaration(statement) ||
          ts.isEnumDeclaration(statement) ||
          ts.isClassDeclaration(statement)) &&
        statement.name
      ) {
        localDeclarations.set(statement.name.text, statement);
      } else if (ts.isVariableStatement(statement)) {
        for (const variable of statement.declarationList.declarations) {
          if (ts.isIdentifier(variable.name))
            localDeclarations.set(variable.name.text, statement);
        }
      }
    }
    const included = new Set<ts.Statement>([declaration]);
    for (const name of identifiers) {
      const helper = localDeclarations.get(name);
      if (helper && !included.has(helper)) {
        included.add(helper);
        visit(helper);
      }
    }
    const imports: string[] = [];
    const importedNames = new Set<string>();
    const needsImport = (name: string) => {
      if (!identifiers.has(name) || importedNames.has(name)) return false;
      importedNames.add(name);
      return true;
    };
    function collectImports(importTree: ts.SourceFile) {
      for (const statement of importTree.statements) {
        if (
          !ts.isImportDeclaration(statement) ||
          !statement.importClause ||
          !ts.isStringLiteral(statement.moduleSpecifier)
        )
          continue;
        const specifier = statement.moduleSpecifier.text;
        if (specifier === "./types") continue;
        const clause = statement.importClause;
        const bindings = clause.namedBindings;
        const moduleName = specifier
          .replace("@/registry/cojeev/ui/", "@/components/ui/")
          .replace("@/registry/cojeev/lib/utils", "@/lib/utils")
          .replace("@/registry/cojeev/lib/", "@/lib/cojeev/")
          .replace("@/registry/cojeev/motion/", "@/lib/cojeev-motion/");
        if (clause.name && needsImport(clause.name.text))
          imports.push(
            `import ${clause.isTypeOnly ? "type " : ""}${clause.name.text} from "${moduleName}";`,
          );
        if (
          bindings &&
          ts.isNamespaceImport(bindings) &&
          needsImport(bindings.name.text)
        )
          imports.push(
            `import * as ${bindings.name.text} from "${moduleName}";`,
          );
        if (bindings && ts.isNamedImports(bindings)) {
          const names = bindings.elements
            .filter((binding) => needsImport(binding.name.text))
            .map((binding) => binding.getText(importTree));
          if (names.length)
            imports.push(
              `import ${clause.isTypeOnly ? "type " : ""}{ ${names.join(", ")} } from "${moduleName}";`,
            );
        }
      }
    }
    collectImports(tree);
    let propType = "";
    if (identifiers.has("ExampleProps")) {
      const propsTree = ts.createSourceFile(
        propsFilename,
        fs.readFileSync(propsFilename, "utf8"),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
      );
      const propsDeclaration = propsTree.statements.find(
        (statement) =>
          ts.isTypeAliasDeclaration(statement) &&
          statement.name.text === "ExampleProps",
      );
      if (!propsDeclaration)
        throw new Error("Missing shared ExampleProps declaration");
      visit(propsDeclaration);
      collectImports(propsTree);
      propType = `${propsDeclaration.getText(propsTree).replace(/^export\s+/, "")}\n\n`;
    }
    source = {
      modified,
      code: await format(
        `"use client";\n\n${imports.join("\n")}\n\n${propType}${tree.statements
          .filter((statement) => included.has(statement))
          .map((statement) => statement.getText(tree))
          .join("\n\n")}`,
        { parser: "typescript", printWidth: 80, tabWidth: 2 },
      ),
      name: entry.name,
    };
    cache.set(id, source);
  }
  const sizes = Array.isArray(size) ? size : [size];
  const instances = sizes.map(
    (item) =>
      `<${source.name}${variant !== "default" ? ` variant="${variant}"` : ""}${item !== "default" ? ` size="${item}"` : ""} />`,
  );
  const content =
    instances.length === 1
      ? instances[0]
      : `<div style={{ display: "grid", gap: 24 }}>\n      ${instances.join("\n      ")}\n    </div>`;
  return `${source.code.trimEnd()}\n\nexport default function Demo() {\n  return (\n    ${content}\n  );\n}\n`;
}
