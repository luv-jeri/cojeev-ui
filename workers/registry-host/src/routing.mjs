export const CANONICAL_BASE = {
  production: 'https://cojeev.com/ui',
  beta: 'https://beta.000h.cojeev.com/ui',
};

export const LEGACY_HOST = {
  production: '000h.cojeev.com',
  beta: 'beta.000h.cojeev.com',
};

function canonicalHost(environment) {
  return environment === 'production' ? 'cojeev.com' : LEGACY_HOST[environment];
}

/** Return the encoded logical path without changing the physical request path. */
export function logicalPath(url, env) {
  return url.hostname === canonicalHost(env.ENVIRONMENT) && url.pathname.startsWith('/ui/')
    ? url.pathname.slice(3) : url.pathname;
}

/**
 * @typedef {{kind: 'not-found'} | {kind: 'delegate'} | {kind: 'method-not-allowed'} |
 *   {kind: 'redirect', location: string} | {kind: 'health'} |
 *   {kind: 'asset', mount: 'canonical' | 'legacy', logical: string, registryName: string | null}} Decision
 */

/**
 * Apply the staged routing table in order, using only the URL, method and environment.
 * Paths remain encoded as parsed by URL; asset decisions never change the physical path.
 * @param {URL} url
 * @param {string} method
 * @param {{ENVIRONMENT?: 'production' | 'beta', MIGRATION_STAGE?: string}} env
 * @returns {Decision}
 */
export function decide(url, method, env) {
  const environment = env.ENVIRONMENT;
  const legacyHost = LEGACY_HOST[environment];
  const canonical = canonicalHost(environment);
  const path = url.pathname;

  if (url.hostname !== legacyHost && url.hostname !== canonical) return {kind: 'not-found'};
  if (environment === 'production' && url.hostname === canonical && path !== '/ui' && !path.startsWith('/ui/')) return {kind: 'delegate'};
  if (method !== 'GET' && method !== 'HEAD') return {kind: 'method-not-allowed'};
  if (url.hostname === canonical && path === '/ui') return {kind: 'redirect', location: `${CANONICAL_BASE[environment]}/${url.search}`};

  const logical = logicalPath(url, env);
  const mount = logical !== path ? 'canonical' : 'legacy';
  if (logical === '/health') return {kind: 'health'};
  if (/^(?:\/ui)?\/(?:media|backups|private|v1)(?:\/|$)/.test(logical)) return {kind: 'not-found'};
  const registry = logical.match(/^\/r\/([a-z0-9][a-z0-9-]{0,79})\.json$/);
  if (registry) return {kind: 'asset', mount, logical, registryName: registry[1]};
  if (mount === 'legacy' && (logical.startsWith('/_next/') || logical.endsWith('.txt'))) return {kind: 'not-found'};
  if (mount === 'legacy' && env.MIGRATION_STAGE === 'redirect') return {kind: 'redirect', location: `${CANONICAL_BASE[environment]}${path}${url.search}`};
  return {kind: 'asset', mount, logical, registryName: null};
}
