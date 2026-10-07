import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function documents(html) {
  return [...html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)]
    .map((match) => JSON.parse(match[1]));
}

function nodes(document) {
  return Array.isArray(document["@graph"]) ? document["@graph"] : [document, document.mainEntity].filter(Boolean);
}

function keys(value) {
  if (Array.isArray(value)) return value.flatMap(keys);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [key, ...keys(child)]);
}

function types(value) {
  if (Array.isArray(value)) return value.flatMap(types);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([key, child]) => [
    ...(key === "@type" ? Array.isArray(child) ? child.filter((type) => typeof type === "string") : typeof child === "string" ? [child] : [] : []),
    ...types(child),
  ]);
}

async function typesFor(directory, route) {
  const html = await fs.readFile(path.join(directory, route, "index.html"), "utf8");
  const payloads = documents(html);
  assert.ok(payloads.length > 0, `${route || "/"} must contain JSON-LD`);
  assert.ok(payloads.every((payload) => payload["@context"] === "https://schema.org"), `${route || "/"} must use the Schema.org context`);
  checkCanonicalUrls(payloads, route);
  const propertyNames = new Set(keys(payloads));
  for (const forbidden of ["aggregateRating", "review", "offers", "totalTime", "estimatedCost", "supply"]) {
    assert.ok(!propertyNames.has(forbidden), `${route || "/"} must not invent ${forbidden}`);
  }
  const typeNames = new Set(types(payloads));
  for (const forbidden of ["AggregateRating", "Review", "Offer", "HowToSupply"]) {
    assert.ok(!typeNames.has(forbidden), `${route || "/"} must not invent ${forbidden}`);
  }
  return new Set(payloads.flatMap((payload) => nodes(payload).map((node) => node["@type"])));
}

const directory = path.resolve(argument("--dir", "out"));
const canonicalSite = argument("--site", "https://cojeev.com/ui");
assert.ok(["https://cojeev.com/ui", "https://beta.000h.cojeev.com/ui"].includes(canonicalSite), "--site must be an exact canonical site base");

function checkCanonicalUrls(payloads, route) {
  const page = `${canonicalSite}/${route ? route + "/" : ""}`;
  const home = `${canonicalSite}/`;
  const ids = new Map([
    ["WebSite", `${home}#website`], ["Person", `${home}#creator`],
    ["SoftwareSourceCode", `${page}#${route ? "component" : "library"}`],
    ["CollectionPage", `${page}#collection`], ["BreadcrumbList", `${page}#breadcrumb`],
    ["HowTo", `${page}#howto`],
  ]);
  const references = new Set([`${home}#website`, `${home}#creator`, `${home}#library`]);
  const steps = new Set(["prepare-your-project", "bring-in-a-button", "put-it-to-work", "find-your-next-piece"]
    .map(id => `${canonicalSite}/getting-started/#${id}`));
  function walk(value) {
    if (Array.isArray(value)) return value.forEach(walk);
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      if (key === "@id") assert.ok(child === ids.get(value["@type"]) ||
        !value["@type"] && references.has(child), `${route || "/"} has a non-canonical @id: ${child}`);
      if (key === "url" && value["@type"] !== "Person") {
        if (value["@type"] === "HowToStep") assert.ok(steps.has(child), `non-canonical HowTo step: ${child}`);
        else if (value["@type"] === "ListItem" || !value["@type"]) {
          const prefix = `${canonicalSite}/docs/`;
          assert.ok(typeof child === "string" && child.startsWith(prefix) &&
            /^[a-z0-9-]+\/$/.test(child.slice(prefix.length)), `non-canonical component list URL: ${child}`);
        }
        else assert.equal(child, page, `${route || "/"} has a non-canonical url`);
      }
      if (key === "mainEntityOfPage") assert.equal(child, page, "non-canonical mainEntityOfPage");
      if (key === "item") assert.ok([`${canonicalSite}/docs/`, page].includes(child), `non-canonical breadcrumb item: ${child}`);
      walk(child);
    }
  }
  payloads.forEach(walk);
  for (const node of payloads.flatMap(nodes)) {
    if (ids.has(node["@type"])) assert.equal(node["@id"], ids.get(node["@type"]), "missing or non-canonical @id");
    if (["WebSite", "SoftwareSourceCode", "CollectionPage", "HowTo"].includes(node["@type"]))
      assert.equal(node.url, page, "missing or non-canonical url");
  }
}
async function checkExportPaths(folder) {
  for (const entry of await fs.readdir(folder, { withFileTypes: true })) {
    const filename = path.join(folder, entry.name);
    if (entry.isDirectory()) await checkExportPaths(filename);
    else if (entry.isFile()) {
      const content = await fs.readFile(filename);
      assert.ok(!content.includes("/ui/ui"), `${path.relative(directory, filename)} must not contain doubled /ui/ui`);
    }
  }
}

await checkExportPaths(directory);
const expectations = [
  ["", ["WebSite", "SoftwareSourceCode", "Person"]],
  ["docs", ["CollectionPage", "ItemList"]],
  ["docs/button", ["SoftwareSourceCode", "BreadcrumbList"]],
  ["getting-started", ["HowTo"]],
];

for (const [route, expectedTypes] of expectations) {
  const actualTypes = await typesFor(directory, route);
  for (const type of expectedTypes) assert.ok(actualTypes.has(type), `${route || "/"} must describe ${type}`);
}

console.log(`Structured data verified in ${directory}`);
