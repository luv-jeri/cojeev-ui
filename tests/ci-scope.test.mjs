import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { changedPaths, classify, outputsFor, relocationDiff, relocationOnly, releaseDepth, releaseOutputs, resolveReleaseDepth, resolveScope, SUITE_FLAGS } from '../scripts/ci-scope.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

test('choice and accordion polish select real browser and generated-output checks, not the full catalogue', () => {
  for (const file of [
    'components/component-preview.tsx', 'components/examples/choice-foundations.tsx',
    'registry/cojeev/styles/choice-foundations.css', 'registry/cojeev/styles/accordion.css',
    'public/r/checkbox.json', 'public/r/radio-group.json', 'public/r/switch.json', 'public/r/accordion.json',
    'tests/choice-recovery.docs.browser.mjs', 'tests/disclosure-recovery.docs.browser.mjs',
    'tests/workbench.browser.mjs', 'tests/docs-compact-navigation.browser.mjs',
    'scripts/run-component-polish.mjs',
  ]) {
    const decision = classify([file]);
    assert.equal(decision.scope, 'checkpoint', file);
    assert.deepEqual(decision.suites, ['quick', 'registry-generation', 'component-polish'], file);
    const output = outputsFor(decision);
    assert.equal(output.run_polish, 'true', file);
    assert.equal(output.run_registry, 'true', file);
    assert.equal(output.run_build, 'true', file);
  }
  for (const file of ['registry/cojeev/lib/selector.tsx', 'registry/cojeev/ui/accordion.tsx',
    'components/examples/disclosure.tsx', 'registry/cojeev/styles/accordion.css.bak',
    'components/component-preview-new.tsx', 'scripts/run-component-polish.mjs.bak']) {
    assert.equal(classify([file]).scope, 'full', file);
  }
});

test('the six reviewed evidence images need no component rebuild and do not exempt neighbouring assets', () => {
  for (const file of [
    'docs/quality/evidence/h03-2/before-shape-menu.png', 'docs/quality/evidence/h03-2/after-shape-menu.png',
    'docs/quality/evidence/h03-2/after-mobile-comparisons.png',
    'docs/quality/evidence/v50-1/before-editorial-mobile.png', 'docs/quality/evidence/v50-1/after-editorial-mobile.png',
    'docs/quality/evidence/v50-1/after-chapters-desktop.png',
  ]) assert.equal(classify([file]).scope, 'docs', file);
  assert.equal(classify(['docs/quality/evidence/h03-2/unknown.png']).scope, 'full');
  assert.equal(classify(['docs/quality/evidence/h03-2/after-shape-menu.png', 'app/page.tsx']).scope, 'full');
});

test('component polish actually runs its browser runner after a build, even when reporting is also selected', () => {
  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  const steps = workflow.jobs.checkpoint.steps;
  const run = steps.findIndex(step => step.run === 'node scripts/run-component-polish.mjs');
  assert.ok(run >= 0, 'polish browser runner must execute');
  assert.match(steps[run].if, /run_polish == 'true'/);
  const build = steps.findIndex(step => step.run === 'npm run build' && String(step.if).includes('run_polish'));
  assert.ok(build >= 0 && build < run, 'polish must use the freshly built plain fixture');
});

// Every row is a real diff shape. The right-hand side is the whole contract:
// an unlisted path anywhere in the diff must pull the entire run to full.
const rows = [
  ['prose only', ['docs/production/2026-09-12-phase-1-ci.md'], 'docs', 'prose'],
  ['nested prose', ['docs/superpowers/plans/a.md', 'README.md', 'AGENTS.md'], 'docs', 'prose'],
  ['licence at root verifies generated notice consistency', ['LICENCE'], 'checkpoint', 'quick'],
  ['deleted prose still prose', ['docs/old-report.md'], 'docs', 'prose'],
  ['root unit tests', ['tests/release.test.mjs'], 'checkpoint', 'quick'],
  ['typescript unit test', ['tests/settings.test.ts'], 'checkpoint', 'quick'],
  ['named gate child fixture', ['tests/fixtures/production-gate-child.mjs'], 'checkpoint', 'quick'],
  ['workflow', ['.github/workflows/verify.yml'], 'checkpoint', 'quick,ci-contract'],
  ['gate runner', ['scripts/run-production-gate.mjs'], 'checkpoint', 'quick,ci-contract'],
  ['classifier itself', ['scripts/ci-scope.mjs', 'tests/ci-scope.test.mjs'], 'checkpoint', 'quick,ci-contract'],
  ['gate runner test is also a ci contract', ['tests/production-gate.test.mjs'], 'checkpoint', 'quick,ci-contract'],
  ['analytics browser test', ['tests/analytics.browser.mjs'], 'checkpoint', 'quick,analytics-browser'],
  ['transient harness', ['scripts/docs-transient-paint.mjs'], 'checkpoint', 'quick,transient-timing'],
  ['transient harness test', ['tests/docs-transient-timing.browser.mjs'], 'checkpoint', 'quick,transient-timing'],
  ['clock isolation test', ['tests/docs-clock-isolation.browser.mjs'], 'checkpoint', 'quick,transient-timing'],
  ['docs behaviour details', ['scripts/docs-behaviors-details.mjs'], 'checkpoint', 'quick,transient-timing'],
  ['catalogue harness entrypoint', ['scripts/check-docs.mjs'], 'checkpoint', 'quick,transient-timing'],
  ['consumer install script', ['scripts/verify-install.mjs'], 'checkpoint', 'quick,install-consumer'],
  ['consumer install runner', ['scripts/run-install-verification.mjs'], 'checkpoint', 'quick,install-consumer'],

  // I03 licence notices: the generator, the file it writes and the payloads it
  // regenerates. Generation consistency plus a real fresh-consumer install is
  // the proportionate check for a notice that only travels as an installed file.
  ['notice generator helper', ['scripts/registry-notices.mjs'], 'checkpoint', 'quick,registry-generation,install-consumer'],
  ['registry build script', ['scripts/build-registry.mjs'], 'checkpoint', 'quick,registry-generation,install-consumer'],
  ['generated notices file', ['registry/cojeev/NOTICES.txt'], 'checkpoint', 'quick,registry-generation,install-consumer'],
  ['generated base payload', ['public/r/cojeev.json'], 'checkpoint', 'quick,registry-generation,install-consumer'],
  ['generated catalogue payloads', ['registry.json', 'public/registry.json', 'public/r/registry.json'], 'checkpoint', 'quick,registry-generation,install-consumer'],
  ['notice generation test', ['tests/registry-notices.test.mjs'], 'checkpoint', 'quick,registry-generation,install-consumer'],

  // E08-1 reporting consent: the real widget and the two checks that exercise it.
  ['reporting widget', ['components/reporting/reporting-widget.tsx'], 'checkpoint', 'quick,reporting-consent'],
  ['reporting consent check', ['scripts/check-reporting-consent.mjs'], 'checkpoint', 'quick,reporting-consent'],
  ['reporting browser journey', ['scripts/check-reporting-browser.mjs'], 'checkpoint', 'quick,reporting-consent'],

  // G01 standalone loading measurement. Nothing imports it and CI never samples
  // it, so lint, type checking and the unit suites are the whole check.
  ['loading measurement script', ['scripts/measure-loading-baseline.mjs'], 'checkpoint', 'quick'],

  // Union: prose plus code keeps every selected suite and stops being docs-only.
  ['prose and workflow union', ['README.md', '.github/workflows/verify.yml'], 'checkpoint', 'prose,quick,ci-contract'],
  ['three-way union', ['docs/a.md', 'tests/analytics.browser.mjs', 'scripts/verify-install.mjs'], 'checkpoint', 'prose,quick,analytics-browser,install-consumer'],
  ['union does not duplicate quick', ['tests/a.test.mjs', 'scripts/check-docs.mjs'], 'checkpoint', 'quick,transient-timing'],
  // The complete changed-file list of the B01 change that introduced this
  // classifier. It must earn a checkpoint, or the split fails on its own work.
  ['the B01 change itself', [
    '.github/workflows/verify.yml',
    'docs/production/2026-09-12-phase-1-ci.md',
    'scripts/ci-scope.mjs',
    'scripts/run-install-verification.mjs',
    'tests/ci-scope.test.mjs',
  ], 'checkpoint', 'prose,quick,ci-contract,install-consumer'],


  // The complete changed-file lists of the three bounded launch changes this
  // extension exists for, taken from their prepared worktrees.
  ['the I03 change itself', [
    'docs/quality/2026-09-13-download-license-notices.md',
    'public/r/cojeev.json',
    'public/r/registry.json',
    'public/registry.json',
    'registry.json',
    'registry/cojeev/NOTICES.txt',
    'scripts/build-registry.mjs',
    'scripts/registry-notices.mjs',
    'tests/registry-notices.test.mjs',
  ], 'checkpoint', 'prose,quick,registry-generation,install-consumer'],
  ['the E08-1 change itself', [
    'components/reporting/reporting-widget.tsx',
    'docs/privacy/2026-09-13-explicit-diagnostics.md',
    'docs/superpowers/plans/2026-09-12-launch-master-checklist.md',
    'scripts/check-reporting-browser.mjs',
    'scripts/check-reporting-consent.mjs',
  ], 'checkpoint', 'prose,quick,reporting-consent'],
  ['the G01 change itself', [
    'docs/quality/2026-09-13-performance-baseline.md',
    'scripts/measure-loading-baseline.mjs',
  ], 'checkpoint', 'prose,quick'],

  // G07 maintenance: the three named files, plus the two checks that exercise them.
  ['deleted unused landing section', ['components/landing/launch-faq.tsx'], 'checkpoint', 'quick,maintenance'],
  ['shared landing stylesheet', ['components/landing/landing.css'], 'checkpoint', 'quick,maintenance'],
  ['reporting draft store', ['lib/reporting/draft.ts'], 'checkpoint', 'quick,maintenance'],
  ['guide route check', ['scripts/check-landing-guides.mjs'], 'checkpoint', 'quick,maintenance'],
  ['draft persistence journey', ['tests/reporting-drafts.browser.mjs'], 'checkpoint', 'quick,maintenance'],
  ['the whole named maintenance set', [
    'components/landing/landing.css', 'components/landing/launch-faq.tsx', 'lib/reporting/draft.ts',
  ], 'checkpoint', 'quick,maintenance'],
  // The complete changed-file list of the prepared G07 commit.
  ['the G07 change itself', [
    'components/landing/landing.css',
    'components/landing/launch-faq.tsx',
    'docs/quality/2026-09-13-unused-private-code.md',
    'lib/reporting/draft.ts',
  ], 'checkpoint', 'prose,quick,maintenance'],
  // The complete changed-file list of this extension itself.
  ['the B01-4 change itself', [
    '.github/workflows/verify.yml',
    'docs/production/2026-09-13-maintenance-check-scope.md',
    'scripts/check-landing-guides.mjs',
    'scripts/ci-scope.mjs',
    'tests/ci-scope.test.mjs',
  ], 'checkpoint', 'prose,quick,ci-contract,maintenance'],
  ['maintenance mixed with prose stays checkpoint', ['docs/a.md', 'lib/reporting/draft.ts'], 'checkpoint', 'prose,quick,maintenance'],
  ['maintenance mixed with another named suite keeps both', [
    'components/landing/landing.css', 'tests/analytics.browser.mjs',
  ], 'checkpoint', 'quick,analytics-browser,maintenance'],

  // B01-5: the two body-copy files E02-1 edits. /privacy/ is opened by
  // check-landing-guides.mjs and creator-page.tsx renders /about/ there and
  // /work-with-me/ in the marketing gate, so both join that same suite.
  ['the privacy page body copy', ['app/privacy/page.tsx'], 'checkpoint', 'quick,maintenance'],
  ['the creator page body copy', ['components/landing/creator-page.tsx'], 'checkpoint', 'quick,maintenance'],
  ['both E02-1 copy files together', [
    'app/privacy/page.tsx', 'components/landing/creator-page.tsx',
  ], 'checkpoint', 'quick,maintenance'],
  // The expected changed-file list of the E02-1 copy checkpoint.
  ['the E02-1 change itself', [
    'app/privacy/page.tsx',
    'components/landing/creator-page.tsx',
    'docs/superpowers/plans/2026-09-12-launch-master-checklist.md',
  ], 'checkpoint', 'prose,quick,maintenance'],

  // Fallbacks.
  ['empty diff', [], 'full', ''],
  ['application source', ['registry/cojeev/ui/button.tsx'], 'full', ''],
  ['shared style', ['registry/cojeev/styles/tokens.css'], 'full', ''],
  ['shared motion', ['registry/cojeev/motion/settings.ts'], 'full', ''],
  ['dependency manifest', ['package-lock.json'], 'full', ''],
  ['configuration', ['next.config.ts'], 'full', ''],
  ['worker source is not guessed safe', ['workers/reporting/src/index.ts'], 'full', ''],
  ['worker test is not guessed safe', ['workers/reporting/test/integration.test.mjs'], 'full', ''],
  ['docs data is not prose', ['data/component-guides.json'], 'full', ''],
  ['one unknown path poisons the union', ['docs/a.md', 'tests/a.test.mjs', 'app/page.tsx'], 'full', ''],

  // Lookalikes. Each of these must be full, never the allowlisted neighbour.
  ['executable under docs', ['docs/build-tool.mjs'], 'full', ''],
  ['prose suffix on source', ['registry/cojeev/ui/button.tsx.md'], 'full', ''],
  ['markdown under application', ['app/docs/README.md'], 'full', ''],
  ['markdown under public', ['public/README.md'], 'full', ''],
  ['markdown under registry', ['registry/cojeev/README.md'], 'full', ''],
  ['directory prefix lookalike', ['docsite/guide.md'], 'full', ''],
  ['traversal out of docs', ['docs/../app/page.tsx'], 'full', ''],
  ['double extension on prose', ['README.md.tsx'], 'full', ''],
  ['backup of an allowlisted file', ['.github/workflows/verify.yml.bak'], 'full', ''],
  ['sibling workflow is not allowlisted', ['.github/workflows/health.yml'], 'full', ''],
  ['workflow directory sibling', ['.github/wrangler-runtime/package.json'], 'full', ''],
  ['unknown browser test', ['tests/dock.browser.mjs'], 'full', ''],
  ['browser test named like a unit test', ['tests/dock.browser.test.mjs.txt'], 'full', ''],
  ['nested fixture is not the named one', ['tests/fixtures/other-child.mjs'], 'full', ''],
  ['nested test directory', ['tests/nested/a.test.mjs'], 'full', ''],
  ['unknown harness file', ['scripts/docs-behaviors-effects.mjs'], 'full', ''],
  ['gate runner backup', ['scripts/run-production-gate.mjs.orig'], 'full', ''],
  ['another generated payload is not the base item', ['public/r/button.json'], 'full', ''],
  ['registry source feeding the generator', ['registry/cojeev/lib/bloom-engine.ts'], 'full', ''],
  ['backup of the generated notices', ['registry/cojeev/NOTICES.txt.bak'], 'full', ''],
  ['a neighbouring reporting component', ['components/reporting/capture-controls.tsx'], 'full', ''],
  ['the reporting maintainer screen', ['components/reporting/admin.tsx'], 'full', ''],
  ['reporting styles', ['components/reporting/reporting.css'], 'full', ''],
  ['the reporting fixture server', ['scripts/reporting-browser-fixture.mjs'], 'full', ''],
  ['the reporting journey runner', ['scripts/run-reporting-browser.mjs'], 'full', ''],
  ['a different measurement script', ['scripts/measure-interaction-baseline.mjs'], 'full', ''],
  ['backup of the measurement script', ['scripts/measure-loading-baseline.mjs.bak'], 'full', ''],
  ['a landing component beside the deleted one', ['components/landing/landing-page.tsx'], 'full', ''],
  ['the guide shell that consumes the shared styles', ['components/landing/guide-shell.tsx'], 'full', ''],
  ['the marketing shell', ['components/landing/marketing-shell.tsx'], 'full', ''],
  ['a neighbouring landing stylesheet', ['components/landing/shape-playground.css'], 'full', ''],
  ['backup of the shared stylesheet', ['components/landing/landing.css.bak'], 'full', ''],
  ['a page that imports the shared stylesheet', ['app/getting-started/page.tsx'], 'full', ''],
  ['a sibling route that renders the allowlisted creator page', ['app/about/page.tsx'], 'full', ''],
  ['the other route that renders the allowlisted creator page', ['app/work-with-me/page.tsx'], 'full', ''],
  ['backup of the creator page', ['components/landing/creator-page.tsx.bak'], 'full', ''],
  ['the interactive control the privacy page embeds', ['components/analytics/analytics-preferences.tsx'], 'full', ''],
  ['another reporting library file', ['lib/reporting/client.ts'], 'full', ''],
  ['backup of the draft store', ['lib/reporting/draft.ts.orig'], 'full', ''],
  ['a different reporting browser journey', ['tests/reporting-stack.browser.mjs'], 'full', ''],
  ['the release marketing gate itself', ['scripts/check-refinement-marketing.mjs'], 'full', ''],
  ['backup of the guide route check', ['scripts/check-landing-guides.mjs.bak'], 'full', ''],
  ['maintenance beside an unknown path', ['components/landing/landing.css', 'registry/cojeev/styles/tokens.css'], 'full', ''],
  ['maintenance beside application source', ['lib/reporting/draft.ts', 'app/page.tsx'], 'full', ''],
  ['leading slash', ['/README.md'], 'full', ''],
];

for (const [name, paths, scope, suites] of rows) {
  test(`classify: ${name}`, () => {
    const decision = classify(paths);
    assert.equal(decision.scope, scope, `${name}: ${decision.reason}`);
    assert.equal(decision.suites.join(','), suites, name);
  });
}

test('a rename is classified on both of its --no-renames paths', () => {
  assert.equal(classify(['docs/moved.md', 'docs/original.md']).scope, 'docs');
  // Old path allowlisted, new path not: the new path must still force full.
  assert.equal(classify(['docs/original.md', 'scripts/moved.mjs']).scope, 'full');
});

test('release acceptance is forced regardless of the changed paths', () => {
  const prose = ['docs/a.md'];
  assert.equal(resolveScope({ event: 'push', baseRef: '', paths: prose }).scope, 'full');
  assert.equal(resolveScope({ event: 'workflow_dispatch', baseRef: '', paths: prose }).scope, 'full');
  assert.equal(resolveScope({ event: 'pull_request', baseRef: 'main', paths: prose }).scope, 'full');
  assert.equal(resolveScope({ event: 'pull_request', baseRef: 'refs/heads/main', paths: prose }).scope, 'full');
  assert.equal(resolveScope({ event: 'pull_request', baseRef: 'release-candidate', paths: prose }).scope, 'docs');

  // The same guards for the B01-5 paths: a reduced scope exists only on a pull
  // request that is not into main, never on a push or a manual dispatch.
  const copy = ['app/privacy/page.tsx', 'components/landing/creator-page.tsx'];
  assert.equal(resolveScope({ event: 'push', baseRef: '', paths: copy }).scope, 'full');
  assert.equal(resolveScope({ event: 'workflow_dispatch', baseRef: '', paths: copy }).scope, 'full');
  assert.equal(resolveScope({ event: 'pull_request', baseRef: 'main', paths: copy }).scope, 'full');
  assert.equal(resolveScope({ event: 'pull_request', baseRef: 'refs/heads/main', paths: copy }).scope, 'full');
  assert.equal(resolveScope({ event: 'pull_request', baseRef: 'release-candidate', paths: copy }).scope, 'checkpoint');
});

test('a diff lookup failure falls back to full instead of exempting the change', () => {
  const decision = resolveScope({
    event: 'pull_request',
    baseRef: 'release',
    readPaths: () => { throw new Error('fatal: bad object'); },
  });
  assert.equal(decision.scope, 'full');
  assert.match(decision.reason, /fatal: bad object/);
});

test('a reason can never corrupt the workflow output file', () => {
  // GitHub Actions outputs are key=value lines. A git error is multi-line, and
  // a NUL-separated path may itself contain a newline.
  const failed = resolveScope({
    event: 'pull_request',
    baseRef: 'release',
    readPaths: () => { throw new Error('fatal: bad object\nsecond line\nthird line'); },
  });
  assert.equal(failed.scope, 'full');
  assert.doesNotMatch(failed.reason, /[\r\n]/);
  assert.match(failed.reason, /fatal: bad object/);

  const hostile = classify(['app/evil\nrun_quick=true.tsx']);
  assert.equal(hostile.scope, 'full');
  assert.doesNotMatch(hostile.reason, /[\r\n]/);
});

test('changedPaths reads a real merge base from git', (t) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-scope-diff-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  git('init', '-q', '-b', 'release');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Test');
  fs.mkdirSync(path.join(cwd, 'docs'));
  fs.writeFileSync(path.join(cwd, 'docs/start.md'), 'base\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD').trim();

  git('checkout', '-qb', 'feature');
  fs.writeFileSync(path.join(cwd, 'docs/added by me.md'), 'space in the name\n');
  fs.rmSync(path.join(cwd, 'docs/start.md'));
  git('add', '-A');
  git('commit', '-qm', 'feature work');
  const head = git('rev-parse', 'HEAD').trim();

  // The base branch moves on after the fork point. A two-dot diff would report
  // that unrelated commit as ours; the merge base must exclude it.
  git('checkout', '-q', 'release');
  fs.writeFileSync(path.join(cwd, 'package.json'), '{}\n');
  git('add', '-A');
  git('commit', '-qm', 'unrelated base commit');
  const movedBase = git('rev-parse', 'HEAD').trim();

  assert.deepEqual(changedPaths({ base, head, cwd }).sort(), ['docs/added by me.md', 'docs/start.md']);
  assert.deepEqual(changedPaths({ base: movedBase, head, cwd }).sort(), ['docs/added by me.md', 'docs/start.md']);
  assert.equal(classify(changedPaths({ base: movedBase, head, cwd })).scope, 'docs');
  assert.throws(() => changedPaths({ base: '0000000000000000000000000000000000000000', head, cwd }));
});

test('the workflow keeps release acceptance independent of the classifier', () => {
  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  const verifyIf = String(workflow.jobs.verify.if);

  // Independent of the classifier: a push, a manual dispatch or a pull request
  // into main reaches the full job through conditions that never read an output.
  assert.match(verifyIf, /github\.event_name != 'pull_request'/);
  assert.match(verifyIf, /github\.base_ref == 'main'/);
  // A resolver that fails must not silently skip every job, but a run the user
  // cancelled must stay cancelled rather than start a full release job.
  assert.match(verifyIf, /!cancelled\(\)/);
  assert.doesNotMatch(verifyIf, /always\(\)/);
  assert.match(verifyIf, /needs\.scope\.result != 'success'/);
  // A blank or unrecognised scope is not a reduced scope: it reaches the full
  // job, because only the two known values are excluded here.
  assert.match(verifyIf, /needs\.scope\.outputs\.scope != 'docs'/);
  assert.match(verifyIf, /needs\.scope\.outputs\.scope != 'checkpoint'/);

  const checkpointIf = String(workflow.jobs.checkpoint.if);
  assert.match(checkpointIf, /github\.event_name == 'pull_request'/);
  assert.match(checkpointIf, /github\.base_ref != 'main'/);
  assert.match(checkpointIf, /needs\.scope\.result == 'success'/);
  // Explicit known values only. `!= 'full'` would let a blank output through
  // and run an empty checkpoint with every suite flag false.
  assert.match(checkpointIf, /needs\.scope\.outputs\.scope == 'docs'/);
  assert.match(checkpointIf, /needs\.scope\.outputs\.scope == 'checkpoint'/);
  assert.doesNotMatch(checkpointIf, /scope != 'full'/);
});

test('the scoped job is bounded and never publishes release evidence', () => {
  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  const checkpoint = workflow.jobs.checkpoint;
  assert.ok(checkpoint['timeout-minutes'] <= 20, 'the scoped job must stay bounded');
  assert.equal(checkpoint.concurrency['cancel-in-progress'], true, 'outdated pull request checks may be cancelled');

  const serialized = JSON.stringify(checkpoint);
  assert.doesNotMatch(serialized, /release-\$\{\{ github\.sha \}\}/, 'the scoped job must not publish a release artifact');
  assert.doesNotMatch(serialized, /build-pair/, 'the scoped job must not build the release pair');
  // The catalogue gate is `npm run gate` exactly. A named journey script such
  // as `npm run gate:marketing` opens a bounded set of real pages and is not it.
  assert.doesNotMatch(serialized, /npm run gate(?!:marketing\b)/, 'only the named marketing journey is allowed here, not other catalogue gates');
  assert.doesNotMatch(serialized, /release\.mjs/, 'the scoped job must not touch the release script');

  const summary = checkpoint.steps.at(-1);
  assert.equal(summary.if, 'always()', 'the result must be reported even when a suite fails');
  assert.match(summary.run, /not release acceptance/i);
});

test('the scoped job runs the suite commands its allowlist promises', () => {
  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  const steps = workflow.jobs.checkpoint.steps;
  const guarded = (flag) => steps.filter(step => String(step.if ?? '').includes(`needs.scope.outputs.${flag} == 'true'`))
    .map(step => step.run ?? step.uses).join('\n');

  for (const command of ['npm run lint', 'npm run typecheck', 'npm test', 'npm run reporting:test', 'npm run registry-host:test']) {
    assert.ok(guarded('run_quick').includes(command), `quick suite must run ${command}`);
  }
  assert.ok(guarded('run_analytics').includes('tests/analytics.browser.mjs'), 'the analytics suite must run the silent checks');
  assert.ok(guarded('run_analytics').includes('npm run analytics:browser'), 'the analytics suite must run the enabled check');
  assert.ok(guarded('run_transient').includes('tests/docs-transient-timing.browser.mjs'), 'the transient suite must run its harness');
  assert.ok(guarded('run_transient').includes('--negative'), 'the transient suite must run its negative control');
  assert.ok(guarded('run_transient').includes('tests/docs-clock-isolation.browser.mjs'), 'the transient suite must run the clock-isolation harness');
  assert.ok(guarded('run_install').includes('run-install-verification.mjs'), 'the install suite must install from a locally served registry');
  assert.ok(guarded('run_registry').includes('scripts/build-registry.mjs'), 'the registry suite must regenerate the committed output');
  assert.ok(guarded('run_registry').includes('git diff --exit-code'), 'the registry suite must fail when generated output no longer matches its source');
  assert.ok(guarded('run_reporting').includes('scripts/check-reporting-consent.mjs'), 'the reporting suite must run the focused real-widget consent check');
  assert.ok(guarded('run_reporting').includes('scripts/run-reporting-browser.mjs'), 'the reporting suite must also run the complete Worker-backed journey');
  const reportingBuild = steps.find(step => String(step.if ?? '').includes("needs.scope.outputs.run_reporting == 'true'")
    && String(step.run ?? '') === 'npm run build');
  assert.equal(reportingBuild?.env?.NEXT_PUBLIC_REPORTING_API_URL, 'http://127.0.0.1:8787',
    'the reporting suite must build the fixture against the loopback Worker it starts');
  assert.doesNotMatch(guarded('run_install'), /luv-jeri\.github\.io/, 'the install suite must never verify against the live website');
  assert.ok(guarded('run_npm').includes('npm ci'), 'dependency installation is skipped for a prose-only change');
  assert.ok(!String(steps.find(step => String(step.run ?? '').includes('npm ci'))?.if ?? '').includes('run_prose'));
});

test('every suite flag the classifier publishes is wired through the scope job', () => {
  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  const outputs = workflow.jobs.scope.outputs;
  // A flag the classifier publishes but the job does not forward is blank in the
  // dependent job: every guarded step silently skips and the run reports success.
  for (const flag of Object.keys(SUITE_FLAGS)) {
    assert.equal(outputs[flag], `\${{ steps.select.outputs.${flag} }}`, `${flag} must reach the dependent jobs`);
  }
});

test('the reporting widget is never accepted on consent evidence alone', () => {
  // The widget is product code and this is the one line of it E08-1 changed. A
  // later change to the same file is larger, so its reduced scope has to carry
  // the complete Worker-backed journey and a real build, not just the consent check.
  const outputs = outputsFor(classify(['components/reporting/reporting-widget.tsx']));
  assert.equal(outputs.run_reporting, 'true');
  assert.equal(outputs.run_build, 'true', 'the widget must be rebuilt, not only unit tested');
  assert.equal(outputs.run_quick, 'true');
  assert.equal(outputs.run_npm, 'true');

  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  const steps = workflow.jobs.checkpoint.steps
    .filter(step => /check-reporting-consent\.mjs|run-reporting-browser\.mjs/.test(String(step.run ?? '')));
  assert.equal(steps.length, 2, 'both reporting checks must be present exactly once');
  // One flag guards both: the journey cannot be dropped while the consent check runs.
  for (const step of steps) assert.match(String(step.if), /needs\.scope\.outputs\.run_reporting == 'true'/);

  for (const neighbour of [
    'components/reporting/admin.tsx',
    'components/reporting/capture-controls.tsx',
    'components/reporting/reporting.css',
    'components/reporting/request-board.tsx',
    'workers/reporting/src/index.ts',
    'scripts/reporting-browser-fixture.mjs',
    'scripts/run-reporting-browser.mjs',
  ]) assert.equal(classify([neighbour]).scope, 'full', neighbour);
});

test('generated registry output is proved against its generator, not assumed', () => {
  const outputs = outputsFor(classify(['scripts/registry-notices.mjs']));
  assert.equal(outputs.run_registry, 'true');
  // A notice that only reaches a consumer as an installed file is worth nothing
  // until a real fresh consumer install writes it, so both run together.
  assert.equal(outputs.run_install, 'true');
  assert.equal(outputs.run_build, 'true');
  assert.equal(classify(['registry/cojeev/NOTICES.txt']).suites.join(','), outputs.suites);
});

test('the loading measurement is checked in CI, never sampled there', () => {
  const decision = classify(['scripts/measure-loading-baseline.mjs']);
  assert.deepEqual(decision.suites, ['quick'], 'lint, type checking and the unit suites are the whole check');
  const outputs = outputsFor(decision);
  assert.equal(outputs.run_build, 'false');
  assert.equal(outputs.run_install, 'false');
  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  assert.doesNotMatch(JSON.stringify(workflow.jobs), /measure-loading-baseline/,
    'no job may take performance samples on a shared runner');
});

test('the analytics unset case stays an analytics-free build, reused as the release job does', () => {
  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  const analytics = /NEXT_PUBLIC_ANALYTICS_ENABLED|NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN|NEXT_PUBLIC_POSTHOG_HOST/;

  // The unset case is whichever analytics-free build ran last before it. With
  // reporting selected that is the reporting fixture, exactly as in the release
  // job; without it, the plain build. Either way it must set no analytics value,
  // or "silent when unconfigured" would be measuring a configured build.
  for (const job of ['checkpoint', 'verify']) {
    const steps = workflow.jobs[job].steps;
    const at = predicate => steps.findIndex(predicate);
    const reportingBuild = at(step => String(step.run ?? '') === 'npm run build' && step.env?.NEXT_PUBLIC_REPORTING_API_URL);
    const journey = at(step => /run-reporting-browser\.mjs/.test(String(step.run ?? '')));
    const unset = at(step => /analytics\.browser\.mjs --expect-silent/.test(String(step.run ?? '')));
    const enabled = at(step => analytics.test(JSON.stringify(step.env ?? {})) && step.env?.NEXT_PUBLIC_ANALYTICS_ENABLED === 'true');
    assert.ok(reportingBuild >= 0 && journey >= 0 && unset >= 0 && enabled >= 0, `${job} must keep all four steps`);
    assert.ok(reportingBuild < journey, `${job}: the fixture must be built before its journey`);
    assert.ok(journey < unset, `${job}: the reporting fixture must be the build the unset case reuses`);
    assert.ok(unset < enabled, `${job}: silence must be proved before analytics is switched on`);
    assert.doesNotMatch(JSON.stringify(steps[reportingBuild].env), analytics, `${job}: the reporting fixture sets no analytics value`);
  }

  // The plain build the transient, install and analytics-unset steps share must
  // stay bare: it is the unset case whenever reporting is not selected.
  const plain = workflow.jobs.checkpoint.steps.find(step =>
    String(step.run ?? '') === 'npm run build' && String(step.if ?? '').includes("run_build == 'true'"));
  assert.ok(plain, 'the shared plain build must stay guarded by run_build');
  assert.equal(plain.env, undefined, 'the plain build must set no environment at all');
});

test('reporting reuses its fixture build unless another selected journey needs the plain build', () => {
  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  const steps = workflow.jobs.checkpoint.steps;
  const plain = steps.find(step => String(step.run ?? '') === 'npm run build' && String(step.if ?? '').includes("run_build == 'true'"));
  assert.equal(plain?.if, "needs.scope.outputs.run_build == 'true' && (needs.scope.outputs.run_reporting != 'true' || needs.scope.outputs.run_transient == 'true' || needs.scope.outputs.run_install == 'true' || needs.scope.outputs.run_polish == 'true' || needs.scope.outputs.run_maintenance == 'true')");
  const browser = steps.find(step => String(step.run ?? '').includes('playwright install'));
  assert.equal(browser?.if, "needs.scope.outputs.run_build == 'true'", 'reporting still needs Chromium even when the plain build is omitted');
});

test('one unit invocation already covers the classifier and partition runner', () => {
  const suite = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).scripts.test;
  assert.ok(suite.includes('tests/*.test.mjs'), 'npm test must glob the mjs suites');
  for (const covered of ['tests/ci-scope.test.mjs', 'tests/production-gate.test.mjs']) {
    assert.ok(fs.existsSync(path.join(root, covered)), `${covered} exists`);
    assert.match(covered, /^tests\/[^/]+\.test\.mjs$/, `${covered} is matched by the npm test glob`);
  }
  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  const extra = workflow.jobs.checkpoint.steps.filter(step => /node --test/.test(String(step.run ?? '')));
  assert.deepEqual(extra, [], 'the scoped job must not run those suites a second time');
});

test('unused-code maintenance runs the real journeys of the files it names, after a build', () => {
  const decision = classify(['components/landing/landing.css']);
  const outputs = outputsFor(decision);
  // landing.css is product styling shared by five routes, so lint and unit
  // tests alone are never the evidence: the pages have to be built and opened.
  assert.equal(outputs.run_maintenance, 'true');
  assert.equal(outputs.run_build, 'true');
  assert.equal(outputs.run_quick, 'true');
  assert.equal(outputs.run_npm, 'true');
  assert.equal(outputs.run_polish, 'false');
  assert.equal(outputs.run_registry, 'false');

  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  const steps = workflow.jobs.checkpoint.steps;
  const guarded = steps.filter(step => String(step.if ?? '').includes("needs.scope.outputs.run_maintenance == 'true'"));
  const commands = guarded.map(step => String(step.run ?? ''));
  assert.ok(commands.includes('npm run gate:marketing'), 'the homepage and creator routes must be opened');
  assert.ok(commands.some(command => command.includes('check-landing-guides.mjs')), 'the remaining landing.css routes must be opened');
  assert.ok(commands.some(command => command.includes('tests/reporting-drafts.browser.mjs')), 'draft storage must still be exercised');
  const build = steps.findIndex(step => String(step.run ?? '') === 'npm run build' && String(step.if ?? '').includes('run_maintenance'));
  const first = steps.indexOf(guarded.find(step => String(step.run ?? '') !== 'npm run build'));
  assert.ok(build >= 0 && build < first, 'the journeys must run against a freshly built static export');
  // A bounded set of real pages, never the catalogue gate or a release build.
  const serialized = JSON.stringify(guarded);
  assert.doesNotMatch(serialized, /npm run gate(?!:marketing\b)/, 'only the named marketing journey is allowed here, not other catalogue gates');
  assert.doesNotMatch(serialized, /gate:docs|gate:mobile|gate:reference|build-pair|release\.mjs/, 'no release or catalogue work in a maintenance check');
});

test('every route that imports the shared landing stylesheet is actually opened by a check', () => {
  // The allowlist's promise: no consumer of components/landing/landing.css is
  // left untested. Both lists are read from the tree, so a sixth consumer added
  // later fails here instead of silently riding along on a reduced scope.
  const appRoot = path.join(root, 'app');
  const consumers = fs.readdirSync(appRoot, { recursive: true })
    .filter(file => /(^|\/)(page|layout)\.tsx$/.test(file))
    .filter(file => fs.readFileSync(path.join(appRoot, file), 'utf8').includes('components/landing/landing.css'));
  assert.deepEqual(consumers.filter(file => /(^|\/)layout\.tsx$/.test(file)), [],
    'a shared-layout stylesheet import requires explicit coverage of its descendant routes');
  const pages = consumers.map(file => `/${file.replace(/page\.tsx$/, '')}`);
  const covered = ['check-refinement-marketing.mjs', 'check-landing-guides.mjs']
    .map(file => fs.readFileSync(path.join(root, 'scripts', file), 'utf8')).join('\n');
  assert.ok(pages.length >= 5, `expected the known landing.css consumers, found ${pages.join(', ')}`);
  for (const route of pages) {
    // The homepage is opened as a template literal, the rest as literal paths.
    const opened = route === '/' ? covered.includes('${base}/`') : covered.includes(route);
    assert.ok(opened, `${route} imports landing.css and must be opened by a maintenance check`);
  }
});

test('the E02-1 copy files are opened, as built pages, by the suite they select', () => {
  // Body copy only exists once a page is rendered, so lint and unit tests are
  // never the evidence here: the selected suite has to build the site and open
  // every route that renders these two files.
  for (const file of ['app/privacy/page.tsx', 'components/landing/creator-page.tsx']) {
    const outputs = outputsFor(classify([file]));
    assert.equal(outputs.run_maintenance, 'true', file);
    assert.equal(outputs.run_build, 'true', file);
    assert.equal(outputs.run_quick, 'true', file);
    assert.equal(outputs.run_polish, 'false', file);
    assert.equal(outputs.run_registry, 'false', file);
  }

  // Read the renderers from the tree: a third route rendering CreatorPage added
  // later fails here instead of silently riding along on a reduced scope.
  const appRoot = path.join(root, 'app');
  const renderers = fs.readdirSync(appRoot, { recursive: true })
    .filter(file => /(^|\/)(page|layout)\.tsx$/.test(file))
    .filter(file => fs.readFileSync(path.join(appRoot, file), 'utf8').includes('components/landing/creator-page'));
  assert.deepEqual(renderers.filter(file => /(^|\/)layout\.tsx$/.test(file)), [],
    'a layout-level render requires explicit coverage of its descendant routes');
  const routes = [...new Set(['/privacy/', ...renderers.map(file => `/${file.replace(/page\.tsx$/, '')}`)])].sort();
  assert.deepEqual(routes, ['/about/', '/privacy/', '/work-with-me/']);

  const checks = {
    'check-landing-guides.mjs': fs.readFileSync(path.join(root, 'scripts/check-landing-guides.mjs'), 'utf8'),
    'check-refinement-marketing.mjs': fs.readFileSync(path.join(root, 'scripts/check-refinement-marketing.mjs'), 'utf8'),
  };
  for (const route of routes) {
    assert.ok(Object.values(checks).some(source => source.includes(route)),
      `${route} renders allowlisted copy and must be opened by a maintenance check`);
  }
  // Those journeys are guarded by run_maintenance and run after a real build.
  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  const steps = workflow.jobs.checkpoint.steps;
  const guarded = steps.filter(step => String(step.if ?? '').includes("needs.scope.outputs.run_maintenance == 'true'"));
  const commands = guarded.map(step => String(step.run ?? ''));
  assert.ok(commands.includes('npm run gate:marketing'), '/work-with-me/ must be opened');
  assert.ok(commands.some(command => command.includes('check-landing-guides.mjs')), '/privacy/ and /about/ must be opened');
  const build = steps.findIndex(step => String(step.run ?? '') === 'npm run build' && String(step.if ?? '').includes('run_maintenance'));
  assert.ok(build >= 0 && build < steps.indexOf(guarded.find(step => String(step.run ?? '') !== 'npm run build')),
    'the copy must be read from a freshly built static export');
});

test('deployment still depends on the full job and its digests', () => {
  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  for (const name of ['beta', 'production']) {
    const job = workflow.jobs[name];
    const needs = Array.isArray(job.needs) ? job.needs : [job.needs];
    assert.ok(needs.includes('verify'), `${name} must depend on the full job`);
    assert.match(String(job.if), /github\.ref == 'refs\/heads\/main'/);
    assert.match(String(job.if), /github\.event_name != 'pull_request'/);
    const serialized = JSON.stringify(job);
    assert.match(serialized, /release-\$\{\{ github\.sha \}\}/, `${name} must download the artifact only the full job uploads`);
    assert.match(serialized, /needs\.verify\.outputs\./, `${name} must verify the digest the full job produced`);
    assert.ok(!needs.includes('checkpoint'), `${name} must not depend on a scoped check`);
  }
  assert.equal(workflow.jobs.production.needs.join(','), 'verify,beta');
});

test('the full job keeps every gate it had before the split', () => {
  const workflow = parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
  const verify = JSON.stringify(workflow.jobs.verify);
  for (const gate of [
    'npm run lint', 'npm run typecheck', 'npm test', 'npm run reporting:test', 'npm run registry-host:test',
    'build-pair', 'release-csp.mjs', 'npm run check:examples', 'npm run gate', 'npm run gate:mobile',
    'npm run gate:marketing', 'npm run gate:smooth-scroll', 'run-reporting-browser.mjs',
    'tests/analytics.browser.mjs', 'npm run analytics:browser', 'release-install.mjs',
  ]) {
    assert.ok(verify.includes(gate), `the full job must still run ${gate}`);
  }
  // Run34778271915: catalogue81m41s. Previous complete run34748534759:
  // other stages13m43s. Preserve 20% shared-runner headroom without an unbounded job.
  const releaseBudgetSeconds = workflow.jobs.verify['timeout-minutes'] * 60;
  assert.ok(releaseBudgetSeconds >= (4901 + 823) * 1.2,
    'the release budget must accommodate observed complete work plus runner variation');
  assert.ok(releaseBudgetSeconds <= 120 * 60, 'the release job must remain bounded');
  assert.equal(workflow.jobs.verify.concurrency['cancel-in-progress'], "${{ github.event_name == 'pull_request' }}");
});

function publish(t, environment) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-scope-output-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const file = path.join(directory, 'outputs');
  fs.writeFileSync(file, '');
  const result = spawnSync(process.execPath, ['scripts/ci-scope.mjs'], {
    cwd: root, encoding: 'utf8', env: { ...process.env, GITHUB_OUTPUT: file, ...environment },
  });
  const lines = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
  const published = Object.fromEntries(lines.map(line => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1)]));
  return { result, lines, published };
}

test('the command publishes a complete explicit answer when it cannot resolve a diff', (t) => {
  const { result, lines, published } = publish(t, {
    CI_SCOPE_EVENT: 'pull_request',
    CI_SCOPE_BASE_REF: 'release-candidate',
    CI_SCOPE_BASE_SHA: 'not-a-commit',
    CI_SCOPE_HEAD_SHA: 'HEAD',
  });
  assert.equal(result.status, 0, result.stderr);
  // A blank scope would satisfy any `!= 'full'` condition while every suite flag
  // is false: an empty run that reports success. It must say full out loud.
  assert.equal(published.scope, 'full');
  assert.ok(published.reason.includes('not-a-commit'), published.reason);
  for (const flag of Object.keys(SUITE_FLAGS)) assert.equal(published[flag], 'false', `${flag} must be published`);
  assert.equal(lines.length, Object.keys(SUITE_FLAGS).length + 4, 'every output is published exactly once');
  assert.ok(lines.every(line => line.includes('=')), 'no published value may span lines');
});

test('the command publishes one of the two known reduced scopes when it resolves', (t) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-scope-known-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  git('init', '-q', '-b', 'release-candidate');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Test');
  fs.mkdirSync(path.join(cwd, 'docs'));
  fs.writeFileSync(path.join(cwd, 'docs/note.md'), 'base\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD').trim();
  fs.appendFileSync(path.join(cwd, 'docs/note.md'), 'more prose\n');
  git('commit', '-qam', 'prose');
  const head = git('rev-parse', 'HEAD').trim();

  assert.equal(classify(changedPaths({ base, head, cwd })).scope, 'docs');
  const { published } = publish(t, {
    CI_SCOPE_EVENT: 'push', CI_SCOPE_BASE_REF: '', CI_SCOPE_BASE_SHA: '', CI_SCOPE_HEAD_SHA: '',
  });
  assert.equal(published.scope, 'full', 'a push is release verification whatever it changed');
  assert.ok(['docs', 'checkpoint', 'full'].includes(published.scope), 'only known scopes are ever published');
});

// ---------------------------------------------------------------------------
// Release depth: how much a push to main, or a pull request into main, must run.

const depthOf = (paths, diff) => releaseDepth(paths, diff).depth;

test('release depth reduces only documentation and named tooling, and defaults to full', () => {
  assert.equal(depthOf(['docs/production/note.md', 'README.md', 'OVERHAUL-PLAN.md']), 'docs');
  assert.equal(depthOf(['docs/quality/evidence/h03-2/after-shape-menu.png']), 'docs');
  assert.equal(depthOf(['scripts/release.mjs', 'tests/release-live.test.mjs']), 'affected');
  assert.equal(depthOf(['.github/workflows/verify.yml', 'docs/note.md']), 'affected');
  // One unknown path anywhere in the change returns the whole run to full.
  assert.equal(depthOf(['docs/note.md', 'components/ui/button.tsx']), 'full');
  assert.equal(depthOf(['registry/cojeev/styles/accordion.css']), 'full');
  assert.equal(depthOf(['package.json']), 'full');
  assert.equal(depthOf(['scripts/release-config.mjs']), 'full');
  assert.equal(depthOf(['scripts/run-production-gate.mjs']), 'full', 'the catalogue runner is not exempt by path');
  assert.equal(depthOf([]), 'full', 'an empty diff proves nothing');
});

test('licence and generated root reports are never treated as prose', () => {
  // scripts/build-registry.mjs embeds LICENCE in the NOTICES.txt shipped with
  // every entry, so a licence change keeps its generator and packaging checks.
  for (const file of ['LICENCE', 'LICENSE', 'FONT-NOTICES.md', 'GATE.md', 'GATE-MOTION.md', 'GATE-INTERACTIONS.md']) {
    assert.equal(depthOf([file]), 'full', file);
  }
});

test('a path traversal or empty segment is never documentation', () => {
  for (const file of ['docs/../components/ui/button.tsx', 'docs//note.md', 'docs/./note.md']) {
    assert.equal(depthOf([file]), 'full', file);
  }
});

test('relocation-sensitive files reduce only when the diff is nothing but the relocation', () => {
  const moved = [
    '--- a/scripts/run-production-gate.mjs',
    '+++ b/scripts/run-production-gate.mjs',
    '@@ -52 +52,2 @@',
    '-fs.writeFileSync("GATE.md", lines.join("\\n"));',
    '+fs.mkdirSync("docs/gates", { recursive: true });',
    '+fs.writeFileSync("docs/gates/GATE.md", lines.join("\\n"));',
  ].join('\n');
  assert.ok(relocationOnly(moved));
  assert.equal(depthOf(['scripts/run-production-gate.mjs', 'docs/note.md'], moved), 'affected');
  assert.equal(depthOf(['app/getting-started/page.tsx'], [
    '--- a/app/getting-started/page.tsx',
    '+++ b/app/getting-started/page.tsx',
    '@@ -18 +18 @@',
    '-    <a href={`${site.sourceUrl}/blob/main/INSTALLATION.md`}>',
    '+    <a href={`${site.sourceUrl}/blob/main/docs/guides/INSTALLATION.md`}>',
  ].join('\n')), 'affected');

  // One unrelated line in the same file, and the change is a logic change again.
  const alsoLogic = `${moved}\n@@ -60 +60 @@\n-const shards = 3;\n+const shards = 1;`;
  assert.equal(relocationOnly(alsoLogic), false);
  assert.equal(depthOf(['scripts/run-production-gate.mjs'], alsoLogic), 'full');
  // A missing or empty diff proves nothing and never reduces.
  assert.equal(relocationOnly(''), false);
  assert.equal(relocationOnly(undefined), false);
  assert.equal(depthOf(['scripts/run-production-gate.mjs'], undefined), 'full');
  // The relocation allowance never spreads to a file outside the named set.
  assert.equal(depthOf(['scripts/run-production-gate.mjs', 'components/ui/button.tsx'], moved), 'full');
});

test('paths that own a bounded browser harness select it instead of the catalogue, never nothing', () => {
  const decision = releaseDepth(['scripts/check-docs.mjs', 'tests/docs-transient-timing.browser.mjs']);
  assert.equal(decision.depth, 'affected');
  assert.deepEqual(decision.suites, ['transient-timing']);
  const outputs = releaseOutputs(decision);
  assert.equal(outputs.run_catalogue, 'false');
  assert.equal(outputs.run_transient, 'true', 'browser evidence is reduced, never removed');
  assert.equal(outputs.run_checks, 'true');
  assert.equal(outputs.run_release, 'true');
});

test('release outputs are complete, explicit and fail safe for every depth', () => {
  const docs = releaseOutputs(releaseDepth(['docs/note.md']));
  assert.deepEqual(docs, {
    depth: 'docs', depth_reason: '1 changed path, all documentation',
    run_checks: 'false', run_release: 'false', run_catalogue: 'false', run_transient: 'false',
  });
  const full = releaseOutputs(releaseDepth(['components/ui/button.tsx']));
  for (const flag of ['run_checks', 'run_release', 'run_catalogue', 'run_transient']) assert.equal(full[flag], 'true', flag);
  assert.equal(full.depth, 'full');
  assert.ok(full.depth_reason.includes('components/ui/button.tsx'));
  // Every published value is a single line, so no reason can forge another output.
  for (const value of Object.values(releaseOutputs({ depth: 'full', suites: [], reason: 'a\nb\nc' }))) {
    assert.ok(!value.includes('\n'), value);
  }
});

test('only a push or a pull request can reduce a release run', () => {
  for (const event of ['workflow_dispatch', 'schedule', 'release', '']) {
    const decision = resolveReleaseDepth({ event, paths: ['docs/note.md'] });
    assert.equal(decision.depth, 'full', event);
    assert.ok(decision.reason.includes('complete release verification'));
  }
  assert.equal(resolveReleaseDepth({ event: 'push', paths: ['docs/note.md'] }).depth, 'docs');
  assert.equal(resolveReleaseDepth({ event: 'pull_request', paths: ['docs/note.md'] }).depth, 'docs');
  // A failed diff lookup is full, never an empty reduced run.
  assert.equal(resolveReleaseDepth({ event: 'push', readPaths: () => { throw new Error('no such ref'); } }).depth, 'full');
});

test('the release command reads a real diff and publishes one of the three known depths', (t) => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-release-depth-'));
  t.after(() => fs.rmSync(cwd, { recursive: true, force: true }));
  const git = (...args) => execFileSync('git', args, { cwd, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.invalid');
  git('config', 'user.name', 'Test');
  fs.mkdirSync(path.join(cwd, 'docs'));
  fs.mkdirSync(path.join(cwd, 'scripts'));
  fs.writeFileSync(path.join(cwd, 'docs/note.md'), 'base\n');
  fs.writeFileSync(path.join(cwd, 'scripts/run-production-gate.mjs'), 'fs.writeFileSync("GATE.md", text);\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  const base = git('rev-parse', 'HEAD').trim();
  fs.writeFileSync(path.join(cwd, 'scripts/run-production-gate.mjs'), 'fs.mkdirSync("docs/gates",{recursive:true});\nfs.writeFileSync("docs/gates/GATE.md", text);\n');
  fs.appendFileSync(path.join(cwd, 'docs/note.md'), 'more prose\n');
  git('commit', '-qam', 'relocate the generated report');
  const head = git('rev-parse', 'HEAD').trim();

  const paths = changedPaths({ base, head, cwd });
  assert.deepEqual(paths.sort(), ['docs/note.md', 'scripts/run-production-gate.mjs']);
  const diff = relocationDiff({ base, head, paths, cwd });
  assert.ok(diff.includes('docs/gates/GATE.md'), diff);
  assert.ok(!diff.includes('docs/note.md'), 'only relocation-sensitive files are read');
  assert.equal(releaseDepth(paths, diff).depth, 'affected');

  const { result, published } = publish(t, {
    CI_SCOPE_MODE: 'release', CI_SCOPE_EVENT: 'push',
    CI_SCOPE_BASE_SHA: 'not-a-commit', CI_SCOPE_HEAD_SHA: 'HEAD',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(published.depth, 'full', 'an unreadable range is a complete run, never a blank one');
  assert.ok(['docs', 'affected', 'full'].includes(published.depth));
  for (const flag of ['run_checks', 'run_release', 'run_catalogue', 'run_transient']) {
    assert.ok(['true', 'false'].includes(published[flag]), `${flag}=${published[flag]}`);
  }
});

// ---------------------------------------------------------------------------
// The release job's wiring: what a reduced depth may and may not switch off.

const releaseJob = () => parse(fs.readFileSync(path.join(root, '.github/workflows/verify.yml'), 'utf8'));
const stepText = step => `${step.name ?? ''} ${step.run ?? ''} ${step.uses ?? ''} ${JSON.stringify(step.with ?? '')}`;
const findStep = (job, needle) => job.steps.find(step => stepText(step).includes(needle));

test('the release job decides its own depth and exposes no secret to that decision', () => {
  const verify = releaseJob().jobs.verify;
  const depth = verify.steps.find(step => step.id === 'depth');
  assert.ok(depth, 'the release job must select its own depth');
  assert.equal(depth.run, 'node scripts/ci-scope.mjs');
  assert.equal(depth.env.CI_SCOPE_MODE, 'release');
  // Pull request and push values reach the classifier as environment variables
  // and are never interpolated into a shell command.
  assert.ok(!/secrets\./.test(JSON.stringify(depth)), 'no secret reaches the depth decision');
  assert.ok(!/\$\{\{/.test(String(depth.run)), 'no expression is interpolated into the command');
  // Unchanged: a push, a manual dispatch and any pull request into main reach
  // this job through conditions that read no output of the scope job, so a
  // classifier that fails or publishes a blank scope still runs the release job.
  assert.match(String(verify.if), /github\.event_name != 'pull_request'/);
  assert.match(String(verify.if), /github\.base_ref == 'main'/);
  assert.match(String(verify.if), /needs\.scope\.result != 'success'/);
  assert.equal(verify.needs, 'scope');
});

test('a reduced depth switches off the catalogue only, never packaging or integrity', () => {
  const verify = releaseJob().jobs.verify;
  // Browser catalogue gates: reducible.
  for (const gate of ['npm run gate', 'npm run gate:mobile', 'npm run gate:marketing', 'npm run gate:smooth-scroll',
    'run-reporting-browser.mjs', 'npm run analytics:browser', 'tests/analytics.browser.mjs']) {
    const step = findStep(verify, gate);
    assert.ok(step, gate);
    assert.match(String(step.if), /steps\.depth\.outputs\.run_catalogue == 'true'/, gate);
  }
  // Packaging, artifact integrity and consumer installation: never reducible by
  // the catalogue flag, only absent when nothing deployable changed at all.
  for (const gate of ['build-pair', 'release-csp.mjs', 'release-install.mjs']) {
    const step = findStep(verify, gate);
    assert.ok(step, gate);
    assert.match(String(step.if), /steps\.depth\.outputs\.run_release == 'true'/, gate);
    assert.ok(!/run_catalogue/.test(String(step.if)), `${gate} must not depend on the catalogue flag`);
  }
  const upload = verify.steps.find(step => JSON.stringify(step.with ?? {}).includes('release-${{ github.sha }}'));
  assert.match(String(upload.if), /steps\.depth\.outputs\.run_release == 'true'/);
});

test('paths with their own harness still run real browser evidence at a reduced depth', () => {
  const step = findStep(releaseJob().jobs.verify, 'docs-clock-isolation.browser.mjs');
  assert.ok(step, 'the bounded transient/clock harness must exist in the release job');
  assert.match(String(step.if), /run_transient == 'true'/);
  assert.match(String(step.if), /run_catalogue != 'true'/, 'the catalogue already renders these cases');
  for (const control of ['--negative', '--probe']) assert.ok(step.run.includes(control), control);
});

test('a documentation-only release run installs, builds and deploys nothing', () => {
  const workflow = releaseJob();
  const verify = workflow.jobs.verify;
  for (const gate of ['npm ci', 'npm run lint', 'npm test', 'npm run reporting:test', 'npm run registry-host:test']) {
    const step = verify.steps.find(candidate => candidate.run === gate);
    assert.ok(step, gate);
    assert.match(String(step.if), /steps\.depth\.outputs\.run_checks == 'true'/, gate);
  }
  // `npm ci` is gated on run_checks while the release build is gated on
  // run_release, so the two must never diverge: a build without dependencies
  // would fail on esbuild, and installing for a prose change wastes the runner.
  for (const paths of [['docs/note.md'], ['scripts/release.mjs'], ['components/ui/button.tsx']]) {
    const outputs = releaseOutputs(releaseDepth(paths));
    assert.equal(outputs.run_checks, outputs.run_release, paths.join(','));
  }
  const diff = verify.steps.find(step => String(step.run).includes('git diff --check'));
  assert.ok(diff, 'a documentation change still gets its diff check');
  assert.match(String(diff.if), /run_checks != 'true'/);
  for (const name of ['beta', 'production']) {
    assert.match(String(workflow.jobs[name].if), /needs\.verify\.outputs\.run_release == 'true'/, name);
  }
});
