/** Accept only registry item URLs that stay inside the candidate's file set. */
export function rewriteDependency(url, origin, available) {
  const file = url.match(/^https?:\/\/[^/]+(?:\/cojeev-ui|\/ui)?\/r\/([a-z0-9-]+\.json)$/)?.[1];
  if (!file) throw new Error(`Unrecognized remote dependency: ${url}`);
  if (!available.has(file)) throw new Error(`Dependency escapes candidate registry: ${url}`);
  return `${origin}/r/${file}`;
}

export function rewriteNamespace(item, origin) {
  if (item.config?.registries) item.config.registries['@cojeev'] = `${origin}/r/{name}.json`;
}
