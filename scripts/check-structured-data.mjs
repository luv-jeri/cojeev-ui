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
