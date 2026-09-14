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
  // The distributed notices embed LICENCE; unit tests verify that it matches.
  ["LICENCE", "unit"],
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
  // B02-3 clock isolation. Same harness, same proportionate scope: it renders
  // the two clock-owning cases and the three that follow them, not the catalogue.
  ["tests/docs-clock-isolation.browser.mjs", "transient-timing"],

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

  // H03-2 / V50-1: named docs surfaces and their stylesheet payloads. Keep
  // shared selector/motion engines and component implementations on full.
  ...[
    "components/component-preview.tsx", "components/examples/choice-foundations.tsx",
    "registry/cojeev/styles/choice-foundations.css", "registry/cojeev/styles/accordion.css",
    "public/r/checkbox.json", "public/r/radio-group.json", "public/r/switch.json", "public/r/accordion.json",
    "tests/choice-recovery.docs.browser.mjs", "tests/disclosure-recovery.docs.browser.mjs",
    "tests/workbench.browser.mjs", "tests/docs-compact-navigation.browser.mjs",
    "scripts/run-component-polish.mjs",
  ].map(file => [file, "component-polish"]),
  // G07 unused-code removal. launch-faq.tsx is deleted outright, landing.css
  // loses only the rules exclusive to it, and draft.ts loses one unused export.
  // landing.css is shared by five routes: the marketing gate opens two of them
  // and check-landing-guides.mjs opens the other three, so the shared guide
  // rules are proved on the real pages. scripts/check-refinement-marketing.mjs
  // is deliberately absent: it is a release gate, and a change to it stays full.
  // B01-5 adds the two body-copy files E02-1 edits to the same suite, because
  // the journeys it already runs are exactly the ones that render them:
  // check-landing-guides.mjs opens /privacy/ and asserts this page's heading,
  // and it opens /about/ while the marketing gate opens /work-with-me/, the two
  // routes that render creator-page.tsx. Their neighbours stay on full: the
  // guide shell, marketing shell, sibling route files and the analytics control
  // the privacy page embeds are all deliberately absent.
  ...[
    "components/landing/launch-faq.tsx", "components/landing/landing.css", "lib/reporting/draft.ts",
    "scripts/check-landing-guides.mjs", "tests/reporting-drafts.browser.mjs",
    "app/privacy/page.tsx", "components/landing/creator-page.tsx",
  ].map(file => [file, "maintenance"]),
  ...[
    "docs/quality/evidence/h03-2/before-shape-menu.png", "docs/quality/evidence/h03-2/after-shape-menu.png",
    "docs/quality/evidence/h03-2/after-mobile-comparisons.png",
    "docs/quality/evidence/v50-1/before-editorial-mobile.png", "docs/quality/evidence/v50-1/after-editorial-mobile.png",
    "docs/quality/evidence/v50-1/after-chapters-desktop.png",
  ].map(file => [file, "prose"]),
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
  "component-polish": ["quick", "registry-generation", "component-polish"],
  maintenance: ["quick", "maintenance"],
};
const ORDER = ["prose", "quick", "ci-contract", "registry-generation", "reporting-consent", "analytics-browser", "transient-timing", "install-consumer", "component-polish", "maintenance"];

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

// ---------------------------------------------------------------------------
// Release depth.
//
// A second, deliberately narrower question than the checkpoint allowlist above:
// how much must a RELEASE run execute? A release run is a push to `main` or a
// pull request into `main`, and it is the only thing that packages, publishes
// and deploys. Three answers:
//
//   full      the complete job, including the browser component catalogue. The
//             default for anything unknown, shared, uncertain or manual.
//   affected  everything except the browser catalogue gates. Selected only for
//             files that cannot change a rendered component, a style, a registry
//             payload or a build output: documentation, and the release,
//             deployment and CI tooling named below by exact path. Lint, type
//             checking, the Node and Worker suites, the clean-source release
//             pair, artifact CSP validation, fresh consumer installation,
//             artifact upload, environment approval and live health all still
//             run, so the release is still packaged and verified.
//   docs      documentation only: the diff check, and nothing else. No
//             dependency install, no build, no release artifact and no
//             deployment, because nothing a browser or a Worker serves changed.
//
// This never reduces a pull request that is not into `main` — that is the
// checkpoint allowlist's job — and never reduces a manual dispatch, which stays
// the explicit way to demand a complete run.
const DOCUMENTATION_SUFFIX = /\.(?:md|txt|png|jpe?g|svg|webp)$/;
const CATALOGUE_EXEMPT = new Set([
  // The workflows themselves and the pinned external deployment runtime.
  ".github/workflows/verify.yml",
  ".github/workflows/health.yml",
  ".github/workflows/recovery.yml",
  ".github/workflows/rollback.yml",
  ".github/wrangler-runtime/package.json",
  ".github/wrangler-runtime/package-lock.json",
  // The classifier and its tests.
  "scripts/ci-scope.mjs",
  "tests/ci-scope.test.mjs",
  // Release packaging, deployment and operations. None of these is imported by
  // the site, a component or the registry build, so no rendered surface can
  // change with them. `scripts/release-config.mjs`, `scripts/release-manifest.mjs`,
  // `scripts/release-csp.mjs`, `scripts/release-install.mjs` and
  // `scripts/run-production-gate.mjs` are deliberately absent: the first four
  // decide what the built site contains or how it is validated, and the last is
  // the catalogue runner itself.
  "scripts/release.mjs",
  "scripts/release-rollback-run.mjs",
  "scripts/operations.mjs",
  "scripts/operations-health.mjs",
  "scripts/deployment-diagnostics.mjs",
  "tests/release-live.test.mjs",
  "tests/operations.test.mjs",
]);

// Root markdown that is NOT prose. `GATE.md`, `GATE-MOTION.md` and
// `GATE-INTERACTIONS.md` are generated gate reports that the gate tooling writes
// and reads back; `FONT-NOTICES.md` carries the bundled fonts' SIL licence
// obligation and is listed in the public snapshot. Everything else at the root
// was checked: no string literal naming a root `.md` file appears in app,
// component, registry, worker, script or gate source except those reports, so no
// other root markdown file is read, embedded or rendered.
// `LICENCE`/`LICENSE` are deliberately absent from this rule entirely:
// `scripts/build-registry.mjs` embeds `LICENCE` into the NOTICES.txt shipped with
// every registry entry, so a licence change must keep its generator, packaging
// and consumer-installation checks and runs the complete job.
const GENERATED_ROOT_MARKDOWN = new Set(["GATE.md", "GATE-MOTION.md", "GATE-INTERACTIONS.md", "FONT-NOTICES.md"]);
function documentation(file) {
  const segments = file.split("/");
  if (segments.some(segment => segment === "" || segment === "." || segment === "..")) return false;
  if (segments.length === 1) return file.endsWith(".md") && !GENERATED_ROOT_MARKDOWN.has(file);
  return segments[0] === "docs" && DOCUMENTATION_SUFFIX.test(file);
}

// Paths that must keep real browser evidence without running the whole
// catalogue: their own bounded harness renders the cases they own. These are the
// same files the checkpoint allowlist above routes to `transient-timing`, and
// they select that harness here too rather than skipping browser evidence.
const FOCUSED_BROWSER = new Map([
  ["scripts/check-docs.mjs", "transient-timing"],
  ["scripts/docs-behaviors-details.mjs", "transient-timing"],
  ["scripts/docs-transient-paint.mjs", "transient-timing"],
  ["scripts/docs-harness-fingerprint.mjs", "transient-timing"],
  ["tests/docs-transient-timing.browser.mjs", "transient-timing"],
  ["tests/docs-clock-isolation.browser.mjs", "transient-timing"],
]);

// Files that MUST keep full catalogue verification for any real change, but whose
// one documented cleanup — moving a generated report or a documentation link to
// its new home — cannot alter a rendered component. A path rule alone cannot tell
// a relocation from a logic change, so these are decided on the actual diff: every
// added and removed line must name a moved destination, or be the one recursive
// mkdir a writer needs before writing into a directory that may not exist yet.
// Anything else in the same file returns the change to the full job.
const RELOCATION_SENSITIVE = new Set([
  "scripts/run-production-gate.mjs",
  "scripts/append-gate-report.mjs",
  "scripts/gate-motion-report.mjs",
  "scripts/gate-motion.mjs",
  "apps/gate/run.mjs",
  "tests/production-gate.test.mjs",
  "app/getting-started/page.tsx",
]);
const RELOCATION_LINE = /(?:GATE\.md|GATE-MOTION\.md|INSTALLATION\.md|BASELINE-STATUS\.md|mkdirSync)/;
export function relocationOnly(diff) {
  const changed = String(diff ?? "").split("\n")
    .filter(line => /^[-+]/.test(line) && !/^(?:\+\+\+|---)/.test(line));
  // An empty or unreadable diff proves nothing, so it is not a relocation.
  return changed.length > 0 && changed.every(line => RELOCATION_LINE.test(line));
}

export function releaseDepth(paths, diff) {
  if (!paths.length) return { depth: "full", suites: [], reason: "empty diff" };
  const relocation = paths.some(file => RELOCATION_SENSITIVE.has(file)) && relocationOnly(diff);
  const suites = new Set();
  let depth = "docs";
  for (const file of paths) {
    if (documentation(file)) continue;
    if (FOCUSED_BROWSER.has(file)) { depth = "affected"; suites.add(FOCUSED_BROWSER.get(file)); continue; }
    if (CATALOGUE_EXEMPT.has(file)) { depth = "affected"; continue; }
    if (relocation && RELOCATION_SENSITIVE.has(file)) { depth = "affected"; continue; }
    return { depth: "full", suites: [], reason: oneLine(`not exempt from release catalogue verification: ${file}`) };
  }
  const count = `${paths.length} changed ${paths.length === 1 ? "path" : "paths"}`;
  if (depth === "docs") return { depth, suites: [], reason: `${count}, all documentation` };
  return {
    depth,
    suites: [...suites],
    reason: `${count}, all documentation, named release tooling${relocation ? ", verified path relocation" : ""}${suites.size ? ` or a bounded ${[...suites].join("/")} harness` : ""}`,
  };
}

export function resolveReleaseDepth({ event, paths, diff, readPaths, readDiff }) {
  // A manual dispatch is the explicit way to demand a complete run, so it never
  // reduces. Everything that is not a push or a pull request is unknown here.
  if (event !== "push" && event !== "pull_request") return { depth: "full", suites: [], reason: `${event} runs complete release verification` };
  try {
    const files = paths ?? readPaths();
    return releaseDepth(files, diff ?? readDiff?.(files));
  } catch (error) {
    return { depth: "full", suites: [], reason: oneLine(`diff lookup failed: ${error.message}`) };
  }
}

/** Unified diff of only the relocation-sensitive files in this change. */
export function relocationDiff({ base, head, paths, cwd = process.cwd() }) {
  const files = paths.filter(file => RELOCATION_SENSITIVE.has(file));
  if (!files.length) return "";
  const git = args => execFileSync("git", args, { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024, stdio: ["ignore", "pipe", "pipe"] });
  const mergeBase = git(["merge-base", base, head]).trim();
  return git(["diff", "--no-renames", "-U0", mergeBase, head, "--", ...files]);
}

export function releaseOutputs(decision) {
  return {
    depth: decision.depth,
    depth_reason: oneLine(decision.reason) || "unspecified",
    // Documentation runs the diff check alone: no install, no suites.
    run_checks: String(decision.depth !== "docs"),
    // Packaging, artifact integrity, consumer installation, artifact upload and
    // every deployment job. Off only when nothing deployable changed.
    run_release: String(decision.depth !== "docs"),
    // The browser component catalogue and the other browser gates.
    run_catalogue: String(decision.depth === "full"),
    // A bounded browser harness instead of the catalogue: real browser evidence
    // for the few paths that own one, never zero browser evidence for them.
    run_transient: String(decision.depth === "full" || (decision.suites ?? []).includes("transient-timing")),
  };
}

export const SUITE_FLAGS = {
  run_prose: ["prose"],
  run_quick: ["quick"],
  run_registry: ["registry-generation"],
  run_reporting: ["reporting-consent"],
  run_analytics: ["analytics-browser"],
  run_transient: ["transient-timing"],
  run_install: ["install-consumer"],
  run_polish: ["component-polish"],
  run_maintenance: ["maintenance"],
  // Derived. Prose alone needs no dependencies, no browser and no build.
  run_npm: ["quick", "ci-contract", "registry-generation", "reporting-consent", "analytics-browser", "transient-timing", "install-consumer", "component-polish", "maintenance"],
  run_build: ["reporting-consent", "analytics-browser", "transient-timing", "install-consumer", "component-polish", "maintenance"],
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
  if (environment.CI_SCOPE_MODE === "release") {
    let decision;
    try {
      const range = { base: environment.CI_SCOPE_BASE_SHA, head: environment.CI_SCOPE_HEAD_SHA };
      decision = resolveReleaseDepth({
        event: environment.CI_SCOPE_EVENT,
        readPaths: () => changedPaths(range),
        readDiff: paths => relocationDiff({ ...range, paths }),
      });
    } catch (error) {
      decision = { depth: "full", suites: [], reason: oneLine(`release depth selection failed: ${error.message}`) };
    }
    const outputs = releaseOutputs(decision);
    for (const [key, value] of Object.entries(outputs)) console.log(`${key}=${value}`);
    if (environment.GITHUB_OUTPUT) {
      fs.appendFileSync(environment.GITHUB_OUTPUT, Object.entries(outputs).map(([key, value]) => `${key}=${value}\n`).join(""));
    }
    return;
  }
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
