# Move 000h to cojeev.com/ui — design spec

Date: 2026-10-01. Repository: `luv-jeri/cojeev-ui`. Design baseline: `a71c72274807c3153c2190004b370a210c2c84d2`, branch `feat/move-to-cojeev-ui`.

This document specifies future implementation and deployment. It does not authorize either. This task changes only this document, commits it locally, and never pushes.

## Goal and completion contract

Make `https://cojeev.com/ui/` the public home of 000h so page views, shared links and search results belong to `cojeev.com`. Preserve every old page's destination and every existing registry installation. Keep the Cojeev homepage owned by its existing Worker.

Completion requires all of the following evidence from the deployed release, not merely a successful build or HTTP 200:

| Check | Required result |
|---|---|
| `curl -sS -D - -o /dev/null 'https://cojeev.com/ui?utm_source=move'` | 301; exact `Location: https://cojeev.com/ui/?utm_source=move`. The registry Worker handles bare `/ui`. |
| The same curl against `https://000h.cojeev.com/docs/button/?utm_source=move&x=a%2Fb` | 301; exact `Location: https://cojeev.com/ui/docs/button/?utm_source=move&x=a%2Fb`. No homepage substitution. Use GET and HEAD without following redirects. |
| Old `/`, `/about/`, `/work-with-me/`, `/requests/`, `/track/`, `/feedback-admin/`, component aliases and an unknown page | Each 301 preserves its original pathname and query beneath `/ui`; following an unknown page ends in a real 404. `/work-with-me/` still redirects to that path; its resulting HTML canonical remains `/ui/about/`. |
| Old encoded pathname, repeated query keys, and a tracking URL with a fragment | Encoded pathname and query survive unchanged at the URL-parser boundary. A real browser retains a tracking fragment across the redirect; fragments never reach the Worker or curl. No receipt data enters logs or analytics. |
| `curl -sS -D - https://000h.cojeev.com/r/button.json` and `https://cojeev.com/ui/r/button.json` | Direct 200, JSON content type, valid item payload and no `Location`. Repeat for foundation, index, a composed item, HEAD and a missing item (404). Compare payload digests across hosts for the same release. |
| Disposable shadcn CLI consumer installs from both direct button URLs and both foundation/composed-item URLs | Successful installation, dependency traversal, installed-file check and consumer build. Record CLI version. An old index may contain old dependency URLs; both paths must remain live. |
| Production home, docs index, component/alias, getting-started, about and privacy HTML | Canonical, Open Graph, Twitter image and JSON-LD URLs have exactly one `/ui` and the intended canonical path. Images return 200 with the right content type. Track stays noindex and no-referrer; admin stays noindex. |
| `https://cojeev.com/ui/sitemap.xml` and `https://cojeev.com/robots.txt` | Sitemap lists canonical `/ui/` public routes, excluding private/noindex routes and preserving existing alias policy. Apex robots retains its existing content plus exactly one `Sitemap: https://cojeev.com/ui/sitemap.xml` line and does not block `/ui/`. |
| Navigation, refresh, search, shares and prefetch on the deployed `/ui/` build | Correct `/ui/...` URLs, fonts/images/CSS/chunks/search/RSC responses, no double prefix, no escape to apex docs paths, no new browser errors. Shares retain the pathname and the existing removal of query/fragment. |
| A browser report submitted from `/ui/docs/button/` | Real Turnstile succeeds, preflight/write succeeds from Origin `https://cojeev.com`, receipt persists, optional attachment uploads, receipt reload works, and request-board/admin reads work. Delivery states remain truthful; provider delivery is separately verified if enabled. |
| Reporting lifecycle using an existing old `Component:` URL | Converts only an approved legacy docs URL to the current canonical docs URL, then requires direct HEAD 200 HTML there. No arbitrary redirect following or broad host allowance. |
| Beta `https://beta.000h.cojeev.com/ui/` | Same base path and asset layout as production, beta API only, no production redirect and site-wide noindex including asset-layer responses. |
| Apex `/`, `/robots.txt`, a known coming-soon page, and `/uikit?x=1` | Existing coming-soon behavior and headers are preserved; no registry page or registry CSP replaces them. |
| Health and release identity | `/ui/health` and `/ui/release.json` match the promoted commit/environment and are no-store; old `/health` remains direct. Rollback rehearses these same URLs. |

These are acceptance checks for implementation. None was run as part of writing this spec.

## Decisions

| ID | Status | Decision |
|---|---|---|
| D1 | Fixed — owner decision | Website moves to `https://cojeev.com/ui/`. |
| D2 | Fixed — owner decision | Old-host HTML page requests return 301 to the same path under `https://cojeev.com/ui`, preserving query. Never collapse deep links to the homepage. |
| D3 | Fixed — owner decision | `https://000h.cojeev.com/r/*.json` remains directly served forever. No redirects, retirement deadline or dependency breakage. |
| D4 | Fixed — owner decision | Every HTML page gets a bottom funnel link to `https://cojeev.com/`. |
| D5 | Fixed — owner decision | After the new endpoint is live and verified, open a shadcn directory PR changing homepage and URL. |
| E1 | Default — owner may change | New docs, install commands, generated registry dependencies and registry mappings advertise `https://cojeev.com/ui/r/...`. Official namespace `@000h-cojeev` is unchanged. Existing consumer-local `@cojeev` aliases remain supported and are not renamed. |
| E2 | Default — owner may change | Beta uses `https://beta.000h.cojeev.com/ui/`, with `COJEEV_BASE_PATH=/ui`. Browser fixtures move from `/cojeev-ui` to `/ui`; explicit compatibility tests may retain the old base. Local defaults and preview mount also become `/ui`. |
| E3 | Default — owner may change | Visible header attribution “by Cojeev” links to `https://cojeev.com/`; the 000h brand keeps its library home/docs destination. |
| E4 | Default — owner may change | Old `/health` stays direct. Old `/_next/*` and `.txt` leftovers stay asset-first: serve retained files at their existing paths, missing files return 404, no migration redirects. This includes old RSC files and robots.txt. Other old non-page paths follow the same-path redirect unless they are a reserved path; obsolete static files have no permanent retention promise. |
| E5 | Default — owner may change | Check storage names against the coming-soon app before sharing the origin. Keep noncolliding names. Old-origin consent, drafts, receipts and preferences do not carry over; preserve old data without importing or deleting it. Disclose the discontinuity. |
| E6 | Default — owner may change | The only coming-soon repository change is the robots sitemap line. The registry Worker's route handles bare `/ui` and returns 301 to `/ui/`, with query preserved. |
| E7 | Default — owner may change | Add `cojeev.com` to the existing Turnstile widget hostname list, allow reporting Origin `https://cojeev.com`, and set reporting `SITE_URL=https://cojeev.com/ui` after the canonical site is live. |

The host topology supplied by the owner overrides the inventory's earlier uncertainty. `cojeev.com/*` belongs to `cojeev-coming-soon`, from `~/Developer/cojeev-coming-soon-performance-review/apps/cojeev-coming-soon`, deployed manually with Wrangler. It owns `/` and apex robots. The two 000h hosts are registry Worker custom domains. `feedback.cojeev.com` remains the reporting Worker.

## Architecture

### Routes and ownership

Production registry configuration retains the `000h.cojeev.com` custom domain and adds the zone route `cojeev.com/ui*` in both default and explicit production configuration. Beta retains only its own custom domain. Do not replace the apex `cojeev.com/*` route or turn `cojeev.com` into a registry custom domain.

Use `/ui*`, rather than only `/ui/*` or an exact `/ui` route, to catch bare `/ui` with queries. Cloudflare's most specific route wins; its route matching includes query strings and only a trailing wildcard covers them. The wildcard also catches `/uikit` and `/ui-other`. Before applying registry routing or headers, accept only pathname `/ui` or a pathname beginning `/ui/`. Delegate other matching apex paths, preserving the complete request and response, through production service binding `COJEEV_HOMEPAGE` to `cojeev-coming-soon`. Do not fetch the same public URL, which would re-enter the route. Do not apply registry CSP/noindex/cache headers to delegated responses. Bind this only in production and validate the exact service name. This requires no coming-soon code change; prove delegation to its assets-only deployment in preflight. [Cloudflare route matching](https://developers.cloudflare.com/workers/configuration/routing/routes/).

| Host and path | Owner and behavior after cutover |
|---|---|
| `cojeev.com/`, apex robots and other paths outside `/ui*` | Coming-soon Worker, unchanged apart from the sitemap line. |
| `cojeev.com/ui` | Registry Worker, explicit 301 to `/ui/`. |
| `cojeev.com/ui/...` | Registry canonical pages, static assets, registry, health and real 404s. |
| `cojeev.com/uikit` or another `/ui*` non-boundary match | Registry delegates unchanged to coming-soon through the service binding. |
| `000h.cojeev.com/r/{name}.json` | Registry Worker, direct JSON from the compatibility copy. |
| `000h.cojeev.com/health` | Registry Worker, direct health JSON. |
| Old-host framework/text leftovers | Asset layer, retained root files or 404; no host redirect requirement. |
| Old-host HTML/navigation paths | Registry Worker, same-path 301 after cutover. This includes `.html`, extensionless paths, aliases and unknown page paths. Do not depend on the browser's Accept header to distinguish pages. |
| `beta.000h.cojeev.com/ui/...` | Beta registry Worker and beta assets/API; never redirects to production. |
| Beta root `/` and `/ui` | Same-host 301 to `/ui/`, query preserved; beta `/health` stays a direct compatibility probe. Other root pages are not production redirect fixtures. |

Unexpected hosts fail closed with 404. Reserved logical `/media`, `/backups`, `/private` and `/v1` remain 404 at root and beneath `/ui`; they are not website routes or registry entries.

### Build and physical asset mount

Choose physical packaging: keep the raw Next export in `out/`, then copy it into release `site/ui/`. Keep `trailingSlash: true`, static export and unoptimized images. Do not introduce an `assetPrefix` or manually prepend `/ui` to Next Link/router routes. Cloudflare's asset directory must mirror the public subdirectory; the route does not mount a root export automatically. [Cloudflare subdirectory assets](https://developers.cloudflare.com/workers/static-assets/routing/advanced/serving-a-subdirectory/).

| Value | Production | Beta |
|---|---|---|
| `COJEEV_BASE_PATH` | `/ui` | `/ui` |
| `NEXT_PUBLIC_SITE_URL` | `https://cojeev.com/ui` | `https://beta.000h.cojeev.com/ui` |
| `NEXT_PUBLIC_REGISTRY_URL`, `COJEEV_REGISTRY_URL` | `https://cojeev.com/ui` | `https://beta.000h.cojeev.com/ui` |
| Reporting API | `https://feedback.cojeev.com` | `https://feedback-beta.cojeev.com` |
| Reporting `SITE_URL` after cutover | `https://cojeev.com/ui` | `https://beta.000h.cojeev.com/ui` |
| Browser site Origin | `https://cojeev.com` | `https://beta.000h.cojeev.com` |

Use these values for the entire build, including registry generation and route styles. Release environment constructors keep their strict override rejection. Default checkout values follow production, while local fixture site URLs use the actual loopback origin plus `/ui`.

The canonical release contains `site/ui/index.html`, all exported routes/assets under `site/ui/`, `site/ui/release.json`, root `site/r/` as a byte-identical copy of `site/ui/r/`, and root `site/_headers`. A root `site/404.html` supplies the existing asset-layer 404 contract; it must be the migrated 404 page with correct `/ui` resources and bottom link. No SPA fallback. Missing pages and missing assets keep HTTP 404.

During the additive rollout, also retain the verified pre-move root export and its hashed assets/RSC files. This preserves the old working HTML site until redirects are enabled. These files come from the pinned old artifact, not from pretending a `/ui` build works at root. The canonical and compatibility registry copies remain the old verified registry until the new dependency URLs are live and install-tested; publish the regenerated copies together afterward. Never merge arbitrary workspace output into an artifact.

After cutover, old root HTML may remain in the package but must never bypass migration routing. Keep the pinned old `/_next` and `.txt` files for in-flight tabs through the initial cutover and rollback window; subsequent removal is a separate reviewed action. Raw `out/r/` locations remain valid for raw-export hash/install gates; packaged gates use `site/ui/r/` and `site/r/` explicitly.

### Worker control flow and budget

Parse the full URL once; keep hostname, encoded pathname and query separate. The old-host target is the fixed string base `https://cojeev.com/ui` plus the URL pathname and search. Do not decode/re-encode paths, parse/reorder query parameters, derive a destination host from request headers, or strip `/ui` from old-host paths. For example, old `/ui/docs/` goes to canonical `/ui/ui/docs/` under D2; only the canonical host normalizes the deployment prefix for logical checks.

The Worker first checks host and the canonical `/ui` boundary, delegates unrelated apex matches, handles direct registry and health exceptions, denies reserved paths, handles any old framework/text request that reached code, then applies the migration stage. E4 applies even when a missing excluded asset invokes the Worker: fetch the retained static path or return 404, never redirect it. In the additive stage, old pages use the retained root export. In the cutover stage, old page paths return 301 before asset lookup. Canonical requests use their physical `/ui` path unchanged. Never redirect an old registry item because it is missing: return direct 404 JSON/error behavior instead. Non-GET/HEAD methods on static website/registry paths return 405 rather than a migration redirect; reporting writes continue on the feedback Worker.

Use the selective Worker-first list `/*`, `!/_next/*`, `!/*.txt`, `!/ui/_next/*`, `!/ui/*.txt`, `!/ui/brand/*`, `!/ui/icon.png`, `!/ui/opengraph-image.png`, `!/ui/twitter-image.png`. Pages, `/ui`, registry requests, health and release metadata still run code. Exclusions may contain no HTML page: an HTML request must not become a direct retained-root response. Manifest checks forbid reserved exports and root files beneath a `/ui*` sibling such as `/uikit`, so asset-first matching cannot bypass the reserved-path denial or apex boundary delegation. Root robots is `.txt` and follows E4; canonical robots is also directly served with `_headers`.

Worker-first patterns are pathname rules, not host rules. This is safe because D2 applies to HTML pages while E4 explicitly permits static leftovers. Do not adopt the inventory's blanket Worker-first suggestion, which assumed redirects for all non-registry requests. Physical mounting avoids per-asset prefix stripping and keeps framework/RSC requests in the free asset layer. Missing excluded assets still return real 404s. Verify actual invocation behavior with the packaged asset router, not a pathname-only mock. [Cloudflare selective Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/).

Preserve the asset layer's trailing-slash and `$d$component` encoding behavior. Test literal and percent-encoded RSC names and their redirect chains. Since files physically live under `/ui`, every asset-generated Location must remain there, with query preserved and no double prefix. Reject a package if the runtime escapes the mount; do not hide the failure by adding apex routes for framework/docs assets.

Free-plan Worker requests are limited to 100,000/day across account usage. The runtime-heavy page, health, legacy redirect and registry traffic still counts; static bypasses reduce amplification, not guarantee unlimited traffic. Monitor account-wide use, error rate and old/new registry successes during cutover. Keep optional Analytics Engine binding behavior as supported today; metrics failure must not fail registry delivery. Normalize old `/r/` and new `/ui/r/` for the existing item/index/foundation metrics and preserve probe labeling. A JSON fetch or copy event is not evidence of a CLI install.

### Headers, SEO and page behavior

Worker responses and asset-layer `_headers` must agree on existing CSP, nosniff, frame policy, referrer policy and permissions policy. Same-origin assets now live beneath `/ui`; provider and feedback API origins stay unchanged. CSP checks compare URL origins and correctly treat absolute same-origin URLs as `'self'`. Do not replace an origin with an origin-plus-path in CSP or CORS.

Add `/ui/admin` and `/ui/feedback-admin` paths, including exact and trailing-slash variants, to noindex handling. Preserve root exceptions during transition and beta-wide noindex. Track keeps its stricter page-level no-referrer/noindex behavior. Health/release metadata stay no-store; HTML, including 404 HTML, revalidates. Give migration 301s `Cache-Control: no-store` during rollout to limit client caching; 301s can still be sticky, so retaining `/ui` is the reliable rollback protection. Do not add long cache headers to missing assets.

Rebuild shared metadata, images, structured data, canonical aliases and sitemap from the canonical site value. Keep logical route lists unprefixed and inspect exact emitted URLs rather than only schema types. The registry homepage is canonical even while compatibility endpoints remain on the old host. Apex robots is the crawler policy; `/ui/robots.txt` alone is insufficient. Verify the existing apex policy first. If it blocks `/ui`, E6's one-line change is insufficient: report that conflict for an owner decision instead of silently expanding scope.

Retain all existing Next Link and router logical paths, including docs, workspace, report/request, tracking and marketing navigation. Search fetches `/ui/docs-search.json`; search entries remain `/docs/...` and continue through the existing route guard. Fix the standalone docs-shell fallback with the same configured base. Share logic needs `/ui` coverage, not a new URL-building scheme.

D4 is owned by one shared bottom-link component composed into each page shell, including docs, docs index, marketing/guide pages, requests, tracking, workspace, admin and 404. Shells with existing footers include it there; pages disabling a footer must still get this link. No duplicate link when shells nest. Use visible text “Explore Cojeev” and an ordinary absolute anchor to `https://cojeev.com/`, in the same tab, with keyboard focus styling. This is a bottom-of-content link, not a fixed overlay. Preserve current theme, scroll ownership and motion behavior. D4 applies to HTML pages, not JSON or metadata files.

Split header brand and attribution into separate sibling anchors, including desktop/mobile docs and marketing headers. Do not nest links. The library brand continues to its existing logical home/docs route; “by Cojeev” is the absolute homepage anchor. Check compact headers and small screens without introducing a header redesign.

### Reporting continuity

Keep production/beta feedback APIs, D1, R2, webhook paths, tokens and delivery contracts. CORS entries use origins, never `/ui`. Production retains existing accepted origins during migration and adds `https://cojeev.com`; there is no need to remove old or Pages origins in this move. Beta retains its own origin/API and local fixtures remain loopback-only. Operations validation compares a deliberate exact origin set using `new URL(site).origin`.

Update the existing Turnstile widget's hostname list before traffic moves, retaining existing working hostnames. Server verification continues to derive allowed hostnames from accepted origins and require action `reporting`. Future provisioning uses the same reviewed list; do not recreate the widget or rotate secrets for this migration.

Prepare a bounded legacy component-URL compatibility rule in reporting before redirects. Production accepts only credential-free HTTPS `000h.cojeev.com/docs/...` URLs with no query/fragment as legacy component inputs. Convert that prefix to the current `SITE_URL` docs prefix, then run the existing canonical-origin/path validation and direct HEAD 200 HTML check. New canonical component URLs use the same validation. Before the SITE_URL switch, the current target remains old; after the switch it is `/ui`. For beta continuity, apply the equivalent same-environment mapping from `beta.000h.cojeev.com/docs/...` to its configured `/ui/docs/...`; never accept production hosts there. Do not map other old paths, allow beta URLs in production, follow arbitrary redirects or broadly rewrite report references.

This handles existing database component URLs, admin input and GitHub issue `Component:` lines without bulk editing reports, issues or queued messages. A newly resolved row stores the normalized URL. Existing rendered/queued tracking/admin/component links remain usable through the old-page redirects; receipt fragments are preserved by browser behavior. Inventory existing component URLs and queued-link forms read-only before cutover; counts and path classes suffice, without exposing private report contents. No D1 schema/data migration is required. Delivery enabling/disabling stays as currently configured.

Once `/ui` is live, switch `SITE_URL` to `https://cojeev.com/ui` before enabling old-host redirects. Newly materialized tracking/admin links then include `/ui`. Reporting diagnostics recognize safe `/ui/`, `/ui/docs/...` and `/ui/requests/` forms without exposing query, fragment, admin, workspace or dynamic private segments. Attachment reads and uploads remain on the feedback API.

Browser state cannot move with a 301. Old IndexedDB `cojeev-reporting-v1`, sent receipts and drafts stay on `000h.cojeev.com` and become inaccessible to the new site; downloaded receipt files can still be used through the existing import flow. Do not claim unsent drafts were submitted, saved on the new origin or lost from disk. Add concise migration wording to installation/release guidance and privacy/draft guidance: “The site moved to cojeev.com/ui. Saved drafts and browser preferences from 000h.cojeev.com do not transfer. Keep your downloaded report receipts.” No cross-origin import/export system is part of this move.

### Analytics and shared-origin storage

Configure route sanitization with the canonical site base. Browser `/ui/docs/button/` and App Router `/docs/button/` map to the same `/docs/button/` bucket; `/ui` maps to `/`. Strip only the exact `/ui` boundary, not `/uikit`. Preserve query/fragment removal, private-route exclusions, consent, DNT/GPC and provider configuration. The PostHog host allowlist is an ingestion-provider list and needs no website-host additions. Beta event identifiers and release SHA remain distinct.

The homepage funnel is now same-origin. Preserve the existing definition of `outbound_clicked`: it does not record same-origin links. No new funnel event is required by D4. Cloudflare page counts and canonical host configuration should be checked separately from PostHog buckets; verify domain/path dashboards and avoid duplicate beacon injection, without changing the coming-soon app's analytics in this scope.

Review localStorage/sessionStorage keys, IndexedDB names, BroadcastChannel names, cookie names/scopes and service-worker registrations against the current coming-soon checkout before implementation. Source inspection here found coming-soon theme key `cojeev-coming-soon-theme` and preview-clock key `cojeev-preview-clock`; neither conflicts with the inventoried UI keys. This is local-source evidence, not proof of the deployed artifact.

Review UI consent/opt-out/channel `000h.analytics-consent.v1` and related names, `cojeev-docs-theme`, `cojeev-docs-navigation`, `cojeev-appearance`, motion/flow and legacy motion names, plus `cojeev-reporting-v1`. Keep noncolliding names and library preference compatibility. If a live collision is found, give only the UI-owned conflicting state a distinct name; do not clear shared storage or rewrite coming-soon keys. No service-worker migration was identified in the inventory; recheck before release.

New-origin optional analytics starts without an old-origin consent choice and remains off until allowed. Existing apex values must not accidentally opt a UI visitor in. Theme/motion/navigation follow their current unset behavior. Old-origin preferences remain intact. A path is not a browser privacy boundary: sharing `cojeev.com` makes storage and same-origin privileges shared with the homepage app. Keep reporting admin routes protected as today; this move does not add an origin isolation boundary.

### Release contract and gates

Represent website base, registry base, legacy registry host, API origin, base path, exact route set, service binding and migration stage explicitly in release configuration. Stages are `additive` and `redirect`; beta tests both host behaviors with fixtures while its deployed host stays beta. Store the selected stage and mount identity in the immutable artifact/manifest. Default and environment configs must agree, and deployment validation must reject route/service/mount/stage mismatches.

A production additive artifact contains a pinned compatible root export plus the new `/ui` export. Beta needs only its beta `/ui` export and compatibility registry/health; it never embeds the old production site. A redirect artifact retains the canonical mount, direct legacy registry and old static support. Use retained artifact integrity/provenance checks for the root compatibility input. Explicitly distinguish temporary old HTML URLs from permitted permanent legacy registry URLs in manifest scans. The first additive registry graph is permitted only as the digest-verified baseline input; later regenerated payloads must satisfy the new registry URL contract. Beta must reject production site/API hosts, including `000h.cojeev.com`, except named fixture-only tests. Production must reject beta hosts. Scan HTML, source, JSON, XML and RSC for host/base consistency; check reserved files beneath both root and `site/ui`. Artifact home and identity checks move to `site/ui/index.html` and `site/ui/release.json`.

Packaged CSP fixtures map URL paths to the physical asset root. Structured-data checks inspect `site/ui` and assert exact canonical URLs. Consumer-install fixtures read the appropriate raw or packaged registry location. Replace the two dependency-rewrite assumptions with structural recognition of approved `/r/`, `/cojeev-ui/r/` compatibility fixtures and `/ui/r/` URLs. Rewrite every recognized candidate dependency to the disposable server, reject escapes/unrecognized remote dependencies, and fail closed rather than contacting live endpoints from candidate tests.

Browser fixture mount, build base, fixture site URL and navigation assertions must all use `/ui`. Supplying `--url` alone does not change a Vite mount. Cover every preview script and browser test listed in Appendix A, preserving their existing behavioral assertions. Retain explicit old-base compatibility cases where useful; a Pages build cannot stand in for production mount acceptance.

Relevant implementation checks run while building; run the working app once at the end of each completed visible slice, per the owner's verification policy. This migration changes security origins and release/rollback behavior, so include a focused independent review of those contracts during implementation. That is not a requirement to run every unrelated component suite or commission review for this document. CI scope selection must include migration routing/origin gates whenever Worker, release, reporting, SEO or gate configuration changes. Keep useful existing tests.

Promotion requires beta package/browser/reporting acceptance, production artifact checks, canonical live acceptance, dual registry install acceptance and the explicit old-redirect gate at the proper stage. Health/recovery workflows use shared new targets; add separate legacy health/registry probes. Keep sanitized diagnostics, secret handling, existing database recovery protections, bounded propagation retries and provenance checks. Do not turn a permanent mount/CORS/header failure into a retryable propagation success. Report check-running time separately from test writing, debugging, review and packaging.

## Eight change groups

Appendix A is the exhaustive ownership map for every file:line table entry in the input. A file may appear in several groups because it serves several contracts. “Keep” entries require verification of their invariant, not gratuitous edits. All test names below are required invariant names for future implementation; they are not claims that these tests already exist. No test bodies are specified.

### G1 — Build and asset mount

Files: `next.config.ts`, `.env.example`, `package.json`, configuration portions of `lib/site-config.ts`, `app/fonts.css`, `app/assets.d.ts`, imported-font portions of `app/layout.tsx`, `components/brand/brand-sculpture.tsx`, all inventoried `public/brand/*` assets, `app/icon.png`, `app/opengraph-image.png`, `app/twitter-image.png`, `scripts/build-route-styles.mjs`, `registry/cojeev/styles/fonts.css`, `registry/cojeev/scripts/materialize-fonts.mjs`. Packaging implementation belongs to G8.

Change: one `/ui` build/preview contract, correct physical export mount, preserved import/data-font delivery. Keep no explicit assetPrefix. No package `homepage` field exists to replace; adding one is unnecessary.

Invariant tests: `build_uses_ui_base_without_asset_prefix`; `preview_mount_matches_build_base`; `ui_font_preload_matches_css_resource`; `ui_brand_and_metadata_assets_resolve`; `consumer_fonts_remain_self_contained`; `raw_export_remains_unwrapped`.

### G2 — Edge routing, legacy serving and headers

Files: `workers/registry-host/wrangler.jsonc`, `workers/registry-host/src/index.mjs`, `workers/registry-host/src/headers.mjs`, `workers/registry-host/test/hosting.test.mjs`, `workers/registry-host/test/static-assets.test.mjs`, `workers/registry-host/test/registry.test.mjs`. G8 owns matching deployment guards.

Change: host-aware staged routing, `/ui*` apex route with boundary delegation, physical asset delivery, forever-direct legacy registry, old health, static leftovers, normalized reserved/noindex/cache/metrics checks.

Invariant tests: `apex_ui_route_wins_and_catches_query_bearing_bare_ui`; `ui_prefix_siblings_delegate_without_header_changes`; `legacy_pages_301_to_same_encoded_path_and_query`; `legacy_alias_redirect_does_not_use_its_canonical_target`; `legacy_registry_get_and_head_never_redirect`; `legacy_missing_registry_returns_404`; `legacy_health_stays_direct`; `beta_never_redirects_to_production`; `root_and_ui_reserved_paths_are_404`; `ui_asset_redirects_keep_mount_and_query`; `literal_and_encoded_rsc_paths_stay_under_ui`; `static_bypasses_do_not_cover_html`; `retained_legacy_text_and_chunks_are_direct`; `worker_and_asset_security_headers_match`; `ui_admin_and_beta_are_noindex`; `health_and_release_are_no_store`; `missing_assets_are_not_long_cached`; `both_registry_paths_preserve_metrics_and_probe_labels`.

### G3 — SEO and public references

Files: metadata portions of `lib/site-config.ts` and all inventoried `app/*/page.tsx`, `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, `lib/seo/structured-data.ts`, `README.md`, `docs/README.md`, `docs/guides/INSTALLATION.md`, `CONTRIBUTING.md`, `docs/reporting/README.md`, `scripts/triage/judge.ts`, `apps/triage/fixtures.ts`, `tests/site-config.test.ts`, `tests/structured-data.test.ts`, `tests/launch-environment.test.ts`. External boundaries: coming-soon apex robots source/build output, GitHub repository Website metadata, shadcn `apps/v4/registry/directory.json`.

Change: new canonical/OG/JSON-LD/sitemap bases, corresponding deep website links and documented preferred installs, beta exclusions and migration wording. Keep repository/profile/license/schema/provider URLs. Only the apex sitemap line is changed in the coming-soon repo; identify the real robots source before editing, never patch only generated dist. Update GitHub Website after live acceptance. Shadcn PR uses homepage `https://cojeev.com/ui/` and URL `https://cojeev.com/ui/r/{name}.json`; leave name/logo/description unchanged. [Current official directory entry](https://raw.githubusercontent.com/shadcn-ui/ui/main/apps/v4/registry/directory.json).

Invariant tests: `canonical_and_social_urls_have_exactly_one_ui_prefix`; `structured_data_ids_and_breadcrumbs_use_canonical_site`; `component_aliases_keep_canonical_component_names`; `work_with_me_canonical_remains_about`; `sitemap_contains_only_canonical_public_routes`; `apex_robots_adds_only_ui_sitemap_line`; `beta_robots_and_headers_block_indexing`; `public_docs_advertise_new_urls_and_explain_legacy_support`; `repository_schema_and_provider_urls_are_unchanged`; `shadcn_directory_template_fetches_live_json`.

### G4 — Registry generation and install compatibility

Files: `scripts/build-registry.mjs`, `registry.json`, `public/registry.json`, `public/r/registry.json`, every `public/r/*.json` item enumerated in the input, `components.json`, `lib/catalog.ts`, install-display portions of `app/docs/page.tsx`, `app/docs/[component]/page.tsx`, `app/getting-started/page.tsx`, `components/landing/featured-components.tsx`, `components/install-command.tsx`, `scripts/release-install.mjs`, `scripts/run-install-verification.mjs`, `scripts/verify-install.mjs`, `tests/run-install-verification.test.mjs`, raw registry hash portions of `tests/production-gate.test.mjs`.

Change: regenerate all payloads from the chosen registry base; never hand-edit generated files. Keep schemas, component names/content, existing `@cojeev` consumer alias and official `@000h-cojeev` name. Separate canonical homepage from registry endpoint identity. Publish byte-identical current JSON at both public paths. Fix install rewriting before relying on CLI gates.

Invariant tests: `registry_regeneration_matches_all_three_indexes`; `all_generated_dependencies_use_reviewed_registry_base`; `registry_schemas_and_component_identity_are_unchanged`; `legacy_and_canonical_registry_payloads_match`; `foundation_alias_maps_to_new_registry_without_renaming`; `ui_dependencies_rewrite_to_candidate_fixture`; `candidate_install_rejects_remote_dependency_escape`; `shadcn_old_url_installs_foundation_and_composed_item`; `shadcn_new_url_installs_foundation_and_composed_item`.

### G5 — Navigation, search, shares and Cojeev funnel

Files: every navigation row in Appendix A; in particular `app/docs/layout.tsx`, `app/docs-search.json/route.ts`, `app/docs/reference-guide/page.tsx`, `app/workspace/page.tsx`, `components/docs-shell.tsx`, `components/docs-search.tsx`, `lib/docs-search.ts`, `components/docs-motion.tsx`, `components/docs-navigation-entry.tsx`, `components/landing/{marketing-shell,guide-shell,creator-page,landing-page,featured-components,shape-playground}.tsx`, all inventoried reporting navigation components, `lib/share.ts`, `components/share-button.tsx`, `tests/docs-search.test.ts`, `tests/share.test.ts`. Add a shared bottom-link component and integrate existing shells plus standalone/admin/404 page surfaces; include `app/not-found.tsx` or the actual exported 404 owner discovered during implementation. No unrelated styling changes.

Change: keep logical routes, fix search fetch fallback, verify shares/tracking fragments, add one bottom link everywhere and separate header attribution anchors. Source scans identifying no service worker or extra CSS URLs are preservation checks, not new features.

Invariant tests: `next_navigation_adds_ui_once`; `search_fetch_is_prefixed_and_entries_are_logical`; `search_selection_uses_existing_route_guard`; `share_uses_ui_path_without_query_or_fragment`; `tracking_fragment_survives_legacy_redirect`; `every_exported_html_page_has_one_bottom_cojeev_link`; `disabled_shell_footer_still_has_funnel_link`; `header_brand_and_cojeev_attribution_are_distinct_links`; `funnel_link_is_keyboard_accessible_in_compact_and_full_shells`.

### G6 — Reporting origins and link continuity

Files: `workers/reporting/wrangler.jsonc`, `workers/reporting/wrangler.local.jsonc`, `workers/reporting/src/{security,index,reports,lifecycle,delivery}.ts`, `lib/reporting/{client,contracts,diagnostics,capture}.ts`, `components/reporting/{admin,turnstile}.tsx`, `scripts/reporting.mjs`, `scripts/triage/config.ts`, `workers/reporting/test/integration.test.mjs`, `workers/reporting/test/triage-e2e.test.mjs`, `tests/reporting-contract.test.ts`, `tests/triage.test.ts`, reporting fixture portions of `scripts/reporting-browser-fixture.mjs` and `tests/reporting-browser-fixture.test.mjs`. G7 owns browser storage; G8 owns preview/gate orchestration.

Change: pathless Origin additions, canonical SITE_URL, existing widget hostname configuration, narrow component URL normalization, canonical delivery links and safe diagnostic routes. Refresh the already-stale webhook default/example to the unchanged feedback API. Retain API/repository identities, secrets and protection behavior.

Invariant tests: `reporting_cors_accepts_cojeev_origin_without_path`; `reporting_wrong_origin_remains_forbidden`; `turnstile_hostname_and_reporting_action_are_verified`; `new_component_url_requires_canonical_docs_path`; `approved_legacy_component_url_normalizes_before_direct_head`; `component_normalization_rejects_credentials_queries_fragments_and_foreign_hosts`; `resolved_request_webhook_accepts_existing_legacy_component_line`; `new_delivery_links_include_ui`; `ui_diagnostics_preserve_only_safe_public_routes`; `ui_browser_submission_receipt_attachment_and_reload_work`; `reporting_api_and_webhook_paths_remain_at_feedback_root`.

### G7 — Analytics and origin-scoped state

Files: `lib/analytics/client.ts`, `components/analytics/{analytics-provider,analytics-consent}.tsx`, `components/theme-control.tsx`, storage/bootstrap portions of `app/layout.tsx` and `components/docs-shell.tsx`, `registry/cojeev/ui/appearance.tsx`, `registry/cojeev/motion/settings.ts`, `lib/reporting/draft.ts`, `app/privacy/page.tsx`, inventoried analytics callers in share/install/handoff/preview/landing components, `tests/analytics.test.ts`, `tests/analytics.browser.mjs`. External read-only collision audit: coming-soon source and deployed storage usage; no homepage storage edits.

Change: canonical route normalization and a verified storage coexistence contract. Keep PostHog ingestion hosts, consent rules, consumer preferences and same-origin outbound policy. Explain old-origin state discontinuity without transfer or deletion.

Invariant tests: `ui_browser_and_router_paths_share_analytics_bucket`; `ui_prefix_boundary_does_not_strip_uikit`; `ui_private_routes_stay_excluded`; `ui_privacy_banner_behavior_is_preserved`; `optional_capture_requires_new_origin_consent`; `dnt_gpc_and_opt_out_remain_effective`; `ui_keys_do_not_collide_with_homepage_keys`; `homepage_storage_survives_ui_preference_changes`; `old_origin_drafts_and_preferences_are_not_imported_or_deleted`; `homepage_funnel_is_same_origin_not_outbound`; `analytics_keeps_provider_hosts_and_release_environment_labels`.

### G8 — Release pipeline, browser fixtures and rollback

Files: `scripts/{release-config,release,operations,operations-health,release-manifest,release-csp,release-rollback-run,deployment-diagnostics,run-production-gate,ci-scope,check-launch-readiness,check-structured-data,check-landing-performance}.mjs`; every inventoried preview script and browser-test file in Appendix A; `.github/workflows/{verify,health,recovery,rollback}.yml`; `tests/{release,release-live,operations,production-gate,reporting-browser-fixture}.test.mjs`. G4 owns dependency-rewrite behavior within install gates; G2 owns routing behavior within packaged fixtures.

Change: exact route/origin/mount validation, staged immutable artifacts, real `/ui` fixtures, environment contamination checks, dual-host live acceptance and migration-compatible rollback. Keep recovery isolation, existing test assertions and sanitized diagnostics.

Invariant tests: `release_environment_sets_ui_bases_consistently`; `deployment_guard_accepts_only_reviewed_routes_origins_service_and_stage`; `artifact_contains_ui_home_identity_headers_and_legacy_registry`; `additive_artifact_preserves_pinned_old_site`; `manifest_rejects_cross_environment_hosts_and_wrong_base_paths`; `reserved_export_rejection_covers_root_and_ui`; `csp_gate_resolves_absolute_same_origin_assets`; `all_browser_mounts_match_ui_build`; `ci_scope_selects_migration_routing_and_origin_gates`; `live_gate_checks_canonical_and_legacy_contracts_separately`; `rollback_artifact_cannot_remove_ui_or_legacy_registry`; `rollback_rehearsal_preserves_canonical_health_reporting_and_installs`; `health_recovery_and_diagnostics_keep_existing_protections`.

## Rollout order and rollback

The redirect is the traffic cutover. Publishing new dependencies is also a compatibility cutover. Both happen only after their target is verified.

1. **Capture the baseline.** Read current Cloudflare routes/DNS/redirect rules and record Worker versions, exact route ownership, Turnstile hostnames, origins, apex robots and working old-host install/page checks. Preserve the prior immutable artifact and reporting recovery bookmark. Inspect legacy reporting URL forms and shared-origin storage. Do not delete routes, databases, static assets or old state.
2. **Prepare compatible artifacts and checks.** Build beta `/ui`, route fixtures for both production hosts, additive and redirect artifacts, and an additive rollback artifact. The additive artifact serves canonical `/ui` plus the pinned working root site and old verified JSON. Fix dependency rewriting and guards before deployment. Run focused security/release review and the relevant tests; rehearse rollback with the actual packaged layout. No legacy retirement is permitted in either stage.
3. **Make reporting origin access additive.** Add the new hostname to the existing Turnstile widget and add the new CORS origin while retaining old origins. Deploy the bounded component-URL compatibility behavior with production SITE_URL still pointing to the old site. The deployment tool must support this explicitly validated transitional state; do not bypass its guard or let an arbitrary environment override do it. Verify old submissions and new-origin preflight/hostname configuration.
4. **Deploy and verify beta.** Deploy beta `/ui` with beta SITE_URL/API, exercise the selected browser journeys, CSP/noindex/search/prefetch/reporting and disposable installs. Production host behavior is tested by packaged fixtures rather than redirecting beta to production.
5. **Serve canonical production `/ui` additively.** Deploy the registry Worker with `cojeev.com/ui*`, its coming-soon service binding and `/ui` assets, with old HTML redirects disabled. Keep old root HTML/static/registry operational. Verify bare `/ui`, route boundary delegation, apex preservation, assets/RSC, canonical tags, sitemap, real 404s and canonical health/identity. New registry paths initially serve the old verified dependency graph; commands on the new pages can already use those working new endpoints. Wait for this release's identity at the edge before judging its contract.
6. **Switch reporting link generation.** With canonical docs live, change production SITE_URL to `https://cojeev.com/ui`; retain old origins and component-input compatibility. Verify a real `/ui` browser report, attachment/receipt path and old component lifecycle input. Keep delivery states honest. Do not bulk mutate existing database links, issue bodies or queued messages.
7. **Publish the new registry and commands.** Promote regenerated canonical and root compatibility registry copies together only after every new dependency endpoint is reachable. Run old and new shadcn CLI installs and compare direct JSON delivery. Publish matching install/docs UI. Existing clients with cached old JSON still resolve old URLs directly. Verify bottom/header funnel links and share URLs.
8. **Advertise the sitemap.** Make only the one-line apex robots change in the coming-soon repo, build/deploy that app by its existing manual Wrangler process, then verify its homepage and robots. Do not redeploy the homepage from this repo's pipeline. This follows canonical sitemap acceptance, not the other way around.
9. **Enable old-page 301s.** Promote the redirect-stage registry artifact only after steps 5–8 pass. Test the old-path/query/encoding/alias/fragment matrix and direct registry/health/static exceptions immediately. Retain canonical `/ui`, compatibility registry and old static files. Observe Worker quota, errors and reporting delivery health; no DNS/custom-domain deletion or all-request Worker-first switch.
10. **Update external discovery.** After the move is live and the new template fetch/CLI checks pass, open the shadcn PR for homepage and URL and run its validation, which fetches the live registry. Update the GitHub repository Website field. PR acceptance is controlled externally: record PR URL/status separately from deployment success. Keep the old registry even after that PR merges.

Before step 9, rollback means stop promotion and restore the last additive-compatible stage; the old site stays usable. After step 9, prefer restoring the known-good `/ui` implementation while retaining routes, registry and reporting compatibility. If necessary, disable old HTML redirects and restore the pinned old root site **without removing `/ui`**. Clients/search engines may have cached 301s, and new directory links may already point there. Cached redirects cannot be reliably recalled.

Rollback website and reporting independently only within the reviewed compatible contract: retain both reporting origins, widget hostnames, legacy input normalization and an operational `/ui` SITE_URL/link target. Never replay a pre-migration artifact that restores root-only assets, old route sets, old CORS-only configuration or removes the service binding. Rollback workflow validates mount/stage compatibility before deploy; its normal manifest/provenance/schema protections still apply. No data restore is needed for this code/config move. Do not overwrite newer reports with a baseline database snapshot.

The apex sitemap may stay while `/ui/sitemap.xml` remains available. If it must be removed during an exceptional full withdrawal, deploy the robots removal first, withdraw new discovery next, and retain working `/ui` endpoints for cached redirects/new install URLs; do not call deletion a successful rollback. Permanent old registry serving remains nonnegotiable.

## Risks and mitigations

| Risk | Consequence | Required mitigation/evidence |
|---|---|---|
| Inventory top 1: base path without matching asset mount; RSC encoding redirects escape prefix | Broken styles/fonts/navigation or requests land in apex app | Physical `site/ui` layout; literal/encoded RSC and complete redirect-chain checks; real packaged and live navigation. |
| Inventory top 2: bypasses evade host routing | Old HTML stays indexable or registry gets redirected | Never exclude HTML; allow E4 static leftovers explicitly; test hosts separately, retain direct `/r` and health. |
| Inventory top 3: dependency rewrite rejects `/ui/r` | Candidate tests contact production; old installs break | Structural rewrite with remote-escape rejection; stage dependency publication after endpoints; full old/new consumer installs. |
| Inventory top 4: reporting origins and continuity | Turnstile/CORS failure, unresolved requests, unavailable drafts/receipts | Add host/origin first; canonical SITE_URL after docs live; bounded legacy URL normalization; real browser receipt checks and explicit origin-state disclosure. |
| Inventory top 5: gates/guards/rollback still assume old root or Pages | False green release; rollback removes new route | Matching `/ui` build/mount fixtures, exact artifact guards, migration stage identity and rollback rehearsal. |
| `/ui*` also catches unrelated prefixes | Registry takes ownership of future apex URLs | Boundary delegation through reviewed service binding; `/uikit` and query tests; no recursive public fetch. |
| Free-plan account request budget | Website/API availability degrades when quota is exhausted | Preserve static bypasses; inspect account-wide traffic/quota and count page/registry/redirect invocations; do not claim bypasses eliminate Worker usage. |
| Shared origin removes subdomain isolation | Storage/channel/cookie collision or consent leakage between apps | Source/runtime collision audit, distinct UI state if needed, no broad storage clearing, consent regression checks. |
| Edge propagation and persistent 301 caches | Mixed artifact behavior and limited rollback | Gate on release identity, bounded existing retries, no-store redirects during rollout, always retain working canonical endpoints. |
| Existing apex robots has a conflicting exclusion or duplicate sitemap | Discovery failure despite correct `/ui/robots.txt` | Check apex policy before deployment; one-line change only; raise a real owner conflict if broader policy edits are required. |
| New homepage attribution is nested in current brand link | Invalid interaction/accessibility or wrong navigation | Separate sibling anchors; compact/full header and bottom-link keyboard checks. |
| Old package retained for transition is stale or unverified | Additive release silently replaces a working old site | Pin and verify prior artifact identity; explicit manifest exception for temporary old HTML; never fabricate compatibility from the new base-path build. |

## Out of scope

No component redesign, namespace rename, repository move, source/license/schema/provider URL rewrite, service-worker creation, coming-soon homepage redesign, hosting-provider switch, DNS/custom-domain retirement, feedback API move, reporting schema/data migration, secret rotation, delivery-policy change, bulk GitHub/queue rewrite, cross-origin browser-state transfer, new analytics events or general test-harness refactor. No product edit, build, app launch, deployment, external PR or push occurs in this design-writing task. App/test-running time for this documentation task: 0 seconds; writing and document/diff review are separate from checks.

## Owner questions

No blocking design question remains under D1–D5 and E1–E7. One optional product decision: should the Cojeev bottom/header funnel receive a dedicated consent-governed click event? The current design preserves same-origin analytics behavior and adds no event. This can be decided separately without blocking the move. Live route conflicts, a storage collision or an apex robots exclusion are implementation preflight findings to resolve if observed, not assumed owner questions.

## Appendix A — complete inventory ownership

The supplied inventory was read in full. The map below preserves every original table entry, including repeated files, line ranges and the `indexes:` shorthand. `indexes:L` covers all three files at L: `registry.json`, `public/registry.json`, `public/r/registry.json`. Broad group file lists above include every item covered by those rows. The input describes 598 rows; the supplied Markdown contains 529 table body rows across 595 physical lines, with multiple file locations collapsed in individual rows. Coverage uses the actual entries, not that headline count. Source scans and external configuration rows are mapped too. Group invariant names apply to all of their mapped rows; generated rows are regeneration scope, navigation/preservation rows are checks rather than blanket edits.

Input: `/private/tmp/claude-501/-Users-sanjaykumar/b99c7fe4-b5bf-4620-9a6f-14caed138b85/scratchpad/inventory-for-spec.md`.

| Input line | Exact inventory file/area entry | Group |
|---|---|---|
| 11 | `next.config.ts:4,14–16` | G1 |
| 12 | `next.config.ts:3–17` | G1 |
| 13 | `package.json:14` | G1 |
| 14 | `package.json:15` | G1 |
| 15 | `.env.example:1–7` | G1 |
| 16 | `lib/site-config.ts:7` | G1 |
| 17 | `lib/site-config.ts:8` | G1 |
| 18 | `lib/site-config.ts:38–39` | G3 |
| 19 | `lib/site-config.ts:42–44` | G4 |
| 20 | `lib/site-config.ts:49,53–55` | G3 |
| 21 | `app/layout.tsx:17,19–20` | G3 |
| 22 | `app/page.tsx:10,15` | G3 |
| 23 | `app/docs/page.tsx:20–25,29` | G3 |
| 24 | `app/docs/[component]/page.tsx:47,71` | G3 |
| 25 | `app/getting-started/page.tsx:12,16` | G3 |
| 26 | `app/about/page.tsx:6` | G3 |
| 27 | `app/work-with-me/page.tsx:6` | G3 |
| 28 | `app/privacy/page.tsx:7` | G3 |
| 29 | `app/requests/page.tsx:5` | G3 |
| 30 | `app/track/page.tsx:5` | G3 |
| 31 | `app/sitemap.ts:7–8` | G3 |
| 32 | `app/robots.ts:9,14` | G3 |
| 33 | `lib/seo/structured-data.ts:49,52–55,63,74` | G3 |
| 34 | `lib/seo/structured-data.ts:94,97,102–106,114` | G3 |
| 35 | `lib/seo/structured-data.ts:122,124–126,136` | G3 |
| 36 | `lib/seo/structured-data.ts:157,159–160,164,167,174,180–181,188,195` | G3 |
| 37 | `lib/catalog.ts:66` | G4 |
| 38 | `app/docs/page.tsx:176,241` | G4 |
| 39 | `app/docs/[component]/page.tsx:125,143` | G4 |
| 40 | `app/getting-started/page.tsx:19,22` | G4 |
| 41 | `components/landing/featured-components.tsx:52,113` | G4 |
| 42 | `README.md:3,11,39–42,82` | G3 |
| 43 | `README.md:18` | G3 |
| 44 | `docs/README.md:10` | G3 |
| 45 | `docs/guides/INSTALLATION.md:16,40,52` | G3 |
| 46 | `CONTRIBUTING.md:3` | G3 |
| 47 | `docs/reporting/README.md:18` | G3 |
| 48 | `docs/reporting/README.md:60` | G3 |
| 49 | `scripts/triage/judge.ts:7` | G3 |
| 50 | `apps/triage/fixtures.ts:52` | G3 |
| 51 | `package.json:1–142` | G1 |
| 52 | GitHub repository metadata — outside tracked files | G3 |
| 53 | `components/brand/brand-sculpture.tsx:4–5,25–26` | G1 |
| 54 | `app/fonts.css:8,15` | G1 |
| 55 | `app/layout.tsx:3,30`; `app/assets.d.ts:1–2` | G1 |
| 56 | `registry/cojeev/styles/fonts.css:3–4` | G1 |
| 57 | `registry/cojeev/scripts/materialize-fonts.mjs:26,31,63–66` | G1 |
| 58 | `scripts/build-route-styles.mjs:21–33` | G1 |
| 59 | `public/brand/000h-mark-inverse.svg`, `000h-mark-pink.svg`, `000h-mark.png`, `000h-mark.svg`, `000h-sculpture.png`, `000h-sculpture.webp`, `000h-wordmark.png` | G1 |
| 60 | `app/icon.png`; `app/opengraph-image.png`; `app/twitter-image.png` | G1 |
| 61 | `app/docs-search.json/route.ts`; `app/docs/layout.tsx:22` | G5 |
| 62 | `components/docs-shell.tsx:62` | G5 |
| 63 | `lib/docs-search.ts:13`; `components/docs-search.tsx:15–18,41–44` | G5 |
| 64 | Repository-wide service-worker scan | G5 |
| 65 | Application/registry CSS scan | G5 |
| 73 | `workers/registry-host/wrangler.jsonc:21–26,59–64` | G2 |
| 74 | `workers/registry-host/wrangler.jsonc:40–45` | G2 |
| 75 | `workers/registry-host/wrangler.jsonc:32–36,50–54,69–73` | G2 |
| 76 | `workers/registry-host/wrangler.jsonc:36,54,73` | G2 |
| 77 | `workers/registry-host/src/index.mjs:6` | G2 |
| 78 | `workers/registry-host/src/index.mjs:6–11` | G2 |
| 79 | `workers/registry-host/src/index.mjs:7–8` | G2 |
| 80 | `workers/registry-host/src/index.mjs:9–10` | G2 |
| 81 | `workers/registry-host/src/index.mjs:11` | G2 |
| 82 | `workers/registry-host/src/index.mjs:11` | G2 |
| 83 | `workers/registry-host/src/index.mjs:11`; `workers/registry-host/test/static-assets.test.mjs:14` | G2 |
| 84 | `workers/registry-host/src/index.mjs:13` | G2 |
| 85 | `workers/registry-host/src/index.mjs:14` | G2 |
| 86 | `workers/registry-host/src/index.mjs:15` | G2 |
| 87 | `workers/registry-host/src/index.mjs:16` | G2 |
| 88 | `workers/registry-host/src/index.mjs:17–29` | G2 |
| 89 | `workers/registry-host/src/headers.mjs:3,9` | G2 |
| 90 | `workers/registry-host/src/headers.mjs:16–26` | G2 |
| 91 | `workers/registry-host/test/static-assets.test.mjs:12–16` | G2 |
| 92 | `workers/registry-host/test/static-assets.test.mjs:21–28` | G2 |
| 93 | `workers/registry-host/test/static-assets.test.mjs:32–33` | G2 |
| 94 | `workers/registry-host/test/hosting.test.mjs:10–16` | G2 |
| 95 | `workers/registry-host/test/hosting.test.mjs:20–22,25–26` | G2 |
| 96 | `workers/registry-host/test/registry.test.mjs:16,29,33,39,45,48` | G2 |
| 97 | `scripts/release-config.mjs:5` | G8 |
| 98 | `scripts/release-config.mjs:6` | G8 |
| 99 | `scripts/release-config.mjs:15` | G8 |
| 100 | `scripts/release.mjs:25,35–36` | G8 |
| 101 | `scripts/release.mjs:39–41` | G8 |
| 102 | `scripts/release.mjs:44–47,52` | G8 |
| 103 | `scripts/release.mjs:65–73` | G8 |
| 104 | `scripts/release.mjs:122` | G8 |
| 105 | `scripts/release.mjs:166–168` | G8 |
| 106 | `scripts/operations-health.mjs:32,36` | G8 |
| 107 | `scripts/operations.mjs:13` | G8 |
| 108 | `scripts/operations.mjs:84` | G8 |
| 109 | `scripts/operations.mjs:94` | G8 |
| 110 | `scripts/operations.mjs:99–100` | G8 |
| 111 | `scripts/operations.mjs:104–107` | G8 |
| 112 | `scripts/release-manifest.mjs:39,45–46` | G8 |
| 113 | `scripts/release-manifest.mjs:58–77` | G8 |
| 114 | `scripts/release-manifest.mjs:100` | G8 |
| 115 | `scripts/release-manifest.mjs:116` | G8 |
| 116 | `scripts/release-csp.mjs:18–21` | G8 |
| 117 | `scripts/release-csp.mjs:31` | G8 |
| 118 | `scripts/release-csp.mjs:40–42` | G8 |
| 119 | `scripts/release-csp.mjs:59–62` | G8 |
| 120 | `scripts/release-install.mjs:12,16,23,31` | G8 |
| 121 | `scripts/release-install.mjs:27` | G8 |
| 122 | `scripts/run-install-verification.mjs:12–16` | G8 |
| 123 | `scripts/run-install-verification.mjs:28–32` | G8 |
| 124 | `scripts/verify-install.mjs:11,62` | G8 |
| 125 | `scripts/run-production-gate.mjs:9,34,49` | G8 |
| 126 | `scripts/check-launch-readiness.mjs:4–13,18–30,35–52` | G8 |
| 127 | `scripts/check-structured-data.mjs:35,50–55` | G8 |
| 128 | `scripts/check-landing-performance.mjs:4,9` | G8 |
| 129 | `scripts/deployment-diagnostics.mjs:28`; `scripts/release-rollback-run.mjs:7` | G8 |
| 130 | `.github/workflows/verify.yml:110–114` | G8 |
| 131 | `.github/workflows/verify.yml:391–408` | G8 |
| 132 | `.github/workflows/verify.yml:409–411,426–442` | G8 |
| 133 | `.github/workflows/verify.yml:443–450` | G8 |
| 134 | `.github/workflows/verify.yml:463–471,475–488` | G8 |
| 135 | `.github/workflows/verify.yml:491–495` | G8 |
| 136 | `.github/workflows/verify.yml:599` | G8 |
| 137 | `.github/workflows/verify.yml:655` | G8 |
| 138 | `.github/workflows/verify.yml:634,640,690,696` | G8 |
| 139 | `.github/workflows/health.yml:29,36` | G8 |
| 140 | `.github/workflows/recovery.yml:40,47` | G8 |
| 141 | `.github/workflows/rollback.yml:62,73,80` | G8 |
| 142 | `scripts/ci-scope.mjs:167,169` | G8 |
| 143 | `scripts/ci-scope.mjs:305–328,331` | G8 |
| 144 | `scripts/ci-scope.mjs:334–349` | G8 |
| 145 | `scripts/ci-scope.mjs:392–419` | G8 |
| 153 | `workers/reporting/wrangler.jsonc:31,120` | G6 |
| 154 | `workers/reporting/wrangler.jsonc:32,121` | G6 |
| 155 | `workers/reporting/wrangler.jsonc:75–76` | G6 |
| 156 | `workers/reporting/wrangler.jsonc:23,68,112` | G6 |
| 157 | `workers/reporting/wrangler.jsonc:29,118` | G6 |
| 158 | `workers/reporting/wrangler.local.jsonc:7–8` | G6 |
| 159 | `workers/reporting/src/security.ts:30–32` | G6 |
| 160 | `workers/reporting/src/security.ts:46,49–50` | G6 |
| 161 | `workers/reporting/src/index.ts:13,20,24,40,78–80` | G6 |
| 162 | `workers/reporting/src/reports.ts:124–130` | G6 |
| 163 | `workers/reporting/src/lifecycle.ts:10–13,32–34,66` | G6 |
| 164 | `workers/reporting/src/delivery.ts:30,51,134,141` | G6 |
| 165 | `lib/reporting/client.ts:4–5,20` | G6 |
| 166 | `components/reporting/admin.tsx:43` | G6 |
| 167 | `components/reporting/turnstile.tsx:10,24` | G6 |
| 168 | `scripts/reporting.mjs:31` | G6 |
| 169 | `scripts/reporting.mjs:68,72`; `docs/reporting/README.md:60` | G6 |
| 170 | `scripts/triage/config.ts:3`; `docs/reporting/README.md:102–103` | G6 |
| 171 | `lib/reporting/contracts.ts:79–80` | G6 |
| 172 | `lib/reporting/diagnostics.ts:50,62,83` | G6 |
| 173 | `lib/reporting/diagnostics.ts:8`; `lib/reporting/capture.ts:52` | G6 |
| 174 | `lib/analytics/client.ts:76,97–100,121–124` | G7 |
| 175 | `lib/analytics/client.ts:143–150` | G7 |
| 176 | `components/analytics/analytics-provider.tsx:18–19,40,46,50` | G7 |
| 177 | `lib/analytics/client.ts:179–188` | G7 |
| 178 | `lib/analytics/client.ts:382`; `scripts/release-config.mjs:15`; `.env.example:25` | G7 |
| 179 | `lib/analytics/client.ts:3–4,402,413` | G7 |
| 180 | `components/analytics/analytics-consent.tsx:17` | G7 |
| 181 | `app/layout.tsx:35`; `components/theme-control.tsx:15,73` | G7 |
| 182 | `components/docs-shell.tsx:53,126–128` | G7 |
| 183 | `registry/cojeev/ui/appearance.tsx:18,23,29–36` | G7 |
| 184 | `registry/cojeev/motion/settings.ts:20–22,54–55,108,120,127` | G7 |
| 185 | `lib/reporting/draft.ts:11,21–22,43–44,51–55,58` | G7 |
| 186 | `lib/share.ts:10–11` | G5 |
| 187 | `components/share-button.tsx:45`; `components/install-command.tsx:12`; `components/component-handoff.tsx:27`; `components/component-preview.tsx:227` | G7 |
| 188 | `components/landing/landing-page.tsx:62`; `components/landing/featured-components.tsx:58`; `components/landing/shape-playground.tsx:49,60,64` | G7 |
| 194 | `app/docs/[component]/page.tsx:83,110,111,118,223,236` | G5 |
| 195 | `app/docs/page.tsx:56,73,85,102,244,254,259` | G5 |
| 196 | `app/docs/reference-guide/page.tsx:21` | G5 |
| 197 | `app/getting-started/page.tsx:20,21,23` | G5 |
| 198 | `app/workspace/page.tsx:13` | G5 |
| 199 | `components/analytics/analytics-consent.tsx:80` | G5 |
| 200 | `components/docs-motion.tsx:25` | G5 |
| 201 | `components/docs-navigation-entry.tsx:31` | G5 |
| 202 | `components/docs-shell.tsx:138,161,222,230,234,282` | G5 |
| 203 | `components/docs-shell.tsx:220,228,234,238` | G5 |
| 204 | `components/docs-search.tsx:15–18,41–44` | G5 |
| 205 | `components/landing/creator-page.tsx:23` | G5 |
| 206 | `components/landing/featured-components.tsx:51,109,113,115` | G5 |
| 207 | `components/landing/landing-page.tsx:49,67,78` | G5 |
| 208 | `components/landing/marketing-shell.tsx:26,50,53–55,65–67,79` | G5 |
| 209 | `components/landing/shape-playground.tsx:38` | G5 |
| 210 | `components/reporting/admin.tsx:48` | G5 |
| 211 | `components/reporting/receipt-detail.tsx:72,77` | G5 |
| 212 | `components/reporting/report-controls.tsx:112` | G5 |
| 213 | `components/reporting/reporting-widget.tsx:997,1474` | G5 |
| 214 | `components/reporting/request-board.tsx:101,105,327` | G5 |
| 220 | `scripts/audit-owned-scrollports.mjs:3` | G8 |
| 221 | `scripts/capture-recovery-finish.mjs:12` | G8 |
| 222 | `scripts/check-assembly-colour-flow.mjs:6` | G8 |
| 223 | `scripts/check-assembly-continuity.mjs:6` | G8 |
| 224 | `scripts/check-assembly-landing.mjs:6` | G8 |
| 225 | `scripts/check-bento-docs.mjs:4` | G8 |
| 226 | `scripts/check-button-paint.mjs:29,33` | G8 |
| 227 | `scripts/check-calendar-button-lifecycle.mjs:29,33` | G8 |
| 228 | `scripts/check-docs.mjs:24,28` | G8 |
| 229 | `scripts/check-icon-feedback.mjs:3` | G8 |
| 230 | `scripts/check-landing-guides.mjs:11,15–16` | G8 |
| 231 | `scripts/check-landing-smooth-scroll.mjs:13,18,61` | G8 |
| 232 | `scripts/check-launch-browser.mjs:5–6,91,95,106` | G8 |
| 233 | `scripts/check-mobile-webkit.mjs:15,23` | G8 |
| 234 | `scripts/check-motion.mjs:8–9` | G8 |
| 235 | `scripts/check-overhaul-chart-lifecycle.mjs:7` | G8 |
| 236 | `scripts/check-overhaul-charts.mjs:7` | G8 |
| 237 | `scripts/check-overhaul-data-lifecycle.mjs:13` | G8 |
| 238 | `scripts/check-overhaul-lifecycle.mjs:8` | G8 |
| 239 | `scripts/check-overhaul-long-content.mjs:9` | G8 |
| 240 | `scripts/check-overhaul-primitives.mjs:9` | G8 |
| 241 | `scripts/check-overhaul-variants.mjs:25` | G8 |
| 242 | `scripts/check-reference-effects.mjs:8` | G8 |
| 243 | `scripts/check-refinement-controls.mjs:21` | G8 |
| 244 | `scripts/check-refinement-marketing.mjs:8,12–13` | G8 |
| 245 | `scripts/check-refinement-menus-icons.mjs:8` | G8 |
| 246 | `scripts/check-refinement-theme-scroll.mjs:11` | G8 |
| 247 | `scripts/check-reporting-browser.mjs:5` | G8 |
| 248 | `scripts/check-review-motion-progress.mjs:10` | G8 |
| 249 | `scripts/check-review-selectors-lists.mjs:30` | G8 |
| 250 | `scripts/check-webkit-hidden-anchor.mjs:29,33` | G8 |
| 251 | `scripts/run-component-polish.mjs:10,14` | G8 |
| 252 | `scripts/run-reporting-browser.mjs:12,22,46` | G8 |
| 253 | `scripts/reporting-browser-fixture.mjs:21` | G8 |
| 259 | `tests/release.test.mjs:15` | G8 |
| 260 | `tests/release.test.mjs:16,51,60–62,70–75` | G8 |
| 261 | `tests/release.test.mjs:22,27,37–43` | G8 |
| 262 | `tests/release.test.mjs:94–118` | G8 |
| 263 | `tests/release-live.test.mjs:6,16,18–20,30,39,94–95,196,203` | G8 |
| 264 | `tests/operations.test.mjs:37` | G8 |
| 265 | `tests/operations.test.mjs:80–93` | G8 |
| 266 | `tests/operations.test.mjs:159–168` | G8 |
| 267 | `tests/analytics.test.ts:258–259,283,359–361` | G7 |
| 268 | `tests/analytics.browser.mjs:145` | G7 |
| 269 | `tests/reporting-contract.test.ts:20` | G6 |
| 270 | `tests/site-config.test.ts:6–7,11,19–21` | G3 |
| 271 | `tests/structured-data.test.ts:13,43–44,62,67,81,84–85,94,99–102` | G3 |
| 272 | `tests/launch-environment.test.ts:33–35,39–42` | G3 |
| 273 | `tests/run-install-verification.test.mjs:19–21` | G4 |
| 274 | `tests/production-gate.test.mjs:25` | G8 |
| 275 | `tests/reporting-browser-fixture.test.mjs:6` | G8 |
| 276 | `workers/reporting/test/integration.test.mjs:19,67,81,84,112,262,886,947,1028,1074–1075` | G6 |
| 277 | `workers/reporting/test/triage-e2e.test.mjs:13` | G6 |
| 278 | `tests/docs-search.test.ts:10` | G5 |
| 279 | `tests/share.test.ts:18` | G5 |
| 280 | `tests/triage.test.ts:213,229,239–240` | G6 |
| 286 | `tests/activity-native.browser.mjs:4` | G8 |
| 287 | `tests/activity-recovery.docs.browser.mjs:4` | G8 |
| 288 | `tests/adjustment-native.browser.mjs:6` | G8 |
| 289 | `tests/adjustment-recovery.docs.browser.mjs:5` | G8 |
| 290 | `tests/analytics-consent.browser.mjs:9,14` | G8 |
| 291 | `tests/analytics.browser.mjs:11–12,145` | G8 |
| 292 | `tests/background-picker.browser.mjs:5` | G8 |
| 293 | `tests/bento-feedback.docs.browser.mjs:15` | G8 |
| 294 | `tests/bento-recovery.docs.browser.mjs:5` | G8 |
| 295 | `tests/bento-resize-stability.docs.browser.mjs:4` | G8 |
| 296 | `tests/button-layout.browser.mjs:9` | G8 |
| 297 | `tests/button-loading.browser.mjs:8` | G8 |
| 298 | `tests/calendar-modes.browser.mjs:4` | G8 |
| 299 | `tests/calendar-native.browser.mjs:23` | G8 |
| 300 | `tests/card-collapsible-recovery.docs.browser.mjs:4` | G8 |
| 301 | `tests/carousel-native.browser.mjs:4` | G8 |
| 302 | `tests/carousel-recovery.docs.browser.mjs:4` | G8 |
| 303 | `tests/chart-recovery.docs.browser.mjs:4` | G8 |
| 304 | `tests/choice-docs.browser.mjs:4` | G8 |
| 305 | `tests/choice-native.browser.mjs:15` | G8 |
| 306 | `tests/choice-recovery.docs.browser.mjs:5` | G8 |
| 307 | `tests/collection-actions-native.browser.mjs:4` | G8 |
| 308 | `tests/collection-actions-recovery.docs.browser.mjs:4` | G8 |
| 309 | `tests/command-row.browser.mjs:6` | G8 |
| 310 | `tests/context-menu-ghost.browser.mjs:5` | G8 |
| 311 | `tests/copy-layout.browser.mjs:7` | G8 |
| 312 | `tests/dialog-recovery-native.browser.mjs:4` | G8 |
| 313 | `tests/dialog-recovery.docs.browser.mjs:4` | G8 |
| 314 | `tests/dialog-state-recovery.docs.browser.mjs:3` | G8 |
| 315 | `tests/disclosure-recovery.docs.browser.mjs:4` | G8 |
| 316 | `tests/dock-live.browser.mjs:4` | G8 |
| 317 | `tests/docs-artwork-bounds.browser.mjs:3` | G8 |
| 318 | `tests/docs-artwork.browser.mjs:6` | G8 |
| 319 | `tests/docs-button-contract.browser.mjs:6` | G8 |
| 320 | `tests/docs-compact-navigation.browser.mjs:11` | G8 |
| 321 | `tests/docs-compact-polish.browser.mjs:17` | G8 |
| 322 | `tests/docs-search.browser.mjs:10` | G8 |
| 323 | `tests/docs-sidebar-scrollbar-tracking.browser.mjs:75,80` | G8 |
| 324 | `tests/docs-sidebar-scrollbar.browser.mjs:6` | G8 |
| 325 | `tests/docs-sidebar.browser.mjs:5` | G8 |
| 326 | `tests/docs-surface-polish.browser.mjs:5` | G8 |
| 327 | `tests/docs-surfaces.browser.mjs:6` | G8 |
| 328 | `tests/docs-workshop-recovery.browser.mjs:4` | G8 |
| 329 | `tests/form-foundations.browser.mjs:21,67,82` | G8 |
| 330 | `tests/form-native.browser.mjs:5` | G8 |
| 331 | `tests/form-recovery.docs.browser.mjs:5` | G8 |
| 332 | `tests/global-scrollbar.browser.mjs:7` | G8 |
| 333 | `tests/hero-button-native.browser.mjs:4` | G8 |
| 334 | `tests/hero-button-recovery.docs.browser.mjs:4` | G8 |
| 335 | `tests/hover-hit-stability.browser.mjs:7` | G8 |
| 336 | `tests/icon-library.browser.mjs:5` | G8 |
| 337 | `tests/icon-replay.browser.mjs:7,77` | G8 |
| 338 | `tests/icon-studio-recovery.docs.browser.mjs:4` | G8 |
| 339 | `tests/identity-native.browser.mjs:4` | G8 |
| 340 | `tests/identity-recovery.docs.browser.mjs:4` | G8 |
| 341 | `tests/linear-modal-recovery-native.browser.mjs:4` | G8 |
| 342 | `tests/loading-native.browser.mjs:4` | G8 |
| 343 | `tests/loading-recovery.docs.browser.mjs:4` | G8 |
| 344 | `tests/message-progress-native.browser.mjs:4` | G8 |
| 345 | `tests/message-progress-recovery.docs.browser.mjs:4` | G8 |
| 346 | `tests/motion-controls.browser.mjs:6` | G8 |
| 347 | `tests/motion-drawer.browser.mjs:5` | G8 |
| 348 | `tests/navigation-menu-recovery.docs.browser.mjs:4` | G8 |
| 349 | `tests/navigation-native.browser.mjs:4` | G8 |
| 350 | `tests/navigation-recovery.docs.browser.mjs:4` | G8 |
| 351 | `tests/overlay-native.browser.mjs:4` | G8 |
| 352 | `tests/overlay-popups-native.browser.mjs:4` | G8 |
| 353 | `tests/overlay-recovery.docs.browser.mjs:4` | G8 |
| 354 | `tests/owned-scroll-interactions.browser.mjs:3` | G8 |
| 355 | `tests/pattern-background.browser.mjs:8` | G8 |
| 356 | `tests/preview-background-library.browser.mjs:5` | G8 |
| 357 | `tests/progression-native.browser.mjs:5` | G8 |
| 358 | `tests/progression-recovery.docs.browser.mjs:4` | G8 |
| 359 | `tests/questionnaire-native.browser.mjs:6` | G8 |
| 360 | `tests/questionnaire-recovery.docs.browser.mjs:4` | G8 |
| 361 | `tests/rapid-motion-regressions.browser.mjs:6` | G8 |
| 362 | `tests/reading-trail-native.browser.mjs:4` | G8 |
| 363 | `tests/reading-trail-recovery.docs.browser.mjs:4` | G8 |
| 364 | `tests/reference-layouts-swapy.browser.mjs:5` | G8 |
| 365 | `tests/remaining-scrollports.browser.mjs:3` | G8 |
| 366 | `tests/reporting-capture-progress.browser.mjs:6` | G8 |
| 367 | `tests/reporting-capture.browser.mjs:7` | G8 |
| 368 | `tests/reporting-continuity.browser.mjs:6` | G8 |
| 369 | `tests/reporting-early-request.browser.mjs:6` | G8 |
| 370 | `tests/reporting-late-save.browser.mjs:8` | G8 |
| 371 | `tests/reporting-pins.browser.mjs:6` | G8 |
| 372 | `tests/reporting-stack.browser.mjs:5` | G8 |
| 373 | `tests/request-board-native.browser.mjs:5` | G8 |
| 374 | `tests/round9-docs.browser.mjs:5` | G8 |
| 375 | `tests/route-styles.browser.mjs:10,14–16,68` | G8 |
| 376 | `tests/scroll-appearance.browser.mjs:8` | G8 |
| 377 | `tests/selection-native.browser.mjs:5` | G8 |
| 378 | `tests/selection-recovery.docs.browser.mjs:5` | G8 |
| 379 | `tests/shape-studio-recovery.docs.browser.mjs:4` | G8 |
| 380 | `tests/share.browser.mjs:9,13` | G8 |
| 381 | `tests/sidebar-recovery-native.browser.mjs:4` | G8 |
| 382 | `tests/sidebar-recovery.docs.browser.mjs:4` | G8 |
| 383 | `tests/slider-docs.browser.mjs:5` | G8 |
| 384 | `tests/slider-rubber.browser.mjs:6` | G8 |
| 385 | `tests/table-native.browser.mjs:4` | G8 |
| 386 | `tests/table-recovery.docs.browser.mjs:4` | G8 |
| 387 | `tests/table-scroll.browser.mjs:11,28` | G8 |
| 388 | `tests/textarea-scroll.browser.mjs:5` | G8 |
| 389 | `tests/theme-first-paint.browser.mjs:9` | G8 |
| 390 | `tests/theme-glyph-seam.browser.mjs:12` | G8 |
| 391 | `tests/toast-recovery.docs.browser.mjs:4` | G8 |
| 392 | `tests/workbench.browser.mjs:5` | G8 |
| 402 | `scripts/build-registry.mjs:9` | G4 |
| 403 | `scripts/build-registry.mjs:36` | G4 |
| 404 | `scripts/build-registry.mjs:65` | G4 |
| 405 | `scripts/build-registry.mjs:82` | G4 |
| 406 | `scripts/build-registry.mjs:83,94–96` | G4 |
| 407 | `indexes:2,4` | G4 |
| 408 | `components.json:2` | G4 |
| 409 | `public/r/accordion.json:2,11–12`; `indexes:674–675` | G4 |
| 410 | `public/r/accordion-gallery.json:2,8`; `indexes:779` | G4 |
| 411 | `public/r/action-dock.json:2,8–9`; `indexes:861–862` | G4 |
| 412 | `public/r/activity-feed.json:2,8–16`; `indexes:898–906` | G4 |
| 413 | `public/r/adjuster.json:2,10–18`; `indexes:1000–1008` | G4 |
| 414 | `public/r/agent-chat.json:2,8–20`; `indexes:1076–1088` | G4 |
| 415 | `public/r/agent-state.json:2,10`; `indexes:1451` | G4 |
| 416 | `public/r/alert.json:2,10–11`; `indexes:1539–1540` | G4 |
| 417 | `public/r/alert-dialog.json:2,11–12`; `indexes:1807–1808` | G4 |
| 418 | `public/r/ambient-background.json:2,10–11`; `indexes:1926–1927` | G4 |
| 419 | `public/r/animated-icon.json:2,10–11`; `indexes:1991–1992` | G4 |
| 420 | `public/r/animated-number.json:2,8`; `indexes:2101` | G4 |
| 421 | `public/r/appearance.json:2,8–17`; `indexes:2195–2204` | G4 |
| 422 | `public/r/area-chart.json:2,10–11`; `indexes:2289–2290` | G4 |
| 423 | `public/r/article-headings.json:2,8`; `indexes:2349` | G4 |
| 424 | `public/r/aspect-ratio.json:2,10`; `indexes:2476` | G4 |
| 425 | `public/r/assembly-part.json:2,11`; `indexes:2558` | G4 |
| 426 | `public/r/attachment.json:2,10–11`; `indexes:2731–2732` | G4 |
| 427 | `public/r/avatar.json:2,11–12`; `indexes:2818–2819` | G4 |
| 428 | `public/r/badge.json:2,10`; `indexes:3023` | G4 |
| 429 | `public/r/bar-chart.json:2,10–11`; `indexes:3231–3232` | G4 |
| 430 | `public/r/bento-builder.json:2,10–16`; `indexes:3291–3297` | G4 |
| 431 | `public/r/bento-grid.json:2,10`; `indexes:3372` | G4 |
| 432 | `public/r/breadcrumb.json:2,11–12`; `indexes:3443–3444` | G4 |
| 433 | `public/r/bubble.json:2,11–12`; `indexes:3568–3569` | G4 |
| 434 | `public/r/button.json:2,11–13`; `indexes:3767–3769` | G4 |
| 435 | `public/r/button-group.json:2,10–12`; `indexes:4034–4036` | G4 |
| 436 | `public/r/buy-me-coffee.json:2,8`; `indexes:4151` | G4 |
| 437 | `public/r/calendar.json:2,12–13`; `indexes:4235–4236` | G4 |
| 438 | `public/r/card.json:2,10–11`; `indexes:4549–4550` | G4 |
| 439 | `public/r/caret-swap.json:2,8`; `indexes:4680` | G4 |
| 440 | `public/r/carousel.json:2,11–14`; `indexes:4771–4774` | G4 |
| 441 | `public/r/chart.json:2,11–18`; `indexes:4912–4919` | G4 |
| 442 | `public/r/chart-tooltip.json:2,10–11`; `indexes:5288–5289` | G4 |
| 443 | `public/r/checkbox.json:2,12`; `indexes:5379` | G4 |
| 444 | `public/r/click-spark.json:2,10`; `indexes:5531` | G4 |
| 445 | `public/r/code-block.json:2,13–19`; `indexes:5632–5638` | G4 |
| 446 | `public/r/cojeev.json:2,732`; `indexes:26` | G4 |
| 447 | `public/r/collapsible.json:2,11–12`; `indexes:5771–5772` | G4 |
| 448 | `public/r/combobox.json:2,12–18`; `indexes:5872–5878` | G4 |
| 449 | `public/r/command.json:2,11–15`; `indexes:6057–6061` | G4 |
| 450 | `public/r/compact-dashboard.json:2,8–9`; `indexes:6200–6201` | G4 |
| 451 | `public/r/context-menu.json:2,11–14`; `indexes:6237–6240` | G4 |
| 452 | `public/r/contour-field.json:2,8`; `indexes:6384` | G4 |
| 453 | `public/r/contours-background.json:2,8–9`; `indexes:6462–6463` | G4 |
| 454 | `public/r/conversation-panel.json:2,8–9`; `indexes:6521–6522` | G4 |
| 455 | `public/r/data-table.json:2,8–12`; `indexes:6558–6562` | G4 |
| 456 | `public/r/date-picker.json:2,10–15`; `indexes:6757–6762` | G4 |
| 457 | `public/r/depth-background.json:2,10`; `indexes:7334` | G4 |
| 458 | `public/r/dialog.json:2,11–14`; `indexes:7413–7416` | G4 |
| 459 | `public/r/direction.json:2,10`; `indexes:7541` | G4 |
| 460 | `public/r/dither-dissolve.json:2,8`; `indexes:7615` | G4 |
| 461 | `public/r/dither-sculpture.json:2,8–9`; `indexes:7706–7707` | G4 |
| 462 | `public/r/dock.json:2,8–9`; `indexes:7833–7834` | G4 |
| 463 | `public/r/dots-background.json:2,8–9`; `indexes:7933–7934` | G4 |
| 464 | `public/r/drawer.json:2,11`; `indexes:7992` | G4 |
| 465 | `public/r/dropdown-menu.json:2,11–14`; `indexes:8106–8109` | G4 |
| 466 | `public/r/dropzone.json:2,10–13`; `indexes:8260–8263` | G4 |
| 467 | `public/r/elastic-mesh.json:2,10`; `indexes:8384` | G4 |
| 468 | `public/r/empty.json:2,10–11`; `indexes:8488–8489` | G4 |
| 469 | `public/r/falling-text.json:2,8`; `indexes:8695` | G4 |
| 470 | `public/r/field.json:2,11–12`; `indexes:8780–8781` | G4 |
| 471 | `public/r/float-layer.json:2,11`; `indexes:8938` | G4 |
| 472 | `public/r/flow-sculpture.json:2,8–9`; `indexes:9047–9048` | G4 |
| 473 | `public/r/focus-session.json:2,8–9`; `indexes:9145–9146` | G4 |
| 474 | `public/r/folds-background.json:2,8–9`; `indexes:9184–9185` | G4 |
| 475 | `public/r/ghost-cursor.json:2,10`; `indexes:9243` | G4 |
| 476 | `public/r/glass-sculpture.json:2,13–14`; `indexes:9347–9348` | G4 |
| 477 | `public/r/glyph-sculpture.json:2,13`; `indexes:9468` | G4 |
| 478 | `public/r/grain-dissolve.json:2,8`; `indexes:9687` | G4 |
| 479 | `public/r/grid-background.json:2,8–9`; `indexes:9778–9779` | G4 |
| 480 | `public/r/guided-pointer.json:2,8–9`; `indexes:9837–9838` | G4 |
| 481 | `public/r/hero-button.json:2,10–11`; `indexes:9928–9929` | G4 |
| 482 | `public/r/hover-card.json:2,11–12`; `indexes:10017–10018` | G4 |
| 483 | `public/r/icon.json:2,10`; `indexes:10123` | G4 |
| 484 | `public/r/image-masking.json:2,8`; `indexes:10262` | G4 |
| 485 | `public/r/image-trail.json:2,10`; `indexes:10356` | G4 |
| 486 | `public/r/infinite-spiral.json:2,8`; `indexes:10460` | G4 |
| 487 | `public/r/ink-sculpture.json:2,8–9`; `indexes:10537–10538` | G4 |
| 488 | `public/r/input.json:2,10–12`; `indexes:10675–10677` | G4 |
| 489 | `public/r/input-group.json:2,10–13`; `indexes:10854–10857` | G4 |
| 490 | `public/r/input-otp.json:2,11`; `indexes:10992` | G4 |
| 491 | `public/r/invite-card.json:2,8–9`; `indexes:11076–11077` | G4 |
| 492 | `public/r/item.json:2,10`; `indexes:11114` | G4 |
| 493 | `public/r/item-adornment.json:2,8–11`; `indexes:11343–11346` | G4 |
| 494 | `public/r/kbd.json:2,10`; `indexes:11437` | G4 |
| 495 | `public/r/label.json:2,10`; `indexes:11522` | G4 |
| 496 | `public/r/line-chart.json:2,10–11`; `indexes:11654–11655` | G4 |
| 497 | `public/r/linear-modal.json:2,11–15`; `indexes:11714–11718` | G4 |
| 498 | `public/r/living-link.json:2,8`; `indexes:11828` | G4 |
| 499 | `public/r/magic-rings.json:2,10`; `indexes:11916` | G4 |
| 500 | `public/r/marker.json:2,10`; `indexes:12020` | G4 |
| 501 | `public/r/marquee.json:2,8–10`; `indexes:12105–12107` | G4 |
| 502 | `public/r/menubar.json:2,11–14`; `indexes:12246–12249` | G4 |
| 503 | `public/r/message.json:2,10`; `indexes:12407` | G4 |
| 504 | `public/r/message-scroller.json:2,10–12`; `indexes:12537–12539` | G4 |
| 505 | `public/r/meta-balls.json:2,10`; `indexes:12629` | G4 |
| 506 | `public/r/milestone-path.json:2,10–17`; `indexes:12733–12740` | G4 |
| 507 | `public/r/motion-drawer.json:2,12–15`; `indexes:12839–12842` | G4 |
| 508 | `public/r/multi-select.json:2,8–18`; `indexes:13032–13042` | G4 |
| 509 | `public/r/native-select.json:2,10`; `indexes:13218` | G4 |
| 510 | `public/r/navigation-menu.json:2,12–16`; `indexes:13321–13325` | G4 |
| 511 | `public/r/number-input.json:2,8–11`; `indexes:13454–13457` | G4 |
| 512 | `public/r/option-wheel.json:2,8–10`; `indexes:13616–13618` | G4 |
| 513 | `public/r/orbit-images.json:2,10`; `indexes:13707` | G4 |
| 514 | `public/r/organism-assembly.json:2,8–11`; `indexes:13785–13788` | G4 |
| 515 | `public/r/organism-composition.json:2,10–25`; `indexes:13880–13895` | G4 |
| 516 | `public/r/pagination.json:2,10–13`; `indexes:14155–14158` | G4 |
| 517 | `public/r/particle-sculpture.json:2,8–9`; `indexes:14304–14305` | G4 |
| 518 | `public/r/particle-text.json:2,8`; `indexes:14414` | G4 |
| 519 | `public/r/pattern-background.json:2,8`; `indexes:14511` | G4 |
| 520 | `public/r/pebbles-background.json:2,8–9`; `indexes:14591–14592` | G4 |
| 521 | `public/r/pie-chart.json:2,10–11`; `indexes:14650–14651` | G4 |
| 522 | `public/r/pigment-field.json:2,8`; `indexes:14710` | G4 |
| 523 | `public/r/pixel-swap.json:2,10`; `indexes:14788` | G4 |
| 524 | `public/r/popover.json:2,11`; `indexes:14872` | G4 |
| 525 | `public/r/portal-field.json:2,8`; `indexes:14971` | G4 |
| 526 | `public/r/presence.json:2,11`; `indexes:15071` | G4 |
| 527 | `public/r/preview.json:2,8–19`; `indexes:15173–15184` | G4 |
| 528 | `public/r/profile-card.json:2,8–9`; `indexes:15304–15305` | G4 |
| 529 | `public/r/progress.json:2,11`; `indexes:15341` | G4 |
| 530 | `public/r/questionnaire.json:2,11–13`; `indexes:15454–15456` | G4 |
| 531 | `public/r/radar-chart.json:2,10–11`; `indexes:15716–15717` | G4 |
| 532 | `public/r/radial-chart.json:2,10–11`; `indexes:15777–15778` | G4 |
| 533 | `public/r/radio-group.json:2,12`; `indexes:15843` | G4 |
| 534 | `public/r/reading-trail.json:2,8–11`; `indexes:16049–16052` | G4 |
| 535 | `public/r/resizable.json:2,11–12`; `indexes:16135–16136` | G4 |
| 536 | `public/r/ripple-distortion.json:2,10`; `indexes:16232` | G4 |
| 537 | `public/r/scroll-area.json:2,12`; `indexes:16336` | G4 |
| 538 | `public/r/scroll-expand.json:2,8`; `indexes:16626` | G4 |
| 539 | `public/r/scroll-organism.json:2,10–11`; `indexes:16696–16697` | G4 |
| 540 | `public/r/scroll-reveal.json:2,8`; `indexes:16767` | G4 |
| 541 | `public/r/sculpture-orbit.json:2,8–13`; `indexes:16864–16869` | G4 |
| 542 | `public/r/select.json:2,11–15`; `indexes:16957–16961` | G4 |
| 543 | `public/r/semantic-bloom.json:2,8`; `indexes:17115` | G4 |
| 544 | `public/r/separator.json:2,10`; `indexes:17251` | G4 |
| 545 | `public/r/shape.json:2,10`; `indexes:17339` | G4 |
| 546 | `public/r/shape-artwork.json:2,10`; `indexes:17424` | G4 |
| 547 | `public/r/shape-scene.json:2,13–14`; `indexes:17556–17557` | G4 |
| 548 | `public/r/sheet.json:2,12`; `indexes:17664` | G4 |
| 549 | `public/r/sidebar.json:2,11–13`; `indexes:17785–17787` | G4 |
| 550 | `public/r/skeleton.json:2,11–12`; `indexes:17979–17980` | G4 |
| 551 | `public/r/slider.json:2,12`; `indexes:18187` | G4 |
| 552 | `public/r/spinner.json:2,11`; `indexes:18293` | G4 |
| 553 | `public/r/sprouts-background.json:2,8–9`; `indexes:18422–18423` | G4 |
| 554 | `public/r/stepper.json:2,10–12`; `indexes:18481–18483` | G4 |
| 555 | `public/r/strands.json:2,10`; `indexes:18660` | G4 |
| 556 | `public/r/sunwash-background.json:2,8–9`; `indexes:18764–18765` | G4 |
| 557 | `public/r/swapy.json:2,10`; `indexes:18823` | G4 |
| 558 | `public/r/swarm-cursor.json:2,10`; `indexes:18913` | G4 |
| 559 | `public/r/switch.json:2,11`; `indexes:19017` | G4 |
| 560 | `public/r/table.json:2,10–11`; `indexes:19122–19123` | G4 |
| 561 | `public/r/tabs.json:2,11–12`; `indexes:19243–19244` | G4 |
| 562 | `public/r/target-cursor.json:2,10`; `indexes:19364` | G4 |
| 563 | `public/r/text-reveal.json:2,10`; `indexes:19424` | G4 |
| 564 | `public/r/text-ribbon.json:2,8`; `indexes:19530` | G4 |
| 565 | `public/r/textarea.json:2,10–11`; `indexes:19676–19677` | G4 |
| 566 | `public/r/theme-toggle.json:2,10–11`; `indexes:19815–19816` | G4 |
| 567 | `public/r/toast.json:2,11–13`; `indexes:19902–19904` | G4 |
| 568 | `public/r/toggle.json:2,11`; `indexes:20019` | G4 |
| 569 | `public/r/toggle-group.json:2,11–12`; `indexes:20145–20146` | G4 |
| 570 | `public/r/tooltip.json:2,11`; `indexes:20218` | G4 |
| 571 | `public/r/tree.json:2,8–10`; `indexes:20321–20323` | G4 |
| 572 | `public/r/typography.json:2,10`; `indexes:20483` | G4 |
| 573 | `public/r/typography-vortex.json:2,8`; `indexes:20839` | G4 |
| 574 | `public/r/variable-proximity.json:2,8`; `indexes:20930` | G4 |
| 575 | `public/r/warp-text.json:2,8`; `indexes:21027` | G4 |
| 576 | `public/r/wave-wipe.json:2,8`; `indexes:21112` | G4 |
| 577 | `public/r/weave-background.json:2,8–9`; `indexes:21203–21204` | G4 |
| 578 | `public/r/word-relay.json:2,10`; `indexes:21262` | G4 |
| 579 | `public/r/word-stream.json:2,8`; `indexes:21409` | G4 |
| 580 | `public/r/work-side-panel.json:2,8–9`; `indexes:21506–21507` | G4 |
| 581 | `public/r/writing-caret.json:2,8`; `indexes:21543` | G4 |
| 582 | `public/r/zoom-words.json:2,8`; `indexes:21624` | G4 |
