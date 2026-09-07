import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

export function generateComponent(entry,port){
  if(entry.tier!=="base")throw new Error("Only base components may be generated");
  if(!/^[a-z]+(?:-[a-z]+)*$/.test(entry.id))throw new Error("Invalid component id");
  if(entry.root!==port.root)throw new Error("Registry and port-map roots disagree");
  const name=entry.id.split("-").map(s=>s[0].toUpperCase()+s.slice(1)).join("");
  const axes={variant:Object.fromEntries(["default",...new Set(entry.variants)].map(v=>[v,v==="default"?"":`-${v}`])),size:Object.fromEntries(["default",...new Set(entry.sizes)].map(v=>[v,v==="default"?"":`-${v}`]))};
  const rootClass=entry.root.match(/^\.([a-z0-9_-]+)/i)?.[1]??"";
  const tag=({button:"button",input:"input",textarea:"textarea",label:"label","native-select":"select",badge:"span"})[entry.id]??"div";
  const slots=Object.entries(port.parts??{}).map(([selector,part])=>({selector,part,slot:part==="root"?entry.id:`${entry.id}-${part}`}));
  const code=`import * as React from "react"\nimport { cva, type VariantProps } from "class-variance-authority"\nimport { cn } from "@/registry/sahajiv/lib/utils"\n\n// Generated axes and slots only. Port behavior and styles before registration.\nconst variants=cva(${JSON.stringify(rootClass)}, {variants:${JSON.stringify(axes,null,2)},defaultVariants:{variant:"default",size:"default"}})\nexport const ${name}Slots=${JSON.stringify(slots,null,2)} as const\ntype Props=Omit<React.ComponentProps<${JSON.stringify(tag)}>,"size"> & VariantProps<typeof variants>\nexport function ${name}({variant,size,className,...props}:Props){\n return <${tag} data-slot=${JSON.stringify(entry.id)} data-part="root" className={cn(variants({variant,size}),className)} {...props}/>\n}\n`;
  return{name,axes,slots,code};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const ref="reference/sahajiv-handoff-v4/data";
  const entries=JSON.parse(fs.readFileSync(`${ref}/registry.json`,"utf8")).entries;
  const map=JSON.parse(fs.readFileSync(`${ref}/port-map.json`,"utf8")).entries;
  const target=process.argv[2]??".work/skeletons";
  fs.mkdirSync(target,{recursive:true});let count=0;
  for(const entry of Object.values(entries).filter(e=>e.tier==="base")){
    const file=path.join(target,`${entry.id}.tsx`);if(fs.existsSync(file))throw new Error(`Refusing to overwrite ${file}`);
    fs.writeFileSync(file,generateComponent(entry,map[entry.id]).code);count++;
  }
  console.log(`Generated ${count} base component skeletons. They are not finished components and are not registered.`);
}
