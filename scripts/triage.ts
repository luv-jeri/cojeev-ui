import { readFileSync } from "node:fs";
import { resolveConfig } from "./triage/config";
import { judge } from "./triage/judge";
import { exitCodeFor, runTriage } from "./triage/run";

async function main() {
  const c = resolveConfig(process.argv.slice(2), process.env, p => { try { return readFileSync(p, "utf8"); } catch { return null; } });
  console.log(`Triage ${c.envName} (${c.api})${c.dryRun ? " [dry-run]" : ""} with ${c.model}`);
  const r = await runTriage({ fetch, api: c.api, token: c.token, model: c.model, dryRun: c.dryRun, log: console.log, judge: x => judge(x, c) });
  console.log(`Done: ${r.approved} approved, ${r.rejected} rejected, ${r.skipped} skipped, ${r.failed} failed.`);
  process.exitCode = exitCodeFor(r);
}
main().catch(e => { console.error((e as Error).message); process.exitCode = 1; });
