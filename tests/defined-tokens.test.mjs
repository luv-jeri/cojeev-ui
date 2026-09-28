import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

// A var() without a fallback that names an undefined property invalidates its whole declaration:
// the focus ring, colour, font shorthand or transition silently disappears. Every such reference must
// resolve. Radix sets its --radix-* properties on its own elements at runtime, and the Tailwind theme
// maps the retired names that a consumer's legacy alias sheet defines.
// A component installed from the registry ships without the docs site, so a read in the library counts
// as defined only by the library itself: its stylesheets (tokens.css and theme.css included) and the
// properties its own code sets through style objects or setProperty.
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
  const inLibrary = (file) => file.startsWith(`registry${path.sep}cojeev${path.sep}`);
  const defined = new Set();
  const definedByLibrary = new Set();
  const used = [];
  for (const file of sources) {
    const text = fs.readFileSync(file, "utf8");
    const sets = [...text.matchAll(/(--[\w-]+)\s*:|["'](--[\w-]+)["']\s*:|setProperty\(\s*["'](--[\w-]+)["']/g)];
    for (const [, declared, key, property] of sets) {
      defined.add(declared ?? key ?? property);
      if (inLibrary(file)) definedByLibrary.add(declared ?? key ?? property);
    }
    for (const [, name] of text.matchAll(/var\((--[\w-]+)\s*\)/g)) used.push([name, file]);
  }
  const missing = [...new Set(used.filter(([name, file]) => !(inLibrary(file) ? definedByLibrary : defined).has(name) && !name.startsWith("--radix-")
    && !(file.endsWith(`${path.sep}theme.css`) && legacy.has(name))).map(([name, file]) => `${name} (${file})`))];
  assert.deepEqual(missing, []);
});

// Corners come from the --r-* scale (docs/design/DESIGN.md, Shapes). The retired --radius-* names are
// defined only by a consumer's legacy alias sheet, so a component reading one renders its fallback
// instead of the scale step. The Tailwind theme's --radius-v-* names serve rounded-v-* utilities;
// component sheets read the scale directly.
test("no registry stylesheet reads a --radius-* name instead of the --r-* scale", () => {
  const reads = files("registry/cojeev", /\.css$/).flatMap((file) =>
    [...fs.readFileSync(file, "utf8").matchAll(/var\(\s*(--radius-[\w-]+)/g)].map(([, name]) => `${name} (${file})`));
  assert.deepEqual(reads, []);
});
