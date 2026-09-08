import type { Metadata } from "next";
import { PageScrollBar } from "@/registry/sahajiv/ui/scroll-area";
import { AppearanceProvider } from "@/registry/sahajiv/ui/appearance";
import { ReportingWidget } from "@/components/reporting/reporting-widget";
import { catalog } from "@/lib/catalog";
import "./globals.css";
export const metadata: Metadata = {
  title: "SahaJiv UI",
  description: "SahaJiv React components and shadcn registry.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-mode="light">
      <body><AppearanceProvider>{children}<PageScrollBar /><ReportingWidget entries={catalog().map(({name,title,description}) => ({name,title,description}))} /></AppearanceProvider></body>
    </html>
  );
}
