import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

// A var() without a fallback that names an undefined property invalidates its whole declaration:
// the focus ring, colour or background silently disappears. Every --v-* reference must resolve.
function files(dir, pattern) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return entry.name === "node_modules" ? [] : files(full, pattern);
    return pattern.test(entry.name) ? [full] : [];
  });
}

test("every --v-* token a component reads is defined", () => {
  const sources = ["registry/cojeev", "app", "components", "lib"].flatMap((dir) => files(dir, /\.(css|tsx?)$/));
  const defined = new Set();
  const used = new Map();
  for (const file of sources) {
    const text = fs.readFileSync(file, "utf8");
    for (const [, name] of text.matchAll(/(--v-[a-z0-9-]+)\s*:/g)) defined.add(name);
    for (const [, name] of text.matchAll(/["'](--v-[a-z0-9-]+)["']/g)) defined.add(name);
    for (const [, name] of text.matchAll(/var\((--v-[a-z0-9-]+)\s*\)/g)) if (!used.has(name)) used.set(name, file);
  }
  const missing = [...used].filter(([name]) => !defined.has(name)).map(([name, file]) => `${name} (${file})`);
  assert.deepEqual(missing, []);
});
