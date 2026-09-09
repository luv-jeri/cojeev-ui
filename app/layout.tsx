import type { Metadata } from "next";
import { PageScrollBar } from "@/registry/cojeev/ui/scroll-area";
import { AppearanceProvider } from "@/registry/cojeev/ui/appearance";
import { ReportingWidget } from "@/components/reporting/reporting-widget";
import { catalog } from "@/lib/catalog";
import "./globals.css";
export const metadata: Metadata = {
  title: "Cojeev UI",
  description: "Cojeev React components and shadcn registry.",
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
