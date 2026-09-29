import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Local only: never built by `next build`, never deployed. Port 4331 is strict so a screenshot run can never
// land on another checkout's server.
export default defineConfig({
  root: path.resolve("apps/reporting-mockup"),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(".") } },
  css: { postcss: { plugins: [] } },
  server: { host: "127.0.0.1", port: 4331, strictPort: true, fs: { allow: [path.resolve(".")] } },
});
