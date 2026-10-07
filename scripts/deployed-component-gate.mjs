import {pathToFileURL} from 'node:url';
import {environmentConfig} from './release-config.mjs';

const statuses = new Set(['received', 'planned', 'in_progress', 'declined']);
const loopback = hostname => hostname === 'localhost' || hostname.endsWith('.localhost') ||
  hostname === '[::1]' || /^127\./.test(hostname);

/** Names use the fixed release configuration; a config object may supply an API
 * URL, but loopback and all non-environment endpoints fail before any request. */
export async function componentGate(environment, {token, reportId, contact, fetcher = fetch} = {}) {
  const problems = [];
  const problem = code => { if (!problems.includes(code)) problems.push(code); };
  let target, name, api;
  try {
    name = typeof environment === 'string' ? environment : environment.environment;
    target = environmentConfig(name);
    api = typeof environment === 'string' ? target.api : environment.api ?? target.api;
    if (loopback(new URL(api).hostname)) return {problems: ['loopback-api']};
    if (api !== target.api) return {problems: ['invalid-api']};
  } catch { return {problems: ['invalid-environment']}; }
  if (typeof token !== 'string' || !token.trim() || typeof contact !== 'string' || !contact.trim() ||
      typeof reportId !== 'string' || !/^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(reportId))
    return {problems: ['gate-input']};

  const request = (path, method = 'GET', body) => fetcher(`${api}${path}`, {
    method, redirect: 'error', signal: AbortSignal.timeout(15000),
    headers: path.startsWith('/v1/admin/') ? {
      Authorization: `Bearer ${token}`,
      ...(method === 'GET' ? {} : {Origin: target.origin, 'Content-Type': 'application/json'}),
    } : {},
    ...(body === undefined ? {} : {body: JSON.stringify(body)}),
  });
  const get = async path => {
    const response = await request(path);
    if (response.status !== 200) throw new Error();
    return response.json();
  };
  const detailPath = `/v1/admin/reports/${reportId}`;
  const getReport = async () => (await get(detailPath)).report;
  let snapshot;
  try {
    if ((await get('/v1/config')).local !== false) return {problems: ['local-mode']};
    const health = await get('/health');
    const reportingBase = health.phase === 'prepared' ? target.legacySite :
      health.phase === 'linked' ? target.canonicalSite : null;
    if (!reportingBase || health.environment !== name || health.reportingBase !== reportingBase)
      return {problems: ['reporting-base']};
    const report = await getReport();
    if (!report || report.id !== reportId || report.email !== contact || report.issue_number !== null ||
        report.topic_id !== report.id || !statuses.has(report.status) || report.component_url !== null)
      return {problems: ['gate-report-not-synthetic']};
    snapshot = {status: report.status, component_url: report.component_url};

    for (const suffix of ['/docs/__cojeev_gate_missing__/', '/docs/button', '/docs/button/index.txt']) {
      const response = await request(detailPath, 'PATCH', {status: 'resolved', componentUrl: `${reportingBase}${suffix}`});
      if (response.status !== 422) problem('failure-not-rejected');
      const current = await getReport();
      if (current?.status !== snapshot.status || current?.component_url !== snapshot.component_url)
        problem('failure-state-changed');
      // Stop probing after an unexpected response; cleanup still runs.
      if (problems.length) return {problems};
    }
    const response = await request(detailPath, 'PATCH', {status: 'resolved', componentUrl: `${target.legacySite}/docs/button/`});
    if (response.status !== 200) problem('success-not-accepted');
    const current = await getReport();
    if (current?.status !== 'resolved' || current?.component_url !== `${reportingBase}/docs/button/`)
      problem('stored-component-url');
  } catch { problem('component-request-failed'); }
  finally {
    if (snapshot) {
      try {
        const response = await request(detailPath, 'PATCH', {status: snapshot.status});
        if (response.status !== 200) problem('reset-not-accepted');
      } catch { problem('reset-not-accepted'); }
      // Verify separately even if reset was refused or its response was lost.
      try {
        const current = await getReport();
        if (current?.status !== snapshot.status || current?.component_url !== null) problem('reset-state');
      } catch { problem('reset-state'); }
    }
  }
  return {problems};
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = process.argv.length === 3 ? await componentGate(process.argv[2], {
    token: process.env.ADMIN_TOKEN,
    reportId: process.env.COMPONENT_GATE_REPORT_ID,
    contact: process.env.COMPONENT_GATE_CONTACT,
  }) : {problems: ['gate-input']};
  console.log(result.problems.length ? result.problems.join('\n') : 'component-head ok');
  if (result.problems.length) process.exitCode = 1;
}
