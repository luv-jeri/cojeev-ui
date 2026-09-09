import Link from "next/link";
import { DocsPage } from "fumadocs-ui/page";
import references from "@/data/reference-effects.json";
import { catalog } from "@/lib/catalog";
import { Display, SectionTitle, Body, BodySecondary, Title } from "@/registry/cojeev/ui/typography";
import { Badge } from "@/registry/cojeev/ui/badge";

export const metadata = { title: "Reference effects · Cojeev UI" };
type Reference = { id: string; name: string; reference: string; existingId?: string; status?: string; landing: string; notes: string };
export default function ReferenceGuide() {
  const entries = catalog();
  const rows = references as Reference[];
  return <DocsPage full breadcrumb={{ enabled: false }} footer={{ enabled: false }} tableOfContent={{ enabled: false }} tableOfContentPopover={{ enabled: false }}>
    <article className="docs-article">
      <header className="docs-intro"><Badge variant="pink-soft">Reference collection</Badge><Display as="h1">Motion, made ours.</Display><BodySecondary>{rows.length} references mapped to the Cojeev family. Existing effects keep their names; new mechanisms get their own components.</BodySecondary></header>
      <section className="docs-section"><SectionTitle as="h2">A landing page with room to breathe</SectionTitle><Body>Start with the existing Text Reveal for one clear headline. Let Scroll Reveal pace the story, then Scroll Expand open a product demonstration. Use Accordion Gallery to explore the component family. A single Wave Wipe can bridge two scenes.</Body><BodySecondary>Keep cursor effects, falling words and denser fields inside an optional playground with pause controls. Avoid stacking several continuous animations in the same viewport. On touch and reduced motion, the content and ordinary controls remain the main experience.</BodySecondary></section>
      <section className="docs-section"><SectionTitle as="h2">Already in the family</SectionTitle><Body>Text Loop, Circular Text and Curved Loop use Text Ribbon. Split Text uses Text Reveal. Text Pressure is the pressure variant of Variable Proximity. Image Masking and Clip Path share one component with mask and clip methods. These six mappings avoid duplicate registry entries.</Body></section>
      <section className="docs-section"><SectionTitle as="h2">Every reference, one clear home</SectionTitle><div style={{ display: "grid", gap: 28 }}>
        {rows.map(row => { const id = row.existingId ?? row.id; const entry = entries.find(item => item.name === id); return <section key={row.id} style={{ display: "grid", gap: 8 }}>
          <Title as="h3"><Link href={`/docs/${id}/`}>{row.name}{row.existingId ? ` → ${entry?.title ?? id}` : ""}</Link></Title>
          <BodySecondary>{entry?.meta.category}</BodySecondary>
          <Body>{row.landing}</Body>
          <BodySecondary>{row.notes}</BodySecondary>
          <a href={row.reference} target="_blank" rel="noreferrer" style={{ fontSize: 14, width: "fit-content" }}>View original reference ↗</a>
        </section>; })}
      </div></section>
      <section className="docs-section"><SectionTitle as="h2">Ready for your project</SectionTitle><BodySecondary>Every component page includes a live example, copyable source, an installation command and the component API. Install the variants you need from the public Cojeev registry.</BodySecondary></section>
    </article>
  </DocsPage>;
}
