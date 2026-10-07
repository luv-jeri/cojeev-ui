import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import {parse} from 'yaml';
import {restore} from '../scripts/operations.mjs';

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
const workflow = file => parse(read(`.github/workflows/${file}.yml`));
const verify = workflow('verify');
const steps = verify.jobs.verify.steps;
const environments = ['beta', 'production'];
const variants = ['api_prepared', 'api_linked', 'website_mounted', 'website_regenerated', 'website_redirect'];
const outputKeys = environments.flatMap(environment => variants.flatMap(variant =>
  ['digest', 'id'].map(field => `${environment}_${variant}_${field}`)));
const releaseCondition = "steps.depth.outputs.run_release == 'true'";
const migrationCondition = "steps.launch_policy.outputs.deferred != 'true' && steps.depth.outputs.run_migration == 'true'";

test('verify_workflow_builds_variants_and_runs_migration_gates', () => {
  const references = [...read('.github/workflows/verify.yml').matchAll(/steps\.release\.outputs\.([\w]+)/g)].map(match => match[1]);
  for (const key of references) assert.ok(outputKeys.includes(key), `unknown variant output: ${key}`);
  for (const key of outputKeys) assert.equal(verify.jobs.verify.outputs[key], `\${{ steps.release.outputs.${key} }}`);
  assert.equal(verify.jobs.verify.outputs.run_release, '${{ steps.depth.outputs.run_release }}');
  assert.equal(verify.jobs.verify.outputs.run_migration, '${{ steps.depth.outputs.run_migration }}');
  for (const file of fs.readdirSync(new URL('../.github/workflows/', import.meta.url))) {
    if (/\.ya?ml$/.test(file)) assert.doesNotMatch(read(`.github/workflows/${file}`), /build-pair|release\.mjs (?:deploy|rollback)\b/, file);
  }
  const build = steps.find(step => step.id === 'release');
  assert.equal(build.run, 'node scripts/release.mjs build-variants "$GITHUB_SHA" artifacts/release');
  assert.equal(build.if, releaseCondition);
  const baseline = steps.find(step => step.name === 'Fetch the pinned baselines');
  assert.ok(baseline && steps.indexOf(baseline) < steps.indexOf(build));
  assert.equal(baseline.if, releaseCondition);
  assert.equal(baseline.env.GH_TOKEN, '${{ github.token }}');
  assert.match(baseline.run, /jq -r '\.beta\.commit, \.production\.commit'.*\| sort -u/);
  assert.match(baseline.run, /gh release download migration-baseline -p "release-\$commit\.tar\.gz" -D "\$RUNNER_TEMP\/baseline\/\$commit"/);
  assert.match(baseline.run, /tar -xzf .* -C "\$RUNNER_TEMP\/baseline\/\$commit"/);
  for (const environment of environments) {
    assert.match(baseline.run, new RegExp(`BASELINE_${environment.toUpperCase()}_DIRECTORY=\\$RUNNER_TEMP/baseline/[^\\s"]+/${environment}" >> "\\$GITHUB_ENV"`));
    for (const phase of ['mounted', 'regenerated', 'redirect']) {
      assert.ok(steps.some(step => step.run?.includes(`node scripts/release-csp.mjs ${environment} artifacts/release/${environment}/website-${phase}`)));
      const asset = steps.find(step => step.run?.includes(`node scripts/check-asset-chains.mjs artifacts/release/${environment}/website-${phase}`));
      assert.equal(asset?.if, migrationCondition);
    }
    for (const phase of ['mounted', 'regenerated']) {
      const install = steps.find(step => step.run?.includes(`node scripts/release-install.mjs ${environment} "$GITHUB_SHA" artifacts/release/${environment}/website-${phase}`));
      assert.ok(install);
      const digestKey = `${environment.toUpperCase()}_WEBSITE_${phase.toUpperCase()}_DIGEST`;
      assert.ok(install.run.includes(`"$${digestKey}"`));
      assert.equal(install.env[digestKey], `\${{ steps.release.outputs.${environment}_website_${phase}_digest }}`);
    }
    assert.equal(steps.find(step => step.run?.includes(`node scripts/redirect-browser.mjs --packaged=artifacts/release/${environment}/website-redirect`))?.if, migrationCondition);
    assert.equal(steps.find(step => step.run?.includes(`node scripts/rollback-rehearsal.mjs artifacts/release ${environment}`))?.if, migrationCondition);
  }
  const migrationSteps = steps.filter(step => step.if === migrationCondition);
  assert.equal(migrationSteps.length, 4);
  assert.equal(migrationSteps[0].run, 'npx playwright install --with-deps chromium');
  for (const step of migrationSteps) assert.doesNotMatch(step.if, /steps\.reuse/);
  const installIndex = steps.findIndex(step => step.run?.includes('release-install.mjs'));
  assert.ok(steps.indexOf(migrationSteps[0]) > installIndex);
  assert.ok(steps.indexOf(migrationSteps[0]) < steps.indexOf(migrationSteps[1]));
  assert.ok(steps.some(step => step.run === 'node scripts/check-structured-data.mjs --dir artifacts/release/production/website-regenerated/site/ui --site https://cojeev.com/ui'));
});

test('deploy_jobs_report_the_live_pair_and_never_deploy', () => {
  for (const environment of environments) {
    const job = verify.jobs[environment];
    const serialized = JSON.stringify(job);
    assert.doesNotMatch(serialized, /promote-|wrangler|release-rollback-run\.mjs|REPORTING_.*(?:SECRET|TOKEN)|CLOUDFLARE_API_TOKEN/);
    const calls = job.steps.flatMap(step => [...String(step.run ?? '').matchAll(/node scripts\/release\.mjs ([^\n]+)/g)].map(match => match[1]));
    assert.deepEqual(calls, [`live-pair ${environment}`]);
    const pair = job.steps.find(step => step.id === 'pair');
    assert.ok(pair);
    assert.ok(!pair.env || !JSON.stringify(pair.env).includes('secrets.'));
    const summary = job.steps.find(step => step.run?.includes('Live pair '));
    assert.match(summary.run, /Live pair .*\. main builds and verifies only; promote with promote\.yml\./);
    assert.match(summary.run, />> "\$GITHUB_STEP_SUMMARY"/);
    assert.equal(summary.env.PAIR, '${{ steps.pair.outputs.pair }}');
    assert.equal(job.environment.url, environment === 'beta' ? 'https://beta.000h.cojeev.com/ui/' : 'https://cojeev.com/ui/');
    assert.equal(job.concurrency.group, `deploy-${environment}`);
    assert.equal(job.concurrency['cancel-in-progress'], false);
  }
  assert.equal(verify.jobs.beta.needs, 'verify');
  assert.deepEqual(verify.jobs.production.needs, ['verify', 'beta']);
  assert.equal(verify.jobs.production.environment.name, 'production');
});

test('health_recovery_and_diagnostics_keep_existing_protections', async () => {
  const recovery = workflow('recovery');
  const restoreStep = recovery.jobs.restore.steps.find(step => step.run?.includes('operations.mjs restore'));
  assert.equal(restoreStep.run, 'node scripts/operations.mjs restore "$TARGET" "$TARGET/day-$SLOT.sql"');
  assert.doesNotMatch(JSON.stringify(recovery), /release\.mjs/);
  const healthSteps = workflow('health').jobs.health.steps.filter(step => step.run?.includes('operations-health.mjs'));
  assert.equal(healthSteps.length, 2);
  for (const step of healthSteps) assert.equal(step.env.UPDATE_ALERT, 'true');
  for (const environment of environments) {
    const failure = verify.jobs[environment].steps.find(step => step.name === 'Independent failure notification');
    assert.equal(failure.if, 'failure()');
    assert.equal(failure.env.OPERATIONS_FAILURE, 'deployment-failed');
  }
  assert.equal(recovery.jobs.restore.steps.find(step => step.if === 'failure()').env.OPERATIONS_FAILURE, 'recovery-failed');
  // Follow the workflow's restore CLI into the real restore function. The
  // external adapters supply a valid private backup; all D1 calls must use scratch.
  const sql = 'CREATE TABLE restore_probe (id INTEGER);';
  for (const environment of environments) {
    const key = `${environment}/day-0.sql`;
    const receipt = {environment, key, bytes: Buffer.byteLength(sql), sha256: createHash('sha256').update(sql).digest('hex'), createdAt: new Date().toISOString()};
    const d1Calls = [];
    await restore(environment, key, {
      cf: async route => route.endsWith('/domains/managed') ? {enabled: false} : route.endsWith('/domains/custom') ? {domains: []} :
        {rules: [{enabled: true, conditions: {prefix: ''}, deleteObjectsTransition: {condition: {type: 'Age', maxAge: 604800}}}]},
      run: args => {
        if (args[0] === 'r2') {
          fs.writeFileSync(args[args.indexOf('--file') + 1], args[3].endsWith('.json') ? JSON.stringify(receipt) : sql);
          return '';
        }
        const config = JSON.parse(fs.readFileSync(args[args.indexOf('--config') + 1], 'utf8'));
        assert.deepEqual(config.d1_databases, [{binding: 'SCRATCH', database_name: 'cojeev-ui-restore-check', database_id: '63aab6c0-4d49-4423-b3fc-c5c382290af7'}]);
        assert.equal(args[2], 'SCRATCH');
        d1Calls.push(args);
        return JSON.stringify([{results: [args.includes('PRAGMA quick_check') ? {quick_check: 'ok'} : {count: 0}]}]);
      },
    });
    assert.equal(d1Calls.length, 3);
    assert.ok(d1Calls[1].includes('--file'), 'the backup is restored only into scratch');
  }
});
