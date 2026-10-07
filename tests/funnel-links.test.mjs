import assert from "node:assert/strict";
import test from "node:test";
import { readFile, mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";

const link = '<a href="https://cojeev.com/" class="explore-cojeev">Explore Cojeev</a>';
const attribution = '<a href="https://cojeev.com/">by Cojeev</a>';

test("every_exported_html_page_has_one_bottom_cojeev_link", async t => {
  const mod = new URL("../scripts/check-funnel-links.mjs", import.meta.url);
  await assert.doesNotReject(readFile(mod), "the funnel checker must exist");
  const { funnelLinkProblems } = await import(mod);
  const fixtures = {
    "index.html": `<header><a href="/ui/">000h</a>${attribution}</header><main>Landing content</main><footer>${link}</footer>`,
    "docs/button/index.html": `<header><a href="/ui/docs/">000h</a>${attribution}</header><div id="docs-main"><article>Button</article>${link}</div>`,
    "track/index.html": `<main><h1>Your report</h1><div role="status">Report not found</div>${link}</main>`,
    "404.html": `<main><h1>Page not found</h1><a href="/ui/">Home</a>${link}</main>`,
  };
  for (const [file, html] of Object.entries(fixtures)) assert.deepEqual(funnelLinkProblems(html, file), [], file);
  for (const [name, html] of [
    ["missing", "<main>Content</main>"],
    ["duplicate", `<main>Content${link}${link}</main>`],
    ["new-tab", link.replace('class=', 'target="_blank" class=')],
    ["wrong-href", link.replace("https://cojeev.com/", "/")],
    ["nested-attribution", `<header><a href="/ui/">000h${attribution}</a></header><main>Content${link}</main>`],
  ]) {
    const problems = funnelLinkProblems(html, `${name}.html`);
    assert.ok(problems.length > 0, name);
    assert.ok(problems.every(problem => problem.includes(`${name}.html`)), "diagnostics identify the page");
  }
  assert.deepEqual(funnelLinkProblems(`<script>const example = '${link}';</script><main>${link}</main>`, "script.html"), [], "script text is not an anchor");

  const directory = await mkdtemp(path.join(tmpdir(), "cojeev-funnel-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  for (const [file, html] of Object.entries(fixtures)) {
    await mkdir(path.dirname(path.join(directory, file)), { recursive: true });
    await writeFile(path.join(directory, file), html);
  }
  const run = () => spawnSync(process.execPath, ["scripts/check-funnel-links.mjs", "--dir", directory], { encoding: "utf8" });
  let result = run();
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /4 HTML pages/);
  await writeFile(path.join(directory, "404.html"), "<main>Missing funnel link</main>");
  result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /404\.html/);
});
