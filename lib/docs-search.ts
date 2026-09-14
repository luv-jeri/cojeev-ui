import { createSearchAPI } from "fumadocs-core/search/server";
import { documentationCatalog, componentGuide } from "./catalog";

/** Public documentation only. Queries run locally against Fumadocs' static index. */
export function createDocsSearch() {
  return createSearchAPI("simple", {
    indexes: documentationCatalog().map(entry => {
      const guide = componentGuide(entry.name);
      return {
        title: entry.title,
        description: guide?.description ?? entry.description,
        breadcrumbs: [entry.meta.category],
        url: `/docs/${entry.name}/`,
        keywords: `${entry.name} ${entry.name === "table" ? "data-table DataTable" : entry.name === "bento-grid" ? "aspect-ratio AspectRatio" : ""} ${entry.meta.source.variants.join(" ")}`,
        content: [guide?.description, ...(guide?.usage ?? []), ...(guide?.accessibility ?? []), ...entry.meta.api.map(api => `${api.name} ${api.props.map(prop => `${prop.name} ${prop.description}`).join(" ")}`)].join("\n"),
      };
    }),
  });
}
