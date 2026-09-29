/** Security headers every website response carries, whether the Worker or Cloudflare's asset layer serves it. */
export function securityHeaders(environment) {
  const api=environment === 'beta' ? 'https://feedback-beta.cojeev.com' : 'https://feedback.cojeev.com';
  return {
    'x-content-type-options':'nosniff',
    'referrer-policy':'strict-origin-when-cross-origin',
    'x-frame-options':'DENY',
    'permissions-policy':'camera=(), microphone=(), geolocation=()',
    'content-security-policy':`default-src 'self'; script-src 'self' 'unsafe-inline' https://challenges.cloudflare.com https://eu-assets.i.posthog.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ${api} https://eu.i.posthog.com https://eu-assets.i.posthog.com; frame-src https://challenges.cloudflare.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'`,
  };
}

/**
 * The release writes this as `site/_headers`. Files that skip the Worker (see run_worker_first)
 * are free to serve, so Cloudflare attaches the same headers the Worker would have added.
 */
export function siteHeaders(environment) {
  const noindex={'x-robots-tag':'noindex, nofollow, noarchive'};
  // Beta is never indexed; production hides only its admin pages, as the Worker does. No cache rule:
  // _headers also applies to 404s, and a year-cached 404 would outlive a rollback that restores the file.
  const rules=environment === 'beta'
    ? {'/*':{...securityHeaders(environment),...noindex}}
    : {'/*':securityHeaders(environment),'/admin/*':noindex,'/feedback-admin/*':noindex};
  return Object.entries(rules).map(([pattern,headers])=>`${pattern}\n${Object.entries(headers).map(([name,value])=>`  ${name}: ${value}`).join('\n')}\n`).join('\n');
}
