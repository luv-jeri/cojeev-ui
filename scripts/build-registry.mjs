import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { execFileSync } from "node:child_process";
import { componentAPIs } from "./component-api.mjs";

const baseURL=process.env.SAHAJIV_REGISTRY_URL??"https://luv-jeri.github.io/sahajiv-ui";
const source="registry/sahajiv";
const ids=fs.readdirSync(`${source}/ui`).filter(file=>file.endsWith(".tsx")).map(file=>file.slice(0,-4)).sort();
// The shadcn installer resolves registered modules by basename. A helper with
// the same basename as a UI entry can therefore become a circular UI import.
for (const folder of ["lib", "motion"]) for (const file of fs.readdirSync(`${source}/${folder}`)) {
  if (/\.tsx?$/.test(file) && ids.includes(file.replace(/\.tsx?$/, ""))) throw new Error(`Rename private helper ${folder}/${file}: its name collides with an installable UI entry.`);
}
const apis=componentAPIs(ids);
const guides=JSON.parse(fs.readFileSync("data/component-guides.json","utf8"));
const additions=JSON.parse(fs.readFileSync("data/component-additions.json","utf8"));
const reference=JSON.parse(fs.readFileSync("reference/sahajiv-handoff-v4/data/registry.json","utf8")).entries;
function declarations(nodes){const out={};for(const node of nodes??[]){if(node.type==="comment")continue;if(node.type==="decl"){if(node.important)throw new Error(`Importance flag in production CSS: ${node.toString()}`);out[node.prop]=node.value;continue;}const key=node.type==="atrule"?`@${node.name}${node.params?` ${node.params}`:""}`:node.selector;const value=node.nodes?declarations(node.nodes):{};if(key==="@font-face"&&out[key])out[key]=Array.isArray(out[key])?[...out[key],value]:[out[key],value];else out[key]={...out[key],...value};}return out;}
function css(file){return declarations(postcss.parse(fs.readFileSync(file,"utf8")).nodes);}
// CSS is delivered verbatim. Registry JSON objects cannot preserve repeated
// selectors or the ordering of shorthand and longhand declarations.
const foundationStyles=["tokens","theme","base","morph","flow-press"];
const foundation=Object.fromEntries(["@/styles/sahajiv-fonts.css",...foundationStyles.map(name=>`@/styles/sahajiv/${name}.css`)].map(file=>[`@import "${file}"`,{}]));
const themeCSS=css(`${source}/styles/theme.css`);
const theme=Object.fromEntries(Object.entries(themeCSS["@theme inline"]).map(([key,value])=>[key.replace(/^--/,""),value]));
// A base installed as a component dependency does not replace shadcn's existing
// cssVars. Merge the semantic aliases after its starter rules so the public
// one-command install uses our surfaces in both documented data-mode states.
const semanticNames=/^--(?:background|foreground|card(?:-.+)?|popover(?:-.+)?|primary(?:-.+)?|secondary(?:-.+)?|accent(?:-.+)?|muted(?:-.+)?|border|input|ring|destructive(?:-.+)?|chart-\d+|sidebar(?:-.+)?)$/;
const layoutNames=new Set(["--card-pad","--card-gap","--sidebar-w","--sidebar-w-mini","--sidebar-gap"]);
foundation[":root, :root[data-mode]"]=Object.fromEntries(Object.entries(css(`${source}/styles/tokens.css`)[":root"]).filter(([name])=>semanticNames.test(name)&&!layoutNames.has(name)));
for(const [rule,value] of Object.entries(themeCSS))if(rule.startsWith("@custom-variant "))foundation[rule]=value;
const base={name:"sahajiv",type:"registry:base",extends:"none",title:"SahaJiv",description:"SahaJiv tokens, fonts, reset, and Tailwind v4 theme bridge.",dependencies:["class-variance-authority","clsx","tailwind-merge","tw-animate-css","motion"],config:{style:"new-york",iconLibrary:"lucide",tailwind:{baseColor:"neutral"},registries:{"@sahajiv":`${baseURL}/r/{name}.json`}},files:[{path:`${source}/lib/utils.ts`,type:"registry:lib",target:"lib/utils.ts"}],css:foundation};
function fileImports(file) {
  return [...fs.readFileSync(file,"utf8").matchAll(/(?:from\s+|import\s+|import\s*\(\s*)["']([^"']+)["']/g)].map(match=>sourceImport(file,match[1]));
}
function componentImports(id) {
  const imported = new Set(fileImports(`${source}/ui/${id}.tsx`));
  const helpers = new Set();
  // JSX helpers depend on UI primitives, so install them with their owning
  // components instead of making every foundation consumer depend on charts.
  for (const value of imported) {
    if (!value.startsWith(`@/${source}/lib/`)) continue;
    const file = `${value.slice(2)}.tsx`;
    if (!fs.existsSync(file) || helpers.has(file)) continue;
    helpers.add(file);
    for (const dependency of fileImports(file)) imported.add(dependency);
  }
  return { imported: [...imported], helpers: [...helpers] };
}
function sourceImport(file, value) {
  if(value.startsWith("."))return `@/${path.posix.normalize(path.posix.join(path.posix.dirname(file),value))}`;
  return value;
}
function installedImport(file, value) {
  const resolved=sourceImport(file,value);
  return resolved.replace("@/registry/sahajiv/lib/utils","@/lib/utils")
    .replace("@/registry/sahajiv/motion/","@/lib/sahajiv-motion/")
    .replace("@/registry/sahajiv/lib/","@/lib/sahajiv/")
    .replace("@/registry/sahajiv/ui/","@/components/ui/");
}
function npmPackage(value){return value.startsWith("@")?value.split("/").slice(0,2).join("/"):value.split("/")[0];}
const extras=additions;
const items=[base,...ids.map(id=>{
  const entry=reference[id] ? {...reference[id],...extras[id]} : extras[id];
  if(!entry)throw new Error(`Undeclared registry helper: ${id}`);
  const {imported,helpers}=componentImports(id);
  const siblings=[...new Set(imported.filter(value=>value.startsWith("@/registry/sahajiv/ui/")).map(value=>value.split("/").at(-1)))];
  for(const sibling of siblings)if(!ids.includes(sibling))throw new Error(`Missing dependency ${sibling} of ${id}`);
  const dependencies=[...new Set(imported.filter(value=>!value.startsWith(".")&&!value.startsWith("@/")&&value!=="react").map(npmPackage))].map(name=>(entry.dependencies??[]).find(value=>value===name||value.startsWith(`${name}@`))??name);
  const style=`${source}/styles/${id}.css`;
  return {name:id,type:"registry:ui",title:entry.name,description:guides[id]?.description??`${entry.name} with SahaJiv styling.`,registryDependencies:[`${baseURL}/r/sahajiv.json`,...siblings.map(name=>`${baseURL}/r/${name}.json`)],dependencies,...(entry.devDependencies?{devDependencies:entry.devDependencies}:{}),files:[{path:`${source}/ui/${id}.tsx`,type:"registry:ui"},...helpers.map(file=>({path:file,type:"registry:lib",target:`lib/sahajiv/${path.basename(file)}`})),...(fs.existsSync(style)?[{path:style,type:"registry:file",target:`styles/sahajiv/${id}.css`}]:[])],...(fs.existsSync(style)?{css:{[`@import "@/styles/sahajiv/${id}.css"`]:{}}}:{}),meta:{source:entry,api:apis[id],category:guides[id]?.category??"Tools",fidelity:"refined-design-family",baseComponent:reference[id]?.tier==="base"}};
})];
base.cssVars={theme};
base.files.push(...fs.readdirSync(`${source}/lib`).filter(name=>name.endsWith(".ts")&&name!=="utils.ts").map(name=>({path:`${source}/lib/${name}`,type:"registry:lib",target:`lib/sahajiv/${name}`})));
base.files.push(...fs.readdirSync(`${source}/motion`).filter(name=>/\.tsx?$/.test(name)).map(name=>({path:`${source}/motion/${name}`,type:"registry:lib",target:`lib/sahajiv-motion/${name}`})));
base.files.push({path:`${source}/styles/fonts.css`,type:"registry:file",target:"styles/sahajiv-fonts.css"});
base.files.push(...foundationStyles.map(name=>({path:`${source}/styles/${name}.css`,type:"registry:file",target:`styles/sahajiv/${name}.css`})));
base.files.push(...["DMSans-OFL.txt","BricolageGrotesque-OFL.txt"].map(name=>({path:`reference/sahajiv-handoff-v4/fonts/${name}`,type:"registry:file",target:`styles/fonts/${name}`})));
const registry={$schema:"https://ui.shadcn.com/schema/registry.json",name:"sahajiv",homepage:baseURL,items};
fs.writeFileSync("registry.json",JSON.stringify(registry,null,2)+"\n");
// Refresh the live documentation catalogue without producing distributable
// payloads, invoking the shadcn CLI, or running a production build.
if(process.argv.includes("--metadata-only")) {
  console.log(`Local documentation metadata refreshed: ${ids.length} entries; public payloads unchanged.`);
  process.exit(0);
}
fs.mkdirSync("public/r",{recursive:true});
execFileSync(process.execPath,["node_modules/shadcn/dist/index.js","build"],{stdio:"inherit"});
for(const item of items){const file=path.join("public/r",`${item.name}.json`);const data=JSON.parse(fs.readFileSync(file,"utf8"));for(const f of data.files??[])if(f.content){if(/\.[cm]?[jt]sx?$/.test(f.path))f.content=f.content.replace(/((?:from\s+|import\s+)["'])([^"']+)(["'])/g,(_match,start,value,end)=>`${start}${installedImport(f.path,value)}${end}`);if(f.path.startsWith(`${source}/styles/`)){const name=path.basename(f.path,".css");if(!["fonts","tokens","theme","base"].includes(name)){const layer=name==="morph"?"sahajiv-morph":name==="flow-press"?"sahajiv-flow":"sahajiv-states";f.content=`@layer ${layer} {\n${f.content}\n}\n`;}}}fs.writeFileSync(file,JSON.stringify(data,null,2)+"\n");}
fs.copyFileSync("public/r/registry.json","public/registry.json");
console.log(`Registry built: ${items.length} items (${ids.filter(id=>reference[id]?.tier==="base").length} base components, ${ids.filter(id=>reference[id]?.tier!=="base").length} additional entries)`);
