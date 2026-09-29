import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { readFileSync } from "node:fs";
import { dashboardProxy } from "./proxy";

// Local only: never built by `next build`, never deployed. TRIAGE_ENV picks production (default) or beta.
const { proxy, target } = dashboardProxy(process.env, (f) => { try { return readFileSync(f, "utf8"); } catch { return null; } }, console.warn);

export default defineConfig({
  root: path.resolve("apps/triage"),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(".") } },
  css: { postcss: { plugins: [] } },
  // Only the target's name reaches the browser, never the token or the Worker origin.
  define: { __TRIAGE_TARGET__: JSON.stringify(target) },
  server: { host: "127.0.0.1", port: 4330, strictPort: true, proxy, fs: { allow: [path.resolve(".")] } },
});
