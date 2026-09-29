import type { DataSource } from "./types";

// Relative URLs only: the dev-server proxy (proxy.ts) adds the token, so the browser never sees it or the Worker origin.
const FILTER: Record<string, string> = { check: "unverified", approved: "approved", rejected: "rejected", pending: "pending" };

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try { res = await fetch(`/api${path}`, init); } catch { throw new Error("Could not reach the reporting service. Is the proxy running?"); }
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error((body as { error?: string } | null)?.error ?? `The reporting service answered ${res.status}.`);
  return body as T;
}

export const apiSource: DataSource = {
  list: (filter, offset) => call(`/reports?offset=${offset}${FILTER[filter] ? `&triage=${FILTER[filter]}` : ""}`),
  detail: (id) => call(`/reports/${encodeURIComponent(id)}`),
  verify: async (id) => { await call(`/reports/${encodeURIComponent(id)}/verify`, { method: "POST" }); },
  decide: async (id, decision) => {
    await call(`/reports/${encodeURIComponent(id)}/triage`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision, by: "owner" }) });
  },
};
