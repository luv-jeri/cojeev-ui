import assert from "node:assert/strict";
import { load } from "cheerio";

const supplied = process.argv.find(arg => arg.startsWith("--url="))?.slice(6);
if (!supplied) throw new Error("Pass --url=<the actual website origin, including any base path>.");
const base = new URL(supplied.endsWith("/") ? supplied : supplied + "/");
if (!/^https?:$/.test(base.protocol) || base.username || base.password || base.search || base.hash) throw new Error("Use an HTTP(S) website URL without credentials, query, or fragment.");
const canonicalArgument = process.argv.find(arg => arg.startsWith("--canonical-url="))?.slice(16);
if (canonicalArgument && !["localhost", "127.0.0.1", "[::1]"].includes(base.hostname)) throw new Error("Canonical override is only for a local exported-build check.");
const canonicalBase = canonicalArgument ? new URL(canonicalArgument.endsWith("/") ? canonicalArgument : canonicalArgument + "/") : base;
const samples = ["button", "semantic-bloom", "animated-icon", "motion-drawer", "organism-assembly"];
async function get(route) {
  const response = await fetch(new URL(route, base), { headers: { "x-cojeev-probe": "1" }, signal: AbortSignal.timeout(20000) });
  assert.equal(response.status, 200, `${route} must return HTTP 200`);
  return response;
}

for (const route of ["", "docs/", "getting-started/", "about/", "privacy/", ...samples.map(name => `docs/${name}/`)]) {
  const response = await get(route);
  assert.match(response.headers.get("content-type") ?? "", /text\/html/);
  const $ = load(await response.text());
  assert.match($("title").text(), /000h/);
  assert.ok($("h1").text().trim(), `${route} needs a visible page title`);
  assert.equal($('link[rel="canonical"]').attr("href"), new URL(route, canonicalBase).href, `${route} canonical must match this deployment`);
  const image = $('meta[property="og:image"]').attr("content");
  assert.ok(image, `${route} needs a share image`);
  if (route === "") {
    const imageURL = canonicalArgument && image.startsWith(canonicalBase.href) ? new URL(image.slice(canonicalBase.href.length), base).href : image;
    const imageResponse = await fetch(imageURL, { signal: AbortSignal.timeout(20000) });
    assert.equal(imageResponse.status, 200, "share image must load");
    assert.match(imageResponse.headers.get("content-type") ?? "", /^image\//);
  }
  console.log(`Page verified: ${route || "/"}`);
}
const indexResponse = await get("r/registry.json");
assert.match(indexResponse.headers.get("content-type") ?? "", /application\/json/);
const index = await indexResponse.json();
assert.ok(Array.isArray(index.items) && index.items.length > 0);
assert.ok(!index.items.some(item => item.files?.some(file => typeof file.content === "string")), "registry index must not embed source content");
for (const name of samples) {
  assert.ok(index.items.some(item => item.name === name), `${name} must be in the index`);
  const response = await get(`r/${name}.json`);
  assert.match(response.headers.get("content-type") ?? "", /application\/json/);
  const item = await response.json();
  assert.equal(item.name, name);
  assert.ok(item.files?.some(file => typeof file.content === "string" && file.content.length > 0));
  for (const dependency of item.registryDependencies ?? []) if (/^https?:/.test(dependency)) assert.equal((await fetch(canonicalArgument && dependency.startsWith(canonicalBase.href) ? new URL(dependency.slice(canonicalBase.href.length), base).href : dependency, { headers: { "x-cojeev-probe": "1" }, signal: AbortSignal.timeout(20000) })).status, 200, `${name} dependency must load`);
  console.log(`Registry JSON verified: ${name}`);
}
const missing = await fetch(new URL("r/000h-readiness-missing.json", base), { headers: { "x-cojeev-probe": "1" }, signal: AbortSignal.timeout(20000) });
assert.equal(missing.status, 404, "missing registry items must return 404");
await get("sitemap.xml");
console.log(`Readiness checks passed for ${index.items.length} index entries and ${samples.length} sampled items. This is not a full schema audit or a clean-project installation test.`);
