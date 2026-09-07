#!/usr/bin/env node
// Compile the code users copy, rather than its surrounding preview module.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import ts from "typescript";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// Preload tsx in a child so both ESM and CJS aliases in the real extractor work.
if (process.env.SAHAJIV_EXAMPLE_SOURCE_CHILD !== "1") {
  const child = spawnSync(process.execPath, ["--import", "tsx", fileURLToPath(import.meta.url), ...process.argv.slice(2)], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, SAHAJIV_EXAMPLE_SOURCE_CHILD: "1" },
  });
  if (child.error) console.error(child.error.message);
  process.exit(child.status ?? 1);
}
process.chdir(root);
const { exampleSource } = await import("../components/example-source.ts");
const { exampleManifest } = await import("../components/examples/manifest.ts");
const registry = JSON.parse(fs.readFileSync(path.join(root, "registry.json"), "utf8"));
const catalog = registry.items.filter(item => item.type === "registry:ui");
const sourceIds = fs.readdirSync(path.join(root, "registry/sahajiv/ui")).filter(file => file.endsWith(".tsx")).map(file => file.slice(0, -4)).sort();
const manifestIds = Object.keys(exampleManifest).sort();
const catalogIds = catalog.map(item => item.name).sort();
const coverageErrors = [];
for (const id of new Set([...sourceIds, ...manifestIds, ...catalogIds])) {
  if (!sourceIds.includes(id)) coverageErrors.push(`${id}: missing production UI module`);
  if (!manifestIds.includes(id)) coverageErrors.push(`${id}: missing example manifest entry`);
  if (!catalogIds.includes(id)) coverageErrors.push(`${id}: missing generated UI catalog entry; run registry:build`);
}
const temporary = fs.mkdtempSync(path.join(root, ".example-source-check-"));
const rows = [];
const extractionErrors = [];
const outputIndex = process.argv.indexOf("--output");
const output = path.resolve(root, outputIndex >= 0 ? process.argv[outputIndex + 1] : "artifacts/example-source/results.json");
const keep = process.argv.includes("--keep");
let diagnostics = [];
try {
  for (const entry of catalog) {
    if (!exampleManifest[entry.name]) continue;
    const variants = [...new Set(["default", ...(entry.meta.source.variants ?? [])])];
    const sizes = [...new Set(["default", ...(entry.meta.source.sizes ?? [])])];
    const cases = variants.flatMap(variant => sizes.map(size => ({ variant, size })));
    // Also exercise the extractor's public multi-size wrapper when meaningful.
    if (sizes.length > 1) cases.push({ variant: variants[1] ?? "default", size: sizes });
    for (const { variant, size } of cases) {
      const key = `${entry.name}__${variant}__${Array.isArray(size) ? "all-sizes" : size}`;
      if (!/^[a-z0-9_-]+$/.test(key)) throw new Error(`Unsafe example case key: ${key}`);
      const filename = path.join(temporary, `${key}.tsx`);
      const row = { id: entry.name, variant, size, file: path.basename(filename), status: "PASS", diagnostics: [] };
      rows.push(row);
      try {
        const code = exampleSource(entry.name, variant, size);
        const tree = ts.createSourceFile(filename, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
        for (const statement of tree.statements) {
          if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
          const moduleName = statement.moduleSpecifier.text;
          if ((moduleName.startsWith("@/") && !moduleName.startsWith("@/components/ui/")) || moduleName.startsWith(".") || path.isAbsolute(moduleName)) {
            throw new Error(`Copied source depends on a repository-local module: ${moduleName}`);
          }
        }
        fs.writeFileSync(filename, code);
        row.sha256 = createHash("sha256").update(code).digest("hex");
      } catch (error) {
        row.status = "FAIL";
        row.diagnostics.push(error.message);
        extractionErrors.push(`${key}: ${error.message}`);
      }
    }
  }
  const options = {
    target: ts.ScriptTarget.ES2017,
    lib: ["lib.dom.d.ts", "lib.dom.iterable.d.ts", "lib.esnext.d.ts"],
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    jsx: ts.JsxEmit.ReactJSX,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    esModuleInterop: true,
    resolveJsonModule: true,
    isolatedModules: true,
    paths: {
      "@/components/ui/*": [path.join(root, "registry/sahajiv/ui/*")],
      "@/*": [path.join(root, "*")],
    },
  };
  const files = rows.filter(row => row.sha256).map(row => path.join(temporary, row.file));
  const program = ts.createProgram(files, options);
  diagnostics = ts.getPreEmitDiagnostics(program).map(diagnostic => {
    const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
    const location = diagnostic.file && diagnostic.start !== undefined ? diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start) : null;
    const file = diagnostic.file?.fileName;
    const result = { file: file?.startsWith(temporary + path.sep) ? path.basename(file) : file ? path.relative(root, file) : null, line: location ? location.line + 1 : null, column: location ? location.character + 1 : null, code: diagnostic.code, message };
    const row = file?.startsWith(temporary + path.sep) && rows.find(row => row.file === path.basename(file));
    if (row) { row.status = "FAIL"; row.diagnostics.push(result); }
    return result;
  });
  const passed = !coverageErrors.length && !extractionErrors.length && !diagnostics.length;
  const revision = spawnSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" });
  const result = { passed, revision: revision.status === 0 ? revision.stdout.trim() : null, sourceComponents: sourceIds.length, catalogComponents: catalogIds.length, manifestComponents: manifestIds.length, defaultSnippets: rows.filter(row => row.variant === "default" && row.size === "default").length, snippets: rows.length, coverageErrors, extractionErrors, diagnostics, rows };
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(result, null, 2) + "\n");
  for (const error of [...coverageErrors, ...extractionErrors]) console.error(error);
  for (const item of diagnostics) console.error(`${item.file ?? "compiler"}:${item.line ?? 0}:${item.column ?? 0} TS${item.code} ${item.message}`);
  console.log(`${passed ? "PASS" : "FAIL"}: ${result.defaultSnippets}/${sourceIds.length} default examples, ${rows.length} copied snippets including every documented variant/size and multi-size wrapper; ${diagnostics.length} TypeScript diagnostics. Receipt: ${path.relative(root, output)}`);
  if (!passed) process.exitCode = 1;
} finally {
  if (keep) console.log(`Generated source retained: ${temporary}`);
  else fs.rmSync(temporary, { recursive: true, force: true });
}
