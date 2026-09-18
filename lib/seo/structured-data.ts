import type { CatalogEntry } from "@/lib/catalog";
import { absoluteSiteUrl, installCommand, site } from "@/lib/site-config";

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

export type HowToStep = StructuredDataNode & {
  "@type": "HowToStep";
  position: number;
  name: string;
  text: string;
  url: string;
};

export type GettingStartedHowTo = StructuredDataDocument & {
  "@type": "HowTo";
  "@id": string;
  name: string;
  description: string;
  url: string;
  step: HowToStep[];
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

export function gettingStartedStructuredData(
  origin: string = site.url,
): GettingStartedHowTo {
  const url = absoluteSiteUrl("/getting-started/", origin);
  const registryOrigin = origin === site.url ? site.registryUrl : origin;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "@id": `${url}#howto`,
    name: "Install your first 000h component",
    description: "Prepare a React project, install the 000h button with the shadcn CLI, render it, and continue through the component documentation.",
    url,
    step: [
      {
        "@type": "HowToStep",
        position: 1,
        name: "Prepare your project",
        text: "Use a React 19 project with TypeScript, Tailwind CSS v4, and an @/ import alias. Run npx shadcn@latest init if shadcn is not set up yet.",
        url: `${url}#prepare-your-project`,
      },
      {
        "@type": "HowToStep",
        position: 2,
        name: "Bring in a button",
        text: `Run ${installCommand("button", registryOrigin)} and review the CLI prompts before replacing files with the same names.`,
        url: `${url}#bring-in-a-button`,
      },
      {
        "@type": "HowToStep",
        position: 3,
        name: "Put it to work",
        text: "Import Button from @/components/ui/button, render it in your React component, and adapt the installed source in your project.",
        url: `${url}#put-it-to-work`,
      },
      {
        "@type": "HowToStep",
        position: 4,
        name: "Find your next piece",
        text: "Browse all components for another working preview, example source, and install command.",
        url: `${url}#find-your-next-piece`,
      },
    ],
  };
}

export function serializeStructuredData(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
