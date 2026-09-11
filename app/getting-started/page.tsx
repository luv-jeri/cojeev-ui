import Link from "next/link";
import { GuideShell } from "@/components/landing/guide-shell";
import { InstallCommand } from "@/components/install-command";
import { CodeBlock } from "@/registry/cojeev/ui/code-block";
import { Button } from "@/registry/cojeev/ui/button";
import { installCommand, pageMetadata, site } from "@/lib/site-config";
import "@/components/landing/landing.css";

export const metadata = pageMetadata("Get started", "Add your first 000h component to a React project. Install editable source with the shadcn CLI, then make it your own.", "/getting-started/");

export default function GettingStartedPage() {
  return <GuideShell eyebrow="A small beginning" title="Make something yours." intro="Start with one button. The shadcn CLI brings the component and its shared pieces into your project as editable source.">
    <section><h2>01 / Prepare your project</h2><p>Use a React 19 project with TypeScript, Tailwind CSS v4, and an <code>@/</code> import alias. If you have not set up shadcn yet, run:</p><InstallCommand command="npx shadcn@latest init" /><p>New to the setup? Follow the <a href="https://ui.shadcn.com/docs/installation">official shadcn installation guide</a> for your framework, then come back here.</p></section>
    <section><h2>02 / Bring in a button</h2><InstallCommand command={installCommand("button")} componentId="button" /><p>The CLI adds the button, its dependencies, and the shared theme, fonts and motion helpers. Review its prompts if your project already has files with the same names.</p><div className="launch-first-preview"><Button variant="accent">A little more alive</Button></div></section>
    <section><h2>03 / Put it to work</h2><CodeBlock language="tsx" code={'import { Button } from "@/components/ui/button";\n\nexport function Example() {\n  return <Button variant="accent">A little more alive</Button>;\n}'} /><p>That source is now part of your project. Change the label, compose it with other components, or adapt the styling. <Link href="/docs/button/">The button documentation</Link> covers its variants, sizes and accessibility.</p></section>
    <section><h2>04 / Find your next piece</h2><p>Each component has a working preview, example source, and an install command. Shared dependencies are included; composed examples may also list additional components.</p><p><Link href="/docs/">Browse all components →</Link></p><div className="launch-guide-note"><p>The library supports light and dark appearances. Set <code>document.documentElement.dataset.mode</code> to <code>&quot;dark&quot;</code> or <code>&quot;light&quot;</code>. Explore <Link href="/docs/appearance/">appearance</Link> and <Link href="/docs/adjuster/">motion settings</Link> when you are ready to add controls.</p></div></section>
    <section><h2>Prefer a short install command?</h2><p>Add this registry entry to your app’s existing <code>components.json</code>. Keep its other configuration fields.</p><CodeBlock language="json" code={JSON.stringify({ registries: { "@cojeev": `${site.registryUrl}/r/{name}.json` } }, null, 2)} /><InstallCommand command="npx shadcn@latest add @cojeev/button" componentId="button" /><p><strong>000h by Cojeev</strong> is the library name. The <code>@cojeev</code> namespace and component paths stay compatible with existing projects. The short command needs the registry entry above.</p></section>
    <section><h2>Build freely.</h2><p>The library is MIT licensed and can be used in commercial projects. Keep the included license and attribution notices. Installed components contain no website analytics.</p><p><a href={`${site.sourceUrl}/blob/main/INSTALLATION.md`}>Read the full installation notes</a> · <Link href="/about/">Meet the maker</Link></p></section>
  </GuideShell>;
}
