import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { materializeVariant } from "../scripts/asset-router-harness.mjs";

function run(args, env = {}) {
  return new Promise((resolve, reject) => {
    const childEnv = { ...process.env, ...env };
    delete childEnv.NODE_TEST_CONTEXT;
    const child = spawn(process.execPath, args, { env: childEnv, stdio: ["ignore", "pipe", "pipe"] });
    let output = "";
    child.stdout.on("data", data => { output += data; });
    child.stderr.on("data", data => { output += data; });
    const timer = setTimeout(() => child.kill("SIGKILL"), 120000);
    child.on("error", reject);
    child.on("close", code => { clearTimeout(timer); resolve({ code, output }); });
  });
}

async function packaged(t, environment, fault) {
  let entry;
  if (fault) {
    const scratch = await mkdtemp(join(tmpdir(), "cojeev-redirect-fault-"));
    t.after(() => rm(scratch, { recursive: true, force: true }));
    entry = join(scratch, "entry.mjs");
    const worker = new URL("../workers/registry-host/src/index.mjs", import.meta.url).pathname;
    const faults = {
      query: `if (url.hostname === '000h.cojeev.com' && url.search) return new Response(null, {status: 301, headers: {location: 'https://cojeev.com/ui' + url.pathname}});`,
      prefix: `if (url.pathname === '/ui/docs/button/') return new Response(null, {status: 301, headers: {location: '/ui' + url.pathname + url.search}});`,
      encoding: `if (url.hostname === '000h.cojeev.com' && url.pathname === '/docs/%62utton/') return new Response(null, {status: 301, headers: {location: 'https://cojeev.com/ui/docs/button/'}});`,
      status: `if (url.hostname === '000h.cojeev.com' && url.pathname === '/docs/%62utton/') return new Response(null, {status: 307, headers: {location: 'https://cojeev.com/ui/docs/%62utton/'}});`,
      heading: `if (url.pathname === '/ui/docs/button/' && !url.search) return new Response('<h1>Docs</h1>', {headers: {'content-type': 'text/html'}});`,
      reload: `if (url.pathname === '/ui/docs/button/' && !url.search && ++buttonLoads > 1) return new Response('<h1>Button</h1>', {status: 503, headers: {'content-type': 'text/html'}});`,
    };
    await writeFile(entry, `import worker from ${JSON.stringify(worker)};
let buttonLoads = 0;
export default {async fetch(request, env, ctx) {
  const url = new URL(request.url);
  ${faults[fault]}
  return worker.fetch(request, env, ctx);
}};`);
  }
  const fixture = new URL(`../workers/registry-host/test/fixtures/browser-variants/${environment}/`, import.meta.url).pathname;
  const directory = await materializeVariant(fixture, entry ? { entry } : {});
  t.after(() => rm(directory, { recursive: true, force: true }));
  return run(["scripts/redirect-browser.mjs", `--packaged=${directory}`]);
}

test("tracking_fragment_survives_legacy_redirect", async t => {
  const good = await packaged(t, "production");
  assert.equal(good.code, 0, good.output);
  assert.equal(good.output.match(/^PASS tracking_fragment_survives_legacy_redirect$/gm)?.length, 2, good.output);
  assert.equal(good.output.match(/^PASS no_second_ui_prefix$/gm)?.length, 3, good.output);
  const bad = await packaged(t, "production", "query");
  assert.equal(bad.code, 1, bad.output);
  assert.match(bad.output, /^FAIL tracking_fragment_survives_legacy_redirect \/ui\/docs\/button\/$/m);
});

test("legacy_encoded_path_301_keeps_encoding", async t => {
  const good = await packaged(t, "production");
  assert.equal(good.code, 0, good.output);
  assert.match(good.output, /^PASS legacy_encoded_path_301_keeps_encoding$/m);
  for (const fault of ["encoding", "status"]) {
    const bad = await packaged(t, "production", fault);
    assert.equal(bad.code, 1, bad.output);
    assert.match(bad.output, /^FAIL legacy_encoded_path_301_keeps_encoding \/docs\/%62utton\/$/m);
    // The final Button page is healthy: only the first hop violates the ruling.
    assert.match(bad.output, /^PASS encoded_path_lands_beneath_ui$/m);
  }
});

test("encoded_path_lands_beneath_ui", async t => {
  const good = await packaged(t, "production");
  assert.equal(good.code, 0, good.output);
  assert.match(good.output, /^PASS encoded_path_lands_beneath_ui$/m);
  for (const fault of ["heading", "reload"]) {
    const bad = await packaged(t, "production", fault);
    assert.equal(bad.code, 1, bad.output);
    assert.match(bad.output, /^PASS legacy_encoded_path_301_keeps_encoding$/m);
    assert.match(bad.output, /^FAIL encoded_path_lands_beneath_ui \/ui\/docs\/button\/$/m);
  }
});

test("beta_tracking_fragment_survives_same_host_redirect_in_browser", async t => {
  const result = await packaged(t, "beta");
  assert.equal(result.code, 0, result.output);
  assert.match(result.output, /^PASS beta_tracking_fragment_survives_same_host_redirect_in_browser$/m);
});

test("beta_queued_admin_query_and_component_links_survive_cutover", async t => {
  const good = await packaged(t, "beta");
  assert.equal(good.code, 0, good.output);
  assert.equal(good.output.match(/^PASS beta_queued_admin_query_and_component_links_survive_cutover$/gm)?.length, 4, good.output);
  assert.equal(good.output.match(/^PASS no_second_ui_prefix$/gm)?.length, 5, good.output);
  const bad = await packaged(t, "beta", "prefix");
  assert.equal(bad.code, 1, bad.output);
  assert.match(bad.output, /^FAIL no_second_ui_prefix \/ui\/ui\/docs\/button\/$/m);
});

test("ui_live_search_reload_and_console_are_clean", async t => {
  // Exercise the browser gate as a subprocess, including its exit status and
  // diagnostics, against an HTTP boundary that can introduce known faults.
  for (const fault of ["clean", "ranked", "missing-button", "cancelled", "cancelled-outside-ui", "console", "404", "500", "network"]) {
    await t.test(fault, async t => {
      const server = createServer((request, response) => {
        const path = new URL(request.url, "http://fixture.invalid").pathname;
        if (path === "/ui/__gate_failure__") {
          if (fault === "network") request.socket.destroy();
          else { response.writeHead(Number(fault)); response.end(); }
          return;
        }
        if (path === "/ui/__gate_cancelled__" || path === "/__gate_cancelled__") {
          response.setHeader("Content-Type", "text/plain");
          response.write("fictional pending response");
          return;
        }
        response.setHeader("Content-Type", "text/html");
        const button = request.url.startsWith("/ui/docs/button/");
        const options = `${fault === "ranked" ? '<a hidden role="option" href="/ui/docs/button-group/"><span class="docs-search-result"><strong>Button Group</strong><small>Actions</small></span></a>' : ""}
<a hidden role="option" href="/ui/docs/button/"><span class="docs-search-result"><strong>${fault === "missing-button" ? "Button Group" : "Button"}</strong><small>Actions</small></span></a>`;
        const script = fault.startsWith("cancelled") ? `
const controller = new AbortController();
fetch('${fault === "cancelled" ? "/ui" : ""}/__gate_cancelled__?gate=gate-0000#gate-0000', {signal: controller.signal})
  .then(response => { const body = response.text(); controller.abort(); return body; }).catch(() => {});`
          : fault === "console" ? "console.error('fictional gate failure');"
          : ["404", "500", "network"].includes(fault) ? "fetch('/ui/__gate_failure__').catch(() => {});" : "";
        response.end(`<!doctype html><h1>${button ? "Button" : "Docs"}</h1>
<button aria-label="Search components" onclick="document.querySelector('input').hidden=false">Search</button>
<input hidden role="combobox" aria-label="Search documentation" oninput="document.querySelectorAll('[role=option]').forEach(option => option.hidden=false)">
${options}
<script>${script}</script>`);
      });
      await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
      t.after(() => new Promise(resolve => server.close(resolve)));
      const result = await run(["--test", "--test-name-pattern=^ui_live_search_reload_and_console_are_clean$", "tests/navigation-ui.browser.mjs"], {
        UI_BROWSER_URL: `http://127.0.0.1:${server.address().port}/ui/`,
      });
      const passes = ["clean", "ranked", "cancelled"].includes(fault);
      assert.equal(result.code, passes ? 0 : 1, result.output);
      assert.match(result.output, /ui_live_search_reload_and_console_are_clean/);
      if (!passes) assert.match(result.output, /FAIL ui_live_search_reload_and_console_are_clean \//);
      if (fault === "cancelled") {
        assert.match(result.output, /^# IGNORED ui_request_cancellations 3(?: \/ui\/__gate_cancelled__){3}$/m);
        assert.doesNotMatch(result.output, /gate-0000/);
      }
      if (fault === "cancelled-outside-ui") assert.match(result.output, /FAIL ui_live_search_reload_and_console_are_clean \/__gate_cancelled__/);
      if (["404", "500", "network"].includes(fault)) assert.match(result.output, /FAIL ui_live_search_reload_and_console_are_clean \/ui\/__gate_failure__/);
    });
  }
});
