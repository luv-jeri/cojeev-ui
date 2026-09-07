import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import {
  exampleManifest,
  type ExampleId,
} from "@/components/examples/manifest";

// Read the same example functions that the live preview renders. This module only
// runs on the server during the static documentation build.
const cache = new Map<string, { code: string; name: string }>();
export function exampleSource(
  id: string,
  variant = "default",
  size: string | string[] = "default",
) {
  const entry = exampleManifest[id as ExampleId];
  if (!entry) throw new Error(`Missing documentation example: ${id}`);
  let source = cache.get(id);
  if (!source) {
    const filename = path.join(
      process.cwd(),
      "components",
      "examples",
      `${entry.file}.tsx`,
    );
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
    const imports: string[] = [];
    for (const statement of tree.statements) {
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
      const moduleName = specifier.replace(
        "@/registry/sahajiv/ui/",
        "@/components/ui/",
      );
      if (
        bindings &&
        ts.isNamespaceImport(bindings) &&
        identifiers.has(bindings.name.text)
      )
        imports.push(`import * as ${bindings.name.text} from "${moduleName}";`);
      if (bindings && ts.isNamedImports(bindings)) {
        const names = bindings.elements
          .filter((binding) => identifiers.has(binding.name.text))
          .map((binding) => binding.getText(tree));
        if (names.length)
          imports.push(`import { ${names.join(", ")} } from "${moduleName}";`);
      }
    }
    const propType = identifiers.has("ExampleProps")
      ? "type ExampleProps = { variant?: string; size?: string };\n\n"
      : "";
    source = {
      code: `"use client";\n\n${imports.join("\n")}\n\n${propType}${declaration.getText(tree)}`,
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
  return `${source.code}\n\nexport default function Demo() {\n  return (\n    ${content}\n  );\n}\n`;
}
