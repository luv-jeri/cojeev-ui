import fs from "node:fs";

const reports = ["reference-typography", "reference-effects", "reference-galleries", "reference-additions", "reference-layouts"].filter(name => fs.existsSync(`verification/${name}.json`));
const rows = reports.filter(name => name !== "reference-galleries" || fs.existsSync("components/examples/reference-galleries.tsx")).flatMap(name => fs.existsSync(`verification/${name}.json`) ? JSON.parse(fs.readFileSync(`verification/${name}.json`, "utf8")) : []);
const additions = JSON.parse(fs.readFileSync("data/component-additions.json", "utf8"));
const guides = JSON.parse(fs.readFileSync("data/component-guides.json", "utf8"));
let examples = fs.readFileSync("components/examples/index.ts", "utf8");
let manifest = fs.readFileSync("components/examples/manifest.ts", "utf8");
let css = fs.readFileSync("app/globals.css", "utf8");
const pascal = id => id.split("-").map(word => word[0].toUpperCase() + word.slice(1)).join("");
const list = value => Array.isArray(value) ? value : value ? [value] : [];
for (const row of rows.filter(row => row.status === "new" || !row.status)) {
  const { id, name, category, variants, sizes, states, description, usage, accessibility, related } = row;
  if (!fs.existsSync(`registry/sahajiv/ui/${id}.tsx`)) throw new Error(`Missing implementation: ${id}`);
  additions[id] = { name, variants, sizes, states, reviewOnly: process.argv.includes("--publish") ? false : additions[id]?.reviewOnly ?? true };
  guides[id] = { description, category: category === "Composed" ? "Creative" : category, usage: list(usage), accessibility: list(accessibility), related: list(related) };
  const file = reports.find(report => JSON.parse(fs.readFileSync(`verification/${report}.json`, "utf8")).some(item => item.id === id));
  const example = `${pascal(id)}Example`;
  if (!examples.includes(`"${id}":`)) examples = examples.replace("export const examples: Record<string, ExampleComponent> = {", `export const examples: Record<string, ExampleComponent> = {\n  "${id}": lazy(() => import("./${file}").then((module) => ({ default: module.${example} }))),`);
  if (!manifest.includes(`"${id}":`)) manifest = manifest.replace("export const exampleManifest = {", `export const exampleManifest = {\n  "${id}": { file: "${file}", name: "${example}" },`);
  const declaration = `@import "../registry/sahajiv/styles/${id}.css" layer(sahajiv-states);`;
  if (!css.includes(declaration)) css = css.replace('@import "../registry/sahajiv/styles/base.css";', `@import "../registry/sahajiv/styles/base.css";\n${declaration}`);
}
fs.writeFileSync("data/component-additions.json", JSON.stringify(additions, null, 2) + "\n");
fs.writeFileSync("data/component-guides.json", JSON.stringify(guides, null, 2) + "\n");
fs.writeFileSync("components/examples/index.ts", examples);
fs.writeFileSync("components/examples/manifest.ts", manifest);
fs.writeFileSync("app/globals.css", css);
fs.writeFileSync("data/reference-effects.json", JSON.stringify(rows, null, 2) + "\n");
console.log(`Mapped ${rows.length} references; ${rows.filter(row => row.status === "new" || !row.status).length} new entries. Existing aliases are reused.`);
