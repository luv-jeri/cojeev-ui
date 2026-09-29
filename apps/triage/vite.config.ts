import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Local only: never built by `next build`, never deployed. Fixture data for now.
export default defineConfig({
  root: path.resolve("apps/triage"),
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(".") } },
  css: { postcss: { plugins: [] } },
  server: { host: "127.0.0.1", port: 4330, strictPort: true, fs: { allow: [path.resolve(".")] } },
});
