import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const phases = () => import('../scripts/release-phases.mjs');
const fixture = new URL('./fixtures/release-baseline/release-baseline.json', import.meta.url);
const script = fileURLToPath(new URL('../scripts/release-phases.mjs', import.meta.url));
const websitePhases = ['baseline', 'mounted', 'regenerated', 'redirect'];
const apiPhases = ['baseline', 'prepared', 'linked'];
const pairs = [
  {name: 'Prepared', website: 'baseline', api: 'prepared', initialOnly: true},
  {name: 'Mounted', website: 'mounted', api: 'prepared', initialOnly: true},
  {name: 'Linked', website: 'mounted', api: 'linked'},
  {name: 'Regenerated', website: 'regenerated', api: 'linked'},
  {name: 'Redirect', website: 'redirect', api: 'linked'},
];
const targetPair = 'unlisted target pair';
const baselineRollback = 'rollback to baseline is never permitted';
const apiRollback = 'post-Linked rollback must keep API linked';
const mountedRollback = 'website rollback to mounted after redirect';
const nextPromotion = 'phase change requires its listed next promotion';
const backwards = '--rollback required to move backwards';
const accept = (name, gates = []) => ({pair: pairs.find(pair => pair.name === name), gates});

test('unknown_environment_cannot_bypass_production_gates', async t => {
  const {assertTransition, recordGate} = await phases();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'release-phases-environment-'));
  t.after(() => fs.rm(dir, {recursive: true, force: true}));
  const file = path.join(dir, 'gates.jsonl');
  for (const environment of ['prod', 'Production', undefined, null, '', ' production ', 1]) {
    await t.test(`transition rejects ${JSON.stringify(environment)}`, () => {
      assert.throws(() => assertTransition({environment, live: {website: 'regenerated', api: 'linked'},
        side: 'website', target: 'redirect'}), {message: 'Promotion refused: unknown environment'});
    });
    await t.test(`record rejects ${JSON.stringify(environment)}`, async () => {
      await assert.rejects(recordGate(file, {environment, gate: 'live', website: 'website-current', api: 'api-current'}),
        /unknown environment/i);
    });
  }
  await assert.rejects(fs.readFile(file), {code: 'ENOENT'});
});

// Hand-derived from the brief: each array follows the phase order above.
// This oracle catches an extra transition, a missing transition, or a wrong refusal.
const transitions = {
  start: {
    forward: {
      website: [targetPair, targetPair, targetPair, targetPair],
      api: [targetPair, accept('Prepared'), targetPair],
    },
    rollback: {
      website: [baselineRollback, targetPair, targetPair, targetPair],
      api: [baselineRollback, nextPromotion, targetPair],
    },
  },
  Prepared: {
    forward: {
      website: [nextPromotion, accept('Mounted', ['live', 'component-head']), targetPair, targetPair],
      api: [targetPair, accept('Prepared'), targetPair],
    },
    rollback: {
      website: [baselineRollback, nextPromotion, targetPair, targetPair],
      api: [baselineRollback, accept('Prepared'), targetPair],
    },
  },
  Mounted: {
    forward: {
      website: [backwards, accept('Mounted'), targetPair, targetPair],
      api: [targetPair, accept('Mounted'), accept('Linked', ['live', 'ui-browser'])],
    },
    rollback: {
      website: [baselineRollback, accept('Mounted'), targetPair, targetPair],
      api: [baselineRollback, accept('Mounted'), nextPromotion],
    },
  },
  Linked: {
    forward: {
      website: [targetPair, accept('Linked'), accept('Regenerated', ['live', 'component-head', 'browser-report']), nextPromotion],
      api: [targetPair, backwards, accept('Linked')],
    },
    rollback: {
      website: [baselineRollback, accept('Linked'), nextPromotion, nextPromotion],
      api: [baselineRollback, apiRollback, accept('Linked')],
    },
  },
  Regenerated: {
    forward: {
      website: [targetPair, backwards, accept('Regenerated'), accept('Redirect', ['live', 'dual-install'])],
      api: [targetPair, targetPair, accept('Regenerated')],
    },
    rollback: {
      website: [baselineRollback, accept('Linked'), accept('Regenerated'), nextPromotion],
      api: [baselineRollback, apiRollback, accept('Regenerated')],
    },
  },
  Redirect: {
    forward: {
      website: [targetPair, backwards, backwards, accept('Redirect')],
      api: [targetPair, targetPair, accept('Redirect')],
    },
    rollback: {
      website: [baselineRollback, mountedRollback, accept('Regenerated'), accept('Redirect')],
      api: [baselineRollback, apiRollback, accept('Redirect')],
    },
  },
};

test('promotion_rejects_unlisted_phase_pairs_and_stale_peer', async () => {
  const {assertTransition} = await phases();
  let cases = 0;
  for (const environment of ['beta', 'production']) {
    for (const website of websitePhases) {
      for (const api of apiPhases) {
        const live = {website, api};
        const name = website === 'baseline' && api === 'baseline'
          ? 'start' : pairs.find(pair => pair.website === website && pair.api === api)?.name;
        for (const side of ['website', 'api']) {
          const targets = side === 'website' ? websitePhases : apiPhases;
          for (const [index, target] of targets.entries()) {
            for (const rollback of [false, true]) {
              for (const reachedRedirect of [false, true]) {
                const input = {environment, live, side, target, rollback, reachedRedirect};
                const label = JSON.stringify(input);
                let expected = name
                  ? transitions[name][rollback ? 'rollback' : 'forward'][side][index]
                  : 'unlisted live pair';
                if (name === 'Regenerated' && rollback && reachedRedirect && side === 'website' && target === 'mounted')
                  expected = mountedRollback;
                if (environment === 'production' && name === 'Regenerated' && !rollback && side === 'website' && target === 'redirect')
                  expected = accept('Redirect', ['live', 'dual-install', 'discovery']);
                if (typeof expected === 'string')
                  assert.throws(() => assertTransition(input), {message: `Promotion refused: ${expected}`}, label);
                else
                  assert.deepEqual(assertTransition(input), expected, label);
                cases++;
              }
            }
          }
        }
      }
    }
  }
  assert.equal(cases, 672);
  assert.throws(() => assertTransition({environment: 'beta', live: {website: 'unknown', api: 'linked'}, side: 'website', target: 'mounted'}),
    {message: 'Promotion refused: unlisted live pair'});
  assert.throws(() => assertTransition({environment: 'beta', live: {website: 'mounted', api: 'linked'}, side: 'website', target: 'unknown'}),
    {message: 'Promotion refused: unlisted target pair'});
  assert.throws(() => assertTransition({environment: 'beta', live: {website: 'regenerated', api: 'linked'}, side: 'website', target: 'mounted', rollback: true}),
    {message: 'Promotion refused: website rollback to mounted after redirect'});
});

test('deployment_guard_accepts_only_reviewed_routes_origins_bindings_and_phase_pairs', async () => {
  const {pairOf, WEBSITE_PHASES, API_PHASES, PAIRS, STEADY_PAIR, GATES} = await phases();
  assert.deepEqual(WEBSITE_PHASES, {
    mounted: {MIGRATION_STAGE: 'additive', REGISTRY_GRAPH: 'baseline'},
    regenerated: {MIGRATION_STAGE: 'additive', REGISTRY_GRAPH: 'canonical'},
    redirect: {MIGRATION_STAGE: 'redirect', REGISTRY_GRAPH: 'canonical'},
  });
  assert.deepEqual(API_PHASES, {prepared: {reportingBase: 'legacy'}, linked: {reportingBase: 'canonical'}});
  assert.deepEqual(PAIRS, pairs);
  assert.equal(STEADY_PAIR, 'Redirect');
  assert.deepEqual(GATES, ['live', 'component-head', 'ui-browser', 'browser-report', 'dual-install', 'discovery']);
  for (const website of websitePhases) {
    for (const api of apiPhases) {
      assert.deepEqual(pairOf(website, api), pairs.find(pair => pair.website === website && pair.api === api), `${website}/${api}`);
    }
  }
  assert.equal(pairOf('unknown', 'linked'), undefined);
  assert.equal(pairOf('redirect', 'unknown'), undefined);
});

test('phase_transition_table_matches_spec', async () => {
  const {assertTransition} = await phases();
  for (const environment of ['beta', 'production']) {
    const steps = [
      [{website: 'baseline', api: 'baseline'}, 'api', 'prepared', 'Prepared', []],
      [{website: 'baseline', api: 'prepared'}, 'website', 'mounted', 'Mounted', ['live', 'component-head']],
      [{website: 'mounted', api: 'prepared'}, 'api', 'linked', 'Linked', ['live', 'ui-browser']],
      [{website: 'mounted', api: 'linked'}, 'website', 'regenerated', 'Regenerated', ['live', 'component-head', 'browser-report']],
      [{website: 'regenerated', api: 'linked'}, 'website', 'redirect', 'Redirect',
        environment === 'production' ? ['live', 'dual-install', 'discovery'] : ['live', 'dual-install']],
    ];
    for (const [live, side, target, name, gates] of steps)
      assert.deepEqual(assertTransition({environment, live, side, target, rollback: false, reachedRedirect: false}), accept(name, gates));
    for (const pair of pairs) {
      for (const side of ['website', 'api']) {
        if (pair[side] === 'baseline') continue;
        assert.deepEqual(assertTransition({environment, live: {website: pair.website, api: pair.api}, side, target: pair[side]}),
          {pair, gates: []});
      }
    }
  }
});

test('gate_evidence_binds_to_the_live_pair', async t => {
  const {recordGate, assertGates} = await phases();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'release-phases-gates-'));
  t.after(() => fs.rm(dir, {recursive: true, force: true}));
  const file = path.join(dir, 'gates.jsonl');
  const live = {website: 'website-current', api: 'api-current'};
  const evidence = {environment: 'production', gate: 'live', ...live, commit: 'a'.repeat(40), runId: '1001'};
  await assert.rejects(assertGates(file, {environment: 'production', live, gates: ['live']}),
    {message: 'Missing gate evidence: live'});
  for (const mismatch of [{environment: 'beta'}, {website: 'website-stale'}, {api: 'api-stale'}]) {
    await recordGate(file, {...evidence, ...mismatch});
    await assert.rejects(assertGates(file, {environment: 'production', live, gates: ['live']}),
      {message: 'Missing gate evidence: live'});
  }
  await recordGate(file, evidence);
  await assertGates(file, {environment: 'production', live, gates: ['live']});
  await assert.rejects(assertGates(file, {environment: 'production', live, gates: ['live', 'component-head']}),
    {message: 'Missing gate evidence: component-head'});
  for (const attest of [undefined, '', '   '])
    await assert.rejects(recordGate(file, {...evidence, gate: 'browser-report', attest}), /attest/i);
  const invalidEvidenceFile = path.join(dir, 'invalid.jsonl');
  await fs.writeFile(invalidEvidenceFile, `${JSON.stringify({...evidence, gate: 'browser-report'})}\n`);
  await assert.rejects(assertGates(invalidEvidenceFile, {environment: 'production', live, gates: ['browser-report']}),
    {message: 'Missing gate evidence: browser-report'});
  await assert.rejects(recordGate(file, {...evidence, gate: 'unknown'}), /gate/i);
  await assert.rejects(assertGates(file, {environment: 'production', live, gates: ['unknown']}),
    {message: 'Missing gate evidence: unknown'});
  const attested = {...evidence, gate: 'browser-report', attest: 'Reviewed the canonical report receipt.'};
  await recordGate(file, attested);
  await assertGates(file, {environment: 'production', live, gates: ['live', 'browser-report']});
  const lines = (await fs.readFile(file, 'utf8')).trimEnd().split('\n').map(line => JSON.parse(line));
  assert.equal(lines.length, 5);
  assert.deepEqual(lines[3], evidence);
  assert.deepEqual(lines[4], attested);

  const baseline = {website: 'baseline:11111111-1111-4111-8111-111111111111', api: 'api-prepared'};
  execFileSync(process.execPath, [script, 'record-gate', file, 'beta', 'component-head', baseline.website, baseline.api],
    {env: {...process.env, GITHUB_SHA: 'b'.repeat(40), GITHUB_RUN_ID: '1002'}, encoding: 'utf8'});
  await assertGates(file, {environment: 'beta', live: baseline, gates: ['component-head']});
  const cliFile = path.join(dir, 'cli.jsonl');
  const stdout = execFileSync(process.execPath,
    [script, 'record-gate', cliFile, 'production', 'browser-report', live.website, live.api, '--attest=Keyboard report flow checked.'],
    {env: {...process.env, GITHUB_SHA: 'c'.repeat(40), GITHUB_RUN_ID: '1003'}, encoding: 'utf8'});
  assert.equal(stdout, '');
  assert.deepEqual(JSON.parse(await fs.readFile(cliFile, 'utf8')), {
    environment: 'production', gate: 'browser-report', ...live, commit: 'c'.repeat(40), runId: '1003', attest: 'Keyboard report flow checked.',
  });
});

test('gate_evidence_requires_non_empty_live_and_record_ids', async t => {
  const {recordGate, assertGates} = await phases();
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'release-phases-ids-'));
  t.after(() => fs.rm(dir, {recursive: true, force: true}));
  const file = path.join(dir, 'gates.jsonl');
  const valid = {environment: 'production', gate: 'live', website: 'website-current', api: 'api-current'};
  for (const field of ['website', 'api']) {
    for (const value of [undefined, null, '', '   ', 1]) {
      const record = {...valid, [field]: value};
      const live = {website: record.website, api: record.api};
      await t.test(`record rejects ${field} ${JSON.stringify(value)}`, async () => {
        await assert.rejects(recordGate(file, record), /non-empty.*website.*api/i);
      });
      // Bypass the writer to exercise untrusted on-disk evidence independently.
      await fs.writeFile(file, `${JSON.stringify(record)}\n`);
      await t.test(`reader rejects matching invalid ${field} ${JSON.stringify(value)}`, async () => {
        await assert.rejects(assertGates(file, {environment: 'production', live, gates: ['live']}),
          /non-empty.*website.*api/i);
        await assert.rejects(assertGates(file, {environment: 'production', live, gates: []}),
          /non-empty.*website.*api/i);
      });
      await assert.rejects(assertGates(file, {environment: 'production', live: valid, gates: ['live']}),
        {message: 'Missing gate evidence: live'});
    }
  }
  await fs.writeFile(file, '');
  await recordGate(file, valid);
  await assertGates(file, {environment: 'production', live: valid, gates: ['live']});
});

test('rollback_requires_boolean_true', async t => {
  const {assertTransition} = await phases();
  const input = {environment: 'production', live: {website: 'regenerated', api: 'linked'},
    side: 'website', reachedRedirect: false};
  for (const rollback of ['false', 'true', 1, {}, []]) {
    await t.test(`backwards rejects ${JSON.stringify(rollback)}`, () => {
      assert.throws(() => assertTransition({...input, rollback, target: 'mounted'}),
        {message: 'Promotion refused: --rollback required to move backwards'});
    });
    await t.test(`forward retains gates for ${JSON.stringify(rollback)}`, () => {
      assert.deepEqual(assertTransition({...input, rollback, target: 'redirect'}),
        accept('Redirect', ['live', 'dual-install', 'discovery']));
    });
    await t.test(`rollback constraints ignore ${JSON.stringify(rollback)}`, () => {
      assert.throws(() => assertTransition({...input, rollback, side: 'api', target: 'prepared'}),
        {message: 'Promotion refused: unlisted target pair'});
    });
  }
  assert.deepEqual(assertTransition({...input, rollback: true, target: 'mounted'}), accept('Linked'));
});

test('baseline_record_shape_is_enforced', async t => {
  const {readBaselineRecord} = await phases();
  const record = JSON.parse(await fs.readFile(fixture, 'utf8'));
  for (const environment of ['beta', 'production'])
    assert.deepEqual(await readBaselineRecord(environment, fixture), record[environment]);
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'release-phases-baseline-'));
  t.after(() => fs.rm(dir, {recursive: true, force: true}));
  const file = path.join(dir, 'record.json');
  const mutations = [
    ['beta', 'schema', value => {value.schema = 2;}],
    ['beta', 'beta.commit', value => {value.beta.commit = 'a'.repeat(39);}],
    ['production', 'production.runId', value => {value.production.runId = 'not-digits';}],
    ['beta', 'beta.websiteVersionId', value => {delete value.beta.websiteVersionId;}],
    ['production', 'production.apiVersionId', value => {value.production.apiVersionId = 'not-a-uuid';}],
    ['beta', 'beta.digest', value => {value.beta.digest = 'b'.repeat(63);}],
    ['beta', 'beta.apexProbes', value => {value.beta.apexProbes = {};}],
    ['production', 'production.apexProbes./ui-other.txt', value => {delete value.production.apexProbes['/ui-other.txt'];}],
    ['production', 'production.apexProbes./robots.txt.sha256', value => {value.production.apexProbes['/robots.txt'].sha256 = 'e'.repeat(64);}],
    ['production', 'production.apexProbes./robots.txt.robots', value => {value.production.apexProbes['/robots.txt'].robots = 'unknown';}],
    ['production', 'production.apexProbes./.status', value => {value.production.apexProbes['/'].status = '200';}],
    ['production', 'production.apexProbes./.contentType', value => {value.production.apexProbes['/'].contentType = null;}],
    ['production', 'production.apexProbes./.sha256', value => {value.production.apexProbes['/'].sha256 = 'not-a-hash';}],
    ['production', 'production.apexProbes', value => {delete value.production.apexProbes;}],
    ['beta', 'beta', value => {delete value.beta;}],
  ];
  for (const [environment, field, mutate] of mutations) {
    const value = structuredClone(record);
    mutate(value);
    await fs.writeFile(file, JSON.stringify(value));
    await assert.rejects(readBaselineRecord(environment, file), {message: `Invalid baseline record: ${field}`}, field);
  }
  const absentRobots = structuredClone(record);
  absentRobots.production.apexProbes['/robots.txt'] = {status: 404, contentType: 'text/html', robots: 'absent'};
  absentRobots.production.apexProbes['/'].status = 503;
  await fs.writeFile(file, JSON.stringify(absentRobots));
  assert.deepEqual(await readBaselineRecord('production', file), absentRobots.production);
  await fs.writeFile(file, JSON.stringify({...record, schema: '1'}));
  await assert.rejects(readBaselineRecord('beta', file), {message: 'Invalid baseline record: schema'});
  await assert.rejects(readBaselineRecord('unknown', fixture), {message: 'Invalid baseline record: environment'});
});
