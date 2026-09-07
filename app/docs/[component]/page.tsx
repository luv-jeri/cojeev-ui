import { notFound } from "next/navigation";
import { DocsPage, DocsBody, DocsTitle, DocsDescription } from "fumadocs-ui/page";
import { catalog,publicURL } from "@/lib/catalog";
import { ComponentPreview } from "@/components/component-preview";
import { InstallCommand } from "@/components/install-command";

export function generateStaticParams(){return catalog().map(item=>({component:item.name}));}
export default async function Page({params}:{params:Promise<{component:string}>}){
  const {component}=await params;
  const entry=catalog().find(item=>item.name===component);
  if(!entry)notFound();
  return <DocsPage><DocsTitle>{entry.title}</DocsTitle><DocsDescription>{entry.description}</DocsDescription><DocsBody>
    <p>Preview: visual and interaction verification is in progress.</p>
    <h2>Install</h2><InstallCommand command={`npx shadcn@latest add ${publicURL}/r/${entry.name}.json`}/>
    <p>The registry URL will become available when publication passes the fidelity gate.</p>
    <h2>Variants</h2><div className="not-prose"><ComponentPreview id={entry.name} variants={["default",...entry.meta.source.variants]} sizes={["default",...entry.meta.source.sizes]}/></div>
    <h2>Props</h2><p>Types below are read from the component source during the registry build. Native React element props, including <code>className</code>, <code>ref</code> and <code>children</code>, are also supported.</p>
    {entry.meta.api.map(api=><section key={api.name}><h3>{api.name}</h3><div style={{overflowX:"auto"}}><table><thead><tr><th>Prop</th><th>Type</th><th>Required</th></tr></thead><tbody>{api.props.map(prop=><tr key={prop.name}><td><code>{prop.name}</code>{prop.description&&<p>{prop.description}</p>}</td><td><code>{prop.type}</code></td><td>{prop.required?"Yes":"No"}</td></tr>)}</tbody></table></div></section>)}
    <h2>States</h2><p>{entry.meta.source.states.join(" · ")}</p>
    <p>Use the theme selector to preview the components in light and dark mode.</p>
  </DocsBody></DocsPage>;
}
