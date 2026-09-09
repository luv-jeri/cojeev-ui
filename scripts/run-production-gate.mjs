import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const started = new Date().toISOString();
const docsOutput = process.env.COJEEV_DOCS_EVIDENCE ?? "artifacts/production-docs";
const registryHash = createHash("sha256").update(fs.readFileSync("out/r/registry.json")).digest("hex");
const runs = [
  ["documentation", ["scripts/check-docs.mjs", "--serve", `--output=${docsOutput}`]],
  ["motion", ["--import", "tsx", "scripts/check-motion.mjs", "--serve"]],
].map(([name, args]) => ({ name, status: spawnSync(process.execPath, args, { stdio: "inherit" }).status }));
const read = (file) => fs.existsSync(file) && fs.statSync(file).mtimeMs >= Date.parse(started)
  ? JSON.parse(fs.readFileSync(file, "utf8")) : null;
const docs = read(`${docsOutput}/results.json`);
const motion = read("artifacts/production-motion/results.json");
const passed = runs.every(run => run.status === 0);
const escape = (value) => String(value ?? "not run").replaceAll("|", "\\|").replaceAll("\n", " ");
const lines = [
  "# Production gate", "",
  `Result: **${passed ? "PASS" : "FAIL"}**. Started ${started}; finished ${new Date().toISOString()}.`, "",
  `Built registry SHA-256: \`${registryHash}\`.`, "",
  "Run `npm run build && npm run gate` to reproduce. This gate serves the static build. It checks default specimens at 360, 768 and 1440 pixels in both themes, documentation controls and meaningful component interactions. Copied variant/size snippets are separately compiled by `npm run check:examples`. It does not claim every state in every browser or physical-device verification.", "",
  `Documentation: ${docs?.entries.length ?? 0} entries, ${docs?.entries.reduce((n, e) => n + e.layouts.length, 0) ?? 0} layouts. Shell checks: ${docs?.chrome.filter(c => c.status === "pass").length ?? 0}/${docs?.chrome.length ?? 0}.`, "",
  "| Component | Layouts | Preview / copy | Behavior | Runtime errors |",
  "| --- | --- | --- | --- | ---: |",
  ...(docs?.entries ?? []).map(e => `| ${e.id} | ${e.layouts.filter(l => l.status === "pass").length}/${e.layouts.length} | ${escape(e.preview.status)} | ${escape(e.behavior.status)}: ${escape(e.behavior.detail)} | ${e.runtimeErrors.length} |`), "",
  `Motion presets: ${motion?.rows.filter(r => r.pass).length ?? 0}/${motion?.rows.length ?? 0}. Additional checks: ${motion?.checks.filter(c => c.pass).length ?? 0}/${motion?.checks.length ?? 0}.`, "",
  ...(motion?.rows ?? []).map(r => `- ${r.id}: ${r.pass ? "PASS" : "FAIL"}`),
  ...(motion?.checks ?? []).map(c => `- ${c.name}: ${c.pass ? "PASS" : "FAIL"}`), "",
  `Raw JSON, screenshots and frame samples are written under \`${docsOutput}/\` and \`artifacts/production-motion/\`. CI uploads both folders. Historical reference differences are recorded separately in [BASELINE-STATUS.md](BASELINE-STATUS.md).`,
];
fs.writeFileSync("GATE.md", lines.join("\n") + "\n");
if (!passed) process.exitCode = 1;
