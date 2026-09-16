# Stage 1: Search Measurement and Baseline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish an evidence-backed public catalogue, search/account status, measurement contract and first 20 keyword targets for 000h without paid tools.

**Architecture:** Record live public responses and the release source separately, use available authenticated dashboards for search/product data, and publish only sanitized aggregate evidence. Search account work is performed by the controller while a Terra implementer builds the evidence pack; a Sol reviewer verifies the scoped result. Missing access stays explicitly pending rather than becoming a fabricated zero or a completed checkpoint.

**Tech Stack:** Existing Next.js static export/registry, GitHub CLI/API, public HTTP/XML/JSON, existing analytics, browser-accessible Search Console/Bing/PostHog, Markdown/CSV/JSON records.

## Global Constraints

- Scope is SEO-01 only: measurement, inventory, account verification/submission where access permits, keyword mapping and procedures. No site metadata, tracking, dependencies, redirects, runtime code, marketing, paid tool, or production deployment changes.
- Spend $0. No purchase, subscription, top-up or upgrade.
- Worktree: `/Users/sanjaykumar/Developer/cojeev-ui-release/.worktrees/seo-01-baseline`; branch `chore/seo-01-baseline`; starting main commit `a06b7be682010d73085122e968a30b4caa904bd9`.
- Preserve unrelated checkouts and changes. Prefix every shell command with `rtk`.
- Follow `docs/checkpoint-workflow.md`; this is one SEO-01 checkpoint PR. Account-dependent acceptance remains unchecked if incomplete; no auto-merge while required acceptance is unresolved.
- Do not save credentials, full account identifiers, visitor-level records or private dashboard contents into the public repository. Use minimal aggregate summaries only.
- Separate docs pages, guide records, public registry items, review-only entries and installable UI components. Each count states source, date, definition and exclusions.
- Separate HTTP availability, sitemap submission, crawling, indexing and ranking. Separate command-copy intent, registry requests, clones and verified consumer installs.
- Use Terra for implementation and Sol for review as requested. No full-suite or local-app launch for documentation-only work. The requested live analytics verification is a measurement task, not a documentation regression test.

## Task 1: Create and verify the Stage 1 evidence pack

**Create:** `docs/seo/README.md`, `docs/seo/baseline-2026-09-17.md`, `docs/seo/public-inventory-2026-09-17.json`, `docs/seo/keyword-map.csv`, `docs/seo/competitor-set.json`, `docs/seo/measurement-contract.md`, `docs/seo/account-setup.md`.

**Modify:** this plan's execution record; append a SEO-01 entry to `docs/superpowers/plans/2026-09-12-launch-master-checklist.md` without checking J01–J05 unless their evidence actually satisfies them.

**Inputs:** production origin `https://000h.cojeev.com/`, repository `luv-jeri/cojeev-ui`, current release configuration and prior reviewed planning docs. Controller supplies sanitized account/browser observations through a task-workspace file before finalizing the baseline.

**Outputs:** readable baseline, reproducible collection instructions, machine-readable public inventory, 20 explicitly provisional search targets, bounded reporting rules, account actions/status and an honest acceptance ledger.

- [ ] Inspect release source, deployment configuration and available deployment records. Record current source base and observed live artifact identity separately; do not equate latest main with deployed code unless proven.
- [ ] Fetch robots, sitemap, registry index and catalogue/search index where advertised by source/site. Build public inventory from actual entries, not hardcoded previous counts. Record source URLs/status/timestamps and reconcile all count differences with named exclusions or unresolved discrepancies.
- [ ] Check homepage, `/docs/`, `/getting-started/`, and Bento Grid, Motion Drawer, Animated Icon, Button and Dialog pages. Record HTTP status, title, canonical, sitemap inclusion and index directives using actual returned HTML. Do not perform a full crawl or claim indexing from these responses.
- [ ] Inspect shadcn directory entry/current namespace and full registry URL from the authoritative source. Record accepted namespace and an installation example as observed documentation, not a fresh installation test.
- [ ] Inspect existing analytics event contract and source. Record available campaign attribution, identifier lifetime, privacy suppression, copy success semantics, and limitations of organic attribution. Propose any missing instrumentation for later work; do not change runtime code in this stage.
- [ ] Incorporate controller account observations: Search Console property/access/verification, Bing status, submitted sitemap result if permitted, available query/index export summaries, AI-report availability, and one live page/copy event checked in analytics if access permits. Record every inaccessible metric as unavailable with a concrete unblock step.
- [ ] Create a 20-row keyword CSV with columns `query,cluster,intent,target_url,page_status,priority,evidence_type,evidence_date,volume,notes`. Use real existing destinations or explicitly planned guide/hub URLs; one primary destination per query. No fabricated volumes, rank positions or difficulty. Review a bounded sample of actual search results and link sources in notes; distinguish observations from strategic hypotheses.
- [ ] Write competitor JSON for shadcn/ui, Magic UI, Aceternity UI, React Bits, Animate UI, 21st.dev and daisyUI with canonical URLs and relevance; no estimated traffic/adoption counts.
- [ ] Define a baseline reporting window using complete days and recorded timezone; use available 28-day data or unavailable if no access/history. Distinguish normal Google search clicks/CTR from generative-AI impressions-only fields. Include feedback-driven prioritization for sparse data.
- [ ] Write actionable account setup/export instructions using current official pages and controller findings. Reuse verified properties; do not duplicate them. No secret values or broader account permission grants.
- [ ] Validate JSON/CSV parsing, exactly 20 unique queries, required fields, known priority-page URLs, source links, local document links and whitespace. Review that public files contain no private data or unsupported completion claims. Report check-running time separately.
- [ ] Self-review and commit explicit scoped paths with `Checkpoint: SEO-01` in the commit body; include the four reviewed reference documents copied by the controller and this plan. Do not push or open PR yourself; controller handles that after review.

## Controller account work

- [ ] Inspect available browser account sessions without exposing private data.
- [ ] Reuse existing Search Console/Bing properties where present; inspect ownership, sitemap and actual report data. Complete narrow verification/submission steps authorized by Stage 1 where access and existing settings allow it; preserve DNS/mail settings.
- [ ] If sign-in or ownership proof is required, ask the user for the specific action while continuing independent public work.
- [ ] Inspect the existing analytics project and verify the intended live event if access permits; exclude the deliberate test from interpretation. Never call API ingestion success proof of dashboard receipt.
- [ ] Save only sanitized observations for the implementer; provide an exact list of still-required user actions if any.

## Acceptance and delivery

- [ ] Public baseline, inventory, keyword map, competitor set and measurement contract reviewed.
- [ ] Search Console ownership, report availability and indexing baseline verified, or explicitly pending with observed blocker.
- [ ] Bing ownership/submission and report availability verified, or explicitly pending with observed blocker.
- [ ] Live analytics page/copy receipt verified, or explicitly pending with observed blocker.
- [ ] Sol review covers specification and evidence quality; controller verifies claims and final diff.
- [ ] Scoped SEO-01 PR created with evidence, limitations and rollback. Keep checkpoint acceptance open if account-dependent work is unfinished.

## Execution record

Public evidence collection is documented in [the SEO baseline](../../seo/baseline-2026-09-17.md), [inventory](../../seo/public-inventory-2026-09-17.json), [keyword map](../../seo/keyword-map.csv), [competitor set](../../seo/competitor-set.json), [measurement contract](../../seo/measurement-contract.md), and [account procedure](../../seo/account-setup.md). The source base is `a06b7be682010d73085122e968a30b4caa904bd9`; public production identifies a separate release `7908a61b2bdb519d9069066ba5028696b9cc9a5a`.

Controller observation at 2026-09-16T19:14:36Z: Google domain ownership is waiting for a manual DNS TXT record, Bing site ownership is waiting for its verification CNAME, and the signed-in identity has no accessible PostHog organisation in either EU or US. The production Button copy UI was observed to succeed, but dashboard analytics receipt was not verified. Sitemap submission, index/query/AI-report exports, Bing reports, and analytics baseline remain unavailable, not zero. Full SEO-01 completion remains open until the external account acceptance above is actually satisfied.
