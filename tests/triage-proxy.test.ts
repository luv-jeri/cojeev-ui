import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import { triageProxy } from "../apps/triage/proxy";

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
