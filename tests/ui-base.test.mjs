import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtemp, readFile, readdir, rm, copyFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

const sourceFiles = async () => (await Promise.all(["scripts", "tests"].map(async directory =>
  (await readdir(directory)).filter(file => file.endsWith(".mjs")).map(file => `${directory}/${file}`)))).flat();

test("build_uses_ui_base_without_asset_prefix", async () => {
  const previous = process.env.COJEEV_BASE_PATH;
  delete process.env.COJEEV_BASE_PATH;
  try {
    const { default: config } = await import("../next.config.ts");
    assert.equal(config.basePath, "/ui");
    assert.equal(config.assetPrefix, undefined);
    assert.equal(config.trailingSlash, true);
    assert.equal(config.output, "export");
    assert.equal(config.images.unoptimized, true);
  } finally {
    if (previous === undefined) delete process.env.COJEEV_BASE_PATH;
    else process.env.COJEEV_BASE_PATH = previous;
  }
});

test("preview_mount_matches_build_base", async () => {
  const pkg = JSON.parse(await readFile("package.json", "utf8"));
  assert.match(pkg.scripts.start, /--base \/ui\/(?:\s|$)/);
  let previews = 0;
  for (const file of await sourceFiles()) {
    const source = await readFile(file, "utf8");
    if (!/(?:from\s+|import\s*\()["']vite["']/.test(source)) continue;
    for (const match of source.matchAll(/\bbase\s*:\s*["']([^"']+)["']/g)) {
      previews++;
      assert.equal(match[1], "/ui/", file);
    }
  }
  assert.ok(previews >= 16, "all inline Vite previews are scanned");
});

test("all_browser_mounts_match_ui_build", async () => {
  // Compatibility: install verification and rollback normalization still read old registry URLs.
  // These exact patterns retain old-base acceptance; they are not browser mounts.
  const compatibility = new Map([
    ["scripts/registry-dependency.mjs", String.raw`(?:\/cojeev-ui|\/ui)?`],
  ]);
  for (const file of (await sourceFiles()).filter(file => file.startsWith("scripts/") || file.endsWith(".browser.mjs"))) {
    let source = await readFile(file, "utf8");
    // Repository identifiers, local storage paths and the unchanged reporting Worker are not old site bases.
    source = source.replaceAll("luv-jeri/cojeev-ui", "REPOSITORY")
      .replaceAll(".local/share/cojeev-ui-analytics", "LOCAL_STORAGE")
      .replaceAll("https://cojeev-ui-reporting.unread-fyi.workers.dev", "REPORTING_API");
    if (compatibility.has(file)) {
      assert.ok(source.includes(compatibility.get(file)), `${file}: explicit old-base compatibility`);
      source = source.replaceAll(compatibility.get(file), "COMPATIBILITY");
    }
    assert.ok(!source.includes("/cojeev-ui"), `${file}: old browser base`);
    for (const match of source.matchAll(/https?:\/\/(?:127\.0\.0\.1|localhost):(?:\d+|\$\{[^}]+\})([^\s"'`)]*)/g)) {
      // Bare origins serve disposable workers/consumer fixtures; site URLs carry the mount.
      if (!match[1] || (file === "scripts/gate-lifecycle.mjs" && match[1] === "/apps/gate/lifecycle.html") || (file === "scripts/reporting.mjs" && match[1] === ".")) continue;
      assert.match(match[1], /^\/ui(?:\/|$)/, `${file}: loopback website mount`);
    }
  }
});

test("consumer_fonts_remain_self_contained", async () => {
  const css = await readFile("registry/cojeev/styles/fonts.css", "utf8");
  const materializer = await readFile("registry/cojeev/scripts/materialize-fonts.mjs", "utf8");
  assert.ok(!css.includes("/ui") && !materializer.includes("/ui"));
  const directory = await mkdtemp(path.join(tmpdir(), "ui-consumer-fonts-"));
  try {
    const target = path.join(directory, "fonts.css");
    await copyFile("registry/cojeev/styles/fonts.css", target);
    execFileSync(process.execPath, ["registry/cojeev/scripts/materialize-fonts.mjs", "--css", target]);
    const sources = [...(await readFile(target, "utf8")).matchAll(/url\(["']([^"']+)["']\)/g)].map(match => match[1]);
    assert.deepEqual(sources, ["./fonts/dm-sans-variable.woff2", "./fonts/bricolage-grotesque-variable.woff2"]);
    for (const source of sources) assert.ok((await readFile(path.join(directory, source))).length > 0);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
