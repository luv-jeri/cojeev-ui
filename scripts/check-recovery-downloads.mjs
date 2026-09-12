import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import { rewriteInstalledImports } from "./registry-imports.mjs";

const registry = JSON.parse(fs.readFileSync("registry.json", "utf8"));
const entries = new Map(registry.items.map((item) => [item.name, item]));
const ids = process.argv
  .find((arg) => arg.startsWith("--components="))
  ?.slice(13)
  .split(",") ?? [
  "checkbox",
  "radio-group",
  "accordion",
  "card",
  "collapsible",
  "toast",
];
for (const id of ids) {
  const payloads = new Map();
  const visit = (name) => {
    if (payloads.has(name)) return;
    const payload = JSON.parse(
      fs.readFileSync(`public/r/${name}.json`, "utf8"),
    );
    const declared = entries.get(name);
    assert.ok(declared, `${id}: ${name} must have a registry entry`);
    assert.deepEqual(
      payload.registryDependencies ?? [],
      declared.registryDependencies ?? [],
      `${name}: stale dependency declaration`,
    );
    payloads.set(name, payload);
    for (const url of payload.registryDependencies ?? [])
      visit(path.basename(url, ".json"));
    for (const spec of declared.files) {
      const file = payload.files.find((file) => file.path === spec.path);
      assert.ok(file, `${name}: missing ${spec.path}`);
      assert.equal(file.target, spec.target, `${name}: changed install target`);
      let expected = fs.readFileSync(spec.path, "utf8");
      if (/\.[cm]?[jt]sx?$/.test(spec.path))
        expected = rewriteInstalledImports(spec.path, expected);
      if (spec.path.startsWith("registry/cojeev/styles/")) {
        const style = path.basename(spec.path, ".css");
        if (!["fonts", "tokens", "theme", "base"].includes(style))
          expected = `@layer ${style === "morph" ? "cojeev-morph" : style === "flow-press" ? "cojeev-flow" : "cojeev-states"} {\n${expected}\n}\n`;
      }
      assert.equal(
        file.content,
        expected,
        `${name}: stale content for ${spec.path}`,
      );
    }
  };
  visit(id);
  const files = [...payloads.values()].flatMap((payload) => payload.files);
  const targets = new Set(
    files.map(
      (file) => file.target ?? `components/ui/${path.basename(file.path)}`,
    ),
  );
  for (const file of files.filter((file) => /\.[jt]sx?$/.test(file.path))) {
    for (const { fileName } of ts
      .preProcessFile(file.content, true, true)
      .importedFiles.filter((entry) => entry.fileName.startsWith("@/"))) {
      const local = fileName.slice(2);
      assert.ok(
        [local, `${local}.tsx`, `${local}.ts`].some((target) =>
          targets.has(target),
        ),
        `${id}: installed ${file.path} imports missing ${fileName}`,
      );
    }
  }
  if (["accordion", "collapsible"].includes(id))
    assert.ok(targets.has("lib/cojeev-motion/use-disclosure-height.ts"));
  console.log(
    `PASS ${id}: ${payloads.size} dependency payloads, ${files.length} current source files, complete installed import closure`,
  );
}
