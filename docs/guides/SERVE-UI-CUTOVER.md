# Serve 000h under /ui

Production is `https://www.cojeev.com/ui`; beta is `https://beta.000h.cojeev.com/ui`. The release target in `scripts/release-config.mjs` owns the deployed canonical origin and path. Builds, registry URLs, the legacy redirect, health probes and packaged reporting SITE_URL derive from it. Changing production to the apex later requires changing that target's `site` value and rebuilding. Both production zone routes already exist in the configuration. README examples, workflow environment display links and source Wrangler defaults mirror the current URL; keep those informational copies current when switching again.

`buildRelease` nests Next's exported files under `site/ui/`, writes identity to `site/ui/release.json`, and leaves `_headers` and a copy of `404.html` at the asset root. Its manifest covers the new layout and still verifies every byte and the release identity. Framework chunks and RSC text at `/ui/_next/*` and `/ui/*.txt` continue to bypass Worker invocation. Reserved files under `/ui/media`, `/ui/backups`, `/ui/private` and `/ui/v1` are rejected by artifact validation, including files that would otherwise bypass the Worker.

## Owner cutover steps

This branch changes no live infrastructure. After approval, publish through the existing protected beta/production release workflow. The production website configuration registers custom domain `000h.cojeev.com` plus zone routes `www.cojeev.com/ui*` and `cojeev.com/ui*` on zone `cojeev.com`. Beta retains its custom domain. The broad coming-soon route stays in place; the more specific UI route wins ([Cloudflare route matching](https://developers.cloudflare.com/workers/configuration/routing/routes/)).

1. In Cloudflare → cojeev.com → DNS, confirm both apex and `www` have proxied (orange-cloud) DNS records. Existing working proxied records need no change. If `www` has no record, add proxied CNAME `www` → `cojeev.com`; if it is DNS-only, enable proxying. Do not replace the existing apex or legacy custom-domain records. Routes require proxied DNS ([Cloudflare route setup](https://developers.cloudflare.com/workers/configuration/routing/routes/)).
2. In Cloudflare → Turnstile → the production widget → Settings → Hostname management, ensure `www.cojeev.com` and `cojeev.com` are allowed if the widget has a restricted hostname list. Adding `cojeev.com` also authorizes its subdomains; if it is already listed, no addition is needed ([Turnstile hostname management](https://developers.cloudflare.com/turnstile/additional-configuration/hostname-management/)). Retain existing legacy/beta hosts. Reporting CORS already allows both page origins and the legacy transition origin; its SITE_URL points to `/ui`.
3. In Cloudflare → cojeev.com → Rules → Redirect Rules, edit the existing `www` → apex redirect so it excludes the UI subtree. Its match should be:

   ```text
   (http.host eq "www.cojeev.com" and not (http.request.uri.path eq "/ui" or starts_with(http.request.uri.path, "/ui/")))
   ```

   Retain the root site's existing redirect destination/status/query behavior. Disable any other redirect rule that would move `www` UI requests to apex. Do not flip all apex traffic to `www`: the root site is a separate Worker. The UI route on apex serves the same export with the `www` canonical metadata.
4. Add a Single Redirect rule for the legacy host, excluding its root health endpoint:

   ```text
   (http.host eq "000h.cojeev.com" and http.request.uri.path ne "/health")
   ```

   Dynamic destination: `concat("https://www.cojeev.com/ui", http.request.uri.path)`; status **301**; **Preserve query string** enabled. `/` becomes `/ui/`. This rule is required to cover legacy requests that match the static-asset bypass, such as `/ui/_next/*` and `/ui/*.txt`. The Worker implements the redirect for requests that reach it. Cloudflare's `run_worker_first` exclusions are path-only, and asset `_redirects` cannot match a hostname ([Worker routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [redirect limitations](https://developers.cloudflare.com/workers/static-assets/redirects/)). Enable the rule when the new production release is serving; keep it during transition.
5. After publication and the rule changes, verify `/ui/health` on production and beta, legacy `/health` (200, no redirect), legacy homepage/docs/registry redirects with queries, `/ui` → `/ui/`, a real component JSON install, a missing URL (404), and reporting from the new production origin. Verify the legacy redirect also applies to `/ui/_next/*` and `/ui/*.txt`. Beta pages, admin pages and their RSC text must remain noindex. No live acceptance is claimed by this local build.

## Remaining old-host references

`git grep -n "000h.cojeev.com"` retains only these intentional groups:

| Files | Reason |
| --- | --- |
| release-config, registry-host source/config | Legacy redirect source/custom domain; beta canonical `/ui` host; transition CORS origin. |
| reporting Wrangler config | Legacy transition origin; beta SITE_URL and page origin. SITE_URL is regenerated from the release target when packaging. |
| verify.yml, release-live and release tests | Beta URL remains on its existing host with `/ui`; beta cross-environment rejection fixtures. |
| release-manifest and release tests | Explicitly forbid old production host in public dependencies, sitemap and RSC content. |
| registry-host tests | Legacy redirect, old `/health`, beta health, slash redirect and registry metric coverage. |
| reporting integration test | Reject the legacy component URL now that SITE_URL is canonical `/ui`. |
| this guide | Cutover source host, health exception and beta destination instructions. |

## Local evidence (2026-10-08)

- `npm run typecheck`: pass after Next generated its image declarations; the first clean-worktree run failed before the build generated those declarations (15.76 s), and the final run passed (17.96 s).
- `node --test tests/release.test.mjs tests/release-live.test.mjs tests/operations.test.mjs workers/registry-host/test/*.test.mjs`: 63/63 pass (0.56 s final run; earlier run before added cases 1.12 s).
- `npm run reporting:test`: 93/93 pass (17.39 s); after making the triage prompt derive its URL from the release target, its affected `triage-e2e.test.mjs` passed again (1.09 s).
- One production build using `buildEnvironment('production', SHA, {})` with Node 22.22.0, followed by `prepareStaticOutput`: pass, build 49.40 s. `out/ui` contains pages, chunks and registry JSON; the root contains only `ui`, `_headers`, and `404.html`. Zero old-host matches in `out/`; sitemap, robots, canonical and OG URLs inspected against the release target.
- Packaged the same build locally and verified 3,338 files through `createManifest`, `readArtifact` and the bundled Worker CSP check. This is verification output, not a clean-source promotion artifact.
- Local Miniflare/workerd asset runtime: `/ui/`, button docs, registry JSON, `/ui/index.txt` and `/ui/health` returned 200; a missing `/ui/` page returned 404; legacy `/health` stayed 200. Used the inline bundled Worker, as the temporary external script-path setup could not start.
- One local Chrome journey: home → get started → button docs → request board → home. Navigation stayed under `/ui` and install commands used the new canonical URL. The board showed its connection error; loopback is not an allowed production page origin, and new-origin reporting requires the deployment check above. No report was submitted.

Check-running time was about 86 s for the final passing typecheck, focused tests, reporting tests and production build, plus the affected triage rerun. This excludes test writing, diagnosis, source review, packaging and the manual browser journey. No gate or browser suite was run.

## Changed files

- Release and operations: `scripts/release-config.mjs`, `scripts/release.mjs`, `scripts/release-manifest.mjs`, `scripts/release-install.mjs`, `scripts/operations.mjs`, `scripts/verify-install.mjs`.
- Hosting: `workers/registry-host/wrangler.jsonc`, `workers/registry-host/src/index.mjs`, `workers/registry-host/src/headers.mjs`. Reporting: `workers/reporting/wrangler.jsonc`.
- CI and triage: `.github/workflows/verify.yml`, `scripts/triage/judge.ts`, `apps/triage/fixtures.ts`.
- Documentation: `README.md`, `docs/README.md`, `docs/guides/INSTALLATION.md`, this guide.
- Tests: `tests/release.test.mjs`, `tests/release-live.test.mjs`, `tests/operations.test.mjs`, `tests/reporting-browser-fixture.test.mjs`, `tests/structured-data.test.ts`, all three `workers/registry-host/test/*.test.mjs` files, `workers/reporting/test/integration.test.mjs`.
