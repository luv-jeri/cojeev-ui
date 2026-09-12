import type { MetadataRoute } from "next";
import { absoluteSiteUrl, siteFlags } from "@/lib/site-config";

export const dynamic = "force-static";

/** A beta origin is a private staging surface. The root layout also emits a noindex meta tag,
 *  because a disallowed URL is never fetched and an externally linked one can still be listed. */
export function robotsRules(environment: string | null): MetadataRoute.Robots["rules"] {
  return environment === "beta" ? { userAgent: "*", disallow: "/" } : { userAgent: "*", allow: "/" };
}

/** A disallowed origin must not hand crawlers a full URL list; every other build keeps its sitemap. */
export function robotsFile(environment: string | null): MetadataRoute.Robots {
  return { rules: robotsRules(environment), ...(environment === "beta" ? {} : { sitemap: absoluteSiteUrl("/sitemap.xml") }) };
}

export default function robots(): MetadataRoute.Robots {
  return robotsFile(siteFlags.environment);
}
