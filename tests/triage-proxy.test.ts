import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { dashboardProxy, triageProxy } from "../apps/triage/proxy";

test("proxy rewrites /api to /v1/admin and injects the bearer token and allowed Origin server-side", () => {
  const opts = triageProxy({ api: "http://localhost:8787", token: "s3cret" })["^/api/"];
  assert.equal(opts.target, "http://localhost:8787");
  const rewrite = opts.rewrite as (p: string) => string;
  assert.equal(rewrite("/api/reports?offset=0&triage=pending"), "/v1/admin/reports?offset=0&triage=pending");
  assert.equal(rewrite("/api/reports/abc/verify"), "/v1/admin/reports/abc/verify");

  const proxy = new EventEmitter();
  opts.configure!(proxy as never, opts);
  const headers = new Map<string, string>([["authorization", "Bearer browser-supplied"]]);
  const req = { removeHeader: (n: string) => headers.delete(n.toLowerCase()), setHeader: (n: string, v: string) => headers.set(n.toLowerCase(), v) };
  proxy.emit("proxyReq", req);
  assert.equal(headers.get("authorization"), "Bearer s3cret");
  assert.equal(headers.get("origin"), "http://localhost:8787");
});

test("with no admin token the dashboard serves no proxy and warns once instead of throwing", () => {
  const env = (v: Record<string, string>) => v as unknown as NodeJS.ProcessEnv;
  const warnings: string[] = [];
  const out = dashboardProxy(env({}), () => null, (line) => warnings.push(line));
  assert.equal(out.proxy, undefined);
  assert.equal(out.target, "none");
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /REPORTING_ADMIN_TOKEN.*\/\?fixtures/);
  assert.throws(() => dashboardProxy(env({ TRIAGE_ENV: "staging" }), () => null, () => {}), /--env must be production or beta/);
  const local = dashboardProxy(env({ REPORTING_ADMIN_TOKEN: "t", TRIAGE_API: "http://localhost:8787" }), () => null, () => assert.fail("no warning"));
  assert.equal(local.target, "local");
  assert.ok(local.proxy?.["^/api/"]);
  assert.equal(dashboardProxy(env({ TRIAGE_ENV: "beta" }), () => "t\n", () => {}).target, "beta");
});
