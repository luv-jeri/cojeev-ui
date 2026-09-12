import registry from "@/registry.json";
import guides from "@/data/component-guides.json";
import { site } from "@/lib/site-config";
export type ComponentGuide = {
  description: string;
  category: string;
  usage: string[];
  accessibility: string[];
  related: string[];
};
export function componentGuide(id: string): ComponentGuide {
  return (guides as Record<string, ComponentGuide>)[id];
}

export type CatalogEntry = {
  name: string;
  title: string;
  description: string;
  meta: {
    category: string;
    api: {
      name: string;
      props: {
        name: string;
        type: string;
        required: boolean;
        description: string;
      }[];
    }[];
    source: {
      reviewOnly?: boolean;
      variants: string[];
      sizes: string[];
      states: string[];
    };
    fidelity: string;
    baseComponent: boolean;
  };
};
export function catalog(): CatalogEntry[] {
  return registry.items.filter(
    (item: { type: string }) => item.type === "registry:ui",
  ) as CatalogEntry[];
}
/** One discoverable guide may teach several preserved installable modules. */
export function documentationCatalog(): CatalogEntry[] {
  const entries = catalog(),
    composed = entries.find((entry) => entry.name === "data-table"),
    ratio = entries.find((entry) => entry.name === "aspect-ratio");
  return entries
    .filter((entry) => !["data-table", "aspect-ratio"].includes(entry.name))
    .map((entry) =>
      entry.name === "table" && composed
        ? {
            ...entry,
            meta: {
              ...entry.meta,
              api: [...entry.meta.api, ...composed.meta.api],
            },
          }
        : entry.name === "bento-grid" && ratio
          ? {...entry,meta:{...entry.meta,api:[...entry.meta.api,...ratio.meta.api]}}
          : entry,
    );
}
export const publicURL = site.registryUrl;
