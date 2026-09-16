# 000h SEO and AI Discovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 000h discoverable for qualified searches about animated React, Tailwind CSS, Next.js, and shadcn registry components, and make its first-hand documentation easy for AI search systems to retrieve and cite.

**Architecture:** Treat search discovery as three connected systems: crawlable technical foundations, an intent-led content graph built from the component catalogue, and authority plus measurement outside the site. The catalogue remains the source of truth for component pages, metadata, category hubs, sitemaps, structured data, machine-readable indexes, and related links. Search Console and Bing Webmaster Tools remain the indexing sources of truth; OpenSEO is a research and monitoring client, not a ranking engine.

**Tech Stack:** Next.js 16 static export, TypeScript, React 19, Tailwind CSS 4, shadcn registry JSON, Cloudflare custom-domain delivery, GitHub Pages publishing, PostHog explicit events, Google Search Console, Bing Webmaster Tools and IndexNow, OpenSEO with DataForSEO, Lighthouse CI, Unlighthouse, and Linkinator.

**17 September review:** Follow the [overall plan and $10–$20 budget](2026-09-17-seo-growth-master-plan.md) for execution priority and scope. This document is the engineering reference. Paid OpenSEO is optional, direct paid DataForSEO is deferred, the first content batch is five pages and two hubs, and a shared guide renderer precedes framework pages. Historical counts below require a production refresh. See the [pricing/evidence review](../../research/2026-09-17-seo-budget-and-evidence-review.md).

## Global Constraints

- No tool, markup, keyword, backlink, or AI file can guarantee a top ranking. The plan targets qualified discovery, index coverage, citations, and install intent while recording rank separately from implementation.
- Keep the public product name **000h by Cojeev** and the canonical origin `https://000h.cojeev.com/`. Preserve existing `/docs/{component}/` URLs.
- Follow `docs/checkpoint-workflow.md`: implement each `SEO-*` checkpoint on its own branch and PR, add checklist IDs and evidence, and run only checks relevant to that checkpoint.
- Do not publish scaled AI-generated pages. Each indexable page needs unique, visible, useful content based on an implemented component, a verified integration, or first-hand testing.
- Do not call 000h framework-agnostic, CDN-delivered, Astro-compatible, production-ready, fast, or accessible unless the exact claim is supported by current tests and visible evidence.
- Treat Astro as a React-island integration that must pass a clean Astro consumer test before its guide is indexed. Treat the registry's edge delivery as file transport, not a runtime component CDN.
- Keep `/feedback-admin/` and `/workspace/` out of indexes and analytics. Keep public request, privacy, and maker pages truthful, but do not turn utility or private surfaces into keyword pages.
- Structured data must describe visible content. Do not fabricate ratings, reviews, adoption counts, pricing, organizations, authors, dates, or compatibility.
- Separate impressions, visits, component views, interactions, command copies, registry requests, repository clones, and verified clean installations. None is a substitute for another.
- Separate search crawlers from model-training crawlers. Discovery access does not require granting training access.
- Save private API credentials only in the approved secret store. Never commit Search Console, Bing, DataForSEO, OpenSEO, or PostHog credentials. The IndexNow verification key file is intentionally public by protocol, but the account and deployment credentials that publish it remain private.

---

## Current Baseline — 16 September 2026

- `https://000h.cojeev.com/` returns a crawlable server-rendered HTML document with a canonical URL, description, social metadata, and a real 404 response for missing pages.
- `/robots.txt` allows public crawling and points at `/sitemap.xml`. The sitemap contains 179 canonical URLs: six public utility/top-level pages and 173 component pages.
- The site has page-level canonicals, but component titles are generic (`Button · 000h by Cojeev`) and there is no JSON-LD on the sampled homepage or Button page.
- `/llms.txt` returns 404. This is not a Google ranking defect: Google's current generative-search guide says Google ignores `llms.txt`. A generated copy may still be useful to non-Google tools, but it is a low-priority convenience rather than an SEO gate.
- A synthetic user-agent check returned 200 for Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User and a normal browser, while a synthetic `ClaudeBot` request returned 403. `ClaudeBot` is the training crawler; `Claude-SearchBot` and `Claude-User` still need separate checks. Inspect Cloudflare rules and real logs because a user-agent-only request does not prove how a verified crawler is treated.
- Search queries for `site:000h.cojeev.com` and the exact brand returned no results in the research provider. Confirm the real coverage state in Google Search Console and Bing Webmaster Tools before diagnosing content or authority.
- `work-with-me` renders the About page and canonicals to `/about/`, while the reference guide has minimal metadata and is absent from the sitemap. These routes need an explicit redirect/indexing decision.
- The repository homepage still points to the old GitHub Pages URL and has no GitHub topics. The accepted shadcn directory listing is the first strong external discovery signal, but it does not establish Google index coverage.
- The component data already supports a strong information architecture: 172 documented entries across Forms, Layout, Typography, Effects, Data Display, Navigation, Actions, Composition, Backgrounds, Charts, 3D, Feedback, Conversation, Tools, Motion, and Creative groupings.

## Search Positioning

000h should lead with a narrow, defensible promise:

> **Expressive, source-owned React components with purposeful motion, installed through the shadcn CLI.**

The primary competitive set is shadcn/ui for the registry model; Magic UI, Aceternity UI, React Bits, Animate UI and similar libraries for animated React components; 21st.dev and registry aggregators for discovery; and broad Tailwind libraries such as daisyUI and Flowbite for generic category searches.

Competitor patterns worth adopting:

- Clear homepage category language: React, Tailwind CSS, animation/motion, copy/paste or CLI installation, open source.
- One stable page per component plus indexable category hubs.
- Search-friendly integration pages for real frameworks.
- Visible live examples, source ownership, installation steps, screenshots/video, and social proof or verifiable usage evidence.
- Large, accurate sitemaps and strong internal linking.
- Educational pages and comparison pages that answer a concrete developer decision.

000h's defensible difference is its usable product components, organic visual character, adjustable motion, reduced-motion behavior, editable source, and component studios. The SEO work should expose that evidence rather than copy competitor wording.

## Initial Keyword and Page Map

Validate intent with Search Console where available and manual SERP inspection before publishing new routes. Paid volume/difficulty data is optional; unavailable values must not block useful pages or be recorded as zero. This initial map prevents broad keyword stuffing and gives the research a bounded starting set.

| Intent cluster | Initial queries | Primary destination |
| --- | --- | --- |
| Library discovery | animated React component library; open source React component library; Tailwind React components; copy-paste React components | Homepage and Components index |
| shadcn ecosystem | shadcn animated components; shadcn registry components; shadcn component library; custom shadcn registry | Homepage, Getting Started, shadcn registry guide |
| Framework setup | Next.js components; React 19 components; Tailwind CSS 4 components; Vite React components; Astro React components | Verified framework guides |
| Motion and text | animated text React; React motion components; accessible React animations; reduced motion React | Motion/Text category hubs and component guides |
| Visual effects | React background effects; animated backgrounds React; React cursor effects; 3D React components | Effects, Backgrounds and 3D hubs |
| Product UI | React bento grid; React motion drawer; React command menu; React data table; React charts; animated React button | Exact component pages and focused collections |
| Source ownership | copy-paste UI components; own your component source; shadcn vs npm component library | Getting Started and first-hand engineering guides |
| Brand/entity | 000h components; 000h by Cojeev; Cojeev UI components | Homepage, About, GitHub, directory listings |

Do not target `CDN component library` as a product claim. If keyword research shows meaningful intent, publish a factual guide explaining registry JSON delivery and why the shadcn CLI copies source into the project instead of loading components from a runtime CDN.

---

## SEO-01 — Establish Measurement, Ownership, and a Keyword Baseline

**Files:** create `docs/seo/README.md`, `docs/seo/baseline-2026-09-16.md`, `docs/seo/keyword-map.csv`, `docs/seo/competitor-set.json`, and `docs/seo/measurement-contract.md`; update `docs/superpowers/plans/2026-09-12-launch-master-checklist.md` only when evidence closes J01–J05.

- [ ] Verify the `https://000h.cojeev.com/` domain property in Google Search Console. Record owner, property type, verification method, and date without recording credentials or full account identifiers.
- [ ] Verify the production property in Bing Webmaster Tools. Importing from Google is acceptable only if the current Bing flow and permissions are reviewed.
- [ ] Record Search Console index coverage, submitted/discovered URL counts, crawl errors, selected canonicals, queries, pages, countries, devices and Core Web Vitals for the first available 28-day window. An empty baseline is a valid finding for a new site.
- [ ] Complete the free baseline first. Optionally evaluate OpenSEO's no-card trial and later one hosted month under the overall plan's checkout and renewal rules; this is not required to complete SEO-01.
- [ ] Defer self-hosted paid DataForSEO under the current $10–$20 budget because its minimum payment is $50. No infrastructure setup is required for the hosted pilot.
- [ ] Research 20 terms from the map above in one market/device initially. Save intent, current top results and available data; broaden only when evidence and remaining included credits justify it.
- [ ] Assign exactly one primary URL to each approved target query. Add secondary queries only when they share the same intent; flag cannibalization when two 000h URLs answer the same need.
- [ ] Lock the competitor set to shadcn/ui, Magic UI, Aceternity UI, React Bits, Animate UI, 21st.dev, daisyUI and up to three data-supported additions.
- [ ] Capture starting rank, indexed URL count, referring domains, branded/non-branded impressions, organic visits and install-command-copy conversions. Mark unavailable metrics as unavailable instead of zero.

**Validation:** review the five new documents and CSV for complete mappings, no credentials, no unmapped priority term, and no ranking promise. Compare the Search Console sitemap count with the live 179-URL sitemap.

**Acceptance:** every approved keyword cluster has one intended page, the real index state is known, and the reporting contract states what each metric does and does not prove.

---

## SEO-02 — Build a Deterministic Crawl and Indexing Gate

**Files:** create `lib/seo/routes.ts`, `scripts/check-seo.mjs`, `scripts/submit-indexnow.mjs`, `tests/seo-routes.test.ts`, `tests/indexnow.test.ts`, `docs/seo/crawler-policy.md`, and the public IndexNow verification key route/file; modify `app/robots.ts`, `app/sitemap.ts`, `app/work-with-me/page.tsx`, `app/docs/reference-guide/page.tsx`, `scripts/check-launch-readiness.mjs`, `package.json`, `.github/workflows/verify.yml`, and the custom-domain Worker/redirect configuration that owns production responses.

- [ ] Define a typed public-route inventory containing canonical path, indexability, page kind, last meaningful modification date and sitemap priority grouping. Generate sitemap entries from this inventory plus the public catalogue.
- [ ] Add truthful `lastModified` values based on release/content data. Do not stamp every page with the build time when its content did not change.
- [ ] Keep only 200-status canonical pages in the sitemap. Assert that no `noindex`, redirected, review-only, private, missing, registry JSON, query or fragment URL is present.
- [ ] Convert `/work-with-me/` into a permanent redirect to `/about/` at the layer that can return a real HTTP redirect. Keep `/about/` as the sole canonical maker page.
- [ ] Decide whether the reference guide is public product documentation. If yes, give it a canonical, description, public navigation path and sitemap entry; otherwise add `noindex,follow` and remove incidental internal promotion.
- [ ] Retain `noindex,nofollow` for `/feedback-admin/` and `/workspace/`; add an assertion that both are absent from sitemap and analytics.
- [ ] Extend `check-seo.mjs` to crawl the built export and production origin for status, content type, title, description, canonical, one visible H1, crawlable internal links, image alt text, robots directives, duplicate title/description, redirects, orphan pages, soft 404s and sitemap/HTML agreement.
- [ ] Test crawler access at production for a normal browser, Googlebot, Bingbot, OAI-SearchBot, ChatGPT-User, Claude-SearchBot and Claude-User. Inspect Cloudflare bot/firewall logs before changing rules. Record the training-crawler policy separately for GPTBot and ClaudeBot.
- [ ] Confirm the custom domain and the old GitHub Pages origin consolidate to one canonical host. Prefer a host-level permanent redirect where the current deployment architecture permits it.
- [ ] Add `seo:check` to `package.json` and run it on the exported site in CI after build. Keep external-link failures advisory unless the destination is owned; bot-protected third-party sites can fail automated probes.
- [ ] After the canonical inventory is stable, generate and publish the IndexNow verification key file. Submit only canonical URLs added, materially updated, redirected or deleted by a successful production deployment; do not resubmit the full catalogue on every build.
- [ ] Record IndexNow response codes and verify received URLs in Bing Webmaster Tools. Keep submission, crawl, indexing and ranking as separate states.

**Focused tests:**

```sh
rtk proxy node --import tsx --test tests/seo-routes.test.ts tests/site-config.test.ts
rtk proxy node --import tsx --test tests/indexnow.test.ts
rtk npm run build
rtk proxy node scripts/check-seo.mjs --url=out --canonical-url=https://000h.cojeev.com/
```

**Acceptance:** each public URL has one index decision, sitemap and canonicals agree, aliases redirect or declare the right canonical, private routes stay excluded, and CI catches crawl regressions before deployment.

---

## SEO-03 — Upgrade Metadata, Entity Signals, and Structured Data

**Files:** create `lib/seo/metadata.ts`, `lib/seo/structured-data.ts`, `components/seo/json-ld.tsx`, `tests/seo-metadata.test.ts`, and `tests/structured-data.test.ts`; modify `lib/site-config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/docs/page.tsx`, `app/docs/[component]/page.tsx`, `app/getting-started/page.tsx`, `app/about/page.tsx`, and public utility pages.

- [ ] Replace the generic helper with typed metadata builders for homepage, component, category, guide and utility pages. Keep canonical and social metadata in the same contract.
- [ ] Use intent-aware component titles. Base controls should read like `React Button Component · 000h`; genuinely animated entries may use `Animated React Text Reveal Component · 000h`. Do not add “animated,” “Next.js,” “accessible,” or “Tailwind” to every title.
- [ ] Write a unique description for each page that says what the component does, how source is installed, and its clearest differentiator within normal snippet length. Keep the visible opening copy aligned with it.
- [ ] Generate component-specific Open Graph images for the top 20 search pages first, with a stable fallback for the rest. Give each image accurate alt text.
- [ ] Add visible site/entity details and matching JSON-LD for `WebSite`, `SoftwareSourceCode`, and `Person`. Use the canonical site, repository, MIT license, author, programming language and actual runtime requirements.
- [ ] Add `BreadcrumbList` to component, category and guide pages that display the same breadcrumb trail.
- [ ] Do not add `AggregateRating` or `Review`. Google requires real rating/review data for its SoftwareApplication rich result; fabricated values are prohibited.
- [ ] Validate JSON-LD against Schema.org and test Google-supported types with Rich Results Test. Record that valid structured data enables understanding/eligibility but does not guarantee a rich result.
- [ ] Add metadata assertions for uniqueness, canonical origin, title templates, description presence, JSON-LD validity and agreement with visible content.

**Focused tests:**

```sh
rtk proxy node --import tsx --test tests/seo-metadata.test.ts tests/structured-data.test.ts tests/site-config.test.ts
rtk npm run build
rtk proxy node scripts/check-seo.mjs --url=out --canonical-url=https://000h.cojeev.com/
```

**Acceptance:** sampled search snippets clearly identify the page and product, structured data is truthful and valid, and no two indexable priority pages compete with identical titles or descriptions.

---

## SEO-04 — Add Search-Friendly Category Hubs and Internal Linking

**Files:** create `data/seo-collections.json`, `lib/seo/collections.ts`, `app/components/page.tsx`, `app/components/[collection]/page.tsx`, `components/seo/component-collection.tsx`, and `tests/seo-collections.test.ts`; modify `app/docs/page.tsx`, `app/docs/[component]/page.tsx`, `components/docs-shell.tsx`, `components/landing/landing-page.tsx`, and `app/sitemap.ts`.

- [ ] Consolidate the catalogue's 18 internal labels into eight search-facing collections with enough inventory and distinct intent: UI primitives, Forms, Navigation, Data and Charts, Layout and Bento, Animated Text and Motion, Backgrounds and Visual Effects, and 3D and Creative Tools.
- [ ] Give `/components/` a clear library overview and one indexable page per approved collection. Keep individual implementation docs at `/docs/{component}/`; do not move or duplicate them.
- [ ] Give each collection a unique introduction, selection guidance, named live examples, framework requirements, reduced-motion/performance notes, and links to all matching component pages.
- [ ] Add crawlable breadcrumbs and contextual related-component links to each component page. Related items must be based on category, shared dependencies or documented use together, not random rotation.
- [ ] Add descriptive anchors such as `React motion drawer component` only where the destination matches. Avoid repetitive exact-match anchors across every page.
- [ ] Link the homepage to the four strongest collections and link Getting Started to framework/registry guides. Ensure each priority component is reachable within three crawlable links from the homepage.
- [ ] Add the new canonical hubs to the sitemap and generated docs search index.
- [ ] Test that collection membership covers every public component exactly once as a primary collection, while allowing a small explicit list of secondary collections.

**Focused tests:**

```sh
rtk proxy node --import tsx --test tests/seo-collections.test.ts tests/docs-navigation.test.ts tests/docs-search.test.ts
rtk npm run build
rtk proxy node scripts/check-seo.mjs --url=out --canonical-url=https://000h.cojeev.com/
```

**Acceptance:** users and crawlers can move from a broad need to a focused collection and then to a usable component without relying on client-side search.

---

## SEO-05 — Prove Framework Compatibility Before Creating Framework Pages

**Files:** create `scripts/verify-framework-consumers.mjs`, `tests/framework-guides.test.ts`, `data/framework-support.json`, `app/guides/page.tsx`, `app/guides/shadcn-registry/page.tsx`, `app/guides/nextjs/page.tsx`, `app/guides/vite-react/page.tsx`, and, only after a passing fixture, `app/guides/astro-react/page.tsx`; update `INSTALLATION.md`, `app/getting-started/page.tsx`, `app/sitemap.ts`, and `package.json`.

- [ ] Build disposable clean fixtures for current Next.js App Router, Vite React and Astro with `@astrojs/react`, TypeScript and Tailwind CSS 4. Pin the tested versions in the evidence.
- [ ] Install a base control, a composed form, a motion component and one heavy visual component through the production shadcn registry in each supported fixture.
- [ ] Build and render each fixture. Verify aliases, client boundaries, CSS, fonts, dependencies, keyboard use, reduced motion and static/server rendering behavior.
- [ ] Mark support levels as `verified`, `works with documented constraints`, or `unsupported`. Generate guide badges and claims from `data/framework-support.json`.
- [ ] Publish the Next.js and Vite guides only after their fixtures pass. Publish the Astro guide only if React islands work with an explicit hydration directive and the documented global-style setup.
- [ ] Add a first-hand shadcn registry guide covering full-URL installation, the accepted directory namespace, editable source, dependency behavior and version requirements.
- [ ] If keyword research supports CDN intent, add a guide titled around the actual question: explain registry delivery versus a runtime CDN and show the supported installation path. Do not market 000h as a runtime CDN library.
- [ ] Re-run the relevant fixture when React, Next.js, Astro, Tailwind, shadcn, Motion or registry foundations change. Do not claim all-framework support from a single React build.

**Focused tests:**

```sh
rtk proxy node scripts/verify-framework-consumers.mjs --framework=nextjs,vite,astro --components=button,dialog,motion-drawer,shape-scene
rtk proxy node --import tsx --test tests/framework-guides.test.ts
rtk npm run build
```

**Acceptance:** every indexed framework page is backed by a fresh, recorded consumer installation and says exactly where client-side hydration or framework-specific setup is required.

---

## SEO-06 — Enrich Priority Component Pages Without Producing Thin Pages

**Files:** extend `data/component-guides.json` and the catalogue build types in `lib/catalog.ts`; create `data/seo-components.json` and `tests/component-seo-content.test.ts`; modify `app/docs/[component]/page.tsx`, `components/component-preview.tsx`, `components/component-handoff.tsx`, and component-specific examples only when the evidence is missing.

- [ ] Use Search Console impressions, internal search, component impressions, feedback and install-command copies to select the first five pages under the overall plan. Optional OpenSEO data can refine the next batch; it is not a dependency.
- [ ] Add structured fields for primary intent, one-sentence answer, best uses, unsuitable uses, accessibility behavior, motion/performance behavior, dependencies, verified frameworks, related components and last reviewed release.
- [ ] Render a useful answer near the top of each page before the interactive workbench: what it is, what makes this implementation different, and how to install it.
- [ ] Keep the existing live preview, editable code, API table and install command. Add specific accessibility and reduced-motion notes that are supported by the component implementation and tests.
- [ ] Add dependency and bundle-impact notes for Three.js or other heavy dependencies. Do not label a component lightweight without a measured comparison and method.
- [ ] Add a stable screenshot and, for interaction-heavy pages, a short captioned demo video with poster, transcript and direct page URL.
- [ ] Require minimum content completeness for priority pages while allowing concise base primitives. Reject duplicate boilerplate and descriptions that merely repeat the title.
- [ ] Expand from five to ten pages based on quality, feedback and available search evidence, then consider larger batches. Do not auto-publish the catalogue from generated prose.

**Focused tests:**

```sh
rtk proxy node --import tsx --test tests/component-seo-content.test.ts tests/component-api.test.ts tests/docs-preview.test.ts
rtk npm run check:examples
rtk npm run build
```

**Acceptance:** each priority component page answers a developer's selection and installation questions with implementation-specific evidence, and its snippet accurately distinguishes it from other component pages.

---

## SEO-07 — Publish First-Hand Guides That Can Earn Links and Citations

**Files:** create `content/guides/`, `lib/guides.ts`, `app/guides/[slug]/page.tsx`, `components/guides/guide-layout.tsx`, `tests/guides.test.ts`, and `docs/seo/editorial-standard.md`; update `app/guides/page.tsx` and `app/sitemap.ts`.

- [ ] Define an editorial template with author, reviewed date, tested versions, methodology, limitations, runnable examples, original images/video, source links, and related components.
- [ ] Publish the verified shadcn registry and framework guides from SEO-05 through this system.
- [ ] Prepare six first-hand guides: accessible motion and `prefers-reduced-motion`; choosing source-owned shadcn components versus an npm runtime; building an organic React motion preset; a measured component-performance case study; designing/installing a bento layout; and the verified Astro React-island integration if it passes.
- [ ] Add a transparent comparison guide for 000h, Magic UI, Aceternity UI and React Bits only after recording a dated methodology: license, install model, framework requirements, motion engine, reduced-motion behavior, live examples and source ownership. Link to competitors and state where they are a better fit.
- [ ] Add release/changelog pages that connect component changes to the exact version and date. Keep obsolete claims corrected rather than silently generating a new near-duplicate article.
- [ ] Use AI for outlining, transcript cleanup, schema validation and content QA. A human must verify facts, examples, measurements, screenshots, conclusions and final copy before publication.
- [ ] Reject generic listicles, paraphrased competitor articles, fake expert quotes, hidden prompt text and mass pages for synonym variants.

**Focused tests:**

```sh
rtk proxy node --import tsx --test tests/guides.test.ts
rtk npm run build
rtk proxy node scripts/check-seo.mjs --url=out --canonical-url=https://000h.cojeev.com/
```

**Acceptance:** every guide contains information that comes from 000h's implementation or testing and gives another developer a reason to link to or cite the page.

---

## SEO-08 — Protect Core Web Vitals and Media Discoverability

**Files:** create `lighthouserc.cjs`, `unlighthouse.config.ts`, `docs/seo/performance-baseline.md`, and `tests/media-seo.test.ts`; modify `.github/workflows/verify.yml`, `next.config.ts`, `components/landing/landing-page.tsx`, heavy preview loaders, and media metadata as findings require.

- [ ] Establish mobile and desktop Lighthouse baselines for the homepage, Components index, Button, Motion Drawer, Shape Scene, Getting Started and one guide. Run three times and record medians.
- [ ] Add Lighthouse CI to representative templates, starting with warning-level assertions. Promote stable regression checks after two clean baselines; do not fail the release on arbitrary scores before measuring variance.
- [ ] Use Core Web Vitals targets as outcome thresholds when field data exists: LCP at or below 2.5 seconds, INP at or below 200 milliseconds and CLS at or below 0.1 at the 75th percentile.
- [ ] Add Unlighthouse as a weekly/manual full-site sample report rather than running Lighthouse on all 179+ pages in every PR.
- [ ] Set bundle and media budgets from the recorded baseline, then block regressions greater than 10% on representative templates unless the PR documents an accepted tradeoff.
- [ ] Defer heavy Three.js and continuously animated effects until near the viewport; use stable dimensions and static fallbacks; pause hidden work; preserve reduced-motion behavior.
- [ ] Give meaningful screenshots and videos descriptive filenames, visible captions, alt text, width/height, posters and transcripts. Add image/video sitemap extensions only if real indexable media warrants them.
- [ ] Use Linkinator for internal links and owned assets. Treat rate-limited or bot-protected external links as reviewed warnings, not automatic evidence that 000h is broken.

**Focused tests:**

```sh
rtk npm run build
rtk proxy npx @lhci/cli autorun
rtk proxy npx unlighthouse --site https://000h.cojeev.com --samples 1
rtk proxy npx linkinator out --recurse --clean-urls --check-fragments --require-https error
rtk proxy node --import tsx --test tests/media-seo.test.ts
```

**Acceptance:** priority templates meet the documented lab budgets without losing the library's character, and Search Console field data is monitored separately from Lighthouse lab scores.

---

## SEO-09 — Make AI Retrieval and Citation Deliberate

**Files:** create `docs/seo/ai-discovery-policy.md`, `app/llms.txt/route.ts`, `app/llms-full.txt/route.ts`, `tests/ai-discovery.test.ts`, and `scripts/check-crawlers.mjs` only after the crawler policy is approved; modify `app/robots.ts`, `app/docs-search.json/route.ts`, and catalogue/guide outputs.

- [ ] Explicitly allow OAI-SearchBot, ChatGPT-User, Claude-SearchBot and Claude-User on public pages and confirm production returns normal content. Decide GPTBot and ClaudeBot training access independently; record the decisions and rationale.
- [ ] Review Cloudflare managed-bot/firewall behavior, Anthropic's crawler verification guidance and real request logs before changing rules. Allowing a search crawler is an eligibility signal, not a guaranteed citation.
- [ ] Keep semantic HTML, visible definitions, clear headings, stable canonicals, descriptive links, author/methodology and updated dates consistent across pages. These are the main AI-retrieval improvements as well as normal SEO.
- [ ] Extend `/docs-search.json` with canonical URL, category, short description, verified framework support, release and public source/install URLs. Keep all fields public and derived from the catalogue.
- [ ] Optionally generate `/llms.txt` and `/llms-full.txt` from the same catalogue and guide index. Label them as machine navigation aids; do not claim that Google uses them or that they improve ranking.
- [ ] Ensure `llms` files never expose review-only components, private routes, report IDs, unpublished drafts or credentials. Add build-time agreement tests with sitemap and canonical inventory.
- [ ] Create a fixed monthly prompt panel for ChatGPT search, Bing Copilot, Google AI features and other approved engines. Record date, locale, exact prompt, cited sources and whether 000h appears. Treat results as volatile observations, not universal rank.
- [ ] Use Search Console's Generative AI performance report where available and track ChatGPT referrals through its documented `utm_source=chatgpt.com`. Keep AI citations, referral visits and conversions separate.

**Focused tests:**

```sh
rtk proxy node --import tsx --test tests/ai-discovery.test.ts
rtk proxy node scripts/check-crawlers.mjs --url=https://000h.cojeev.com/
rtk npm run build
```

**Acceptance:** public evidence is consistently available to search/answer crawlers, training access is an explicit policy choice, and optional AI files stay synchronized without being presented as a ranking hack.

---

## SEO-10 — Earn Relevant Authority and Consolidate the Brand Entity

**Files:** update `README.md`, repository About fields/topics, `docs/launch/creator-kit.md`, and `docs/seo/authority-log.csv`; create `docs/seo/directory-profile.md`. External submissions and posts require their own reviewed payloads and destination approval.

- [ ] Update the GitHub repository homepage to `https://000h.cojeev.com/` and add accurate topics such as `react`, `typescript`, `tailwindcss`, `shadcn-ui`, `component-library`, `ui-components`, `animation`, and `open-source`.
- [ ] Make the README's live links, component count, install command, tested versions, screenshots, license and custom domain match production.
- [ ] Verify the merged shadcn directory profile points to the canonical site and live registry. Capture its campaign/referral behavior without labeling directory views as installs.
- [ ] Prepare consistent public profiles for a small set of relevant directories: 21st.dev, shadcn registry aggregators, React/Tailwind resource lists, OpenAlternative and GitHub topic collections where eligibility is real.
- [ ] Build linkable assets from 000h's actual strengths: the Shape and Bento studios, reduced-motion implementation notes, compatibility fixtures, component demos and measured engineering guides.
- [ ] Pitch creators and maintainers only when one specific component or guide matches their published work. Use personalized demo URLs and one useful ask; stop after one unanswered follow-up.
- [ ] Seek corrections or inclusion in relevant comparison articles through evidence, not paid or reciprocal link schemes. Never buy undisclosed links, mass-comment, automate forum promotion or create fake mentions.
- [ ] Log referring page, destination, context, contact route, status, approval, date and resulting qualified traffic. Review link quality and referral conversions, not domain-rating changes alone.

**Validation:** check every public profile and link against production; review the authority log for evidence, opt-outs and no private contact data.

**Acceptance:** the same product name, canonical site, repository and description appear consistently across authoritative profiles, and earned links point to the most relevant component or guide rather than every link pointing at the homepage.

---

## SEO-11 — Operate a Search Growth Loop

**Files:** create `docs/seo/weekly-review.md`, `docs/seo/monthly-review.md`, and `scripts/seo-report.mjs`; extend the private analytics dashboard/query documentation without publishing credentials or visitor-level data.

- [ ] Create one weekly report with Google/Bing impressions, clicks, CTR, average position by query cluster, indexed canonical pages, crawl errors, Core Web Vitals, organic landing pages, component interactions, successful command copies and registry reliability.
- [ ] Use first-party query reports by default. Optional weekly OpenSEO tracking must remain within an approved single-month allowance, with one stable location/device and no assumed renewal.
- [ ] Add a monthly backlink/referring-domain report and AI prompt-panel observation. Keep estimated traffic, tool difficulty, AI citation and actual analytics clearly labeled.
- [ ] Join anonymous organic sessions to on-site behavior only within the existing privacy contract. Report `organic landing → component view → interaction → successful command copy`; do not infer a completed CLI install.
- [ ] Review Search Console queries with impressions and low CTR for snippet/page-intent issues; review pages in positions 5–20 for content/internal-link opportunities; repair indexing and install failures before publishing more pages.
- [ ] Re-run keyword research quarterly or when the product scope changes. Retire, redirect or merge pages that remain thin or cannibalize a stronger page.
- [ ] Run a 30/60/90-day review. At day 30, validate index coverage and snippets; at day 60, expand proven component clusters; at day 90, judge qualified organic growth, citations, referring domains and install intent against the baseline.

**Validation:** generate the report from a fixture dataset, then compare one production period manually. Confirm zero-value/unavailable fields are not conflated and no private identifiers are exported.

**Acceptance:** content and technical work are selected from measured gaps, while ranking volatility and third-party indexing remain visible external outcomes rather than release claims.

---

## Tool Decision

| Tool | Decision | Role | Boundary |
| --- | --- | --- | --- |
| Google Search Console | Adopt | Indexing truth, queries, pages, CWV, generative-AI report | Free service, not open source; requires verified ownership |
| Bing Webmaster Tools + IndexNow | Adopt | Bing/Copilot discovery, inspection and update notification | Submission accelerates discovery but never guarantees indexing |
| OpenSEO | Pilot | Keyword research, SERPs, competitor/backlink analysis, rank tracking, AI visibility, MCP workflows | MIT application; underlying DataForSEO data is paid; hosted plan and brand lookup may cost extra |
| Lighthouse CI | Adopt | Per-PR performance/SEO/accessibility regression on representative templates | Lab data is variable and does not replace field CWV |
| Unlighthouse | Adopt for weekly/manual audits | Sample Lighthouse across the full site with a browsable report | Too expensive/noisy for all pages on every PR |
| Linkinator | Adopt narrowly | Internal link, asset, HTTPS and fragment checks | External sites may block bots or rate-limit CI |
| SiteOne Crawler | Keep as release-audit fallback | Independent whole-site SEO/security/accessibility report | Overlaps with the custom crawl gate, Unlighthouse and Linkinator; avoid adding it to routine CI initially |
| SEOnaut | Skip initially | Self-hosted open-source audit dashboard | Adds another service with heavy overlap before the smaller toolchain proves a gap |
| `llms.txt` | Optional generated output | Navigation aid for tools that choose to consume it | Google explicitly says it is ignored for Google ranking and AI features |
| PostHog | Keep | Qualified on-site actions and bounded campaign attribution | Command copies are intent signals, not verified installs |

## Recommended Execution Order

1. **Weeks 1–2:** SEO-01, SEO-02 and SEO-03. Establish real index data, fix route/crawl ambiguity, improve snippets and add truthful entity markup.
2. **Weeks 3–4:** SEO-04 and SEO-05. Build collection hubs and verified framework/registry guides.
3. **Weeks 5–8:** SEO-06, SEO-07 and SEO-08. Enrich the first 20 component pages, publish first-hand guides and protect performance.
4. **Weeks 6–10:** SEO-09 and SEO-10. Make crawler policy explicit, add optional machine navigation and earn relevant external citations.
5. **Ongoing:** SEO-11. Expand only the clusters that earn impressions, useful visits, interactions, copies, feedback or links.

## Success Measures

The plan succeeds when these outcomes improve from the recorded baseline without harming install reliability or page experience:

- Canonical public pages indexed in Google and Bing, with no private/review-only leakage.
- Growth in non-branded impressions and clicks for approved React/Tailwind/shadcn and component-specific clusters.
- More priority queries entering positions 20, 10 and 3; position bands are reported, never promised.
- Organic visitors reaching a relevant component page and completing a live interaction or successful install-command copy.
- Relevant referring domains and citations from directories, maintainers, creators, developer articles and community discussions.
- Accurate citations/referrals from Google AI features, Bing Copilot, ChatGPT search and other measured answer engines.
- Stable or improved Core Web Vitals and no search-driven regression in accessibility, reduced motion, registry availability or clean installation.

## Primary Sources

- [Google Search Essentials](https://developers.google.com/search/docs/essentials)
- [Google: optimizing for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google: ask Google to recrawl URLs](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
- [Google SoftwareApplication structured data](https://developers.google.com/search/docs/appearance/structured-data/software-app)
- [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/bing-webmaster-guidelines-30fba23a)
- [Bing IndexNow setup](https://www.bing.com/indexnow/getstarted)
- [OpenAI publisher and crawler FAQ](https://help.openai.com/en/articles/12627856)
- [Anthropic crawler guidance](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)
- [OpenSEO repository](https://github.com/every-app/open-seo)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Unlighthouse](https://github.com/harlan-zw/unlighthouse)
- [Linkinator](https://github.com/JustinBeckwith/linkinator)
- [SiteOne Crawler](https://github.com/janreges/siteone-crawler)
