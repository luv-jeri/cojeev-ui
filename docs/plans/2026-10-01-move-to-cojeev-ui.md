# Move 000h to cojeev.com/ui — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Serve 000h at `https://cojeev.com/ui/` while keeping every old page destination, every `000h.cojeev.com/r/*.json` install and the Cojeev homepage Worker intact.

**Architecture:** One `/ui` static export is copied into a physical `site/ui/` mount. The registry Worker gains host-aware, staged routing: it delegates apex `/ui*` siblings to the homepage, serves `/r/*.json` directly on both hosts, and, at the redirect stage, sends old pages to the same path under `/ui`. Releases become immutable per-side variants with their own deployment IDs. Separate `promote-api` and `promote-website` commands advance them through a five-pair phase table (Prepared → Mounted → Linked → Regenerated → Redirect). Reporting adds the new origin and normalizes legacy component URLs. It then checks them through a same-environment `REGISTRY_SITE` service binding.

**Tech Stack:** Next.js 16 static export (`output: "export"`), Cloudflare Workers with static assets, Wrangler 4.130.0 (build, Miniflare) and 4.131.1 (deploy runtime), `node:test`, Playwright browser scripts, GitHub Actions.

**Spec:** `docs/specs/2026-10-01-move-to-cojeev-ui-design.md` (owner-approved, all E1–E7 defaults, no funnel-click event). Inventory: `/private/tmp/claude-501/-Users-sanjaykumar/b99c7fe4-b5bf-4620-9a6f-14caed138b85/scratchpad/inventory-for-spec.md`.

**Owner override of writing-plans (wins over the skill):** this plan holds interfaces, invariants as named tests, destructive-step ordering and failure rules. It contains no function bodies. Code appears only where it is the spec: fixtures, state tables, exact config values. Builders write code against the compiler.

## Global Constraints

Exact values come from the spec. Every task implicitly includes this section.

- Canonical site: `https://cojeev.com/ui` (production) and `https://beta.000h.cojeev.com/ui` (beta). `COJEEV_BASE_PATH=/ui` for both. `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_REGISTRY_URL` and `COJEEV_REGISTRY_URL` equal the canonical site. Reporting APIs are unchanged: `https://feedback.cojeev.com` and `https://feedback-beta.cojeev.com`. Browser Origins are `https://cojeev.com` and `https://beta.000h.cojeev.com`.
- Keep `trailingSlash: true`, static export and unoptimized images. No `assetPrefix`. Never prepend `/ui` to Next `Link`/router paths. Logical routes stay unprefixed.
- Old-host 301 target: the fixed string `https://cojeev.com/ui` (beta: `https://beta.000h.cojeev.com/ui`) plus `url.pathname` plus `url.search`. Never decode, re-encode or reorder. Never derive a host from request headers. Never strip `/ui` from old-host paths.
- `000h.cojeev.com/r/{name}.json` is served directly forever: no redirect, no retirement. Old `/health` stays direct.
- Production registry routes are exactly `{"pattern":"000h.cojeev.com","custom_domain":true}` plus `{"pattern":"cojeev.com/ui*","zone_name":"cojeev.com"}`, in default and `env.production`. Beta keeps only `beta.000h.cojeev.com`. Never touch the apex `cojeev.com/*` route. Never make `cojeev.com` a custom domain.
- Service bindings:
  - Registry (production and default only): `{"binding":"COJEEV_HOMEPAGE","service":"cojeev-coming-soon"}`.
  - Reporting default/production: `{"binding":"REGISTRY_SITE","service":"cojeev-ui-registry"}`.
  - Reporting beta: `{"binding":"REGISTRY_SITE","service":"cojeev-ui-registry-beta"}`.
- `run_worker_first` starts with `/*`, `!/_next/*`, `!/ui/_next/*`, `!/ui/*.txt`, `!/ui/brand/*`, `!/ui/icon.png`, `!/ui/opengraph-image.png`, `!/ui/twitter-image.png`. After those come artifact-derived exact root-file and scoped-directory text exclusions. The list holds at most **100 raw entries**, duplicates counted. It never contains `!/*.txt` or any entry matching `/ui` siblings (`/uikit…`, `/ui-…`).
- Cache:
  - Migration 301s and the bare-`/ui` 301 send `Cache-Control: no-store`.
  - `/health`, `/ui/health` and `/ui/release.json` send `no-store`.
  - HTML, including 404 HTML, sends `public, max-age=0, must-revalidate`.
  - Missing assets get no added cache header.
- D4: visible text `Explore Cojeev`, an ordinary absolute anchor to `https://cojeev.com/`, same tab, keyboard focus styling, bottom of content, exactly once per HTML page. E3: header `by Cojeev` is a sibling anchor to `https://cojeev.com/`, never nested in the brand link.
- Migration wording, verbatim: "The site moved to cojeev.com/ui. Saved drafts and browser preferences from 000h.cojeev.com do not transfer. Keep your downloaded report receipts."
- Registry naming: official namespace `@000h-cojeev` and consumer alias `@cojeev` stay unchanged. Generated payloads are never hand-edited.
- Analytics: no new analytics event. `outbound_clicked` still ignores same-origin links.
- No D1 schema or data migration, secret rotation, Turnstile widget recreation or bulk rewrite of reports, issues or queues.
- Toolchain: release builds need Node `22.22.0` and root Wrangler `4.130.0`. The deploy runtime is Wrangler `4.131.1` from `.github/wrangler-runtime/package.json`.
- Coming-soon repository (`~/Developer/cojeev-coming-soon-performance-review`): the only change is the apex robots Sitemap line, in Part B step B8.
- **Branching (repo fact: `verify.yml` deploys beta then production on every push to `main`):**
  - Task A0 targets `main`.
  - Every other Part A PR targets the integration branch `feat/move-to-cojeev-ui`.
  - The integration branch merges to `main` only at B2 (OWNER GO).
  - From B1 until that merge, freeze release-scope merges to `main`. If one lands anyway, redo B1.
- **Verification policy (owner):**
  - While building, run only the checks the task names.
  - Run one working-app check at the end (B2).
  - Tasks tagged *consequential* also get a focused independent review at B2.
  - Each PR reports check-running time separately from test writing, debugging, review and packaging.
- **Task loop, used by every task:**
  1. Write the named tests (titles are exactly the invariant names) and run the task's command. Expect FAIL.
  2. Implement against the Interfaces block and run again. Expect PASS.
  3. Run any extra command the task lists.
  4. Commit with the given message. Open the PR against the stated base, and include the check-time line.

## Plan interpretations (the spec is silent; reviewers and owner may veto)

- **I1:** A promotion whose target phase equals that side's live phase is permitted, subject to the same peer and identity checks. This is how code updates ship within a listed pair, including routine releases after B9. The pair table's "next promotion" column governs phase changes only.
- **I2:** Pre-Linked emergency withdrawal, OWNER GO only. Before B6, a broken production `prepared` API or `mounted` website may be withdrawn as follows:
  - Run `wrangler rollback <pinned version>` for that Worker, using the version captured in B1.
  - For the website, also delete only the `cojeev.com/ui*` route.
  - Nothing depends on `/ui` yet at that point.
  - From B6 onward, this is forbidden; use targeted rollback only.
- **I3:** During the migration, pushes to `main` build and verify but do not deploy. `promote.yml` is the only deploy path. Automatic same-phase promotion resumes by itself once the live pair is the steady pair (website `redirect`, API `linked`) (A20).
- **I4:** The pinned baseline is the `release-<sha>` artifact from A0's `main` run. Every later build needs it, because A14 copies its retained root site into every website variant, including after B9. A GitHub artifact expires after 90 days at most, so B1 copies the downloaded artifact, unchanged, as `release-<commit>.tar.gz` onto a GitHub prerelease tagged `migration-baseline`, which does not expire. CI and builders download the baseline from that prerelease. The manifest digest in `scripts/release-baseline.json` still verifies it (A13's `verifyBaselineArtifact`). A0's 90-day retention only has to last until B1 makes that copy.
- **I5:** The coming-soon checkout has no robots source file (checked 2026-10-01: none in `public/`, `scripts/`, `src/` or `dist/`). B8 therefore follows the decision rule recorded in B1.

## Review Focus

These are the five unexercised inputs most likely to bite. Each has a pinning test added to its owner task.

1. **Odd old-host paths** (dot segments `%2e%2e`, `//double`, `%2F`, trailing `index.html`). Every 301 `Location` must start with `${canonicalBase}/` and must not escape `/ui` or become protocol-relative. Test `legacy_redirect_location_always_stays_under_canonical_base` in A2.
2. **Host variants** (`000H.cojeev.com`, a trailing-dot host, an explicit port, a `*.workers.dev` host). Uppercase normalizes through the URL parser. Anything else fails closed with 404, never a redirect. Test `unknown_and_variant_hosts_fail_closed` in A2.
3. **Split edge during propagation.** `/ui/health` shows the new ID while legacy `/health` or the API still shows the old one. This must count as a transient mismatch, retried within the 60 s budget, never a permanent pass or fail. Test `split_edge_identity_retries_within_budget` in A15.
4. **Old tab after redirects are on.** An in-flight tab fetches `/docs/button/index.txt?_rsc=x` on the old host. It must get the retained file or a 404, never a 301. Test `legacy_rsc_fetch_with_query_is_served_or_404_never_301` in A11.
5. **`curl -I` / HEAD.** Bare `/ui`, old pages, registry items and health must give HEAD the same status and `Location` as GET, with no body. Test `head_matches_get_for_redirects_registry_and_health` in A2.

---

# Part A — Code tasks

Each task is one PR, built by GPT Sol 6.1 and reviewed by GPT Astra. Line budget: about 400 hand-written changed lines. Regenerated `registry.json`, `public/registry.json` and `public/r/*.json` are excluded and verified by regeneration instead.

| ID | Title | Tier | Depends on | Parallel group |
|---|---|---|---|---|
| A0 | Keep release artifacts 90 days | mechanical | — | M (base `main`) |
| A1 | `/ui` build base and browser mounts | normal | — | P1 |
| A2 | Registry Worker staged routing | consequential | — | P1 |
| A3 | Reporting origins, normalization, binding, identity | consequential | — | P1 |
| A4 | Discovery checks (apex robots, shadcn template) | normal | — | P1 |
| A5 | Public docs and migration wording | mechanical | — | P1 |
| A6 | SEO, metadata and sitemap at `/ui` | normal | A1 | P2 |
| A7 | Registry base and dependency rewrite | normal | A1 | P2 |
| A8 | Navigation, search, shares and funnel links | normal | A1 | P2 |
| A9 | Analytics buckets and shared-origin storage | normal | A1 | P2 |
| A10 | Reporting client and operator surfaces | normal | A1 | P2 |
| A21 | CI scope selects migration gates | consequential | — | P1 |
| A24 | Phase table and gate evidence | consequential | — | P1 |
| A11 | Worker-first list and real asset-router harness | consequential | A2 | P2 |
| A12 | Source configs and deployment guards | consequential | A2, A3, A11, A24 | P3 |
| A13 | Manifest schema 2 and contextual host scan | consequential | A12 | P4 |
| A18 | Deployed component-lifecycle gate | consequential | A3, A12 | P4 |
| A14 | Variant packaging with pinned baseline | consequential | A1, A11, A13, A24; merges after A6–A10 (CI window rule) | P5 |
| A15 | Live, health and legacy acceptance | consequential | A13, A24 | P5 |
| A16 | Targeted promotion commands | consequential | A14, A15 | P6 |
| A17 | Packaged artifact gates | consequential | A7, A14 | P6 |
| A19 | Redirect browser checks (packaged and live) | normal | A11, A14 | P6 |
| A22 | Local rollback rehearsal | consequential | A16, A17, A18 | P7 |
| A23 | `promote.yml` and targeted `rollback.yml` | consequential | A16, A17, A18, A19 | P7 |
| A20 | `verify.yml`, health and recovery workflows | consequential | A16, A17, A19, A21, A22 | P8 |

Launch rule: start every task the moment its dependencies merge. P1 starts immediately, and A0 and B1 run alongside it. A14's tests use a fixture baseline; only its real-baseline extra command waits for B1's record (`scripts/release-baseline.json`) to merge.

**Shared-file notes.** Some files are edited by several tasks. Whichever task merges second rebases and resolves:
- `lib/site-config.ts`: A1 owns defaults (L7–8), A6 owns metadata (L38–55) and A7 owns `installCommand` (L42–44).
- `app/privacy/page.tsx`: A6 owns metadata (L7) and A9 owns the wording.
- `scripts/release.mjs`: A14 owns the build/verify code and its CLI branches, A15 owns the `live` branch and A16 owns promote/deploy/rollback/identity.
- `.github/workflows/verify.yml`: A0 owns L505 (on `main`). A20 owns everything else, including the steps that read A21's `steps.depth.outputs.run_migration`; A21 edits no workflow.
- `scripts/ci-scope.mjs`: A21 only.
- `workers/*/wrangler.jsonc`: A12 only.

**PR CI on the integration branch.** `verify.yml` runs on every pull request, including PRs to `feat/move-to-cojeev-ui`.
- Before A14, every PR must leave PR CI fully green. That is why wrangler config edits wait for the guard (A12), and why the build environment flips to `/ui` only together with the `site/ui` packaging (A14).
- From A14 until A20 merges, the `verify` job's release-packaging steps are expected to fail: `build-pair`, and the CSP, structured-data and install steps that read its output. Their callers move in A20. Each PR in that window lists those red steps by name in its description. Every other job and step (the `checkpoint` job, unit and Worker suites) must stay green.
- A14 merges only after A6–A10, so no rendered-code PR lands inside that window.
- A20 must leave PR CI fully green.

---

### Task A0: Keep release artifacts 90 days (base `main`)

**Tier:** mechanical. **Spec:** step 1 (preserve the prior immutable artifact) and I4.

**Files:** Modify `.github/workflows/verify.yml:505`, changing `retention-days: 14` to `retention-days: 90` for `release-${{ github.sha }}` only.

**Interfaces:** Produces the `main` run whose `release-<sha>` artifact becomes the pinned baseline in B1.

- [ ] 1. Run `node --test tests/ci-scope.test.mjs` before and after the edit. Expect PASS both times. If a test pins `14`, update that assertion to `90` only.
- [ ] 2. Commit `ci: keep release artifacts for the migration window` and open the PR against `main`. **OWNER GO REQUIRED to merge:** this is a routine production release through today's pipeline.

---

### Task A1: `/ui` build base and browser mounts (G1, G8 browser mounts)

**Tier:** normal. **Base:** `feat/move-to-cojeev-ui`.

**Files:**
- Modify:
  - `next.config.ts:14`: default `"/ui"`.
  - `.env.example`: `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_REGISTRY_URL` and `COJEEV_REGISTRY_URL` become `https://cojeev.com/ui`, plus a comment line naming `COJEEV_BASE_PATH=/ui`.
  - `package.json` `start`: `--base /ui/`.
  - `lib/site-config.ts:7–8`: defaults become `https://cojeev.com/ui`.
  - `components/brand/brand-sculpture.tsx`: `next/image` `src` must carry the base path, per Next docs (Images section of `basePath.md`).
  - `app/docs/layout.tsx:22`: default `"/ui"`.
- Mechanical `/cojeev-ui`→`/ui` substitutions:
  - In the 16 inline `vite.preview({base:"/cojeev-ui/"…})` calls and every `/cojeev-ui` default URL in the Appendix A preview scripts (`scripts/check-*.mjs`, `scripts/run-component-polish.mjs`, `scripts/run-reporting-browser.mjs:12,22,46`, `scripts/audit-owned-scrollports.mjs`, `scripts/capture-recovery-finish.mjs`).
  - In the 107 `tests/*.browser.mjs` files (123 occurrences).
  - In `scripts/reporting-browser-fixture.mjs:21` (`SITE_URL` becomes `${site.origin}/ui`).
  - In `scripts/check-launch-browser.mjs:5–6` (expected site becomes `https://cojeev.com/ui`).
  - In `scripts/check-reporting-browser.mjs:5`.
  - In `scripts/check-landing-performance.mjs:4,9`: the usage comment and default `BASE` become `http://127.0.0.1:4346/ui/` (Appendix row 128; it has no `/cojeev-ui` string, so the substitution alone misses it).
- Create:
  - `scripts/check-ui-export.mjs`: the post-build export check.
  - `tests/ui-base.test.mjs`.
  - `tests/ui-export.test.mjs`.
  - `tests/fixtures/ui-export/`: a minimal exported tree.
- Keep unchanged and verify only: `app/fonts.css`, `app/assets.d.ts`, `app/layout.tsx:3,30`, `scripts/build-route-styles.mjs`, `registry/cojeev/styles/fonts.css`, `registry/cojeev/scripts/materialize-fonts.mjs` and `public/brand/*`.

**Interfaces:**
- Produces:
  - `checkUiExport(directory: string, basePath: "/ui"): Promise<string[]>`, which returns problem strings (empty means pass).
  - CLI `node scripts/check-ui-export.mjs --dir out`, which exits 1 on any problem.
- Compatibility: explicit old-base cases may remain only where a test names them as compatibility. The scan allowlist below lists them by file.

**Named tests:**

| Test | File | Asserts |
|---|---|---|
| `build_uses_ui_base_without_asset_prefix` | `tests/ui-base.test.mjs` | Importing `next.config.ts` with `COJEEV_BASE_PATH` unset gives `basePath === "/ui"`, `assetPrefix === undefined`, `trailingSlash === true`, `output === "export"` and `images.unoptimized === true`. |
| `preview_mount_matches_build_base` | `tests/ui-base.test.mjs` | `package.json` `start` and every `vite.preview` `base:` in `scripts/` and `tests/` equal `"/ui/"`. |
| `all_browser_mounts_match_ui_build` | `tests/ui-base.test.mjs` | No `scripts/*.mjs` or `tests/*.browser.mjs` contains `/cojeev-ui` except the allowlist `[]`, which starts empty and gets one line per justified compatibility case. Every default loopback URL ends in `/ui`. |
| `consumer_fonts_remain_self_contained` | `tests/ui-base.test.mjs` | `registry/cojeev/styles/fonts.css` and the materializer use only `./fonts/` relative sources and never `/ui`. |
| `ui_font_preload_matches_css_resource` | `tests/ui-export.test.mjs` | `checkUiExport` flags a fixture whose `<link rel=preload as=font>` href differs from the CSS `url()` it resolves to. It passes when both are `/ui/_next/static/media/<file>.woff2`. |
| `ui_brand_and_metadata_assets_resolve` | `tests/ui-export.test.mjs` | Every brand, `icon.png`, `opengraph-image.png` and `twitter-image.png` reference in fixture HTML starts with `/ui/` (or `https://cojeev.com/ui/`) and maps to an existing file under the export root. A missing file or a root-relative `/brand/` fails. |
| `raw_export_remains_unwrapped` | `tests/ui-export.test.mjs` | `checkUiExport` passes a fixture whose `index.html`, `_next/` and `r/` sit at the export root. It fails a fixture nested as `ui/index.html` and a fixture with no root `index.html`. Packaging (A14) alone adds the `site/ui/` level. |

- [ ] 1. Follow the task loop. Command: `node --import tsx --test tests/ui-base.test.mjs tests/ui-export.test.mjs`.
- [ ] 2. Extra commands:
  - `npm run build && node scripts/check-ui-export.mjs --dir out`. Expect exit 0 and `out/index.html` present at the export root (no `out/ui/`).
  - `node tests/docs-search.browser.mjs`, as a smoke test of one rewritten browser mount.
- [ ] 3. Commit `feat: build and preview 000h under /ui`.

---

### Task A2: Registry Worker staged routing (G2 core)

**Tier:** consequential (production routing). **Base:** integration.

**Files:**
- Create:
  - `workers/registry-host/src/routing.mjs`: a pure decision module.
  - `workers/registry-host/test/routing.test.mjs`.
- Modify:
  - `workers/registry-host/src/index.mjs`: execute decisions, then apply headers and metrics.
  - `workers/registry-host/src/headers.mjs`: `noindexPath` and the `_headers` rules.
  - `workers/registry-host/test/hosting.test.mjs`.
  - `workers/registry-host/test/registry.test.mjs`.
  - `workers/registry-host/worker-configuration.d.ts`: add `COJEEV_HOMEPAGE?: Fetcher` and the new vars.
- Not in this task: `workers/registry-host/wrangler.jsonc`. A12 changes it together with the deployment guard. Today's guard accepts exactly one route and only the old `run_worker_first` shapes, so changing the config here would break `build-pair` in PR CI.

**Interfaces:**
- Produces `decide(url: URL, method: string, env: {ENVIRONMENT, MIGRATION_STAGE}): Decision`, where `Decision` is one of:
  - `{kind:"not-found"}`
  - `{kind:"delegate"}`
  - `{kind:"method-not-allowed"}`
  - `{kind:"redirect", location: string}`
  - `{kind:"health"}`
  - `{kind:"asset", mount:"canonical"|"legacy", logical: string, registryName: string|null}`
- Also produces `CANONICAL_BASE = {production:"https://cojeev.com/ui", beta:"https://beta.000h.cojeev.com/ui"}` and `LEGACY_HOST = {production:"000h.cojeev.com", beta:"beta.000h.cojeev.com"}`.
- From `headers.mjs`: `noindexPath(logical: string): boolean` matches `/admin` and `/feedback-admin`, exact or with any trailing segment. It also produces `siteHeaders(environment)`. For production, that adds `/ui/admin/*` and `/ui/feedback-admin/*` noindex rules to the existing `/admin/*` and `/feedback-admin/*`. Beta keeps `/*` with noindex.
- Health body for both `/health` and `/ui/health`, with each value read from env and defaulting to `"unconfigured"`:
  ```json
  {"status":"ok","environment":"production","release":"<40 hex>","deploymentId":"<DEPLOYMENT_ID>","phase":"<PHASE>","migrationStage":"<MIGRATION_STAGE>","registryGraph":"<REGISTRY_GRAPH>"}
  ```
- Metrics `writeDataPoint` keeps `indexes:[name]` and `blobs:[name, kind, audience, outcome]`, then appends a fifth blob: `"legacy"` for `/r/` or `"canonical"` for `/ui/r/`.

**Decision table.** This is the spec; evaluate the rows in order. `p` is `url.pathname` (encoded as parsed), `s` is `url.search`, and `L` is the logical path: `p` for the legacy mount, `p` minus its leading `/ui` for the canonical mount.

| # | Condition | Decision |
|---|---|---|
| 1 | Host is not one this env owns (production: `cojeev.com`, `000h.cojeev.com`; beta: `beta.000h.cojeev.com`) | not-found |
| 2 | Production `cojeev.com` and `p` neither `/ui` nor starting `/ui/` | delegate (request and response pass unchanged; no headers added) |
| 3 | Method not GET/HEAD | method-not-allowed (405, `Allow: GET, HEAD`) |
| 4 | `p === "/ui"` (`cojeev.com` or beta host) | redirect `${CANONICAL_BASE[env]}/` + `s` |
| 5 | Mount: `p` starts `/ui/` on `cojeev.com` or the beta host → canonical; host is the legacy host and `p` does not start `/ui/` → legacy. Production `000h.cojeev.com/ui/...` is legacy. | — |
| 6 | `L === "/health"` | health |
| 7 | `L` matches `^/(media\|backups\|private\|v1)(/\|$)` | not-found |
| 8 | `L` matches `^/r/([a-z0-9][a-z0-9-]{0,79})\.json$` | asset (registryName set; missing gives a 404 from assets, never a redirect) |
| 9 | Legacy mount and (`L` starts `/_next/` or ends `.txt`) | not-found (E4: only missing or unlisted text reaches code) |
| 10 | Legacy mount and `MIGRATION_STAGE === "redirect"` | redirect `${CANONICAL_BASE[env]}` + `p` + `s` |
| 11 | Otherwise | asset (physical path unchanged) |

**Header rules (index.mjs):**
- Delegated responses are returned untouched. Every other response gets `securityHeaders(env.ENVIRONMENT)`.
- noindex applies when the env is beta or `noindexPath(L)`.
- `no-store` applies to every redirect and to `L ∈ {"/health","/release.json"}`.
- HTML gets revalidation.
- No cache header is ever added to non-HTML. A missing binding on a delegate returns 502, and the A12 guard makes that unreachable. Any `MIGRATION_STAGE` other than `"redirect"` behaves as additive.

**Named tests** (all in `workers/registry-host/test/routing.test.mjs` unless noted; fake `ASSETS` and `COJEEV_HOMEPAGE` count calls):

| Test | Asserts |
|---|---|
| `apex_ui_route_wins_and_catches_query_bearing_bare_ui` (decision half; the route half is in A12) | `GET https://cojeev.com/ui?utm_source=move` → 301 with `Location: https://cojeev.com/ui/?utm_source=move` and no-store. |
| `ui_prefix_siblings_delegate_without_header_changes` | `/uikit?x=1`, `/ui-other` and `/uikit.txt?x=1` on `cojeev.com` → the homepage fake is called once with the identical Request, and the response object is returned byte- and header-identical (no CSP or `x-robots-tag` added). |
| `legacy_pages_301_to_same_encoded_path_and_query` | In redirect stage, `https://000h.cojeev.com/docs/button/?utm_source=move&x=a%2Fb` → 301 with exact `Location: https://cojeev.com/ui/docs/button/?utm_source=move&x=a%2Fb`. Repeated keys `?a=1&a=2` are kept in order. `/`, `/about/`, `/requests/`, `/track/`, `/feedback-admin/` and `/nope/` each map to the same path under `/ui`. |
| `legacy_alias_redirect_does_not_use_its_canonical_target` | `/work-with-me/` → `https://cojeev.com/ui/work-with-me/` (not `/ui/about/`). |
| `legacy_registry_get_and_head_never_redirect` | GET and HEAD `/r/button.json` on the old host, in both stages → asset decision with no `Location`. |
| `legacy_missing_registry_returns_404` | Assets 404 for `/r/missing.json` → 404 with no `Location`. |
| `legacy_health_stays_direct` | `000h.cojeev.com/health` gives the health JSON in both stages, no-store. |
| `beta_never_redirects_to_production` | No beta request in any stage yields a `Location` containing `cojeev.com/ui` without the `beta.000h.` prefix. |
| `beta_root_pages_redirect_same_host_preserving_encoded_path_and_query` | Beta redirect stage: `/track/?r=1`, `/feedback-admin/?report=a%2Fb` and `/docs/button/` → `https://beta.000h.cojeev.com/ui` + the identical path and query. |
| `beta_canonical_paths_do_not_double_prefix` | Beta `/ui/docs/button/` → asset (no redirect). Beta `/ui` → `/ui/`. |
| `beta_root_registry_health_and_static_exceptions_stay_direct` | Beta redirect stage: `/r/button.json` → asset, `/health` → health, and `/_next/x.js` and `/docs/x.txt` reaching code → 404. None redirect. |
| `root_and_ui_reserved_paths_are_404` | `/media/x`, `/ui/media/x`, `/v1` and `/ui/private/` → 404 on every host. |
| `retained_legacy_text_and_chunks_are_direct` (Worker half) | Legacy `/_next/*` and `*.txt` reaching code → 404 in both stages, never 301. |
| `worker_and_asset_security_headers_match` (`hosting.test.mjs`) | The Worker's headers equal the `siteHeaders` `/*` block for both environments. The CSP `connect-src` lists only origins (no path). |
| `ui_admin_and_beta_are_noindex` (`hosting.test.mjs`) | `/ui/feedback-admin/`, `/ui/feedback-admin`, `/ui/admin/x`, root `/feedback-admin/` and every beta response carry noindex. `/ui/docs/` in production does not. |
| `health_and_release_are_no_store` (`hosting.test.mjs`) | `/health`, `/ui/health` and `/ui/release.json` are no-store. HTML 404 revalidates. |
| `website_health_exposes_variant_deployment_identity` | Health JSON equals the shape above, with values taken from the env. |
| `missing_assets_are_not_long_cached` | An assets 404 for `/ui/_next/x.js` reaching code has no `cache-control` added. |
| `both_registry_paths_preserve_metrics_and_probe_labels` (`registry.test.mjs`) | `/r/cojeev.json` and `/ui/r/cojeev.json` each write one datapoint: `[name, "foundation", audience, outcome]` plus `"legacy"` or `"canonical"`. The `x-cojeev-probe: 1` label is kept. A metrics throw still returns the asset. |
| `legacy_redirect_location_always_stays_under_canonical_base` (Review Focus 1) | `/docs/%2e%2e/x`, `//evil.example/`, `/a%2Fb/` and `/docs/button/index.html` → `Location` starts with `https://cojeev.com/ui/` and never with `//`. |
| `unknown_and_variant_hosts_fail_closed` (Review Focus 2) | `000H.cojeev.com` routes as the legacy host. `000h.cojeev.com.`, `x.workers.dev` and the beta host on the production Worker → 404. |
| `head_matches_get_for_redirects_registry_and_health` (Review Focus 5) | For bare `/ui`, a legacy page in redirect stage, `/r/button.json` and `/health`, HEAD's status and `Location` equal GET's. |

- [ ] 1. Follow the task loop. Command: `npm run registry-host:test`.
- [ ] 2. Commit `feat(registry-host): host-aware staged routing for /ui`.

**Failure rule:** if any test needs the Worker to inspect `Accept` or `Referer`, or to rewrite paths, stop. That contradicts the spec.

---

### Task A3: Reporting origins, component normalization, `REGISTRY_SITE` and API identity (G6 Worker)

**Tier:** consequential (security). **Base:** integration.

**Files:**
- Modify:
  - `workers/reporting/src/types.ts`: `Env` adds `REGISTRY_SITE?: Fetcher`, `LEGACY_SITE_URL?: string`, `PHASE?: string` and `DEPLOYMENT_ID?: string`.
  - `workers/reporting/src/reports.ts`: `componentURL` normalization.
  - `workers/reporting/src/lifecycle.ts`: binding dispatch in `verifyLiveComponent`.
  - `workers/reporting/src/index.ts:14`: health identity.
  - `workers/reporting/wrangler.local.jsonc`: `SITE_URL` becomes `http://localhost:3100/ui`.
  - `workers/reporting/test/integration.test.mjs`: fixture `SITE_URL` changes from `https://library.example.com/cojeev-ui` to `https://library.example.com/ui`, and existing assertions are kept.
  - `workers/reporting/test/triage-e2e.test.mjs:13`.
- Create `workers/reporting/test/component-binding.test.mjs`.
- Verify only: `src/security.ts` and `src/delivery.ts`. Turnstile hostnames and delivery links already derive from `ALLOWED_ORIGINS` and `SITE_URL`.
- Not in this task: `workers/reporting/wrangler.jsonc`. A12 applies the table below together with the guard, because `tests/operations.test.mjs:84` validates the beta block against today's `SITE_URL` rule.

**Interfaces:**
- `componentURL(value: unknown, env: Env): string` keeps its signature and 422 message. New first step:
  - If `env.LEGACY_SITE_URL` is set and the input is `https:`, has no credentials, query or fragment, has `origin === new URL(env.LEGACY_SITE_URL).origin` and has a pathname starting `/docs/`, rewrite it to `SITE_URL` (trailing slash trimmed) plus that pathname.
  - Then run the existing canonical validation unchanged.
- `verifyLiveComponent(env: Env, value: unknown): Promise<string>`:
  - `LOCAL_MODE==="true"` returns the normalized URL, which is the existing fixture bypass.
  - Otherwise, a missing `env.REGISTRY_SITE` gives 422. Then `env.REGISTRY_SITE.fetch(url,{method:"HEAD",redirect:"manual",signal:AbortSignal.timeout(10000)})`. Status must be 200 and `Content-Type` must include `text/html`. Anything else, or any throw, gives the existing 422.
  - It never calls global `fetch`.
- Health:
  ```json
  {"status":"ok","environment":"<ENVIRONMENT>","release":"<RELEASE>","deploymentId":"<DEPLOYMENT_ID>","phase":"<PHASE>","reportingBase":"<SITE_URL>"}
  ```
  Unset values become `"unconfigured"`.
- `wrangler.jsonc` source values, applied by A12. A14 packaging sets `PHASE` and `DEPLOYMENT_ID` per variant, and sets `SITE_URL` to the legacy value for `prepared`:

| Block | `ALLOWED_ORIGINS` | `SITE_URL` | `LEGACY_SITE_URL` | `services` |
|---|---|---|---|---|
| default, production | `https://000h.cojeev.com,https://cojeev.com,https://feedback.cojeev.com,https://luv-jeri.github.io` | `https://cojeev.com/ui` | `https://000h.cojeev.com` | `[{"binding":"REGISTRY_SITE","service":"cojeev-ui-registry"}]` |
| beta | unchanged `https://beta.000h.cojeev.com,https://feedback-beta.cojeev.com` | `https://beta.000h.cojeev.com/ui` | `https://beta.000h.cojeev.com` | `[{"binding":"REGISTRY_SITE","service":"cojeev-ui-registry-beta"}]` |

All three blocks also add `"PHASE":"unconfigured","DEPLOYMENT_ID":"unconfigured"`.

**Named tests:** `component-binding.test.mjs` calls bundled helpers with fake envs, using the same pattern as integration.test.mjs L23–24. Miniflare tests use `serviceBindings: {REGISTRY_SITE: <counting stub>}`.

| Test | Asserts |
|---|---|
| `reporting_cors_accepts_cojeev_origin_without_path` (Worker half; the config half is in A12) | With the production `ALLOWED_ORIGINS` value from the table above as a Miniflare binding, a preflight with `Origin: https://cojeev.com` is allowed. |
| `reporting_wrong_origin_remains_forbidden` | `https://cojeev.com.evil.example`, `https://000h.cojeev.com/ui` (with a path) and the beta origin on production → 403. |
| `turnstile_hostname_and_reporting_action_are_verified` | A siteverify stub returning `hostname:"cojeev.com", action:"reporting"` passes. The same stub with `action:"other"` or hostname `evil.example` gets 403. |
| `new_component_url_requires_canonical_docs_path` | `https://cojeev.com/ui/docs/button/` is accepted. `https://cojeev.com/docs/button/` and `https://cojeev.com/ui/about/` get 422. |
| `approved_legacy_component_url_normalizes_before_direct_head` | Production input `https://000h.cojeev.com/docs/button/` results in a binding call to `https://cojeev.com/ui/docs/button/`, and the stored URL is that canonical one. Beta input `https://beta.000h.cojeev.com/docs/button/` dispatches `https://beta.000h.cojeev.com/ui/docs/button/`. With `SITE_URL === LEGACY_SITE_URL` (prepared), the mapping is the identity. |
| `component_normalization_rejects_credentials_queries_fragments_and_foreign_hosts` | `https://u:p@000h.cojeev.com/docs/x/`, `…/docs/x/?a=1`, `…/docs/x/#f`, `http://000h.cojeev.com/docs/x/`, `https://000h.cojeev.com/about/` and beta URLs on production → 422. |
| `invalid_component_input_never_dispatches_service_binding` | Every rejected input above → the binding stub call count is 0. |
| `reporting_live_head_binds_only_same_environment_registry` (Worker half; the config half is in A12) | A beta env with a production-host input → 422 and 0 calls. |
| `component_head_failure_does_not_resolve_or_enqueue_notification` | Stub responses of 404, 301, 308, `200 text/plain`, a throw, a 10 s timeout, or a missing binding → 422. The report status, `component_url`, webhook-event row and outbox counts are all unchanged. |
| `resolved_request_webhook_accepts_existing_legacy_component_line` | A signed GitHub webhook with an issue body line `Component: https://000h.cojeev.com/docs/button/` resolves, and the stored URL is canonical. |
| `new_delivery_links_include_ui` | With `SITE_URL=https://cojeev.com/ui`, the queued tracking, admin and component links in the payload begin `https://cojeev.com/ui/`. |
| `api_health_exposes_deployment_identity_and_reporting_base` | `/health` equals the shape above. |
| `reporting_api_and_webhook_paths_remain_at_feedback_root` | Existing `/v1/...` and `/v1/github/webhook` routes answer at the root (no `/ui`). |

- [ ] 1. Follow the task loop. Command: `npm run reporting:test`.
- [ ] 2. Commit `feat(reporting): accept cojeev.com and verify components through REGISTRY_SITE`.

**Failure rule:** if Miniflare cannot stub a service binding with a function, stop and report. Never fall back to global fetch.

---

### Task A4: Discovery checks (G3 external boundaries)

**Tier:** normal. **Base:** integration.

**Files:** Create `scripts/check-discovery.mjs` and `tests/discovery.test.mjs`.

**Interfaces:**
- `robotsProblems(before: string, after: string): string[]`. It passes only if:
  - `after === before` (with a newline appended to `before` if it had none) plus exactly `Sitemap: https://cojeev.com/ui/sitemap.xml\n`;
  - the result holds no other `Sitemap:` line;
  - no `Disallow:` rule for `*` matches `/ui/`.
  - An empty `before` (B1 captured a 404) is allowed.
- `shadcnTemplateProblems(template: string, names: string[], fetcher): Promise<string[]>`: for each name, it substitutes `{name}` and GETs with `redirect:"error"`. It requires 200, a JSON content type, and parsed `name === <name>` and `$schema` unchanged.
- CLI:
  - `node scripts/check-discovery.mjs robots BEFORE_FILE` fetches `https://cojeev.com/robots.txt`.
  - `node scripts/check-discovery.mjs shadcn-template 'https://cojeev.com/ui/r/{name}.json' button,cojeev,date-picker`.

**Named tests (stub fetcher):**

| Test | Asserts |
|---|---|
| `apex_robots_adds_only_ui_sitemap_line` | Each of these fails: a pass case with two Sitemap lines, a changed existing line, `Disallow: /ui` and a missing line. The exact append passes. |
| `shadcn_directory_template_fetches_live_json` | 200 JSON passes. Each of these fails: 301, `text/html`, a wrong `name` and invalid JSON. |

- [ ] 1. Follow the task loop. Command: `node --test tests/discovery.test.mjs`.
- [ ] 2. Commit `feat: add discovery checks for apex robots and the shadcn template`.

---

### Task A5: Public docs and migration wording (G3 docs, E1, E5)

**Tier:** mechanical. **Base:** integration.

**Files:**
- Modify `README.md:3,11,18,39–42,82`, `docs/README.md:10`, `docs/guides/INSTALLATION.md:16,40,52` and `CONTRIBUTING.md:3`.
- Create `tests/public-docs.test.mjs`.
- Keep repository, profile, license, schema and provider URLs unchanged.

**Interfaces:**
- Install examples use `https://cojeev.com/ui/r/<name>.json`.
- Each file that shows an install command also says that `https://000h.cojeev.com/r/<name>.json` keeps working.
- `docs/guides/INSTALLATION.md` contains the verbatim migration sentence.

**Named tests:**

| Test | Asserts |
|---|---|
| `public_docs_advertise_new_urls_and_explain_legacy_support` | The four files contain no `luv-jeri.github.io/cojeev-ui/r/` install URL. Every `npx shadcn` URL starts with `https://cojeev.com/ui/r/`. INSTALLATION contains the verbatim sentence and the legacy-host sentence. |
| `repository_schema_and_provider_urls_are_unchanged` (docs half) | `github.com/luv-jeri/cojeev-ui`, `ui.shadcn.com/schema` and provider URLs present at the baseline are still present. Compare against the list captured in the test from `git show a71c722:<file>`. |

- [ ] 1. Follow the task loop. Command: `node --test tests/public-docs.test.mjs`.
- [ ] 2. Commit `docs: advertise cojeev.com/ui and keep legacy installs documented`.

---

### Task A6: SEO, metadata and sitemap at `/ui` (G3 code)

**Tier:** normal. **Depends:** A1. **Base:** integration.

**Files:**
- Modify:
  - `lib/site-config.ts:38–39,47–55` (`absoluteSiteUrl`, `pageMetadata`).
  - `app/layout.tsx:14–23`.
  - The metadata lines of `app/page.tsx`, `app/docs/page.tsx`, `app/docs/[component]/page.tsx`, `app/getting-started/page.tsx`, `app/about/page.tsx`, `app/work-with-me/page.tsx`, `app/privacy/page.tsx:7`, `app/requests/page.tsx` and `app/track/page.tsx`.
  - `app/sitemap.ts`, `app/robots.ts` and `lib/seo/structured-data.ts`.
  - `scripts/triage/judge.ts:7` and `apps/triage/fixtures.ts:52`.
  - `tests/site-config.test.ts`, `tests/structured-data.test.ts` and `tests/launch-environment.test.ts`.
- Create `tests/seo-canonical.test.ts`.

**Interfaces:**
- Consumes the `site.url` default `https://cojeev.com/ui` (A1).
- Produces:
  - `absoluteSiteUrl(route, origin = site.url)`, which yields exactly one `/ui` for logical routes.
  - `robotsFile(environment)`. Non-beta gives `sitemap: https://cojeev.com/ui/sitemap.xml`; beta gives `disallow: /` and no sitemap.
- The sitemap keeps the existing route set (no track, feedback-admin or workspace) with canonical URLs.

**Named tests (`seo-canonical.test.ts` unless noted):**

| Test | Asserts |
|---|---|
| `canonical_and_social_urls_have_exactly_one_ui_prefix` | For each page's metadata: `alternates.canonical`, `openGraph.url`, OG and Twitter image URLs match `^https://cojeev\.com/ui/(?!ui/)`. |
| `structured_data_ids_and_breadcrumbs_use_canonical_site` (`structured-data.test.ts`) | Every `@id`, `url` and `item` in the home, index, component and getting-started documents starts with `https://cojeev.com/ui/`, with exact expected strings for `docs/button/`. |
| `component_aliases_keep_canonical_component_names` | Alias pages' canonical URL points at the catalog's canonical component name under `/ui/docs/`. |
| `work_with_me_canonical_remains_about` | The canonical for `/work-with-me/` is `https://cojeev.com/ui/about/`. |
| `sitemap_contains_only_canonical_public_routes` | The sitemap URL set equals the baseline route set mapped onto `https://cojeev.com/ui`, with no `track`, `feedback-admin`, `workspace` or `reviewOnly` entries. |
| `beta_robots_and_headers_block_indexing` (robots half, `launch-environment.test.ts`) | Beta robots disallows `/` and has no sitemap. Production allows `/` and the sitemap is the full canonical URL. |
| `repository_schema_and_provider_urls_are_unchanged` (code half) | `site.sourceUrl`, `site.creatorUrl` and triage repository identities are unchanged. |

- [ ] 1. Follow the task loop. Command: `node --import tsx --test tests/seo-canonical.test.ts tests/site-config.test.ts tests/structured-data.test.ts tests/launch-environment.test.ts`.
- [ ] 2. Extra: `npm run build && node scripts/check-structured-data.mjs --dir out`.
- [ ] 3. Commit `feat(seo): canonical metadata, sitemap and robots under cojeev.com/ui`.

---

### Task A7: Registry base and dependency rewrite (G4)

**Tier:** normal. **Depends:** A1. **Base:** integration.

**Files:**
- Modify:
  - `scripts/build-registry.mjs`:
    - L9 registry base default becomes `https://cojeev.com/ui`.
    - L82 `homepage` reads `NEXT_PUBLIC_SITE_URL` (default `https://cojeev.com/ui`) plus `/`, separate from the registry endpoint.
  - `components.json:2`.
  - `lib/site-config.ts:42–44` (`installCommand` default origin).
  - The install displays in `lib/catalog.ts:66`, `app/docs/page.tsx:176,241`, `app/docs/[component]/page.tsx:125,143`, `app/getting-started/page.tsx:19,22`, `components/landing/featured-components.tsx:52,113` and `components/install-command.tsx` (verify only, unless a literal exists).
  - `scripts/run-install-verification.mjs:28–32`.
  - `scripts/release-install.mjs:27`, swapping the regex for the shared function with no layout change.
  - `scripts/verify-install.mjs:11`: default `--url=https://cojeev.com/ui`, and default components `button,cojeev,date-picker`.
  - `tests/run-install-verification.test.mjs`.
- Regenerate (excluded from the line budget): `registry.json`, `public/registry.json`, `public/r/registry.json` and every `public/r/*.json`, by running `npm run registry:build`.
- Create `scripts/registry-dependency.mjs` and `tests/registry-base.test.mjs`.

**Interfaces:**
- Produces `rewriteDependency(url: string, origin: string, available: Set<string>): string`.
  - It recognizes `^https?://[^/]+(/cojeev-ui|/ui)?/r/([a-z0-9-]+\.json)$` and returns `${origin}/r/${file}`.
  - It throws `Unrecognized remote dependency` for anything else and `Dependency escapes candidate registry` when `file ∉ available`.
- Also produces `rewriteNamespace(item, origin)`, which sets `config.registries["@cojeev"]` to `${origin}/r/{name}.json`.
- Consumers: A17 `release-install.mjs`.

**Named tests (`registry-base.test.mjs` unless noted):**

| Test | Asserts |
|---|---|
| `registry_regeneration_matches_all_three_indexes` | After `npm run registry:build`, `git diff --exit-code registry.json public/registry.json public/r/` is clean, and the three indexes are byte-identical at their shared lines. |
| `all_generated_dependencies_use_reviewed_registry_base` | Every `registryDependencies` entry and `config.registries["@cojeev"]` in `public/r/*.json` starts with `https://cojeev.com/ui/r/`. No `luv-jeri.github.io` or `000h.cojeev.com` appears. |
| `registry_schemas_and_component_identity_are_unchanged` | The set of `name` values and every `$schema` equal the baseline (`git show a71c722:public/r/registry.json`). The namespace is `@000h-cojeev`. |
| `foundation_alias_maps_to_new_registry_without_renaming` | `public/r/cojeev.json` `config.registries` has exactly the key `@cojeev` → `https://cojeev.com/ui/r/{name}.json`. |
| `ui_dependencies_rewrite_to_candidate_fixture` (`run-install-verification.test.mjs`) | Fixture deps under `/ui/r/`, `/cojeev-ui/r/` and root `/r/` all rewrite to the disposable origin. |
| `candidate_install_rejects_remote_dependency_escape` (`run-install-verification.test.mjs`) | `https://evil.example/x/r/button.json`, `…/ui/../r/button.json` and a name absent from the candidate set → throws, and the stub installer is never spawned. |

- [ ] 1. Follow the task loop. Command: `node --test tests/registry-base.test.mjs tests/run-install-verification.test.mjs`.
- [ ] 2. Extra: `npm run build && node scripts/run-install-verification.mjs`, a disposable consumer install from raw `out/r`.
- [ ] 3. Commit `feat(registry): advertise cojeev.com/ui and rewrite dependencies structurally`.

---

### Task A8: Navigation, search, shares and funnel links (G5, D4, E3)

**Tier:** normal. **Depends:** A1. **Base:** integration.

**Files:**
- Create:
  - `components/explore-cojeev-link.tsx` (`ExploreCojeevLink`).
  - `app/not-found.tsx`: the exported 404 owner. None exists today. It is a minimal page with a home link and `ExploreCojeevLink`.
  - `scripts/check-funnel-links.mjs`.
  - `tests/funnel-links.test.mjs`.
  - `tests/navigation-ui.browser.mjs`.
- Modify:
  - `components/landing/marketing-shell.tsx`: header L50 splits into a brand `Link href="/"` and a sibling `<a href="https://cojeev.com/">by Cojeev</a>`, and the footer gets the link.
  - `components/landing/landing-page.tsx`, for the compact footer.
  - `components/docs-shell.tsx`:
    - The desktop brand (L161–165) and mobile brand (L282–285) split.
    - The bottom link goes inside `#docs-main` after the content.
    - The L62 fallback becomes `"/ui/docs-search.json"`.
  - `components/reporting/request-board.tsx:321`, `components/reporting/track-page.tsx`, `components/reporting/admin.tsx` and `app/workspace/page.tsx`: each appends the link at the bottom of `<main>`.
  - `app/styles/shell.css`, for focus styles only.
  - `tests/share.test.ts` and `tests/docs-search.test.ts`.
- Keep every logical route unchanged. Verify only, editing a file only if a named test below fails on it: `app/docs-search.json/route.ts`, `lib/docs-search.ts`, `components/docs-search.tsx`, `lib/share.ts` and the logical-link files of Appendix rows 194–214 (`app/docs/**`, `app/getting-started/page.tsx`, `app/workspace/page.tsx`, `components/docs-*.tsx`, `components/landing/*`, `components/analytics/analytics-consent.tsx:80` and `components/reporting/{admin,receipt-detail,report-controls,reporting-widget,request-board}.tsx`).

**Interfaces:**
- `ExploreCojeevLink(): JSX.Element` renders exactly `<a href="https://cojeev.com/" class="explore-cojeev">Explore Cojeev</a>`. It has no `target` and is not a `next/link`.
- It is rendered once per page. Nested shells never render it twice: `GuideShell` relies on `MarketingFooter`.
- `funnelLinkProblems(html: string, file: string): string[]` requires exactly one anchor with `href="https://cojeev.com/"` and text `Explore Cojeev`. It also requires that no `by Cojeev` anchor is nested inside another anchor.
- CLI `node scripts/check-funnel-links.mjs --dir out` walks every `**/*.html` file.

**Named tests:**

| Test | File | Asserts |
|---|---|---|
| `every_exported_html_page_has_one_bottom_cojeev_link` | `funnel-links.test.mjs` | `funnelLinkProblems` passes the fixture pages and fails pages with zero links, two links, or a `target="_blank"` link. The extra command runs it on real `out/`, including `out/404.html`. |
| `disabled_shell_footer_still_has_funnel_link` | `navigation-ui.browser.mjs` | Landing (compact footer), `/ui/track/`, `/ui/feedback-admin/` and `/ui/workspace/` each show one link after the main content. |
| `header_brand_and_cojeev_attribution_are_distinct_links` | `navigation-ui.browser.mjs` | In marketing and docs (desktop and 390 px mobile) headers, the brand `href` is `/ui/` or `/ui/docs/`. `by Cojeev` is a separate anchor with `href` `https://cojeev.com/`, and no anchor contains another. |
| `funnel_link_is_keyboard_accessible_in_compact_and_full_shells` | `navigation-ui.browser.mjs` | Tab reaches the link, `:focus-visible` gives a non-none outline, and Enter navigates the same tab to `https://cojeev.com/`. The request is intercepted, not fetched. |
| `next_navigation_adds_ui_once` | `navigation-ui.browser.mjs` | Clicking docs, workspace, requests, track, privacy and home links gives `location.pathname` starting `/ui/` and never `/ui/ui/`. Prefetch and RSC requests stay under `/ui/`. |
| `search_fetch_is_prefixed_and_entries_are_logical` | `docs-search.test.ts` | `DocsShell`'s default `searchUrl` is `/ui/docs-search.json`. `createDocsSearch` entries begin `/docs/`. |
| `search_selection_uses_existing_route_guard` | `docs-search.test.ts` | `navigate` ignores `/ui/docs/x/` and `https://…`, and pushes `/docs/x/`. |
| `share_uses_ui_path_without_query_or_fragment` | `share.test.ts` | `shareLink({origin:"https://cojeev.com", pathname:"/ui/docs/button/"})` → `https://cojeev.com/ui/docs/button/?utm_medium=share`. |

- [ ] 1. Follow the task loop. Command: `node --import tsx --test tests/share.test.ts tests/docs-search.test.ts tests/funnel-links.test.mjs`.
- [ ] 2. Extra: `npm run build && node scripts/check-funnel-links.mjs --dir out && node tests/navigation-ui.browser.mjs`.
- [ ] 3. Commit `feat: Explore Cojeev link on every page and separate header attribution`.

---

### Task A9: Analytics buckets and shared-origin storage (G7, E5)

**Tier:** normal. **Depends:** A1. **Base:** integration.

**Files:**
- Modify:
  - `lib/analytics/client.ts:143–151`: the base comes from the configured site URL, stripping only the exact boundary.
  - `app/privacy/page.tsx`: add the verbatim migration sentence near the drafts/preferences text.
  - `tests/analytics.test.ts`, `tests/analytics.browser.mjs` and `tests/analytics-consent.browser.mjs`.
- Create `tests/storage-coexistence.test.mjs`.
- Verify only (no edits): `components/analytics/*`, `components/theme-control.tsx`, `components/share-button.tsx:45` and the install-command analytics caller of Appendix row 187, `registry/cojeev/ui/appearance.tsx`, `registry/cojeev/motion/settings.ts` and `lib/reporting/draft.ts`.

**Interfaces:**
- `sanitizeRoute(value: string): string | null`.
  - `/ui` → `/`; `/ui/docs/button/` → `/docs/button/`; `/docs/button/` → itself; `/uikit/` → `/uikit/`.
  - Query and fragment are stripped as today. Private routes give `null`.
- Fixture data for the coexistence test, which is spec:
  ```js
  // Homepage keys from ~/Developer/cojeev-coming-soon-performance-review source, 2026-10-01
  export const HOMEPAGE_KEYS = ["cojeev-coming-soon-theme", "cojeev-preview-clock"];
  // UI-owned names; the test re-derives them by scanning app/ components/ lib/ registry/ and fails on any unlisted name
  export const UI_KEYS = ["000h.analytics-consent.v1", "000h.analytics-opt-out", "cojeev-docs-theme", "cojeev-docs-navigation", "cojeev-appearance", "cojeev-reporting-v1"];
  ```
  The builder adds the motion and flow key names found at `registry/cojeev/motion/settings.ts:20–22`.

**Named tests:**

| Test | File | Asserts |
|---|---|---|
| `ui_browser_and_router_paths_share_analytics_bucket` | `analytics.test.ts` | Browser `/ui/docs/button/` and router `/docs/button/` → `/docs/button/`. `/ui` → `/`. |
| `ui_prefix_boundary_does_not_strip_uikit` | `analytics.test.ts` | `/uikit/x` → `/uikit/x`. |
| `ui_private_routes_stay_excluded` | `analytics.test.ts` | `/ui/feedback-admin/` and `/ui/workspace/` → `null`. |
| `analytics_keeps_provider_hosts_and_release_environment_labels` | `analytics.test.ts` | `readAnalyticsConfig` host allowlist and environment/release fields are unchanged. |
| `homepage_funnel_is_same_origin_not_outbound` | `analytics.test.ts` | `categorizeOutboundUrl("https://cojeev.com/", "https://cojeev.com")` → `null`. |
| `optional_capture_requires_new_origin_consent` | `analytics.browser.mjs` | On the `/ui` fixture with empty storage, no capture request occurs before consent. Seeding `localStorage["cojeev-coming-soon-theme"]` does not enable capture. |
| `dnt_gpc_and_opt_out_remain_effective` | `analytics.browser.mjs` | DNT, GPC or opt-out each suppress capture on `/ui`. |
| `ui_privacy_banner_behavior_is_preserved` | `analytics-consent.browser.mjs` | The banner shows, persists choices and links to `/ui/privacy/`, exactly as at the old base. |
| `ui_keys_do_not_collide_with_homepage_keys` | `storage-coexistence.test.mjs` | The scan-derived UI name set equals `UI_KEYS` and is disjoint from `HOMEPAGE_KEYS`. No source calls `localStorage.clear`, `sessionStorage.clear` or `indexedDB.deleteDatabase`, and none sets cookies. No source calls `navigator.serviceWorker.register` (Appendix row 64 preservation scan). |
| `homepage_storage_survives_ui_preference_changes` | `analytics-consent.browser.mjs` | Seed both homepage keys, toggle theme, appearance, motion and consent on `/ui`, then the homepage keys are byte-identical. |
| `old_origin_drafts_and_preferences_are_not_imported_or_deleted` | `storage-coexistence.test.mjs` | No source references `000h.cojeev.com` in storage, import or postMessage code. The privacy page contains the verbatim sentence. |

- [ ] 1. Follow the task loop. Command: `node --import tsx --test tests/analytics.test.ts tests/storage-coexistence.test.mjs`.
- [ ] 2. Extra: `npm run build && node tests/analytics.browser.mjs && node tests/analytics-consent.browser.mjs`.
- [ ] 3. Commit `feat(analytics): bucket /ui routes and pin shared-origin storage`.

---

### Task A10: Reporting client and operator surfaces (G6 client)

**Tier:** normal. **Depends:** A1. **Base:** integration.

**Files:**
- Modify:
  - `lib/reporting/contracts.ts:79`: the safe-route allowlist accepts `/ui/`, `/ui/docs/<name>/` and `/ui/requests/`, and keeps `/cojeev-ui/` compatibility.
  - `scripts/reporting.mjs:31`: the Turnstile provisioning domain list gets `cojeev.com` appended, keeping existing names.
  - `scripts/reporting.mjs:68`: the default `REPORTING_API_URL` becomes `https://feedback.cojeev.com`.
  - `scripts/triage/config.ts:3`.
  - `docs/reporting/README.md:18,60,102–103`.
  - `components/reporting/admin.tsx:43`: verify, and change only if it holds a site literal.
  - `tests/reporting-contract.test.ts` and `tests/triage.test.ts`.
  - `scripts/run-reporting-browser.mjs`: follow-up assertion.
- Verify only: `lib/reporting/client.ts:4–5,20` (the reporting API base is unchanged) and `lib/reporting/diagnostics.ts:8,50,62,83`. Edit `diagnostics.ts` only if `ui_diagnostics_preserve_only_safe_public_routes` fails on it.

**Interfaces:**
- `safeRoute(value: string): string` keeps public `/ui` routes verbatim. Query, fragment, admin, workspace and dynamic segments still collapse.

**Named tests:**

| Test | File | Asserts |
|---|---|---|
| `ui_diagnostics_preserve_only_safe_public_routes` | `reporting-contract.test.ts` | `https://cojeev.com/ui/docs/button/?t=1#x` → `/ui/docs/button/`, and `/ui/requests/` and `/ui/` are kept. `/ui/feedback-admin/?report=1` and `/ui/track/#abc` are not echoed, and `/ui/workspace/x` collapses. |
| `ui_browser_submission_receipt_attachment_and_reload_work` | `scripts/run-reporting-browser.mjs` | On the `/ui` fixture with `LOCAL_MODE=true` and loopback Origin: submit with an attachment, the receipt persists, reloading `/ui/track/#…` shows it and the request board loads. |

- [ ] 1. Follow the task loop. Command: `node --import tsx --test tests/reporting-contract.test.ts tests/triage.test.ts`.
- [ ] 2. Extra: `npm run build && node scripts/run-reporting-browser.mjs`.
- [ ] 3. Commit `feat(reporting): /ui diagnostics and cojeev.com provisioning defaults`.

---

### Task A11: Worker-first list and real asset-router harness (G2 asset layer, E4)

**Tier:** consequential (production routing). **Depends:** A2. **Base:** integration.

**Files:**
- Create:
  - `scripts/worker-first.mjs`: pure list generation and validation.
  - `scripts/asset-router-harness.mjs`: runs a packaged website behind Miniflare's real asset router, next to a homepage fixture Worker.
  - `workers/registry-host/test/worker-first.test.mjs`.
  - `workers/registry-host/test/asset-router.test.mjs`.
  - `workers/registry-host/test/fixtures/packaged-site/` (tree below).
  - `workers/registry-host/test/fixtures/homepage/`: `index.html`, `404.html`, `robots.txt` and a `_headers` file whose only rule is `/*` → `X-Homepage-Fixture: 1`.
  - `workers/registry-host/test/fixtures/harness-entry.mjs`: a test-only entry that imports the real `src/index.mjs`, reports each run's pathname to the `HARNESS_LOG` binding, and returns the real response untouched.
- Modify `workers/registry-host/test/static-assets.test.mjs`: replace its local glob simulator with `ruleMatches` from `scripts/worker-first.mjs`. Keep its `_headers` parity and no-cache tests.

**Packaged fixture tree (spec; file contents are short marker strings unless noted):**
```
packaged-site/
  _headers                         # siteHeaders("production") output
  404.html                         # migrated 404, references /ui/_next/static/chunks/new.js
  index.html                       # retained root page
  index.txt                        # retained root RSC
  robots.txt                       # retained root robots
  __next.$d$x.txt                  # retained root text whose name needs an encoded variant
  _next/static/chunks/old.js       # retained legacy chunk
  docs/button/index.html
  docs/button/index.txt
  docs/button/__next.$d$component.txt
  r/button.json
  ui/index.html
  ui/index.txt
  ui/robots.txt
  ui/_next/static/chunks/new.js
  ui/docs/button/index.html
  ui/docs/button/index.txt
  ui/docs/button/__next.$d$component.txt
  ui/r/button.json                 # byte-identical to r/button.json
```

**Expected list for that fixture (spec):**
```json
["/*","!/_next/*","!/ui/_next/*","!/ui/*.txt","!/ui/brand/*","!/ui/icon.png","!/ui/opengraph-image.png","!/ui/twitter-image.png","!/__next.$d$x.txt","!/__next.%24d%24x.txt","!/index.txt","!/robots.txt","!/docs/*.txt"]
```
Order: the 8 fixed rules, then exact root files sorted by code point (each literal form followed by its percent-encoded form when they differ), then directory patterns sorted.

**Interfaces:**
- `FIXED_WORKER_FIRST: readonly string[]`: the 8 fixed rules, in Global Constraints order.
- `retainedTextInventory(siteRoot: string): Promise<{rootFiles: string[], directories: string[]}>`.
  - It reads the retained root export only, skipping `ui/`, `_next/` and `r/`.
  - `rootFiles` holds root-level `*.txt` pathnames (for example `/robots.txt`).
  - `directories` holds top-level directory names that contain any `.txt` file at any depth (for example `docs`).
- `workerFirstList(inventory): string[]`: the fixed rules, then `!/<file>` per root file, then `!/<dir>/*.txt` per directory. A name with a character outside `[A-Za-z0-9._~-]` also gets its `encodeURIComponent` form.
- `ruleMatches(rule: string, pathname: string): boolean`: Cloudflare glob semantics. `*` matches any run of characters, including `/`. The caller strips a leading `!`.
- `workerFirstProblems(list: string[], inventory?): string[]`. It returns problem strings, empty meaning pass. It reports:
  - the first 8 entries differing from `FIXED_WORKER_FIRST`;
  - more than 100 raw entries, duplicates counted;
  - any derived entry not shaped `!/<file>.txt` (no `*`) or `!/<dir>/*.txt`, including `!/*.txt`;
  - any `!` entry matching a pathname in `CODE_PROBES`;
  - when `inventory` is given, any derived entry that the inventory does not justify.
- `CODE_PROBES` (spec), which must always run code:
  ```js
  ["/ui", "/ui.txt", "/uikit", "/uikit.txt", "/ui-other.txt", "/uikit/a.txt",
   "/", "/index.html", "/404.html", "/docs/button/", "/docs/button/index.html",
   "/ui/", "/ui/docs/button/", "/ui/docs/button/index.html",
   "/r/button.json", "/ui/r/button.json", "/health", "/ui/health", "/release.json", "/ui/release.json",
   "/media/a.txt", "/backups/a.txt", "/private/a.txt", "/v1/a.txt", "/ui/media/", "/ui/v1"]
  ```
- `startAssetRouter({site, workerFirst, environment, migrationStage, homepage}): Promise<Router>`, where `Router` is:
  - `fetch(url: string, init?: RequestInit): Promise<Response>`: dispatch through the real asset router; the URL's host is the request host.
  - `homepage(url: string, init?: RequestInit): Promise<Response>`: dispatch straight to the homepage fixture.
  - `workerRuns(): string[]`: pathnames for which registry Worker code ran, in order.
  - `reset(): void` and `dispose(): Promise<void>`.
- `followChain(router, url, maxHops = 5): Promise<{hops: {status: number, location: string | null}[], final: Response}>`.
- `chainProblems(hops, {mount: "canonical" | "legacy", query: string}): string[]`.
  - Canonical: every `Location` must start `/ui/` or `${canonicalBase}/`, keep `query` and never contain `/ui/ui/`.
  - Legacy: no hop may add `/ui` and every hop must keep `query`.
- Harness construction rules:
  - Miniflare 4 runs two workers. The registry worker is the esbuild bundle of `harness-entry.mjs`, with `ASSETS` on `site` and `assets.run_worker_first` set to `workerFirst`. `not_found_handling` is `"404-page"`, and `html_handling` matches the packaged config. `serviceBindings` are `COJEEV_HOMEPAGE` → the homepage worker and `HARNESS_LOG` → a Node function.
  - The homepage worker is assets-only on `homepage` if Miniflare accepts that. Otherwise it is a pass-through `env.ASSETS.fetch` script; the PR records which one was used.
  - Prefer deriving the registry worker options from the packaged `website/wrangler.jsonc` through Wrangler 4.130.0's exported `unstable_getMiniflareWorkerOptions`, so the router config is Wrangler's own translation. Fall back to passing `assets.run_worker_first` straight to Miniflare, whose schema accepts it.
- Consumers: A17 (`check-asset-chains.mjs`), A19 (packaged browser mode) and A22 (rehearsal).

**Named tests** (`asset-router.test.mjs` runs on the fixture through `startAssetRouter`; `worker-first.test.mjs` is pure):

| Test | File | Asserts |
|---|---|---|
| `missing_ui_text_siblings_delegate_through_real_asset_router_with_body_header_parity` | asset-router | For GET and HEAD of `https://cojeev.com/uikit.txt?x=1`, `/ui-other.txt` and `/uix.txt?y=2`: `workerRuns()` records the path, and status, body bytes and every header except `date` equal `router.homepage()` for the identical request. No registry CSP and no `x-robots-tag` are present. |
| `legacy_text_exclusions_use_exact_root_files_and_scoped_directory_patterns` | worker-first | `workerFirstList(await retainedTextInventory(fixture))` deep-equals the expected list above. `workerFirstProblems` rejects lists containing `!/*.txt`, `!/ui*`, `!/ui*.txt`, `!/u*`, `!/docs/*`, `!/media/*.txt`, or `!/about/*.txt` when the inventory has no `about`. |
| `generated_run_worker_first_list_stays_within_100_entry_limit` | worker-first | A valid 100-entry list passes. 101 entries fail. 99 distinct entries plus 2 duplicates fail. |
| `ui_asset_redirects_keep_mount_and_query` | asset-router | `https://cojeev.com/ui/docs/button?x=1` and `/ui/docs/button/index.html?x=1` give asset-layer redirect chains with no `chainProblems` (canonical) that end at 200 HTML. |
| `literal_and_encoded_canonical_rsc_paths_stay_under_ui` | asset-router | The literal `$` and `%24` forms of `/ui/docs/button/__next.$d$component.txt?_rsc=1` each end at 200 with the fixture bytes, with no canonical `chainProblems`. |
| `legacy_rsc_encoding_redirect_chains_keep_root_paths_and_queries` | asset-router | With `migrationStage:"redirect"` on `https://000h.cojeev.com`, the literal and encoded forms of `/docs/button/__next.$d$component.txt?_rsc=1` and `/__next.$d$x.txt?q=1` end at 200 retained bytes or a real 404, with no legacy `chainProblems` and no 301 to `/ui`. |
| `static_bypasses_do_not_cover_html` | asset-router | Every `CODE_PROBES` path and every `.html` file in the fixture appears in `workerRuns()`. For each probe, the router's observation equals `!list.some(rule => rule.startsWith("!") && ruleMatches(rule.slice(1), path))`. |
| `retained_legacy_text_and_chunks_are_direct` (asset half; the Worker half is in A2) | asset-router | In redirect stage, legacy `/_next/static/chunks/old.js` and `/docs/button/index.txt` return 200 retained bytes and are absent from `workerRuns()`. `/_next/static/chunks/missing.js` returns 404 with no `Location`. |
| `legacy_rsc_fetch_with_query_is_served_or_404_never_301` (Review Focus 4) | asset-router | In redirect stage on the legacy host, `/docs/button/index.txt?_rsc=x` → 200 retained, `/docs/missing/index.txt?_rsc=x` → 404, and `/unlisted.txt?_rsc=1` → Worker → 404. None is 301. |

- [ ] 1. Follow the task loop. Command: `npm run registry-host:test`.
- [ ] 2. Commit `feat(registry-host): artifact-derived worker-first list and real asset-router harness`.

**Failure rules:**
- Prove the router is real: `/ui/_next/static/chunks/new.js` must be absent from `workerRuns()` while `/ui/` is present. If neither construction path achieves that, stop and report. A pathname-only mock is not acceptable.
- If the real router's Worker-run set disagrees with `ruleMatches` for any probe, the real router wins. Fix `ruleMatches`, never the probe.
- If an asset-layer chain for a canonical path escapes `/ui`, stop and report. Never add apex routes to hide it.

---

### Task A24: Phase table and gate evidence (G8 pair table)

**Tier:** consequential (release/rollback rules). **Base:** integration.

**Files:** Create `scripts/release-phases.mjs` and `tests/release-phases.test.mjs`.

**Interfaces.** These state tables are the spec, copied from the spec's permitted-pairs table:
```js
export const WEBSITE_PHASES = {
  mounted:     {MIGRATION_STAGE: "additive", REGISTRY_GRAPH: "baseline"},
  regenerated: {MIGRATION_STAGE: "additive", REGISTRY_GRAPH: "canonical"},
  redirect:    {MIGRATION_STAGE: "redirect", REGISTRY_GRAPH: "canonical"},
};
export const API_PHASES = {
  prepared: {reportingBase: "legacy"},
  linked:   {reportingBase: "canonical"},
};
// "baseline" is the pinned pre-move deployment on either side; it has no deploymentId.
export const PAIRS = [
  {name: "Prepared",    website: "baseline",    api: "prepared", initialOnly: true},
  {name: "Mounted",     website: "mounted",     api: "prepared", initialOnly: true},
  {name: "Linked",      website: "mounted",     api: "linked"},
  {name: "Regenerated", website: "regenerated", api: "linked"},
  {name: "Redirect",    website: "redirect",    api: "linked"},
];
export const STEADY_PAIR = "Redirect";
export const GATES = ["live", "component-head", "ui-browser", "browser-report", "dual-install", "discovery"];
```

Forward transitions (no `--rollback`). The start state is (baseline, baseline):

| Live pair | Side | Target | Result | Required gates (bound to the live pair) | Live precondition checked by A16 |
|---|---|---|---|---|---|
| (baseline, baseline) | api | `prepared` | Prepared | none | Website live is the B1 baseline: Cloudflare version ID and `/health` release |
| Prepared | website | `mounted` | Mounted | `live`, `component-head` | Production only: beta's live pair is Redirect |
| Mounted | api | `linked` | Linked | `live`, `ui-browser` | — |
| Linked | website | `regenerated` | Regenerated | `live`, `component-head`, `browser-report` | — |
| Regenerated | website | `redirect` | Redirect | `live`, `dual-install`, plus `discovery` in production only | — |
| any listed pair | a side whose live phase is not `baseline` | that side's live phase (I1 same-phase) | same pair | none | — |

Rollback transitions (`--rollback`). Gates are not required; peer and identity checks still are:

| Live pair | Side | Permitted targets |
|---|---|---|
| Prepared | api | `prepared` |
| Mounted | website | `mounted` |
| Mounted | api | `prepared` |
| Linked | website | `mounted` |
| Linked | api | `linked` |
| Regenerated | website | `regenerated`, and `mounted` only while `reachedRedirect === false` |
| Regenerated | api | `linked` |
| Redirect | website | `redirect`, `regenerated` |
| Redirect | api | `linked` |

Functions:
- `pairOf(websitePhase, apiPhase): Pair | undefined`.
- `assertTransition({environment, live: {website, api}, side, target, rollback, reachedRedirect}): {pair: Pair, gates: string[]}`. On refusal it throws `Error("Promotion refused: <reason>")`, with `<reason>` one of:
  - `unlisted live pair`
  - `unlisted target pair`
  - `rollback to baseline is never permitted`
  - `post-Linked rollback must keep API linked`
  - `website rollback to mounted after redirect`
  - `phase change requires its listed next promotion`
  - `--rollback required to move backwards`
- `recordGate(file, {environment, gate, website, api, commit, runId, attest?}): Promise<void>` appends one JSON line.
  - `website` and `api` are deploymentIds, or `baseline:<cloudflare version id>` for a baseline side.
  - `gate` must be in `GATES`.
  - `browser-report` requires a non-empty `attest`.
- `assertGates(file, {environment, live: {website, api}, gates}): Promise<void>` throws `Missing gate evidence: <gate>` unless each gate has a record whose environment and both IDs equal the live pair.
- CLI: `node scripts/release-phases.mjs record-gate FILE ENV GATE WEBSITE_ID API_ID [--attest=TEXT]` reads `GITHUB_SHA` and `GITHUB_RUN_ID` and prints nothing on success.

**Named tests (`tests/release-phases.test.mjs`):**

| Test | Asserts |
|---|---|
| `promotion_rejects_unlisted_phase_pairs_and_stale_peer` (phase half; the stale-peer half is in A16) | Enumerate every (website ∈ {baseline, mounted, regenerated, redirect}) × (api ∈ {baseline, prepared, linked}) pair, side, target, `rollback` and `reachedRedirect`. `assertTransition` returns exactly the rows of the two tables above with their gate lists, and throws the named reason for everything else. Examples: (redirect, prepared) is unlisted; website `redirect` from Linked fails with "phase change requires its listed next promotion"; API `prepared` from Regenerated with `--rollback` fails with "post-Linked rollback must keep API linked". |
| `deployment_guard_accepts_only_reviewed_routes_origins_bindings_and_phase_pairs` (pair half; the config half is in A12) | `pairOf` accepts exactly the five `PAIRS` rows. `WEBSITE_PHASES` and `API_PHASES` deep-equal the tables above. |
| `phase_transition_table_matches_spec` | The production `discovery` gate is required only for production. `component-head` is required for Prepared→Mounted and Linked→Regenerated. Same-phase promotion needs no gates. |
| `gate_evidence_binds_to_the_live_pair` | A record for another environment, another website ID or another API ID does not satisfy `assertGates`. `browser-report` without `attest` is rejected. An unknown gate name is rejected. |

- [ ] 1. Follow the task loop. Command: `node --test tests/release-phases.test.mjs`.
- [ ] 2. Commit `feat(release): migration phase table and gate evidence`.

**Failure rule:** if a row seems wrong while implementing, do not change it. The tables come from the spec. Stop and report.

---

### Task A21: CI scope selects migration gates (G8 CI scope)

**Tier:** consequential (a wrong scope ships unverified release changes). **Base:** integration.

**Files:** Modify `scripts/ci-scope.mjs:159–170,304–349,590–611` and `tests/ci-scope.test.mjs`. Do not edit any workflow; A20 consumes the new output.

**Interfaces:**
- `releaseDepth` adds suite `"migration-gates"` when any changed path matches `MIGRATION_GATE_PATHS` (spec list below).
- `releaseOutputs` gains `run_migration: String(decision.depth === "full" || suites.includes("migration-gates"))`. Whenever `run_migration` is `"true"`, `run_release` is also `"true"`.
- `MIGRATION_GATE_PATHS` (prefixes end in `/`):
  ```js
  ["workers/registry-host/", "workers/reporting/", "lib/reporting/", "components/reporting/", "lib/seo/",
   "app/sitemap.ts", "app/robots.ts", "lib/site-config.ts", "next.config.ts",
   "scripts/release.mjs", "scripts/release-config.mjs", "scripts/release-manifest.mjs", "scripts/release-csp.mjs",
   "scripts/release-install.mjs", "scripts/release-rollback-run.mjs", "scripts/release-phases.mjs",
   "scripts/release-variants.mjs", "scripts/release-promote.mjs", "scripts/release-baseline.json",
   "scripts/operations.mjs", "scripts/operations-health.mjs", "scripts/deployment-diagnostics.mjs",
   "scripts/worker-first.mjs", "scripts/asset-router-harness.mjs", "scripts/check-asset-chains.mjs",
   "scripts/live-install.mjs", "scripts/deployed-component-gate.mjs", "scripts/rollback-rehearsal.mjs",
   "scripts/redirect-browser.mjs", "scripts/check-discovery.mjs", "scripts/check-ui-export.mjs",
   "scripts/check-funnel-links.mjs", "scripts/registry-dependency.mjs", "scripts/run-install-verification.mjs",
   "scripts/verify-install.mjs", "scripts/check-structured-data.mjs", "scripts/check-launch-readiness.mjs",
   ".github/workflows/verify.yml", ".github/workflows/promote.yml", ".github/workflows/rollback.yml",
   ".github/workflows/health.yml", ".github/workflows/recovery.yml"]
  ```
- `CATALOGUE_EXEMPT` gains the release-only files that render nothing:
  - `scripts/release-phases.mjs`, `scripts/release-promote.mjs`, `scripts/release-baseline.json`;
  - `scripts/asset-router-harness.mjs`, `scripts/check-asset-chains.mjs`;
  - `scripts/live-install.mjs`, `scripts/deployed-component-gate.mjs`, `scripts/rollback-rehearsal.mjs`;
  - `scripts/check-discovery.mjs`, `scripts/redirect-browser.mjs`;
  - `.github/workflows/promote.yml`;
  - their `tests/*.test.mjs` files.
- `scripts/worker-first.mjs`, `scripts/check-ui-export.mjs`, `scripts/check-funnel-links.mjs` and `scripts/registry-dependency.mjs` stay out of `CATALOGUE_EXEMPT`. They decide what the packaged site contains, which is the existing comment's rule.
- These are classification strings only. Some name files that later tasks create; add no existence assertions for them.

**Named tests (`tests/ci-scope.test.mjs`):**

| Test | Asserts |
|---|---|
| `ci_scope_selects_migration_routing_and_origin_gates` | For each of these paths, `releaseOutputs(releaseDepth([p]))` gives `run_migration === "true"` and `run_release === "true"`: `workers/registry-host/src/routing.mjs`, `workers/reporting/src/lifecycle.ts`, `workers/reporting/wrangler.jsonc`, `scripts/release.mjs`, `scripts/release-phases.mjs`, `scripts/operations.mjs`, `scripts/worker-first.mjs`, `app/sitemap.ts`, `lib/seo/structured-data.ts`, `lib/site-config.ts`, `next.config.ts`, `.github/workflows/promote.yml`, `.github/workflows/rollback.yml`, `.github/workflows/health.yml` and `scripts/check-discovery.mjs`. `docs/note.md` and `scripts/triage/judge.ts` give `"false"`. `scripts/release-phases.mjs` alone gives `run_catalogue === "false"`. |

- [ ] 1. Follow the task loop. Command: `node --test tests/ci-scope.test.mjs`.
- [ ] 2. Commit `ci: select migration routing and origin gates`.

**Failure rule:** if an existing ci-scope test requires every `releaseOutputs` key to be consumed by `verify.yml`, do not add a workflow step here. Fold this task into A20 instead and say so on the PR.

---

### Task A12: Source configs and deployment guards (G2/G6 config, G8 guards)

**Tier:** consequential (production routes, origins and bindings). **Depends:** A2, A3, A11, A24. **Base:** integration.

**Files:**
- Modify:
  - `workers/registry-host/wrangler.jsonc` (all three blocks):
    - Default and `env.production`: routes per Global Constraints, `"services":[{"binding":"COJEEV_HOMEPAGE","service":"cojeev-coming-soon"}]`.
    - `env.beta`: route unchanged and no `services`.
    - Every block: vars add `MIGRATION_STAGE`, `PHASE`, `DEPLOYMENT_ID` and `REGISTRY_GRAPH`, each `"unconfigured"`, and `assets.run_worker_first` becomes exactly `FIXED_WORKER_FIRST`. `assets.directory` stays `../../out`; packaging overrides it.
  - `workers/reporting/wrangler.jsonc`: the A3 table, applied to all three blocks.
  - `scripts/release-config.mjs:4–7`: new environment fields (below). `site` is renamed `legacySite`.
  - The four existing `site` consumers, renamed only with no behavior change: `scripts/operations-health.mjs:32`, `scripts/release-csp.mjs:31,42`, `scripts/release-manifest.mjs:39` and `scripts/release.mjs:168`.
  - `scripts/operations.mjs:13,84–107`: `validateDeploymentConfig`.
  - `scripts/release.mjs`: the two existing `validateDeploymentConfig` calls (in `buildRelease` and `readArtifact`) pass `{source: true}`. This is temporary; A14 removes it.
  - `tests/operations.test.mjs:80–93`.
- Create `tests/source-config.test.mjs`.

**Interfaces:**
- `environmentConfig(environment)` returns the existing `api`, `website`, `worker`, `database`, `databaseId` and `media`, plus these fields (spec values):

| Field | beta | production |
|---|---|---|
| `legacySite` | `https://beta.000h.cojeev.com` | `https://000h.cojeev.com` |
| `canonicalSite` | `https://beta.000h.cojeev.com/ui` | `https://cojeev.com/ui` |
| `origin` | `https://beta.000h.cojeev.com` | `https://cojeev.com` |
| `basePath` | `/ui` | `/ui` |
| `routes` | `[{"pattern":"beta.000h.cojeev.com","custom_domain":true}]` | `[{"pattern":"000h.cojeev.com","custom_domain":true},{"pattern":"cojeev.com/ui*","zone_name":"cojeev.com"}]` |
| `homepageService` | `null` | `"cojeev-coming-soon"` |
| `registrySiteService` | `"cojeev-ui-registry-beta"` | `"cojeev-ui-registry"` |
| `allowedOrigins` | `["https://beta.000h.cojeev.com","https://feedback-beta.cojeev.com"]` | `["https://000h.cojeev.com","https://cojeev.com","https://feedback.cojeev.com","https://luv-jeri.github.io"]` |

- `validateDeploymentConfig(environment, config, kind, {source = false} = {})` keeps its existing checks and error format (`Deployment target mismatch: <field>`). It adds:
  - **Website:**
    - `routes` deep-equals `target.routes`.
    - `services` deep-equals `[{"binding":"COJEEV_HOMEPAGE","service":target.homepageService}]` in production and is absent or empty in beta.
    - `vars.PHASE` is a `WEBSITE_PHASES` key, and `MIGRATION_STAGE` and `REGISTRY_GRAPH` equal that phase's row.
    - `vars.DEPLOYMENT_ID` matches `^website-(mounted|regenerated|redirect)-[a-f0-9]{12}-[a-f0-9]{8}$`, with a phase segment equal to `PHASE`.
    - `assets.run_worker_first` has no `workerFirstProblems`.
    - `assets.directory === "../site"` and `not_found_handling === "404-page"` (existing).
    - The old accepted shapes `true` and `["/*","!/_next/*","!/*.txt"]` are now rejected: they belong to pre-migration artifacts, which may never be replayed.
  - **API:**
    - `services` deep-equals `[{"binding":"REGISTRY_SITE","service":target.registrySiteService}]`.
    - The `ALLOWED_ORIGINS` set equals `target.allowedOrigins`, and every entry equals its own `new URL(o).origin`.
    - `LEGACY_SITE_URL === target.legacySite`.
    - `vars.PHASE` is an `API_PHASES` key.
    - `SITE_URL` is `target.legacySite` for `prepared` and `target.canonicalSite` for `linked`.
    - `DEPLOYMENT_ID` matches `^api-(prepared|linked)-[a-f0-9]{12}-[a-f0-9]{8}$`, with a phase segment equal to `PHASE`.
    - `LOCAL_MODE === "false"`, plus the existing D1/R2 checks.
  - **`source: true`** is for source configs only. It accepts `PHASE`, `DEPLOYMENT_ID`, `MIGRATION_STAGE` and `REGISTRY_GRAPH` equal to `"unconfigured"`, and requires `run_worker_first` to equal `FIXED_WORKER_FIRST` exactly and `SITE_URL === target.canonicalSite`. Every other check is unchanged.
- Consumers: A13 (`legacySite`, `canonicalSite`, `origin`), A14 (packaging calls the validator without `source`), A15, A16, A17 and A18.

**Named tests:**

| Test | File | Asserts |
|---|---|---|
| `deployment_guard_accepts_only_reviewed_routes_origins_bindings_and_phase_pairs` (config half; the pair half is in A24) | `tests/operations.test.mjs` | Packaged-shape configs for each phase and environment pass. Each single mutation is rejected and names its field: an extra route, a missing `cojeev.com/ui*`, a `cojeev.com/*` route, `cojeev.com` as a custom domain, a missing, extra or renamed service, beta with `COJEEV_HOMEPAGE`, `REGISTRY_SITE` naming the other environment's Worker, the origin `https://cojeev.com/ui`, a missing `https://cojeev.com`, canonical `SITE_URL` with `prepared`, legacy `SITE_URL` with `linked`, a `DEPLOYMENT_ID` phase mismatch, `MIGRATION_STAGE:"redirect"` with `mounted`, `run_worker_first` containing `!/*.txt` or 101 entries, `run_worker_first: true`, and `"unconfigured"` without `source`. |
| `apex_ui_route_wins_and_catches_query_bearing_bare_ui` (route half) | `tests/source-config.test.mjs` | The default and `env.production` registry routes deep-equal the Global Constraints pair. Beta has only its custom domain. No block routes `cojeev.com/*` or makes `cojeev.com` a custom domain. |
| `reporting_cors_accepts_cojeev_origin_without_path` (config half) | `tests/source-config.test.mjs` | Every `ALLOWED_ORIGINS` entry in the three reporting blocks equals its own `new URL(o).origin`. Production includes `https://cojeev.com`. |
| `reporting_live_head_binds_only_same_environment_registry` (config half) | `tests/source-config.test.mjs` | Reporting `services` deep-equal the A3 table per block. |
| `default_and_environment_configs_agree` | `tests/source-config.test.mjs` | For each `wrangler.jsonc`, the default block's `routes`, `services`, `vars` and `assets` deep-equal `env.production`'s. Each source block passes `validateDeploymentConfig(..., {source: true})` once `assets.directory` is set to `../site`. |

- [ ] 1. Follow the task loop. Command: `node --test tests/operations.test.mjs tests/source-config.test.mjs`.
- [ ] 2. Extra: `npm run registry-host:test && npm run reporting:test && node --test tests/release.test.mjs tests/release-live.test.mjs`, to confirm the renames changed nothing.
- [ ] 3. Commit `feat(release): exact routes, bindings, origins and phase vars in deployment guards`.

**Failure rule:** keep the existing `tests/operations.test.mjs:80–93` assertions about name, D1 and the rejected `false`, `["/*"]` and `["/*","!/*"]` shapes. Change only the `true` and three-entry acceptance, and give the reason in the PR.

---

### Task A13: Manifest schema 2 and contextual host scan (G8 manifest, G5 beta anchor)

**Tier:** consequential (release integrity). **Depends:** A12. **Base:** integration.

**Files:**
- Modify:
  - `scripts/release-manifest.mjs:39,45–46,58–77,100,116`.
  - `tests/release.test.mjs:16,51,60–62,70–75`. Move schema-1 assertions to `verifyBaselineArtifact`, and keep their intent.
- Create:
  - `tests/release-manifest-scan.test.mjs`.
  - `tests/fixtures/manifest-scan/`: one small file per row of the fixture table below.

**Interfaces:**
- `createManifest(directory, environment, commit, identity)`.
  - `identity = {side: "website" | "api", phase, deploymentId, migrationStage?, registryGraph?, reportingBase?, baseline?: {commit, digest, hashes: Map<string, string>}}`.
  - It returns:
    ```json
    {"schema":2,"environment":"production","commit":"<40 hex>","side":"website","phase":"mounted","deploymentId":"website-mounted-<12 hex>-<8 hex>","migrationStage":"additive","registryGraph":"baseline","reportingBase":null,"baseline":{"commit":"<40 hex>","digest":"<sha256>"},"files":[…]}
    ```
  - `files` keeps its existing entry shape and adds `origin: "build" | "baseline"` per entry. An entry is `baseline` only when its path and sha256 equal an entry of `identity.baseline.hashes`.
  - It rejects reserved paths matching `^site/(ui/)?(media|backups|private|v1)(/|$)`.
  - For website: it requires `site/ui/index.html` and `site/ui/release.json`. Root `site/index.html` is optional.
- `verifyManifest(directory, environment, commit, digest): Promise<Manifest>`.
  - It requires `schema === 2`, `side`, a `deploymentId` matching the A12 patterns, and identity fields consistent with `WEBSITE_PHASES` / `API_PHASES`.
  - It throws `Unversioned artifact: migration artifacts need manifest schema 2` for schema 1.
- `verifyBaselineArtifact(directory, environment, commit, digest): Promise<Manifest>` is the existing schema-1 verifier, kept only for the pinned baseline input (A14).
- `validateContent(file, content, environment, {origin, registryGraph})`.
  - **Hosts**:
    - Production rejects `beta.000h.cojeev.com`, `feedback-beta.cojeev.com` and `luv-jeri.github.io`.
    - Beta rejects `000h.cojeev.com`, `cojeev.com`, `feedback.cojeev.com` and `luv-jeri.github.io`, with one exception, `BETA_HOMEPAGE_ANCHOR = "https://cojeev.com/"`, allowed only:
      - as the exact `href` value of an `<a>` element in HTML;
      - as the exact value of an `href` property in RSC `.txt` payloads and `site/ui/_next/**/*.js`, written `"href":"https://cojeev.com/"` or `href:"https://cojeev.com/"`.
  - **Base path** (both environments, `origin: "build"` files under `site/ui/` only):
    - Root-relative HTML `href`, `src`, `action` and `srcset` values, and CSS `url(/…)`, must start `/ui/` or equal `/ui`.
    - Absolute URLs on the environment's canonical origin must start `${canonicalSite}/`, except `BETA_HOMEPAGE_ANCHOR` in production, which is same-host.
    - RSC and JS logical route strings are not base-path scanned; Next keeps them unprefixed.
  - **Legacy URLs:**
    - Old-host page URLs are accepted only in `origin: "baseline"` files. These are temporary old HTML.
    - `https://<legacy host>/r/<name>.json` is the permitted permanent legacy registry URL. It is accepted in build-origin text but never as a `registryDependencies` value when `registryGraph === "canonical"`.
    - Canonical-graph dependencies must start `${canonicalSite}/r/`.

**Fixture table (spec; one fixture per row):**

| Env | File (origin) | Content | Verdict |
|---|---|---|---|
| beta | `site/ui/index.html` (build) | `<a href="https://cojeev.com/">Explore Cojeev</a>` | pass |
| beta | `site/ui/docs/button/index.txt` (build) | `{"href":"https://cojeev.com/","children":"by Cojeev"}` | pass |
| beta | `site/ui/_next/static/chunks/a.js` (build) | `{href:"https://cojeev.com/",className:"explore-cojeev"}` | pass |
| beta | `site/ui/index.html` (build) | `<link rel="canonical" href="https://cojeev.com/">` | reject |
| beta | `site/ui/index.html` (build) | `<meta property="og:url" content="https://cojeev.com/ui/">` | reject |
| beta | `site/ui/index.html` (build) | `<script type="application/ld+json">{"url":"https://cojeev.com/"}</script>` | reject |
| beta | `site/ui/sitemap.xml` (build) | `<loc>https://cojeev.com/</loc>` | reject |
| beta | `site/ui/index.html` (build) | `<a href="https://cojeev.com/ui/docs/">` | reject |
| beta | `site/ui/index.html` (build) | `<a href="X">` for each X in `https://cojeev.com/about`, `http://cojeev.com/`, `https://cojeev.com:8443/`, `https://u@cojeev.com/`, `https://cojeev.com/?x=1`, `https://cojeev.com/#x`, `https://cojeev.com` | reject (one fixture each) |
| beta | `site/ui/_next/static/chunks/a.js` (build) | `fetch("https://cojeev.com/")` | reject |
| beta | `site/ui/_next/static/chunks/a.js` (build) | `"https://feedback.cojeev.com"` | reject |
| beta | `site/ui/r/button.json` (build, canonical) | `"registryDependencies":["https://cojeev.com/ui/r/x.json"]` | reject |
| beta | `site/ui/index.html` (build) | `<img src="https://000h.cojeev.com/brand/x.png">` | reject |
| production | `site/ui/index.html` (build) | `<a href="https://beta.000h.cojeev.com/ui/">` | reject |
| production | `site/ui/index.html` (build) | `<link rel="stylesheet" href="/_next/static/x.css">` | reject (wrong base) |
| production | `site/ui/index.html` (build) | `<link rel="stylesheet" href="/ui/_next/static/x.css">` | pass |
| production | `site/ui/_next/static/css/x.css` (build) | `url(/brand/x.png)` | reject (wrong base) |
| production | `site/index.html` (baseline) | `<link rel="stylesheet" href="/_next/static/old.css"><link rel="canonical" href="https://000h.cojeev.com/">` | pass |
| production | `site/index.html` (build) | the same | reject |
| production | `site/ui/r/button.json` (build, canonical) | `"registryDependencies":["https://000h.cojeev.com/r/x.json"]` | reject |
| production | `site/ui/r/button.json` (baseline, baseline graph) | the same | pass |

**Named tests (`tests/release-manifest-scan.test.mjs` unless noted):**

| Test | Asserts |
|---|---|
| `manifest_rejects_cross_environment_hosts_and_wrong_base_paths` | Every production row and the beta `000h.cojeev.com` and `feedback.cojeev.com` rows give the stated verdict through `validateContent`, and through `createManifest` on a directory containing that file. |
| `beta_manifest_allows_exact_cojeev_homepage_navigation_only` | The three beta pass rows pass in HTML, RSC and bundled source. |
| `beta_manifest_rejects_production_ui_api_and_canonical_metadata` | Every beta reject row is rejected, and the error names the file and the context (metadata, sitemap, fetch, dependency or anchor variant). |
| `reserved_export_rejection_covers_root_and_ui` | `site/media/x`, `site/ui/media/x`, `site/ui/v1/a.json`, `site/private/`, `site/ui/backups/x` → `createManifest` throws. `site/ui/mediakit/x` passes. |
| `manifest_schema_2_validates_identity_fields` (`tests/release.test.mjs`) | `verifyManifest` refuses schema 1 with the exact message. It refuses a website manifest whose `migrationStage` disagrees with its phase, an API manifest whose `reportingBase` disagrees, and a malformed `deploymentId`. `verifyBaselineArtifact` still accepts a valid schema-1 fixture. |

- [ ] 1. Follow the task loop. Command: `node --test tests/release-manifest-scan.test.mjs tests/release.test.mjs`.
- [ ] 2. Commit `feat(release): manifest schema 2 with contextual host and base-path scan`.

**Failure rule:** if real Next 16 output serializes the funnel anchor in a form other than the two allowed `href` forms, record the real form in the PR. Widen the allowance only to that exact form, never to the bare host.

---

### Task A14: Variant packaging with pinned baseline (G1 packaging, G4 graphs, G8 variants)

**Tier:** consequential (release artifacts). **Depends:** A1, A11, A13, A24. It merges only after A6–A10 (the PR CI window rule). **Base:** integration. This PR opens the PR CI window: it lists the red release-packaging steps.

**Files:**
- Create:
  - `scripts/release-variants.mjs`: layout, baseline reading and identity.
  - `tests/release-variants.test.mjs`.
  - `tests/fixtures/release-baseline/`: `release-baseline.json`, plus a tiny schema-1 `beta/` and `production/` artifact with distinct marker strings in each environment's HTML.
- Modify:
  - `scripts/release.mjs:25–73`: `buildRelease` becomes `buildVariants`, `readArtifact` becomes `readVariant`, and the `build-pair` CLI branch becomes `build-variants`. `verify ENV SHA DIRECTORY DIGEST` now verifies one variant directory. The `{source:true}` arguments added by A12 are removed.
  - `scripts/release-config.mjs:15` (`buildEnvironment`): sets `COJEEV_BASE_PATH: "/ui"`, and `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_REGISTRY_URL` and `COJEEV_REGISTRY_URL` to `canonicalSite`. Strict override rejection is unchanged.
  - `tests/release.test.mjs:15,22,27,37–43`.

**Interfaces:**
- `scripts/release-baseline.json`. The schema is spec here; B1 writes the real values:
  ```json
  {"schema":1,
   "beta":{"commit":"<40 hex>","runId":"<digits>","digest":"<beta manifest sha256>","websiteVersionId":"<uuid>","apiVersionId":"<uuid>"},
   "production":{"commit":"<40 hex>","runId":"<digits>","digest":"<production manifest sha256>","websiteVersionId":"<uuid>","apiVersionId":"<uuid>",
     "apexProbes":{"/":{"status":200,"contentType":"text/html","sha256":"<hex>"},"/robots.txt":{"status":200,"contentType":"text/plain"},"/uikit?x=1":{"status":404,"contentType":"text/html","sha256":"<hex>"},"/uikit.txt?x=1":{"status":404,"contentType":"text/html","sha256":"<hex>"},"/ui-other.txt":{"status":404,"contentType":"text/html","sha256":"<hex>"}}}}
  ```
  The statuses shown are examples of shape only; B1 records the observed values. `/robots.txt` deliberately has no `sha256` because B8 changes it.
- `readBaseline(environment, {record = "scripts/release-baseline.json", directory = process.env["BASELINE_" + environment.toUpperCase() + "_DIRECTORY"]}): Promise<Baseline>`.
  - `Baseline = {commit, runId, digest, websiteVersionId, apiVersionId, apexProbes?, siteRoot: string, hashes: Map<string, string>}`.
  - It calls `verifyBaselineArtifact(<directory>/<environment>, environment, commit, digest)` and requires that call to succeed.
- `newDeploymentId(side, phase, commit) → \`${side}-${phase}-${commit.slice(0, 12)}-${randomBytes(4).toString("hex")}\``.
- `buildVariants(root, commit, destination, settings): Promise<Record<Env, Record<Variant, {directory: string, digest: string, deploymentId: string}>>>`.
  - `Variant` is one of `website-mounted`, `website-regenerated`, `website-redirect`, `api-prepared` or `api-linked`.
  - Each environment is built once, with Node 22.22.0 and Wrangler 4.130.0 required as today, then packaged five times into `destination/<env>/<variant>/`.
- `readVariant(directory, environment, commit, digest): Promise<{manifest, config, side, phase, deploymentId}>`. It runs `verifyManifest` and `validateDeploymentConfig` for that side. For website it also checks that `site/ui/release.json` equals the manifest identity.
- CLI: `node scripts/release.mjs build-variants SHA DIRECTORY` appends `<env>_<variant>_digest=<hex>` and `<env>_<variant>_id=<deploymentId>` to `GITHUB_OUTPUT`, with `-` written as `_`. Example: `production_website_mounted_digest`.

**Website variant layout (spec state table, paths under the variant's `site/`):**

| Path | `mounted` | `regenerated` | `redirect` |
|---|---|---|---|
| `ui/**` except `ui/r/**` | raw `out/` | raw `out/` | raw `out/` |
| `ui/r/**` and `r/**` (byte-identical pair) | baseline `site/r/**` | `out/r/**` | `out/r/**` |
| Root retained files: the baseline root export minus `r/`, `release.json`, `_headers` and `404.html` | yes | yes | yes (Worker-first never bypasses HTML) |
| `404.html` (root) | copy of `out/404.html` | same | same |
| `_headers` (root) | `siteHeaders(environment)` | same | same |
| `ui/release.json` | identity (below) | identity | identity |

- `ui/release.json`:
  ```json
  {"environment":"production","release":"<commit>","deploymentId":"website-mounted-<12>-<8>","phase":"mounted","migrationStage":"additive","registryGraph":"baseline","analyticsEnabled":false}
  ```
- `website/wrangler.jsonc`: the merged environment config, plus:
  - `assets.directory: "../site"`;
  - `run_worker_first: workerFirstList(await retainedTextInventory(<variant>/site))`;
  - vars `RELEASE`, `PHASE`, `DEPLOYMENT_ID`, `MIGRATION_STAGE` and `REGISTRY_GRAPH`.
- `redirect` and `regenerated` hold the same `site/` bytes except `ui/release.json`; only the identity and vars differ.

**API variant layout:**
- `api/wrangler.jsonc`: the merged environment config plus vars `RELEASE`, `PHASE`, `DEPLOYMENT_ID` and `LEGACY_SITE_URL = legacySite`. `SITE_URL` is `legacySite` for `prepared` and `canonicalSite` for `linked`.
- `api/index.js` and `api/migrations/`, as today.
- No `site/`.

**Packaging order and failure rules.** Nothing is written to `destination` until every check passes for that environment:
1. `readBaseline` succeeds, and the artifact digest equals the record.
2. `checkUiExport(out, "/ui")` is empty.
3. `workerFirstProblems(list, inventory)` is empty.
4. Registry bytes match the table: mounted equals baseline hashes, regenerated and redirect equal `out/r`.
5. `validateDeploymentConfig` with no `source` option passes.
6. `createManifest` with `identity.baseline.hashes = baseline.hashes`.

**Named tests (`tests/release-variants.test.mjs` unless noted; fixture raw export plus fixture baseline):**

| Test | Asserts |
|---|---|
| `release_environment_sets_ui_bases_consistently` (`tests/release.test.mjs`) | For both environments, `buildEnvironment` gives `COJEEV_BASE_PATH === "/ui"`, the three URL vars equal `canonicalSite`, and `NEXT_PUBLIC_REPORTING_API_URL === api`. `canonicalSite === origin + basePath`. Overriding `COJEEV_BASE_PATH` or `NEXT_PUBLIC_SITE_URL` still throws. |
| `artifact_contains_ui_home_identity_headers_and_legacy_registry` | Each website variant has `site/ui/index.html` and `site/ui/release.json` with the identity shape, a root `_headers` equal to `siteHeaders(env)`, a root `404.html` equal to `out/404.html`, and `site/r` and `site/ui/r`. |
| `additive_artifact_preserves_pinned_same_environment_old_site` | Mounted root retained files are byte-identical to the same environment's baseline. The beta variants contain no production marker string. A missing baseline directory, a digest mismatch or a tampered baseline file → packaging throws and `destination` stays empty. |
| `same_sha_variants_have_distinct_deployment_ids` | The 10 IDs from one build are distinct, and two builds of the same commit share none. Each ID appears in the manifest, the config vars and (website) `ui/release.json`. No hashed file contains its own manifest digest. |
| `legacy_and_canonical_registry_payloads_match` | In every website variant, `site/r` and `site/ui/r` have equal file sets and equal sha256 per file. Mounted equals baseline hashes; regenerated and redirect equal `out/r`. |

- [ ] 1. Follow the task loop. Command: `node --test tests/release-variants.test.mjs tests/release.test.mjs`.
- [ ] 2. Extra, once B1's record is merged: download the pinned baseline (`gh release download migration-baseline -p 'release-<commit>.tar.gz' -D "$TMPDIR/baseline"`, then `tar -xzf` it so `$TMPDIR/baseline/beta` and `$TMPDIR/baseline/production` exist), then run `BASELINE_BETA_DIRECTORY=… BASELINE_PRODUCTION_DIRECTORY=… node scripts/release.mjs build-variants "$(git rev-parse HEAD)" "$TMPDIR/variants"` on a clean checkout. Expect 10 variant directories.
- [ ] 3. Commit `feat(release): immutable per-side variants with pinned baseline root`.

**Failure rule:** if the pinned baseline is missing or does not verify, stop and report (I4). Never rebuild a baseline from source.

---

### Task A15: Live, health and legacy acceptance (G8 live/health)

**Tier:** consequential (release acceptance). **Depends:** A13, A24. **Base:** integration.

**Files:**
- Modify:
  - `scripts/release.mjs:122–228`: `liveProblems`, `checkLiveRelease` and the `live` CLI branch.
  - `scripts/operations-health.mjs:23–36`: `checkHealth`, plus new alert codes in its fixed code list.
  - `scripts/check-launch-readiness.mjs:4–13,18–30,35–52`: `--url` defaults to the canonical base, and `--legacy-url` adds the legacy registry checks.
  - `tests/release-live.test.mjs:6,16,18–20,30,39,94–95,196,203`.
- Create `tests/live-identity.test.mjs`.

**Interfaces:**
- `Expected = {kind: "variant", manifest} | {kind: "baseline", commit, versionId}`. A `variant` uses a `verifyManifest` result.
- `liveProblems(environment, {website: Expected, api: Expected, token, expectedAnalyticsEnabled, fetcher}): Promise<{problems: string[], observed: {website, api}}>`.
- `checkLiveRelease(environment, expected, options)`: the existing retry loop (`LIVE_RETRY_WAITS`, `LIVE_BUDGET_MS = 60000`). `TRANSIENT_LIVE_PROBLEMS` adds `stale-identity`.
- CLI: `node scripts/release.mjs live ENV --website=DIR:DIGEST|baseline --api=DIR:DIGEST|baseline`.
  - `baseline` reads `scripts/release-baseline.json`.
  - `EXPECTED_ANALYTICS_ENABLED` is kept.
  - On success it prints one line: `live ok website=<id> api=<id>`.
- **Identity, checked first:**
  - Website: legacy `/health`, plus `/ui/health` and `/ui/release.json` for any variant. Each must equal the expected manifest's `environment`, `release`, `deploymentId`, `phase`, `migrationStage` and `registryGraph`. `analyticsEnabled` is read from `/ui/release.json`.
  - API: `/health` must equal the expected `environment`, `release`, `deploymentId`, `phase` and `reportingBase`.
  - Baseline: `/health.release === commit` and no `deploymentId`.
  - The same release with a different ID, or legacy and `/ui` disagreeing, gives `stale-identity` (transient). A different release gives `release-mismatch` (transient, as today). A missing or malformed field gives `identity-malformed` (permanent).
- **Contracts**, which run only after both identities match. All of these problems are permanent.
  - **Canonical** (`canonical-*`):
    - `${origin}/ui?x=1` → 301, exact `Location: ${canonicalSite}/?x=1`, no-store.
    - `/ui/` → 200 HTML with revalidate and nosniff.
    - `/ui/__cojeev_missing_release_probe__/` → 404.
    - `/ui/sitemap.xml` → 200 XML and `/ui/robots.txt` → 200.
    - `/ui/health` is no-store.
    - Beta: every response is noindex.
  - **Registry** (`registry-*`):
    - For every manifest file under `site/r/` and `site/ui/r/`, GET the legacy `/r/<f>` and canonical `/ui/r/<f>`. Each must give 200, a JSON content type, no `Location`, and sha256 equal to the manifest entry. A live digest header is ignored.
    - `HEAD /r/button.json` → 200 with no body.
    - `/r/__cojeev_missing__.json` and `/ui/r/__cojeev_missing__.json` → 404.
  - **Legacy** (`legacy-*`; stage from the expected manifest):
    - Additive: legacy `/` and `/docs/button/` → 200 HTML.
    - Redirect: GET and HEAD of `/`, `/about/`, `/work-with-me/`, `/requests/`, `/track/`, `/feedback-admin/`, `/docs/button/?utm_source=move&x=a%2Fb` and `/nope/` → 301 with exact `Location: ${canonicalSite}` + path + query, no-store.
    - Both stages: legacy `/health` is direct 200; the first retained `site/_next/` file in the manifest → 200; `/__cojeev_missing__.txt` → 404.
  - **Apex** (production only, `apex-*`): each `apexProbes` path → equal status and content type, and equal `sha256` where recorded. The response carries no `content-security-policy` equal to `securityHeaders("production")`'s.
- `checkHealth(environment, {token, expected = {}, fetcher})`.
  - It reads legacy `/health`, `/ui/health` (when legacy reports a `deploymentId`) and API `/health`.
  - Problems:
    - `http-health`;
    - `identity-malformed`;
    - `website-identity-split` (legacy and `/ui` disagree);
    - `unlisted-pair` (`pairOf` is undefined; a side without a `deploymentId` counts as `baseline`);
    - `expected-identity-mismatch` (when `expected.websiteId` or `expected.apiId` is given and differs);
    - `legacy-registry` (legacy `/r/button.json` is not 200 JSON, or has a `Location`);
    - `legacy-health` (legacy `/health` redirects).
  - The `site.release === api.release` equality is removed. Admin delivery health is unchanged.
- CLI: `node scripts/operations-health.mjs ENV` is the scheduled pair-table mode. `EXPECTED_WEBSITE_ID` and `EXPECTED_API_ID` select expected mode.

**Named tests (`tests/live-identity.test.mjs` unless noted; stub fetcher, fake clock):**

| Test | Asserts |
|---|---|
| `live_gate_rejects_stale_same_sha_variant` | `/ui/health` reports the expected release with another `deploymentId` for the whole budget → fails with `stale-identity` after the bounded retries. It never passes. |
| `live_registry_hashes_match_promoted_artifact_not_only_each_other` | Both hosts serve identical but stale bytes → `registry-hash-mismatch:<path>`. Correct bytes pass. An `x-digest` header claiming the right hash does not help. |
| `health_checks_independently_expected_api_and_website_identities` | Website at commit A and API at commit B in the Linked pair pass when each matches its own expected ID. Scheduled mode passes all five pairs. (redirect, prepared) and (baseline, linked) give `unlisted-pair`. |
| `live_gate_checks_canonical_and_legacy_contracts_separately` | Breaking only the redirect matrix gives only `legacy-*` problems. Breaking only bare `/ui` gives only `canonical-*`. An additive manifest expects legacy 200 pages; a redirect manifest expects the 301s. |
| `split_edge_identity_retries_within_budget` (Review Focus 3) | `/ui/health` is new while `/health` is old for two attempts, then they agree → pass, with total fake wait ≤ 60000 ms. A persistent split → `stale-identity` failure at budget end. |
| `missing_identity_fails_immediately` | A response missing `deploymentId` or `phase` fails on the first attempt with no wait. |
| `health_recovery_and_diagnostics_keep_existing_protections` (health half, `tests/release-live.test.mjs`) | Alert codes stay within the fixed list (new codes added there), output stays sanitized, and the delivery-health token rules are unchanged. |

- [ ] 1. Follow the task loop. Command: `node --test tests/live-identity.test.mjs tests/release-live.test.mjs tests/operations.test.mjs`.
- [ ] 2. Commit `feat(release): independent live identities, dual-path registry hashes and legacy contracts`.

**Failure rule:** never turn a permanent contract failure into a retry. Only the identity codes listed as transient may retry.

---

### Task A16: Targeted promotion commands (G8 promotion and rollback)

**Tier:** consequential (production deploy and rollback). **Depends:** A14, A15. **Base:** integration.

**Files:**
- Create `scripts/release-promote.mjs` and `tests/promotion.test.mjs`.
- Modify:
  - `scripts/release.mjs:122`: delete `deployRelease`. Add the CLI branches `promote-api`, `promote-website` and `steady-pair`, and make `deploy` and `rollback` refuse.
  - `scripts/deployment-diagnostics.mjs:28`: events carry `side`, `phase` and `deploymentId`, with redaction unchanged.
  - `tests/operations.test.mjs:159–168`: the `deployRelease` tests become promotion tests. Keep their secret-file and schema-ack assertions.

**Interfaces:**
- `readLivePair(environment, {fetcher, cf, baseline}): Promise<{website: Live, api: Live}>`, where `Live = {phase, deploymentId: string | null, commit, versionId?: string}`.
  - A side whose `/health` has no `deploymentId` is `baseline` only if `cf("workers/scripts/<name>/deployments")`'s active version equals the B1 record's version ID. Otherwise it throws `Unknown live <side> deployment`.
  - The website identity is read from legacy `/health`. From `mounted` on, `/ui/health` must agree with it.
- `reachedRedirect(environment, {cf}): Promise<boolean>` is true when any website version message contains `cojeev-migration side=website phase=redirect`. If the version list cannot be read, the result is `true` (fail closed).
- `promoteApi(directory, environment, commit, digest, expectedWebsiteId, {rollback, run, backupDatabase, cf, fetcher, evidence, peer})`.
- `promoteWebsite(directory, environment, commit, digest, expectedApiId, {rollback, run, cf, fetcher, evidence, peer})`.
  - `expectedXId` is a `deploymentId` or the literal `baseline`.
  - `peer = {directory: PEER_DIRECTORY, digest: PEER_DIGEST}` (env vars). It is required unless the expected peer is `baseline`. It must verify with `readVariant` as the other side, with `deploymentId === expected`.
  - `evidence` is the `PROMOTION_EVIDENCE` file path.
- CLI (exactly the spec's):
  - `node scripts/release.mjs promote-api ENV SHA DIRECTORY DIGEST EXPECTED_WEBSITE_ID [--rollback]`
  - `node scripts/release.mjs promote-website ENV SHA DIRECTORY DIGEST EXPECTED_API_ID [--rollback]`
  - `node scripts/release.mjs steady-pair ENV` prints `steady` and exits 0 when the live pair is `STEADY_PAIR`. Otherwise it prints `migrating <pair name or "unlisted">` and exits 0. It never mutates, and it reads only the `/health` identities, with no `cf` call: a side without a `deploymentId` counts as `baseline`, so only a fully identified Redirect pair is `steady`. When `GITHUB_OUTPUT` is set it appends `steady=true|false`, `website_id`, `website_commit`, `api_id` and `api_commit` for the live pair (A20 consumes these).
  - `deploy` and `rollback` exit 1 with `Untargeted deploy is retired: use promote-api or promote-website`, before reading any artifact.

**Destructive-step ordering (spec).** Steps 1–5 are read-only; any failure there stops with zero `run`/`cf` mutations.

| # | `promoteApi` | `promoteWebsite` |
|---|---|---|
| 1 | `readVariant`; side must be `api` | `readVariant`; side must be `website` |
| 2 | Verify the peer website (artifact, or the B1 baseline record) | Verify the peer API (artifact, or the B1 baseline record) |
| 3 | `readLivePair`; the live website must equal the expected peer, else `Stale peer` | `readLivePair`; the live API must equal the expected peer, else `Stale peer` |
| 4 | `assertTransition` with `reachedRedirect` | `assertTransition` with `reachedRedirect`. Production `mounted` also requires beta's `readLivePair` to be the Redirect pair. |
| 5 | `assertGates(evidence, …)` for the returned gates | the same |
| 6 | Production secrets preflight (existing). With `--rollback`: `ROLLBACK_SCHEMA_ACK === "0002_safe_delivery.sql"` (existing). | — |
| 7 | Without `--rollback`: `backupDatabase`, then `d1 migrations apply` (existing order) | — |
| 8 | Secrets file in a 0700 temp dir, then `wrangler deploy --config <dir>/api/wrangler.jsonc --no-bundle --secrets-file <f> --message "cojeev-migration side=api phase=<phase> id=<deploymentId>"`. Remove the temp dir in `finally`. | `wrangler deploy --config <dir>/website/wrangler.jsonc --no-bundle --message "cojeev-migration side=website phase=<phase> id=<deploymentId>"` |
| 9 | `recordDeploymentEvent` with side, phase and ID | the same |

Website promotion never reads secrets, never touches D1 and never deploys any API config, even if the directory holds a stale one.

**Named tests (`tests/promotion.test.mjs`; fake `run`, `cf`, `fetcher` and evidence file):**

| Test | Asserts |
|---|---|
| `promotion_rejects_unlisted_phase_pairs_and_stale_peer` (stale-peer half; the phase half is in A24) | An expected peer ID differing from live, a peer artifact whose ID differs from the argument, and a baseline peer whose Cloudflare version differs from the record each throw before any `run` call and any mutating `cf` call. An unlisted target throws the same way. |
| `api_promotion_does_not_deploy_website` | The `run` calls are exactly `[d1 migrations apply, deploy api config]`, or only `[deploy api config]` with `--rollback`. No call names `website/wrangler.jsonc`. |
| `website_promotion_cannot_revert_or_prematurely_switch_site_url` | The `run` calls are exactly `[deploy website config]`: no secrets file, no D1 and no API config, even when the fixture directory holds a stale `api/wrangler.jsonc`. Website `regenerated` while the live API is `prepared` is refused. |
| `untargeted_migration_deployment_is_rejected` | CLI `deploy` and `rollback` exit 1 with the message and zero `run` calls. A schema-1 artifact given to `promote-*` is refused. |
| `rollback_artifact_cannot_remove_ui_or_legacy_registry` | A manifest-valid website variant stripped of `site/ui/index.html`, or of `site/r/`, is refused. `baseline` as a `--rollback` target is refused. |
| `rollback_from_any_post_linked_phase_keeps_canonical_site_url_and_accepts_canonical_and_legacy_component_urls` (promotion half; the component half is in A22) | For live pairs Linked, Regenerated and Redirect, every API `--rollback` to `prepared` is refused. Every permitted API rollback config has `SITE_URL === canonicalSite` and `LEGACY_SITE_URL` set. |
| `website_rollback_to_mounted_is_refused_after_redirect_was_reached` | A `cf` versions stub with a redirect message → mounted rollback refused. An unreadable version list → refused. No redirect message and live Regenerated → permitted. |
| `steady_pair_reports_only_the_redirect_pair` | It prints `steady` for (redirect, linked) and `migrating <name>` for the other four pairs and for an unlisted pair. The `GITHUB_OUTPUT` lines carry the live IDs and commits. |
| `health_recovery_and_diagnostics_keep_existing_protections` (diagnostics half) | Deployment diagnostics still redact tokens, emails and service URLs. Events carry side, phase and ID. The secrets temp dir is gone after a failing deploy. |

- [ ] 1. Follow the task loop. Command: `node --test tests/promotion.test.mjs tests/operations.test.mjs`.
- [ ] 2. Commit `feat(release): targeted promote-api and promote-website replace deployRelease`.

**Failure rules:**
- If Wrangler 4.131.1 `deploy` rejects `--message`, stop and report. Never record phase history anywhere unreviewed.
- If the Cloudflare versions response carries no message field, keep `reachedRedirect` failing closed and report it.

---

### Task A17: Packaged artifact gates (G8 CSP, structured data, installs; G4 dual install)

**Tier:** consequential (release acceptance). **Depends:** A7, A14. **Base:** integration.

**Files:**
- Modify:
  - `scripts/release-csp.mjs:18–21,31,40–42,59–62`:
    - `directoryAssets` maps URL paths onto the physical `site/` root.
    - The page fetched is `${canonicalSite}/`.
    - `permits` treats absolute same-origin URLs as `'self'`, comparing by `new URL().origin`.
    - The forbidden check compares origins.
  - `scripts/check-structured-data.mjs:35,50–55`: `--dir` points at a variant's `site/ui`, and the new `--site` sets the canonical base. It asserts exact canonical URL strings.
  - `scripts/release-install.mjs:12,16,23,27,31`:
    - `readVariant`.
    - Serve `site/r` at `/r/` and `site/ui/r` at `/ui/r/` from one disposable origin.
    - Rewrite dependencies with A7's `rewriteDependency`.
    - Run `verify-install` twice, once with `--url=<origin>` and once with `--url=<origin>/ui`. Receipts go to `artifacts/stranger/<env>-<commit>-legacy.json` and `-canonical.json`.
  - `scripts/run-production-gate.mjs:9,34,49` and `tests/production-gate.test.mjs:25`: verify only that the raw `out/r` hash path still holds; change nothing unless a test fails.
- Create:
  - `scripts/live-install.mjs`.
  - `scripts/check-asset-chains.mjs`.
  - `tests/packaged-gates.test.mjs`.

**Interfaces:**
- `checkArtifactCsp(directory, environment, worker)` keeps its signature and works on a website variant directory.
- `node scripts/check-structured-data.mjs --dir <variant>/site/ui --site https://cojeev.com/ui`.
- `node scripts/release-install.mjs ENV SHA DIRECTORY DIGEST` keeps its CLI shape and needs a website variant directory.
- `node scripts/live-install.mjs ENV` installs `button,cojeev,date-picker` into two disposable consumers, from `${legacySite}` and `${canonicalSite}`, with no dependency rewriting. It prints one line with the shadcn CLI version and both results, and exits 1 on any failure.
- `node scripts/check-asset-chains.mjs DIRECTORY` starts A11's `startAssetRouter` on the variant's `site/` with its packaged `run_worker_first`, then:
  - runs `chainProblems` for one canonical and one legacy literal or encoded RSC path taken from the manifest;
  - runs the three `/ui*` sibling delegation probes (production only);
  - checks that `CODE_PROBES` run code.
  - It exits 1 on any problem.

**Named tests (`tests/packaged-gates.test.mjs`):**

| Test | Asserts |
|---|---|
| `csp_gate_resolves_absolute_same_origin_assets` | Packaged fixture HTML with `<script src="https://cojeev.com/ui/_next/x.js">` passes under `'self'`. `https://cojeev.com.evil.example/x.js` fails. The other environment's origin fails even when written with a path suffix. |
| `shadcn_old_url_installs_foundation_and_composed_item` | Against a packaged fixture, the stub installer receives `button`, `cojeev` and `date-picker` from `<origin>/r/`. Every dependency URL it fetches is on the disposable origin. |
| `shadcn_new_url_installs_foundation_and_composed_item` | The same at `<origin>/ui/r/`. |
| `beta_robots_and_headers_block_indexing` (headers half; the robots half is in A6) | A packaged beta `_headers` has `/*` with `X-Robots-Tag: noindex`. Through the A11 harness, beta `/ui/_next/static/chunks/new.js` (served by the asset layer) carries noindex. |
| `asset_chain_gate_rejects_escaping_canonical_chain` | `check-asset-chains` fails a fixture variant whose `/ui` export was copied to the root instead of `site/ui`. |

- [ ] 1. Follow the task loop. Command: `node --test tests/packaged-gates.test.mjs tests/production-gate.test.mjs`.
- [ ] 2. Extra, on the A14 local variants: for each website variant run `node scripts/release-csp.mjs <env> <variant dir>` and `node scripts/check-asset-chains.mjs <variant dir>`. Then run `node scripts/release-install.mjs <env> <sha> <website-regenerated dir> <digest>`, which uses the real shadcn 4.21.0 CLI.
- [ ] 3. Commit `feat(release): packaged CSP, structured-data, chain and dual-path install gates`.

**Failure rule:** candidate installs never contact a live endpoint. If any dependency escapes the disposable origin, the gate fails; never fall back to the network.

---

### Task A18: Deployed component-lifecycle gate (G6 deployed gate)

**Tier:** consequential (production data path). **Depends:** A3, A12. **Base:** integration.

**Files:**
- Create `scripts/deployed-component-gate.mjs` and `tests/deployed-component-gate.test.mjs`.
- Modify `tests/reporting-browser-fixture.test.mjs:6`. Add an assertion that the fixture reports `local: true`, and that `componentGate` refuses it with `local-mode`.

**Interfaces:**
- `componentGate(environment, {token, reportId, fetcher}): Promise<{problems: string[]}>`.
- CLI: `node scripts/deployed-component-gate.mjs ENV`.
  - It reads `ADMIN_TOKEN` and `COMPONENT_GATE_REPORT_ID` from the environment and never prints either.
  - It prints `component-head ok`, or one problem code per line, and exits 1 on problems.
- The gate report is **synthetic**: an owner-created request report with fictional content, the contact address `gate@example.com` (RFC 2606 reserved; `reports.email` is `NOT NULL`, so it cannot be empty) and no linked GitHub issue. Real report IDs are never used. The success step may queue one resolution email to that reserved address, which cannot reach a person.
- The gate prints only problem codes. It never prints report fields.
- Every admin call sends `Authorization: Bearer <token>`, and every non-GET also sends `Origin: <environment origin>`.

**Ordered sequence (spec; the reset runs in `finally`):**
1. `GET ${api}/v1/config` must report `local === false`, else `local-mode`. A loopback API URL gives `loopback-api`.
2. `GET ${api}/health` → `reportingBase` is the expected stored prefix.
3. `GET ${api}/v1/admin/reports/:id` → snapshot `status` and `componentUrl`. If the contact address is not exactly `gate@example.com` or an issue is linked, the result is `gate-report-not-synthetic` and nothing is sent.
4. Each failure input gets `PATCH {status:"resolved", componentUrl: X}`. Each must give 422, and a following GET must show `status` and `componentUrl` equal to the snapshot. Inputs:
   - missing page `${reportingBase}/docs/__cojeev_gate_missing__/`;
   - redirect `${reportingBase}/docs/button`;
   - non-HTML `${reportingBase}/docs/button/index.txt` (a retained RSC payload). From outside, the gate observes only the 422 and the unchanged state; the unit fixtures in A3 prove which layer refused it.
5. Success: `PATCH {status:"resolved", componentUrl: "${legacySite}/docs/button/"}` → 200. A following GET shows `componentUrl === "${reportingBase}/docs/button/"`.
6. Reset: `PATCH {status: <snapshot status>}` → 200. The final GET shows the snapshot status.

**Named tests (`tests/deployed-component-gate.test.mjs`; stub fetcher records calls):**

| Test | Asserts |
|---|---|
| `deployed_component_head_uses_same_environment_binding` (unit half; the deployed half runs in B3, B4, B6 and B9) | The call order equals the sequence. `local: true` and a loopback API are refused before any PATCH. Each failure must be 422 with unchanged state, and a 200 on a failure input is a problem. The stored URL must equal the `reportingBase` prefix. The reset runs even when step 5 fails. Captured stdout contains only `component-head ok` or problem codes. |
| `deployed_gate_refuses_non_synthetic_report` | A snapshot with any other contact address, or with a linked issue → `gate-report-not-synthetic` and zero PATCH calls. |

- [ ] 1. Follow the task loop. Command: `node --test tests/deployed-component-gate.test.mjs tests/reporting-browser-fixture.test.mjs`.
- [ ] 2. Commit `feat(reporting): deployed LOCAL_MODE=false component lifecycle gate`.

**Failure rule:** if the admin API refuses `resolved → <snapshot status>`, stop and report. Do not add an endpoint, a test-only route or a global-fetch flag.

---

### Task A19: Redirect browser checks, packaged and live (G5, G6 browser continuity; `ui-browser` gate)

**Tier:** normal. **Depends:** A11, A14. **Base:** integration.

**Files:**
- Create `scripts/redirect-browser.mjs` and `tests/redirect-browser.test.mjs`.
- Modify `tests/navigation-ui.browser.mjs` (from A8): read `UI_BROWSER_URL`, defaulting to the loopback `/ui` mount. With a non-loopback URL, it runs only its read-only navigation journeys. The funnel-link request stays intercepted and nothing is submitted.
- Not in this task: `tests/reporting-continuity.browser.mjs:6` and `scripts/check-landing-performance.mjs`. A1 rewrites their mounts.

**Interfaces:**
- `node scripts/redirect-browser.mjs --packaged=DIR`: DIR is a `website-redirect` variant.
  - Starts A11's `startAssetRouter` on `DIR/site` with the packaged `run_worker_first`, `environment` from the manifest and `migrationStage: "redirect"`.
  - A Playwright `context.route("**/*")` fulfils every request whose host is the environment's legacy or canonical host from `router.fetch(url, {method, headers})`. It fulfils the API host from a fixed stub. It aborts every other host.
- `node scripts/redirect-browser.mjs --live=ENV`: no interception, except that reporting `POST`s are aborted (read-only).
- Both modes print `PASS <check>` or `FAIL <check> <url path>` per check and exit 1 on any failure.
- Every fragment and query value is the fictional constant `gate-0000`. No real report ID, tracking token or receipt is ever used.

**Checks:**

| Check (named test it backs) | Environment | Open | Final `location.href` must equal |
|---|---|---|---|
| `tracking_fragment_survives_legacy_redirect` | production | `https://000h.cojeev.com/track/#gate-0000` | `https://cojeev.com/ui/track/#gate-0000` |
| the same | production | `https://000h.cojeev.com/docs/button/?a=1&a=2` | `https://cojeev.com/ui/docs/button/?a=1&a=2` |
| the same | production | `https://000h.cojeev.com/docs/%62utton/` | `https://cojeev.com/ui/docs/%62utton/` (the encoding is unchanged, whatever the final page) |
| `beta_tracking_fragment_survives_same_host_redirect_in_browser` | beta | `https://beta.000h.cojeev.com/track/#gate-0000` | `https://beta.000h.cojeev.com/ui/track/#gate-0000` |
| `beta_queued_admin_query_and_component_links_survive_cutover` | beta | `/feedback-admin/?report=gate-0000` | `https://beta.000h.cojeev.com/ui/feedback-admin/?report=gate-0000` |
| the same | beta | `/docs/button/` | `…/ui/docs/button/`, with page status 200 and the button heading visible |
| the same | beta | `/work-with-me/` (alias) | `…/ui/work-with-me/` |
| the same | beta | `/docs/__gate_unknown__/` | `…/ui/docs/__gate_unknown__/` with the exported 404 page and no second `/ui` |
| no second prefix | both | each final URL above, reloaded | unchanged; no URL in the run contains `/ui/ui/` |

**Named tests (`tests/redirect-browser.test.mjs`, which spawns `--packaged` on A11's fixtures):**

| Test | Asserts |
|---|---|
| `tracking_fragment_survives_legacy_redirect` | The production rows pass on the packaged fixture. A fixture whose Worker drops the query fails the second row. |
| `beta_tracking_fragment_survives_same_host_redirect_in_browser` | The beta fragment row passes on a beta packaged fixture. |
| `beta_queued_admin_query_and_component_links_survive_cutover` | The beta admin, component, alias and unknown rows pass. A fixture that redirects `/ui/docs/button/` again fails the no-second-prefix row. |

- [ ] 1. Follow the task loop. Command: `node --test tests/redirect-browser.test.mjs`.
- [ ] 2. Extra: `node scripts/redirect-browser.mjs --packaged=<A14 local production/website-redirect dir>`, then the same for beta.
- [ ] 3. Commit `test(release): browser redirect continuity for fragments, queries and queued links`.

**Failure rule:** fragments never reach a server, so never "fix" a fragment failure in the Worker. A failing fragment row means the redirect status or `Location` is wrong; report it against A2.

---

### Task A22: Local rollback rehearsal (G8 rollback rehearsal)

**Tier:** consequential (rollback safety). **Depends:** A16, A17, A18 (and through them A11, A14, A15). **Base:** integration.

**Files:** create `scripts/rollback-rehearsal.mjs` and `tests/rollback-rehearsal.test.mjs`.

**Interfaces:**
- `rehearseRollback(artifactRoot, environment, {install}): Promise<{steps: {name: string, expected: "permitted" | "refused", ok: boolean, problems: string[]}[]}>`.
  - `artifactRoot` is a `build-variants` output (A14).
  - `install(websiteDirectory)` defaults to spawning `node scripts/release-install.mjs ENV SHA DIR DIGEST` (A17, both paths).
- CLI: `node scripts/rollback-rehearsal.mjs ARTIFACT_ROOT ENV` prints one `PASS|FAIL <step>` line per step and exits 1 unless every step matches its expectation.
- It is entirely local: no Cloudflare account, no network and no secrets.

**Rehearsal environment (construction rules):**
- **Website:** A11's `startAssetRouter` serving the live website variant's `site/`. The fake `run` restarts it when a `wrangler deploy --config <dir>/website/wrangler.jsonc` call arrives.
- **API:** Miniflare running the bundled `workers/reporting/src/index.ts`. The rehearsal runs whichever API variant is live and restarts it on an API deploy call.
  - Bindings: the packaged API config's `vars` exactly (so `LOCAL_MODE` is `"false"` and `SITE_URL` is canonical), plus random dummy values for each secret name the Worker reads.
  - `REGISTRY_SITE` is a Node-function service binding that forwards to the website `router.fetch`, and logs each call.
  - `outboundService` returns 503 and records the call, as in `scripts/reporting-browser-fixture.mjs`.
  - D1 runs from `workers/reporting/migrations`, seeded with one synthetic request report (fictional text, contact `gate@example.com`, no issue link).
- **Fetcher:** requests to the environment's legacy and canonical hosts go to `router.fetch`; requests to its API host go to Miniflare. Anything else throws.
- **Fake `cf`:** returns the version history written by the fake `run`, including each `--message`. It starts with a history that already contains `cojeev-migration side=website phase=redirect`.
- **Evidence:** a scratch `PROMOTION_EVIDENCE` file. A forward step's gates are recorded only after the rehearsal's own checks pass for the live pair. `browser-report` and `discovery` are attested as `rehearsal-local`.

**Sequence (spec). The start pair is Redirect (`website-redirect`, `api-linked`):**

| # | Call | Expected |
|---|---|---|
| 1 | `promoteWebsite(website-regenerated, --rollback)` | permitted, giving the Regenerated pair |
| 2 | `promoteWebsite(website-redirect)` (forward; gates recorded after the step-1 checks) | permitted, giving the Redirect pair |
| 3 | `promoteWebsite(website-mounted, --rollback)` | refused with `website rollback to mounted after redirect`; zero `run` calls |
| 4 | `promoteApi(api-linked, --rollback)` with `ROLLBACK_SCHEMA_ACK` | permitted, still Redirect; no `backupDatabase` and no D1 migration call |
| 5 | `promoteApi(api-prepared, --rollback)` | refused with `post-Linked rollback must keep API linked`; zero `run` calls |

**Checks after each permitted step:**
- `liveProblems` (A15) is empty for the expected pair.
- API `/health` `reportingBase === canonicalSite`.
- `componentGate` (A18) passes with its legacy input. A canonical-input `PATCH` (`${canonicalSite}/docs/button/`) follows A18's step 5–6 rules and also stores `${canonicalSite}/docs/button/`.
- The `REGISTRY_SITE` log shows HEAD requests to `/ui/docs/button/`. `outboundService` recorded zero calls.
- `install(liveWebsiteDirectory)` succeeds.

**Named tests (`tests/rollback-rehearsal.test.mjs`; A14 fixture variants and a stub `install`):**

| Test | Asserts |
|---|---|
| `rollback_rehearsal_preserves_canonical_health_reporting_and_installs` | All five steps match their expectations. After steps 1, 2 and 4, every check passes, and `install` is called with the live website directory. A fixture regenerated variant missing `/ui/health` turns step 1 into `FAIL`. |
| `rollback_from_any_post_linked_phase_keeps_canonical_site_url_and_accepts_canonical_and_legacy_component_urls` (component-URL half; the promotion half is in A16) | After each permitted step, the canonical and legacy inputs both store the canonical URL through the binding, and global fetch is never used. |

- [ ] 1. Follow the task loop. Command: `node --test tests/rollback-rehearsal.test.mjs`.
- [ ] 2. Extra: `node scripts/rollback-rehearsal.mjs <A14 local variants dir> beta`, then the same for `production` (real shadcn CLI installs).
- [ ] 3. Commit `test(release): local rollback rehearsal on packaged variants`.

**Failure rule:** if Miniflare cannot load the reporting Worker with `LOCAL_MODE="false"` and dummy secrets, stop and report which binding failed. Never switch the rehearsal to `LOCAL_MODE="true"`, because the spec says that does not satisfy the gate.

---

### Task A23: `promote.yml` and targeted `rollback.yml` (G8 workflows)

**Tier:** consequential (production deploy workflow). **Depends:** A16, A17, A18, A19. **Base:** integration.

**Files:**
- Create `.github/workflows/promote.yml` and `tests/promote-workflow.test.mjs`.
- Modify:
  - `.github/workflows/rollback.yml`: becomes a thin `workflow_dispatch` caller of `promote.yml` with `rollback: true`.
  - `scripts/release.mjs`: adds the read-only CLI `plan-promotion ENV SIDE TARGET [--rollback]`. It runs A16 steps 3–4 (`readLivePair`, `reachedRedirect`, `assertTransition`) and appends `gates=<comma list>`, `website_id` and `api_id` to `GITHUB_OUTPUT`. It never mutates and exits 1 on refusal.

**`promote.yml` contract:**
- Triggers: `workflow_dispatch` and `workflow_call`, with the same inputs:
  - `environment` (beta | production), `side` (api | website), `target_phase`, `rollback` (boolean), `schema_ack` (boolean).
  - `run_id`, `commit`, `digest`: the candidate variant.
  - `peer_run_id`, `peer_commit`, `peer_phase`, `peer_digest`: the live other side, with `peer_run_id: baseline` for a B1 baseline peer.
  - `current_run_id`, `current_commit`, `current_phase`, `current_digest`: the live same side, or `baseline`.
  - `attest`: free text, required for `browser-report` and `discovery`.
- Job:
  - `if: github.ref == 'refs/heads/main' && (inputs.side != 'api' || !inputs.rollback || inputs.schema_ack)`.
  - `environment: ${{ inputs.environment }}`, so production approval stays required.
  - `concurrency: deploy-${{ inputs.environment }}`, shared with `verify.yml`'s deploy jobs and not cancelled.
  - `permissions: contents: read, actions: read, issues: write`.
- Ordered steps. Any failure stops the job, so nothing after it runs:
  1. Checkout `github.sha`, Node 22.22.0, `npm ci --ignore-scripts`, and the pinned Wrangler runtime (the existing block).
  2. `release-rollback-run.mjs` for the candidate, peer and current runs. Baseline values are skipped here; `readLivePair` verifies them.
  3. Download `release-<commit>` from each run into `artifacts/{candidate,peer,current}`.
  4. `node scripts/release.mjs verify …` for each downloaded variant: `<env>/<side>-<target_phase>`, and the peer and current variant dirs.
  5. `plan-promotion` (with `--rollback` when set), with `CLOUDFLARE_API_TOKEN` for its read-only version lookups. The `/health` identities are public.
  6. Gate steps. Each runs only when its name is in `steps.plan.outputs.gates`, and each success is followed by `node scripts/release-phases.mjs record-gate "$PROMOTION_EVIDENCE" ENV <gate> <website_id> <api_id>`:

     | Gate | Command |
     |---|---|
     | `live` | `node scripts/release.mjs live ENV --website=<live website dir:digest or baseline> --api=<live api dir:digest or baseline>` |
     | `component-head` | `node scripts/deployed-component-gate.mjs ENV`, with `ADMIN_TOKEN: secrets.REPORTING_ADMIN_TOKEN` and `COMPONENT_GATE_REPORT_ID: vars.COMPONENT_GATE_REPORT_ID` |
     | `ui-browser` | `npx playwright install --with-deps chromium`, then `UI_BROWSER_URL=<canonicalSite>/ node tests/navigation-ui.browser.mjs` |
     | `browser-report` | no command; `record-gate … --attest="$ATTEST"`, which fails when `attest` is empty |
     | `dual-install` | `node scripts/live-install.mjs ENV` |
     | `discovery` | `node scripts/check-discovery.mjs robots docs/reports/2026-10-01-move-baseline/apex-robots.before.txt`, then `node scripts/check-discovery.mjs shadcn-template 'https://cojeev.com/ui/r/{name}.json' button,cojeev,date-picker`, then `record-gate … --attest="$ATTEST"` |

  7. `node scripts/release.mjs promote-<side> ENV COMMIT artifacts/candidate/<env>/<side>-<target_phase> DIGEST <peer id> [--rollback]`.
     - It gets `PEER_DIRECTORY`, `PEER_DIGEST` and `PROMOTION_EVIDENCE`.
     - It gets `ROLLBACK_SCHEMA_ACK: 0002_safe_delivery.sql` only when `side == 'api' && rollback`.
     - It gets the existing four reporting secrets plus `CLOUDFLARE_API_TOKEN`. The reporting secrets appear on no other step.
  8. `node scripts/release.mjs live ENV …` for the new pair. When the new pair is Linked or Redirect (forward or rollback), also run `node scripts/deployed-component-gate.mjs ENV` with the same two values as the gate step. This is the spec's post-cutover run: beta after its cutover, production after `SITE_URL` switches, and production again after old-page redirects.
  9. On `failure()`: `node scripts/operations-health.mjs ENV` with `EXPECTED_WEBSITE_ID`, `EXPECTED_API_ID`, `UPDATE_ALERT: 'true'` and `OPERATIONS_FAILURE: deployment-failed`.
- `PROMOTION_EVIDENCE` is `$RUNNER_TEMP/promotion-evidence.jsonl`. Evidence is run-local: it is never uploaded, cached or reused across runs.

**`rollback.yml` contract:**
- Inputs: `environment`, `side`, `target_phase`, `run_id`, `commit`, `digest`, the peer and current input groups, and `schema_ack`.
- Its one job `uses: ./.github/workflows/promote.yml` with `rollback: true`.
- Its old untargeted `release.mjs rollback` step is deleted.

**Named tests (`tests/promote-workflow.test.mjs`, which parses the YAML with `import { parse } from 'yaml'`, as `tests/ci-reuse-wiring.test.mjs:5` does):**

| Test | Asserts |
|---|---|
| `promote_workflow_runs_gates_before_targeted_promotion` | Step order is provenance, then download, verify, plan, the gates with their `record-gate`, `promote-*`, post-promotion `live`, and the post-promotion component gate conditioned on the Linked or Redirect pair. Secret scoping: the four reporting secrets appear only on the promote step; `CLOUDFLARE_API_TOKEN` only on the plan and promote steps; `REPORTING_ADMIN_TOKEN` only on component-gate steps; `HEALTH_TOKEN` only on `live` steps. Concurrency and `environment` are set. |
| `rollback_workflow_is_targeted_and_keeps_provenance` | `rollback.yml` calls `promote.yml` with `rollback: true`. It holds no `release.mjs rollback` or `release.mjs deploy` string. Provenance is verified for all three runs. |
| `health_recovery_and_diagnostics_keep_existing_protections` (workflow half) | The failure step passes both expected IDs, `UPDATE_ALERT` and `OPERATIONS_FAILURE`, and no secret except `GH_TOKEN`. |

- [ ] 1. Follow the task loop. Command: `node --test tests/promote-workflow.test.mjs tests/promotion.test.mjs`.
- [ ] 2. Extra: `actionlint .github/workflows/promote.yml .github/workflows/rollback.yml`, if `actionlint` is installed. If not, record "not run".
- [ ] 3. Commit `feat(ci): targeted promote and rollback workflows with run-local gate evidence`.

**Failure rules:**
- If `workflow_call` cannot pass `environment` approval through, stop and report. Never duplicate the job into `rollback.yml` without review.
- If `workflow_dispatch` rejects the input count, keep the peer and current groups and fold `*_phase` into a single `*_variant` input. Report that change in the PR.

---

### Task A20: `verify.yml`, health and recovery workflows (G8 CI; closes the PR CI window)

**Tier:** consequential (release pipeline). **Depends:** A16, A17, A19, A21, A22. **Base:** integration.

**Files:**
- Modify `.github/workflows/verify.yml`:
  - **L282–285, `verify` job outputs.** Replace `beta_digest` and `production_digest` with the 20 variant outputs that A14 writes: `<env>_<side>_<phase>_digest` and `<env>_<side>_<phase>_id` for env ∈ {beta, production} and the five variants. Keep `run_release` and add `run_migration: ${{ steps.depth.outputs.run_migration }}`.
  - **New step before L391, "Fetch the pinned baselines".**
    - `if: steps.depth.outputs.run_release == 'true'`, with `GH_TOKEN: ${{ github.token }}`.
    - For each distinct commit in `jq -r '.beta.commit, .production.commit' scripts/release-baseline.json`, run `gh release download migration-baseline -p "release-$commit.tar.gz" -D "$RUNNER_TEMP/baseline"` and extract it (I4).
    - Then append `BASELINE_BETA_DIRECTORY=$RUNNER_TEMP/baseline/beta` and `BASELINE_PRODUCTION_DIRECTORY=$RUNNER_TEMP/baseline/production` to `GITHUB_ENV`.
  - **L391–400.** `node scripts/release.mjs build-variants "$GITHUB_SHA" artifacts/release` (id `release`), with the same five `env:` lines.
  - **L401–405.** `release-csp.mjs <env> artifacts/release/<env>/website-<phase>` for the three website phases in both environments.
  - **L406–408.** `check-structured-data.mjs --dir artifacts/release/production/website-regenerated/site/ui --site https://cojeev.com/ui`.
  - **L491–498.** `release-install.mjs <env> "$GITHUB_SHA" artifacts/release/<env>/website-<phase> "$DIGEST"` for `mounted` and `regenerated` in both environments, with digests from `steps.release.outputs.*`.
  - **New step group after the install step.** `if: steps.launch_policy.outputs.deferred != 'true' && steps.depth.outputs.run_migration == 'true'`:
    1. `check-asset-chains.mjs` on all six website variants.
    2. `redirect-browser.mjs --packaged=artifacts/release/<env>/website-redirect` for both environments.
    3. `rollback-rehearsal.mjs artifacts/release <env>` for both environments.
  - **`beta` job (L589–645) and `production` job (L646–700).**
    - Environment URLs become `https://beta.000h.cojeev.com/ui/` and `https://cojeev.com/ui/`.
    - Add `actions: read` to both jobs' permissions.
    - The deploy step and the `live <env> "$GITHUB_SHA"` step are replaced by the steady-state sequence below. Concurrency groups and the failure notification stay, the notification now with `EXPECTED_WEBSITE_ID` and `EXPECTED_API_ID`.
- Modify `.github/workflows/health.yml` and `.github/workflows/recovery.yml` only if A15's `operations-health.mjs` CLI changed shape. Their scheduled mode passes no expected IDs, so A15 evaluates the pair table. `recovery.yml` L39–47 keeps restoring only into the scratch D1.
- Create `tests/verify-workflow.test.mjs`. Modify `tests/ci-reuse-wiring.test.mjs` only where it names the removed `beta_digest` and `production_digest` outputs.

**Steady-state deploy sequence (I3), per environment job. Each step runs only if the previous one succeeded:**
1. `node scripts/release.mjs steady-pair <env>` (id `pair`; no secrets, because `/health` is public).
2. If `steps.pair.outputs.steady != 'true'`, write to the step summary `Migration in progress (<pair>): main builds and verifies only; promote with promote.yml.` Every later step is conditioned on `steps.pair.outputs.steady == 'true'`, so the job ends green without deploying.
3. Find the live website's run:
   - `gh run list --workflow verify.yml --branch main --event push --status success --commit "$WEBSITE_COMMIT" --json databaseId -q '.[0].databaseId'`.
   - Then `node scripts/release-rollback-run.mjs "$RUN" "$WEBSITE_COMMIT"`.
   - Then download `release-$WEBSITE_COMMIT` from that run into `artifacts/peer`.
4. `PEER_DIGEST` is the sha256 of `artifacts/peer/<env>/website-redirect/manifest.json`. The trust basis is run provenance (step 3) plus A14's `readVariant`, which checks every file hash and requires `deploymentId === steps.pair.outputs.website_id`. The PR states this basis in one line for review.
5. `node scripts/release.mjs promote-api <env> "$GITHUB_SHA" artifacts/release/<env>/api-linked "$API_DIGEST" "$WEBSITE_ID"` with `PEER_DIRECTORY`, `PEER_DIGEST` and the existing secrets.
6. `node scripts/release.mjs promote-website <env> "$GITHUB_SHA" artifacts/release/<env>/website-redirect "$WEBSITE_DIGEST" "$NEW_API_ID"`. Its peer is this run's `api-linked` variant and its digest. It gets `CLOUDFLARE_API_TOKEN` only.
7. `node scripts/release.mjs live <env> --website=artifacts/release/<env>/website-redirect:$WEBSITE_DIGEST --api=artifacts/release/<env>/api-linked:$API_DIGEST`, with `HEALTH_TOKEN` and `EXPECTED_ANALYTICS_ENABLED` as today.

Same-phase promotion needs no gate evidence (I1). Production keeps `needs: [verify, beta]` and its environment approval.

**Named tests (`tests/verify-workflow.test.mjs`; parse with `yaml` as in `tests/ci-reuse-wiring.test.mjs:5`):**

| Test | Asserts |
|---|---|
| `verify_workflow_builds_variants_and_runs_migration_gates` | Every `steps.release.outputs.*` reference is one of A14's 20 keys. No workflow under `.github/workflows/` contains `build-pair`, `release.mjs deploy` or `release.mjs rollback`. The asset-chain, redirect-browser and rehearsal steps are conditioned on `run_migration`. The baseline step precedes `build-variants`. |
| `steady_state_deploy_waits_for_the_steady_pair` | In both deploy jobs, `steady-pair` precedes every promote step. Each promote, peer-download and `live` step carries the `steady == 'true'` condition. `release-rollback-run.mjs` precedes the peer download. `promote-api` precedes `promote-website`. The reporting secrets appear only on the `promote-api` step, `CLOUDFLARE_API_TOKEN` only on the two promote steps, and `HEALTH_TOKEN` only on the `live` step. |
| `health_recovery_and_diagnostics_keep_existing_protections` (recovery half; the other halves are in A15, A16 and A23) | `recovery.yml` restores only into the scratch D1 database name and never runs `release.mjs`. `health.yml` keeps `UPDATE_ALERT`. Both failure notifications keep `OPERATIONS_FAILURE`. |

- [ ] 1. Follow the task loop. Command: `node --test tests/verify-workflow.test.mjs tests/ci-reuse-wiring.test.mjs tests/ci-scope.test.mjs`.
- [ ] 2. Extra: this PR's own `verify` run must be fully green, including every release-packaging step that was red during the window. Paste the run URL into the PR description.
- [ ] 3. Commit `ci: build migration variants, run migration gates and deploy only at the steady pair`.

**Failure rules:**
- If the peer-run lookup finds no successful run for the live commit, the job fails closed. Report it and never fall back to an untargeted deploy.
- If the live peer's artifact has expired (90-day retention), the steady job fails closed. The owner then promotes through `promote.yml` with the peer's run inputs. If none survives, stop for an owner decision; never weaken peer verification.
- If GitHub rejects 20 job outputs or the step group size, report it. Do not merge outputs into one JSON blob without review.

---

# Part B — Rollout runbook

The owner (or the coordinator, with the owner present) runs these in order. A step starts only after the previous step's checks pass. **OWNER GO REQUIRED** marks every production-touching or outward-facing action. Ask in one line, and wait for an explicit yes. A yes for one step never carries to the next.

**Common rules:**
- **Shell setup.** Run once per shell, from a clean checkout of `main` (B1 uses commit C0; later steps use C1):
  ```bash
  export ACCOUNT=25369d7051a3d996a1bca81f462a1fbc CF=https://api.cloudflare.com/client/v4
  cfget() { curl -fsS -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$CF/$1"; }   # token stays in env; never echo it
  export ZONE=$(cfget "zones?name=cojeev.com" | jq -r '.result[0].id')
  export OUT=docs/reports/2026-10-01-move-baseline
  ```
- **Never print** a token, a secret, a report row, a contact address or an attachment. Inventories are counts and path classes only (Zealie HIPAA rule: no PHI).
- **On any stop:** stop promoting. Leave the live pair as it is, unless that step's rollback line says otherwise. Report the failing check by name.
- **How promotions run.** Every promotion and rollback is a `promote.yml` or `rollback.yml` dispatch on `main`:
  ```bash
  gh workflow run promote.yml --ref main -f environment=<env> -f side=<api|website> -f target_phase=<phase> \
    -f run_id=$R1 -f commit=$C1 -f digest=<variant digest> \
    -f peer_run_id=<run|baseline> -f peer_commit=<sha> -f peer_phase=<phase> -f peer_digest=<digest> \
    -f current_run_id=<run|baseline> -f current_commit=<sha> -f current_phase=<phase> -f current_digest=<digest> \
    [-f attest="<text>"]
  ```
  The gates run inside that run (A23). Watch it with `gh run watch`. A production run also waits for the `production` environment approval.

### B1 — Read-only baseline (counterpart of spec step 1)

No production change. The owner is told when it starts. Step 4 alone is outward-facing.

1. Confirm that A0 is merged and its `main` push run succeeded:
   - `gh run list --workflow verify.yml --branch main --event push --status success -L 1 --json databaseId,headSha` gives R0 and C0.
   - C0 must be the A0 merge commit.
   - `curl -fsS https://000h.cojeev.com/health | jq -r .release` and the beta equivalent must both equal C0. Otherwise stop.
2. Freeze release-scope merges to `main` until B2. Tell the owner in one line.
3. Run `node scripts/release-rollback-run.mjs $R0 $C0`, then `gh run download $R0 -n release-$C0 -D "$TMPDIR/baseline"`. For each environment:
   - compute the digest: `shasum -a 256 "$TMPDIR/baseline/<env>/manifest.json"`;
   - verify: `node scripts/release.mjs verify <env> $C0 "$TMPDIR/baseline/<env>" <digest>` (the C0 schema-1 verifier).
   - Stop on any failure.
4. **OWNER GO REQUIRED (public prerelease, I4).**
   - Pack the archive: `tar -czf "$TMPDIR/release-$C0.tar.gz" -C "$TMPDIR/baseline" beta production`.
   - Show the owner `tar -tzf "$TMPDIR/release-$C0.tar.gz" | cut -d/ -f1-2 | sort -u`. It must list only `site`, `website`, `api` and `manifest.json` under each environment. Secrets are never in artifacts.
   - After the yes: `gh release create migration-baseline "$TMPDIR/release-$C0.tar.gz" --prerelease --target $C0 --title "Migration baseline $C0" --notes "Unchanged release-$C0 artifact from run $R0, pinned for the move to cojeev.com/ui."`.
5. Record Worker versions:
   - `cfget "accounts/$ACCOUNT/workers/scripts/<name>/deployments" | jq '.result.deployments[0] | {created_on, versions}'` for `cojeev-ui-registry`, `cojeev-ui-registry-beta`, `cojeev-ui-reporting`, `cojeev-ui-reporting-beta` and `cojeev-coming-soon`.
   - Stop if any active deployment splits traffic.
6. Record routes, domains, rules and DNS, all non-secret fields only:
   - `cfget "zones/$ZONE/workers/routes" | jq '[.result[] | {pattern, script}]'`
   - `cfget "accounts/$ACCOUNT/workers/domains" | jq '[.result[] | {hostname, service, environment}]'`
   - `cfget "zones/$ZONE/rulesets/phases/http_request_dynamic_redirect/entrypoint" | jq '[.result.rules[]? | {expression, action}]'`, where a 404 means none
   - `cfget "zones/$ZONE/dns_records?per_page=100" | jq '[.result[] | {type, name, proxied}]'`
   - **Stop** if any route, rule or domain already matches `cojeev.com/ui`, or if `cojeev.com/*` is not owned by `cojeev-coming-soon`.
7. Turnstile: `cfget "accounts/$ACCOUNT/challenges/widgets" | jq '[.result[] | {sitekey, name, domains}]'`. The jq projection never selects a secret. Record which widget the reporting config uses.
8. Origins: `curl -sS -o /dev/null -D - -X OPTIONS https://feedback.cojeev.com/v1/reports -H "Origin: <o>" -H 'Access-Control-Request-Method: POST' | grep -i '^access-control-allow-origin'` for `<o>` = `https://000h.cojeev.com` (expect echoed) and `https://cojeev.com` (expect absent). Repeat for `feedback-beta.cojeev.com` with the beta origin.
9. Apex robots:
   - Run `curl -sS -D "$OUT/apex-robots.before.headers" -o "$OUT/apex-robots.before.txt" https://cojeev.com/robots.txt`.
   - **Stop** if it has a `Disallow` that covers `/ui`.
   - Record the robots source decision (I5):
     - (a) A robots source file exists in the coming-soon repo: B8 adds one line to it.
     - (b) Live robots is 404 and no source exists: B8 creates `apps/cojeev-coming-soon/public/robots.txt` containing only `Sitemap: https://cojeev.com/ui/sitemap.xml`.
     - (c) Live robots exists but no source does (for example Cloudflare-managed): **stop for an owner decision** before B8.
10. Old-host checks:
    - `node scripts/verify-install.mjs --url=https://000h.cojeev.com --components=button,cojeev,date-picker`, plus the same with `--url=https://beta.000h.cojeev.com`.
    - `curl -sS -o /dev/null -w '%{http_code}\n'` for `/`, `/docs/button/`, `/r/button.json` and `/health` on both old hosts. Expect 200.
11. Apex probes: for `/`, `/robots.txt`, `/uikit?x=1`, `/uikit.txt?x=1` and `/ui-other.txt` on `https://cojeev.com`, record the status, the `content-type` (without parameters) and `sha256` (except `/robots.txt`). These go into `apexProbes` in A14's schema.
12. Reporting URL inventory (counts only). Run for each environment:
    ```bash
    npx --no-install wrangler d1 execute <cojeev-ui-reports|cojeev-ui-beta-reports> --remote --config workers/reporting/wrangler.jsonc [--env beta] --json --command "
    SELECT 'reports' t, CASE WHEN component_url IS NULL THEN 'none' WHEN component_url LIKE 'https://000h.cojeev.com/docs/%' THEN 'legacy-docs'
      WHEN component_url LIKE 'https://beta.000h.cojeev.com/docs/%' THEN 'beta-legacy-docs' WHEN component_url LIKE '%/ui/docs/%' THEN 'canonical-docs' ELSE 'other' END c, COUNT(*) n FROM reports GROUP BY c
    UNION ALL SELECT 'topics', CASE WHEN component_url IS NULL THEN 'none' WHEN component_url LIKE '%/ui/docs/%' THEN 'canonical-docs' WHEN component_url LIKE '%/docs/%' THEN 'legacy-docs' ELSE 'other' END c, COUNT(*) FROM topics GROUP BY c
    UNION ALL SELECT 'outbox', kind || ':' || state, COUNT(*) FROM outbox WHERE state <> 'sent' GROUP BY kind, state"
    ```
    Record only the `(t, c, n)` triples. If `other` is non-zero, stop. The owner decides whether A3's normalizer must accept that form.
13. Shared-origin storage audit (names only). In a fresh Playwright context, load `https://cojeev.com/`, wait for network idle, then record:
    - `Object.keys(localStorage)` and `Object.keys(sessionStorage)`;
    - cookie names;
    - `(await indexedDB.databases()).map(d => d.name)`.
    If any name is outside A9's `HOMEPAGE_KEYS`, stop and update A9 before B2.
14. D1 recovery point: `npx --no-install wrangler d1 time-travel info <db> --config workers/reporting/wrangler.jsonc [--env beta] --json`, recording the bookmark per database.
15. Commit the record:
    - Write `scripts/release-baseline.json` (A14's schema: commit C0, runId R0, the step 3 digests, and the step 5 website and API version IDs).
    - Write `$OUT/README.md`, holding the step 5–14 results, the robots decision and the bookmarks.
    - Commit both, plus the two `apex-robots.before.*` files, on a branch from the integration branch. Merge the PR into `feat/move-to-cojeev-ui`.

**Rollback:** nothing to undo. If B1 must be redone because a release merged to `main` after the freeze, repeat it from step 1 with a new C0. Then replace the `migration-baseline` prerelease asset (OWNER GO again).

### B2 — Merge the integration branch to `main` (counterpart of spec step 2) — OWNER GO REQUIRED

1. Entry conditions:
   - Every Part A task is merged into `feat/move-to-cojeev-ui`, as is the B1 record.
   - The integration branch's latest `verify` run is fully green (A20's rule).
2. Working-app check, the plan's one check. From a clean integration checkout:
   - `npm run build && node scripts/check-ui-export.mjs --dir out`;
   - `BASELINE_BETA_DIRECTORY=… BASELINE_PRODUCTION_DIRECTORY=… node scripts/release.mjs build-variants "$(git rev-parse HEAD)" "$TMPDIR/variants"`;
   - `node scripts/rollback-rehearsal.mjs "$TMPDIR/variants" beta`, then the same for `production`;
   - `node scripts/redirect-browser.mjs --packaged="$TMPDIR/variants/production/website-redirect"`.
3. Independent focused review of every consequential task's merged diff (A2, A3, A11–A18, A20–A24). A reviewer who did not build them uses the Review Focus list. Fix findings on the integration branch before the merge.
4. **OWNER GO REQUIRED:** open and merge the PR `feat/move-to-cojeev-ui` → `main`.
   - The `main` run builds the variants. Its deploy jobs print "Migration in progress (unlisted)" and skip (I3), because the live pair is (baseline, baseline).
   - Record R1 and C1, and all 20 variant digests and IDs from the run's `verify` job outputs (`gh run view $R1 --json jobs` or the run summary).
5. **Stop** if either deploy job deployed anything. `steady-pair` must have answered `migrating`.

**Rollback:** revert the merge on `main`. Nothing was deployed.

### B3 — Additive reporting origin access, beta then production API `prepared` (spec step 3) — OWNER GO REQUIRED

1. **OWNER GO REQUIRED (production config).** In the Cloudflare dashboard, add the hostnames `cojeev.com` and `beta.000h.cojeev.com` to the existing Turnstile widget recorded in B1 step 7. Never create a new widget and never rotate its secret. Verify with B1 step 7's command.
2. The owner creates one synthetic gate report per environment, through that environment's current report form, with fictional text and the contact `gate@example.com`. Record its ID only as the `COMPONENT_GATE_REPORT_ID` variable of that GitHub environment.
3. Beta: dispatch `promote.yml` with `environment=beta side=api target_phase=prepared`, `beta_api_prepared_digest`, and peer/current `baseline`. Required gates: none.
   - Then check preflight from `https://beta.000h.cojeev.com` (echoed) and `https://000h.cojeev.com` (echoed for production only).
   - Then run `node scripts/deployed-component-gate.mjs beta` with the owner's admin token in the environment. Expect `component-head ok`.
4. **OWNER GO REQUIRED (production API).** The same dispatch for `environment=production`. Then:
   - B1 step 8's preflight for both origins: `https://cojeev.com` is now echoed and `https://000h.cojeev.com` still is;
   - the component gate;
   - one old-site synthetic submission from `https://000h.cojeev.com/docs/button/` with fictional text (receipt saved), which the owner deletes or resolves afterwards.
5. **Stop** if the old-site submission or the old lifecycle fails, or if the `/health` `reportingBase` is not the legacy base.

**Rollback (I2, before B6 only, OWNER GO):** `npx --no-install wrangler rollback <B1 apiVersionId> --name cojeev-ui-reporting` (or `-beta`), then `node scripts/release.mjs live <env> --website=baseline --api=baseline`. Leave the Turnstile hostname in place; it is additive.

### B4 — Beta full run (spec step 4)

Beta only. There is no production change, so no OWNER GO is needed. The owner is told at start and finish.

Dispatch, in order, each only after the previous run succeeds and `live` passes:

| # | Side → phase | Peer | Current | Gates (inside the run) | Extra post-checks |
|---|---|---|---|---|---|
| 1 | website → `mounted` | `beta_api_prepared` | baseline | `live`, `component-head` | `UI_BROWSER_URL=https://beta.000h.cojeev.com/ui/ node tests/navigation-ui.browser.mjs`; `curl -sI` on one `/ui/_next/static/chunks/*.js` URL taken from the page source shows `X-Robots-Tag: noindex` |
| 2 | api → `linked` | `beta_website_mounted` | `beta_api_prepared` | `live`, `ui-browser` | the post-run component gate (A23 step 8) |
| 3 | website → `regenerated` | `beta_api_linked` | `beta_website_mounted` | `live`, `component-head`, `browser-report` (`attest`: the owner submitted a real `/ui/docs/button/` report with an attachment and saw the receipt) | `node scripts/live-install.mjs beta` |
| 4 | website → `redirect` | `beta_api_linked` | `beta_website_regenerated` | `live`, `dual-install` | `node scripts/redirect-browser.mjs --live=beta`; the post-run component gate |
| 5 | rollback drill: `rollback.yml` website → `regenerated` | `beta_api_linked` | `beta_website_redirect` | none | `live` passes for the Regenerated pair, and `redirect-browser --live=beta` exits 1 because redirects are off (expected) |
| 6 | website → `redirect` again | `beta_api_linked` | `beta_website_regenerated` | `live`, `dual-install` | `redirect-browser --live=beta` passes |

**Stop** on any failed gate or post-check. Production is untouched. Fix through a normal PR to `main` (release-scope, so B2's review rule applies), then restart B4 from the failed row with the new run's variants.

**Rollback:** `rollback.yml` within the pair table only. Beta never returns to `baseline` after row 2.

### B5 — Production website `mounted`: serve `/ui` additively (spec step 5) — OWNER GO REQUIRED

1. Entry: beta's live pair is Redirect (`node scripts/release.mjs steady-pair beta` prints `steady`). A16 also enforces this.
2. **OWNER GO REQUIRED (production Worker and new zone route).** Dispatch `promote.yml` with `environment=production side=website target_phase=mounted`, the `production_website_mounted` digest, peer `production_api_prepared` (R1) and current `baseline`. Required gates: `live` (Prepared) and `component-head`.
   - This deploy creates the `cojeev.com/ui*` route and the `COJEEV_HOMEPAGE` binding.
   - It must not touch the API or `SITE_URL`.
3. Post-checks:
   - The run's post-promotion `live` covers: the exact mounted ID on `/ui/health` and legacy `/health`, bare `/ui` → `/ui/`, `/uikit*` and `/ui-*` sibling delegation with body and header parity, apex probes equal to B1, separate canonical and legacy RSC chains, the canonical sitemap, real 404s, and both registry paths equal to the pinned baseline hashes.
   - `cfget "zones/$ZONE/workers/routes" | jq '[.result[] | {pattern, script}]'` shows `cojeev.com/ui*` → `cojeev-ui-registry`, and `cojeev.com/*` → `cojeev-coming-soon` unchanged.
   - `UI_BROWSER_URL=https://cojeev.com/ui/ node tests/navigation-ui.browser.mjs`.
   - The owner reads the `cojeev-ui-registry` metrics in the dashboard: errors flat and requests within the plan quota.
4. **Stop** if any apex probe differs from B1, any sibling is served by the registry, or `live` fails.

**Rollback (I2, OWNER GO; destructive order matters):**
1. Delete only the `cojeev.com/ui*` route: find its ID with `cfget "zones/$ZONE/workers/routes" | jq -r '.result[] | select(.pattern=="cojeev.com/ui*") | .id'`, then run `curl -fsS -X DELETE -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" "$CF/zones/$ZONE/workers/routes/<id>"`. Apex `/ui*` falls back to the homepage first.
2. Then run `npx --no-install wrangler rollback <B1 production websiteVersionId> --name cojeev-ui-registry`.
3. Then run `node scripts/release.mjs live production --website=baseline --api=<production api-prepared dir>:<digest>`.

Never delete `cojeev.com/*` or any DNS record.

### B6 — Production API `linked`: switch reporting links (spec step 6) — OWNER GO REQUIRED

1. **OWNER GO REQUIRED (production API vars).** Dispatch `promote.yml` with `environment=production side=api target_phase=linked`, the `production_api_linked` digest, peer `production_website_mounted` and current `production_api_prepared`. Required gates: `live` (Mounted) and `ui-browser`.
   - The run's post-promotion component gate (A23 step 8) proves a legacy input stores the canonical URL through `REGISTRY_SITE`, with `LOCAL_MODE=false`.
2. Post-checks:
   - The run's `live` shows the linked API ID and `reportingBase` `https://cojeev.com/ui`.
   - The owner files one real browser report from `https://cojeev.com/ui/docs/button/`: fictional text, contact `gate@example.com`, one small image attachment. The owner saves the receipt, and reloading `https://cojeev.com/ui/track/#…` shows the report.
   - `node scripts/operations-health.mjs production` with `HEALTH_TOKEN` passes, so delivery states are honest.
   - Existing database links, issue bodies and queued messages are not edited.
3. **Stop** on any failure.

**Rollback:** I2 is forbidden from here.
- The API may only go to `linked`: fix forward through a new `main` run and a same-phase `promote.yml` (I1), or use `rollback.yml` to an earlier `linked` variant.
- The website may roll back to `mounted` (the Linked pair).
- `prepared` and `baseline` targets are refused (A16).

### B7 — Production website `regenerated`: publish the new registry (spec step 7) — OWNER GO REQUIRED

1. **OWNER GO REQUIRED (production Worker).** Dispatch `promote.yml` with `environment=production side=website target_phase=regenerated`, the `production_website_regenerated` digest, peer `production_api_linked` and current `production_website_mounted`.
   - Required gates: `live` (Linked), `component-head` and `browser-report`.
   - The `attest` names the B6 report check, for example `B6 /ui report with attachment, receipt reload OK`, without the report ID or any of its content.
2. Post-checks:
   - The run's `live` shows the distinct regenerated ID, and every live JSON byte under `/r/` and `/ui/r/` equals the regenerated artifact's hashes.
   - `node scripts/live-install.mjs production` passes for both old and new URLs.
   - `UI_BROWSER_URL=https://cojeev.com/ui/ node tests/navigation-ui.browser.mjs` passes (header and bottom funnel links).
   - The Share button on `/ui/docs/button/` copies `https://cojeev.com/ui/docs/button/?utm_medium=share`.
3. **Stop** on any failure.

**Rollback:** `rollback.yml` with website → `mounted` (the Linked pair), permitted while redirects have never been reached. The API stays `linked`.

### B8 — Advertise the sitemap on the apex robots (spec step 8) — OWNER GO REQUIRED

1. Entry: B7 passed, and `curl -fsS https://cojeev.com/ui/sitemap.xml` gives XML whose every `<loc>` starts with `https://cojeev.com/ui/`. Compare `grep -c '<loc>https://cojeev.com/ui/'` with `grep -c '<loc>'`.
2. In `~/Developer/cojeev-coming-soon-performance-review` (repo root), apply B1 step 9's decision:
   - (a) Add the one line `Sitemap: https://cojeev.com/ui/sitemap.xml` to the existing source.
   - (b) Create `apps/cojeev-coming-soon/public/robots.txt` with only that line.
   - (c) Do nothing until the owner has decided.
   - Nothing else in that repo changes.
3. Build and check:
   - Run `npm --prefix apps/cojeev-coming-soon run build`.
   - `apps/cojeev-coming-soon/dist/robots.txt` contains the Sitemap line exactly once.
   - For (a), `diff <(grep -vx 'Sitemap: https://cojeev.com/ui/sitemap.xml' apps/cojeev-coming-soon/dist/robots.txt) <cojeev-ui main checkout>/docs/reports/2026-10-01-move-baseline/apex-robots.before.txt` is empty.
   - `shasum -a 256 apps/cojeev-coming-soon/dist/index.html` must equal B1's apex `/` probe hash. If it differs, this checkout is not what is live: **stop for an owner decision**, because deploying it would change the homepage and fail every later apex probe.
4. **OWNER GO REQUIRED (apex deploy).** Show the owner `git diff`, then run `npx --no-install wrangler deploy --config apps/cojeev-coming-soon/wrangler.jsonc` from that repo root. Commit the change there as `chore: advertise the /ui sitemap`. Push only on a separate owner yes.
5. Verify from the cojeev-ui checkout:
   - `node scripts/check-discovery.mjs robots docs/reports/2026-10-01-move-baseline/apex-robots.before.txt`;
   - `curl -fsS https://cojeev.com/ | shasum -a 256` equals B1;
   - `node scripts/release.mjs live production --website=<regenerated dir>:<digest> --api=<linked dir>:<digest>`.

**Rollback (OWNER GO):** `npx --no-install wrangler rollback <B1 cojeev-coming-soon versionId> --name cojeev-coming-soon`. Then revert the commit in that repo.

### B9 — Production website `redirect`: enable old-page 301s (spec step 9) — OWNER GO REQUIRED

1. Entry: B5–B8 all passed.
2. **OWNER GO REQUIRED (traffic cutover).** Dispatch `promote.yml` with `environment=production side=website target_phase=redirect`, the `production_website_redirect` digest, peer `production_api_linked` and current `production_website_regenerated`.
   - Required gates: `live` (Regenerated), `dual-install` and `discovery`.
   - The `attest` is `B8 robots deployed and verified`.
   - The post-promotion component gate repeats the legacy lifecycle through a 301ing old host.
3. Post-checks, immediately:
   - `node scripts/redirect-browser.mjs --live=production`.
   - The GET and HEAD matrix: for `/`, `/docs/button/`, `/docs/button/?a=1&a=2`, `/docs/%62utton/`, `/work-with-me/`, `/r/button.json`, `/health` and one retained `/_next/static/…` file, run `curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n'` on `https://000h.cojeev.com<path>`, and repeat with `-I`.
     - Pages: 301 to `https://cojeev.com/ui` + path + query, the same for HEAD.
     - Registry, health and static: 200 with no redirect.
   - `node scripts/operations-health.mjs production` with `HEALTH_TOKEN`.
   - The owner watches the `cojeev-ui-registry` and `cojeev-ui-reporting` dashboard metrics after the switch: errors, request volume against quota, and reporting delivery health.
4. **Stop** on any failure.

**Rollback:** `rollback.yml` with website → `regenerated`.
- This turns old-page redirects off and restores the pinned old root HTML, while keeping `/ui`, both registries and reporting compatibility.
- `mounted` is refused from here.
- Cached 301s cannot be recalled; state that in the incident note.

### B10 — External discovery (spec step 10) — OWNER GO REQUIRED (outward-facing)

1. Entry: B9 passed, and `node scripts/check-discovery.mjs shadcn-template 'https://cojeev.com/ui/r/{name}.json' button,cojeev,date-picker` passes.
2. Draft the shadcn PR. Do not open it yet:
   - In a fork of `shadcn-ui/ui`, on branch `cojeev-ui-move`, edit only the existing 000h entry in `apps/v4/registry/directory.json`: `homepage` → `https://cojeev.com/ui/` and `url` → `https://cojeev.com/ui/r/{name}.json`.
   - Run the validation command that repository documents for directory changes (read its contributing notes first), and record the exact command and result.
   - Title: `Update 000h registry homepage and URL to cojeev.com/ui`.
   - Body: `000h moved from 000h.cojeev.com to cojeev.com/ui. This updates the directory entry's homepage and registry URL. The old URL keeps serving the same registry items directly, so existing installs keep working.`
3. **OWNER GO REQUIRED.** Show the owner the exact diff, title and body. After the yes, run `gh pr create --repo shadcn-ui/ui --head <fork owner>:cojeev-ui-move --title "<title>" --body "<body>"`. Record the PR URL and status in `docs/reports/2026-10-01-move-baseline/README.md` under "External discovery", separate from deployment success. Its merge is controlled externally.
4. **OWNER GO REQUIRED.** Show the command, then run `gh repo edit luv-jeri/cojeev-ui --homepage https://cojeev.com/ui/`.
5. Steady state:
   - Both environments are at the Redirect pair, so `main` pushes promote same-phase automatically again (I3, A20).
   - Lift the B1 freeze.
   - The old registry at `000h.cojeev.com/r/` is kept forever, even after the shadcn PR merges.

**Rollback:** close the PR, or run `gh repo edit luv-jeri/cojeev-ui --homepage https://000h.cojeev.com/` (both OWNER GO). Never remove the old registry.

### General rollback rules (spec "Rollback")

1. After B5, never remove `/ui`. Never remove `000h.cojeev.com/r/*.json`, and never redirect it.
2. Website and API roll back independently, only within A24's rollback table. Every rollback names the expected peer ID. A website rollback never deploys its packaged API config (A16).
3. From B6 on:
   - every API target is `linked`, with canonical `SITE_URL` and `reportingBase`, and both canonical and legacy component inputs accepted;
   - I2 is forbidden;
   - `baseline`, schema-1 and pre-migration artifacts are refused (A16 `rollback_artifact_cannot_remove_ui_or_legacy_registry`).
4. After B9, prefer the known-good `/ui` implementation: a same-phase `redirect` fix, or `regenerated` to turn redirects off. Never `mounted`.
5. Verify every restored target by its deployment ID and live registry bytes (the `live` step), never by commit alone.
6. No data restore belongs to this move. Never overwrite newer reports with a baseline D1 snapshot. B1's bookmark is for an unrelated data incident only.
7. Exceptional full withdrawal of discovery:
   - first deploy the robots removal (B8 rollback);
   - then withdraw new discovery (close the shadcn PR, revert the Website field);
   - keep `/ui` endpoints working for cached redirects and new install URLs;
   - never report a deletion as a successful rollback.
8. Never delete DNS records or custom domains, and never switch to an all-request Worker-first list.

---

# Coverage

Every spec requirement maps to a task or a Part B step. "Live at" names the step where the deployed result is checked.

### Completion contract (spec opening table, 15 rows)

| Spec row | Built and tested in | Live at |
|---|---|---|
| `curl …/ui?utm_source=move` gives a 301 to `/ui/?utm_source=move` | A2 `apex_ui_route_wins_and_catches_query_bearing_bare_ui`, A12 (route) | B5 |
| Old `/docs/button/?utm_source=move&x=a%2Fb` gives an exact 301 | A2 `legacy_pages_301_to_same_encoded_path_and_query` | B9 |
| Old `/`, `/about/`, `/work-with-me/`, `/requests/`, `/track/`, `/feedback-admin/`, aliases and unknown pages | A2, A19 | B9 |
| Encoded pathname, repeated query keys and fragment | A2, A19 `tracking_fragment_survives_legacy_redirect` | B9 |
| Both `button.json` URLs are direct 200 JSON | A2, A15 `live_registry_hashes_match_promoted_artifact_not_only_each_other` | B5, B7, B9 |
| Disposable shadcn installs from both URLs | A7, A17, A22 | B7 (`live-install`), B9 (`dual-install`) |
| Production HTML canonical, OG, Twitter and JSON-LD | A6, A17 (structured data) | B7 |
| `/ui/sitemap.xml` and apex `robots.txt` | A4, A6 | B8 |
| Navigation, refresh, search, shares and prefetch on `/ui/` | A1, A8, A19 (`ui-browser`) | B5, B7 |
| Browser report from `/ui/docs/button/` | A3, A10, A12 | B6 |
| Reporting lifecycle with an old `Component:` URL, `LOCAL_MODE=false` | A3, A18, A23 step 8 | B3, B6, B9 |
| Beta `/ui/` and legacy root links | A2, A6, A13, A19 | B4 |
| Apex `/`, `/robots.txt`, `/uikit?x=1`, `/uikit.txt?x=1` and `/ui-other.txt` | A2, A11, A15 (apex probes) | B5, B8 |
| Health and release identity | A2, A3, A15, A22 | the `live` step of every promotion |
| Independent promotions | A16, A23, A24 | B3–B9 |

### Decisions D1–D5 and E1–E7

| ID | Task(s) | Part B |
|---|---|---|
| D1 move to `cojeev.com/ui/` | A1, A12, A14 | B5 |
| D2 old pages 301 with query | A2 | B9 |
| D3 old registry direct forever | A2 `legacy_registry_get_and_head_never_redirect`, A16 | General rollback rule 1, B10 |
| D4 bottom funnel link | A8 | B7 |
| D5 shadcn directory PR | A4 `shadcn_directory_template_fetches_live_json` | B10 |
| E1 new URLs advertised | A5, A6, A7 | B7 |
| E2 beta at `/ui/` with same-host redirects | A2, A13, A19 | B4 |
| E3 header "by Cojeev" link | A8 | B7 |
| E4 old `/health`, `/_next/*` and legacy text stay direct | A2, A11 | B9 |
| E5 storage names checked against the homepage | A9 | B1 step 13 |
| E6 only the robots line changes in the coming-soon repo | Global Constraints, A4 | B8 |
| E7 Turnstile hostname, origin and `REGISTRY_SITE` | A3, A10, A12 | B3 |

### Groups G1–G8 (change statements)

| Group | Task(s) |
|---|---|
| G1 build and asset mount | A1, A14 |
| G2 edge routing, legacy serving and headers | A2, A11, A12 |
| G3 SEO and public references | A4, A5, A6; B8, B10 |
| G4 registry generation and install compatibility | A7, A14, A17 |
| G5 navigation, search, shares and funnel | A8, A19 |
| G6 reporting origins and link continuity | A3, A10, A12, A18 |
| G7 analytics and origin-scoped state | A9 |
| G8 release pipeline, browser fixtures and rollback | A0, A1 (mounts), A12–A24; Part B |

### Review Focus

| # | Test | Task |
|---|---|---|
| 1 | `legacy_redirect_location_always_stays_under_canonical_base` | A2 |
| 2 | `unknown_and_variant_hosts_fail_closed` | A2 |
| 3 | `split_edge_identity_retries_within_budget` | A15 |
| 4 | `legacy_rsc_fetch_with_query_is_served_or_404_never_301` | A11 |
| 5 | `head_matches_get_for_redirects_registry_and_health` | A2 |

### Rollout and rollback (spec "Rollout" and "Rollback")

| Spec | Part B step | Code it relies on |
|---|---|---|
| 1 Capture the baseline | B1 | A0 |
| 2 Prepare compatible artifacts and checks | B2 | A11–A24 |
| 3 Make reporting origin access additive | B3 | A3, A12, A16, A18 |
| 4 Deploy and verify beta | B4 | A16, A19, A23 |
| 5 Serve canonical production `/ui` additively | B5 | A2, A11, A15 |
| 6 Switch reporting link generation | B6 | A3, A16 |
| 7 Publish the new registry and commands | B7 | A7, A17 |
| 8 Advertise the sitemap | B8 | A4 |
| 9 Enable old-page 301s | B9 | A2, A19 |
| 10 Update external discovery | B10 | A4 |
| Rollback within the pair table, peer IDs, no pre-migration replay | General rollback rules 2–5 | A16, A22, A23, A24 |
| No data restore; apex sitemap withdrawal order; old registry forever | General rollback rules 1, 6–8 | A16 |
| No `global_fetch_strictly_public` flag; explicit `REGISTRY_SITE` dispatch | — | A3, A12, A18 failure rule |

### Named invariants (all 113, by group)

| Group | Invariant | Task(s) |
|---|---|---|
| G1 | `build_uses_ui_base_without_asset_prefix` | A1 |
| G1 | `consumer_fonts_remain_self_contained` | A1 |
| G1 | `preview_mount_matches_build_base` | A1 |
| G1 | `raw_export_remains_unwrapped` | A1 |
| G1 | `ui_brand_and_metadata_assets_resolve` | A1 |
| G1 | `ui_font_preload_matches_css_resource` | A1 |
| G2 | `apex_ui_route_wins_and_catches_query_bearing_bare_ui` | A2, A12 |
| G2 | `beta_canonical_paths_do_not_double_prefix` | A2 |
| G2 | `beta_never_redirects_to_production` | A2 |
| G2 | `beta_root_pages_redirect_same_host_preserving_encoded_path_and_query` | A2 |
| G2 | `beta_root_registry_health_and_static_exceptions_stay_direct` | A2 |
| G2 | `both_registry_paths_preserve_metrics_and_probe_labels` | A2 |
| G2 | `generated_run_worker_first_list_stays_within_100_entry_limit` | A11 |
| G2 | `health_and_release_are_no_store` | A2 |
| G2 | `legacy_alias_redirect_does_not_use_its_canonical_target` | A2 |
| G2 | `legacy_health_stays_direct` | A2 |
| G2 | `legacy_missing_registry_returns_404` | A2 |
| G2 | `legacy_pages_301_to_same_encoded_path_and_query` | A2 |
| G2 | `legacy_registry_get_and_head_never_redirect` | A2 |
| G2 | `legacy_rsc_encoding_redirect_chains_keep_root_paths_and_queries` | A11 |
| G2 | `legacy_text_exclusions_use_exact_root_files_and_scoped_directory_patterns` | A11 |
| G2 | `literal_and_encoded_canonical_rsc_paths_stay_under_ui` | A11 |
| G2 | `missing_assets_are_not_long_cached` | A2 |
| G2 | `missing_ui_text_siblings_delegate_through_real_asset_router_with_body_header_parity` | A11 |
| G2 | `retained_legacy_text_and_chunks_are_direct` | A2, A11 |
| G2 | `root_and_ui_reserved_paths_are_404` | A2 |
| G2 | `static_bypasses_do_not_cover_html` | A11 |
| G2 | `ui_admin_and_beta_are_noindex` | A2 |
| G2 | `ui_asset_redirects_keep_mount_and_query` | A11 |
| G2 | `ui_prefix_siblings_delegate_without_header_changes` | A2 |
| G2 | `website_health_exposes_variant_deployment_identity` | A2 |
| G2 | `worker_and_asset_security_headers_match` | A2 |
| G3 | `apex_robots_adds_only_ui_sitemap_line` | A4 |
| G3 | `beta_robots_and_headers_block_indexing` | A6, A17 |
| G3 | `canonical_and_social_urls_have_exactly_one_ui_prefix` | A6 |
| G3 | `component_aliases_keep_canonical_component_names` | A6 |
| G3 | `public_docs_advertise_new_urls_and_explain_legacy_support` | A5 |
| G3 | `repository_schema_and_provider_urls_are_unchanged` | A5, A6 |
| G3 | `shadcn_directory_template_fetches_live_json` | A4 |
| G3 | `sitemap_contains_only_canonical_public_routes` | A6 |
| G3 | `structured_data_ids_and_breadcrumbs_use_canonical_site` | A6 |
| G3 | `work_with_me_canonical_remains_about` | A6 |
| G4 | `all_generated_dependencies_use_reviewed_registry_base` | A7 |
| G4 | `candidate_install_rejects_remote_dependency_escape` | A7 |
| G4 | `foundation_alias_maps_to_new_registry_without_renaming` | A7 |
| G4 | `legacy_and_canonical_registry_payloads_match` | A14 |
| G4 | `registry_regeneration_matches_all_three_indexes` | A7 |
| G4 | `registry_schemas_and_component_identity_are_unchanged` | A7 |
| G4 | `shadcn_new_url_installs_foundation_and_composed_item` | A17 |
| G4 | `shadcn_old_url_installs_foundation_and_composed_item` | A17 |
| G4 | `ui_dependencies_rewrite_to_candidate_fixture` | A7 |
| G5 | `beta_queued_admin_query_and_component_links_survive_cutover` | A19 |
| G5 | `beta_tracking_fragment_survives_same_host_redirect_in_browser` | A19 |
| G5 | `disabled_shell_footer_still_has_funnel_link` | A8 |
| G5 | `every_exported_html_page_has_one_bottom_cojeev_link` | A8 |
| G5 | `funnel_link_is_keyboard_accessible_in_compact_and_full_shells` | A8 |
| G5 | `header_brand_and_cojeev_attribution_are_distinct_links` | A8 |
| G5 | `next_navigation_adds_ui_once` | A8 |
| G5 | `search_fetch_is_prefixed_and_entries_are_logical` | A8 |
| G5 | `search_selection_uses_existing_route_guard` | A8 |
| G5 | `share_uses_ui_path_without_query_or_fragment` | A8 |
| G5 | `tracking_fragment_survives_legacy_redirect` | A19 |
| G6 | `api_health_exposes_deployment_identity_and_reporting_base` | A3 |
| G6 | `approved_legacy_component_url_normalizes_before_direct_head` | A3 |
| G6 | `component_head_failure_does_not_resolve_or_enqueue_notification` | A3 |
| G6 | `component_normalization_rejects_credentials_queries_fragments_and_foreign_hosts` | A3 |
| G6 | `deployed_component_head_uses_same_environment_binding` | A18 |
| G6 | `invalid_component_input_never_dispatches_service_binding` | A3 |
| G6 | `new_component_url_requires_canonical_docs_path` | A3 |
| G6 | `new_delivery_links_include_ui` | A3 |
| G6 | `reporting_api_and_webhook_paths_remain_at_feedback_root` | A3 |
| G6 | `reporting_cors_accepts_cojeev_origin_without_path` | A3, A12 |
| G6 | `reporting_live_head_binds_only_same_environment_registry` | A3, A12 |
| G6 | `reporting_wrong_origin_remains_forbidden` | A3 |
| G6 | `resolved_request_webhook_accepts_existing_legacy_component_line` | A3 |
| G6 | `turnstile_hostname_and_reporting_action_are_verified` | A3 |
| G6 | `ui_browser_submission_receipt_attachment_and_reload_work` | A10 |
| G6 | `ui_diagnostics_preserve_only_safe_public_routes` | A10 |
| G7 | `analytics_keeps_provider_hosts_and_release_environment_labels` | A9 |
| G7 | `dnt_gpc_and_opt_out_remain_effective` | A9 |
| G7 | `homepage_funnel_is_same_origin_not_outbound` | A9 |
| G7 | `homepage_storage_survives_ui_preference_changes` | A9 |
| G7 | `old_origin_drafts_and_preferences_are_not_imported_or_deleted` | A9 |
| G7 | `optional_capture_requires_new_origin_consent` | A9 |
| G7 | `ui_browser_and_router_paths_share_analytics_bucket` | A9 |
| G7 | `ui_keys_do_not_collide_with_homepage_keys` | A9 |
| G7 | `ui_prefix_boundary_does_not_strip_uikit` | A9 |
| G7 | `ui_privacy_banner_behavior_is_preserved` | A9 |
| G7 | `ui_private_routes_stay_excluded` | A9 |
| G8 | `additive_artifact_preserves_pinned_same_environment_old_site` | A14 |
| G8 | `all_browser_mounts_match_ui_build` | A1 |
| G8 | `api_promotion_does_not_deploy_website` | A16 |
| G8 | `artifact_contains_ui_home_identity_headers_and_legacy_registry` | A14 |
| G8 | `beta_manifest_allows_exact_cojeev_homepage_navigation_only` | A13 |
| G8 | `beta_manifest_rejects_production_ui_api_and_canonical_metadata` | A13 |
| G8 | `ci_scope_selects_migration_routing_and_origin_gates` | A21 |
| G8 | `csp_gate_resolves_absolute_same_origin_assets` | A17 |
| G8 | `deployment_guard_accepts_only_reviewed_routes_origins_bindings_and_phase_pairs` | A12, A24 |
| G8 | `health_checks_independently_expected_api_and_website_identities` | A15 |
| G8 | `health_recovery_and_diagnostics_keep_existing_protections` | A15, A16, A20, A23 |
| G8 | `live_gate_checks_canonical_and_legacy_contracts_separately` | A15 |
| G8 | `live_gate_rejects_stale_same_sha_variant` | A15 |
| G8 | `live_registry_hashes_match_promoted_artifact_not_only_each_other` | A15 |
| G8 | `manifest_rejects_cross_environment_hosts_and_wrong_base_paths` | A13 |
| G8 | `promotion_rejects_unlisted_phase_pairs_and_stale_peer` | A16, A24 |
| G8 | `release_environment_sets_ui_bases_consistently` | A14 |
| G8 | `reserved_export_rejection_covers_root_and_ui` | A13 |
| G8 | `rollback_artifact_cannot_remove_ui_or_legacy_registry` | A16 |
| G8 | `rollback_from_any_post_linked_phase_keeps_canonical_site_url_and_accepts_canonical_and_legacy_component_urls` | A16, A22 |
| G8 | `rollback_rehearsal_preserves_canonical_health_reporting_and_installs` | A22 |
| G8 | `same_sha_variants_have_distinct_deployment_ids` | A14 |
| G8 | `untargeted_migration_deployment_is_rejected` | A16 |
| G8 | `website_promotion_cannot_revert_or_prematurely_switch_site_url` | A16 |

### Appendix A inventory rows

Row numbers are the spec's "Input line" column. Missing numbers are section headings in the inventory.

| Rows | Owner |
|---|---|
| 11–15, 51, 53–60 | A1 (build base, start script, env example, fonts, brand and icon assets) |
| 16–17 | A1 (site defaults) |
| 18, 20–36, 38–40 | A6 (metadata, pages, sitemap, robots, structured data) |
| 19, 37, 41 | A7 (install command, catalog and featured install URLs) |
| 42–46 | A5 (public docs) |
| 47–48 | A10 (reporting README) |
| 49–50 | A6 (triage repository identity, unchanged) |
| 52 | B10 (GitHub Website field) |
| 61–63 | A8 (search fetch and fallback) |
| 64 | A9 (service-worker scan) |
| 65 | A1 `ui_font_preload_matches_css_resource` and A13 base-path scan (CSS URL scan) |
| 73–76 | A12 (wrangler config), with A2's routing decision |
| 77–90, 94–96 | A2 (Worker control flow, headers, hosting and registry tests) |
| 91–93 | A11 (static-assets test on `ruleMatches`) |
| 97–99 | A12, A14 (release config) |
| 100–105 | A14 (build and verify), A15 (`live`), A16 (deploy, rollback and identity) |
| 106 | A15 |
| 107–111 | A12 (environment config fields) |
| 112–115 | A13 |
| 116–121, 125, 127 | A17 |
| 122–124 | A7 |
| 126 | A15 (launch readiness reads identities) |
| 128 | A1 |
| 129 | A16 |
| 130–140 | A20 (A0 owns `verify.yml:505` on `main`) |
| 141 | A23 |
| 142–145 | A21 |
| 153–157 | A12 applies A3's values |
| 158–163, 167 | A3 |
| 164 | A3 (`new_delivery_links_include_ui`), A19 (queued links in a browser) |
| 165–166, 168–173 | A10 |
| 174–185, 187 | A9 |
| 186, 188 | A8 (shares, landing footer); 188's analytics half is A9 |
| 194–214 | A8 (logical links, verify only) |
| 220–252 | A1 (preview mounts) |
| 253 | A1 (fixture `SITE_URL`), A18 and A22 (consumers) |
| 259–262 | A12, A13, A14 |
| 263 | A15 |
| 264–266 | A3, A12, A16 |
| 267–268 | A9 |
| 269, 280 | A10 |
| 270–272 | A6 |
| 273 | A7 |
| 274 | A17 |
| 275 | A18 |
| 276–277 | A3 |
| 278–279 | A8 |
| 286–367, 369–392 | A1 (browser test mounts) |
| 368 | A1 (mount), A19 (beta continuity) |
| 402–582 | A7 (generator, then regenerated payloads, verified by regeneration) |
| `workers/reporting/src/types.ts:1–12` (round-1 addition) | A3 |

---

# Dependency and parallel-group summary

Start a group's tasks the moment their own dependencies merge, not when the whole previous group finishes.

| Group | Tasks (run in parallel) | Waits for | Unlocks |
|---|---|---|---|
| M | A0 (base `main`) | — | B1 |
| P1 | A1, A2, A3, A4, A5, A21, A24 | — (B1 runs alongside once A0's run succeeds) | P2, A12 |
| P2 | A6, A7, A8, A9, A10 (each on A1); A11 (on A2) | A1 or A2 | A12, A14, A17, A19 |
| P3 | A12 | A2, A3, A11, A24 | A13, A18 |
| P4 | A13; A18 | A12 (A18 also A3) | A14, A15, A22, A23 |
| P5 | A14; A15 | A14: A1, A11, A13, A24 and merged A6–A10 (CI window opens). A15: A13, A24 | A16, A17, A19 |
| P6 | A16; A17; A19 | A16: A14, A15. A17: A7, A14. A19: A11, A14 | A22, A23, A20 |
| P7 | A22; A23 | A22: A16, A17, A18. A23: A16–A19 | A20 |
| P8 | A20 | A16, A17, A19, A21, A22 (CI window closes) | B2 |
| B | B1 → B2 → B3 → B4 → B5 → B6 → B7 → B8 → B9 → B10, strictly in order | B1: A0. B2: all Part A and the B1 record. | steady state |

The critical path is A2 → A11 → A12 → A13 → A14 → A16 → A22 → A20 → B2. A14's real-baseline extra command alone waits for B1's record; its tests use fixtures.
