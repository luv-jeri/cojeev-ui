import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";
import { readFileSync } from "node:fs";
import { resolveConfig } from "../../scripts/triage/config";
import { triageProxy } from "./proxy";

// Local only: never built by `next build`, never deployed. TRIAGE_ENV picks production (default) or beta.
const cfg = resolveConfig(process.env.TRIAGE_ENV ? ["--env", process.env.TRIAGE_ENV] : [], process.env, (f) => { try { return readFileSync(f, "utf8"); } catch { return null; } });

export default defineConfig({
  root: path.resolve("apps/triage"),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(".") } },
  css: { postcss: { plugins: [] } },
  server: { host: "127.0.0.1", port: 4330, strictPort: true, proxy: triageProxy(cfg), fs: { allow: [path.resolve(".")] } },
});
