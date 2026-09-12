/** Print an apply_patch payload; --check verifies committed geometry against the installed pack. */
import {readFile,readdir} from "node:fs/promises";
import {pathToFileURL} from "node:url";
import path from "node:path";
const root=path.resolve("node_modules/lucide-react");
const {version}=JSON.parse(await readFile(path.join(root,"package.json"),"utf8"));
if(version!=="0.577.0")throw new Error(`Review upstream changes before updating the pinned 0.577.0 pack (installed ${version}).`);
const license=await readFile(path.join(root,"LICENSE"),"utf8");
const icons={};
for(const file of (await readdir(path.join(root,"dist/esm/icons"))).sort()){
  if(!file.endsWith(".js"))continue;
  const source=path.join(root,"dist/esm/icons",file);
  if(!(await readFile(source,"utf8")).includes("const __iconNode"))continue;
  const {__iconNode}=await import(pathToFileURL(source).href);
  icons[file.slice(0,-3)]=__iconNode.map(([tag,attrs])=>[tag,Object.fromEntries(Object.entries(attrs).filter(([key])=>key!=="key").map(([key,value])=>[key,String(value)]))]);
}
const target="registry/cojeev/lib/lucide-icon-data.ts";
const content=`// Generated from lucide-react ${version}; run scripts/sync-lucide-icons.mjs --check to verify.\n/*\n${license.trim()}\n*/\nimport type {IconNode} from "./icon-data";\nconst pack:Record<string,[string,Record<string,string>][]>=${JSON.stringify(icons)};\nexport const lucideIconNames=Object.keys(pack);\n/** Only materialize a requested icon; the full catalogue never mounts at once. */\nexport function getLucideIcon(name:string):IconNode[]|undefined {\n  return pack[name]?.map(([tag,attrs])=>({tag,attrs,children:[]}));\n}\n`;
const before=await readFile(target,"utf8").catch(()=>null);
if(process.argv.includes("--check")){
  if(before!==content)throw new Error("Lucide snapshot differs from its installed source.");
  console.log(`${Object.keys(icons).length} canonical Lucide icons match ${version}, including license notices.`);
}else{
  const lines=content.trimEnd().split("\n").map(line=>"+"+line).join("\n");
  console.log(before===null?`*** Begin Patch\n*** Add File: ${target}\n${lines}\n*** End Patch`:`*** Begin Patch\n*** Update File: ${target}\n@@\n${before.trimEnd().split("\n").map(line=>"-"+line).join("\n")}\n${lines}\n*** End Patch`);
}
