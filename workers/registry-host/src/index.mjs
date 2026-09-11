/** @type {import('@cloudflare/workers-types').ExportedHandler<RegistryHostEnv>} */
const host = {
  async fetch(request, env) {
    const pathname = new URL(request.url).pathname;
    const response = pathname === '/health'
      ? Response.json({status:'ok',environment:env.ENVIRONMENT ?? 'unconfigured',release:env.RELEASE ?? 'unconfigured'})
      : /^\/(?:media|backups|private|v1)(?:\/|$)/.test(pathname)
        ? new Response('Not found',{status:404})
        : await env.ASSETS.fetch(request);
    const secured = new Response(response.body,response);
    secured.headers.set('x-content-type-options','nosniff');
    secured.headers.set('referrer-policy','strict-origin-when-cross-origin');
    secured.headers.set('x-frame-options','DENY');
    secured.headers.set('permissions-policy','camera=(), microphone=(), geolocation=()');
    const api=env.ENVIRONMENT === 'beta' ? 'https://feedback-beta.cojeev.com' : 'https://feedback.cojeev.com';
    secured.headers.set('content-security-policy',`default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://eu-assets.i.posthog.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ${api} https://eu.i.posthog.com https://eu-assets.i.posthog.com; frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`);
    if(env.ENVIRONMENT === 'beta' || /^\/admin(?:\/|$)/.test(pathname)) secured.headers.set('x-robots-tag','noindex, nofollow, noarchive');
    if(pathname === '/health' || pathname === '/release.json') secured.headers.set('cache-control','no-store');
    else if(response.ok && pathname.startsWith('/_next/static/')) secured.headers.set('cache-control','public, max-age=31536000, immutable');
    else if((response.headers.get('content-type') ?? '').includes('text/html')) secured.headers.set('cache-control','public, max-age=0, must-revalidate');
    const match = pathname.match(/^\/r\/([a-z0-9][a-z0-9-]{0,79})\.json$/);
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
