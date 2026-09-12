/**
 * Decide how much of the release verification a change has to run.
 *
 * The allowlist below is the whole policy: a path earns a reduced scope only by
 * being named here. Anything else — application source, shared styles or motion,
 * dependencies, configuration, an unknown file, an empty diff, or a failed diff
 * lookup — resolves to `full`, the complete release job. Release acceptance is
 * additionally forced for pushes, manual dispatch and pull requests into main,
 * and `.github/workflows/verify.yml` repeats that guard without reading any
 * output of this script.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";

// Exact paths only. A prefix or suffix rule here would let a neighbouring file
// ride along: `verify.yml.bak`, `run-production-gate.mjs.orig`, a second
// workflow, or an unreviewed fixture beside the one named below.
const NAMED = new Map([
  ["README.md", "prose"],
  ["AGENTS.md", "prose"],
  ["LICENCE", "prose"],
  ["LICENSE", "prose"],
  ["LICENSE.md", "prose"],

  // The CI contract: the classifier, the gate runner and the workflow that
  // binds them. Changing any of the three re-runs all of their own tests.
  [".github/workflows/verify.yml", "ci-contract"],
  ["scripts/ci-scope.mjs", "ci-contract"],
  ["tests/ci-scope.test.mjs", "ci-contract"],
  ["scripts/run-production-gate.mjs", "ci-contract"],
  ["tests/production-gate.test.mjs", "ci-contract"],
  ["tests/fixtures/production-gate-child.mjs", "unit"],

  ["tests/analytics.browser.mjs", "analytics-browser"],

  // B02-2 transient-paint harness. It renders only the components it names,
  // not the catalogue, so its own harness run is the proportionate check.
  ["scripts/check-docs.mjs", "transient-timing"],
  ["scripts/docs-behaviors-details.mjs", "transient-timing"],
  ["scripts/docs-transient-paint.mjs", "transient-timing"],
  ["scripts/docs-harness-fingerprint.mjs", "transient-timing"],
  ["tests/docs-transient-timing.browser.mjs", "transient-timing"],

  ["scripts/verify-install.mjs", "install-consumer"],
  ["scripts/run-install-verification.mjs", "install-consumer"],

  // I03 licence notices. The generator, the notices file it writes and the four
  // payloads it regenerates. The notice only ever reaches a recipient as an
  // installed file, so the proportionate check is proving the committed
  // generated output still matches its source and then installing it for real.
  ["scripts/build-registry.mjs", "registry-generation"],
  ["scripts/registry-notices.mjs", "registry-generation"],
  ["tests/registry-notices.test.mjs", "registry-generation"],
  ["registry/cojeev/NOTICES.txt", "registry-generation"],
  ["registry.json", "registry-generation"],
  ["public/registry.json", "registry-generation"],
  ["public/r/registry.json", "registry-generation"],
  ["public/r/cojeev.json", "registry-generation"],

  // E08-1 reporting consent. The widget is product code, so its reduced scope
  // carries the complete Worker-backed reporting journey and a real build as
  // well as the focused consent check: a later change to the same file is
  // larger than one line and must not pass on consent evidence alone. Every
  // neighbour under components/reporting/, workers/reporting/ and scripts/ is
  // deliberately absent and still runs the full job.
  ["components/reporting/reporting-widget.tsx", "reporting-consent"],
  ["scripts/check-reporting-consent.mjs", "reporting-consent"],
  ["scripts/check-reporting-browser.mjs", "reporting-consent"],

  // G01 standalone loading measurement. No product code imports it and no job
  // runs it, so lint, type checking and the unit suites are the whole check;
  // its samples are taken deliberately, not on a shared runner whose hardware
  // would make the numbers mean something else.
  ["scripts/measure-loading-baseline.mjs", "unit"],
]);

// Each kind carries the quick checks; only prose runs without dependencies.
const SUITES = {
  prose: ["prose"],
  unit: ["quick"],
  "ci-contract": ["quick", "ci-contract"],
  "registry-generation": ["quick", "registry-generation", "install-consumer"],
  "reporting-consent": ["quick", "reporting-consent"],
  "analytics-browser": ["quick", "analytics-browser"],
  "transient-timing": ["quick", "transient-timing"],
  "install-consumer": ["quick", "install-consumer"],
};
const ORDER = ["prose", "quick", "ci-contract", "registry-generation", "reporting-consent", "analytics-browser", "transient-timing", "install-consumer"];

function kind(file) {
  if (NAMED.has(file)) return NAMED.get(file);
  const segments = file.split("/");
  if (segments.some(segment => segment === "" || segment === "." || segment === "..")) return null;
  // Prose lives under docs/ and must actually be prose: a build script or a
  // generator committed there is application code and runs the full job.
  if (segments[0] === "docs" && segments.length > 1 && file.endsWith(".md")) return "prose";
  // Root Node unit suites only. A browser suite, a nested directory or an
  // unnamed fixture is not covered by `npm test` alone.
  if (segments[0] === "tests" && segments.length === 2 && /^[^/]+\.test\.(mjs|ts)$/.test(segments[1])) return "unit";
  return null;
}

// Outputs are key=value lines. A git error spans several lines and a
// NUL-separated path may itself contain one, so every reason is flattened.
const oneLine = (value) => String(value).replace(/\s+/g, " ").trim().slice(0, 200);

export function classify(paths) {
  if (!paths.length) return { scope: "full", suites: [], reason: "empty diff" };
  const selected = new Set();
  for (const file of paths) {
    const matched = kind(file);
    if (!matched) return { scope: "full", suites: [], reason: oneLine(`not on the checkpoint allowlist: ${file}`) };
    for (const suite of SUITES[matched]) selected.add(suite);
  }
  const suites = ORDER.filter(suite => selected.has(suite));
  const prose = suites.length === 1 && suites[0] === "prose";
  return {
    scope: prose ? "docs" : "checkpoint",
    suites,
    reason: `${paths.length} changed ${paths.length === 1 ? "path" : "paths"}, all on the checkpoint allowlist`,
  };
}

/** Paths changed between the merge base of base..head and head. */
export function changedPaths({ base, head, cwd = process.cwd() }) {
  const git = args => execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const mergeBase = git(["merge-base", base, head]).trim();
  // NUL separation keeps a path containing a space or quote intact; --no-renames
  // reports both sides of a rename so neither side escapes classification.
  return git(["diff", "--name-only", "--no-renames", "-z", mergeBase, head]).split("\0").filter(Boolean);
}

export function resolveScope({ event, baseRef, paths, readPaths }) {
  const target = String(baseRef ?? "").replace(/^refs\/heads\//, "");
  if (event !== "pull_request") return { scope: "full", suites: [], reason: `${event} runs complete release verification` };
  if (target === "main") return { scope: "full", suites: [], reason: "a pull request into main runs complete release verification" };
  try {
    return classify(paths ?? readPaths());
  } catch (error) {
    return { scope: "full", suites: [], reason: oneLine(`diff lookup failed: ${error.message}`) };
  }
}

export const SUITE_FLAGS = {
  run_prose: ["prose"],
  run_quick: ["quick"],
  run_registry: ["registry-generation"],
  run_reporting: ["reporting-consent"],
  run_analytics: ["analytics-browser"],
  run_transient: ["transient-timing"],
  run_install: ["install-consumer"],
  // Derived. Prose alone needs no dependencies, no browser and no build.
  run_npm: ["quick", "ci-contract", "registry-generation", "reporting-consent", "analytics-browser", "transient-timing", "install-consumer"],
  run_build: ["reporting-consent", "analytics-browser", "transient-timing", "install-consumer"],
};

export function outputsFor(decision) {
  const omitted = ORDER.filter(suite => !decision.suites.includes(suite));
  return {
    scope: decision.scope,
    reason: oneLine(decision.reason) || "unspecified",
    suites: decision.suites.join(",") || "none",
    omitted: decision.scope === "full" ? "none" : omitted.join(",") || "none",
    ...Object.fromEntries(Object.entries(SUITE_FLAGS)
      .map(([flag, members]) => [flag, String(members.some(suite => decision.suites.includes(suite)))])),
  };
}

function main() {
  const environment = process.env;
  let decision;
  try {
    decision = resolveScope({
      event: environment.CI_SCOPE_EVENT,
      baseRef: environment.CI_SCOPE_BASE_REF,
      readPaths: () => changedPaths({ base: environment.CI_SCOPE_BASE_SHA, head: environment.CI_SCOPE_HEAD_SHA }),
    });
  } catch (error) {
    // An unexpected failure must still publish a complete, explicit answer.
    // A missing or blank scope output selects no reduced scope in the
    // workflow, but a silent one would leave the result to inference.
    decision = { scope: "full", suites: [], reason: oneLine(`scope selection failed: ${error.message}`) };
  }
  const outputs = outputsFor(decision);
  for (const [key, value] of Object.entries(outputs)) console.log(`${key}=${value}`);
  if (environment.GITHUB_OUTPUT) {
    fs.appendFileSync(environment.GITHUB_OUTPUT, Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(""));
  }
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main();
}
