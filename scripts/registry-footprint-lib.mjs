/**
 * What a consumer actually receives for a given entry.
 *
 * The registry payload is authoritative for installation cost, so a scenario is
 * computed from the real registry closure: start at the requested entries and
 * follow `registryDependencies` transitively. Nothing here is hand-listed per
 * entry, so a genuine dependency edge (including an accidental one) cannot hide.
 *
 * Two numbers matter and they are not interchangeable:
 *   - `files`/`sourceBytes` = what the installer writes to disk.
 *   - `packages` = the npm runtime dependencies that then have to resolve.
 * Emitted JS/CSS bytes need a real bundler and are measured separately by
 * `scripts/qualify-library-delivery.mjs`; this module never guesses at them.
 *
 * Pure. No filesystem access, no network.
 */

import { createHash } from "node:crypto";

/** Resolve an entry name from any registry address shape used by the payloads. */
export function itemName(address) {
  if (typeof address !== "string") return null;
  const match = address.match(/\/r\/([a-z0-9][a-z0-9-]*)\.json\/?$/);
  return match ? match[1] : null;
}

/**
 * Transitive closure of one scenario: the entries the installer resolves, the
 * bytes it writes, and the npm packages those entries declare.
 */
export function scenarioFootprint(items, entries) {
  const registry = items instanceof Map ? items : new Map((Array.isArray(items) ? items : Object.values(items)).map(item => [item.name, item]));
  const ordered = [];
  const seen = new Set();
  const visit = (name, trail) => {
    if (seen.has(name)) return;
    if (trail.includes(name)) throw new Error(`Registry dependency cycle: ${[...trail, name].join(" -> ")}`);
    const item = registry.get(name);
    if (!item) throw new Error(`Registry entry is not in the payload set: ${name}`);
    seen.add(name);
    for (const dependency of item.registryDependencies ?? []) {
      const next = itemName(dependency);
      if (!next) throw new Error(`Unresolvable registry dependency ${dependency} on ${name}`);
      visit(next, [...trail, name]);
    }
    ordered.push(name);
  };
  for (const entry of entries) visit(entry, []);

  const files = [];
  const packages = new Set();
  const devPackages = new Set();
  for (const name of ordered) {
    const item = registry.get(name);
    for (const file of item.files ?? []) files.push({ name, path: file.path, target: file.target ?? file.path, bytes: Buffer.byteLength(file.content ?? "", "utf8") });
    for (const dependency of item.dependencies ?? []) packages.add(dependency);
    for (const dependency of item.devDependencies ?? []) devPackages.add(dependency);
  }

  // A target is an installation address. Two entries writing different bytes to
  // one target is a real defect, not a rounding error, so it fails instead of
  // being summed. Identical bytes are the same file reached twice, which the
  // installer resolves once and which every shared entry has to declare anyway.
  const targets = new Map();
  const unique = [];
  for (const file of files) {
    const previous = targets.get(file.target);
    if (previous === undefined) { targets.set(file.target, file); unique.push(file); continue; }
    if (previous.bytes !== file.bytes || previous.path !== file.path) {
      throw new Error(`Two entries write different content to ${file.target}: ${previous.name} and ${file.name}`);
    }
  }

  return {
    entries: [...entries],
    resolved: ordered,
    fileCount: unique.length,
    sourceBytes: unique.reduce((total, file) => total + file.bytes, 0),
    packages: [...packages].sort(),
    devPackages: [...devPackages].sort(),
    files: unique.sort((a, b) => a.target.localeCompare(b.target)),
  };
}

/** Every scenario a delivery budget covers, resolved against one payload set. */
export function footprintReport(items, scenarios) {
  const out = {};
  for (const [name, entries] of Object.entries(scenarios)) out[name] = scenarioFootprint(items, entries);
  return out;
}

/**
 * Compare a report against declared budgets.
 *
 * `maxSourceBytes` and `maxFiles` are absolute ceilings, anchored to the
 * measurement recorded beside them. `maxRatioTo` is a proportional claim and is
 * the one that actually catches regression: "a static install must stay a small
 * multiple of the foundation it shares" cannot be satisfied by growing both.
 * `maxPackages` bounds what the consumer's package manager has to fetch, which
 * no byte ceiling notices.
 */
export function budgetViolations(report, budgets) {
  const violations = [];
  for (const [name, budget] of Object.entries(budgets.scenarios ?? {})) {
    const measured = report[name];
    if (!measured) { violations.push({ scenario: name, rule: "present", detail: "scenario missing from the report" }); continue; }
    if (typeof budget.maxSourceBytes === "number" && measured.sourceBytes > budget.maxSourceBytes) {
      violations.push({ scenario: name, rule: "maxSourceBytes", limit: budget.maxSourceBytes, measured: measured.sourceBytes, detail: `${measured.sourceBytes} > ${budget.maxSourceBytes} source bytes` });
    }
    if (typeof budget.maxFiles === "number" && measured.fileCount > budget.maxFiles) {
      violations.push({ scenario: name, rule: "maxFiles", limit: budget.maxFiles, measured: measured.fileCount, detail: `${measured.fileCount} > ${budget.maxFiles} files` });
    }
    if (typeof budget.maxPackages === "number" && measured.packages.length > budget.maxPackages) {
      violations.push({ scenario: name, rule: "maxPackages", limit: budget.maxPackages, measured: measured.packages.length, detail: `${name} resolves ${measured.packages.length} packages, limit ${budget.maxPackages}` });
    }
    if (budget.maxRatioTo) {
      const base = report[budget.maxRatioTo.scenario];
      if (!base) { violations.push({ scenario: name, rule: "maxRatioTo", detail: `reference scenario ${budget.maxRatioTo.scenario} missing` }); continue; }
      const ratio = base.sourceBytes === 0 ? Infinity : measured.sourceBytes / base.sourceBytes;
      if (ratio > budget.maxRatioTo.ratio) {
        violations.push({ scenario: name, rule: "maxRatioTo", limit: budget.maxRatioTo.ratio, measured: Number(ratio.toFixed(4)), detail: `${name} is ${(ratio * 100).toFixed(1)} % of ${budget.maxRatioTo.scenario}, limit ${(budget.maxRatioTo.ratio * 100).toFixed(1)} %` });
      }
    }
    for (const forbidden of budget.forbiddenPackages ?? []) {
      if (measured.packages.includes(forbidden)) violations.push({ scenario: name, rule: "forbiddenPackages", detail: `${name} resolves avoidable package ${forbidden}` });
    }
    for (const required of budget.requiredPackages ?? []) {
      if (!measured.packages.includes(required)) violations.push({ scenario: name, rule: "requiredPackages", detail: `${name} lost required package ${required}` });
    }
  }
  return violations;
}

/**
 * A digest of everything a consumer installs: per item, the targets and the bytes
 * written to them, plus the registry and npm dependencies that decide which items
 * are reached at all.
 *
 * Emitted browser bytes cannot be computed here — they need a real bundler — so
 * they are measured once by `scripts/qualify-library-delivery.mjs` and recorded in
 * `data/delivery-budgets.json`. This digest is what stops that recording from
 * outliving the payloads it describes: any change to installed source, targets or
 * dependency edges changes the digest and invalidates the measurement until the
 * qualifier is re-run. Item metadata (`title`, `author`, `categories`) is
 * deliberately outside the digest, because none of it reaches a bundle.
 */
export function installedSourceDigest(items) {
  const registry = items instanceof Map ? items : new Map((Array.isArray(items) ? items : Object.values(items)).map(item => [item.name, item]));
  const digest = createHash("sha256");
  for (const name of [...registry.keys()].sort()) {
    const item = registry.get(name);
    digest.update(`item ${name}\n`);
    for (const value of [...(item.registryDependencies ?? [])].sort()) digest.update(`registry ${value}\n`);
    for (const value of [...(item.dependencies ?? [])].sort()) digest.update(`package ${value}\n`);
    for (const value of [...(item.devDependencies ?? [])].sort()) digest.update(`devPackage ${value}\n`);
    const files = [...(item.files ?? [])].sort((a, b) => String(a.target ?? a.path).localeCompare(String(b.target ?? b.path)));
    for (const file of files) {
      const contents = createHash("sha256").update(file.content ?? "").digest("hex");
      digest.update(`file ${file.target ?? file.path} ${contents}\n`);
    }
  }
  return digest.digest("hex");
}

/**
 * Compare a recorded emitted-size measurement against the emitted budgets.
 *
 * `measurement` is `{ payloadDigest, profiles: { <profile>: { js, css, woff2 } } }`
 * and `budget` is the `emitted` block of `data/delivery-budgets.json`. Two things
 * are enforced, and they fail for different reasons: the digest proves the numbers
 * were measured on the payloads being checked, and the ceilings prove the numbers
 * are acceptable. Either one alone can be satisfied while the other is stale.
 */
export function emittedBudgetViolations(measurement, budget) {
  const violations = [];
  if (!budget) return violations;
  if (budget.payloadDigest !== measurement.payloadDigest) {
    violations.push({
      scenario: "emitted",
      rule: "payloadDigest",
      detail: `the recorded emitted measurement is stale: it was taken on payloads ${String(budget.payloadDigest).slice(0, 12)} but the payloads are now ${measurement.payloadDigest.slice(0, 12)} — re-run scripts/qualify-library-delivery.mjs and update data/delivery-budgets.json`,
    });
  }
  for (const [profile, declared] of Object.entries(budget.profiles ?? {})) {
    const measured = measurement.profiles?.[profile];
    if (!measured) {
      violations.push({ scenario: `emitted:${profile}`, rule: "present", detail: `no emitted measurement is recorded for ${profile}` });
      continue;
    }
    for (const [kind, limit] of Object.entries(declared.maxEmittedBytes ?? {})) {
      const value = measured[kind];
      if (typeof value !== "number") {
        violations.push({ scenario: `emitted:${profile}`, rule: "present", detail: `no emitted ${kind} measurement for ${profile}` });
        continue;
      }
      if (value > limit) {
        violations.push({ scenario: `emitted:${profile}`, rule: "maxEmittedBytes", limit, measured: value, detail: `${profile} emits ${value} ${kind} bytes, above the ${limit} ceiling` });
      }
    }
  }
  return violations;
}
