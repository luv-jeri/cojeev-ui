import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { exampleSource } from "../components/example-source";

test("copied examples retain imported dependencies of their shared props type", async () => {
  const source = await exampleSource("slider", "rubber");
  const parsed = ts.createSourceFile("copied.tsx", source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const imports = parsed.statements.filter(ts.isImportDeclaration).filter(node =>
    ts.isStringLiteral(node.moduleSpecifier) && node.moduleSpecifier.text === "@/lib/cojeev/control-appearance"
  );
  const importedTypes = imports.flatMap(node => {
    const bindings = node.importClause?.namedBindings;
    return node.importClause?.isTypeOnly && bindings && ts.isNamedImports(bindings)
      ? bindings.elements.map(item => item.name.text) : [];
  });
  assert.ok(importedTypes.includes("ControlRadius"), "copied radius types need their installed import");
  assert.ok(importedTypes.includes("FieldAppearance"), "copied field types need their installed import");
  assert.match(source, /radius\?: ControlRadius/);
  assert.match(source, /variant="rubber"/);
  assert.ok(!source.includes('@/registry/'));
  assert.equal(source.match(/import \* as React from "react"/g)?.length, 1);
});
