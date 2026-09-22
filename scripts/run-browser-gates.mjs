/**
 * Run every tests/*.browser.mjs gate and report a per-file verdict.
 *
 * These gates need a running docs server. They are split across TWO ports and
 * THREE environment variables, which is why running them by hand is error-prone:
 *   DOCS_BASE_URL  default 127.0.0.1:4321/cojeev-ui   (44 files)
 *   POLISH_URL     default 127.0.0.1:4320/cojeev-ui   (41 files)
 *   DOCS_ORIGIN    default 127.0.0.1:4321, origin only, no path (9 files)
 * This runner sets all three to one server so the whole set runs against a single
 * build. Nothing in package.json exercises them all —
 * `npm test` runs only *.test.ts / *.test.mjs, and CI names a handful
 * individually — so this script exists to make the whole set runnable and
 * countable. Read-only: it starts no server and writes only its JSON report.
 *
 *   node scripts/run-browser-gates.mjs [--out=DIR] [--timeout=MS] [--only=substr]
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = new Map(process.argv.slice(2).map(a => { const [k, ...v] = a.split("="); return [k, v.join("=") || true]; }));
const outDir = args.get("--out") || ".work/browser-gates";
const timeout = Number(args.get("--timeout") || 120000);
const only = args.get("--only") || "";
/* Next.js refuses a second dev server in the same directory ("Another next dev
 * server is already running"), so the whole suite shares the one server the
 * landing-page agent keeps on 4320. Safe: no gate loads the /assembly chunk — only
 * 3 load the bare root route, and 2 of those are the known analytics failures. */
const PORT = process.env.GATE_PORT || "4320";
const BASE = `http://127.0.0.1:${PORT}/cojeev-ui`;
const ORIGIN = `http://127.0.0.1:${PORT}`;

const files = fs.readdirSync("tests").filter(f => f.endsWith(".browser.mjs") && f.includes(only)).sort();
fs.mkdirSync(outDir, { recursive: true });
console.log(`browser gates: ${files.length} files | base ${BASE} | origin ${ORIGIN} | timeout ${timeout}ms\n`);

const results = [];
for (const file of files) {
  const started = Date.now();
  const res = await new Promise(resolve => {
    const env = { ...process.env, POLISH_URL: BASE, DOCS_BASE_URL: BASE, DOCS_ORIGIN: ORIGIN };
    const child = spawn(process.execPath, [path.join("tests", file)], { env, stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    const timer = setTimeout(() => { child.kill("SIGKILL"); resolve({ verdict: "TIMEOUT", out }); }, timeout);
    child.stdout.on("data", d => { out += d; });
    child.stderr.on("data", d => { out += d; });
    child.on("close", code => { clearTimeout(timer); resolve({ verdict: code === 0 ? "PASS" : "FAIL", code, out }); });
    child.on("error", e => { clearTimeout(timer); resolve({ verdict: "ERROR", out: String(e) }); });
  });
  const ms = Date.now() - started;
  const record = { file, verdict: res.verdict, code: res.code ?? null, ms, output: res.out.slice(-4000) };
  results.push(record);
  fs.writeFileSync(path.join(outDir, "results.json"), JSON.stringify(results, null, 2));
  fs.writeFileSync(path.join(outDir, file + ".log"), res.out);
  const mark = res.verdict === "PASS" ? "PASS" : res.verdict;
  console.log(`${mark.padEnd(8)} ${file} (${(ms / 1000).toFixed(1)}s)`);
}

const tally = results.reduce((a, r) => (a[r.verdict] = (a[r.verdict] || 0) + 1, a), {});
console.log(`\n=== ${files.length} browser gates ===`);
for (const [k, v] of Object.entries(tally).sort()) console.log(`  ${k.padEnd(8)} ${v}`);
const failing = results.filter(r => r.verdict !== "PASS");
if (failing.length) {
  console.log("\nnot passing:");
  for (const r of failing) console.log(`  ${r.verdict.padEnd(8)} ${r.file}`);
}
process.exitCode = failing.length ? 1 : 0;
