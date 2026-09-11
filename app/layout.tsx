import type { Metadata } from "next";
import { PageScrollBar, ScrollbarProvider } from "@/registry/cojeev/ui/scroll-area";
import { AppearanceProvider } from "@/registry/cojeev/ui/appearance";
import { ReportingWidget } from "@/components/reporting/reporting-widget";
import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { absoluteSiteUrl, site } from "@/lib/site-config";
import { catalog } from "@/lib/catalog";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: site.title, template: `%s · ${site.title}` },
  description: site.description,
  metadataBase: new URL(`${site.url}/`),
  authors: [{ name: site.author, url: site.creatorUrl }],
  openGraph: { title: site.title, description: site.description, siteName: site.title, type: "website", url: absoluteSiteUrl("/") },
  twitter: { card: "summary_large_image", title: site.title, description: site.description },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-mode="light" data-scrollbar-policy="cojeev">
      <body suppressHydrationWarning><AnalyticsProvider><AppearanceProvider><ScrollbarProvider scrollbarSize={4}>{children}<PageScrollBar /><ReportingWidget entries={catalog().map(({name,title,description}) => ({name,title,description}))} /></ScrollbarProvider></AppearanceProvider></AnalyticsProvider></body>
    </html>
  );
}
