import { pageMetadata } from "@/lib/site-config";
import Link from "next/link";
import { DocsPage } from "fumadocs-ui/page";
import { catalog, publicURL } from "@/lib/catalog";
import { InstallCommand } from "@/components/install-command";
import { DocsIntroArtwork } from "@/components/docs-atmosphere";
import { Badge } from "@/registry/cojeev/ui/badge";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { ShapeArtwork } from "@/registry/cojeev/ui/shape-artwork";
import { CodeBlock } from "@/registry/cojeev/ui/code-block";
import {
  Display,
  SectionTitle,
  Body,
  BodySecondary,
} from "@/registry/cojeev/ui/typography";
export const metadata = pageMetadata(
  "Components",
  "Explore expressive React components, try their working examples, and copy editable source into your project.",
  "/docs/",
);

export default function Documentation() {
  return (
    <DocsPage
      full
      breadcrumb={{ enabled: false }}
      footer={{ enabled: false }}
      tableOfContent={{ enabled: false }}
      tableOfContentPopover={{ enabled: false }}
    >
      <article className="docs-article docs-workshop" data-setup-workbench>
        <header className="docs-intro docs-intro-welcome">
          <Badge variant="pink-soft">Your starting point</Badge>
          <Display as="h1">Make it yours.</Display>
          <BodySecondary>
            {catalog().length} reusable entries, one visual family. Start with a
            small piece. Change its character. Keep the source.
          </BodySecondary>
          <DocsIntroArtwork seed="docs-home" />
          <nav
            className="docs-workshop__shortcuts"
            aria-label="Getting started shortcuts"
          >
            <Button asChild>
              <a href="#prepare">
                Start building <AnimatedIcon name="arrow-down" />
              </a>
            </Button>
            <Button asChild variant="ghost">
              <Link href="/requests/">
                Request board <AnimatedIcon name="arrow-up-right" />
              </Link>
            </Button>
          </nav>
        </header>

        <section
          className="docs-workshop__studios"
          aria-labelledby="studios-heading"
        >
          <div className="docs-workshop__section-label">
            <span>01 / Explore</span>
            <h2 id="studios-heading">Three doors into the library.</h2>
          </div>
          <div className="docs-workshop__doors">
            <Button asChild variant="ghost" className="docs-workshop__door">
              <Link href="/docs/icon/">
                <span className="docs-workshop__door-art" data-tone="blue">
                  <AnimatedIcon name="sparkles" size="lg" />
                </span>
                <span>
                  <strong>Icon library</strong>
                  <small>Find a mark. Give it a character.</small>
                </span>
                <AnimatedIcon name="arrow-up-right" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="docs-workshop__door">
              <Link href="/docs/shape/">
                <span className="docs-workshop__door-art">
                  <ShapeArtwork
                    name="daisy-12"
                    tone="pink"
                    shadow={false}
                    echo={false}
                  />
                </span>
                <span>
                  <strong>Shape studio</strong>
                  <small>Compose a silhouette. Take it with you.</small>
                </span>
                <AnimatedIcon name="arrow-up-right" />
              </Link>
            </Button>
            <Button asChild variant="ghost" className="docs-workshop__door">
              <Link href="/docs/bento-grid/">
                <span className="docs-workshop__door-art" data-tone="olive">
                  <span
                    className="docs-workshop__mini-bento"
                    aria-hidden="true"
                  >
                    <i />
                    <i />
                    <i />
                  </span>
                </span>
                <span>
                  <strong>Bento studio</strong>
                  <small>Arrange an idea, one piece at a time.</small>
                </span>
                <AnimatedIcon name="arrow-up-right" />
              </Link>
            </Button>
          </div>
        </section>

        <section
          className="docs-workshop__setup"
          aria-labelledby="setup-heading"
        >
          <div className="docs-workshop__section-label">
            <span>02 / Build</span>
            <h2 id="setup-heading">From first install to your own style.</h2>
          </div>
          <div className="docs-workshop__steps">
            <section id="prepare" data-setup-step>
              <span className="docs-workshop__step-number" aria-hidden="true">
                01
              </span>
              <div className="docs-workshop__step-copy">
                <SectionTitle as="h3">Prepare your project</SectionTitle>
                <Body>
                  React, TypeScript and Tailwind CSS v4. Configure a stylesheet
                  and the @/ import alias with the shadcn CLI.
                </Body>
                <BodySecondary>
                  Follow the{" "}
                  <a href="https://ui.shadcn.com/docs/installation">
                    official installation guide
                  </a>{" "}
                  for your framework. This library is developed with React 19.
                </BodySecondary>
              </div>
              <div className="docs-workshop__step-source">
                <InstallCommand command="npx shadcn@latest init" />
                <span className="docs-workshop__caption">
                  Once per project · your foundation
                </span>
              </div>
            </section>
            <section data-setup-step>
              <span className="docs-workshop__step-number" aria-hidden="true">
                02
              </span>
              <div className="docs-workshop__step-copy">
                <SectionTitle as="h3">Add your first piece</SectionTitle>
                <Body>
                  Start with a button. The installer brings its source, required
                  primitives, exact CSS, shared motion utilities and licensed
                  fonts.
                </Body>
                <BodySecondary>
                  You own the copied files. Nothing here needs to stay a black
                  box.
                </BodySecondary>
              </div>
              <div className="docs-workshop__step-source">
                <InstallCommand
                  componentId="button"
                  command={`npx shadcn@latest add ${publicURL}/r/button.json`}
                />
                <CodeBlock
                  language="tsx"
                  title="Your first action"
                  code={
                    'import { Button } from "@/components/ui/button";\n\nexport function ContinueAction() {\n  return (\n    <Button onClick={() => console.log("Continue")}>\n      Continue\n    </Button>\n  );\n}'
                  }
                />
              </div>
            </section>
            <section data-setup-step>
              <span className="docs-workshop__step-number" aria-hidden="true">
                03
              </span>
              <div className="docs-workshop__step-copy">
                <SectionTitle as="h3">Make the paper yours</SectionTitle>
                <Body>
                  Light and dark share the same spacing, typography and
                  structure. Set data-mode on the document element.
                </Body>
                <BodySecondary>
                  Keep one global stylesheet importing Tailwind and the
                  installed styles. Keep the bundled font licences with their
                  files.
                </BodySecondary>
              </div>
              <div className="docs-workshop__step-source">
                <div className="docs-workshop__paper-pair" aria-hidden="true">
                  <span>
                    Aa<small>Paper</small>
                  </span>
                  <span>
                    Aa<small>After hours</small>
                  </span>
                </div>
                <CodeBlock
                  language="ts"
                  title="Choose the light"
                  code={
                    'document.documentElement.dataset.mode = "dark";\n// Use "light" for the paper theme.'
                  }
                />
              </div>
            </section>
            <section data-setup-step>
              <span className="docs-workshop__step-number" aria-hidden="true">
                04
              </span>
              <div className="docs-workshop__step-copy">
                <SectionTitle as="h3">Set the pace</SectionTitle>
                <Body>
                  Try all nine selection presets in Motion settings beside an
                  example. Glide is calm by default. Copy the settings, or add
                  the Motion Adjuster for deeper control.
                </Body>
                <BodySecondary>
                  Settings persist in this browser. Reduced motion takes
                  priority; Off keeps every control functional and still.
                  Three.js loads only when you install and use the 3D scene.
                </BodySecondary>
              </div>
              <div className="docs-workshop__step-source">
                <InstallCommand
                  componentId="adjuster"
                  command={`npx shadcn@latest add ${publicURL}/r/adjuster.json`}
                />
                <Button asChild variant="secondary">
                  <Link href="/docs/adjuster/">
                    Find your rhythm <AnimatedIcon name="arrow-up-right" />
                  </Link>
                </Button>
              </div>
            </section>
          </div>
        </section>
        <nav className="docs-related" aria-label="Start exploring">
          <Button asChild variant="secondary" className="docs-related-link">
            <Link href="/docs/button/">
              Explore components <AnimatedIcon name="arrow-up-right" />
            </Link>
          </Button>
          <Button asChild variant="secondary" className="docs-related-link">
            <Link href="/docs/adjuster/">
              Explore motion <AnimatedIcon name="arrow-up-right" />
            </Link>
          </Button>
          <Button asChild variant="ghost" className="docs-related-link">
            <a href="https://github.com/luv-jeri/cojeev-ui">
              Source on GitHub <AnimatedIcon name="arrow-up-right" />
            </a>
          </Button>
        </nav>
      </article>
    </DocsPage>
  );
}
