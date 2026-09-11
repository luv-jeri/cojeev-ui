import type { Metadata } from "next";

export const site = {
  name: "000h",
  title: "000h by Cojeev",
  description: "Expressive React components with organic shapes, purposeful motion, and source you can make your own.",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://luv-jeri.github.io/cojeev-ui").replace(/\/+$/, ""),
  registryUrl: (process.env.NEXT_PUBLIC_REGISTRY_URL || process.env.COJEEV_REGISTRY_URL || "https://luv-jeri.github.io/cojeev-ui").replace(/\/+$/, ""),
  sourceUrl: "https://github.com/luv-jeri/cojeev-ui",
  creatorUrl: "https://github.com/luv-jeri",
  author: "Sanjay Kumar",
} as const;

export function absoluteSiteUrl(route: string, origin: string = site.url): string {
  return new URL(route.replace(/^\/+/, ""), `${origin.replace(/\/+$/, "")}/`).href;
}

export function installCommand(componentId: string, origin: string = site.registryUrl): string {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(componentId)) throw new Error("Invalid component ID");
  return `npx shadcn@latest add ${origin.replace(/\/+$/, "")}/r/${componentId}.json`;
}

export function pageMetadata(title: string, description: string, route: string): Metadata {
  const fullTitle = `${title} · ${site.title}`;
  const image = { url: absoluteSiteUrl("/opengraph-image.png"), width: 1200, height: 630, alt: site.title };
  return {
    title,
    description,
    alternates: { canonical: absoluteSiteUrl(route) },
    openGraph: { title: fullTitle, description, url: absoluteSiteUrl(route), siteName: site.title, type: "website", images: [image] },
    twitter: { card: "summary_large_image", title: fullTitle, description, images: [image.url] },
  };
}
