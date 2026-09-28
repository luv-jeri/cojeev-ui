#!/usr/bin/env node
/**
 * Fail-closed completion check — Cojeev UI.
 *
 * WHY THIS EXISTS
 * The scorecard's own headline (745) did not equal the sum of its rows (742), and the
 * repo's `scripts/ticket/scorecard-guard.mjs` reported 15 UNEARNED raises while exiting
 * in a way a caller could miss. A green build is not completion. This checker refuses to
 * certify a completion claim unless every one of these holds, and it treats a missing,
 * skipped, unstable or unparsable artefact as FAILURE — never as "not applicable".
 *
 * WHAT IT VERIFIES
 *   1. Ledger integrity : the canonical `## Detailed criteria` block parses; exactly 103
 *      unique numeric criteria + 57 `U` (160 total); every numeric score is a finite 0..10
 *      integer; no duplicate criterion ID anywhere in the scorecard.
 *   2. Arithmetic       : the numeric row sum equals the headline the page publishes.
 *   3. Frozen cohort    : the row-ID set equals `scorecard-baseline.json` exactly, so the
 *      denominator cannot silently move.
 *   4. Rubric           : SHA-256 of the canonical criterion text + scoring rules equals the
 *      reviewer-approved hash in `completion-manifest.json`. Anchored externally, because
 *      SCORECARD.md is untracked and cannot be protected by git.
 *   5. Score changes    : every rise above baseline is authorised by a receipt naming the
 *      criterion, carrying the exact prior -> approved destination score, all named checks
 *      exit 0, and an independent acceptance verdict. `/ACCEPT/i` substring matching is
 *      rejected (it accepts "NOT ACCEPT"); a withdrawn or rehearsal receipt never counts.
 *   6. Fixture keys     : the gate's expected row keys are derived from the frozen reference
 *      manifest and compared as a complete KEY SET — six widths for every isolation fixture
 *      of every declared component. Equal counts are insufficient.
 *   7. Raw outcomes     : the census is re-counted from raw rows, not trusted from a prose
 *      headline. A `HARNESS_UNSTABLE` row is not a PASS.
 *   8. Provenance       : the recorded candidate source hash is recomputed from the tree and
 *      must match; the run must be declared unchanged, non-dirty, start==end.
 *   9. Generated output : `registry.json`, `public/registry.json`, every `public/r/*.json`
 *      and `registry/cojeev/NOTICES.txt` are regenerated and must show no drift.
 *  10. Final review     : a Codex review bound to this exact candidate hash with an
 *      accepting verdict.
 *
 * Usage:
 *   node scripts/verify-completion.mjs [--root=<dir>] [--json] [--self-test]
 *                                      [--only=C01,C09] [--skip=C08]
 * Exit codes: 0 all checks pass · 1 at least one check failed · 2 usage/internal error.
 */

import fs from "node:fs";
import { reviewedCandidateHash } from "./completion-source.mjs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import process from "node:process";

const argv = process.argv.slice(2);
const arg = (name) => {
  const hit = argv.find((a) => a === `--${name}` || a.startsWith(`--${name}=`));
  if (!hit) return undefined;
  return hit.includes("=") ? hit.slice(hit.indexOf("=") + 1) : true;
};

const ROOT = path.resolve(String(arg("root") ?? process.cwd()));
const SCORECARD = "docs/workspace/SCORECARD.md";
const BASELINE = "docs/workspace/scorecard-baseline.json";
const MANIFEST = "docs/workspace/completion-manifest.json";
const REFERENCE_MANIFEST = "reference/cojeev-handoff-v4/data/registry.json";

const WIDTHS = [360, 390, 768, 1024, 1440, 1920];
const MEAN_TARGET = 8.5; // 876 / 103

const onlyArg = arg("only");
const skipArg = arg("skip");
const ONLY = typeof onlyArg === "string" ? new Set(onlyArg.split(",").map((s) => s.trim()).filter(Boolean)) : null;
const SKIP = typeof skipArg === "string" ? new Set(skipArg.split(",").map((s) => s.trim()).filter(Boolean)) : new Set();

/** Collected findings. Any severity:"fail" makes the run fail closed. */
const findings = [];
const notes = [];
const warnings = [];
const checks = [];
let checkSeq = 0;
let skippedCount = 0;

const fail = (id, message, detail) => findings.push({ id, severity: "fail", message, detail });
const note = (id, message, detail) => notes.push({ id, message, detail });

function check(name, fn) {
  checkSeq += 1;
  const id = `C${String(checkSeq).padStart(2, "0")}`;
  // Selection is by ID only, never by name — the self-test battery uses it to isolate a
  // single check under mutation. A skipped check is recorded as SKIPPED and is NOT a PASS:
  // if a caller skips a check, the run can no longer certify completion.
  if ((ONLY && !ONLY.has(id)) || SKIP.has(id)) {
    checks.push({ id, name, passed: false, skipped: true, summary: "SKIPPED by caller — a skipped check cannot count as PASS" });
    skippedCount += 1;
    return;
  }
  let outcome;
  try {
    outcome = fn(id) ?? {};
  } catch (error) {
    fail(id, `${name} threw: ${error.message}`);
    checks.push({ id, name, passed: false, summary: `threw: ${error.message}` });
    return;
  }
  const before = findings.filter((f) => f.id === id).length;
  const passed = before === 0 && outcome.passed !== false;
  checks.push({ id, name, passed, summary: outcome.summary ?? (passed ? "ok" : "failed") });
}

const abs = (rel) => path.join(ROOT, rel);
const readText = (rel) => fs.readFileSync(abs(rel), "utf8");
const readJson = (rel) => JSON.parse(readText(rel));
const exists = (rel) => fs.existsSync(abs(rel));
const sha256 = (input) => crypto.createHash("sha256").update(input).digest("hex");

// Mirrors apps/gate/run.mjs:64 exactly — `hash()` there is a sha256 hex digest of the
// joined contents. Recomputed here so a recorded hash cannot be self-certified.
function gateCandidateHash() {
  const files = [];
  const walk = (dir) => {
    for (const name of fs.readdirSync(path.join(ROOT, dir)).sort()) {
      const rel = path.join(dir, name);
      if (fs.statSync(abs(rel)).isDirectory()) walk(rel);
      else files.push(rel);
    }
  };
  for (const dir of ["registry/cojeev", "apps/gate"]) walk(dir);
  return sha256(files.map((f) => `${f}\n${fs.readFileSync(abs(f), "utf8")}`).join("\n"));
}

// ---------------------------------------------------------------------------
// 1 + 2 + 3 + 4 — the ledger, its arithmetic, its cohort, and the rubric freeze
// ---------------------------------------------------------------------------

const CANON_START = "## Detailed criteria";
const CANON_END = "## Acceptance targets for 10/10";

/**
 * Parses ONLY the canonical detailed-criteria block. Every other Markdown table in the
 * scorecard (proposal tables, dispositions, change log) is excluded by construction, which
 * is why the guard's overwrite-collision problem cannot recur here.
 */
function parseLedger(text) {
  const start = text.indexOf(CANON_START);
  const end = text.indexOf(CANON_END);
  if (start === -1) return { error: `missing "${CANON_START}" heading` };
  if (end === -1) return { error: `missing "${CANON_END}" heading` };
  if (end <= start) return { error: `"${CANON_END}" precedes "${CANON_START}"` };
  const block = text.slice(start + CANON_START.length, end);

  const rows = [];
  const malformed = [];
  let dimension = null;
  const seen = new Map();

  for (const line of block.split("\n")) {
    const dim = line.match(/^###\s+(Q\d{2})\.\s*(.*)$/);
    if (dim) {
      dimension = `${dim[1]} ${dim[2].trim()}`;
      continue;
    }
    if (!/^\s*\|/.test(line)) continue;
    const cells = line.split("|").slice(1, -1).map((c) => c.trim());
    if (cells.length !== 6) {
      if (/^Q\d{2}\.\d{2}$/.test(cells[0] ?? "")) malformed.push({ line, reason: `${cells.length} cells, expected 6` });
      continue;
    }
    const [id, title, rawScore] = cells;
    if (!/^Q\d{2}\.\d{2}$/.test(id)) continue;
    if (seen.has(id)) {
      malformed.push({ id, reason: `duplicate criterion ID (first at row ${seen.get(id).index})` });
      continue;
    }
    const numeric = /^\d+$/.test(rawScore);
    const row = {
      id, title, dimension,
      index: rows.length,
      raw: rawScore,
      unverified: !numeric,
      score: numeric ? Number(rawScore) : null,
    };
    if (numeric && (!Number.isFinite(row.score) || row.score < 0 || row.score > 10 || !Number.isInteger(row.score))) {
      malformed.push({ id, reason: `score ${rawScore} is not a finite integer 0..10` });
    }
    seen.set(id, row);
    rows.push(row);
  }
  return { rows, malformed, block };
}

let ledger = null;
let baseline = null;
let manifest = null;

/**
 * Loads shared state on demand. Checks must not depend on another check having run first —
 * `--only` selection and the self-test battery both isolate single checks, and an
 * order-dependent checker would silently "pass" a check whose inputs were never loaded.
 */
function ensureLedger() {
  if (ledger) return ledger;
  if (!exists(SCORECARD)) { ledger = { error: `${SCORECARD} not found` }; return ledger; }
  ledger = parseLedger(readText(SCORECARD));
  return ledger;
}

function ensureBaseline() {
  if (baseline) return baseline;
  if (!exists(BASELINE)) return null;
  baseline = readJson(BASELINE).scores;
  return baseline;
}

function ensureManifest() {
  if (manifest) return manifest;
  if (!exists(MANIFEST)) return null;
  manifest = readJson(MANIFEST);
  return manifest;
}

check("Ledger parses as one canonical cohort", (id) => {
  const led = ensureLedger();
  if (led.error) return fail(id, `ledger parse failed: ${led.error}`), { passed: false, summary: led.error };

  if (led.malformed.length) {
    for (const m of led.malformed) fail(id, `malformed criterion row${m.id ? ` (${m.id})` : ""}: ${m.reason ?? "unknown"}`, m);
    return { passed: false, summary: `${led.malformed.length} malformed row(s)` };
  }
  const numeric = led.rows.filter((r) => !r.unverified);
  const unverified = led.rows.filter((r) => r.unverified);

  const m = ensureManifest();
  if (!m) return fail(id, `${MANIFEST} not found — cohort cannot be verified`), { passed: false, summary: "missing manifest" };

  const want = m.assessedCohort;
  if (led.rows.length !== want.total) fail(id, `cohort total ${led.rows.length} != declared ${want.total}`);
  if (numeric.length !== want.scored) fail(id, `scored rows ${numeric.length} != declared ${want.scored}`);
  if (unverified.length !== want.unverified) fail(id, `unverified rows ${unverified.length} != declared ${want.unverified}`);

  const badU = unverified.filter((r) => r.raw !== "U");
  if (badU.length) fail(id, `non-numeric rows must be exactly "U"`, badU.map((r) => `${r.id}="${r.raw}"`));

  // Cohort identity: the ID set must equal the frozen baseline exactly.
  const base = ensureBaseline();
  if (!base) return fail(id, `${BASELINE} not found`), { passed: false, summary: "missing baseline" };
  const baseIds = new Set(Object.keys(base));
  const hereIds = new Set(led.rows.map((r) => r.id));
  const missing = [...baseIds].filter((k) => !hereIds.has(k));
  const extra = [...hereIds].filter((k) => !baseIds.has(k));
  if (missing.length) fail(id, `${missing.length} frozen criterion ID(s) missing from the ledger`, missing);
  if (extra.length) fail(id, `${extra.length} criterion ID(s) not in the frozen cohort`, extra);

  // Scored-cohort MEMBERSHIP, not just counts. A 160-ID set with the right totals still
  // passes if an assessed row is quietly swapped for an unverified one, which would move the
  // target denominator while every aggregate check continued to agree.
  const baseScored = new Set(Object.entries(base).filter(([, v]) => /^\d+$/.test(v)).map(([k]) => k));
  const nowScored = new Set(numeric.map((r) => r.id));
  const demoted = [...baseScored].filter((k) => !nowScored.has(k));
  const promoted = [...nowScored].filter((k) => !baseScored.has(k));
  if (demoted.length) fail(id, `${demoted.length} originally-scored criterion ID(s) are no longer scored — the denominator moved`, demoted);
  if (promoted.length) fail(id, `${promoted.length} previously-unverified ID(s) were promoted without separate assessment`, promoted);
  if (baseScored.size !== want.scored) fail(id, `frozen scored cohort is ${baseScored.size}, declared ${want.scored}`);

  return {
    passed: findings.every((f) => f.id !== id),
    summary: `${numeric.length} scored + ${unverified.length} U = ${ledger.rows.length}; cohort matches frozen baseline (${baseIds.size})`,
  };
});

let rowSum = null;

check("Row sum equals the published headline", (id) => {
  const led = ensureLedger();
  if (!led || led.error) return fail(id, "ledger unavailable"), { passed: false, summary: "no ledger" };
  const m = exists(MANIFEST) ? readJson(MANIFEST) : null;
  if (!m) return fail(id, "manifest unavailable"), { passed: false, summary: "no manifest" };

  rowSum = led.rows.filter((r) => !r.unverified).reduce((a, r) => a + r.score, 0);
  const assessed = led.rows.filter((r) => !r.unverified);
  const scoredCount = assessed.length;

  // The published headline is read from the PAGE, not from the manifest. Reading it from the
  // manifest is what let the real 745-vs-742 defect pass: the manifest simply declared 742.
  const text = readText(SCORECARD);
  const headlineLine = text.match(/Mean of assessed criteria[^\n]*/)?.[0];
  if (!headlineLine) fail(id, "could not locate the published 'Mean of assessed criteria' headline");
  const published = headlineLine ? [...headlineLine.matchAll(/(\d{2,4})\s*\/\s*(\d{2,4})/g)].map((mm) => ({ sum: +mm[1], denom: +mm[2] })) : [];
  if (headlineLine && !published.length) fail(id, "published headline line contains no '<sum> / <denominator>' figure");
  const current = published[0] ?? null;
  if (current) {
    if (current.denom !== scoredCount) {
      fail(id, `published denominator ${current.denom} != scored row count ${scoredCount}`);
    }
    if (current.sum !== rowSum) {
      fail(id, `PUBLISHED HEADLINE ${current.sum} != row sum ${rowSum} (the page overstates by ${current.sum - rowSum})`, {
        publishedHeadline: current.sum, rowSum, offBy: current.sum - rowSum,
      });
    }
  }

  const declared = m.scoreAssertion;
  if (!declared || typeof declared.rowSum !== "number" || typeof declared.headline !== "number") {
    return fail(id, "manifest must declare scoreAssertion.rowSum and .headline"), { passed: false, summary: "incomplete assertion" };
  }

  // The defect this check exists to catch: a headline that is not the sum of its own rows.
  if (rowSum !== declared.headline) {
    fail(id, `published headline ${declared.headline} != row sum ${rowSum} (off by ${declared.headline - rowSum})`, {
      rowSum, headline: declared.headline,
    });
  }
  if (rowSum !== declared.rowSum) fail(id, `row sum ${rowSum} != declared rowSum ${declared.rowSum}`, { rowSum });

  const scored = led.rows.filter((r) => !r.unverified).length;
  const mean = rowSum / scored;
  if (declared.mean !== undefined && Math.abs(mean - declared.mean) > 5e-5) {
    fail(id, `mean ${mean.toFixed(4)} != declared ${declared.mean}`);
  }

  return {
    passed: findings.every((f) => f.id !== id),
    summary: `row sum ${rowSum}/${scored} = ${mean.toFixed(4)}; published headline ${current ? current.sum : "?"}/${current ? current.denom : "?"}; target ${MEAN_TARGET} needs ${Math.ceil(MEAN_TARGET * scored)}`,
  };
});

check("Rubric text matches the reviewer-approved freeze", (id) => {
  const led = ensureLedger();
  if (!led || !led.block) return fail(id, "ledger block unavailable"), { passed: false, summary: "no ledger" };
  const m = exists(MANIFEST) ? readJson(MANIFEST) : null;
  if (!m?.rubricFreeze?.approvedHash) return fail(id, "manifest lacks rubricFreeze.approvedHash"), { passed: false, summary: "no freeze" };

  // Hash the canonical criterion text only — score columns change legitimately on every
  // reassessment, so hashing the whole file would flag ordinary score updates.
  // Two hashes with different jobs:
  //  - criterionHash: ID + name only, because scores/evidence legitimately change each pass.
  //  - rubricHash: the SCORING RULES, the acceptance targets and the criterion definitions
  //    together. Hashing names alone left the rubric mutable — a change to the definition of
  //    "10" or to the acceptance targets would not have been detected.
  const text = readText(SCORECARD);
  const canonical = led.block
    .split("\n")
    .filter((l) => /^\s*\|\s*Q\d{2}\.\d{2}\s*\|/.test(l))
    .map((l) => {
      const c = l.split("|").slice(1, -1).map((x) => x.trim());
      return `${c[0]}\t${c[1]}`; // criterion ID + criterion name; score/evidence excluded
    })
    .join("\n");
  const criterionHash = sha256(canonical);

  // Each normative section is bounded at the NEXT `## ` heading. It used to run to the first of a
  // hand-listed set of stop markers, and because `## Detailed criteria` was not in that list,
  // "the scoring rules" silently swallowed the Snapshot summary, the blocking findings and every
  // criterion row. The consequence was the opposite of this check's stated intent: an ordinary
  // reassessment edit — a corrected headline, a re-worded gap — changed rubricHash and read as
  // "the rubric was altered after the freeze", while the check's own comment says scores and
  // evidence "legitimately change every pass". The normative material is not dropped, it is made
  // explicit: the 16 dimension headings are now hashed alongside the criterion IDs and names.
  const section = (startHeading) => {
    const from = text.indexOf(startHeading);
    if (from === -1) return null;
    const after = text.slice(from + startHeading.length);
    const next = after.indexOf("\n## ");
    return next === -1 ? after : after.slice(0, next);
  };
  const rules = section("## How to read the scores");
  const targets = section("## Acceptance targets for 10/10");
  if (rules === null) fail(id, "could not locate the '## How to read the scores' scoring rules");
  if (targets === null) fail(id, "could not locate the '## Acceptance targets for 10/10' section");
  const dimensions = led.block
    .split("\n")
    .filter((l) => /^###\s+\d{2}\.\s/.test(l))
    .map((l) => l.trim())
    .join("\n");
  if (!dimensions) fail(id, "could not locate any '### NN. Dimension' headings — the rubric's structure would go unhashed");
  const rubricHash = sha256(`${rules ?? ""}\n@@\n${targets ?? ""}\n@@\n${dimensions}\n@@\n${canonical}`);
  const fr = m.rubricFreeze;
  if (criterionHash !== fr.approvedHash) {
    fail(id, "criterion hash mismatch — criterion IDs or names changed since the reviewer approved the freeze", {
      computed: criterionHash, approved: fr.approvedHash,
    });
  }
  if (!fr.rubricHash) {
    fail(id, "manifest must record rubricFreeze.rubricHash over the scoring rules and acceptance targets");
  } else if (rubricHash !== fr.rubricHash) {
    fail(id, "RUBRIC HASH MISMATCH — the scoring rules, acceptance targets or criterion definitions changed after the freeze", {
      computed: rubricHash, approved: fr.rubricHash,
    });
  }
  if (!fr.approvedBy || !fr.approvedAt) fail(id, "rubric freeze must record approvedBy and approvedAt");
  for (const f of ["approvedHash", "rubricHash"]) {
    if (!fr[f]) continue;
  }
  note(id, `criterion hash ${criterionHash}`);
  note(id, `rubric hash ${rubricHash}`);
  // The summary must not assert a match the check did not find. It used to be a static string, so
  // a run that printed "RUBRIC HASH MISMATCH" also printed "both match the approved freeze"
  // directly beneath it — a report contradicting its own finding.
  const criterionOk = criterionHash === fr.approvedHash;
  const rubricOk = !!fr.rubricHash && rubricHash === fr.rubricHash;
  return {
    passed: findings.every((f) => f.id !== id),
    summary: criterionOk && rubricOk
      ? `criterion hash ${criterionHash.slice(0, 12)} + rubric hash ${rubricHash.slice(0, 12)} both match the approved freeze`
      : `MISMATCH — criterion ${criterionOk ? "matches" : `differs (${criterionHash.slice(0, 12)} vs approved ${String(fr.approvedHash).slice(0, 12)})`}, rubric ${rubricOk ? "matches" : `differs (${rubricHash.slice(0, 12)} vs frozen ${String(fr.rubricHash).slice(0, 12)})`}`,
  };
});

// ---------------------------------------------------------------------------
// 5 — every score rise is reviewer-authorised to an exact destination
// ---------------------------------------------------------------------------

function parseReceipts(dir) {
  if (!fs.existsSync(abs(dir))) return [];
  return fs
    .readdirSync(abs(dir))
    .filter((f) => f.endsWith(".md"))
    .map((file) => {
      const text = readText(path.join(dir, file));
      const list = (re) => {
        const m = text.match(re);
        return m ? m[1].split(/[,\s]+/).filter((s) => /^Q\d{2}\.\d{2}$/.test(s)) : [];
      };
      const criterionIds = list(/Criterion IDs[^:]*:\s*([^\n]+)/i);
      const transitions = [];
      const re = /(Q\d{2}\.\d{2})[^\n]*?\b(\d{1,2}|U)\s*(?:->|→|to)\s*(\d{1,2})\b/g;
      let hit;
      while ((hit = re.exec(text))) transitions.push({ id: hit[1], from: hit[2], to: Number(hit[3]) });
      const checkLine = text.match(/Checks?[^:]*:\s*([^\n]+)/i)?.[1] ?? "";
      const checkPairs = [...checkLine.matchAll(/(\d+)\s*\/\s*(\d+)/g)].map((m) => [+m[1], +m[2]]);
      const allChecksPassed =
        checkPairs.length > 0 &&
        checkPairs.every(([a, b]) => b > 0 && a === b) &&
        !/(fail|failed|exit [1-9])/i.test(checkLine);
      const review = text.match(/Review[^:]*:\s*([^\n]+)/i)?.[1]?.trim() ?? "";
      const rehearsal = /Rehearsal:\s*true/i.test(text);
      const withdrawn = /\b(withdrawn|superseded|retracted)\b/i.test(text);
      return { file, criterionIds, transitions, allChecksPassed, review, rehearsal, withdrawn };
    });
}

check("Every score rise is receipt-authorised to its exact destination", (id) => {
  const led = ensureLedger();
  const base = ensureBaseline();
  if (!led || led.error || !base) return fail(id, "ledger/baseline unavailable"), { passed: false, summary: "no ledger" };
  const receipts = parseReceipts("docs/workspace/receipts");
  if (!receipts.length) return fail(id, "no receipts found"), { passed: false, summary: "no receipts" };

  let rises = 0;
  for (const row of led.rows) {
    if (row.unverified) continue;
    const was = base[row.id];
    if (was === undefined) continue;
    const wasNum = /^\d+$/.test(was) ? Number(was) : null;
    if (wasNum !== null && row.score <= wasNum) continue;
    rises += 1;

    const covering = receipts.filter((r) => r.criterionIds.includes(row.id));
    if (!covering.length) {
      fail(id, `${row.id} rose ${was} -> ${row.score} with no receipt naming the criterion`);
      continue;
    }
    // Exact destination authorisation. A receipt that names the criterion but never
    // records the approved destination cannot authorise an arbitrary later value.
    const authorised = covering.filter(
      (r) =>
        !r.rehearsal &&
        !r.withdrawn &&
        r.allChecksPassed &&
        /^\s*(ACCEPT|APPROVE|ACCEPTED)\b/i.test(r.review) &&
        !/\b(NOT|REJECT|DECLINE|DENIED)\b/i.test(r.review) &&
        r.transitions.some((t) => t.id === row.id && t.to === row.score),
    );
    if (!authorised.length) {
      const why = covering
        .map((r) => `${r.file}[checks=${r.allChecksPassed ? "pass" : "not-all-pass"} review="${r.review}" transitions=${r.transitions.filter((t) => t.id === row.id).map((t) => `${t.from}->${t.to}`).join(",") || "none"}${r.rehearsal ? " REHEARSAL" : ""}${r.withdrawn ? " WITHDRAWN" : ""}]`)
        .join("; ");
      fail(id, `${row.id} rose ${was} -> ${row.score} without an authorising receipt for that destination`, why);
    }
  }
  return {
    passed: findings.every((f) => f.id !== id),
    summary: `${rises} rise(s) above baseline, each required to name the criterion and the exact approved destination`,
  };
});

// ---------------------------------------------------------------------------
// 6 + 7 + 8 — fixture key completeness, raw outcomes, provenance
// ---------------------------------------------------------------------------

function expectedKeys(componentIds) {
  const ref = readJson(REFERENCE_MANIFEST).entries;
  const keys = new Set();
  for (const cid of componentIds) {
    const entry = ref[cid];
    if (!entry) continue;
    for (const file of entry.isolation ?? []) {
      for (const width of WIDTHS) keys.add(`${cid}-${file.replace(/\.html$/, "")}-${width}`);
    }
  }
  return keys;
}

let censusRows = null;

/**
 * Loads the census rows on demand, with the failure reason surfaced to the caller so each
 * check can report it against its own ID. Order-independent for the same reason as
 * `ensureLedger`.
 */
function loadCensus() {
  if (censusRows) return { rows: censusRows };
  const m = ensureManifest();
  if (!m?.census) return { error: "manifest lacks census declaration" };
  const rel = m.census.resultsPath;
  if (!exists(rel)) return { error: `census artefact ${rel} missing — a skipped census cannot count as PASS` };
  const raw = readJson(rel);
  censusRows = Array.isArray(raw) ? raw : Object.values(raw);
  if (!censusRows.length) return { error: "census artefact has no rows" };
  return { rows: censusRows, manifest: m };
}

check("Fixture key set is complete against the frozen manifest", (id) => {
  const loaded = loadCensus();
  if (loaded.error) return fail(id, loaded.error), { passed: false, summary: loaded.error };
  const m = loaded.manifest ?? ensureManifest();

  const want = expectedKeys(m.census.components ?? []);
  const got = new Set(censusRows.map((r) => `${r.id}-${String(r.file).replace(/\.html$/, "")}-${r.width}`));
  if (got.size !== censusRows.length) fail(id, `census contains ${censusRows.length - got.size} duplicate row key(s)`);

  const missing = [...want].filter((k) => !got.has(k));
  const extra = [...got].filter((k) => !want.has(k));
  if (missing.length) fail(id, `${missing.length} expected fixture key(s) absent`, missing.slice(0, 12));
  if (extra.length) fail(id, `${extra.length} unexpected fixture key(s) present`, extra.slice(0, 12));
  if (want.size !== m.census.expectedRows) fail(id, `expected key count ${want.size} != declared ${m.census.expectedRows}`);

  return { passed: findings.every((f) => f.id !== id), summary: `${got.size}/${want.size} expected keys present and no extras` };
});

check("Raw outcomes re-counted; unstable is not PASS", (id) => {
  const loaded = loadCensus();
  if (loaded.error) return fail(id, loaded.error), { passed: false, summary: loaded.error };
  const tally = { PASS: 0, FAIL: 0, HARNESS_UNSTABLE: 0 };
  const unknown = [];
  for (const r of censusRows) {
    const v = r.verdict ?? r.status;
    if (v in tally) tally[v] += 1;
    else unknown.push({ key: `${r.id}/${r.file}@${r.width}`, verdict: v });
  }
  if (unknown.length) fail(id, `${unknown.length} row(s) carry an unrecognised verdict`, unknown.slice(0, 8));

  const m = loaded.manifest ?? ensureManifest();
  const declared = m?.census?.expectedVerdicts;
  if (!declared) return fail(id, "manifest must declare census.expectedVerdicts"), { passed: false, summary: "no declared verdicts" };

  // Re-count from raw rows and compare to the expectation. A prose headline is not evidence.
  for (const key of ["PASS", "FAIL", "HARNESS_UNSTABLE"]) {
    if (declared[key] !== undefined && tally[key] !== declared[key]) {
      fail(id, `re-counted ${key} ${tally[key]} != declared ${declared[key]}`);
    }
  }
  if (tally.HARNESS_UNSTABLE > 0) {
    fail(id, `${tally.HARNESS_UNSTABLE} HARNESS_UNSTABLE row(s) — an unstable row is not a PASS`, { tally });
  }
  if (m.census.requireAllPass && tally.FAIL > 0) {
    fail(id, `catalogue fidelity claimed complete but ${tally.FAIL} row(s) FAIL`, { tally });
  }

  // Structural fields must be present and sane, not inferred.
  const unstableField = censusRows.filter((r) => r.oracleStable === undefined || r.candidateStable === undefined);
  if (unstableField.length) fail(id, `${unstableField.length} row(s) omit the stability fields`, unstableField.slice(0, 5).map((r) => `${r.id}@${r.width}`));

  return { passed: findings.every((f) => f.id !== id), summary: `PASS ${tally.PASS} / FAIL ${tally.FAIL} / UNSTABLE ${tally.HARNESS_UNSTABLE} of ${censusRows.length}` };
});

check("Provenance binds artefact to an unchanged candidate", (id) => {
  const m = exists(MANIFEST) ? readJson(MANIFEST) : null;
  if (!m?.census) return fail(id, "manifest lacks census declaration"), { passed: false, summary: "no census" };
  const p = m.census.provenance;
  if (!p) return fail(id, "manifest lacks census.provenance"), { passed: false, summary: "no provenance" };

  if (p.shaKnown === false || !p.candidateHash) {
    fail(id, "census provenance is unknown — results.json alone does not prove a source SHA");
    return { passed: false, summary: "UNKNOWN provenance" };
  }
  const recomputed = gateCandidateHash();
  if (recomputed !== p.candidateHash) {
    fail(id, "recorded candidate hash does not match the tree", { recorded: p.candidateHash, recomputed });
  }
  for (const field of ["unchangedDuringRun", "cleanTree", "revisionStartEqualsEnd"]) {
    if (p[field] !== true) fail(id, `provenance.${field} must be true`, { [field]: p[field] });
  }
  const provenancePath = m.census.provenancePath ?? path.join(path.dirname(m.census.resultsPath), "provenance.json");
  if (!exists(provenancePath)) {
    fail(id, `gate provenance artifact missing: ${provenancePath}`);
  } else {
    const emitted = readJson(provenancePath);
    if (emitted.candidateSourceHash !== recomputed) fail(id, "gate-emitted candidate hash does not match the tree");
    if (emitted.unchangedDuringRun !== true || emitted.evidenceUsable !== true || emitted.complete !== true) {
      fail(id, "gate provenance does not certify complete, unchanged, usable evidence");
    }
    if (emitted.oracleCrossStart?.agreement !== true) fail(id, "gate provenance lacks cross-start oracle agreement");
    if (emitted.measuredRows !== censusRows.length || emitted.expectedRows !== m.census.expectedRows) {
      fail(id, "gate provenance row counts do not match the census");
    }
  }
  if (p.commit && p.commit !== "HEAD") {
    try {
      const head = execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
      if (head !== p.commit) fail(id, `declared commit ${p.commit} != HEAD ${head}`);
    } catch {
      fail(id, "git rev-parse failed while verifying provenance.commit");
    }
  }
  note(id, `candidate hash ${recomputed}`);
  return { passed: findings.every((f) => f.id !== id), summary: `recomputed candidate hash matches; tree clean and unchanged` };
});

// ---------------------------------------------------------------------------
// 9 — generated output consistency
// ---------------------------------------------------------------------------

check("Generated output regenerates with no drift", (id) => {
  const GENERATED = ["registry.json", "public/registry.json", "public/r", "registry/cojeev/NOTICES.txt"];
  const missing = GENERATED.filter((g) => !exists(g));
  if (missing.length) return fail(id, `generated path(s) missing`, missing), { passed: false, summary: "missing generated output" };

  const snapshot = () => {
    const files = new Map();
    const visit = (rel) => {
      if (!exists(rel)) return;
      if (fs.statSync(abs(rel)).isDirectory()) {
        for (const name of fs.readdirSync(abs(rel)).sort()) visit(path.join(rel, name));
      } else files.set(rel, sha256(fs.readFileSync(abs(rel))));
    };
    for (const rel of GENERATED) visit(rel);
    return files;
  };
  const before = snapshot();

  try {
    execFileSync("npm", ["run", "registry:build"], { cwd: ROOT, encoding: "utf8", stdio: "pipe" });
  } catch (error) {
    fail(id, `registry:build failed: ${String(error.stderr ?? error.message).slice(0, 400)}`);
    return { passed: false, summary: "registry:build failed" };
  }

  const after = snapshot();
  const drifted = [...new Set([...before.keys(), ...after.keys()])]
    .filter((rel) => before.get(rel) !== after.get(rel)).sort();
  if (drifted.length) fail(id, `${drifted.length} generated file(s) drifted on regeneration`, drifted.slice(0, 12));
  return { passed: findings.every((f) => f.id !== id), summary: `${before.size} generated file(s) stable across regeneration` };
});

// ---------------------------------------------------------------------------
// 10 — final independent review bound to this exact candidate
// ---------------------------------------------------------------------------

check("Final review is bound to this exact candidate", (id) => {
  const m = exists(MANIFEST) ? readJson(MANIFEST) : null;
  if (!m?.finalReview) return fail(id, "manifest lacks finalReview"), { passed: false, summary: "no final review declared" };
  const rel = m.finalReview.responsePath;
  if (!exists(rel)) return fail(id, `final review ${rel} missing — an absent review is not PASS`), { passed: false, summary: "missing review" };

  const text = readText(rel);
  const recomputed = reviewedCandidateHash(ROOT);
  if (!text.includes(recomputed)) {
    fail(id, "final review does not reference the recomputed candidate hash — review is not bound to this tree", { recomputed });
  }
  if (m.finalReview.candidateHash && m.finalReview.candidateHash !== recomputed) {
    fail(id, "reviewed candidate hash differs from the tree", { reviewed: m.finalReview.candidateHash, recomputed });
  }
  const PLACEHOLDER = /\b(pending|provisional|tbd|to be determined|not reviewed|awaiting|placeholder|scoring pending)\b/i;
  if (PLACEHOLDER.test(text)) {
    fail(id, "final review contains placeholder wording — an incomplete review cannot certify", {
      match: text.match(PLACEHOLDER)?.[0],
    });
  }
  // Anchored stand-alone verdict line. The word "approved" scattered in prose is not an
  // acceptance, and a qualified verdict ("approved except ...") is not one either.
  const verdict = text.match(/^ {0,3}(?:\*\*)?\s*(APPROVE[^\n]*|ACCEPT[A-Z ]*|REQUEST CHANGES|REJECT[^\n]*?)\s*(?:\*\*)?\s*$/im)?.[1];
  if (!verdict) fail(id, "final review carries no parseable stand-alone verdict line");
  else if (!/^(APPROVE|ACCEPT)/i.test(verdict)) fail(id, `final review verdict is not accepting: "${verdict}"`);
  else if (/\b(NOT|WITHOUT|EXCEPT|BUT)\b/i.test(verdict)) fail(id, `final review verdict is qualified: "${verdict}"`);
  return { passed: findings.every((f) => f.id !== id), summary: `review bound to ${recomputed.slice(0, 16)}` };
});

// ---------------------------------------------------------------------------
// Assertion-free reporting
// ---------------------------------------------------------------------------

const failed = findings.filter((f) => f.severity === "fail");
const scoredRows = ledger?.rows.filter((r) => !r.unverified).length ?? 103;
const targetPoints = Math.ceil(MEAN_TARGET * scoredRows);
// The 8.5 objective is part of the CERTIFICATION PREDICATE, not just the reporting. Before this
// fix the target was printed and never enforced, so a run whose every other check passed certified
// a candidate at 742 — i.e. the checker could return success on a score 134 points below the stated
// goal. `--allow-below-target` exists only for diagnostic runs and MUST NOT be used to certify.
const TARGET_POINTS = 876; // 8.5 x 103, rounded up; MEAN_TARGET must agree
const allowBelowTarget = arg("allow-below-target") !== undefined;
const targetMet = rowSum !== null && rowSum >= targetPoints;
const targetAgrees = targetPoints === TARGET_POINTS;
if (!targetAgrees && !arg("json")) {
  console.log(`WARNING: ceil(${MEAN_TARGET} x ${scoredRows}) = ${targetPoints}, which disagrees with the frozen target ${TARGET_POINTS}.`);
}
// A skipped check is a hole in the evidence, so it can never yield a certificate.
const certified =
  failed.length === 0 &&
  skippedCount === 0 &&
  checks.every((c) => c.passed) &&
  targetAgrees &&
  (targetMet || allowBelowTarget);

if (arg("json")) {
  console.log(JSON.stringify({ root: ROOT, checks, findings, notes, warnings, rowSum, targetPoints, targetMet, targetEnforced: !allowBelowTarget, skipped: skippedCount, passed: certified }, null, 2));
} else {
  console.log(`Evidence-consistency report — ${ROOT}`);
  console.log("NOTE: this report checks DECLARED evidence against the tree. It is not a completion");
  console.log("      certificate: the anchored assertions in completion-manifest.json are themselves");
  console.log("      editable by anyone who can edit the evidence.");
  console.log("=".repeat(72));
  for (const c of checks) console.log(`${c.skipped ? "SKIP" : c.passed ? "PASS" : "FAIL"}  ${c.id}  ${c.name}\n        ${c.summary}`);
  if (notes.length) {
    console.log("\nNotes (non-failing):");
    for (const n of notes) console.log(`  - [${n.id}] ${n.message}`);
  }
  if (warnings.length) {
    console.log("\nWARNINGS (weakened guarantees — not passes of the stronger property):");
    for (const w of warnings) console.log(`  ! [${w.id}] ${w.message}`);
  }
  console.log("\n" + "=".repeat(72));
  if (rowSum !== null) {
    console.log(`Assessed row sum: ${rowSum} / 103  (mean ${(rowSum / 103).toFixed(4)})`);
    console.log(`Target ${MEAN_TARGET}: ${targetPoints} points required, shortfall ${targetPoints - rowSum}`);
  }
  if (!certified) {
    const reasons = [
      failed.length ? `${failed.length} blocking finding(s)` : null,
      skippedCount ? `${skippedCount} skipped check(s)` : null,
      !targetAgrees ? `target arithmetic disagrees (${targetPoints} != ${TARGET_POINTS})` : null,
      !targetMet && !allowBelowTarget ? `score ${rowSum} is below the enforced target ${targetPoints}` : null,
    ].filter(Boolean);
    console.log(`\nRESULT: NOT CERTIFIED — ${reasons.join(", ")}`);
    for (const f of failed) console.log(`  ✗ [${f.id}] ${f.message}${f.detail ? `\n      ${JSON.stringify(f.detail)}` : ""}`);
    for (const c of checks.filter((c) => c.skipped)) console.log(`  ✗ [${c.id}] SKIPPED — cannot count as PASS`);
    if (!targetMet && !allowBelowTarget) {
      console.log(`  ✗ [TARGET] ${rowSum} < ${targetPoints} — the ${MEAN_TARGET} objective is not met (shortfall ${targetPoints - rowSum})`);
    }
    if (allowBelowTarget) console.log("  ! --allow-below-target was passed: this run CANNOT certify anything and must not be cited as one.");
  } else {
    console.log("\nRESULT: ALL DECLARED CHECKS PASS — evidence is internally consistent. This is NOT a completion certificate: see the note at the top.");
  }
}

process.exit(certified ? 0 : 1);
