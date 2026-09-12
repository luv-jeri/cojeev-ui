import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';
import { changedPaths, classify, resolveScope, SUITE_FLAGS } from '../scripts/ci-scope.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

// Every row is a real diff shape. The right-hand side is the whole contract:
// an unlisted path anywhere in the diff must pull the entire run to full.
const rows = [
  ['prose only', ['docs/production/2026-09-12-phase-1-ci.md'], 'docs', 'prose'],
  ['nested prose', ['docs/superpowers/plans/a.md', 'README.md', 'AGENTS.md'], 'docs', 'prose'],
  ['licence at root', ['LICENCE'], 'docs', 'prose'],
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
  ['docs behaviour details', ['scripts/docs-behaviors-details.mjs'], 'checkpoint', 'quick,transient-timing'],
  ['catalogue harness entrypoint', ['scripts/check-docs.mjs'], 'checkpoint', 'quick,transient-timing'],
  ['consumer install script', ['scripts/verify-install.mjs'], 'checkpoint', 'quick,install-consumer'],
  ['consumer install runner', ['scripts/run-install-verification.mjs'], 'checkpoint', 'quick,install-consumer'],

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
  // cancelled must stay cancelled rather than start a 90-minute release job.
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
  assert.doesNotMatch(serialized, /npm run gate\b/, 'the scoped job must not run the catalogue gate');
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
  assert.ok(guarded('run_install').includes('run-install-verification.mjs'), 'the install suite must install from a locally served registry');
  assert.doesNotMatch(guarded('run_install'), /luv-jeri\.github\.io/, 'the install suite must never verify against the live website');
  assert.ok(guarded('run_npm').includes('npm ci'), 'dependency installation is skipped for a prose-only change');
  assert.ok(!String(steps.find(step => String(step.run ?? '').includes('npm ci'))?.if ?? '').includes('run_prose'));
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
  assert.equal(workflow.jobs.verify['timeout-minutes'], 90, 'the release budget is unchanged');
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
