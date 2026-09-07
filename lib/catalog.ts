import registry from "@/registry.json";
import guides from "@/data/component-guides.json";
export type ComponentGuide = { description:string; category:string; usage:string[]; accessibility:string[]; related:string[] };
export function componentGuide(id:string):ComponentGuide { return (guides as Record<string,ComponentGuide>)[id]; }
export const categories = ["Actions", "Forms", "Navigation", "Feedback", "Data display", "Layout", "Conversation", "Backgrounds", "3D", "Effects", "Creative", "Tools"];

export type CatalogEntry = {name:string;title:string;description:string;meta:{category:string;api:{name:string;props:{name:string;type:string;required:boolean;description:string}[]}[];source:{variants:string[];sizes:string[];states:string[]};fidelity:string;baseComponent:boolean}};
export function catalog():CatalogEntry[]{
  return registry.items.filter((item:{type:string})=>item.type==="registry:ui") as CatalogEntry[];
}
export const publicURL=process.env.SAHAJIV_REGISTRY_URL??"https://luv-jeri.github.io/sahajiv-ui";
