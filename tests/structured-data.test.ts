import test from "node:test";
import assert from "node:assert/strict";
import { documentationCatalog } from "../lib/catalog";
import { site } from "../lib/site-config";
import {
  componentIndexStructuredData,
  componentStructuredData,
  gettingStartedStructuredData,
  homeStructuredData,
  serializeStructuredData,
} from "../lib/seo/structured-data";

const origin = "https://000h.cojeev.com";

function propertyNames(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(propertyNames);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([name, child]) => [name, ...propertyNames(child)]);
}

function typeValues(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(typeValues);
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).flatMap(([name, child]) => [
    ...(name === "@type"
      ? Array.isArray(child)
        ? child.filter((candidate): candidate is string => typeof candidate === "string")
        : typeof child === "string"
          ? [child]
          : []
      : []),
    ...typeValues(child),
  ]);
}

test("homepage structured data connects the public site, library, and creator without invented claims", () => {
  const data = homeStructuredData(origin);
  const website = data["@graph"].find((entry) => entry["@type"] === "WebSite");
  const library = data["@graph"].find((entry) => entry["@type"] === "SoftwareSourceCode");
  const creator = data["@graph"].find((entry) => entry["@type"] === "Person");

  assert.equal(data["@context"], "https://schema.org");
  assert.equal(website?.url, `${origin}/`);
  assert.deepEqual(website?.creator, { "@id": `${origin}/#creator` });
  assert.equal(library?.codeRepository, site.sourceUrl);
  assert.equal(library?.license, `${site.sourceUrl}/blob/main/LICENCE`);
  assert.deepEqual(library?.programmingLanguage, ["TypeScript", "CSS"]);
  assert.deepEqual(library?.runtimePlatform, ["React 19", "Web"]);
  assert.equal(creator?.name, site.author);
  assert.equal(creator?.url, site.creatorUrl);

  assert.doesNotMatch(JSON.stringify(data), /aggregateRating|review|offers/);
});

test("component index structured data lists only canonical public guides", () => {
  const entries = documentationCatalog();
  const publicEntries = entries.filter((entry) => !entry.meta.source.reviewOnly);
  const data = componentIndexStructuredData(entries, origin);
  const list = data.mainEntity;

  assert.equal(data["@type"], "CollectionPage");
  assert.equal(data.url, `${origin}/docs/`);
  assert.equal(list["@type"], "ItemList");
  assert.equal(list.numberOfItems, publicEntries.length);
  assert.deepEqual(
    list.itemListElement.map((item) => item.url),
    publicEntries.map((entry) => `${origin}/docs/${entry.name}/`),
  );
  assert.ok(!list.itemListElement.some((item) => item.url.endsWith("/docs/data-table/") || item.url.endsWith("/docs/aspect-ratio/")));
});

test("component structured data matches the visible component page and breadcrumb", () => {
  const entry = documentationCatalog().find((candidate) => candidate.name === "button");
  assert.ok(entry);
  const data = componentStructuredData(entry, origin);
  const source = data["@graph"].find((node) => node["@type"] === "SoftwareSourceCode");
  const breadcrumb = data["@graph"].find((node) => node["@type"] === "BreadcrumbList");

  assert.equal(source?.name, `${entry.title} React component`);
  assert.equal(source?.description, entry.description);
  assert.equal(source?.url, `${origin}/docs/button/`);
  assert.equal(source?.codeRepository, site.sourceUrl);
  assert.deepEqual(breadcrumb?.itemListElement, [
    { "@type": "ListItem", position: 1, name: "Components", item: `${origin}/docs/` },
    { "@type": "ListItem", position: 2, name: entry.title, item: `${origin}/docs/button/` },
  ]);
});

test("getting started HowTo mirrors the four visible numbered steps", () => {
  const data = gettingStartedStructuredData(origin);

  assert.equal(data["@context"], "https://schema.org");
  assert.equal(data["@type"], "HowTo");
  assert.equal(data.url, `${origin}/getting-started/`);
  assert.equal(data.step.length, 4);
  assert.deepEqual(
    data.step.map((step) => ({ position: step.position, name: step.name, url: step.url })),
    [
      { position: 1, name: "Prepare your project", url: `${origin}/getting-started/#prepare-your-project` },
      { position: 2, name: "Bring in a button", url: `${origin}/getting-started/#bring-in-a-button` },
      { position: 3, name: "Put it to work", url: `${origin}/getting-started/#put-it-to-work` },
      { position: 4, name: "Find your next piece", url: `${origin}/getting-started/#find-your-next-piece` },
    ],
  );
  assert.match(data.step[0].text, /React 19/);
  assert.match(data.step[0].text, /Tailwind CSS v4/);
  assert.match(data.step[0].text, /npx shadcn@latest init/);
  assert.match(data.step[1].text, /npx shadcn@latest add/);
  assert.match(data.step[2].text, /@\/components\/ui\/button/);
  assert.match(data.step[3].text, /Browse all components/);
  assert.ok(
    !propertyNames(data).some((name) =>
      /^(aggregateRating|review|offers|totalTime|estimatedCost|supply)$/i.test(name),
    ),
  );
  assert.ok(
    !typeValues(data).some((type) =>
      /^(AggregateRating|Review|Offer|HowToSupply)$/.test(type),
    ),
  );
});

test("structured data serialization cannot close its script element", () => {
  assert.equal(serializeStructuredData({ text: "</script>" }), '{"text":"\\u003c/script>"}');
});
