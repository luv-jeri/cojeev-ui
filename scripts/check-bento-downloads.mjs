import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { rewriteInstalledImports } from "./registry-imports.mjs";

// Exercise the actual install payload graph, including transitive UI helpers.
const registry = JSON.parse(fs.readFileSync("registry.json", "utf8"));
for (const root of ["bento-grid", "bento-builder"]) {
  const pending = [root];
  const payloads = new Map();
  while (pending.length) {
    const id = pending.pop();
    if (payloads.has(id)) continue;
    const declared = registry.items.find(item => item.name === id);
    assert(declared, `${id}: not declared in the installable catalogue`);
    const payload = JSON.parse(fs.readFileSync(`public/r/${id}.json`, "utf8"));
    payloads.set(id, payload);
    for (const dependency of payload.registryDependencies ?? []) {
      pending.push(path.basename(new URL(dependency).pathname, ".json"));
    }
    for (const spec of declared.files) {
      const delivered = payload.files.find(file => file.path === spec.path);
      assert(delivered, `${id}: missing ${spec.path}`);
      assert.equal(delivered.target, spec.target, `${id}: wrong install target`);
      let expected = fs.readFileSync(spec.path, "utf8");
      if (/\.[cm]?[jt]sx?$/.test(spec.path)) expected = rewriteInstalledImports(spec.path, expected);
      if (spec.path.startsWith("registry/cojeev/styles/")) {
        const name = path.basename(spec.path, ".css");
        if (!["fonts", "tokens", "theme", "base"].includes(name)) {
          const layer = name === "morph" ? "cojeev-morph" : name === "flow-press" ? "cojeev-flow" : "cojeev-states";
          expected = `@layer ${layer} {\n${expected}\n}\n`;
        }
      }
      assert.equal(delivered.content, expected, `${id}: stale ${spec.path}`);
    }
  }
  const files = [...payloads.values()].flatMap(payload => payload.files);
  const targets = new Set(files.map(file => file.type === "registry:ui"
    ? `components/ui/${path.basename(file.path).replace(/\.tsx?$/, "")}`
    : file.target?.replace(/\.tsx?$/, "")));
  for (const file of files.filter(file => /\.tsx?$/.test(file.path))) {
    for (const [, imported] of file.content.matchAll(/(?:from\s+|import\s*\(\s*)["'](@\/(?:components\/ui|lib)\/[^"']+)["']/g)) {
      assert(targets.has(imported.slice(2)), `${root}: unresolved installed import ${imported} from ${file.path}`);
    }
  }
  for (const id of [root, "bento-grid"]) {
    const payload = payloads.get(id);
    assert(payload, `${root}: renderer dependency missing`);
    assert(payload.files.some(file => file.target === `styles/cojeev/${id}.css`), `${id}: styling missing`);
    assert(Object.hasOwn(payload.css ?? {}, `@import "@/styles/cojeev/${id}.css"`), `${id}: stylesheet not activated`);
  }
  console.log(`PASS: ${root} install graph (${payloads.size} payloads, ${files.length} files), source parity, imports and styles.`);
}
