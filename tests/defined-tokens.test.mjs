import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

// A var() without a fallback that names an undefined property invalidates its whole declaration:
// the focus ring, colour, font shorthand or transition silently disappears. Every such reference must
// resolve. Radix sets its --radix-* properties on its own elements at runtime, and the Tailwind theme
// maps the retired names that a consumer's legacy alias sheet defines.
function files(dir, pattern) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : files(full, pattern);
    return pattern.test(entry.name) ? [full] : [];
  });
}

test("every custom property a component reads without a fallback is defined", () => {
  const sources = ["registry/cojeev", "app", "components", "lib"].flatMap((dir) => files(dir, /\.(css|tsx?)$/));
  const legacy = new Set([...fs.readFileSync("reference/cojeev-handoff-v4/css/legacy-aliases.css", "utf8").matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name));
  const defined = new Set();
  const used = [];
  for (const file of sources) {
    const text = fs.readFileSync(file, "utf8");
    for (const [, name] of text.matchAll(/(--[\w-]+)\s*:/g)) defined.add(name);
    for (const [, name] of text.matchAll(/["'](--[\w-]+)["']/g)) defined.add(name);
    for (const [, name] of text.matchAll(/var\((--[\w-]+)\s*\)/g)) used.push([name, file]);
  }
  const missing = [...new Set(used.filter(([name, file]) => !defined.has(name) && !name.startsWith("--radix-")
    && !(file.endsWith(`${path.sep}theme.css`) && legacy.has(name))).map(([name, file]) => `${name} (${file})`))];
  assert.deepEqual(missing, []);
});
