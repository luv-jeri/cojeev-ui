import type { MetadataRoute } from "next";
import { catalog } from "@/lib/catalog";
import { absoluteSiteUrl } from "@/lib/site-config";

export const dynamic = "force-static";
export default function sitemap(): MetadataRoute.Sitemap {
  const routes = ["/", "/docs/", "/getting-started/", "/about/", "/privacy/", "/requests/", ...catalog().filter(entry => !entry.meta.source.reviewOnly).map(entry => `/docs/${entry.name}/`)];
  return routes.map(route => ({ url: absoluteSiteUrl(route) }));
}
