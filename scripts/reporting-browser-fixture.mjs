/** Disposable local Worker for the browser journey. No account credentials or persistence. */
import { randomBytes } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { build } from 'esbuild';
import { Miniflare, convertV4MiniflareOptions } from 'miniflare';

export async function startReportingFixture(origin, port = 8787) {
  const site = new URL(origin);
  if (site.protocol !== 'http:' || !['localhost', '127.0.0.1'].includes(site.hostname)) {
    throw new Error('Reporting browser fixture requires an HTTP loopback website.');
  }
  const compiled = await build({ entryPoints: ['workers/reporting/src/index.ts'], bundle: true, write: false, format: 'esm', platform: 'browser', target: 'es2022' });
  const admin = randomBytes(32).toString('hex');
  const mf = new Miniflare(convertV4MiniflareOptions({
    host: '127.0.0.1', port, modules: true, script: compiled.outputFiles[0].text,
    compatibilityDate: '2026-09-01', d1Databases: ['DB'], r2Buckets: ['MEDIA'],
    d1Persist: false, r2Persist: false,
    // Even an accidental future delivery attempt cannot contact a provider.
    outboundService: () => new Response('External delivery disabled in browser fixture', { status: 503 }),
    bindings: {
      ALLOWED_ORIGINS: site.origin, SITE_URL: `${site.origin}/cojeev-ui`,
      LOCAL_MODE: 'true', EMAIL_ENABLED: 'false', ADMIN_TOKEN: admin,
      IP_HASH_SECRET: randomBytes(32).toString('hex'),
    },
  }));
  try {
    const api = (await mf.ready).origin;
    const db = await mf.getD1Database('DB');
    for (const name of (await readdir('workers/reporting/migrations')).filter(name => name.endsWith('.sql')).sort()) {
      await db.exec((await readFile(`workers/reporting/migrations/${name}`, 'utf8')).replace(/\n/g, ' '));
    }
    return { api, admin, close: () => mf.dispose() };
  } catch (error) { await mf.dispose(); throw error; }
}
