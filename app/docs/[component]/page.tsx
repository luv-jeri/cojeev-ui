import { notFound } from "next/navigation";
import Link from "next/link";
import { DocsPage } from "fumadocs-ui/page";
import { catalog, componentGuide, publicURL } from "@/lib/catalog";
import { ComponentPreview } from "@/components/component-preview";
import { InstallCommand } from "@/components/install-command";
import { exampleSource } from "@/components/example-source";
import { Badge } from "@/registry/sahajiv/ui/badge";
import {
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/registry/sahajiv/ui/table";
import {
  Typography,
  Display,
  SectionTitle,
  Title,
  Body,
  BodySecondary,
  Meta,
  Identifier,
} from "@/registry/sahajiv/ui/typography";
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
    title: entry ? `${entry.title} · SahaJiv UI` : "Component not found",
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
  const code = Object.fromEntries(
    variants.flatMap((variant) => sizes.map((size) => [
      `${variant}:${size}`,
      exampleSource(entry.name, variant, size),
    ])),
  );
  const exampleDependencies = [
    ...new Set(
      [...code["default:default"].matchAll(/"@\/components\/ui\/([^"\n]+)"/g)].map(
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
      <div className="docs-article">
        <header className="docs-intro">
          <Badge
            variant={entry.meta.baseComponent ? "pink-soft" : "olive-soft"}
          >
            {entry.meta.category}
          </Badge>
          <Display as="h1">{entry.title}</Display>
          <BodySecondary>{entry.description}</BodySecondary>
          <Meta>React · copy into your project · light and dark themes</Meta>
        </header>
        <section className="docs-section" aria-labelledby="example-heading">
          <SectionTitle id="example-heading">Try it</SectionTitle>
          <Body>
            Explore the variants, try the interaction, then copy the code.
          </Body>
          <ComponentPreview
            key={entry.name}
            id={entry.name}
            variants={variants}
            sizes={sizes}
            code={code}
          />
        </section>
        <section className="docs-section" aria-labelledby="usage-heading">
          <SectionTitle id="usage-heading">Using {entry.title.toLowerCase()}</SectionTitle>
          <ul className="docs-guidance">
            {guide.usage.map((note) => <li key={note}><Body>{note}</Body></li>)}
          </ul>
        </section>
        <section className="docs-section" aria-labelledby="install-heading">
          <SectionTitle id="install-heading">Add to your project</SectionTitle>
          <InstallCommand
            command={`npx shadcn@latest add ${publicURL}/r/${entry.name}.json`}
          />
          <BodySecondary>
            The public install URL is available after this registry is
            published. The command includes the component’s shared dependencies.
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
            <section key={api.name} className="docs-section">
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
        <section className="docs-section">
          <SectionTitle>States and appearance</SectionTitle>
          <div className="docs-section-heading">
            {entry.meta.source.states.map((state) => (
              <Badge key={state} variant="cream" size="sm">
                {state}
              </Badge>
            ))}
          </div>
          <BodySecondary>
            Try pointer and keyboard interaction, and switch the appearance
            control in the navigation to compare light and dark mode. Motion
            respects reduced motion preferences.
          </BodySecondary>
        </section>
        <nav className="docs-section" aria-label="Related components">
          <SectionTitle>Works well with</SectionTitle>
          <div className="docs-related">
            {guide.related.map((id) => {
              const related = catalog().find((item) => item.name === id);
              return related && <Link key={id} href={`/docs/${id}/`} className="docs-related-link">{related.title}<span aria-hidden="true">↗</span></Link>;
            })}
          </div>
        </nav>
      </div>
    </DocsPage>
  );
}
