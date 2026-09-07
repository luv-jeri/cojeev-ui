import fs from "node:fs";
import path from "node:path";

export type CatalogEntry = {name:string;title:string;description:string;meta:{api:{name:string;props:{name:string;type:string;required:boolean;description:string}[]}[];source:{variants:string[];sizes:string[];states:string[]};fidelity:string;baseComponent:boolean}};
export function catalog():CatalogEntry[]{
  const registry=JSON.parse(fs.readFileSync(path.join(process.cwd(),"registry.json"),"utf8"));
  return registry.items.filter((item:{type:string})=>item.type==="registry:ui");
}
export const publicURL=process.env.SAHAJIV_REGISTRY_URL??"https://luv-jeri.github.io/sahajiv-ui";
