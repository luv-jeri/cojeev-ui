import test from "node:test";
import assert from "node:assert/strict";
import { absoluteSiteUrl, installCommand, pageMetadata, site } from "../lib/site-config";

test("public deep links preserve a Pages subpath and also work at a custom-domain root", () => {
  assert.equal(absoluteSiteUrl("/docs/button/"), "https://cojeev.com/ui/docs/button/");
  assert.equal(absoluteSiteUrl("/"), "https://cojeev.com/ui/");
  assert.equal(absoluteSiteUrl("docs/button/", "https://beta.000h.cojeev.com/ui/"), "https://beta.000h.cojeev.com/ui/docs/button/");
  assert.equal(absoluteSiteUrl("/docs/button/", "https://example.com/cojeev-ui/"), "https://example.com/cojeev-ui/docs/button/");
  assert.equal(absoluteSiteUrl("/about/", "https://example.com/"), "https://example.com/about/");
});

test("installation remains a complete registry URL before directory approval", () => {
  assert.equal(installCommand("button", "https://example.com/library/"), "npx shadcn@latest add https://example.com/library/r/button.json");
  assert.throws(() => installCommand("../private"), /component/i);
});

test("page metadata uses the chosen brand and canonical route with a share image", () => {
  const metadata = pageMetadata("About the maker", "Meet the designer and developer.", "/about/");
  assert.equal(site.name, "000h");
  assert.equal(metadata.title, "About the maker");
  assert.equal(metadata.alternates?.canonical, "https://cojeev.com/ui/about/");
  assert.equal(metadata.openGraph?.url, "https://cojeev.com/ui/about/");
  assert.deepEqual(metadata.twitter?.images, ["https://cojeev.com/ui/opengraph-image.png"]);
  assert.equal(metadata.openGraph?.title, "About the maker · 000h by Cojeev");
  assert.ok(JSON.stringify(metadata.openGraph).includes("opengraph-image"));
});
