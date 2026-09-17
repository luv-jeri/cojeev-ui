import type { CatalogEntry } from "@/lib/catalog";
import { absoluteSiteUrl, site } from "@/lib/site-config";

export type StructuredDataValue =
  | string
  | number
  | boolean
  | StructuredDataNode
  | StructuredDataValue[];

export type StructuredDataNode = {
  [key: string]: StructuredDataValue;
};

export type StructuredDataDocument = StructuredDataNode & {
  "@context": "https://schema.org";
};

type ComponentListItem = {
  "@type": "ListItem";
  position: number;
  name: string;
  url: string;
};

type ComponentItemList = StructuredDataNode & {
  "@type": "ItemList";
  numberOfItems: number;
  itemListElement: ComponentListItem[];
};

export function homeStructuredData(origin: string = site.url): StructuredDataDocument & {
  "@graph": StructuredDataNode[];
} {
  const homeUrl = absoluteSiteUrl("/", origin);
  const creatorId = `${homeUrl}#creator`;
  const websiteId = `${homeUrl}#website`;
  const libraryId = `${homeUrl}#library`;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: homeUrl,
        name: site.title,
        alternateName: site.name,
        description: site.description,
        creator: { "@id": creatorId },
      },
      {
        "@type": "SoftwareSourceCode",
        "@id": libraryId,
        name: site.title,
        description: site.description,
        url: homeUrl,
        codeRepository: site.sourceUrl,
        license: `${site.sourceUrl}/blob/main/LICENCE`,
        programmingLanguage: ["TypeScript", "CSS"],
        runtimePlatform: ["React 19", "Web"],
        creator: { "@id": creatorId },
        isPartOf: { "@id": websiteId },
      },
      {
        "@type": "Person",
        "@id": creatorId,
        name: site.author,
        url: site.creatorUrl,
      },
    ],
  };
}

export function componentIndexStructuredData(
  entries: CatalogEntry[],
  origin: string = site.url,
): StructuredDataDocument & { mainEntity: ComponentItemList } {
  const publicEntries = entries.filter((entry) => !entry.meta.source.reviewOnly);
  const url = absoluteSiteUrl("/docs/", origin);

  return {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${url}#collection`,
    url,
    name: `React components · ${site.title}`,
    description: "Explore expressive React components, try their working examples, and copy editable source into your project.",
    isPartOf: { "@id": `${absoluteSiteUrl("/", origin)}#website` },
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: publicEntries.length,
      itemListElement: publicEntries.map((entry, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: entry.title,
        url: absoluteSiteUrl(`/docs/${entry.name}/`, origin),
      })),
    } satisfies ComponentItemList,
  };
}

export function componentStructuredData(
  entry: CatalogEntry,
  origin: string = site.url,
): StructuredDataDocument & { "@graph": StructuredDataNode[] } {
  const homeUrl = absoluteSiteUrl("/", origin);
  const docsUrl = absoluteSiteUrl("/docs/", origin);
  const componentUrl = absoluteSiteUrl(`/docs/${entry.name}/`, origin);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareSourceCode",
        "@id": `${componentUrl}#component`,
        name: `${entry.title} React component`,
        description: entry.description,
        url: componentUrl,
        codeRepository: site.sourceUrl,
        license: `${site.sourceUrl}/blob/main/LICENCE`,
        programmingLanguage: ["TypeScript", "CSS"],
        runtimePlatform: ["React 19", "Web"],
        isPartOf: { "@id": `${homeUrl}#library` },
        mainEntityOfPage: componentUrl,
      },
      {
        "@type": "BreadcrumbList",
        "@id": `${componentUrl}#breadcrumb`,
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Components", item: docsUrl },
          { "@type": "ListItem", position: 2, name: entry.title, item: componentUrl },
        ],
      },
    ],
  };
}

export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
