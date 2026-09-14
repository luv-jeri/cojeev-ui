import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { rewriteInstalledImports } from "./registry-imports.mjs";

// Run after registry:build. Check distributable contents, not only live docs.
const ids = ["cojeev", "button", "input", "field", "input-group", "textarea", "slider", "preview", "table", "calendar", "date-picker", "checkbox", "radio-group", "switch"];
const registry = JSON.parse(fs.readFileSync("registry.json", "utf8"));
let checked = 0;
for (const id of ids) {
  const declared = registry.items.find(item => item.name === id);
  const payload = JSON.parse(fs.readFileSync(`public/r/${id}.json`, "utf8"));
  for (const spec of declared.files) {
    const file = payload.files.find(file => file.path === spec.path);
    assert(file, `${id}: missing ${spec.path}`);
    assert.equal(file.target, spec.target, `${id}: install target drift for ${spec.path}`);
    let expected = fs.readFileSync(spec.path, "utf8");
    if (/\.[cm]?[jt]sx?$/.test(spec.path)) expected = rewriteInstalledImports(spec.path, expected);
    if (spec.path.startsWith("registry/cojeev/styles/")) {
      const name = path.basename(spec.path, ".css");
      if (!["fonts", "tokens", "theme", "base"].includes(name)) {
        const layer = name === "morph" ? "cojeev-morph" : name === "flow-press" ? "cojeev-flow" : "cojeev-states";
        expected = `@layer ${layer} {\n${expected}\n}\n`;
      }
    }
    assert.equal(file.content, expected, `${id}: stale installed content in ${spec.path}`);
    checked++;
  }
  for (const idWithChoices of ["checkbox", "radio-group", "switch"]) if (id === idWithChoices) {
    assert(payload.files.some(file => file.target === "styles/cojeev/choice-foundations.css"), `${id}: standalone choice styling missing`);
    assert(Object.hasOwn(payload.css, '@import "@/styles/cojeev/choice-foundations.css"'), `${id}: shared choice styling is not imported`);
  }
}
assert(!registry.items.some(item => item.name.endsWith(" 2")), "Backed-up duplicates must not become installable components");
console.log(`PASS: ${ids.length} foundation downloads, ${checked} source files match rewritten installed content and stylesheet targets.`);
