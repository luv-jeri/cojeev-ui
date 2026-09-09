import type { CatalogEntry, ComponentGuide } from "./catalog";

/** A fence longer than any fence in the content preserves copied code verbatim. */
export function handoffCodeFence(code: string, language = "tsx") {
  const longest = Math.max(2, ...Array.from(code.matchAll(/`+/g), match => match[0].length));
  const fence = "`".repeat(longest + 1);
  return `${fence}${language}\n${code}\n${fence}`;
}

/** Public component information only; no filesystem paths or private project state. */
export function componentHandoffNotes(entry: CatalogEntry, guide: ComponentGuide, dependencies: string[]) {
  const unique = [...new Set([entry.name, ...dependencies])];
  const list = (notes: string[]) => notes.map(note => `- ${note}`).join("\n");
  return [
    `# ${entry.title} · Cojeev UI`,
    entry.description,
    `Category: ${entry.meta.category}\nComponent ID: ${entry.name}`,
    entry.meta.source.reviewOnly
      ? "Availability: local review addition. This component is not yet available from the public registry. The example assumes its local source and shared styles are present."
      : "Availability: this guide describes the local source. Check the component's installation section for registry instructions; the public release can differ from this preview.",
    "## Parts used by this example\n" + list(unique),
    "The example uses the @/components/ui alias. Keep each component's shared styles, tokens and motion helpers when moving its source into your project.",
    "## Usage\n" + list(guide.usage),
    "## Accessibility\n" + list(guide.accessibility),
    "## API\n" + entry.meta.api.map(api => `### ${api.name}\n` + (api.props.length
      ? api.props.map(prop => `- ${prop.name}${prop.required ? " (required)" : " (optional)"}: ${prop.type}${prop.description ? ` — ${prop.description}` : ""}`).join("\n")
      : "Inherits the native or primitive props declared in its exported TypeScript type.")).join("\n\n"),
    "## States\n" + list(entry.meta.source.states),
    "## Related components\n" + list(guide.related),
  ].join("\n\n");
}

export function componentHandoffPacket(notes: string, code: string, variant: string, size: string) {
  return `${notes}\n\n## Selected example\n\nVariant: ${variant}\nSize: ${size}\n\nThis captures the preview's variant and size. Values changed inside the interactive example are not serialized.\n\n${handoffCodeFence(code)}\n`;
}
