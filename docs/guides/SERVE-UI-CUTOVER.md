# Serve 000h under /ui

Production is `https://cojeev.com/ui` (apex); beta is `https://beta.000h.cojeev.com/ui`. The owner chose apex on 2026-10-08 to require zero dashboard work. The existing `www.cojeev.com/*` → `cojeev.com/*` redirect stays untouched, so `www.cojeev.com/ui` ends at the canonical apex address. Keep both website zone routes (`cojeev.com/ui*` and `www.cojeev.com/ui*`) and both reporting CORS origins.

`scripts/release-config.mjs` owns the deployed canonical address. Build metadata, registry/install URLs, the legacy Worker redirect, reporting `SITE_URL`, and the direct production health probe (`https://cojeev.com/ui/health`) derive from it. README/install examples, CI environment links and source Wrangler defaults mirror it. Health and release probes use `redirect: 'error'` and therefore require a direct response.

`prepareStaticOutput` nests Next's export under `site/ui/`, writes `site/ui/release.json`, and leaves `_headers` and a fallback `404.html` at the asset root. CI structured-data validation reads `artifacts/release/production/site/ui`. Framework chunks and RSC text at `/ui/_next/*` and `/ui/*.txt` bypass Worker invocation. Artifact validation rejects reserved public paths under `/ui/media`, `/ui/backups`, `/ui/private` and `/ui/v1`.

Reporting verifies published component pages through the `WEBSITE` service binding to `cojeev-ui-registry` (beta: `cojeev-ui-registry-beta`), avoiding same-zone public fetch routing. Packaging derives and validates the binding for each environment. Offline local mode retains its existing bypass; tests can supply a fetcher. Production without the binding fails verification instead of falling back to a public fetch.

## Owner dashboard steps: none required

DNS is already proxied. Do not change DNS or the existing www-to-apex rule. The production release registers the legacy custom domain and both UI zone routes; beta retains its custom domain. The existing broad coming-soon route remains; the more specific UI route serves the application.

Only if the Turnstile widget restricts hostnames, verify its list: open Cloudflare → Turnstile → the production widget → Settings → Hostname management. If hostname restrictions are disabled, no action is needed. If a list is configured, confirm `cojeev.com` is present; that entry also covers subdomains. Retain existing legacy/beta entries. Add apex only if the restricted list does not already permit it. This is a conditional verification, not a required dashboard migration.

Publishing still requires owner authorization through the existing protected release workflow. This fix batch performs no publication or live infrastructure changes.

## Optional legacy-host redirect

The website Worker sends legacy `000h.cojeev.com` requests to `https://cojeev.com/ui<path>` with status 301, preserving the query string. It strips an existing leading `/ui` first: both `/r/button.json` and `/ui/r/button.json` become `/ui/r/button.json`. `/ui` becomes `/ui/`; `/health` remains a direct 200 for legacy monitoring.

An optional Single Redirect can also cover legacy static-asset bypasses, including `000h.cojeev.com/ui/_next/*` and `/ui/*.txt`. It is not required for cutover. If desired after publication, use this match (bare `/ui` stays with the Worker):

```text
(http.host eq "000h.cojeev.com" and http.request.uri.path ne "/health" and http.request.uri.path ne "/ui")
```

Dynamic destination (remove an existing `/ui/` prefix before adding the canonical prefix):

```text
concat("https://cojeev.com/ui", wildcard_replace(http.request.uri.path, "/ui/*", "/${1}"))
```

Use status **301** and enable **Preserve query string**. The wildcard replacement leaves unprefixed paths unchanged. The rule is optional because these old-host static URLs may continue serving assets during transition; the Worker handles requests that reach it. [Static asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/) describes the Worker bypass.

## Rollback across the cutover

The rollback workflow downloads the retained release artifact and verifies its original manifest digest, commit, environment and every file before deployment. It selects the contract from the artifact's homepage: `site/index.html` means the legacy root layout; `site/ui/index.html` means the new layout. Missing or simultaneous homepages are refused. No artifact bytes or manifest are rewritten.

A pre-cutover artifact restores its original root pages, root `release.json`, custom-domain-only website routes, root static bypasses, reporting `SITE_URL` and CORS list. Legacy production is `https://000h.cojeev.com`; legacy beta is `https://beta.000h.cojeev.com`. Older reporting code has no website service binding, so only root-layout validation permits its absence. New `/ui` artifacts must carry the matching binding and current routes/origins. Account, Worker names, D1/R2 targets, release identity and integrity checks remain enforced in both layouts.

Rollback remains code-only: it requires the reviewed `0002_safe_delivery.sql` schema acknowledgment and neither applies migrations nor restores data. Its post-deploy live command receives the downloaded artifact directory and probes that artifact's address and layout, including root health/release/registry paths for pre-cutover releases. A root rollback restores the old host, not an apex `/ui` application; release routes return to those stored in the artifact.

If the optional legacy-host dashboard redirect was enabled, disable it before a root-layout rollback, or it would redirect visitors and live probes away from the restored root site. No dashboard action is needed when the optional rule was never enabled. The www-to-apex rule remains untouched in either case.

## Publication acceptance

After an authorized publication, verify direct apex `/ui/health`, beta `/ui/health`, legacy `/health`, legacy homepage/docs/registry redirects with queries, `/ui` → `/ui/`, a real component JSON install, a missing URL (404), and reporting from apex through component resolution. Beta/admin pages and their RSC text must remain noindex. Verify optional static redirects only if that optional rule was enabled. Local checks do not establish live acceptance.

## Local verification (2026-10-08 fix batch)

- Typecheck: pass (4.25 s). Focused release/live/operations/registry tests: 68/68 pass (0.37 s); explicit redirect expectations then passed 7/7 (0.06 s).
- Reporting tests: 95/95 pass (13.75 s), including service-binding success, missing binding, redirects, missing pages, wrong content type and unavailable service.
- Production build with `buildEnvironment` and `prepareStaticOutput`: pass (20.79 s build). Layout is `out/ui` plus root `_headers` and `404.html`; canonical, sitemap, robots and registry URLs use apex `/ui`. Zero `www.cojeev.com`, `000h.cojeev.com` or `luv-jeri.github.io` matches in `out/`.
- Passing check-running time: about 39 s, separate from test writing, debugging and diff review. Initial failing checks exposed a missing test import, an overly narrow beta fixture assertion and a service-binding type mismatch; all were corrected. No gate, browser suite, remote API call or deployment was run. Output is local validation evidence, not a clean-source promotion artifact.
