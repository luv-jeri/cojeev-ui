import type { ProxyOptions } from "vite";

// /api/* -> ${api}/v1/admin/*. The token and the allowed Origin are added here, on the Node side only.
export function triageProxy(cfg: { api: string; token: string }): Record<string, ProxyOptions> {
  return {
    // Anchored: a bare "/api" would also swallow the module request for /api.ts.
    "^/api/": {
      target: cfg.api,
      changeOrigin: true,
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
