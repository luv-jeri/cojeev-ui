import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/postcss";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const shaderPackages = ["@shadergradient/react", "@react-three/fiber", "three", "three-stdlib", "camera-controls"];
const root = fileURLToPath(new URL("./", import.meta.url));
const repository = fileURLToPath(new URL("../../", import.meta.url));
const launch = JSON.parse(readFileSync(new URL("./public/launch.json", import.meta.url), "utf8"));
if (launch.startedAt !== null && (!/T.*Z$/.test(launch.startedAt) || !Number.isFinite(Date.parse(launch.startedAt)))) {
  throw new Error("launch.json startedAt must be null or a valid UTC ISO date.");
}

export default defineConfig({
  root,
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": repository, ...Object.fromEntries(shaderPackages.map(name=>[name,fileURLToPath(import.meta.resolve(name))])) }, dedupe: ["react", "react-dom", "three"] },
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { fs: { allow: [repository] } },
  build: { outDir: "dist", emptyOutDir: true, rollupOptions: { input: { main: root + "index.html", bond: root + "bond.html", resident: root + "resident.html", mind: root + "mind.html" } } },
});
