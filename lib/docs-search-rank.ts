const normalize = (text: string) => text.toLowerCase().replace(/<\/?mark>/g, "").replace(/[\s_-]+/g, " ").trim();

/** Results whose title or docs slug is exactly the query come first; everything else keeps its order. */
export function exactNameFirst<T extends { url: string; content: string }>(results: readonly T[], query: string): T[] {
  const wanted = normalize(query);
  if (!wanted) return [...results];
  const isExact = (result: T) => normalize(result.content) === wanted || normalize(/^\/docs\/([^/]+)\/?$/.exec(result.url)?.[1] ?? "") === wanted;
  return [...results.filter(isExact), ...results.filter(result => !isExact(result))];
}
