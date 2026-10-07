import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";
import type { Metadata } from "next";
import { catalog, documentationCatalog } from "../lib/catalog";
import { absoluteSiteUrl, pageMetadata, site, siteFlags } from "../lib/site-config";
import sitemap from "../app/sitemap";
import { fixtureSource } from "../apps/triage/fixtures";
import { buildPrompt } from "../scripts/triage/judge";
import { resolveConfig } from "../scripts/triage/config";
import { VERDICT_SCHEMA } from "../lib/reporting/triage-contract";
import registry from "../registry.json";

// Execute the actual metadata exports without loading CSS, fonts or page UI.
// Their dependencies are the real site and catalog modules, not test doubles.
function metadataExports(filename: string): {
  metadata: Metadata;
  generateMetadata: (props: { params: Promise<{ component: string }> }) => Promise<Metadata>;
} {
  const source = ts.createSourceFile(filename, readFileSync(filename, "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const declarations = source.statements.filter(statement =>
    (ts.isVariableStatement(statement) && statement.declarationList.declarations.some(declaration => declaration.name.getText(source) === "metadata")) ||
    (ts.isFunctionDeclaration(statement) && statement.name?.text === "generateMetadata"),
  );
  assert.ok(declarations.length, `${filename} must export metadata`);
  const code = ts.transpileModule(declarations.map(statement => statement.getText(source)).join("\n"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const exports = {};
  return new Function("exports", "pageMetadata", "absoluteSiteUrl", "site", "siteFlags", "documentationCatalog", `${code}\nreturn exports;`)(
    exports, pageMetadata, absoluteSiteUrl, site, siteFlags, documentationCatalog,
  );
}

function imageUrl(image: unknown): string {
  if (typeof image === "string" || image instanceof URL) return String(image);
  assert.ok(image && typeof image === "object" && "url" in image);
  return String(image.url);
}

function assertCanonicalMetadata(metadata: Metadata, canonical: string) {
  assert.equal(metadata.alternates?.canonical, canonical);
  assert.equal(metadata.openGraph?.url, canonical);
  for (const field of [metadata.openGraph?.images, metadata.twitter?.images]) {
    const images = Array.isArray(field) ? field : field ? [field] : [];
    assert.ok(images.length, "both social cards must have an image");
    for (const image of images) assert.match(imageUrl(image), /^https:\/\/cojeev\.com\/ui\/(?!ui\/)/);
  }
  assert.match(canonical, /^https:\/\/cojeev\.com\/ui\/(?!ui\/)/);
}

test("canonical_and_social_urls_have_exactly_one_ui_prefix", async () => {
  const routes = ["", "docs", "getting-started", "about", "work-with-me", "privacy", "requests", "track"];
  for (const route of routes) {
    const filename = route ? `app/${route}/page.tsx` : "app/page.tsx";
    const canonicalRoute = route === "work-with-me" ? "about" : route;
    assertCanonicalMetadata(metadataExports(filename).metadata, `https://cojeev.com/ui/${canonicalRoute ? `${canonicalRoute}/` : ""}`);
  }
  const { generateMetadata } = metadataExports("app/docs/[component]/page.tsx");
  for (const entry of catalog()) {
    const canonicalName = entry.name === "data-table" ? "table" : entry.name === "aspect-ratio" ? "bento-grid" : entry.name;
    assertCanonicalMetadata(await generateMetadata({ params: Promise.resolve({ component: entry.name }) }), `https://cojeev.com/ui/docs/${canonicalName}/`);
  }
  const root = metadataExports("app/layout.tsx").metadata;
  assertCanonicalMetadata(root, "https://cojeev.com/ui/");
});

test("layout_metadata_base_keeps_file_convention_images_at_one_ui_prefix", () => {
  assert.equal(String(metadataExports("app/layout.tsx").metadata.metadataBase), "https://cojeev.com/");
});

test("component_aliases_keep_canonical_component_names", async () => {
  const { generateMetadata } = metadataExports("app/docs/[component]/page.tsx");
  for (const [alias, canonical] of [["data-table", "table"], ["aspect-ratio", "bento-grid"]]) {
    const metadata = await generateMetadata({ params: Promise.resolve({ component: alias }) });
    assert.equal(metadata.alternates?.canonical, `https://cojeev.com/ui/docs/${canonical}/`);
  }
});

test("work_with_me_canonical_remains_about", () => {
  assert.equal(metadataExports("app/work-with-me/page.tsx").metadata.alternates?.canonical, "https://cojeev.com/ui/about/");
});

test("sitemap_contains_only_canonical_public_routes", () => {
  // The existing baseline uses installable public catalog entries, including aliases.
  const baselineRoutes = ["/", "/docs/", "/getting-started/", "/about/", "/privacy/", "/requests/",
    ...registry.items.filter(entry => entry.type === "registry:ui" && !entry.meta?.source?.reviewOnly).map(entry => `/docs/${entry.name}/`),
  ];
  const urls = sitemap().map(entry => entry.url);
  assert.deepEqual(urls.toSorted(), baselineRoutes.map(route => `https://cojeev.com/ui${route}`).toSorted());
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) assert.doesNotMatch(url, /\/(?:track|feedback-admin|workspace)\//);
  for (const entry of registry.items.filter(entry => entry.type === "registry:ui" && entry.meta?.source?.reviewOnly)) {
    assert.ok(!urls.includes(`https://cojeev.com/ui/docs/${entry.name}/`));
  }
});

test("repository_schema_and_provider_urls_are_unchanged", async () => {
  assert.equal(site.sourceUrl, "https://github.com/luv-jeri/cojeev-ui");
  assert.equal(site.creatorUrl, "https://github.com/luv-jeri");
  const worker = ts.parseConfigFileTextToJson("wrangler.jsonc", readFileSync("workers/reporting/wrangler.jsonc", "utf8")).config;
  assert.equal(worker.vars.GITHUB_REPOSITORY, "luv-jeri/cojeev-ui");
  assert.equal(worker.env.production.vars.GITHUB_REPOSITORY, "luv-jeri/cojeev-ui");
  assert.equal(worker.env.beta.vars.GITHUB_REPOSITORY, "luv-jeri/cojeev-ui-beta-feedback");
  for (const [environment, api] of [["production", "https://feedback.cojeev.com"], ["beta", "https://feedback-beta.cojeev.com"]]) {
    assert.equal(resolveConfig(["--env", environment], { ...process.env, REPORTING_ADMIN_TOKEN: "test-placeholder", TRIAGE_API: undefined }, () => null).api, api);
  }
  assert.deepEqual(VERDICT_SCHEMA, {
    type: "object", additionalProperties: false, required: ["decision", "reason", "title", "body"],
    properties: {
      decision: { enum: ["approved", "rejected"] }, reason: { type: "string", maxLength: 500 },
      title: { type: "string", minLength: 3, maxLength: 120 }, body: { type: "string", minLength: 1, maxLength: 20000 },
    },
  });
  const prompt = buildPrompt({ id: "example", kind: "bug", title: "Broken tabs", description: "The indicator jumps.", references: [], attachments: [], topicId: null, createdAt: 0 });
  const fixture = await fixtureSource.detail("rpt_a1");
  assert.deepEqual({ site: prompt.match(/library \((https:[^)]+)\)/)?.[1], references: JSON.parse(fixture.report.references_json) }, {
    site: "https://cojeev.com/ui", references: ["https://cojeev.com/ui/docs/tabs"],
  });
  assert.equal(fixture.report.issue_url, "https://github.com/example/repo/issues/412");
});

test("private_pages_keep_noindex_and_no_referrer", () => {
  const track = metadataExports("app/track/page.tsx").metadata;
  assert.deepEqual(track.robots, { index: false, follow: false });
  assert.equal(track.referrer, "no-referrer");
  assert.deepEqual(metadataExports("app/feedback-admin/page.tsx").metadata.robots, { index: false, follow: false });
});
