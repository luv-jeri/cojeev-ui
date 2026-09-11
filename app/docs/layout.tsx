import { RootProvider } from "fumadocs-ui/provider/next";
import { documentationCatalog } from "@/lib/catalog";
import { DocsShell } from "@/components/docs-shell";
import "./docs.css";
import "@/components/docs-search.css";
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const entries = documentationCatalog().map((entry) => ({
    name: entry.name,
    title: entry.title,
    baseComponent: entry.meta.baseComponent,
    category: entry.meta.category,
    description: entry.description,
    previewVariant: entry.meta.source.variants[0] ?? "default",
  }));
  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      <DocsShell entries={entries} searchUrl={`${process.env.COJEEV_BASE_PATH ?? "/cojeev-ui"}/docs-search.json`}>{children}</DocsShell>
    </RootProvider>
  );
}
