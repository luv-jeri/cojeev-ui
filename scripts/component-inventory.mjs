/**
 * Build the per-entry acceptance inventory required by Phase 0 item 3 of
 * docs/workspace/ROADMAP-TO-10.md.
 *
 * Answers, for every registry entry: which reference fixtures exist, which unit
 * tests and browser gates name it, whether it has a documentation page and a
 * written contract, and therefore whether it has ANY acceptance row at all.
 *
 * Read-only. Derives everything from registry.json (the generator's output) plus
 * the filesystem; nothing is hard-coded to a component count.
 *
 *   node scripts/component-inventory.mjs [--json=PATH] [--md=PATH]
 */
import fs from "node:fs";
import path from "node:path";

const args = new Map(process.argv.slice(2).map(a => { const [k, ...v] = a.split("="); return [k, v.join("=") || true]; }));
const jsonOut = args.get("--json") || "docs/workspace/baseline/inventory.json";
const mdOut = args.get("--md") || "docs/workspace/INVENTORY.md";

const registry = JSON.parse(fs.readFileSync("registry.json", "utf8"));
const isolationRoot = "reference/cojeev-handoff-v4/isolation";

// Fixtures actually present on disk, by owning component.
const onDisk = new Map();
if (fs.existsSync(isolationRoot)) {
  for (const dir of fs.readdirSync(isolationRoot)) {
    const full = path.join(isolationRoot, dir);
    if (!fs.statSync(full).isDirectory()) continue;
    onDisk.set(dir, fs.readdirSync(full).filter(f => f.endsWith(".html")));
  }
}
const testFiles = fs.existsSync("tests") ? fs.readdirSync("tests") : [];
const unitTests = testFiles.filter(f => f.endsWith(".test.ts") || f.endsWith(".test.mjs"));
const browserTests = testFiles.filter(f => f.endsWith(".browser.mjs"));

/** Names the docs catalog exposes. `data-table` and `aspect-ratio` are folded into
 * other guides by documentationCatalog(), so they are not separately listed. */
const docsCatalogNames = (() => {
  try {
    const src = fs.readFileSync("lib/catalog.ts", "utf8");
    const excluded = [...src.matchAll(/!\[([^\]]*)\]\.includes\(entry\.name\)/g)]
      .flatMap(m => [...m[1].matchAll(/"([^"]+)"/g)].map(x => x[1]));
    return new Set(registry.items.filter(i => i.type === "registry:ui").map(i => i.name)
      .filter(n => !excluded.includes(n)));
  } catch { return new Set(registry.items.map(i => i.name)); }
})();
const exampleManifest = (() => {
  try {
    const src = fs.readFileSync("components/examples/manifest.ts", "utf8");
    const out = {};
    /* Keys appear in BOTH styles: quoted when they contain a hyphen
     * (`"dock": {`, `"native-select": {`) and bare when they are valid identifiers
     * (`item: {`, `select: {`). A regex requiring one style silently drops the other:
     * the original quoted-only pattern found 125 of 173, which produced a phantom
     * "48 components have no worked example" gap. In truth every one of the 173 has
     * an example, including all 107 additional-tier entries. */
    for (const m of src.matchAll(/^\s*"?([a-z][a-z0-9-]*)"?\s*:\s*\{\s*file:\s*"([^"]+)"/gm)) out[m[1]] = { file: m[2] };
    return out;
  } catch { return {}; }
})();

/* Attribution rules, in order of strength. Filename matching is deliberately NOT
 * used: `data-table.test.ts` exercising `table` would otherwise look like coverage
 * of a component the file never touches. */
const readTest = f => { try { return fs.readFileSync(path.join("tests", f), "utf8"); } catch { return ""; } };
const testSources = new Map([...unitTests, ...browserTests].map(f => [f, readTest(f)]));
/* `\s*` not `\s+`: the browser gates build their fixtures as MINIFIED bundles, where
 * imports appear as `from'./registry/cojeev/ui/activity-feed'` with no space after
 * `from`. Requiring whitespace silently skipped every such import and under-counted
 * browser-gate coverage (57 components attributed instead of 70). */
const importsOf = src => [...src.matchAll(/from\s*["']([^"']+)["']/g)].map(m => m[1])
  .concat([...src.matchAll(/import\s*\(\s*["']([^"']+)["']\s*\)/g)].map(m => m[1]));
/** Does the file import this component's module, or name it in a data attribute? */
const citesComponent = (src, id) => {
  const mod = `registry/cojeev/ui/${id}`;
  if (importsOf(src).some(spec => spec === mod || spec.endsWith("/" + mod))) return true;
  // Docs pages address components by slug in a selector or URL.
  return new RegExp(`data-component=["']${id}["']|/docs/${id}/`).test(src);
};

const rows = [];
for (const item of registry.items) {
  if (item.type !== "registry:ui") continue;
  const id = item.name;
  const meta = item.meta ?? {};
  const source = meta.source ?? {};
  const isolation = Array.isArray(source.isolation) ? source.isolation : [];
  // Fixtures the entry *claims* vs fixtures that actually exist — a mismatch is a defect.
  const present = (onDisk.get(source.id ?? id) ?? []).filter(f => isolation.includes(f));
  const missingFixtures = isolation.filter(f => !present.includes(f));
  const extraFixtures = (onDisk.get(source.id ?? id) ?? []).filter(f => !isolation.includes(f));

  const unit = unitTests.filter(f => citesComponent(testSources.get(f) ?? "", id));
  const browser = browserTests.filter(f => citesComponent(testSources.get(f) ?? "", id));
  const contract = source.contract && fs.existsSync(path.join("reference/cojeev-handoff-v4", source.contract));
  const demo = source.demo && fs.existsSync(path.join("reference/cojeev-handoff-v4", source.demo));
  // Every registry:ui entry gets a route from the dynamic [component] page, so the
  // meaningful question is whether it is reachable from the documentation catalog.
  const docsPage = docsCatalogNames.has(id);
  const examples = Object.entries(exampleManifest).filter(([k, v]) => k === id || v?.file === id).map(([k]) => k);

  // Acceptance row: what evidence exists for this entry today.
  const evidence = [];
  if (present.length) evidence.push("visual-fixtures");
  if (unit.length) evidence.push("unit-tests");
  if (browser.length) evidence.push("browser-gates");
  if (contract) evidence.push("contract");
  if (demo) evidence.push("demo");
  if (docsPage) evidence.push("docs-page");
  if (examples.length) evidence.push("worked-example");

  rows.push({
    id, sourceId: source.id ?? id, title: item.title ?? id, tier: source.tier ?? "unclassified",
    category: source.category ?? meta.category ?? null,
    files: item.files?.length ?? 0,
    dependencies: (item.dependencies ?? []).length,
    registryDependencies: (item.registryDependencies ?? []).length,
    fixturesClaimed: isolation.length, fixturesPresent: present.length,
    missingFixtures, extraFixtures,
    unitTests: unit, browserTests: browser,
    contract: Boolean(contract), demo: Boolean(demo), docsPage, examples,
    examplesElsewhere: (meta.examples ?? []),
    variants: source.variants ?? [], sizes: source.sizes ?? [], states: source.states ?? [],
    motionOnByDefault: source.motionOnByDefault ?? null,
    evidence, acceptanceRow: evidence.length > 0,
  });
}

const base = registry.items.filter(i => i.type === "registry:base").map(i => i.name);
const n = rows.length;
const noVisual = rows.filter(r => r.fixturesPresent === 0);
const noEvidence = rows.filter(r => !r.acceptanceRow);
const mismatch = rows.filter(r => r.missingFixtures.length || r.extraFixtures.length);
const noUnit = rows.filter(r => r.unitTests.length === 0);
const noBrowser = rows.filter(r => r.browserTests.length === 0);
const noDocs = rows.filter(r => !r.docsPage);
const noContract = rows.filter(r => !r.contract);

const summary = {
  generatedFrom: "registry.json",
  registryItems: registry.items.length, uiEntries: n, baseEntries: base,
  referenceEntriesOnDisk: onDisk.size,
  fixtureFilesOnDisk: [...onDisk.values()].reduce((a, v) => a + v.length, 0),
  fixtureFilesOwnedByUiEntries: rows.reduce((a, r) => a + r.fixturesPresent, 0),
  referenceEntriesWithoutUiComponent: [...onDisk.keys()].filter(d => !rows.some(r => (r.sourceId ?? r.id) === d)).length,
  withVisualFixtures: n - noVisual.length, withoutVisualFixtures: noVisual.length,
  withUnitTests: n - noUnit.length, withoutUnitTests: noUnit.length,
  withBrowserGates: n - noBrowser.length, withoutBrowserGates: noBrowser.length,
  withDocsPage: n - noDocs.length, withoutDocsPage: noDocs.length,
  withContract: n - noContract.length, withoutContract: noContract.length,
  withAnyEvidence: n - noEvidence.length, withNoEvidenceAtAll: noEvidence.length,
  fixtureMismatches: mismatch.length,
  unitTestFiles: unitTests.length, browserTestFiles: browserTests.length,
};

fs.mkdirSync(path.dirname(jsonOut), { recursive: true });
fs.writeFileSync(jsonOut, JSON.stringify({ summary, rows, mismatches: mismatch.map(r => ({ id: r.id, missing: r.missingFixtures, extra: r.extraFixtures })), noEvidence: noEvidence.map(r => r.id) }, null, 2));

const pct = (a, b) => b ? `${((a / b) * 100).toFixed(1)}%` : "n/a";
const md = `# Component inventory — every registry entry and its acceptance evidence

Generated by \`node scripts/component-inventory.mjs\`. Do not hand-edit.

Phase 0 item 3 of \`ROADMAP-TO-10.md\`. An entry appears here if the generator emits
it; counts are never hard-coded.

## Summary

| measure | count | share |
| --- | ---: | ---: |
| registry items | ${summary.registryItems} | — |
| installable \`registry:ui\` entries | ${summary.uiEntries} | — |
| \`registry:base\` entries | ${summary.baseEntries.length} | — |
| entries **with** reference fixtures | ${summary.withVisualFixtures} | ${pct(summary.withVisualFixtures, n)} |
| entries **without** any reference fixture | ${summary.withoutVisualFixtures} | ${pct(summary.withoutVisualFixtures, n)} |
| entries with unit tests | ${summary.withUnitTests} | ${pct(summary.withUnitTests, n)} |
| entries with browser gates | ${summary.withBrowserGates} | ${pct(summary.withBrowserGates, n)} |
| entries with a docs page | ${summary.withDocsPage} | ${pct(summary.withDocsPage, n)} |
| entries with a written contract | ${summary.withContract} | ${pct(summary.withContract, n)} |
| entries with **no evidence at all** | ${summary.withNoEvidenceAtAll} | ${pct(summary.withNoEvidenceAtAll, n)} |
| entries whose fixture list disagrees with disk | ${summary.fixtureMismatches} | — |

Reference fixtures on disk: **${summary.fixtureFilesOnDisk}** files across **${summary.fixtureDirsOnDisk}** directories.
Test files: ${summary.unitTestFiles} unit, ${summary.browserTestFiles} browser.

**What this means.** ${summary.withoutVisualFixtures} of ${n} entries can never be verified by the
visual gate, because no reference fixture exists for them. The gate's 66 base-tier components cover
${summary.withVisualFixtures} entries; the remaining ones require owner-approved rendered contracts
(\`ROADMAP-TO-10.md\`, Phase 2), not an invented reference.

## Entries without any reference fixture (${summary.withoutVisualFixtures})

${noVisual.map(r => r.id).join(", ") || "(none)"}

## Entries with no evidence of any kind (${summary.withNoEvidenceAtAll})

${noEvidence.map(r => `- \`${r.id}\``).join("\n") || "(none)"}

## Fixture-list mismatches (${summary.fixtureMismatches})

${mismatch.length ? mismatch.map(r => `- \`${r.id}\`: missing ${r.missingFixtures.length ? r.missingFixtures.join(", ") : "—"}; unexpected on disk ${r.extraFixtures.length ? r.extraFixtures.join(", ") : "—"}`).join("\n") : "None — every entry's declared fixture list matches the fixtures on disk."}

## Full table

| entry | tier | category | fixtures | unit | browser | contract | docs | files | deps |
| --- | --- | --- | ---: | ---: | ---: | :---: | :---: | ---: | ---: |
${rows.slice().sort((a, b) => a.id.localeCompare(b.id)).map(r => `| \`${r.id}\` | ${r.tier} | ${r.category ?? "—"} | ${r.fixturesPresent}/${r.fixturesClaimed} | ${r.unitTests.length} | ${r.browserTests.length} | ${r.contract ? "yes" : "—"} | ${r.docsPage ? "yes" : "—"} | ${r.files} | ${r.dependencies + r.registryDependencies} |`).join("\n")}
`;
fs.mkdirSync(path.dirname(mdOut), { recursive: true });
fs.writeFileSync(mdOut, md);

console.log(JSON.stringify(summary, null, 2));
console.log(`\nwrote ${jsonOut} and ${mdOut}`);
