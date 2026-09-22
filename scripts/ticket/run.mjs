#!/usr/bin/env node
/**
 * Ticket runner — carries one bounded ticket through the lifecycle in
 * docs/workspace/ROADMAP-TO-10.md and writes its receipt.
 *
 * Why this exists: the roadmap defines a lifecycle, a receipt template and a ticket
 * prompt, but all three were prose that a model would retype per ticket — and retyped
 * evidence drifts. This runs the guards, executes the ticket's own checks, records
 * real exit codes and hashes, and emits the receipt. It cannot decide that a check
 * passed.
 *
 * Lifecycle:  READY -> IMPLEMENTING -> LOCAL CHECKS -> ASTRA REVIEW -> ACCEPTED
 *
 * Usage:
 *   node scripts/ticket/run.mjs --ticket=docs/workspace/tickets/T-001.json
 *   node scripts/ticket/run.mjs --ticket=... --dry-run      # guards + plan only
 *   node scripts/ticket/run.mjs --ticket=... --rehearsal    # bypass port guard, receipt marked rehearsal
 *   node scripts/ticket/run.mjs --ticket=... --skip-gate
 *
 * Exit codes: 0 ok · 3 gate/port busy · 4 unowned dirty file · 5 a check failed · 2 usage
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { ROOT, gateActivity, gitState, hashFile, sh, sourceHash, tokenDivergence } from "./lib.mjs";

const RECEIPTS_DIR = "docs/workspace/receipts";
const ALWAYS_ALLOWED_PREFIXES = [".work/"];
const REVIEW_TIERS = { 1: "mandatory independent review (shared file / fixture / public contract / score rise)", 2: "sampled review", 3: "batch review at release candidate" };

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const val = (name) => {
  const hit = argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : undefined;
};

const ticketPath = val("--ticket");
const dryRun = has("--dry-run");
const rehearsal = has("--rehearsal");
const skipGate = has("--skip-gate");

if (!ticketPath) {
  console.error("usage: run.mjs --ticket=<path-to-ticket.json> [--dry-run] [--rehearsal] [--skip-gate]");
  process.exit(2);
}

const absTicket = path.isAbsolute(ticketPath) ? ticketPath : path.join(ROOT, ticketPath);
if (!fs.existsSync(absTicket)) {
  console.error(`ticket not found: ${ticketPath}`);
  process.exit(2);
}

let ticket;
try {
  ticket = JSON.parse(fs.readFileSync(absTicket, "utf8"));
} catch (err) {
  console.error(`ticket is not valid JSON: ${err.message}`);
  process.exit(2);
}

for (const key of ["id", "title", "objective", "criterionIds", "allowedFiles"]) {
  if (ticket[key] === undefined) {
    console.error(`ticket is missing required key: ${key}`);
    process.exit(2);
  }
}

const fail = (code, msg) => {
  console.error(`\nREFUSED: ${msg}`);
  process.exit(code);
};

// ---- guard 1: no competing renderer -------------------------------------
const gate = gateActivity();
console.log(`ticket     ${ticket.id} — ${ticket.title}`);
console.log(`snapshot   ${gitState().branch} @ ${gitState().headShort} sourceHash=${sourceHash()}`);
console.log(`gate port  ${gate.gatePort} busy=${gate.portBusy} gateRunning=${gate.gateRunning}`);

if (!gate.safeToStartTicket) {
  if (!rehearsal) {
    fail(
      3,
      `port ${gate.gatePort} is in use or a gate run is live.\n` +
        `  holders: ${gate.portHolderPids.join(", ") || "none"}\n` +
        `  processes: ${gate.runningGateProcesses.join(" | ") || "none"}\n` +
        `  Rendering two gate runs at once corrupts both, and editing sources mid-run\n` +
        `  turns the running census into a mixed-snapshot result. Wait for it to exit.\n` +
        `  Use --rehearsal only to rehearse a receipt; rehearsals never count as evidence.`,
    );
  }
  console.log("           REHEARSAL — port guard bypassed; receipt will not count as evidence");
}

// ---- guard 2: one writer per file --------------------------------------
const state = gitState();
const allowed = new Set([...(ticket.allowedFiles ?? []), ...(ticket.generatedOutputs ?? []), ...(ticket.baselineDirty ?? [])]);
const permitted = (file) =>
  allowed.has(file) ||
  ALWAYS_ALLOWED_PREFIXES.some((p) => file.startsWith(p)) ||
  [...allowed].some((a) => a.endsWith("/") && file.startsWith(a));

const unowned = [...state.dirtyFiles.map((d) => d.file), ...state.untracked].filter((f) => !permitted(f));
console.log(`ownership  ${state.dirtyFiles.length} dirty tracked, ${state.untracked.length} untracked, ${unowned.length} unowned`);

if (unowned.length) {
  fail(
    4,
    `${unowned.length} file(s) changed that this ticket does not own:\n` +
      unowned.map((f) => `  - ${f}`).join("\n") +
      `\n  Either revert them, or list them in allowedFiles/generatedOutputs/baselineDirty.\n` +
      `  A ticket that edits outside its boundary cannot be reviewed as one diff.`,
  );
}

if (ticket.baselineDirty?.length) {
  console.log(`           pre-existing (accepted into baseline): ${ticket.baselineDirty.join(", ")}`);
}

// ---- plan ---------------------------------------------------------------
const checks = ticket.checks ?? [];
const gateSpec = ticket.gate ?? null;
console.log(`\ncriteria   ${(ticket.criterionIds ?? []).join(", ")}`);
console.log(`owner      ${ticket.owner ?? "unassigned"} · review tier ${ticket.reviewTier ?? "?"} — ${REVIEW_TIERS[ticket.reviewTier] ?? "unspecified"}`);
console.log(`allowed    ${(ticket.allowedFiles ?? []).join(", ")}`);
console.log(`checks     ${checks.length}`);
for (const c of checks) console.log(`  - ${c.name}: ${c.cmd}${c.timeoutMs ? ` (timeout ${Math.round(c.timeoutMs / 1000)}s)` : ""}`);
if (gateSpec) console.log(`visual     components=${(gateSpec.components ?? []).join(",")} out=${gateSpec.out ?? "artifacts/gate"}`);

if (dryRun) {
  console.log("\nDRY RUN — guards evaluated, nothing executed.");
  const pre = tokenDivergence();
  console.log(`token divergence now: ${pre.differing.length} differing, paletteReconciled=${pre.paletteReconciled}`);
  for (const d of pre.differing) console.log(`  ${d.token}  handoff=${d.handoff}  candidate=${d.candidate}`);
  process.exit(0);
}

// ---- pre-hashes ---------------------------------------------------------
const preHashes = Object.fromEntries((ticket.allowedFiles ?? []).map((f) => [f, hashFile(f)]));
const startingHash = sourceHash();

// ---- run checks ---------------------------------------------------------
function run(cmd, timeoutMs) {
  const started = Date.now();
  try {
    const output = execSync(cmd, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      timeout: timeoutMs ?? 20 * 60 * 1000,
      maxBuffer: 32 * 1024 * 1024,
      shell: "/bin/bash",
    });
    return { exit: 0, output, seconds: (Date.now() - started) / 1000, timedOut: false };
  } catch (err) {
    const output = `${err.stdout ?? ""}${err.stderr ?? ""}`;
    return {
      exit: typeof err.status === "number" ? err.status : 1,
      output,
      seconds: (Date.now() - started) / 1000,
      timedOut: err.signal === "SIGTERM",
    };
  }
}

const results = [];
if (checks.length) console.log("\n--- checks ---");
for (const c of checks) {
  process.stdout.write(`  ${c.name} … `);
  const r = run(c.cmd, c.timeoutMs);
  results.push({ ...c, ...r });
  console.log(`exit ${r.exit} (${r.seconds.toFixed(1)}s)${r.timedOut ? " TIMED OUT" : ""}`);
}

// ---- visual gate --------------------------------------------------------
let gateSummary = null;
if (gateSpec && !skipGate) {
  const components = (gateSpec.components ?? []).join(",");
  const out = gateSpec.out ?? `.work/${ticket.id}/visual`;
  console.log(`\n--- visual gate: ${components} -> ${out} ---`);
  const r = run(`node apps/gate/run.mjs --components=${components} --out=${out} --fail-fast=false`, 60 * 60 * 1000);
  results.push({ name: `gate:${components}`, cmd: `node apps/gate/run.mjs --components=${components}`, ...r });
  console.log(`  exit ${r.exit} (${r.seconds.toFixed(1)}s)`);
  const resultsFile = path.join(ROOT, out, "results.json");
  if (fs.existsSync(resultsFile)) {
    try {
      const rows = JSON.parse(fs.readFileSync(resultsFile, "utf8"));
      const per = {};
      for (const row of rows) {
        per[row.id] = per[row.id] ?? { pass: 0, fail: 0 };
        if (row.verdict === "PASS") per[row.id].pass += 1;
        else per[row.id].fail += 1;
      }
      gateSummary = { rows: rows.length, per };
      console.log(`  ${rows.length} fixture(s): ${Object.entries(per).map(([k, v]) => `${k} ${v.pass}P/${v.fail}F`).join(", ")}`);
    } catch (err) {
      console.log(`  could not parse ${out}/results.json: ${err.message}`);
    }
  } else {
    console.log(`  no results.json at ${out}`);
  }
}

// ---- receipt -----------------------------------------------------------
const passed = results.filter((r) => r.exit === 0).length;
const endingHash = sourceHash();
const post = tokenDivergence();
const changed = sh("git", ["diff", "--stat"]) ?? "";
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const reviewState = "PENDING (independent review required before any score rises)";

const tail = (text, lines = 12) => {
  const all = String(text).split("\n").filter(Boolean);
  return all.slice(-lines).join("\n") || "(no output)";
};

const receipt = [
  `# ${ticket.id} — ${ticket.title}`,
  "",
  `- Ticket: ${ticket.id}`,
  `- Owner: ${ticket.owner ?? "unassigned"}`,
  `- Criterion IDs: ${(ticket.criterionIds ?? []).join(", ")}`,
  `- Review tier: ${ticket.reviewTier ?? "unspecified"}`,
  `- Starting snapshot: ${ticket.startingSnapshot ?? "unspecified"} sourceHash=${startingHash}`,
  `- Source hash: ${endingHash}`,
  `- Generated: ${new Date().toISOString()}`,
  `- Rehearsal: ${rehearsal}`,
  `- Checks: ${passed}/${results.length} exit 0`,
  `- Review: ${reviewState}`,
  `- Integrator acceptance: PENDING`,
  "",
  "## Objective",
  "",
  ticket.objective,
  "",
  "## Guards",
  "",
  `- Gate port ${gate.gatePort} free at start: ${gate.safeToStartTicket || rehearsal}${rehearsal && !gate.safeToStartTicket ? " (rehearsal bypass)" : ""}`,
  `- Files changed outside ownership: ${unowned.length === 0 ? "none" : unowned.join(", ")}`,
  `- Palette reconciled at end: ${post.paletteReconciled}`,
  `- Token divergence at end: ${post.differing.length} differing of ${post.handoffTokens}`,
  ...post.differing.map((d) => `  - \`${d.token}\` handoff=${d.handoff} candidate=${d.candidate}`),
  "",
  "## Check results",
  "",
  "| check | command | exit | seconds |",
  "| --- | --- | ---: | ---: |",
  ...results.map((r) => `| ${r.name} | \`${r.cmd}\` | ${r.exit} | ${r.seconds.toFixed(1)} |`),
  "",
  ...(results.some((r) => r.exit !== 0)
    ? [
        "### Failing output",
        "",
        ...results
          .filter((r) => r.exit !== 0)
          .flatMap((r) => [`**${r.name}** (exit ${r.exit}${r.timedOut ? ", timed out" : ""})`, "", "```", tail(r.output, 25), "```", ""]),
      ]
    : []),
  ...(gateSummary
    ? [
        "## Visual gate",
        "",
        "| component | pass | fail |",
        "| --- | ---: | ---: |",
        ...Object.entries(gateSummary.per).map(([k, v]) => `| ${k} | ${v.pass} | ${v.fail} |`),
        "",
      ]
    : []),
  "## Files owned by this ticket",
  "",
  "| file | hash before | hash after |",
  "| --- | --- | --- |",
  ...(ticket.allowedFiles ?? []).map((f) => `| ${f} | ${preHashes[f] ?? "-"} | ${hashFile(f) ?? "-"} |`),
  "",
  "## Working tree at receipt time",
  "",
  "```",
  tail(changed, 30),
  "```",
  "",
  "## Outstanding receipt fields (roadmap template — fill before integration)",
  "",
  "- Root cause and user-visible outcome:",
  "- Public-contract impact:",
  "- Visual / behavioural / installed-consumer / performance results:",
  "- Checks not run / manual-device gaps / known remaining defects:",
  "- Astra findings, resolution and reviewed hash:",
  "- Integration snapshot and combined-check results:",
  "- Proposed score changes with criterion-specific justification:",
  "",
  "## Scope",
  "",
  `- Out of scope: ${(ticket.outOfScope ?? []).join("; ") || "unspecified"}`,
  `- Owner confirmations required: ${(ticket.ownerConfirmations ?? []).join("; ") || "none"}`,
  "",
].join("\n");

fs.mkdirSync(path.join(ROOT, RECEIPTS_DIR), { recursive: true });
const receiptName = `${ticket.id}-${stamp}${rehearsal ? "-REHEARSAL" : ""}.md`;
const receiptPath = path.join(RECEIPTS_DIR, receiptName);
fs.writeFileSync(path.join(ROOT, receiptPath), receipt);

console.log(`\nreceipt    ${receiptPath}`);
console.log(`checks     ${passed}/${results.length} exit 0`);
console.log(`next       independent review, then: node scripts/ticket/scorecard-guard.mjs --check`);

const anyFailed = results.some((r) => r.exit !== 0);
if (rehearsal) {
  console.log("REHEARSAL receipt written — it is excluded from scorecard evidence.");
}
// A rehearsal changes only the port guard and the receipt marking, never the verdict:
// a failing check still fails, so a rehearsal cannot look healthier than the real run.
process.exit(anyFailed ? 5 : 0);
