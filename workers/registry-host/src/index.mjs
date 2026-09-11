/** @type {import('@cloudflare/workers-types').ExportedHandler<RegistryHostEnv>} */
const host = {
  async fetch(request, env) {
    // Keep the original streaming response, MIME type, and cache policy intact.
    const response = await env.ASSETS.fetch(request);
    const match = new URL(request.url).pathname.match(/^\/r\/([a-z0-9][a-z0-9-]{0,79})\.json$/);
    if (request.method !== "GET" || !match) return response;

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
    return response;
  },
};

export default host;
