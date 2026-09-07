import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { execFileSync } from "node:child_process";
import { componentAPIs } from "./component-api.mjs";

const baseURL=process.env.SAHAJIV_REGISTRY_URL??"https://luv-jeri.github.io/sahajiv-ui";
const source="registry/sahajiv";
const ids=fs.readdirSync(`${source}/ui`).filter(file=>file.endsWith(".tsx")).map(file=>file.slice(0,-4)).sort();
const apis=componentAPIs(ids);
const reference=JSON.parse(fs.readFileSync("reference/sahajiv-handoff-v4/data/registry.json","utf8")).entries;
function declarations(nodes){const out={};for(const node of nodes??[]){if(node.type==="comment")continue;if(node.type==="decl"){if(node.important)throw new Error(`Importance flag in production CSS: ${node.toString()}`);out[node.prop]=node.value;continue;}const key=node.type==="atrule"?`@${node.name}${node.params?` ${node.params}`:""}`:node.selector;const value=node.nodes?declarations(node.nodes):{};if(key==="@font-face"&&out[key])out[key]=Array.isArray(out[key])?[...out[key],value]:[out[key],value];else out[key]={...out[key],...value};}return out;}
function css(file){return declarations(postcss.parse(fs.readFileSync(file,"utf8")).nodes);}
const foundation=["fonts","tokens","theme","base"].reduce((all,file)=>({...all,...css(`${source}/styles/${file}.css`)}),{});
// shadcn merges repeated @font-face rules; a companion stylesheet preserves both families.
delete foundation["@font-face"];
foundation['@import "@/styles/sahajiv-fonts.css"']={};
const theme=Object.fromEntries(Object.entries(foundation["@theme inline"]).map(([key,value])=>[key.replace(/^--/,""),value]));
delete foundation["@theme inline"];
// Runtime structural rules must follow component states regardless of install order.
foundation["@layer sahajiv-morph"]=css(`${source}/styles/morph.css`);
foundation["@layer sahajiv-flow"]=css(`${source}/styles/flow-press.css`);
const base={name:"sahajiv",type:"registry:base",extends:"none",title:"SahaJiv",description:"SahaJiv tokens, fonts, reset, and Tailwind v4 theme bridge.",dependencies:["class-variance-authority","clsx","tailwind-merge","tw-animate-css"],config:{style:"new-york",iconLibrary:"lucide",tailwind:{baseColor:"neutral"},registries:{"@sahajiv":`${baseURL}/r/{name}.json`}},files:[{path:`${source}/lib/utils.ts`,type:"registry:lib",target:"lib/utils.ts"}],css:foundation};
function imports(id) {
  return [...fs.readFileSync(`${source}/ui/${id}.tsx`,"utf8").matchAll(/(?:from\s+|import\s+)["']([^"']+)["']/g)].map(match=>match[1]);
}
function npmPackage(value){return value.startsWith("@")?value.split("/").slice(0,2).join("/"):value.split("/")[0];}
const extras={icon:{name:"Icon and icon controls",variants:["default"],sizes:["default","sm","lg"],states:["rest","hover","disabled"]},shape:{name:"Shape",variants:["default"],sizes:["default"],states:["rest"]},adjuster:{name:"Motion Adjuster",variants:["default"],sizes:["default"],states:["rest","open"]}};
const items=[base,...ids.map(id=>{
  const entry=reference[id]??extras[id];
  if(!entry)throw new Error(`Undeclared registry helper: ${id}`);
  const imported=imports(id);
  const siblings=[...new Set(imported.filter(value=>value.startsWith("@/registry/sahajiv/ui/")).map(value=>value.split("/").at(-1)))];
  for(const sibling of siblings)if(!ids.includes(sibling))throw new Error(`Missing dependency ${sibling} of ${id}`);
  const dependencies=[...new Set(imported.filter(value=>!value.startsWith(".")&&!value.startsWith("@/")&&value!=="react").map(npmPackage))];
  const style=`${source}/styles/${id}.css`;
  return {name:id,type:"registry:ui",title:entry.name,description:`${entry.name} with SahaJiv styling and accessible composition.`,registryDependencies:[`${baseURL}/r/sahajiv.json`,...siblings.map(name=>`${baseURL}/r/${name}.json`)],dependencies,files:[{path:`${source}/ui/${id}.tsx`,type:"registry:ui"}],...(fs.existsSync(style)?{css:{"@layer sahajiv-states":css(style)}}:{}),meta:{source:entry,api:apis[id],fidelity:"verification-in-progress",baseComponent:reference[id]?.tier==="base"}};
})];
base.cssVars={theme};
base.files.push(...fs.readdirSync(`${source}/lib`).filter(name=>name.endsWith(".ts")&&name!=="utils.ts").map(name=>({path:`${source}/lib/${name}`,type:"registry:lib",target:`lib/sahajiv/${name}`})));
base.files.push(...fs.readdirSync(`${source}/motion`).filter(name=>/\.tsx?$/.test(name)).map(name=>({path:`${source}/motion/${name}`,type:"registry:lib",target:`lib/sahajiv-motion/${name}`})));
base.files.push({path:`${source}/styles/fonts.css`,type:"registry:file",target:"styles/sahajiv-fonts.css"});
base.files.push(...["DMSans-OFL.txt","BricolageGrotesque-OFL.txt"].map(name=>({path:`reference/sahajiv-handoff-v4/fonts/${name}`,type:"registry:file",target:`styles/fonts/${name}`})));
const registry={$schema:"https://ui.shadcn.com/schema/registry.json",name:"sahajiv",homepage:baseURL,items};
fs.writeFileSync("registry.json",JSON.stringify(registry,null,2)+"\n");
fs.mkdirSync("public/r",{recursive:true});
execFileSync(process.execPath,["node_modules/shadcn/dist/index.js","build"],{stdio:"inherit"});
for(const item of items){const file=path.join("public/r",`${item.name}.json`);const data=JSON.parse(fs.readFileSync(file,"utf8"));for(const f of data.files??[])if(f.content){f.content=f.content.replaceAll("@/registry/sahajiv/lib/utils","@/lib/utils").replaceAll("@/registry/sahajiv/motion/","@/lib/sahajiv-motion/").replaceAll("@/registry/sahajiv/lib/","@/lib/sahajiv/").replaceAll("@/registry/sahajiv/ui/","@/components/ui/");if(f.path===`${source}/styles/fonts.css`)f.content=f.content.replace("sahajiv-states, sahajiv-accessibility","sahajiv-states, sahajiv-morph, sahajiv-flow, sahajiv-accessibility");}fs.writeFileSync(file,JSON.stringify(data,null,2)+"\n");}
fs.copyFileSync("public/r/registry.json","public/registry.json");
console.log(`Registry built: ${items.length} items (${ids.filter(id=>reference[id]?.tier==="base").length} base components, ${ids.filter(id=>reference[id]?.tier!=="base").length} shared helpers; verification in progress)`);
