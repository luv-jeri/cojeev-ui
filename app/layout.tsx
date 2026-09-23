import type { Metadata } from "next";
import { preload } from "react-dom";
import displayFont from "./fonts/bricolage-grotesque-variable.woff2";
import { PageScrollBar, ScrollbarProvider } from "@/registry/cojeev/ui/scroll-area";
import { pageScrollbarBootstrap } from "@/registry/cojeev/motion/scroll-thumb";
import { AppearanceProvider } from "@/registry/cojeev/ui/appearance";
import { appearanceBootstrapScript, prepaintCssRules } from "@/app/prepaint/appearance";
import { ReportingWidget } from "@/components/reporting/reporting-widget";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { absoluteSiteUrl, site, siteFlags } from "@/lib/site-config";
import { catalog } from "@/lib/catalog";
import "./globals.css";
import "@/components/analytics/analytics-consent.css";

/* Every palette at the default contrast, plus a rule per contrast slider stop, keyed
 * by the attributes the bootstrap below sets. `AppearanceProvider` computes the same
 * values in JavaScript, which cannot run before first paint, so without this a saved
 * palette — and a saved contrast — only appeared once React hydrated. Generated from
 * the palette definitions by `npm run appearance:prepaint`; a unit test asserts the
 * two agree. The runtime's inline tokens still win once it mounts, so live contrast
 * changes are unaffected. */
const prepaintCss = prepaintCssRules;

/* Reads `cojeev-docs-theme` and `cojeev-appearance` and writes `data-mode`,
 * `data-palette` and `data-contrast` before the first paint. Its normalization is
 * the same contract `AppearanceProvider` uses (`appearanceState` in the generated
 * module, asserted against `normalizeAppearance()` by the unit test), so a
 * malformed stored value cannot be painted one way and mounted another. */
const appearanceBootstrap = appearanceBootstrapScript;

export const metadata: Metadata = {
  title: { default: site.title, template: `%s · ${site.title}` },
  description: site.description,
  metadataBase: new URL(`${site.url}/`),
  authors: [{ name: site.author, url: site.creatorUrl }],
  openGraph: { title: site.title, description: site.description, siteName: site.title, type: "website", url: absoluteSiteUrl("/") },
  twitter: { card: "summary_large_image", title: site.title, description: site.description },
  // Beta is a staging origin: keep the whole build out of search results in every crawler that fetches a page.
  ...(siteFlags.environment === "beta" ? { robots: { index: false, follow: false } } : {}),
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // The hero heading is the LCP element; fetch its face alongside the stylesheet instead of after it.
  preload(displayFont, { as: "font", type: "font/woff2", crossOrigin: "anonymous" });
  return (
    <html lang="en" data-mode="light" data-scrollbar-policy="cojeev" suppressHydrationWarning>
      <head>
        {/* Every palette and every contrast stop, before any bundle: the first frame
            is already the stored one, so a saved palette or contrast no longer flashes
            the handoff canvas. */}
        <style dangerouslySetInnerHTML={{ __html: prepaintCss }} />
        {/* Resolve before first paint, without waiting for React or a network script. */}
        <script dangerouslySetInnerHTML={{ __html: appearanceBootstrap }} />
        {/* Claim the scrollbar paint before first paint, and hand it back if the bundle
            never mounts the overlay. Both halves live in the component's own helper. */}
        <script dangerouslySetInnerHTML={{ __html: pageScrollbarBootstrap }} />
      </head>
      <body suppressHydrationWarning><AnalyticsProvider><AppearanceProvider><ScrollbarProvider scrollbarSize={4}>{children}<PageScrollBar /><ReportingWidget entries={catalog().map(({name,title,description}) => ({name,title,description}))} /></ScrollbarProvider></AppearanceProvider></AnalyticsProvider></body>
    </html>
  );
}
