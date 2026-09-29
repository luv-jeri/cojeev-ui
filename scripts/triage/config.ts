export type TriageConfig = { envName: "production" | "beta"; api: string; token: string; model: string; dryRun: boolean; codexBin: string; timeoutMs: number };
// TRIAGE_API points the dashboard at the local Worker; only tests set it.
const APIS = { production: "https://feedback.cojeev.com", beta: "https://feedback-beta.cojeev.com" } as const;
// The API origin receives the admin token, so an override may only name this machine.
const isLocal = (url: string) => { try { const u = new URL(url); return /^https?:$/.test(u.protocol) && ["localhost", "127.0.0.1"].includes(u.hostname); } catch { return false; } };

export function resolveConfig(argv: string[], env: NodeJS.ProcessEnv, readFile: (path: string) => string | null): TriageConfig {
  let envName: string = "production", model = "gpt-5.6-sol", dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") dryRun = true;
    else if (a === "--env" || a === "--model") {
      const v = argv[++i];
      if (!v || v.startsWith("--")) throw new Error(`${a} needs a value.`);
      if (a === "--env") envName = v; else model = v;
    } else throw new Error(`Unknown option ${a}. Use --env production|beta, --model <id>, --dry-run.`);
  }
  if (envName !== "production" && envName !== "beta") throw new Error("--env must be production or beta.");
  if (env.TRIAGE_API && !isLocal(env.TRIAGE_API)) throw new Error("TRIAGE_API must be a localhost or 127.0.0.1 address: it receives the admin token. Unset it to use the real API.");
  const token = env.REPORTING_ADMIN_TOKEN?.trim() || readFile(`.work/reporting/admin-token-${envName}`)?.trim();
  if (!token) throw new Error(`No admin token. Set REPORTING_ADMIN_TOKEN or create .work/reporting/admin-token-${envName}.`);
  return { envName, api: env.TRIAGE_API || APIS[envName], token, model, dryRun, codexBin: env.TRIAGE_CODEX_BIN || "codex", timeoutMs: 120_000 };
}
