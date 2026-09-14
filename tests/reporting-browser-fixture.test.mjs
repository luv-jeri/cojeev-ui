import assert from 'node:assert/strict';
import { test } from 'node:test';
import { startReportingFixture } from '../scripts/reporting-browser-fixture.mjs';

test('browser fixture refuses a remote website before starting services', async () => {
  await assert.rejects(startReportingFixture('https://000h.cojeev.com', 0), /loopback/);
});

test('browser fixture serves the actual migrated Worker with private disposable storage', async () => {
  const fixture = await startReportingFixture('http://127.0.0.1:3100', 0);
  try {
    const config = await fetch(`${fixture.api}/v1/config`).then(response => response.json());
    assert.equal(config.local, true);
    assert.equal(config.emailEnabled, false);
    assert.equal((await fetch(`${fixture.api}/v1/admin/reports`)).status, 401);
    const response = await fetch(`${fixture.api}/v1/admin/reports`, { headers: { Authorization: `Bearer ${fixture.admin}` } });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).reports.length, 0);
  } finally { await fixture.close(); }
});
