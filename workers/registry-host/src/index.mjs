import {securityHeaders} from './headers.mjs';
import {environmentConfig} from '../../../scripts/release-config.mjs';

/** @type {import('@cloudflare/workers-types').ExportedHandler<RegistryHostEnv>} */
const host = {
  async fetch(request, env) {
    const url = new URL(request.url), pathname = url.pathname;
    const localPath = pathname.replace(/^\/ui(?=\/|$)/, '') || '/';
    const health = pathname === '/health' || pathname === '/ui/health';
    // Keep the legacy root health endpoint available to CI and monitoring.
    const legacy = url.hostname === '000h.cojeev.com' && env.ENVIRONMENT !== 'beta';
    const response = pathname === '/health' || health && !legacy
      ? Response.json({status:'ok',environment:env.ENVIRONMENT ?? 'unconfigured',release:env.RELEASE ?? 'unconfigured'})
      : legacy
        ? Response.redirect(`${environmentConfig('production').site}${pathname}${url.search}`,301)
      : pathname === '/ui' || pathname === '/' && env.ENVIRONMENT === 'beta'
        ? Response.redirect(`${url.origin}/ui/${url.search}`,301)
      : /^\/(?:media|backups|private|v1)(?:\/|$)/.test(localPath)
        ? new Response('Not found',{status:404})
        : await env.ASSETS.fetch(request);
    const secured = new Response(response.body,response);
    for (const [name,value] of Object.entries(securityHeaders(env.ENVIRONMENT))) secured.headers.set(name,value);
    if(env.ENVIRONMENT === 'beta' || /^\/(?:admin|feedback-admin)(?:\/|$)/.test(localPath)) secured.headers.set('x-robots-tag','noindex, nofollow, noarchive');
    if(health || localPath === '/release.json') secured.headers.set('cache-control','no-store');
    else if((response.headers.get('content-type') ?? '').includes('text/html')) secured.headers.set('cache-control','public, max-age=0, must-revalidate');
    const match = pathname.match(/^\/ui\/r\/([a-z0-9][a-z0-9-]{0,79})\.json$/);
    if(legacy) return secured;
    if (request.method !== "GET" || !match || !env.REGISTRY_METRICS) return secured;

    const name = match[1];
    const kind = name === "registry" ? "index" : name === "cojeev" ? "foundation" : "item";
    const success = response.status === 200 && /^application\/json(?:;|$)/i.test(response.headers.get("content-type") ?? "");
    // Probe labels are a measurement convention, not authentication or bot detection.
    const audience = request.headers.get("x-cojeev-probe") === "1" ? "probe" : "unclassified";
    try {
      env.REGISTRY_METRICS.writeDataPoint({
        indexes: [name],
        blobs: [name, kind, audience, success ? "success" : "error"],
        doubles: [response.status],
      });
    } catch {
      console.warn(JSON.stringify({ event: "registry_metrics_unavailable" }));
    }
    return secured;
  },
};

export default host;
