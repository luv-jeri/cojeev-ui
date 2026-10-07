import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {test} from 'node:test';
import {componentGate} from '../scripts/deployed-component-gate.mjs';

const token = 'synthetic-test-token';
const contact = 'gate@example.com';
const reportId = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const targets = {
  beta: {api: 'https://feedback-beta.cojeev.com', legacy: 'https://beta.000h.cojeev.com', canonical: 'https://beta.000h.cojeev.com/ui', origin: 'https://beta.000h.cojeev.com'},
  production: {api: 'https://feedback.cojeev.com', legacy: 'https://000h.cojeev.com', canonical: 'https://cojeev.com/ui', origin: 'https://cojeev.com'},
};

// Only the HTTP boundary is replaced. State changes and captured requests expose
// skipped checks, unsafe mutations, wrong origins and missing cleanup in the gate.
function fixture(environment = 'production', options = {}) {
  const target = targets[environment];
  const base = options.phase === 'prepared' ? target.legacy : target.canonical;
  const report = {id: reportId, topic_id: reportId, email: contact, issue_number: null,
    status: 'planned', component_url: null, ...options.report};
  const calls = [];
  let reads = 0;
  const fetcher = async (url, init = {}) => {
    const method = init.method ?? 'GET';
    const body = init.body ? JSON.parse(init.body) : undefined;
    calls.push({url, method, headers: new Headers(init.headers), body, redirect: init.redirect});
    if (url === `${target.api}/v1/config`) return Response.json({local: options.local ?? false});
    if (url === `${target.api}/health`) return Response.json({environment, phase: options.phase ?? 'linked', reportingBase: options.reportingBase ?? base});
    assert.equal(url, `${target.api}/v1/admin/reports/${reportId}`);
    if (method === 'GET') {
      reads++;
      const visible = {...report};
      if (options.badStoredURL && visible.status === 'resolved') visible.component_url = `${target.legacy}/docs/button/`;
      if (options.badFinal && reads === 6) visible.status = 'resolved';
      return Response.json({report: visible, attachments: [], deliveries: [], shared: false});
    }
    assert.equal(method, 'PATCH');
    if (body.status !== 'resolved') {
      if (options.resetStatus) return Response.json({error: 'private reset error'}, {status: options.resetStatus});
      report.status = body.status;
      report.component_url = null;
      return Response.json({ok: true});
    }
    if (body.componentUrl === `${target.legacy}/docs/button/`) {
      if (options.throwSuccess) throw new Error(`${contact} ${token} private response`);
      if (options.successStatus) return Response.json({error: 'private error'}, {status: options.successStatus});
      report.status = 'resolved';
      report.component_url = `${base}/docs/button/`;
      return Response.json({ok: true});
    }
    const failurePaths = ['/docs/__cojeev_gate_missing__/', '/docs/button', '/docs/button/index.txt'];
    const selectedFailure = options.failureAt === undefined || body.componentUrl === `${base}${failurePaths[options.failureAt]}`;
    if (selectedFailure && options.mutateFailure) report.status = 'resolved';
    if (selectedFailure && options.mutateFailureURL) report.component_url = `${base}/docs/private/`;
    return Response.json({error: 'private validation error'}, {status: selectedFailure ? options.failureStatus ?? 422 : 422});
  };
  return {fetcher, calls, report, base, target};
}

const run = (environment, f) => componentGate(environment, {token, reportId, contact, fetcher: f.fetcher});
const patches = f => f.calls.filter(call => call.method === 'PATCH');

test('deployed_component_head_uses_same_environment_binding', async t => {
  for (const environment of ['beta', 'production']) for (const phase of ['prepared', 'linked']) {
    await t.test(`${environment} ${phase}: ordered lifecycle and authenticated reset`, async () => {
      const f = fixture(environment, {phase});
      assert.deepEqual(await run(environment, f), {problems: []});
      const detail = `${f.target.api}/v1/admin/reports/${reportId}`;
      assert.deepEqual(f.calls.map(({method, url}) => [method, url]), [
        ['GET', `${f.target.api}/v1/config`], ['GET', `${f.target.api}/health`], ['GET', detail],
        ['PATCH', detail], ['GET', detail], ['PATCH', detail], ['GET', detail],
        ['PATCH', detail], ['GET', detail], ['PATCH', detail], ['GET', detail],
        ['PATCH', detail], ['GET', detail],
      ]);
      assert.deepEqual(patches(f).map(call => call.body), [
        {status: 'resolved', componentUrl: `${f.base}/docs/__cojeev_gate_missing__/`},
        {status: 'resolved', componentUrl: `${f.base}/docs/button`},
        {status: 'resolved', componentUrl: `${f.base}/docs/button/index.txt`},
        {status: 'resolved', componentUrl: `${f.target.legacy}/docs/button/`},
        {status: 'planned'},
      ]);
      for (const call of f.calls.slice(2)) {
        assert.equal(call.headers.get('Authorization'), `Bearer ${token}`);
        assert.equal(call.headers.get('Origin'), call.method === 'GET' ? null : f.target.origin);
        assert.equal(call.redirect, 'error');
        if (call.method === 'PATCH') assert.equal(call.headers.get('Content-Type'), 'application/json');
      }
      assert.equal(f.report.status, 'planned');
      assert.equal(f.report.component_url, null);
    });
  }
  await t.test('local mode is refused before health or mutation', async () => {
    const f = fixture('production', {local: true});
    assert.deepEqual(await run('production', f), {problems: ['local-mode']});
    assert.equal(f.calls.length, 1);
    assert.equal(patches(f).length, 0);
  });
  await t.test('all non-resolved snapshot statuses are restored', async () => {
    for (const status of ['received', 'in_progress', 'declined']) {
      const f = fixture('production', {report: {status}});
      assert.deepEqual(await run('production', f), {problems: []});
      assert.deepEqual(patches(f).at(-1).body, {status});
      assert.equal(f.report.status, status);
    }
  });
  await t.test('loopback API is refused without any request', async () => {
    for (const api of ['http://localhost:8787', 'http://127.0.0.1:8787', 'http://[::1]:8787', 'http://127.0.0.2:8787']) {
      const f = fixture();
      assert.deepEqual(await run({environment: 'production', api}, f), {problems: ['loopback-api']});
      assert.equal(f.calls.length, 0);
    }
  });
  await t.test('health must match the environment and phase prefix', async () => {
    for (const options of [{reportingBase: targets.beta.canonical}, {phase: 'prepared', reportingBase: targets.production.canonical}, {phase: 'unknown'}]) {
      const f = fixture('production', options);
      assert.deepEqual(await run('production', f), {problems: ['reporting-base']});
      assert.equal(f.calls.length, 2);
    }
  });
  await t.test('every failure input must reject and preserve both snapshot fields', async () => {
    for (const failureAt of [0, 1, 2]) for (const [options, code] of [
      [{failureStatus: 200}, 'failure-not-rejected'],
      [{mutateFailure: true}, 'failure-state-changed'],
      [{mutateFailureURL: true}, 'failure-state-changed'],
    ]) {
      const f = fixture('production', {failureAt, ...options});
      const {problems} = await run('production', f);
      assert.ok(problems.includes(code));
      assert.equal(patches(f).length, failureAt + 2);
      assert.deepEqual(patches(f).at(-1).body, {status: 'planned'});
      assert.equal(f.report.status, 'planned');
      assert.equal(f.report.component_url, null);
    }
  });
  for (const [options, code] of [
    [{failureStatus: 200}, 'failure-not-rejected'],
    [{failureStatus: 403}, 'failure-not-rejected'],
    [{mutateFailure: true}, 'failure-state-changed'],
    [{successStatus: 422}, 'success-not-accepted'],
    [{throwSuccess: true}, 'component-request-failed'],
    [{badStoredURL: true}, 'stored-component-url'],
    [{resetStatus: 422}, 'reset-not-accepted'],
    [{badFinal: true}, 'reset-state'],
  ]) await t.test(`failure is reported and reset attempted: ${code}`, async () => {
    const f = fixture('production', options);
    const {problems} = await run('production', f);
    assert.ok(problems.includes(code), problems.join('\n'));
    assert.deepEqual(patches(f).at(-1).body, {status: 'planned'});
    assert.equal(f.calls.at(-1).method, 'GET');
    assert.ok(problems.every(problem => /^[a-z]+(?:-[a-z]+)*$/.test(problem)));
  });
  await t.test('CLI prints only a success line or safe codes and sets its exit status', () => {
    // A child-process preload replaces fetch without adding a test-only CLI flag.
    for (const mode of ['ok', 'unsafe', 'throw']) {
      const preload = `
        let report = {id:process.env.COMPONENT_GATE_REPORT_ID,topic_id:process.env.COMPONENT_GATE_REPORT_ID,email:process.env.COMPONENT_GATE_CONTACT,issue_number:null,status:'planned',component_url:null};
        globalThis.fetch = async (url, init = {}) => {
          if (${JSON.stringify(mode)} === 'throw') throw new Error(process.env.ADMIN_TOKEN + process.env.COMPONENT_GATE_CONTACT);
          if (url.endsWith('/v1/config')) return Response.json({local:false});
          if (url.endsWith('/health')) return Response.json({environment:'beta',phase:'linked',reportingBase:'https://beta.000h.cojeev.com/ui'});
          if (${JSON.stringify(mode)} === 'unsafe') report.issue_number = 12345;
          if (init.method === 'PATCH') {
            const body = JSON.parse(init.body);
            if (body.componentUrl && body.componentUrl !== 'https://beta.000h.cojeev.com/docs/button/') return new Response(null,{status:422});
            report.status = body.status;
            report.component_url = body.status === 'resolved' ? 'https://beta.000h.cojeev.com/ui/docs/button/' : null;
            return Response.json({ok:true});
          }
          return Response.json({report,attachments:[],deliveries:[],shared:false});
        };`;
      const child = spawnSync(process.execPath, ['--import', `data:text/javascript,${encodeURIComponent(preload)}`, 'scripts/deployed-component-gate.mjs', 'beta'], {
        encoding: 'utf8', env: {...process.env, ADMIN_TOKEN: token, COMPONENT_GATE_REPORT_ID: reportId, COMPONENT_GATE_CONTACT: contact},
      });
      assert.equal(child.stderr, '');
      assert.equal(child.status, mode === 'ok' ? 0 : 1);
      assert.equal(child.stdout, mode === 'ok' ? 'component-head ok\n' : mode === 'unsafe' ? 'gate-report-not-synthetic\n' : 'component-request-failed\n');
    }
  });
});

test('deployed_gate_refuses_non_synthetic_report', async () => {
  for (const report of [
    {email: 'someone@example.com'}, {issue_number: 12345},
    {topic_id: 'ffffffff-bbbb-4ccc-8ddd-eeeeeeeeeeee'}, {status: 'resolved'},
    {component_url: 'https://cojeev.com/ui/docs/private/'},
  ]) {
    const f = fixture('production', {report});
    const result = await run('production', f);
    assert.deepEqual(result, {problems: ['gate-report-not-synthetic']});
    for (const value of [contact, token, reportId, ...Object.values(report).filter(value => typeof value === 'string')])
      assert.ok(result.problems.every(code => !code.includes(value)));
    assert.equal(patches(f).length, 0);
  }
});
