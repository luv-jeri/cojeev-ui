# CJ01-2: publish Cojeev.com

Parent: CJ01-1 / PR #68, source c6d3a953326078375746cb5327d789dc255e6eae.

The owner requested production deployment on 2026-09-15 after reviewing the optimized page. This supersedes the earlier no-deployment restriction for this landing page and authorizes starting its shared 30-day countdown at first publication.

Scope: a new static-assets Worker named `cojeev-coming-soon`, serving `cojeev.com` in account `25369d7051a3d996a1bca81f462a1fbc`, zone `12e8b50b78c2c6af9e28406fede10d4e`. Existing library and reporting Workers/subdomains are outside this publication. Before publication, the apex served a parking page at A records `3.33.130.190` and `15.197.148.33`. No existing Worker owned the apex.

- [x] Owner approved the page for publication in this conversation.
- [x] Account, active zone and existing Worker domain bindings verified.
- [x] Configure the dedicated static host and cache policy.
- [x] Build/packaging and shared-countdown checks.
- [x] Publish and record the immutable deployment version and timestamp.
- [x] Verify live page, assets, compression and browser behavior.

The first library PR check failed lint. Commit 7e303e4 repairs that failure, declares the shared shader packages and resolves their DOM typing conflict. The next library run (34961695420) passed lint, typecheck, 166 unit tests and reporting tests, then failed its separate registry packaging step: `Undeclared registry helper: membrane`. The existing landing-page-only experimental components were never declared in that catalogue. No library release or merge is part of this publication, and its failing gate stays intact. The owner originally directed that separately publishing new library components must not block the landing page.

The landing page has its own build and static host. Its production build, Wrangler dry-run, 118 story checks, 21 lifecycle checks, 11 focused startup/mobile/fallback checks and five shared-countdown unit tests pass. The final review-checkout build was separately checked for lifecycle and startup because its clean dependency installation differs from the earlier runtime preview. The early-input regression check caught a race between a restored state update and replayed Enter; initializing prompt state directly from the captured startup value fixes it, with no hydration errors.

Fresh compressed production Lighthouse scores are 100 mobile / 100 desktop. These are local measurements, not claims about the live host. Raw reports and browser evidence are beside this record. No style or shader source changed.

Publication does not promote the component library to main or bypass its production environment. Its own deployment is explicitly authorized by the owner in this conversation.

The first upload at 11:14 UTC succeeded but did not publish any route: Cloudflare rejected its custom domain because parking A records already existed (100117). Switched to the supported exact apex Worker route (`cojeev.com/*`) with the existing A records proxied. This retains both old IP values for reversal, requires no DNS deletion, and cannot match the library subdomains. Since the first attempt never went live, the launch candidate was moved to 2026-09-15T11:17:38Z immediately before the successful routing attempt.


## Live publication

- Published version: `e913c05b-9a14-4296-8308-f273208d9c2e`.
- Deployment ID: `447a6ac3-bfcc-40b4-80ab-f4951efac03a`, created `2026-09-15T11:17:50.8192Z`.
- Launch manifest: `startedAt: 2026-09-15T11:17:38Z`. The shared countdown ends `2026-10-15T11:17:38Z` (15 October, 4:47:38 PM IST). Preserve this timestamp on subsequent deployments.
- Production address: https://cojeev.com/.
- Exact apex Worker route: `cojeev.com/*`; no library or reporting subdomain matches.
- Existing apex A records `3.33.130.190` and `15.197.148.33`, and the existing `www` CNAME to `cojeev.com`, were switched from DNS-only to proxied. Their values and Auto TTL were retained. No DNS record was deleted.
- Active redirect rule `baa1fa3044404e7091241abfe98deb18` (Cojeev canonical HTTPS address): `(http.host eq "www.cojeev.com") or (http.host eq "cojeev.com" and not ssl)` returns 301 to `concat("https://cojeev.com", http.request.uri.path)`, preserving the query string. It does not match other subdomains.

Live HTTP verification matched the deployed HTML, main script, worker script, font and launch manifest to local build hashes; gzip and immutable asset cache headers were present. Browser verification confirmed the story, animated background, countdown and theme toggle in both light and dark mode. HTTP and www redirects retain the path and query, and HTTPS apex returns the page. Some initial system-resolver requests still reached the old parking origin during DNS propagation; pinned requests to the current authoritative Cloudflare addresses passed with normal TLS validation. See `publication-live-http.json` and `publication-redirects.json`.

The first public Lighthouse measurements are **91 mobile / 99 desktop**, compared with **100 / 100** on the compressed local production build. Mobile: FCP 1.8 s, LCP 2.3 s, TBT 230 ms, CLS 0; desktop: FCP/LCP 0.6 s, TBT 0, CLS 0. Public delivery includes Cloudflare's existing analytics injection. This record does not attribute the entire score difference to that injection or claim a public score of 100. Raw live reports are included.

### Repeat deployment and reversal

Build this application with its committed dependencies, run its relevant checks, then use the root-installed Wrangler with `apps/cojeev-coming-soon/wrangler.jsonc` for a dry run and deployment. Keep `public/launch.json` unchanged so the shared countdown never restarts. The source route and cache headers are checked in; the DNS proxy state and redirect rule are account configuration recorded above.

To restore the prior parking setup, remove this exact Worker route, disable this specific redirect rule, and restore these three existing DNS records to DNS-only. Do not alter the library/reporting routes or other zone records. For an application rollback, use an approved prior application version while retaining the original live launch timestamp; the first upload was not a live release and has an earlier candidate timestamp.

No merge or component-library release was performed. The separate registry packaging failure remains visible on the draft PR; no checks or branch protections were bypassed.

Check-running time: the focused 11-check browser suite took 4.32 seconds; root unit tests took 8.43 seconds. These durations exclude implementation, debugging, review, dependency installation and packaging. Other checks were recorded by outcome; no aggregate elapsed time is inferred.
