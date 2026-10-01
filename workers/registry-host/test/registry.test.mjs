import test from "node:test";
import assert from "node:assert/strict";
import host from "../src/index.mjs";

function fixture({ status = 200, mime = "application/json", fail = false } = {}) {
  const events = [];
  return { events, env: {
    ENVIRONMENT: 'production',
    ASSETS: { fetch: async () => new Response('{"name":"button"}', { status, headers: { "content-type": mime, "cache-control": "public, max-age=60" } }) },
    REGISTRY_METRICS: { writeDataPoint: value => { if (fail) throw new Error("Unavailable"); events.push(value); } },
  } };
}

test("both initial and repeated item requests preserve the asset response and record demand", async () => {
  const { events, env } = fixture();
  for (let index = 0; index < 2; index++) {
    const response = await host.fetch(new Request("https://000h.cojeev.com/r/button.json?secret=omitted"), env);
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "public, max-age=60");
    assert.equal(await response.text(), '{"name":"button"}');
  }
  assert.equal(events.length, 2);
  assert.deepEqual(events[0].blobs, ["button", "item", "unclassified", "success", "legacy"]);
  assert.ok(!JSON.stringify(events).includes("secret"));
});

test("index, foundation, missing JSON, and health probes have separate labels", async () => {
  for (const [name, status, kind, outcome] of [["registry", 200, "index", "success"], ["cojeev", 200, "foundation", "success"], ["missing", 404, "item", "error"]]) {
    const { events, env } = fixture({ status });
    await host.fetch(new Request(`https://000h.cojeev.com/r/${name}.json`), env);
    assert.deepEqual(events[0].blobs, [name, kind, "unclassified", outcome, "legacy"]);
  }
  const { events, env } = fixture();
  await host.fetch(new Request("https://000h.cojeev.com/r/button.json", { headers: { "x-cojeev-probe": "1" } }), env);
  assert.equal(events[0].blobs[2], "probe");
});

test("HEAD, non-registry, and invalid paths never count as registry requests", async () => {
  const { events, env } = fixture();
  for (const request of [new Request("https://000h.cojeev.com/r/button.json", { method: "HEAD" }), new Request("https://000h.cojeev.com/about/"), new Request("https://000h.cojeev.com/r/nested/button.json"), new Request("https://000h.cojeev.com/r/Name.json"), new Request("https://cojeev.com/ui/r/button.json", {method: "HEAD"})]) await host.fetch(request, env);
  assert.equal(events.length, 0);
});

test("an HTML fallback is an error and telemetry failure never breaks installation", async () => {
  const wrong = fixture({ mime: "text/html" });
  await host.fetch(new Request("https://000h.cojeev.com/r/button.json"), wrong.env);
  assert.equal(wrong.events[0].blobs[3], "error");
  const failed = fixture({ fail: true });
  const response = await host.fetch(new Request("https://000h.cojeev.com/r/button.json"), failed.env);
  assert.equal(response.status, 200);
  assert.equal(await response.text(), '{"name":"button"}');
});

test('both_registry_paths_preserve_metrics_and_probe_labels', async () => {
  for (const environment of ['production', 'beta']) for (const stage of ['additive', 'redirect']) for (const [mount, hostname, path] of [
    ['legacy', environment === 'beta' ? 'beta.000h.cojeev.com' : '000h.cojeev.com', '/r/cojeev.json'],
    ['canonical', environment === 'beta' ? 'beta.000h.cojeev.com' : 'cojeev.com', '/ui/r/cojeev.json'],
  ]) for (const [status, audience, outcome] of [[200, 'probe', 'success'], [404, 'unclassified', 'error']]) {
    const {events, env} = fixture({status});
    env.ENVIRONMENT = environment;
    env.MIGRATION_STAGE = stage;
    const response = await host.fetch(new Request(`https://${hostname}${path}`, {headers: audience === 'probe' ? {'x-cojeev-probe': '1'} : {}}), env);
    assert.equal(response.status, status);
    assert.equal(response.headers.has('location'), false);
    assert.equal(await response.text(), '{"name":"button"}');
    assert.deepEqual(events, [{indexes: ['cojeev'], blobs: ['cojeev', 'foundation', audience, outcome, mount], doubles: [status]}]);
    const failed = fixture({fail: true});
    failed.env.ENVIRONMENT = environment;
    failed.env.MIGRATION_STAGE = stage;
    const recovered = await host.fetch(new Request(`https://${hostname}${path}`, {headers: {'x-cojeev-probe': '1'}}), failed.env);
    assert.equal(recovered.status, 200);
    assert.equal(await recovered.text(), '{"name":"button"}');
  }
});
