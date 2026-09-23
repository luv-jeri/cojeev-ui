/**
 * Measure what each supported install scenario actually delivers.
 *
 * Reads the committed payloads in `public/r` and resolves the real dependency
 * closure per scenario. Prints a table, and with `--check` compares the result
 * against `data/delivery-budgets.json`, exiting non-zero on any violation.
 *
 *   node scripts/registry-footprint-report.mjs
 *   node scripts/registry-footprint-report.mjs --check
 *   node scripts/registry-footprint-report.mjs --json=artifacts/footprint.json
 */
import fs from "node:fs";
import path from "node:path";
import { budgetViolations, footprintReport } from "./registry-footprint-lib.mjs";

const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const registryDirectory = argument("registry") ?? "public/r";
const budgetFile = argument("budgets") ?? "data/delivery-budgets.json";

const payloads = new Map();
for (const file of fs.readdirSync(registryDirectory).sort()) {
  if (!/^[a-z0-9][a-z0-9-]*\.json$/.test(file)) continue;
  const item = JSON.parse(fs.readFileSync(path.join(registryDirectory, file), "utf8"));
  if (Array.isArray(item.items)) continue;
  payloads.set(file.slice(0, -5), item);
}

const budgets = JSON.parse(fs.readFileSync(budgetFile, "utf8"));
const report = footprintReport(payloads, Object.fromEntries(Object.entries(budgets.scenarios).map(([name, budget]) => [name, budget.entries])));
const baseline = budgets.baseline ?? {};

const kilobyte = bytes => `${(bytes / 1024).toFixed(1)} KiB`;
console.log(`Registry payloads: ${registryDirectory} (${payloads.size} items)\n`);
const width = Math.max(...Object.keys(report).map(name => name.length));
console.log(`${"scenario".padEnd(width)}  ${"files".padStart(6)}  ${"source".padStart(11)}  ${"baseline".padStart(11)}  ${"change".padStart(9)}  packages`);
for (const [name, measured] of Object.entries(report)) {
  const recorded = baseline[name];
  const before = typeof recorded === "number" ? { sourceBytes: recorded } : recorded;
  const beforeBytes = before?.sourceBytes;
  const change = typeof beforeBytes === "number" && beforeBytes > 0 ? `${((measured.sourceBytes - beforeBytes) / beforeBytes * 100).toFixed(1)} %` : "—";
  const files = before?.files ? `${before.files} → ${measured.fileCount}` : String(measured.fileCount);
  console.log(`${name.padEnd(width)}  ${files.padStart(6)}  ${kilobyte(measured.sourceBytes).padStart(11)}  ${(typeof beforeBytes === "number" ? kilobyte(beforeBytes) : "—").padStart(11)}  ${change.padStart(9)}  ${measured.packages.length === 0 ? "(none)" : measured.packages.join(", ")}`);
}

if (process.argv.includes("--details")) {
  for (const [name, measured] of Object.entries(report)) {
    console.log(`\n--- ${name} (${measured.resolved.length} entries) ---`);
    for (const file of measured.files) console.log(`${String(file.bytes).padStart(9)}  ${file.target}`);
  }
}

const jsonOut = argument("json");
if (jsonOut) {
  fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
  fs.writeFileSync(jsonOut, `${JSON.stringify({ registryDirectory, scenarios: report, baseline }, null, 2)}\n`);
  console.log(`\nWrote ${jsonOut}`);
}

if (process.argv.includes("--check")) {
  const violations = budgetViolations(report, budgets);
  if (violations.length) {
    console.error(`\nDelivery budget violations: ${violations.length}`);
    for (const violation of violations) console.error(`  ${violation.scenario} [${violation.rule}] ${violation.detail}`);
    process.exitCode = 1;
  } else {
    console.log(`\nDelivery budgets: PASS (${Object.keys(budgets.scenarios).length} scenarios)`);
  }
}
