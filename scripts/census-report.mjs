#!/usr/bin/env node
/**
 * Summarise a gate run's `results.json` into a per-component census.
 *
 * The gate's own output is a single PASS/FAIL line per fixture, which is fine
 * while iterating on one component and useless for triage across a whole run:
 * it gives no totals, no per-component ranking, and no idea *what* differs.
 * This reads the machine-readable results and answers three questions:
 *
 *   1. How much passes?            -> totals + per-component pass rate
 *   2. What kinds of difference?   -> layout vs paint, per component
 *   3. Where does the pixel diff actually show? -> mean, so a 0.02% rounding
 *      difference is not confused with a 5% structural mismatch
 *
 * Usage:
 *   node scripts/census-report.mjs [results.json] [--worst=N] [--component=name]
 *
 * Defaults to artifacts/gate-base/results.json, written by:
 *   node apps/gate/run.mjs --fail-fast=false --out=artifacts/gate-base
 *
 * Read-only: it never writes, and never touches the reference fixtures.
 */
import fs from "node:fs";

const args = process.argv.slice(2);
const flag = (name) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : null;
};
const resultsPath = args.find((a) => !a.startsWith("--")) ?? "artifacts/gate-base/results.json";
const worst = Number(flag("worst") ?? 30);
const only = flag("component");

if (!fs.existsSync(resultsPath)) {
  console.error(`No results at ${resultsPath}`);
  console.error("Produce one with: node apps/gate/run.mjs --fail-fast=false --out=artifacts/gate-base");
  process.exit(1);
}

const rows = JSON.parse(fs.readFileSync(resultsPath, "utf8"));
if (!rows.length) {
  console.error(`${resultsPath} is empty.`);
  process.exit(1);
}

/* `row.id` is the authoritative owning component — the gate emits it directly and
 * it has 66 distinct values, one per base-tier entry. There is deliberately NO
 * filename fallback. `row.file` values are generic and shared across components
 * (38 of them all have `default-default-rest.html`), so a filename→directory
 * lookup silently credits one arbitrary component with hundreds of other
 * components' fixtures. That bug made this report credit `tooltip` with 516
 * fixtures when it has 24, and described 30 components instead of 66. Individual
 * `pixelDifference` values and the run totals were never affected -- the value
 * travels with its row -- but every per-component aggregate (max, mean, fail
 * count, rank) was wrong wherever rows had been absorbed. A row with no `id` is
 * therefore counted as unattributed and reported, never guessed at. */

/** Layout properties change geometry; paint properties change colour. */
const LAYOUT = new Set([
  "height", "width", "min-height", "min-width", "max-height", "max-width",
  "line-height", "font-size", "font-weight", "font-family", "letter-spacing",
  "border-radius", "gap", "row-gap", "column-gap", "padding-top", "padding-right",
  "padding-bottom", "padding-left", "margin-top", "margin-right", "margin-bottom",
  "margin-left", "border-top-width", "transform", "opacity",
  "transition-duration", "transition-timing-function",
]);
const PAINT = new Set([
  "background-color", "color", "border-top-color", "border-right-color",
  "border-bottom-color", "border-left-color", "outline", "outline-color",
  "box-shadow", "background-image", "fill", "stroke",
]);

const components = new Map();
const properties = new Map();
const signatures = new Map();

// Attribution is by `row.id` ONLY. There is deliberately no filename fallback: the
// filenames are generic and shared across components, so inferring an owner from one
// is exactly the bug this script used to have. A row without `id` is counted as
// unattributed and reported loudly rather than folded into the wrong component.
let unattributed = 0;

for (const row of rows) {
  if (row.id === undefined || row.id === null || row.id === "") {
    unattributed += 1;
    continue;
  }
  const name = String(row.id);
  let entry = components.get(name);
  if (!entry) {
    entry = { name, pass: 0, fail: 0, pixelSum: 0, pixelMax: 0, layout: 0, paint: 0 };
    components.set(name, entry);
  }
  if (row.verdict === "PASS") {
    entry.pass += 1;
    continue;
  }
  entry.fail += 1;
  const pixel = row.pixelDifference ?? 0;
  entry.pixelSum += pixel;
  entry.pixelMax = Math.max(entry.pixelMax, pixel);

  const diffs = row.differences ?? [];
  if (diffs.some((d) => LAYOUT.has(d.property))) entry.layout += 1;
  if (diffs.some((d) => PAINT.has(d.property))) entry.paint += 1;

  for (const diff of diffs) {
    properties.set(diff.property, (properties.get(diff.property) ?? 0) + 1);
  }
  const key = diffs
    .map((d) => `${d.property}:${d.reference}|${d.candidate}`)
    .sort()
    .join("  ||  ");
  if (key) {
    const seen = signatures.get(key) ?? { count: 0, example: `${name}/${row.file} @${row.width}` };
    seen.count += 1;
    signatures.set(key, seen);
  }
}

const all = [...components.values()].map((e) => ({
  ...e,
  meanPixel: e.fail ? e.pixelSum / e.fail : 0,
}));
const clean = all.filter((e) => e.fail === 0).sort((a, b) => b.pass - a.pass);
/* Sort by WORST PIXEL DIFFERENCE, not by failure count. Failure count measures
 * breadth; pixel difference measures how visibly wrong a component is, and the two
 * disagree sharply here (`sidebar` fails 36 fixtures at exactly 0.0000%, `sheet`
 * fails 12 at 18.32%). Sorting by count buried the worst defects below a screenful of
 * trivial ones and caused a real misdiagnosis, so `pixelMax` is the ranking key. The
 * `fail` column is kept for context but must never drive priority. */
const failing = all.filter((e) => e.fail > 0).sort((a, b) => b.pixelMax - a.pixelMax || b.fail - a.fail);

const totalPass = rows.filter((r) => r.verdict === "PASS").length;
const pct = (n, d) => (d ? `${((n / d) * 100).toFixed(1)}%` : "—");

console.log(`CENSUS  ${resultsPath}`);
console.log(`  ${rows.length} comparisons   ${totalPass} pass (${pct(totalPass, rows.length)})   ${rows.length - totalPass} fail (${pct(rows.length - totalPass, rows.length)})`);
console.log(`  ${all.length} components   ${clean.length} clean   ${failing.length} with failures`);
if (unattributed > 0) {
  console.log(
    `  WARNING: ${unattributed} row(s) carried no \`id\` and are NOT counted above. ` +
      "They are excluded rather than guessed at — fix the gate, not this script.",
  );
}
console.log();

console.log(`FAILING COMPONENTS (by worst pixel difference, ${failing.length} total)`);
console.log("  component                 fail  pass   mean px   max px   layout  paint");
for (const e of failing.slice(0, worst)) {
  console.log(
    `  ${e.name.padEnd(24)}${String(e.fail).padStart(4)}${String(e.pass).padStart(6)}` +
      `${(e.meanPixel * 100).toFixed(2).padStart(10)}%${(e.pixelMax * 100).toFixed(2).padStart(8)}%` +
      `${String(e.layout).padStart(8)}${String(e.paint).padStart(7)}`,
  );
}

if (clean.length) {
  console.log(`\nFULLY CLEAN (${clean.length})`);
  console.log("  " + clean.map((e) => `${e.name}(${e.pass})`).join("  "));
}

if (only) {
  const entry = components.get(only);
  if (!entry) {
    console.log(`\nNo component named "${only}" in these results.`);
  } else {
    console.log(`\n=== ${only} — dominant difference signatures ===`);
    const mine = [...signatures.entries()]
      .filter(([, s]) => s.example.startsWith(`${only}/`))
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 12);
    for (const [key, s] of mine) {
      console.log(`\n  [${s.count} fixtures] e.g. ${s.example}`);
      for (const part of key.split("  ||  ").slice(0, 5)) console.log(`      ${part}`);
    }
  }
}

console.log(`\nTOP DIFFERING PROPERTIES (all failures)`);
for (const [property, count] of [...properties.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  const kind = LAYOUT.has(property) ? "layout" : PAINT.has(property) ? "paint " : "other ";
  console.log(`  ${kind} ${String(count).padStart(6)}  ${property}`);
}
console.log(`\nDISTINCT DIFFERENCE SIGNATURES: ${signatures.size}`);
console.log(`\nA component is only "visually perfect" when its fail count is 0.`);
console.log(`Layout differences are content metrics (widths/heights); a low mean pixel`);
console.log(`difference with layout diffs usually means sub-pixel text measurement.`);
