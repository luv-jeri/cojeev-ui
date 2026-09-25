/**
 * Shared helpers for scripts/ticket/*. One implementation of the guards and the
 * source-hash rule, so a ticket's "starting snapshot" always means the same thing.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

export const ROOT = process.cwd();
export const GATE_PORT = 4317;
export const HANDOFF_TOKENS = "reference/cojeev-handoff-v4/tokens/tokens.css";
export const CANDIDATE_TOKENS = "registry/cojeev/styles/tokens.css";

/**
 * `raw: true` skips trimming — required for `git status --porcelain`, whose first line
 * legitimately begins with a space (e.g. ` M .gitignore`). Trimming the whole output eats
 * that space and shifts the status column, which silently mis-parses one path per call.
 */
export function sh(cmd, cmdArgs, opts = {}) {
  const { raw = false, ...rest } = opts;
  try {
    const out = execFileSync(cmd, cmdArgs, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      maxBuffer: 64 * 1024 * 1024,
      ...rest,
    });
    return raw ? out : out.trim();
  } catch {
    return null;
  }
}

export function sha256(input) {
  return createHash("sha256").update(input).digest("hex");
}

export function shortHash(input) {
  return sha256(input).slice(0, 16);
}

export function readJson(rel) {
  const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  return JSON.parse(fs.readFileSync(abs, "utf8"));
}

/**
 * The tree hash a ticket quotes as its starting point: HEAD plus the exact dirty
 * diff. Two trees with the same sourceHash are the same tree for evidence purposes.
 */
export function gitState() {
  const head = sh("git", ["rev-parse", "HEAD"]) ?? "";
  const porcelain = sh("git", ["status", "--porcelain"], { raw: true }) ?? "";
  const diff = sh("git", ["diff"]) ?? "";
  const staged = sh("git", ["diff", "--cached"]) ?? "";
  const lines = porcelain.split("\n").filter(Boolean);
  // Porcelain v1 is exactly `<XY> <PATH>`: two status columns, one space, then the path.
  const pathOf = (line) => line.slice(3);
  return {
    branch: sh("git", ["branch", "--show-current"]),
    head,
    headShort: sh("git", ["rev-parse", "--short", "HEAD"]),
    headDate: sh("git", ["log", "-1", "--format=%ad", "--date=short"]),
    dirtyFiles: lines
      .filter((l) => !l.startsWith("??"))
      .map((l) => ({ status: l.slice(0, 2).trim() || "?", file: pathOf(l) })),
    untracked: lines.filter((l) => l.startsWith("??")).map(pathOf),
    diffHash: shortHash(diff + staged),
    sourceHash: shortHash(`${head}\n${diff}\n${staged}\n${porcelain}`),
  };
}

export function sourceHash() {
  return gitState().sourceHash;
}

/** A live gate run owns the port and the catalogue; nothing else may render while it does. */
export function gateActivity() {
  const holders = (sh("lsof", ["-nP", `-i:${GATE_PORT}`, "-t"]) ?? "").split("\n").filter(Boolean);
  const ps = sh("ps", ["-eo", "pid,etime,command"]) ?? "";
  const gateProcs = ps
    .split("\n")
    .filter((l) => l.includes("apps/gate/run.mjs"))
    .map((l) => l.trim());
  const staleServers = ps
    .split("\n")
    .filter((l) => l.includes("next-server") || l.includes("next dev"))
    .map((l) => l.trim());
  return {
    gatePort: GATE_PORT,
    portBusy: holders.length > 0,
    portHolderPids: holders,
    runningGateProcesses: gateProcs,
    gateRunning: gateProcs.length > 0,
    /** Busy port or a live gate means no ticket may start. */
    safeToStartTicket: holders.length === 0 && gateProcs.length === 0,
    /** Idle dev servers hold memory and ports; two ~1.5-day-old ones were present at baseline. */
    nextServerProcesses: staleServers,
    nextServerCount: staleServers.length,
  };
}

/** Parse `--custom-prop: value;` declarations, keeping the LAST declaration per name. */
export function parseCustomProps(relOrAbs) {
  const abs = path.isAbsolute(relOrAbs) ? relOrAbs : path.join(ROOT, relOrAbs);
  const map = new Map();
  if (!fs.existsSync(abs)) return map;
  const text = fs.readFileSync(abs, "utf8");
  const re = /(--[a-zA-Z0-9-]+)\s*:\s*([^;}]+)/g;
  let m;
  while ((m = re.exec(text))) {
    map.set(m[1], m[2].replace(/\/\*[^*]*\*\//g, "").trim());
  }
  return map;
}

/** Compare the candidate token file against the supplied handoff. */
export function tokenDivergence() {
  const ref = parseCustomProps(HANDOFF_TOKENS);
  const cand = parseCustomProps(CANDIDATE_TOKENS);
  const differing = [...ref.keys()]
    .filter((k) => cand.has(k) && ref.get(k) !== cand.get(k))
    .map((k) => ({ token: k, handoff: ref.get(k), candidate: cand.get(k) }));
  return {
    handoffTokens: ref.size,
    candidateTokens: cand.size,
    missingFromCandidate: [...ref.keys()].filter((k) => !cand.has(k)),
    differing,
    candidateOnly: [...cand.keys()].filter((k) => !ref.has(k)),
    paletteReconciled: !differing.some((d) => d.token.startsWith("--v-")),
  };
}

export function hashFile(rel) {
  const abs = path.isAbsolute(rel) ? rel : path.join(ROOT, rel);
  return fs.existsSync(abs) ? shortHash(fs.readFileSync(abs)) : null;
}
