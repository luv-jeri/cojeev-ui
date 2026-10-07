import { createSearchAPI } from "fumadocs-core/search/server";
import { documentationCatalog, componentGuide } from "./catalog";

/** Everyday names people search for that a component's own name does not contain. */
const ALIASES: Record<string, string> = {
  table: "data-table DataTable",
  "bento-grid": "aspect-ratio AspectRatio",
  "activity-feed": "timeline history event-log audit-trail",
};

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
        keywords: `${entry.name} ${ALIASES[entry.name] ?? ""} ${entry.meta.source.variants.join(" ")}`,
        content: [guide?.description, ...(guide?.usage ?? []), ...(guide?.accessibility ?? []), ...entry.meta.api.map(api => `${api.name} ${api.props.map(prop => `${prop.name} ${prop.description}`).join(" ")}`)].join("\n"),
      };
    }),
  });
}
