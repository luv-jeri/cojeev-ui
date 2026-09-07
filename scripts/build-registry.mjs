import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { execFileSync } from "node:child_process";
import { componentAPIs } from "./component-api.mjs";

const baseURL=process.env.SAHAJIV_REGISTRY_URL??"https://luv-jeri.github.io/sahajiv-ui";
const source="registry/sahajiv";
const ids=fs.readdirSync(`${source}/ui`).filter(file=>file.endsWith(".tsx")).map(file=>file.slice(0,-4)).sort();
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
const theme=Object.fromEntries(Object.entries(css(`${source}/styles/theme.css`)["@theme inline"]).map(([key,value])=>[key.replace(/^--/,""),value]));
const base={name:"sahajiv",type:"registry:base",extends:"none",title:"SahaJiv",description:"SahaJiv tokens, fonts, reset, and Tailwind v4 theme bridge.",dependencies:["class-variance-authority","clsx","tailwind-merge","tw-animate-css"],config:{style:"new-york",iconLibrary:"lucide",tailwind:{baseColor:"neutral"},registries:{"@sahajiv":`${baseURL}/r/{name}.json`}},files:[{path:`${source}/lib/utils.ts`,type:"registry:lib",target:"lib/utils.ts"}],css:foundation};
function imports(id) {
  return [...fs.readFileSync(`${source}/ui/${id}.tsx`,"utf8").matchAll(/(?:from\s+|import\s+|import\s*\(\s*)["']([^"']+)["']/g)].map(match=>sourceImport(`${source}/ui/${id}.tsx`,match[1]));
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
  const entry=reference[id]??extras[id];
  if(!entry)throw new Error(`Undeclared registry helper: ${id}`);
  const imported=imports(id);
  const siblings=[...new Set(imported.filter(value=>value.startsWith("@/registry/sahajiv/ui/")).map(value=>value.split("/").at(-1)))];
  for(const sibling of siblings)if(!ids.includes(sibling))throw new Error(`Missing dependency ${sibling} of ${id}`);
  const dependencies=[...new Set(imported.filter(value=>!value.startsWith(".")&&!value.startsWith("@/")&&value!=="react").map(npmPackage))].map(name=>(entry.dependencies??[]).find(value=>value===name||value.startsWith(`${name}@`))??name);
  const style=`${source}/styles/${id}.css`;
  return {name:id,type:"registry:ui",title:entry.name,description:guides[id]?.description??`${entry.name} with SahaJiv styling.`,registryDependencies:[`${baseURL}/r/sahajiv.json`,...siblings.map(name=>`${baseURL}/r/${name}.json`)],dependencies,...(entry.devDependencies?{devDependencies:entry.devDependencies}:{}),files:[{path:`${source}/ui/${id}.tsx`,type:"registry:ui"},...(fs.existsSync(style)?[{path:style,type:"registry:file",target:`styles/sahajiv/${id}.css`}]:[])],...(fs.existsSync(style)?{css:{[`@import "@/styles/sahajiv/${id}.css"`]:{}}}:{}),meta:{source:entry,api:apis[id],category:guides[id]?.category??"Tools",fidelity:"verification-in-progress",baseComponent:reference[id]?.tier==="base"}};
})];
base.cssVars={theme};
base.files.push(...fs.readdirSync(`${source}/lib`).filter(name=>name.endsWith(".ts")&&name!=="utils.ts").map(name=>({path:`${source}/lib/${name}`,type:"registry:lib",target:`lib/sahajiv/${name}`})));
base.files.push(...fs.readdirSync(`${source}/motion`).filter(name=>/\.tsx?$/.test(name)).map(name=>({path:`${source}/motion/${name}`,type:"registry:lib",target:`lib/sahajiv-motion/${name}`})));
base.files.push({path:`${source}/styles/fonts.css`,type:"registry:file",target:"styles/sahajiv-fonts.css"});
base.files.push(...foundationStyles.map(name=>({path:`${source}/styles/${name}.css`,type:"registry:file",target:`styles/sahajiv/${name}.css`})));
base.files.push(...["DMSans-OFL.txt","BricolageGrotesque-OFL.txt"].map(name=>({path:`reference/sahajiv-handoff-v4/fonts/${name}`,type:"registry:file",target:`styles/fonts/${name}`})));
const registry={$schema:"https://ui.shadcn.com/schema/registry.json",name:"sahajiv",homepage:baseURL,items};
fs.writeFileSync("registry.json",JSON.stringify(registry,null,2)+"\n");
fs.mkdirSync("public/r",{recursive:true});
execFileSync(process.execPath,["node_modules/shadcn/dist/index.js","build"],{stdio:"inherit"});
for(const item of items){const file=path.join("public/r",`${item.name}.json`);const data=JSON.parse(fs.readFileSync(file,"utf8"));for(const f of data.files??[])if(f.content){if(/\.[cm]?[jt]sx?$/.test(f.path))f.content=f.content.replace(/((?:from\s+|import\s+)["'])([^"']+)(["'])/g,(_match,start,value,end)=>`${start}${installedImport(f.path,value)}${end}`);if(f.path.startsWith(`${source}/styles/`)){const name=path.basename(f.path,".css");if(!["fonts","tokens","theme","base"].includes(name)){const layer=name==="morph"?"sahajiv-morph":name==="flow-press"?"sahajiv-flow":"sahajiv-states";f.content=`@layer ${layer} {\n${f.content}\n}\n`;}}}fs.writeFileSync(file,JSON.stringify(data,null,2)+"\n");}
fs.copyFileSync("public/r/registry.json","public/registry.json");
console.log(`Registry built: ${items.length} items (${ids.filter(id=>reference[id]?.tier==="base").length} base components, ${ids.filter(id=>reference[id]?.tier!=="base").length} additional entries)`);
