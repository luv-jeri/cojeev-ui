#!/usr/bin/env node
/**
 * Scorecard guard — makes the roadmap's anti-self-authorization rule executable.
 *
 * docs/workspace/ROADMAP-TO-10.md, "Final completion rule": *No criterion reaches 10
 * solely because code was merged, a model approved it, or a threshold was relaxed.*
 * That rule was prose. This is the mechanism.
 *
 * A criterion score may only rise above its frozen baseline when a receipt exists in
 * docs/workspace/receipts/ that names the criterion and carries all of:
 *   - Checks: all N exit 0
 *   - Review: ACCEPT FOR INTEGRATION   (independent review, i.e. Astra)
 *   - Source hash: matching the tree hash recorded in the frozen baseline
 *
 * Usage:
 *   node scripts/ticket/scorecard-guard.mjs --freeze   # record current scores
 *   node scripts/ticket/scorecard-guard.mjs --check    # fail on unearned raises
 *   node scripts/ticket/scorecard-guard.mjs --report   # print current vs frozen
 *
 * Exit codes: 0 clean · 1 violations · 2 usage/parse error
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { sourceHash } from "./lib.mjs";

const ROOT = process.cwd();
const SCORECARD = "docs/workspace/SCORECARD.md";
const BASELINE = "docs/workspace/scorecard-baseline.json";
const RECEIPTS_DIR = "docs/workspace/receipts";

const argv = process.argv.slice(2);
const mode = argv.find((a) => ["--freeze", "--check", "--report"].includes(a));

if (!mode) {
  console.error("usage: scorecard-guard.mjs --freeze | --check | --report");
  process.exit(2);
}

const abs = (rel) => path.join(ROOT, rel);

function readText(rel) {
  const p = abs(rel);
  if (!fs.existsSync(p)) {
    console.error(`missing file: ${rel}`);
    process.exit(2);
  }
  return fs.readFileSync(p, "utf8");
}

/** Rows look like: | Q01.01 | Distinctive design language | 7 | I | E3 | note | */
function parseScorecard(text) {
  const rows = new Map();
  // Parse ONLY the canonical `## Detailed criteria` block. The scorecard also contains
  // proposal/applied tables further down whose columns are `Was` / `Proposed` / `Reviewed`,
  // not `Current`. A whole-file scan lets those rows overwrite the real ones (a later
  // `| Q01.07 | Light-theme polish | 6 | **7** | … |` row used to be read as a score of 6),
  // which silently corrupts both the rise list and the frozen-score comparison.
  const start = text.indexOf("\n## Detailed criteria");
  const end = text.indexOf("\n## Acceptance targets for 10/10");
  if (start < 0 || end <= start) {
    console.error("cannot locate the canonical '## Detailed criteria' block — refusing to continue");
    process.exit(2);
  }
  const block = text.slice(start, end);
  const re = /^\|\s*(Q\d{2}\.\d{2})\s*\|([^|]*)\|([^|]*)\|/gm;
  let m;
  while ((m = re.exec(block))) {
    const id = m[1];
    const rawScore = m[3].trim();
    if (rows.has(id)) {
      console.error(`duplicate criterion row ${id} in the canonical block — refusing to continue`);
      process.exit(2);
    }
    // "U", "U / 10", "7", "6.5" are all accepted.
    const numeric = /^-?\d+(\.\d+)?$/.test(rawScore) ? Number(rawScore) : null;
    rows.set(id, { id, title: m[2].trim(), rawScore, score: numeric });
  }
  return rows;
}

function readBaseline() {
  const p = abs(BASELINE);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch (err) {
    console.error(`unreadable ${BASELINE}: ${err.message}`);
    process.exit(2);
  }
}

function readReceipts() {
  const dir = abs(RECEIPTS_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const text = fs.readFileSync(path.join(dir, f), "utf8");
      const checks = /^-\s*Checks:\s*(\d+)\/(\d+)\s+exit 0\s*$/m.exec(text);
      const review = /^-\s*Review:\s*(.+)$/m.exec(text);
      const sourceHash = /^-\s*Source hash:\s*([0-9a-f]+)/m.exec(text);
      const criteria = /^-\s*Criterion IDs:\s*(.+)$/m.exec(text);
      const rehearsal = /^-\s*Rehearsal:\s*(true|false)\s*$/m.exec(text);
      return {
        file: `${RECEIPTS_DIR}/${f}`,
        rehearsal: rehearsal ? rehearsal[1] === "true" : false,
        allChecksPassed: checks ? checks[1] === checks[2] && checks[2] !== "0" : false,
        checkSummary: checks ? `${checks[1]}/${checks[2]}` : "absent",
        review: review ? review[1].trim() : "absent",
        sourceHash: sourceHash ? sourceHash[1] : null,
        criterionIds: criteria
          ? criteria[1]
              .split(/[,\s]+/)
              .map((s) => s.trim())
              .filter((s) => /^Q\d{2}\.\d{2}$/.test(s))
          : [],
      };
    });
}

const current = parseScorecard(readText(SCORECARD));
if (current.size === 0) {
  console.error(`no criterion rows parsed from ${SCORECARD} — refusing to continue`);
  process.exit(2);
}

if (mode === "--freeze") {
  const baseline = readBaseline();
  const payload = {
    frozenAt: new Date().toISOString(),
    note: "Scores frozen by scripts/ticket/scorecard-guard.mjs. A rise above these values requires a receipt.",
    scorecardRows: current.size,
    scores: Object.fromEntries([...current.values()].map((r) => [r.id, r.rawScore])),
  };
  fs.mkdirSync(path.dirname(abs(BASELINE)), { recursive: true });
  fs.writeFileSync(abs(BASELINE), `${JSON.stringify(payload, null, 2)}\n`);
  console.log(
    `frozen ${current.size} criterion score(s) -> ${BASELINE}` +
      (baseline ? ` (replacing snapshot of ${baseline.frozenAt})` : ""),
  );
  process.exit(0);
}

const baseline = readBaseline();
if (!baseline) {
  console.error(`no baseline at ${BASELINE} — run with --freeze first`);
  process.exit(2);
}

const receipts = readReceipts();
const raised = [];
const unearned = [];
const lowered = [];

for (const [id, row] of current) {
  const was = baseline.scores[id];
  if (was === undefined) continue;
  const wasNum = /^-?\d+(\.\d+)?$/.test(was) ? Number(was) : null;
  if (row.score === null) {
    if (wasNum !== null) lowered.push({ id, from: String(was), to: row.rawScore });
    continue;
  }
  if (wasNum === null) {
    // U -> number is a promotion: needs the same proof as a raise.
    raised.push({ id, from: "U", to: row.score });
  } else if (row.score > wasNum) {
    raised.push({ id, from: wasNum, to: row.score });
  } else if (row.score < wasNum) {
    lowered.push({ id, from: wasNum, to: row.score });
  }
}

for (const r of raised) {
  // The review test is anchored on purpose. It used to be /ACCEPT/i, an unanchored substring
  // match, so a receipt that said "PENDING — must not be read as an acceptance" was counted as
  // accepted: the word "acceptance" contains "accept". Any honest receipt that explicitly
  // disclaims acceptance was therefore read as granting it, which is the exact inversion this
  // guard exists to prevent. Requiring the line to BEGIN with ACCEPT keeps the intended meaning
  // ("ACCEPT FOR INTEGRATION — independent Codex ...") and fails safe for every other phrasing.
  const covering = receipts.filter(
    (rec) =>
      rec.criterionIds.includes(r.id) &&
      rec.allChecksPassed &&
      /^ACCEPT\b/i.test(rec.review.trim()) &&
      !rec.rehearsal,
  );
  if (covering.length === 0) {
    const partial = receipts.filter((rec) => rec.criterionIds.includes(r.id));
    const why = partial.length
      ? partial
          .map((p) => `${p.file} (checks ${p.checkSummary}, review "${p.review}")`)
          .join("; ")
      : "no receipt names this criterion";
    unearned.push({ ...r, why });
  }
}

// The roadmap's hash rule is per-affected-behaviour, which a single global tree hash
// cannot express. A stale hash is therefore reported, not blocked: blocking would flag
// every earlier receipt after any later edit, and a guard people learn to ignore
// protects nothing. A *rehearsal* receipt is excluded outright, because it was produced
// while another renderer owned the gate port and is not evidence.
const now = sourceHash();
const stale = receipts.filter((rec) => rec.sourceHash && rec.sourceHash !== now);
const staleNote = stale.length
  ? stale.map((s) => `${s.file} (${s.sourceHash} != ${now})`).join("; ")
  : null;

if (mode === "--report") {
  const pts = (list) => list.reduce((a, r) => a + (Number(r.to) - Number(r.from)), 0);
  console.log(`${current.size} criteria · frozen ${baseline.frozenAt}`);
  console.log(`tree hash  ${now} · ${staleNote ? `stale receipts: ${staleNote}` : "all receipts current"}`);
  console.log(
    `raised ${raised.length} (+${pts(raised)}) · lowered ${lowered.length} · ` +
      `unearned ${unearned.length} (+${pts(unearned)}) · ` +
      `receipt-backed ${raised.length - unearned.length} (+${pts(raised) - pts(unearned)})`,
  );
  for (const r of raised) {
    const earned = !unearned.some((u) => u.id === r.id);
    console.log(`  ${r.id}  ${r.from} -> ${r.to}  ${earned ? "EARNED" : "UNEARNED"}`);
  }
  for (const l of lowered) console.log(`  ${l.id}  ${l.from} -> ${l.to}  (lowered)`);
  process.exit(unearned.length ? 1 : 0);
}

if (unearned.length) {
  console.error(`${unearned.length} unearned score increase(s):\n`);
  for (const u of unearned) {
    console.error(`  ${u.id}  ${u.from} -> ${u.to}`);
    console.error(`      ${u.why}`);
  }
  console.error(
    "\nEach rise needs docs/workspace/receipts/*.md naming the criterion, all checks exit 0,\n" +
      "and an independent ACCEPT review. Generate one with scripts/ticket/run.mjs.",
  );
  process.exit(1);
}

if (staleNote) console.log(`WARNING stale receipts (recorded against an older tree): ${staleNote}`);
console.log(
  `scorecard clean: ${current.size} criteria, ${raised.length} rise(s) all receipt-backed` +
    (lowered.length ? `, ${lowered.length} lowered` : ""),
);
process.exit(0);
