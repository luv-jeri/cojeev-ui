import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startReportingFixture } from '../scripts/reporting-browser-fixture.mjs';
import { componentGate } from '../scripts/deployed-component-gate.mjs';

test('browser fixture refuses a remote website before starting services', async () => {
  await assert.rejects(startReportingFixture('https://000h.cojeev.com', 0), /loopback/);
});

test('browser fixture serves the actual migrated Worker with private disposable storage', async () => {
  const fixture = await startReportingFixture('http://127.0.0.1:3100', 0);
  try {
    const config = await fetch(`${fixture.api}/v1/config`).then(response => response.json());
    assert.equal(config.local, true);
    const gateCalls = [];
    const gate = await componentGate('beta', {
      token: fixture.admin,
      reportId: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee',
      contact: 'gate@example.com',
      fetcher: (url, init) => {
        gateCalls.push({url, method: init.method ?? 'GET'});
        return fetch(`${fixture.api}${new URL(url).pathname}`, init);
      },
    });
    assert.deepEqual(gate.problems, ['local-mode']);
    assert.deepEqual(gateCalls, [{url: 'https://feedback-beta.cojeev.com/v1/config', method: 'GET'}]);
    assert.equal(config.emailEnabled, false);
    assert.equal((await fetch(`${fixture.api}/v1/admin/reports`)).status, 401);
    const response = await fetch(`${fixture.api}/v1/admin/reports`, { headers: { Authorization: `Bearer ${fixture.admin}` } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).reports.length, 0);
  } finally { await fixture.close(); }
});
