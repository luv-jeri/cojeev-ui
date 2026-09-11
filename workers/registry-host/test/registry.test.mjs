import test from "node:test";
import assert from "node:assert/strict";
import host from "../src/index.mjs";

function fixture({ status = 200, mime = "application/json", fail = false } = {}) {
  const events = [];
  return { events, env: {
    ASSETS: { fetch: async () => new Response('{"name":"button"}', { status, headers: { "content-type": mime, "cache-control": "public, max-age=60" } }) },
    REGISTRY_METRICS: { writeDataPoint: value => { if (fail) throw new Error("Unavailable"); events.push(value); } },
  } };
}

test("both initial and repeated item requests preserve the asset response and record demand", async () => {
  const { events, env } = fixture();
  for (let index = 0; index < 2; index++) {
    const response = await host.fetch(new Request("https://example.com/r/button.json?secret=omitted"), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "public, max-age=60");
    assert.equal(await response.text(), '{"name":"button"}');
  }
  assert.equal(events.length, 2);
  assert.deepEqual(events[0].blobs, ["button", "item", "unclassified", "success"]);
  assert.ok(!JSON.stringify(events).includes("secret"));
});

test("index, foundation, missing JSON, and health probes have separate labels", async () => {
  for (const [name, status, kind, outcome] of [["registry", 200, "index", "success"], ["cojeev", 200, "foundation", "success"], ["missing", 404, "item", "error"]]) {
    const { events, env } = fixture({ status });
    await host.fetch(new Request(`https://example.com/r/${name}.json`), env);
    assert.deepEqual(events[0].blobs, [name, kind, "unclassified", outcome]);
  }
  const { events, env } = fixture();
  await host.fetch(new Request("https://example.com/r/button.json", { headers: { "x-cojeev-probe": "1" } }), env);
  assert.equal(events[0].blobs[2], "probe");
});

test("HEAD, non-registry, and invalid paths never count as registry requests", async () => {
  const { events, env } = fixture();
  for (const request of [new Request("https://example.com/r/button.json", { method: "HEAD" }), new Request("https://example.com/about/"), new Request("https://example.com/r/nested/button.json"), new Request("https://example.com/r/Name.json")]) await host.fetch(request, env);
  assert.equal(events.length, 0);
});

test("an HTML fallback is an error and telemetry failure never breaks installation", async () => {
  const wrong = fixture({ mime: "text/html" });
  await host.fetch(new Request("https://example.com/r/button.json"), wrong.env);
  assert.equal(wrong.events[0].blobs[3], "error");
  const failed = fixture({ fail: true });
  const response = await host.fetch(new Request("https://example.com/r/button.json"), failed.env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '{"name":"button"}');
});
