/**
 * Before/after comparison for two scoped gate runs.
 *
 * Read-only. Uses each row's own id and pixelDifference (the values travel with the
 * row), and reports the fixture rows recovered per component. Rows present in only
 * one run are reported rather than silently paired.
 *
 *   node scripts/compare-gate-runs.mjs --before=DIR --after=DIR
 */
import fs from "node:fs";
import path from "node:path";

const args = new Map(process.argv.slice(2).map((a) => { const [k, ...v] = a.split("="); return [k, v.join("=") || true]; }));
const beforeDir = args.get("--before");
const afterDir = args.get("--after");
if (!beforeDir || !afterDir) throw new Error("usage: --before=DIR --after=DIR");

const load = (dir) => {
  const file = path.join(dir, "results.json");
  if (!fs.existsSync(file)) throw new Error(`no results.json in ${dir}`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
};
const key = (r) => `${r.id}|${r.file}|${r.width}`;
const index = (rows) => new Map(rows.map((r) => [key(r), r]));

const before = load(beforeDir);
const after = load(afterDir);
const bIdx = index(before);
const aIdx = index(after);

const ids = [...new Set([...before, ...after].map((r) => r.id))].sort();
const rows = [];
for (const id of ids) {
  const bRows = before.filter((r) => r.id === id);
  const aRows = after.filter((r) => r.id === id);
  const worst = (rs) => (rs.length ? Math.max(...rs.map((r) => r.pixelDifference ?? 0)) : null);
  const fails = (rs) => rs.filter((r) => r.verdict !== "PASS").length;
  // Rows that failed before and pass now, measured on matched keys only.
  const recovered = [...bIdx.entries()].filter(([k, b]) => b.id === id && b.verdict !== "PASS" && aIdx.get(k)?.verdict === "PASS").length;
  const regressed = [...aIdx.entries()].filter(([k, a]) => a.id === id && a.verdict !== "PASS" && bIdx.get(k)?.verdict === "PASS").length;
  rows.push({
    id,
    beforeRows: bRows.length, afterRows: aRows.length,
    beforeFail: fails(bRows), afterFail: fails(aRows),
    beforeWorst: worst(bRows), afterWorst: worst(aRows),
    recovered, regressed,
  });
}

const pct = (v) => (v === null ? "—" : `${(100 * v).toFixed(2)}%`);
const pad = (s, n) => String(s).padEnd(n);
const num = (s, n) => String(s).padStart(n);

console.log(`${pad("component", 16)}${num("rows", 5)}${num("fail before", 12)}${num("fail after", 11)}${num("worst before", 14)}${num("worst after", 13)}${num("recovered", 11)}${num("regressed", 11)}`);
console.log("-".repeat(93));
for (const r of rows) {
  console.log(
    pad(r.id, 16) + num(`${r.beforeRows}→${r.afterRows}`, 5) + num(r.beforeFail, 12) + num(r.afterFail, 11) +
    num(pct(r.beforeWorst), 14) + num(pct(r.afterWorst), 13) + num(r.recovered, 11) + num(r.regressed, 11),
  );
}
const sum = (f) => rows.reduce((acc, r) => acc + f(r), 0);
console.log("-".repeat(93));
console.log(
  pad("TOTAL", 16) + num(`${sum((r) => r.beforeRows)}→${sum((r) => r.afterRows)}`, 5) +
  num(sum((r) => r.beforeFail), 12) + num(sum((r) => r.afterFail), 11) +
  num("", 14) + num("", 13) + num(sum((r) => r.recovered), 11) + num(sum((r) => r.regressed), 11),
);
const unmatched = [...bIdx.keys()].filter((k) => !aIdx.has(k)).length + [...aIdx.keys()].filter((k) => !bIdx.has(k)).length;
console.log(`\nunmatched rows between runs (not paired): ${unmatched}`);
