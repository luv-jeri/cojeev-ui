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
import { budgetViolations, emittedBudgetViolations, footprintReport, installedSourceDigest } from "./registry-footprint-lib.mjs";
import { loadPayloads } from "./registry-payloads.mjs";

const argument = name => process.argv.find(value => value.startsWith(`--${name}=`))?.slice(name.length + 3);
const registryDirectory = argument("registry") ?? "public/r";
const budgetFile = argument("budgets") ?? "data/delivery-budgets.json";

const payloads = loadPayloads(registryDirectory);

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

// The emitted block cannot be recomputed here: it needs a bundler. What is checked
// is that the recorded measurement was taken on these payloads (the digest) and
// that it is inside its ceiling, so a payload change cannot silently inherit a
// stale number.
let emittedMeasurement = null;
if (budgets.emitted) {
  emittedMeasurement = {
    payloadDigest: installedSourceDigest(payloads),
    profiles: Object.fromEntries(Object.entries(budgets.emitted.profiles ?? {}).map(([profile, declared]) => [profile, declared.measured ?? {}])),
  };
  const stale = budgets.emitted.payloadDigest === emittedMeasurement.payloadDigest ? "current" : "STALE — re-run the qualifier";
  console.log(`\nEmitted browser bytes (measured ${budgets.emitted.measuredAt} by scripts/qualify-library-delivery.mjs; payload digest ${emittedMeasurement.payloadDigest.slice(0, 12)}, ${stale}):`);
  for (const [profile, declared] of Object.entries(budgets.emitted.profiles ?? {})) {
    const parts = Object.entries(declared.maxEmittedBytes ?? {}).map(([kind, limit]) => `${kind} ${(declared.measured?.[kind] ?? 0).toLocaleString("en-US")}/${limit.toLocaleString("en-US")}`);
    console.log(`  ${profile.padEnd(10)} ${parts.join("   ")}`);
  }
}

const jsonOut = argument("json");
if (jsonOut) {
  fs.mkdirSync(path.dirname(path.resolve(jsonOut)), { recursive: true });
  fs.writeFileSync(jsonOut, `${JSON.stringify({ registryDirectory, scenarios: report, baseline }, null, 2)}\n`);
  console.log(`\nWrote ${jsonOut}`);
}

if (process.argv.includes("--check")) {
  const violations = [...budgetViolations(report, budgets), ...(emittedMeasurement ? emittedBudgetViolations(emittedMeasurement, budgets.emitted) : [])];
  if (violations.length) {
    console.error(`\nDelivery budget violations: ${violations.length}`);
    for (const violation of violations) console.error(`  ${violation.scenario} [${violation.rule}] ${violation.detail}`);
    process.exitCode = 1;
  } else {
    const emitted = emittedMeasurement ? `, ${Object.keys(budgets.emitted.profiles).length} emitted profiles` : "";
    console.log(`\nDelivery budgets: PASS (${Object.keys(budgets.scenarios).length} scenarios${emitted})`);
  }
}
