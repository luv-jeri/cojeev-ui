import Link from "next/link";
import { DocsPage } from "fumadocs-ui/page";
import { catalog, publicURL } from "@/lib/catalog";
import { InstallCommand } from "@/components/install-command";
import { Badge } from "@/registry/sahajiv/ui/badge";
import { CodeBlock } from "@/registry/sahajiv/ui/code-block";
import { Display, SectionTitle, Body, BodySecondary } from "@/registry/sahajiv/ui/typography";
export default function Documentation() {
  return <DocsPage full breadcrumb={{ enabled: false }} footer={{ enabled: false }} tableOfContent={{ enabled: false }} tableOfContentPopover={{ enabled: false }}>
    <article className="docs-article">
      <header className="docs-intro"><Badge variant="pink-soft">Getting started</Badge><Display as="h1">Make it yours.</Display><BodySecondary>{catalog().length} reusable entries, one visual family. Install only the pieces you need, then edit the source in your own project.</BodySecondary></header>
      <section className="docs-section"><SectionTitle as="h2">1. Prepare your project</SectionTitle><Body>Use React, TypeScript and Tailwind CSS v4. Configure your project with the shadcn CLI, including a stylesheet and the @/ import alias.</Body><InstallCommand command="npx shadcn@latest init" /><BodySecondary>Start with the <a href="https://ui.shadcn.com/docs/installation">official shadcn installation guide</a> for your framework. This library is developed with React 19.</BodySecondary></section>
      <section className="docs-section"><SectionTitle as="h2">2. Add a component</SectionTitle><InstallCommand command={`npx shadcn@latest add ${publicURL}/r/button.json`} /><Body>The registry includes its source, required primitives, exact CSS, shared motion utilities and licensed fonts. You own the copied files.</Body><CodeBlock language="tsx" title="A simple action" code={'import { Button } from "@/components/ui/button";\n\nexport function ContinueAction() {\n  return <Button onClick={() => console.log("Continue")}>Continue</Button>;\n}'} /></section>
      <section className="docs-section"><SectionTitle as="h2">3. Choose the appearance</SectionTitle><Body>Set data-mode on the document element. Light and dark use the same spacing, typography and component structure.</Body><CodeBlock language="ts" code={'document.documentElement.dataset.mode = "dark"; // or "light"'} /><BodySecondary>Keep one global stylesheet importing Tailwind and the styles added by the installer. The bundled font licences must stay with the distributed font files.</BodySecondary></section>
      <section className="docs-section"><SectionTitle as="h2">4. Give motion a character</SectionTitle><Body>Open Motion settings beside any example to try all nine selection presets. Glide is calm by default. Copy selection settings into your application, or install the Motion Adjuster for deeper control.</Body><InstallCommand command={`npx shadcn@latest add ${publicURL}/r/adjuster.json`} /><BodySecondary>Settings persist in this browser. Reduced motion takes priority, and Off keeps controls functional and still. The 3D scene loads Three.js only when you install and use that entry.</BodySecondary></section>
      <nav className="docs-related" aria-label="Start exploring"><Link className="docs-related-link" href="/docs/button/">Explore components <span aria-hidden="true">↗</span></Link><Link className="docs-related-link" href="/docs/adjuster/">Explore motion <span aria-hidden="true">↗</span></Link><a className="docs-related-link" href="https://github.com/luv-jeri/sahajiv-ui">Source on GitHub <span aria-hidden="true">↗</span></a></nav>
    </article>
  </DocsPage>;
}
