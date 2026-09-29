import type { ProxyOptions } from "vite";
import { resolveConfig } from "../../scripts/triage/config";

export const DASHBOARD_PORT = 4330;
const OWN_ORIGINS = [`http://127.0.0.1:${DASHBOARD_PORT}`, `http://localhost:${DASHBOARD_PORT}`];

// /api/* -> ${api}/v1/admin/*. The token and the allowed Origin are added here, on the Node side only.
export function triageProxy(cfg: { api: string; token: string }): Record<string, ProxyOptions> {
  return {
    // Anchored: a bare "/api" would also swallow the module request for /api.ts.
    "^/api/": {
      target: cfg.api,
      changeOrigin: true,
      // The proxy adds the token to whatever reaches it, so another website must not be able to post through it.
      bypass: (req, res) => {
        const origin = req.headers.origin;
        if (req.method === "GET" || !origin || OWN_ORIGINS.includes(origin)) return;
        if (!res) return false;
        res.statusCode = 403;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ error: "Only the triage dashboard itself may change reports." }));
        return req.url; // Vite stops here because the response has ended.
      },
      rewrite: (path) => path.replace(/^\/api/, "/v1/admin"),
      configure: (proxy) => {
        proxy.on("proxyReq", (req) => {
          req.removeHeader("authorization");
          req.setHeader("Authorization", `Bearer ${cfg.token}`);
          req.setHeader("Origin", cfg.api);
        });
      },
    },
  };
}

export type DashboardTarget = "production" | "beta" | "local" | "none";

// The dev server's view of the Worker. No token is not an error: /?fixtures still works, so warn once and serve no proxy.
export function dashboardProxy(env: NodeJS.ProcessEnv, readFile: (path: string) => string | null, warn: (line: string) => void): { proxy?: Record<string, ProxyOptions>; target: DashboardTarget } {
  let cfg;
  try {
    cfg = resolveConfig(env.TRIAGE_ENV ? ["--env", env.TRIAGE_ENV] : [], env, readFile);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (!msg.startsWith("No admin token")) throw e;
    warn(`[triage] ${msg} Until then only sample data works: open /?fixtures.`);
    return { target: "none" };
  }
  return { proxy: triageProxy(cfg), target: /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/.test(cfg.api) ? "local" : cfg.envName };
}
