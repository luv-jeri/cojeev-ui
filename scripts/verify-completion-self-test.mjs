#!/usr/bin/env node
/**
 * Adversarial self-test for scripts/verify-completion.mjs.
 *
 * A completion checker that has never been shown to SUCCEED is not a check either: a battery
 * that only ever proves rejection cannot distinguish "fail-closed" from "fails for anything".
 * This battery therefore builds a KNOWN-VALID fixture that the checker fully certifies
 * (exit 0, `passed: true`, every C01–C09 PASS), and then applies one deliberate defect at a
 * time, asserting for each that the checker (a) exits non-zero and (b) names the specific
 * defect. Every mutation must also demonstrably change the input it targets.
 *
 * The known-valid fixture is a sandbox copy of the real tree transformed into a consistent
 * certification input:
 *   - every scored ledger row is set to 9 (row sum 927 / 103, mean 9.0, above the 876 target);
 *   - the published "Mean of assessed criteria" headline is rewritten to the literal row sum;
 *   - `completion-manifest.json`'s scoreAssertion, rubricFreeze (recomputed), census.provenance
 *     (recomputed candidate hash) and finalReview.candidateHash are re-anchored to the fixture;
 *   - the receipts directory is replaced by one synthetic receipt authorising every rise to 9;
 *   - `.work/preflight/codex-preflight-response.md` becomes an anchored ACCEPT bound to the
 *     recomputed candidate hash.
 *
 * C08 (`registry:build` idempotence) is NOT stubbed: the sandbox carries the real generator,
 * its helper scripts, its data inputs and a symlink to the repository's installed
 * `node_modules`, so the real `npm run registry:build` runs inside the sandbox and must
 * reproduce the copied generated output byte-for-byte. Nothing is written outside the sandbox.
 *
 * Usage: node scripts/verify-completion-self-test.mjs [--keep]
 * Exit: 0 all cases behaved correctly · 1 a case was not detected · 2 the control fixture did
 *       not certify (the sandbox is not a faithful valid input), which aborts before mutations.
 */

import crypto from "node:crypto";
import { REVIEW_SOURCE_ROOTS, REVIEW_SOURCE_FILES, reviewedCandidateHash } from "./completion-source.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import process from "node:process";

const ROOT = process.cwd();
const KEEP = process.argv.includes("--keep");

// Directories/files the checker reads. node_modules and .git are excluded so the sandbox
// is cheap; the generated-output check is exercised for its fail-closed path separately.
const COPY = [
  "docs/workspace/SCORECARD.md",
  "docs/workspace/scorecard-baseline.json",
  "docs/workspace/completion-manifest.json",
  "docs/workspace/receipts",
  "artifacts/w05-census",
  "reference/cojeev-handoff-v4/data",
  "reference/cojeev-handoff-v4/fonts",
  "registry/cojeev",
  "registry.json",
  "public/registry.json",
  "public/r",
  "apps/gate",
  "data",
  "LICENCE",
  "package.json",
  "tsconfig.json",
  "next-env.d.ts",
  "scripts/verify-completion.mjs",
  "scripts/build-registry.mjs",
  "scripts/component-api.mjs",
  "scripts/registry-imports.mjs",
  "scripts/registry-notices.mjs",
  ".work/preflight",
  ...REVIEW_SOURCE_ROOTS, ...REVIEW_SOURCE_FILES,
];

function makeSandbox() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "completion-selftest-"));
  for (const rel of [...new Set(COPY)].filter(rel => !COPY.some(parent => parent !== rel && rel.startsWith(`${parent}/`)))) {
    const from = path.join(ROOT, rel);
    if (!fs.existsSync(from)) throw new Error(`self-test source missing: ${rel}`);
    fs.cpSync(from, path.join(dir, rel), { recursive: true });
  }
  // C08 runs the real `npm run registry:build` inside the sandbox. Link the repository's
  // installed dependencies instead of copying ~970 packages: the sandbox reads them, and the
  // generator writes only to paths inside `dir`, so the real tree is never modified.
  fs.symlinkSync(path.join(ROOT, "node_modules"), path.join(dir, "node_modules"), "dir");
  return dir;
}

function runChecker(dir, extraArgs = []) {
  const res = spawnSync(process.execPath, [path.join(dir, "scripts/verify-completion.mjs"), `--root=${dir}`, "--json", ...extraArgs], {
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  let parsed = null;
  try {
    parsed = JSON.parse(res.stdout);
  } catch {
    /* leave null; the caller reports it */
  }
  return { code: res.status, stdout: res.stdout, stderr: res.stderr, parsed };
}

const readJson = (dir, rel) => JSON.parse(fs.readFileSync(path.join(dir, rel), "utf8"));
const writeJson = (dir, rel, value) => fs.writeFileSync(path.join(dir, rel), JSON.stringify(value, null, 2));
const readText = (dir, rel) => fs.readFileSync(path.join(dir, rel), "utf8");
const writeText = (dir, rel, value) => fs.writeFileSync(path.join(dir, rel), value);
const sha256 = (input) => crypto.createHash("sha256").update(input).digest("hex");
const fileHash = (dir, rel) => {
  const p = path.join(dir, rel);
  if (!fs.existsSync(p)) return "MISSING";
  return sha256(fs.readFileSync(p));
};
const snapshot = (dir, targets) => Object.fromEntries(targets.map((rel) => [rel, fileHash(dir, rel)]));

const LEDGER = "docs/workspace/SCORECARD.md";
const BASELINE = "docs/workspace/scorecard-baseline.json";
const MANIFEST = "docs/workspace/completion-manifest.json";
const CENSUS = "artifacts/w05-census/results.json";
const RECEIPT = "docs/workspace/receipts/FIXTURE-known-valid.md";
const REVIEW = ".work/preflight/codex-preflight-response.md";

const CANON_START = "## Detailed criteria";
const CANON_END = "## Acceptance targets for 10/10";
const PERFECT_SCORE = 9;
const VALID_SUM = PERFECT_SCORE * 103; // 927 — asserted against the fixture's parsed row sum

/** Replaces the score cell of the first ledger row matching `id`. */
function setScore(dir, id, value) {
  const text = readText(dir, LEDGER);
  const re = new RegExp(`^(\\|\\s*${id.replace(".", "\\.")}\\s*\\|[^|]*\\|\\s*)(\\d+|U)(\\s*\\|)`, "m");
  if (!re.test(text)) throw new Error(`could not find row ${id} to mutate`);
  writeText(dir, LEDGER, text.replace(re, `$1${value}$3`));
}

/** Rewrites the first published `<sum> / <denom>` figure on the headline line. */
function setPublishedHeadline(dir, sum) {
  const text = readText(dir, LEDGER);
  const lines = text.split("\n");
  const index = lines.findIndex((l) => l.startsWith("Mean of assessed criteria"));
  if (index === -1) throw new Error("could not find the published headline line");
  const before = lines[index];
  lines[index] = lines[index].replace(/(\d{2,4})\s*\/\s*(\d{2,4})/, `${sum} / 103`);
  if (lines[index] === before) throw new Error("headline mutation matched nothing");
  writeText(dir, LEDGER, lines.join("\n"));
}

/** Parses the canonical ledger block for the scored row count and literal row sum. */
function analyzeLedger(text) {
  const start = text.indexOf(CANON_START);
  const end = text.indexOf(CANON_END);
  if (start === -1 || end === -1 || end <= start) throw new Error("canonical ledger block not found");
  const block = text.slice(start + CANON_START.length, end);
  let scored = 0;
  let rowSum = 0;
  for (const line of block.split("\n")) {
    const m = line.match(/^\|\s*Q\d{2}\.\d{2}\s*\|[^|]*\|\s*(\d+|U)\s*\|/);
    if (!m) continue;
    if (/^\d+$/.test(m[1])) {
      scored += 1;
      rowSum += Number(m[1]);
    }
  }
  return { scored, rowSum };
}

/**
 * Replicates scripts/verify-completion.mjs C03 exactly: criterionHash over the canonical
 * ID + name pairs, rubricHash over the scoring rules + acceptance targets + the dimension
 * headings + those definitions.
 *
 * Keep this in lockstep with the checker. It previously mirrored the old stop-marker scan,
 * under which the "scoring rules" region ran to the first of a hand-listed set of headings and
 * so swallowed the Snapshot summary, the blocking findings and every criterion row. Both sides
 * now bound each normative section at the next `## ` heading, and the 16 dimension headings are
 * hashed explicitly so narrowing the region does not drop the rubric's structure.
 */
function frozenHashes(text) {
  const start = text.indexOf(CANON_START);
  const end = text.indexOf(CANON_END);
  const block = text.slice(start + CANON_START.length, end);
  const canonical = block
    .split("\n")
    .filter((l) => /^\s*\|\s*Q\d{2}\.\d{2}\s*\|/.test(l))
    .map((l) => {
      const c = l.split("|").slice(1, -1).map((x) => x.trim());
      return `${c[0]}\t${c[1]}`;
    })
    .join("\n");
  const section = (heading) => {
    const from = text.indexOf(heading);
    if (from === -1) return null;
    const after = text.slice(from + heading.length);
    const next = after.indexOf("\n## ");
    return next === -1 ? after : after.slice(0, next);
  };
  const rules = section("## How to read the scores");
  const targets = section("## Acceptance targets for 10/10");
  const dimensions = block
    .split("\n")
    .filter((l) => /^###\s+\d{2}\.\s/.test(l))
    .map((l) => l.trim())
    .join("\n");
  return {
    criterionHash: sha256(canonical),
    rubricHash: sha256(`${rules ?? ""}\n@@\n${targets ?? ""}\n@@\n${dimensions}\n@@\n${canonical}`),
  };
}

/** Replicates scripts/verify-completion.mjs gateCandidateHash over the sandbox tree. */
function gateCandidateHash(dir) {
  const files = [];
  const walk = (sub) => {
    for (const name of fs.readdirSync(path.join(dir, sub)).sort()) {
      const rel = path.join(sub, name);
      if (fs.statSync(path.join(dir, rel)).isDirectory()) walk(rel);
      else files.push(rel);
    }
  };
  for (const sub of ["registry/cojeev", "apps/gate"]) walk(sub);
  return sha256(files.map((f) => `${f}\n${fs.readFileSync(path.join(dir, f), "utf8")}`).join("\n"));
}

/**
 * Transforms a sandbox copy into the known-valid certification fixture. Returns the facts the
 * control asserts against so the fixture cannot silently drift.
 */
function buildValidFixture(dir) {
  // 1. Every scored row to 9, and the published headline to the literal row sum.
  let text = readText(dir, LEDGER);
  const start = text.indexOf(CANON_START);
  const end = text.indexOf(CANON_END);
  if (start === -1 || end === -1 || end <= start) throw new Error("fixture: canonical ledger block not found");
  const block = text
    .slice(start, end)
    .split("\n")
    .map((line) => {
      const m = line.match(/^(\|\s*Q\d{2}\.\d{2}\s*\|[^|]*\|)(\s*)(\d+|U)(\s*\|.*)$/);
      if (!m) return line;
      return /^\d+$/.test(m[3]) ? `${m[1]} ${PERFECT_SCORE}${m[4]}` : line;
    })
    .join("\n");
  text = text.slice(0, start) + block + text.slice(end);

  const stats = analyzeLedger(text);
  if (stats.scored !== 103) throw new Error(`fixture: expected 103 scored rows, found ${stats.scored}`);
  if (stats.rowSum !== VALID_SUM) throw new Error(`fixture: expected row sum ${VALID_SUM}, found ${stats.rowSum}`);
  const lines = text.split("\n");
  const headlineIndex = lines.findIndex((l) => l.startsWith("Mean of assessed criteria"));
  if (headlineIndex === -1) throw new Error("fixture: published headline line not found");
  lines[headlineIndex] = lines[headlineIndex].replace(/(\d{2,4})\s*\/\s*(\d{2,4})/, `${stats.rowSum} / ${stats.scored}`);
  text = lines.join("\n");
  writeText(dir, LEDGER, text);

  // 2. Re-anchor the manifest: arithmetic, frozen rubric, provenance and review binding.
  const { criterionHash, rubricHash } = frozenHashes(text);
  const candidate = gateCandidateHash(dir);
  const reviewed = reviewedCandidateHash(dir);
  const m = readJson(dir, MANIFEST);
  m.scoreAssertion.rowSum = stats.rowSum;
  m.scoreAssertion.headline = stats.rowSum;
  m.scoreAssertion.mean = stats.rowSum / stats.scored;
  m.scoreAssertion.headlineInPage = stats.rowSum;
  m.rubricFreeze.approvedHash = criterionHash;
  m.rubricFreeze.rubricHash = rubricHash;
  m.rubricFreeze.approvedBy = "FIXTURE — synthetic certification input";
  m.rubricFreeze.approvedAt = "2026-09-27";
  m.census.provenance = {
    shaKnown: true,
    candidateHash: candidate,
    unchangedDuringRun: true,
    cleanTree: true,
    revisionStartEqualsEnd: true,
    commit: null,
  };
  m.finalReview.candidateHash = reviewed;
  m.census.provenancePath = "artifacts/w05-census/provenance.json";
  writeJson(dir, m.census.provenancePath, { candidateSourceHash: candidate, unchangedDuringRun: true, evidenceUsable: true, complete: true, measuredRows: Object.values(readJson(dir, CENSUS)).length, expectedRows: m.census.expectedRows, oracleCrossStart: { agreement: true } });
  writeJson(dir, MANIFEST, m);

  // 3. One receipt authorising every rise above the frozen baseline to the fixture score.
  const baseline = readJson(dir, BASELINE).scores;
  const rises = Object.entries(baseline)
    .filter(([, value]) => /^\d+$/.test(value) && Number(value) < PERFECT_SCORE)
    .map(([id, from]) => ({ id, from: Number(from) }));
  if (!rises.length) throw new Error("fixture: no rising rows to authorise");
  fs.rmSync(path.join(dir, "docs/workspace/receipts"), { recursive: true, force: true });
  fs.mkdirSync(path.join(dir, "docs/workspace/receipts"), { recursive: true });
  writeText(
    dir,
    RECEIPT,
    [
      "# Fixture receipt — synthetic known-valid certification input",
      "",
      `- Criterion IDs: ${rises.map((r) => r.id).join(", ")}`,
      "- Checks: 9/9 exit 0",
      "- Review: ACCEPT FOR FIXTURE CERTIFICATION",
      "- Rehearsal: false",
      "",
      ...rises.map((r) => `${r.id}: ${r.from} -> ${PERFECT_SCORE}`),
      "",
    ].join("\n"),
  );

  // 4. An anchored ACCEPT review bound to the recomputed candidate hash.
  writeText(dir, REVIEW, `# Fixture final review — synthetic certification input\n\nAPPROVE\n\nCandidate hash: ${reviewed}\n`);

  return { ...stats, rises: rises.length, candidateHash: candidate, criterionHash, rubricHash };
}

const cases = [];
const register = (name, expectedId, targets, mutate, expect) => cases.push({ name, expectedId, targets, mutate, expect });

// Gate artifacts and review scope must reject contradictions that a manifest hides.
const PROVENANCE = "artifacts/w05-census/provenance.json";
register("missing emitted gate provenance", "C07", [PROVENANCE], dir => fs.rmSync(path.join(dir, PROVENANCE)), /gate provenance artifact missing/);
register("unusable emitted gate evidence", "C07", [PROVENANCE], dir => {
  const p = readJson(dir, PROVENANCE); p.evidenceUsable = false; writeJson(dir, PROVENANCE, p);
}, /does not certify complete, unchanged, usable/);
register("missing cross-start oracle agreement", "C07", [PROVENANCE], dir => {
  const p = readJson(dir, PROVENANCE); p.oracleCrossStart.agreement = false; writeJson(dir, PROVENANCE, p);
}, /lacks cross-start oracle agreement/);
register("deleted generated payload cannot be quietly repaired", "C08", ["public/r/button.json"], dir => fs.rmSync(path.join(dir, "public/r/button.json")), /generated file\(s\) drifted/);
for (const rel of ["scripts/build-registry.mjs", "app/assembly/page.tsx"]) {
  register(`review invalidated by change to ${rel}`, "C09", [rel], dir => writeText(dir, rel, `${readText(dir, rel)}\n// changed after review\n`), /does not reference the recomputed candidate hash/);
}

// --- The three cases the brief names explicitly -----------------------------

register(
  "deliberately wrong total: manifest headline 930 while the rows sum 927",
  "C02",
  [MANIFEST],
  (dir) => {
    const m = readJson(dir, MANIFEST);
    m.scoreAssertion.headline = VALID_SUM + 3; // the manifest disagrees with its own rows
    writeJson(dir, MANIFEST, m);
  },
  /headline 930 != row sum 927/,
);

register(
  "missing fixture: one census row key removed",
  "C05",
  [CENSUS],
  (dir) => {
    const p = path.join(dir, CENSUS);
    const rows = JSON.parse(fs.readFileSync(p, "utf8"));
    const keys = Object.keys(rows);
    delete rows[keys[0]];
    // results.json is an object keyed by index; re-key so it stays well formed.
    const compact = {};
    Object.values(rows).forEach((r, i) => (compact[i] = r));
    fs.writeFileSync(p, JSON.stringify(compact, null, 2));
  },
  /expected fixture key\(s\) absent/,
);

register(
  "mismatched SHA: recorded candidate hash does not match the tree",
  "C07",
  [MANIFEST],
  (dir) => {
    const m = readJson(dir, MANIFEST);
    m.census.provenance.candidateHash = "deadbeef".repeat(8);
    writeJson(dir, MANIFEST, m);
  },
  /recorded candidate hash does not match the tree/,
);

// --- Duplicate / invalid / cohort tampering ---------------------------------

register(
  "duplicate criterion ID injected into the ledger",
  "C01",
  [LEDGER],
  (dir) => {
    const text = readText(dir, LEDGER);
    writeText(dir, LEDGER, text.replace(/^(\|\s*Q01\.01\s*\|.*)$/m, "$1\n$1"));
  },
  /duplicate criterion ID/,
);

register(
  "invalid score: non-integer value in a numeric row",
  "C01",
  [LEDGER],
  (dir) => setScore(dir, "Q01.02", "7.5"),
  /scored rows 102 != declared 103|not a finite integer 0\.\.10/,
);

register(
  "swapped cohort: a criterion ID renamed, moving the denominator",
  "C01",
  [LEDGER],
  (dir) => {
    const text = readText(dir, LEDGER);
    writeText(dir, LEDGER, text.replace(/^\|\s*Q01\.01\s*\|/m, "| Q01.99 |"));
  },
  /frozen criterion ID\(s\) missing|not in the frozen cohort/,
);

register(
  "altered threshold: expected verdict counts edited to hide failures",
  "C06",
  [MANIFEST],
  (dir) => {
    const m = readJson(dir, MANIFEST);
    m.census.expectedVerdicts.FAIL = 0; // claim a clean catalogue
    writeJson(dir, MANIFEST, m);
  },
  /re-counted FAIL 1440 != declared 0/,
);

register(
  "stale replayed results: census swapped for an older artefact",
  "C05",
  [CENSUS],
  (dir) => {
    // Replacing the census with a truncated older run must break the key set, not pass.
    const p = path.join(dir, CENSUS);
    const rows = Object.values(JSON.parse(fs.readFileSync(p, "utf8")));
    const stale = {};
    rows.slice(0, 12).forEach((r, i) => (stale[i] = r));
    fs.writeFileSync(p, JSON.stringify(stale, null, 2));
  },
  /expected fixture key\(s\) absent|declared 3252/,
);

// --- Codex round-2 bypasses (each was a real hole) ---------------------------

register(
  "COHORT SWAP: an assessed row demoted to U while an unverified row is promoted",
  "C01",
  [LEDGER],
  (dir) => {
    // 160 IDs and the 103/57 counts both survive; only membership moves.
    setScore(dir, "Q01.01", "U");
    setScore(dir, "Q01.10", "7");
  },
  /no longer scored|promoted without separate assessment/,
);

register(
  "FALSE HEADLINE DECLARATION: the page publishes 930 while the rows sum 927",
  "C02",
  [LEDGER],
  (dir) => {
    // The exact real-world defect, mirrored onto the fixture: the manifest is honest but the
    // PAGE lies. The manifest agreeing with the rows must not excuse the page.
    setPublishedHeadline(dir, VALID_SUM + 3);
  },
  /PUBLISHED HEADLINE 930 != row sum 927/,
);

register(
  "RUBRIC REDEFINITION: the definition of a 9 is changed after the freeze",
  "C03",
  [LEDGER],
  (dir) => {
    // Names and IDs left untouched, so a criterion-only hash would NOT have caught this.
    const text = readText(dir, LEDGER);
    writeText(dir, LEDGER, text.replace(/^- \*\*9\*\*:.*$/m, "- **9**: implementation exists; no further evidence required."));
  },
  /RUBRIC HASH MISMATCH|criterion hash mismatch/,
);

register(
  "PROSE-SCATTERED APPROVAL: an approving word in prose plus the hash",
  "C09",
  [REVIEW],
  (dir) => {
    const text = readText(dir, REVIEW);
    const hash = text.match(/[0-9a-f]{64}/)?.[0] ?? "";
    writeText(dir, REVIEW, `This work was reviewed and looks approved to me overall.\n\nCandidate hash: ${hash}\n`);
  },
  /no parseable stand-alone verdict line|placeholder/,
);

register(
  "PLACEHOLDER REVIEW: 'ACCEPTANCE PENDING' must not certify",
  "C09",
  [REVIEW],
  (dir) => {
    const text = readText(dir, REVIEW);
    const hash = text.match(/[0-9a-f]{64}/)?.[0] ?? "";
    writeText(dir, REVIEW, `ACCEPTANCE PENDING\n\nCandidate hash: ${hash}\n`);
  },
  /placeholder wording|not accepting/,
);

// --- Score-change authorisation defeats --------------------------------------

register(
  "forged approval wording: 'NOT ACCEPTED' must not authorise a rise",
  "C04",
  [RECEIPT],
  (dir) => {
    const text = readText(dir, RECEIPT);
    writeText(dir, RECEIPT, text.replace(/Review[^\n]*/i, "Review: NOT ACCEPTED by reviewer"));
  },
  /without an authorising receipt/,
);

register(
  "unapproved score increase: a row raised with no receipt at all",
  "C04",
  [LEDGER],
  (dir) => {
    // Q02.01 is already at 9 against a baseline of 9, so the fixture receipt does not name it.
    // Raising it to 10 is a rise no receipt names.
    setScore(dir, "Q02.01", "10");
  },
  /Q02\.01 rose 9 -> 10 with no receipt naming the criterion/,
);

register(
  "approved implementation, unapproved score: rise beyond the approved destination",
  "C04",
  [LEDGER],
  (dir) => setScore(dir, "Q01.02", "10"),
  /Q01\.02 rose 6 -> 10 without an authorising receipt/,
);

register(
  "rehearsal receipt cannot authorise a rise",
  "C04",
  [RECEIPT],
  (dir) => {
    const text = readText(dir, RECEIPT);
    writeText(dir, RECEIPT, `${text}\n\nRehearsal: true\n`);
  },
  /without an authorising receipt/,
);

// --- Review binding ----------------------------------------------------------

register(
  "unbound review: final review does not reference the candidate hash",
  "C09",
  [REVIEW],
  (dir) => {
    writeText(dir, REVIEW, "APPROVE\n\nThis review approves the candidate.\n");
  },
  /does not reference the recomputed candidate hash/,
);

register(
  "non-accepting review: REQUEST CHANGES must not certify",
  "C09",
  [REVIEW],
  (dir) => {
    const text = readText(dir, REVIEW);
    const hash = text.match(/[0-9a-f]{64}/)?.[0] ?? "";
    writeText(dir, REVIEW, `REQUEST CHANGES\n\nCandidate hash: ${hash}\n`);
  },
  /verdict is not accepting/,
);

register(
  "missing review file: an absent review is not PASS",
  "C09",
  [REVIEW],
  (dir) => fs.rmSync(path.join(dir, REVIEW)),
  /final review .* missing/,
);

// --- Rubric freeze -----------------------------------------------------------

register(
  "altered rubric: a criterion name changed after the freeze",
  "C03",
  [LEDGER],
  (dir) => {
    const text = readText(dir, LEDGER);
    writeText(dir, LEDGER, text.replace(/\|\s*Spacing system\s*\|/, "| Spacing system (revised) |"));
  },
  /criterion hash mismatch|rubric hash mismatch/,
);

// --- Runner ------------------------------------------------------------------

const results = [];
let keptSandbox = null;

// Control: a sandbox transformed into the known-valid fixture must fully certify. Without this,
// every mutation case below would pass vacuously against a checker that rejects everything.
const controlDir = makeSandbox();
const controlFixture = buildValidFixture(controlDir);
const control = runChecker(controlDir);
const controlChecks = Object.fromEntries((control.parsed?.checks ?? []).map((c) => [c.id, c.skipped ? "SKIP" : c.passed ? "PASS" : "FAIL"]));
const controlOk = control.parsed?.passed === true && control.code === 0 && Object.values(controlChecks).every((v) => v === "PASS");
results.push({
  name: "CONTROL — known-valid fixture fully certifies (all checks PASS, exit 0)",
  expected: "exit 0 with passed:true and C01–C09 all PASS",
  detected: controlOk,
  detail: control.parsed
    ? `${Object.entries(controlChecks).map(([k, v]) => `${k}:${v}`).join(" ")}  ← row sum ${controlFixture.rowSum}/${controlFixture.scored}, ${controlFixture.rises} authorised rises` +
      `; C08: ${(control.parsed.checks ?? []).find((c) => c.id === "C08")?.summary ?? "?"}`
    : (control.stderr ?? "").slice(0, 300),
});

if (!controlOk) {
  console.error("CONTROL FAILED — the fixture is not a valid completion input; aborting before mutation cases.");
  console.error("This is the honest outcome if a check genuinely cannot be satisfied in a sandbox.");
  console.error(control.stdout.slice(0, 4000));
  console.error(control.stderr.slice(0, 2000));
  if (!KEEP) fs.rmSync(controlDir, { recursive: true, force: true });
  else console.error(`control sandbox kept at ${controlDir}`);
  process.exit(2);
}

if (KEEP) keptSandbox = controlDir;
else fs.rmSync(controlDir, { recursive: true, force: true });

for (const c of cases) {
  const dir = makeSandbox();
  let mutated = true;
  let inputChanged = false;
  try {
    buildValidFixture(dir);
    const before = snapshot(dir, c.targets);
    c.mutate(dir);
    inputChanged = c.targets.every((rel) => fileHash(dir, rel) !== before[rel]);
    if (!inputChanged) throw new Error(`mutation left its target(s) unchanged: ${c.targets.join(", ")}`);
  } catch (error) {
    mutated = false;
    results.push({ name: c.name, expected: String(c.expect), detected: false, detail: `mutation failed: ${error.message}` });
  }
  let detected = mutated;
  if (mutated) {
    const run = runChecker(dir, [`--only=${c.expectedId}`]);
    const findings = run.parsed?.findings ?? [];
    const matched = findings.filter((f) => f.id === c.expectedId);
    const named = matched.some((f) => c.expect.test(f.message));
    detected = run.code !== 0 && named;
    results.push({
      name: c.name,
      expected: String(c.expect),
      detected,
      detail: detected
        ? `input changed; exit ${run.code}; ${matched.find((f) => c.expect.test(f.message))?.message}`
        : `input ${inputChanged ? "changed" : "UNCHANGED"}; exit ${run.code}; findings=${JSON.stringify(matched.map((f) => f.message)).slice(0, 300)}`,
    });
  }
  // Under --keep, preserve the first failing mutation sandbox for inspection and drop the rest.
  if (KEEP && !detected && keptSandbox === controlDir) keptSandbox = dir;
  else fs.rmSync(dir, { recursive: true, force: true });
}

if (KEEP && keptSandbox) console.log(`sandbox kept at ${keptSandbox}`);

// --- Report ------------------------------------------------------------------

console.log("Adversarial self-test — scripts/verify-completion.mjs");
console.log("=".repeat(78));
let bad = 0;
for (const r of results) {
  if (!r.detected) bad += 1;
  console.log(`${r.detected ? "DETECTED" : "MISSED  "}  ${r.name}`);
  console.log(`            ${r.detail}`);
}
console.log("=".repeat(78));
console.log(`${results.length - bad}/${results.length} cases behaved correctly.`);
if (bad) {
  console.log(`RESULT: FAIL — ${bad} case(s) were not detected. The checker is not fail-closed.`);
  process.exit(1);
}
console.log("RESULT: PASS — a known-valid fixture certifies, and every mutation above is detected for its own reason.");
