import { notFound } from "next/navigation";
import Link from "next/link";
import { DocsPage } from "fumadocs-ui/page";
import { catalog, componentGuide, publicURL } from "@/lib/catalog";
import { ComponentPreview } from "@/components/component-preview";
import { InstallCommand } from "@/components/install-command";
import { exampleManifest, type ExampleId } from "@/components/examples/manifest";
import { exampleSource } from "@/components/example-source";
import { componentHandoffNotes } from "@/lib/component-handoff";
import { Badge } from "@/registry/cojeev/ui/badge";
import { ReadingTrail } from "@/registry/cojeev/ui/reading-trail";
import {
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/registry/cojeev/ui/table";
import {
  Typography,
  Display,
  SectionTitle,
  Title,
  Body,
  BodySecondary,
  Meta,
  Identifier,
} from "@/registry/cojeev/ui/typography";
export function generateStaticParams() {
  return catalog().map((item) => ({ component: item.name }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ component: string }>;
}) {
  const { component } = await params;
  const entry = catalog().find((item) => item.name === component);
  return {
    title: entry ? `${entry.title} · Cojeev UI` : "Component not found",
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ component: string }>;
}) {
  const { component } = await params;
  const entry = catalog().find((item) => item.name === component);
  if (!entry) notFound();
  const guide = componentGuide(entry.name);
  const variants = [...new Set(["default", ...entry.meta.source.variants])];
  const sizes = [...new Set(["default", ...entry.meta.source.sizes])];
  const completeCode = exampleSource(entry.name);
  const code = { source: completeCode.slice(0, completeCode.lastIndexOf("\nexport default function Demo()")), name: exampleManifest[entry.name as ExampleId].name };
  const exampleDependencies = [
    ...new Set(
      [...completeCode.matchAll(/"@\/components\/ui\/([^"\n]+)"/g)].map(
        (match) => match[1],
      ),
    ),
  ];
  return (
    <DocsPage
      full
      breadcrumb={{ enabled: false }}
      footer={{ enabled: false }}
      tableOfContent={{ enabled: false }}
      tableOfContentPopover={{ enabled: false }}
    >
      <div className="docs-page-grid">
        <article className="docs-article">
          <header className="docs-intro">
            <nav className="docs-breadcrumb" aria-label="Breadcrumb">
              <Link href="/docs/">Components</Link>
              <span aria-hidden="true">/</span>
              <span>{entry.title}</span>
            </nav>
            <div className="docs-title-row">
              <Display as="h1">{entry.title}</Display>
              <Badge variant={entry.meta.baseComponent ? "pink-soft" : "olive-soft"}>
                {entry.meta.category}
              </Badge>
            </div>
            <BodySecondary>{entry.description}</BodySecondary>
            <Meta className="docs-intro-meta">React · copy into your project · light and dark themes</Meta>
          </header>
          <section className="docs-section docs-example-section" aria-labelledby="example-heading">
            <div className="docs-section-lead">
              <SectionTitle id="example-heading">Try it</SectionTitle>
            </div>
            <ComponentPreview
              key={entry.name}
              id={entry.name}
              variants={variants}
              sizes={sizes}
              code={code}
              handoffNotes={componentHandoffNotes(entry, guide, exampleDependencies)}
            />
          </section>
          {entry.name === "agent-chat" && <Body><Link href="/workspace/">Open the full agent workspace example →</Link></Body>}
          <section className="docs-section" aria-labelledby="install-heading">
            <SectionTitle id="install-heading">{entry.meta.source.reviewOnly ? "Local review" : "Add to your project"}</SectionTitle>
            {entry.meta.source.reviewOnly ? <BodySecondary>This addition is available in the local preview. You can copy its example above; the installable registry entry will follow after owner review.</BodySecondary> : <>
            <InstallCommand
              command={`npx shadcn@latest add ${publicURL}/r/${entry.name}.json`}
            />
            <BodySecondary>
              The command includes the component’s shared dependencies.
              Your project keeps editable source files.
            </BodySecondary>
            {exampleDependencies.length > 1 && (
              <>
                <Title as="h3">Include the complete example</Title>
                <BodySecondary>
                  This example also composes{" "}
                  {exampleDependencies
                    .filter((id) => id !== entry.name)
                    .join(", ")}
                  . Install its parts together:
                </BodySecondary>
                <InstallCommand
                  command={`npx shadcn@latest add ${exampleDependencies.map((id) => `${publicURL}/r/${id}.json`).join(" ")}`}
                />
              </>
            )}
            </>}
          </section>
          <section className="docs-section" aria-labelledby="usage-heading">
            <SectionTitle id="usage-heading">Using {entry.title.toLowerCase()}</SectionTitle>
            <ul className="docs-guidance">
              {guide.usage.map((note) => <li key={note}><Body>{note}</Body></li>)}
            </ul>
          </section>
          <section className="docs-section" aria-labelledby="props-heading">
            <SectionTitle id="props-heading">API</SectionTitle>
            <Typography>
              <Body>
                Compose the exported parts below. The prop types are read from the
                React source during the registry build.
              </Body>
              <BodySecondary>
                Native element or underlying primitive props are inherited where
                declared, including accessible labels, event handlers and refs.
              </BodySecondary>
            </Typography>
            {entry.meta.api.map((api) => (
              <section key={api.name} className="docs-api-section">
                <Title as="h3" className="docs-api-title">{api.name}</Title>
                {api.props.length ? (
                  <TableContainer className="docs-props">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Prop</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Required</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {api.props.map((prop) => (
                          <TableRow key={prop.name}>
                            <TableCell>
                              <Identifier>{prop.name}</Identifier>
                              {prop.description && (
                                <BodySecondary>{prop.description}</BodySecondary>
                              )}
                            </TableCell>
                            <TableCell>
                              <code>{prop.type}</code>
                            </TableCell>
                            <TableCell>{prop.required ? "Yes" : "No"}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                ) : (
                  <BodySecondary>
                    Accepts the native or primitive props declared by its exported
                    TypeScript type.
                  </BodySecondary>
                )}
              </section>
            ))}
          </section>
          <section className="docs-section" aria-labelledby="accessibility-heading">
            <SectionTitle id="accessibility-heading">Accessibility</SectionTitle>
            <ul className="docs-guidance">
              {guide.accessibility.map((note) => <li key={note}><Body>{note}</Body></li>)}
            </ul>
          </section>
          <section className="docs-section" aria-labelledby="states-heading">
            <SectionTitle id="states-heading">States and appearance</SectionTitle>
            <div className="docs-section-heading">
              {entry.meta.source.states.map((state) => (
                <Badge key={state} variant="cream" size="sm">
                  {state}
                </Badge>
              ))}
            </div>
            <BodySecondary>
              For conditional content, keep a <Link href="/docs/presence/">MotionPresence boundary</Link> around keyed MotionSurface children. The shared entrance and exit states work with native primitives and respect your motion preference.
            </BodySecondary>
            <BodySecondary>
              Try pointer and keyboard interaction, and switch the appearance
              control in the navigation to compare light and dark mode. Motion
              respects reduced motion preferences.
            </BodySecondary>
          </section>
          <nav className="docs-section" aria-label="Related components">
            <SectionTitle id="related-heading">Works well with</SectionTitle>
            <div className="docs-related">
              {guide.related.map((id) => {
                const related = catalog().find((item) => item.name === id);
                return related && <Link key={id} href={`/docs/${id}/`} className="docs-related-link">{related.title}<span aria-hidden="true">↗</span></Link>;
              })}
            </div>
          </nav>
        </article>
        <aside className="docs-contents">
          <ReadingTrail items={[
            { id: "example-heading", label: "Try it" },
            { id: "install-heading", label: entry.meta.source.reviewOnly ? "Local review" : "Installation" },
            { id: "usage-heading", label: "Usage" },
            { id: "props-heading", label: "API" },
            { id: "accessibility-heading", label: "Accessibility" },
            { id: "states-heading", label: "States & appearance" },
            { id: "related-heading", label: "Related components" },
          ]} offset={64} />
        </aside>
      </div>
    </DocsPage>
  );
}
