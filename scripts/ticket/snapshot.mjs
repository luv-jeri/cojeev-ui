#!/usr/bin/env node
/**
 * Baseline snapshot — Phase 0 step 1 of docs/workspace/ROADMAP-TO-10.md.
 *
 * Captures everything a ticket needs to name its starting point, so no ticket has to
 * describe the tree from memory: source SHA, dirty diff and its hash, generated payload
 * hashes, reference-fixture hashes, tool versions, token divergence from the supplied
 * handoff, live gate/port activity, and the state of every existing evidence directory.
 *
 * Read-only. Writes nothing except the optional --out file.
 *
 * Usage:
 *   node scripts/ticket/snapshot.mjs --out=docs/workspace/baseline/snapshot.json
 *   node scripts/ticket/snapshot.mjs --online    # also reads production + directory entry
 */

import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { ROOT, gateActivity, gitState, hashFile, sh, shortHash, tokenDivergence } from "./lib.mjs";

const argv = process.argv.slice(2);
const value = (name) => {
  const hit = argv.find((a) => a.startsWith(`${name}=`));
  return hit ? hit.slice(name.length + 1) : undefined;
};
const online = argv.includes("--online");

const HASH_KEYS = [
  "registry/cojeev/styles/tokens.css",
  "registry/cojeev/lib/appearance-tokens.ts",
  "registry.json",
  "public/registry.json",
  "public/r/cojeev.json",
  "registry/cojeev/NOTICES.txt",
  "package.json",
  "package-lock.json",
  "scripts/build-registry.mjs",
];
const HANDOFF_TOKENS = "reference/cojeev-handoff-v4/tokens/tokens.css";

function toolVersions() {
  let pkg = {};
  try {
    pkg = JSON.parse(fs.readFileSync(path.join(ROOT, "package.json"), "utf8"));
  } catch {
    pkg = {};
  }
  const cache = path.join(process.env.HOME ?? "", "Library/Caches/ms-playwright");
  const browsers = fs.existsSync(cache) ? fs.readdirSync(cache) : [];
  const webkit = browsers.filter((d) => d.startsWith("webkit"));
  return {
    node: process.version,
    npm: sh("npm", ["--version"]),
    next: pkg.dependencies?.next ?? pkg.devDependencies?.next ?? null,
    playwright: pkg.devDependencies?.["@playwright/test"] ?? pkg.devDependencies?.playwright ?? null,
    chromiumBrowsers: browsers.filter((d) => d.startsWith("chromium")),
    webkitInstalled: webkit.length > 0,
    ciNodePin: "22.22.0",
  };
}

function summarizeResults(absPath) {
  try {
    const rows = JSON.parse(fs.readFileSync(absPath, "utf8"));
    if (!Array.isArray(rows)) return { malformed: true };
    const verdicts = {};
    const ids = new Set();
    const perComponent = {};
    for (const r of rows) {
      verdicts[r.verdict] = (verdicts[r.verdict] ?? 0) + 1;
      if (!r.id) continue;
      ids.add(r.id);
      perComponent[r.id] = perComponent[r.id] ?? { pass: 0, fail: 0 };
      if (r.verdict === "PASS") perComponent[r.id].pass += 1;
      else perComponent[r.id].fail += 1;
    }
    return {
      rows: rows.length,
      verdicts,
      componentCount: ids.size,
      components: [...ids].sort(),
      perComponent,
      /** One component id across many rows is the signature of a partial or broken run. */
      suspicious: ids.size <= 1 && rows.length > 20,
    };
  } catch (err) {
    return { unreadable: String(err.message ?? err) };
  }
}

function evidenceDirs() {
  const root = path.join(ROOT, "artifacts");
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => {
      const abs = path.join(root, d.name, "results.json");
      const stat = fs.existsSync(abs) ? fs.statSync(abs) : null;
      return {
        dir: `artifacts/${d.name}`,
        modified: stat ? stat.mtime.toISOString() : null,
        ...(stat ? summarizeResults(abs) : { note: "no results.json" }),
      };
    })
    .sort((a, b) => String(b.modified).localeCompare(String(a.modified)));
}

function referenceHashes() {
  const dir = path.join(ROOT, "reference/cojeev-handoff-v4/isolation");
  if (!fs.existsSync(dir)) return { present: false };
  const entries = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory());
  const fixtures = [];
  for (const e of entries) {
    for (const f of fs.readdirSync(path.join(dir, e.name))) {
      if (f.endsWith(".html")) fixtures.push(`${e.name}/${f}`);
    }
  }
  fixtures.sort();
  return {
    present: true,
    entryCount: entries.length,
    fixtureCount: fixtures.length,
    manifestHash: shortHash(
      fixtures
        .map((rel) => `${rel}:${hashFile(path.join("reference/cojeev-handoff-v4/isolation", rel))}`)
        .join("\n"),
    ),
    tokensHash: hashFile(HANDOFF_TOKENS),
  };
}

function coverage() {
  const uiDir = path.join(ROOT, "registry/cojeev/ui");
  const fixDir = path.join(ROOT, "reference/cojeev-handoff-v4/isolation");
  if (!fs.existsSync(uiDir)) return null;
  const ui = fs
    .readdirSync(uiDir)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => f.replace(/\.tsx$/, ""));
  const fixtures = fs.existsSync(fixDir)
    ? fs.readdirSync(fixDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
    : [];
  const set = new Set(fixtures);
  return {
    uiComponents: ui.length,
    fixtureEntries: fixtures.length,
    componentsWithFixture: ui.filter((u) => set.has(u)).length,
    componentsWithoutFixture: ui.filter((u) => !set.has(u)).length,
    /** Fixture entries that are whole-page compositions, not 1:1 components. */
    fixtureEntriesWithoutComponent: fixtures.filter((f) => !ui.includes(f)),
    noFixtureComponents: ui.filter((u) => !set.has(u)),
  };
}

async function fetchOnline() {
  const get = async (url) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      return { status: res.status, body: (await res.text()).slice(0, 4000) };
    } catch (err) {
      return { error: String(err.message ?? err) };
    }
  };
  const out = { productionRelease: null, directoryEntry: null };
  const release = await get("https://000h.cojeev.com/release.json");
  try {
    out.productionRelease = release.status === 200 ? JSON.parse(release.body) : release;
  } catch {
    out.productionRelease = release;
  }
  const dir = await get("https://ui.shadcn.com/r/registries.json");
  try {
    const parsed = JSON.parse(dir.body);
    const list = Array.isArray(parsed) ? parsed : (parsed.registries ?? []);
    out.directoryEntry = list.find((r) => JSON.stringify(r).includes("000h-cojeev")) ?? null;
  } catch {
    out.directoryEntry = { status: dir.status, note: "unparsed", sample: dir.body?.slice(0, 300) };
  }
  return out;
}

const snapshot = {
  kind: "cojeev-ui/baseline-snapshot",
  generatedAt: new Date().toISOString(),
  cwd: ROOT,
  git: gitState(),
  tools: toolVersions(),
  criticalFileHashes: Object.fromEntries(HASH_KEYS.map((k) => [k, hashFile(k)])),
  tokenDivergence: tokenDivergence(),
  reference: referenceHashes(),
  coverage: coverage(),
  gateActivity: gateActivity(),
  evidenceDirectories: evidenceDirs(),
};
if (online) snapshot.online = await fetchOnline();

const outPath = value("--out");
if (outPath) {
  const abs = path.isAbsolute(outPath) ? outPath : path.join(ROOT, outPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, `${JSON.stringify(snapshot, null, 2)}\n`);
}

const { git, tokenDivergence: tok, coverage: cov, reference: ref, gateActivity: ga } = snapshot;
const lines = [
  `snapshot   ${snapshot.generatedAt}`,
  `source     ${git.branch} @ ${git.headShort} (${git.headDate})  sourceHash=${git.sourceHash}`,
  `dirty      ${git.dirtyFiles.length} tracked, ${git.untracked.length} untracked  diffHash=${git.diffHash}`,
  `tokens     handoff=${tok.handoffTokens} candidate=${tok.candidateTokens} differing=${tok.differing.length} missing=${tok.missingFromCandidate.length} candidateOnly=${tok.candidateOnly.length}`,
  `palette    reconciled=${tok.paletteReconciled}`,
  `reference  ${ref.entryCount} entries / ${ref.fixtureCount} fixtures  manifest=${ref.manifestHash}`,
  `coverage   ${cov.componentsWithFixture}/${cov.uiComponents} components have a fixture; ${cov.componentsWithoutFixture} have none`,
  `gate       port ${ga.gatePort} busy=${ga.portBusy} running=${ga.gateRunning} safeToStartTicket=${ga.safeToStartTicket}`,
  `servers    ${ga.nextServerProcesses.length} next-server process(es) alive`,
  `evidence   ${snapshot.evidenceDirectories.length} dir(s)`,
];
for (const e of snapshot.evidenceDirectories) {
  const verdicts = e.verdicts ? Object.entries(e.verdicts).map(([k, n]) => `${k}=${n}`).join(" ") : (e.note ?? "?");
  lines.push(
    `  - ${e.dir.padEnd(26)} rows=${String(e.rows ?? "-").padStart(5)} components=${String(e.componentCount ?? "-").padStart(3)} ${verdicts}${e.suspicious ? "   <-- SUSPICIOUS: single component across many rows" : ""}`,
  );
}
if (snapshot.online) {
  lines.push(`online     release=${snapshot.online.productionRelease?.commit ?? JSON.stringify(snapshot.online.productionRelease)?.slice(0, 80)}`);
  lines.push(`           directory=${snapshot.online.directoryEntry ? "found" : "not found"}`);
}
lines.push(`diverging  ${tok.differing.map((d) => d.token).join(", ") || "none"}`);
if (outPath) lines.push(`written    ${outPath}`);
console.log(lines.join("\n"));
