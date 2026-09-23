import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { execFileSync } from "node:child_process";
import { componentAPIs } from "./component-api.mjs";
import { sourceImport, rewriteInstalledImports } from "./registry-imports.mjs";
import { noticeText } from "./registry-notices.mjs";

// The canonical origin the shadcn directory lists and the one the release
// pipeline injects. A payload built with no environment now resolves its
// dependencies against the same origin that serves it, instead of sending
// consumers to the legacy GitHub Pages mirror.
const baseURL=process.env.COJEEV_REGISTRY_URL??"https://000h.cojeev.com";
const source="registry/cojeev";
const ids=fs.readdirSync(`${source}/ui`).filter(file=>file.endsWith(".tsx")).map(file=>file.slice(0,-4)).sort();
// The shadcn installer resolves registered modules by basename. A helper with
// the same basename as a UI entry can therefore become a circular UI import.
for (const folder of ["lib", "motion"]) for (const file of fs.readdirSync(`${source}/${folder}`)) {
  if (/\.tsx?$/.test(file) && ids.includes(file.replace(/\.tsx?$/, ""))) throw new Error(`Rename private helper ${folder}/${file}: its name collides with an installable UI entry.`);
}
const apis=componentAPIs(ids);
const guides=JSON.parse(fs.readFileSync("data/component-guides.json","utf8"));
const additions=JSON.parse(fs.readFileSync("data/component-additions.json","utf8"));
const reference=JSON.parse(fs.readFileSync("reference/cojeev-handoff-v4/data/registry.json","utf8")).entries;
function declarations(nodes){const out={};for(const node of nodes??[]){if(node.type==="comment")continue;if(node.type==="decl"){if(node.important)throw new Error(`Importance flag in production CSS: ${node.toString()}`);out[node.prop]=node.value;continue;}const key=node.type==="atrule"?`@${node.name}${node.params?` ${node.params}`:""}`:node.selector;const value=node.nodes?declarations(node.nodes):{};if(key==="@font-face"&&out[key])out[key]=Array.isArray(out[key])?[...out[key],value]:[out[key],value];else out[key]={...out[key],...value};}return out;}
function css(file){return declarations(postcss.parse(fs.readFileSync(file,"utf8")).nodes);}
// CSS is delivered verbatim. Registry JSON objects cannot preserve repeated
// selectors or the ordering of shorthand and longhand declarations.
// The foundation stylesheet every consumer needs: layer order, tokens, the
// Tailwind theme bridge and the reset. Component and shared paint sheets are
// assigned from the import graph below, so they are deliberately absent here.
const foundationStyles=["tokens","theme","base","morph"];
// Attribution and discovery fields live on the items, not on the directory
// listing: the shadcn directory entry schema has no `author` or `categories`,
// while `registry-item.json` defines both. One source, so every payload agrees.
const author="Sanjay Kumar <https://github.com/luv-jeri>";
/* Why one `@import` of one file rather than one per stylesheet.
 *
 * The installer writes a `css` key into the consumer's stylesheet *verbatim*, at a
 * path it chooses (`app/globals.css` in a Next scaffold, `src/index.css` in a Vite
 * one). Nothing in that key can be expressed as a bundler path alias: measured on
 * 2026-09-23 against shadcn 4.21.0 and Tailwind 4.1.16, `@/styles/...` compiles in
 * Vite and **fails in Next** ("Can't resolve '@/styles/cojeev-fonts.css'"), because
 * Tailwind's PostCSS resolver does not read tsconfig `paths`; `~/styles/`,
 * `styles/` and `/styles/` each fail in Next as well, and a bare relative
 * `../styles/...` fixes Next but then **fails in Vite**, whose install root is
 * `src/`. No single specifier reaches the files directly in both.
 *
 * The one form both bundlers resolve identically is a relative import of a file
 * that exists at the consumer root's `styles/`, because both documented scaffolds
 * put their stylesheet exactly one directory below that root (`app/` and `src/`).
 * So the consumer gets one import, and every further sheet is imported from inside
 * `cojeev.css` relative to *that* file — a location the registry controls, so those
 * specifiers cannot break per framework. `tests/registry-closure.test.mjs` pins the
 * shape: one `css` import, and no alias specifier anywhere in a payload.
 */
const foundation=Object.fromEntries(["@/styles/cojeev-fonts.css",...foundationStyles.map(name=>`@/styles/cojeev/${name}.css`)].map(file=>[`@import "${file}"`,{}]));
const themeCSS=css(`${source}/styles/theme.css`);
const theme=Object.fromEntries(Object.entries(themeCSS["@theme inline"]).map(([key,value])=>[key.replace(/^--/,""),value]));
// A base installed as a component dependency does not replace shadcn's existing
// cssVars. Merge the semantic aliases after its starter rules so the public
// one-command install uses our surfaces in both documented data-mode states.
const semanticNames=/^--(?:background|foreground|card(?:-.+)?|popover(?:-.+)?|primary(?:-.+)?|secondary(?:-.+)?|accent(?:-.+)?|muted(?:-.+)?|border|input|ring|destructive(?:-.+)?|chart-\d+|sidebar(?:-.+)?)$/;
const layoutNames=new Set(["--card-pad","--card-gap","--sidebar-w","--sidebar-w-mini","--sidebar-gap"]);
foundation[":root, :root[data-mode]"]=Object.fromEntries(Object.entries(css(`${source}/styles/tokens.css`)[":root"]).filter(([name])=>semanticNames.test(name)&&!layoutNames.has(name)));
/* `@custom-variant` has to sit at the top level of the consumer's stylesheet.
 *
 * The installer renders a plain declaration like `:root { … }` as `@layer base { … }`,
 * so adding `@custom-variant` to this block afterwards nested it and Tailwind rejected
 * the file outright in a Next consumer: "`@custom-variant` cannot be nested". It is
 * hoisted below the import instead, before anything the installer wraps in a layer.
 * `tests/registry-closure.test.mjs` asserts no `@custom-variant` is emitted inside a
 * layer, so it cannot silently regress.
 */
for(const [rule,value] of Object.entries(themeCSS))if(rule.startsWith("@custom-variant "))foundation[rule]=value;
/* Order the completed block so nothing the installer wraps in `@layer base` comes
 * before a top-level at-rule: the import first, then every `@custom-variant`, then the
 * declarations. Reordering here, once, keeps the earlier construction readable. */
const orderRank=key=>key.startsWith("@import ")?0:key.startsWith("@custom-variant ")?1:2;
const baseCSS=Object.fromEntries(Object.entries(foundation).map((entry,index)=>[index,entry]).sort((a,b)=>orderRank(a[1][0])-orderRank(b[1][0])||a[0]-b[0]).map(([,entry])=>entry));
const base={name:"cojeev",type:"registry:base",extends:"none",title:"Cojeev",description:"Cojeev tokens, fonts, reset, and Tailwind v4 theme bridge.",author:author,categories:["foundation","theme","fonts"],dependencies:[],config:{style:"new-york",iconLibrary:"lucide",tailwind:{baseColor:"neutral"},registries:{"@cojeev":`${baseURL}/r/{name}.json`}},files:[{path:`${source}/lib/utils.ts`,type:"registry:lib",target:"lib/utils.ts"}],css:baseCSS};
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
function npmPackage(value){return value.startsWith("@")?value.split("/").slice(0,2).join("/"):value.split("/")[0];}
// One module graph for private helpers. Registry JSON cannot express "install
// the closure of what this file imports", so the generator has to: walk the real
// import graph from each UI entry and assign every reachable helper to the entry
// that reaches it. Nothing optional is hand-listed, so a helper that becomes
// unreachable, or a component that grows a heavy import, changes the install set
// by itself. `--ts`/`.tsx` are tried before the extensionless spelling the
// sources use, so only a real file is ever returned.
function resolveModule(fromFile,specifier){
  const target=specifier.startsWith("@/")?specifier.slice(2):specifier.startsWith(".")?path.posix.normalize(path.posix.join(path.posix.dirname(fromFile),specifier)):null;
  if(!target)return null;
  for(const extension of [".ts",".tsx",""]){
    const candidate=`${target}${extension}`;
    if(fs.existsSync(candidate)&&fs.statSync(candidate).isFile())return candidate;
  }
  return null;
}
function moduleGraph(root){
  const graph=new Map();
  const walk=file=>{
    if(graph.has(file))return graph.get(file);
    const dependencies=[];
    graph.set(file,dependencies);
    for(const value of fileImports(file)){
      const resolved=resolveModule(file,value);
      if(resolved){dependencies.push(resolved);walk(resolved);}
    }
    return dependencies;
  };
  walk(root);
  return graph;
}
function reachableModules(root){
  const graph=moduleGraph(root);
  return [...graph.keys()];
}
// Icon geometry is pure generated data that only some entries import. Publish it
// as its own optional item so a component that never draws an icon does not
// install it, and let the entries that need it declare the dependency instead.
// Targets are unchanged, so every installed import path stays identical.
const geometryFiles=[
  {path:`${source}/lib/icon-data.ts`,type:"registry:lib",target:"lib/cojeev/icon-data.ts"},
  {path:`${source}/lib/lucide-icon-data.ts`,type:"registry:lib",target:"lib/cojeev/lucide-icon-data.ts"},
];
const geometryPaths=new Set(geometryFiles.map(file=>file.path));
const geometrySpecifiers=new Set(geometryFiles.map(file=>`@/${file.path.replace(/\.ts$/,"")}`));

// Metadata is not decoration: the directory entry schema and every consumer that
// groups the catalogue read `author`/`categories`. The geometry item used to ship
// without either, so the "metadata on every item" claim was true for 174 of 175.
const geometryItem={name:"cojeev-icon-geometry",type:"registry:lib",title:"Cojeev icon geometry",description:"Generated Lucide icon geometry and the authored Cojeev icon sprite. Installed automatically by the Cojeev icon components.",author:author,categories:["foundation","icons"],registryDependencies:[`${baseURL}/r/cojeev.json`],files:geometryFiles};
const extras=additions;
// Private helpers (`lib/*.ts`, `motion/*.ts`) are assigned from the real import
// graph, not from a list: each entry owns everything its closure reaches, and the
// foundation keeps only what no entry reaches. That is what stops a component
// that never draws an icon or animates anything from installing either.
const entryPlans=ids.map(id=>{
  const entry=reference[id] ? {...reference[id],...extras[id]} : extras[id];
  if(!entry)throw new Error(`Undeclared registry helper: ${id}`);
  const {imported}=componentImports(id);
  const reachable=reachableModules(`${source}/ui/${id}.tsx`);
  const siblings=[...new Set(imported.filter(value=>value.startsWith("@/registry/cojeev/ui/")).map(value=>value.split("/").at(-1)))];
  for(const sibling of siblings)if(!ids.includes(sibling))throw new Error(`Missing dependency ${sibling} of ${id}`);
  // UI files are siblings, not helpers: a sibling arrives through its own
  // registryDependencies entry, so it is never copied into this one's file list.
  // The foundation already ships `utils.ts` at shadcn's own `lib/utils.ts`, so a
  // second copy under `lib/cojeev/` would only install the same source twice.
  const owned=reachable.filter(file=>!geometryPaths.has(file)&&file!==`${source}/lib/utils.ts`&&!file.startsWith(`${source}/ui/`)&&!file.startsWith(`${source}/styles/`));
  const geometry=reachable.some(file=>geometryPaths.has(file))||imported.some(value=>geometrySpecifiers.has(value))?[`${baseURL}/r/cojeev-icon-geometry.json`]:[];
  const targetFor=file=>`${file.startsWith(`${source}/motion/`)?`lib/cojeev-motion/`:`lib/cojeev/`}${path.basename(file)}`;
  // Stylesheet ownership follows the same closure as modules. `tokens`, `theme`
  // and `base` are the foundation every entry needs; anything else is a component
  // stylesheet or a shared paint sheet, and only entries that reach it get it.
  const styleFor=file=>`${source}/styles/${path.basename(file).replace(/\.tsx?$/,"")}.css`;
  const styles=[...(fs.existsSync(styleFor(`${source}/ui/${id}.tsx`))?[id]:[]),...owned.map(styleFor).filter(file=>fs.existsSync(file)).map(file=>path.basename(file,".css")),...(["checkbox","radio-group","switch"].includes(id)?["choice-foundations"]:[])];
  return {id,entry,reachable,owned,targetFor,geometry,siblings,styles};
});
// A private module reached by more than one entry is declared by each of them.
// The installer resolves a target once, so the consumer still receives one file;
// duplicating the declaration is what makes every entry self-sufficient.
const ownership=new Map();
for(const plan of entryPlans)for(const file of plan.owned){const target=plan.targetFor(file);if(!ownership.has(target))ownership.set(target,new Set());ownership.get(target).add(plan.id);}
const styleOwnership=new Set(entryPlans.flatMap(plan=>plan.styles.map(name=>`${source}/styles/${name}.css`)));
// The foundation's own sources decide the foundation's packages. Every consumer
// resolves them, so a package may only appear there because base code imports it.
const basePaths=new Set(base.files.map(file=>file.path));
const foundationPackages=new Set([...basePaths].flatMap(file=>fileImports(file)).filter(value=>!value.startsWith(".")&&!value.startsWith("@/")&&value!=="react").map(npmPackage));
const items=[base,geometryItem,...entryPlans.map(({id,entry,reachable,owned,targetFor,geometry,siblings,styles})=>{
  // Package dependencies follow the same closure. A package the foundation
  // already declares is resolved once for everyone and is not repeated here.
  const importedPackages=[...new Set(reachable.flatMap(file=>fileImports(file)).filter(value=>!value.startsWith(".")&&!value.startsWith("@/")&&value!=="react").map(npmPackage))];
  const dependencies=importedPackages.filter(name=>!foundationPackages.has(name)).map(name=>(entry.dependencies??[]).find(value=>value===name||value.startsWith(`${name}@`))??name);
  const category=guides[id]?.category??"Tools";
  return {name:id,type:"registry:ui",title:entry.name,description:guides[id]?.description??`${entry.name} with Cojeev styling.`,author:author,categories:[category],registryDependencies:[`${baseURL}/r/cojeev.json`,...geometry,...siblings.map(name=>`${baseURL}/r/${name}.json`)],dependencies,...(entry.devDependencies?{devDependencies:entry.devDependencies}:{}),files:[{path:`${source}/ui/${id}.tsx`,type:"registry:ui"},...owned.map(file=>({path:file,type:"registry:lib",target:targetFor(file)})),...styles.map(name=>({path:`${source}/styles/${name}.css`,type:"registry:file",target:`styles/cojeev/${name}.css`}))],...(styles.length?{css:Object.fromEntries(styles.map(name=>[`@import "@/styles/cojeev/${name}.css"`,{}]))}:{}),meta:{source:entry,api:apis[id],category,fidelity:"refined-design-family",baseComponent:reference[id]?.tier==="base"}};
})];
base.cssVars={theme};
// The foundation keeps exactly the private modules no entry reaches, plus
// `utils`, which every entry imports and which therefore belongs to the layer
// everyone installs. A module no entry reaches and no foundation file imports is
// dead code: it fails the build rather than shipping to every consumer silently.
const keepInFoundation=(directory,extension)=>fs.readdirSync(`${source}/${directory}`).filter(name=>extension.test(name)).filter(name=>name!=="utils.ts").filter(name=>!geometryPaths.has(`${source}/${directory}/${name}`)).filter(name=>!ownership.has(`${directory==="motion"?"lib/cojeev-motion/":"lib/cojeev/"}${name}`)).map(name=>({path:`${source}/${directory}/${name}`,type:"registry:lib",target:`${directory==="motion"?"lib/cojeev-motion/":"lib/cojeev/"}${name}`}));
base.files.push(...keepInFoundation("lib",/\.ts$/),...keepInFoundation("motion",/\.tsx?$/));
// Every private module has to land somewhere. Without this check a module that
// no entry reaches would silently ship inside the foundation, installed by
// everyone, which is exactly the defect this assignment removes.
for(const directory of ["lib","motion"]){
  const target=directory==="motion"?"lib/cojeev-motion/":"lib/cojeev/";
  for(const name of fs.readdirSync(`${source}/${directory}`))if(/\.tsx?$/.test(name)&&!geometryPaths.has(`${source}/${directory}/${name}`)&&!basePaths.has(`${source}/${directory}/${name}`)&&!ownership.has(`${target}${name}`))throw new Error(`Private module ${directory}/${name} reaches no entry and no foundation file`);
}
// The foundation declares exactly the packages its own sources import. A package
// that only entries import stays off this list, which is what makes a static
// install resolve without motion at all.
base.dependencies=[...foundationPackages].sort();
base.files.push({path:`${source}/styles/fonts.css`,type:"registry:file",target:"styles/cojeev-fonts.css"});
// Binary assets cannot be registry files: shadcn reads file contents as UTF-8.
// This inert helper keeps the default self-contained CSS and only materializes
// the verified bytes when a consumer explicitly invokes it after installation.
base.files.push({path:`${source}/scripts/materialize-fonts.mjs`,type:"registry:file",target:"scripts/cojeev-materialize-fonts.mjs"});
// The foundation keeps the stylesheets every entry needs. A shared paint sheet
// only some entries reach belongs to those entries, so an unused one is not
// installed into every project in the registry.
base.files.push(...fs.readdirSync(`${source}/styles`).filter(name=>name.endsWith(".css")&&name!=="fonts.css"&&!styleOwnership.has(`${source}/styles/${name}`)).map(name=>({path:`${source}/styles/${name}`,type:"registry:file",target:`styles/cojeev/${name}`})));
base.files.push(...["DMSans-OFL.txt","BricolageGrotesque-OFL.txt"].map(name=>({path:`reference/cojeev-handoff-v4/fonts/${name}`,type:"registry:file",target:`styles/fonts/${name}`})));
// Every entry installs this base, so one notices file reaches every consumer.
// It has to be a file: the installer re-prints the TypeScript it copies and
// drops the comment a source opens with, notice included.
fs.writeFileSync(`${source}/NOTICES.txt`,noticeText(fs.readFileSync("LICENCE","utf8"),["lib","motion","ui"].flatMap(folder=>fs.readdirSync(`${source}/${folder}`).sort().filter(name=>/\.tsx?$/.test(name)).map(name=>[`${source}/${folder}/${name}`,fs.readFileSync(`${source}/${folder}/${name}`,"utf8")]))));
base.files.push({path:`${source}/NOTICES.txt`,type:"registry:file",target:"lib/cojeev/NOTICES.txt"});
const registry={$schema:"https://ui.shadcn.com/schema/registry.json",name:"cojeev",homepage:baseURL,items};
fs.writeFileSync("registry.json",JSON.stringify(registry,null,2)+"\n");
// Refresh the live documentation catalogue without producing distributable
// payloads, invoking the shadcn CLI, or running a production build.
if(process.argv.includes("--metadata-only")) {
  console.log(`Local documentation metadata refreshed: ${ids.length} entries; public payloads unchanged.`);
  process.exit(0);
}
fs.mkdirSync("public/r",{recursive:true});
// An isolated copy of the same CLI can be used when local dependency reads stall.
// Normal builds keep the repository-installed version and unchanged arguments.
const registryCLI=process.env.COJEEV_REGISTRY_CLI??"node_modules/shadcn/dist/index.js";
execFileSync(process.execPath,[registryCLI,"build"],{stdio:"inherit"});
for(const item of items){const file=path.join("public/r",`${item.name}.json`);const data=JSON.parse(fs.readFileSync(file,"utf8"));for(const f of data.files??[])if(f.content){if(/\.[cm]?[jt]sx?$/.test(f.path))f.content=rewriteInstalledImports(f.path,f.content);if(f.path.startsWith(`${source}/styles/`)){const name=path.basename(f.path,".css");if(!["fonts","tokens","theme","base"].includes(name)){const layer=name==="morph"?"cojeev-morph":name==="flow-press"?"cojeev-flow":"cojeev-states";f.content=`@layer ${layer} {\n${f.content}\n}\n`;}}}fs.writeFileSync(file,JSON.stringify(data,null,2)+"\n");}
fs.copyFileSync("public/r/registry.json","public/registry.json");
console.log(`Registry built: ${items.length} items (${ids.filter(id=>reference[id]?.tier==="base").length} base components, ${ids.filter(id=>reference[id]?.tier!=="base").length} additional entries)`);
