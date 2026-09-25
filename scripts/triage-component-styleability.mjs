/**
 * Per-component triage: how much of each isolation fixture is rendered from
 * classes the candidate library can actually style?
 *
 * Read-only. Distinguishes:
 *   - classes owned by the component under test (its own sidecar CSS / parts)
 *   - classes the candidate library styles that come from another item
 *   - reference-only classes with NO rule anywhere in the candidate library,
 *     which no amount of component work can define without inventing a source
 */
import fs from "node:fs";

const reference = "reference/cojeev-handoff-v4";
const registry = JSON.parse(fs.readFileSync(`${reference}/data/registry.json`, "utf8")).entries;

let library = "";
for (const f of fs.readdirSync("registry/cojeev/styles")) library += fs.readFileSync(`registry/cojeev/styles/${f}`, "utf8");
// Classes emitted by component sources (cva strings) also count as styleable.
let sources = "";
for (const f of fs.readdirSync("registry/cojeev/ui")) sources += fs.readFileSync(`registry/cojeev/ui/${f}`, "utf8");

const styleable = (c) => library.includes(`.${c}`) || sources.includes(c);

const only = process.argv.find((a) => a.startsWith("--components="))?.split("=")[1]?.split(",");
const ids = only ?? Object.keys(registry).filter((id) => registry[id].tier === "base");

const rows = [];
for (const id of ids) {
  const files = registry[id].isolation ?? [];
  const used = new Set();
  for (const file of files) {
    const html = fs.readFileSync(`${reference}/isolation/${id}/${file}`, "utf8");
    for (const m of html.matchAll(/class="([^"]*)"/g)) {
      for (const c of m[1].split(/\s+/).filter(Boolean)) used.add(c);
    }
  }
  const unstyleable = [...used].filter((c) => !styleable(c));
  rows.push({ id, classes: used.size, unstyleable });
}

rows.sort((a, b) => a.unstyleable.length - b.unstyleable.length);
console.log(`${"component".padEnd(18)} ${"classes".padStart(7)} ${"no-rule".padStart(7)}  unstyleable classes`);
for (const r of rows) {
  console.log(
    `${r.id.padEnd(18)} ${String(r.classes).padStart(7)} ${String(r.unstyleable.length).padStart(7)}  ${r.unstyleable.slice(0, 10).join(" ")}${r.unstyleable.length > 10 ? " …" : ""}`,
  );
}
const clean = rows.filter((r) => r.unstyleable.length === 0).length;
console.log(`\n${clean}/${rows.length} components have every fixture class styleable by the candidate library.`);
