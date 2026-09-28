/** Print an apply_patch payload for the geometry and name files; --check verifies both against the installed pack. */
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
// Names ship on their own so a bundle can know every valid name without the geometry.
const namesTarget="registry/cojeev/lib/lucide-icon-names.ts";
const namesContent=`// Generated from lucide-react ${version}; run scripts/sync-lucide-icons.mjs --check to verify.\n// Names only: the geometry lives in lucide-icon-data.ts and loads on first use.\nexport const lucideIconNames:readonly string[]=${JSON.stringify(Object.keys(icons))};\n`;
const files=[[target,content,"Lucide snapshot"],[namesTarget,namesContent,"Lucide name list"]];
const current=await Promise.all(files.map(([file])=>readFile(file,"utf8").catch(()=>null)));
if(process.argv.includes("--check")){
  files.forEach(([,expected,label],index)=>{if(current[index]!==expected)throw new Error(`${label} differs from its installed source.`)});
  console.log(`${Object.keys(icons).length} canonical Lucide icons match ${version}, including license notices and the name list.`);
}else{
  const added=text=>text.trimEnd().split("\n").map(line=>"+"+line).join("\n");
  const sections=files.flatMap(([file,expected],index)=>{
    const before=current[index];
    if(before===expected)return [];
    return [before===null?`*** Add File: ${file}\n${added(expected)}`:`*** Update File: ${file}\n@@\n${before.trimEnd().split("\n").map(line=>"-"+line).join("\n")}\n${added(expected)}`];
  });
  console.log(sections.length?`*** Begin Patch\n${sections.join("\n")}\n*** End Patch`:`Both files already match ${version}.`);
}
