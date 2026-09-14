import { categories } from "./categories";

type Entry = { name: string; title: string; category: string };
const order = ["Foundations", ...categories];
export function groupDocsEntries<T extends Entry>(entries: T[]) {
  const groups = new Map<string, T[]>();
  for (const entry of entries) {
    const group = ["icon", "shape"].includes(entry.name) ? "Foundations"
      : entry.name.includes("chart") ? "Charts"
      : entry.category === "Subtle backgrounds" ? "Backgrounds" : entry.category;
    groups.set(group, [...(groups.get(group) ?? []), entry]);
  }
  return [...groups].map(([name, items]) => ({ name, entries: items.sort((a, b) => (a.name === "bento-grid" ? -1 : b.name === "bento-grid" ? 1 : a.title.localeCompare(b.title))) }))
    .sort((a, b) => (order.includes(a.name) ? order.indexOf(a.name) : 999) - (order.includes(b.name) ? order.indexOf(b.name) : 999));
}
