import { RootProvider } from "fumadocs-ui/provider/next";
import { catalog } from "@/lib/catalog";
import { DocsShell } from "@/components/docs-shell";
import "./docs.css";
export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const entries = catalog().map((entry) => ({
    name: entry.name,
    title: entry.title,
    baseComponent: entry.meta.baseComponent,
    category: entry.meta.category,
  }));
  return (
    <RootProvider theme={{ enabled: false }} search={{ enabled: false }}>
      <DocsShell entries={entries}>{children}</DocsShell>
    </RootProvider>
  );
}
