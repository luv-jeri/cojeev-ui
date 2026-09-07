import registry from "@/registry.json";

export type CatalogEntry = {name:string;title:string;description:string;meta:{api:{name:string;props:{name:string;type:string;required:boolean;description:string}[]}[];source:{variants:string[];sizes:string[];states:string[]};fidelity:string;baseComponent:boolean}};
export function catalog():CatalogEntry[]{
  return registry.items.filter((item:{type:string})=>item.type==="registry:ui") as CatalogEntry[];
}
export const publicURL=process.env.SAHAJIV_REGISTRY_URL??"https://luv-jeri.github.io/sahajiv-ui";
