import {noindexPath, securityHeaders} from './headers.mjs';
import {decide, LEGACY_HOST} from './routing.mjs';

/** @type {import('@cloudflare/workers-types').ExportedHandler<RegistryHostEnv>} */
const host = {
  async fetch(request, env) {
    const url = new URL(request.url);
    const decision = decide(url, request.method, env);
    // The homepage owns every apex path outside /ui, including its methods and headers.
    if (decision.kind === 'delegate' && env.COJEEV_HOMEPAGE) return env.COJEEV_HOMEPAGE.fetch(request);

    let response;
    switch (decision.kind) {
      case 'delegate':
        response = new Response('Homepage unavailable', {status: 502});
        break;
      case 'not-found':
        response = new Response('Not found', {status: 404});
        break;
      case 'method-not-allowed':
        response = new Response('Method not allowed', {status: 405, headers: {allow: 'GET, HEAD'}});
        break;
      case 'redirect':
        response = new Response(null, {status: 301, headers: {location: decision.location}});
        break;
      case 'health':
        response = Response.json({
          status: 'ok',
          environment: env.ENVIRONMENT ?? 'unconfigured',
          release: env.RELEASE ?? 'unconfigured',
          deploymentId: env.DEPLOYMENT_ID ?? 'unconfigured',
          phase: env.PHASE ?? 'unconfigured',
          migrationStage: env.MIGRATION_STAGE ?? 'unconfigured',
          registryGraph: env.REGISTRY_GRAPH ?? 'unconfigured',
        });
        break;
      case 'asset':
        response = await env.ASSETS.fetch(request);
        break;
    }
    const canonicalHost = env.ENVIRONMENT === 'beta' ? LEGACY_HOST.beta : 'cojeev.com';
    const logical = decision.kind === 'asset' ? decision.logical
      : url.hostname === canonicalHost && url.pathname.startsWith('/ui/') ? url.pathname.slice(3) : url.pathname;
    const secured = new Response(response.body,response);
    for (const [name,value] of Object.entries(securityHeaders(env.ENVIRONMENT))) secured.headers.set(name,value);
    if(env.ENVIRONMENT === 'beta' || noindexPath(logical)) secured.headers.set('x-robots-tag','noindex, nofollow, noarchive');
    if(decision.kind === 'redirect' || logical === '/health' || logical === '/release.json') secured.headers.set('cache-control','no-store');
    else if((response.headers.get('content-type') ?? '').includes('text/html')) secured.headers.set('cache-control','public, max-age=0, must-revalidate');
    if (request.method !== "GET" || decision.kind !== 'asset' || !decision.registryName || !env.REGISTRY_METRICS) return secured;

    const name = decision.registryName;
    const kind = name === "registry" ? "index" : name === "cojeev" ? "foundation" : "item";
    const success = response.status === 200 && /^application\/json(?:;|$)/i.test(response.headers.get("content-type") ?? "");
    // Probe labels are a measurement convention, not authentication or bot detection.
    const audience = request.headers.get("x-cojeev-probe") === "1" ? "probe" : "unclassified";
    try {
      env.REGISTRY_METRICS.writeDataPoint({
        indexes: [name],
        blobs: [name, kind, audience, success ? "success" : "error", decision.mount],
        doubles: [response.status],
      });
    } catch {
      console.warn(JSON.stringify({ event: "registry_metrics_unavailable" }));
    }
    return secured;
  },
};

export default host;
