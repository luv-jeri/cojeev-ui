import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/postcss";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import { componentSources } from "./scripts/component-sources.mjs";

const shaderPackages = ["@shadergradient/react", "@react-three/fiber", "three", "three-stdlib", "camera-controls"];
const root = fileURLToPath(new URL("./", import.meta.url));
const repository = fileURLToPath(new URL("../../", import.meta.url));
const launch = JSON.parse(readFileSync(new URL("./public/launch.json", import.meta.url), "utf8"));
const launchField = launch.launchAt === undefined ? "startedAt" : "launchAt";
if (launch[launchField] !== null && (typeof launch[launchField] !== "string" || !/T.*Z$/.test(launch[launchField]) || !Number.isFinite(Date.parse(launch[launchField])))) {
  throw new Error(`launch.json ${launchField} must be null or a valid UTC ISO date.`);
}

export default defineConfig({
  root,
  plugins: [componentSources(root,repository)],
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": repository, ...Object.fromEntries(shaderPackages.map(name=>[name,fileURLToPath(import.meta.resolve(name))])) }, dedupe: ["react", "react-dom", "three"] },
  css: { postcss: { plugins: [tailwindcss()] } },
  server: { fs: { allow: [repository] } },
  build: { outDir: "dist", emptyOutDir: true, rollupOptions: { input: { main: root + "index.html", resident: root + "resident.html", mind: root + "mind.html" } } },
});
