# 000h Search, AI Discovery, and Marketing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Help developers discover, evaluate, and successfully try 000h through Google, AI search, useful documentation, and relevant community distribution within a $10–$20 initial tool budget.

**Architecture:** Improve the existing static documentation and registry, then distribute useful demonstrations and learn from search and product data. Keep the catalogue as the shared source for pages, links, metadata, and optional machine-readable outputs. Start with free tools and manual exports; paid research and automated reporting are optional additions.

**Tech Stack:** Existing Next.js static export, React, TypeScript, Tailwind CSS, shadcn registry, Cloudflare delivery, GitHub, bounded PostHog events; Search Console, Bing Webmaster Tools, local Lighthouse and Linkinator. Optional Ahrefs Free and hosted OpenSEO.

## Global constraints

- Planning only in this turn. No purchases, account connections, public posts, application changes, or deployments have been performed for this revision.
- Treat $20 as the total initial incremental cash ceiling, not a recurring monthly authorization. The $10 route remains available. Taxes, card conversion fees, subscriptions, and data credits all count toward that ceiling.
- This budget covers SEO tools. Existing domain, hosting, internet, development time, and already-owned AI subscriptions are assumed available; check their current usage before adding load. No new hosting or AI API subscription is required.
- Preserve the public identity **000h by Cojeev**, its approved visual character, and canonical domain `https://000h.cojeev.com/`.
- Follow [checkpoint workflow](../../checkpoint-workflow.md). Use one scoped PR per checkpoint or named child checkpoint, with relevant checks and a separate production approval gate. Preserve the dirty working tree; verify the implementation checkout before beginning.
- Keep existing component URLs. Claims about accessibility, performance, framework compatibility, adoption, or component counts require evidence.
- Search rankings and citations are outcomes to measure, not deliverables we can guarantee. Implementation can finish before search engines recrawl or index it.
- Public marketing needs approved final copy and destinations under the repository workflow. A budget discussion does not authorize a purchase.

## Which documents govern execution

This is the overall plan and governs priority, budget, scope, and ordering. The [16 September engineering plan](2026-09-16-seo-and-ai-discovery.md) supplies the detailed SEO-01 through SEO-11 file maps and proposed checks; its mandatory paid-tool steps are superseded here. The [original research](../../research/2026-09-16-seo-and-ai-discovery-research.md) supplies competitor observations. The [pricing and evidence review](../../research/2026-09-17-seo-budget-and-evidence-review.md) records current source checks and limitations.

All checkboxes below describe future work. A proposed command, file, or success target is not an implementation result.

## Research review: what stays and what changes

| Finding | Review decision | Effect on our work |
| --- | --- | --- |
| Competitors combine clear positioning, useful component pages, demos, install instructions, and internal links | Keep; these are observed patterns, not proof that any one feature causes ranking | Improve the developer journey and page usefulness together |
| Broad phrases such as “React component library” are desirable | Keep as long-term positioning; no verified volume or difficulty dataset exists yet | Start with specific component and task searches where our implementation is distinctive |
| OpenSEO should be part of the baseline | Change | Free measurement must work without OpenSEO or paid volume estimates |
| Self-hosting means a cheap/free complete SEO stack | Reject | Data costs and minimum deposits can exceed our entire budget |
| Initial 20 pages, eight hubs, six articles, and a reporting script | Reduce first delivery | Begin with five component pages, two hubs, and two verified setup guides; expand after checking quality and data |
| Research says 124 components; prior audit says 173 public docs URLs; local guide file currently has 172 records | Unreconciled inventories, not interchangeable counts | Count public, installable catalogue entries from the production revision; avoid a numerical marketing claim until reconciled |
| Previous audit found sitemap/canonicals already present | Keep as a dated 16 September snapshot | Verify before fixing; preserve working features instead of rebuilding them |
| Synthetic ClaudeBot request received 403 | Insufficient evidence of blocked Claude search | Inspect Claude-SearchBot and Claude-User plus edge logs; do not disable general security controls |
| `llms.txt` and schema improve AI visibility | Qualify | Clean public text and retrieval access come first; optional files and truthful markup carry no citation guarantee |
| “Qualified organic installers” as the main metric | Change to measurable intent | Use organic clicks and attributable command-copy events; copies, registry downloads, and clones do not prove installs |
| Guide pages planned before their shared rendering system | Fix sequencing | Create one guide renderer before framework pages, then reuse it for editorial guides |

The prior competitor audit and video walkthrough are useful inputs. Neither provides our Search Console baseline, a measured keyword opportunity forecast, a backlink inventory, or evidence of increased rankings. Those gaps stay visible.

## Strategy and page map

Working positioning: **Expressive React components with purposeful motion and editable source, installed through the shadcn CLI.** Keep the brand's personality while explaining the product plainly.

| Search intent | First destination | Evidence needed |
| --- | --- | --- |
| React / Tailwind component library; animated React components | Homepage and existing `/docs/` index | Clear product requirements, strong examples, license and installation |
| React bento grid | Existing Bento Grid component page | Working layout demo, copied configuration, fresh install |
| React motion drawer | Existing Motion Drawer component page | Interaction demo, keyboard/focus and reduced-motion notes |
| Animated React icons | Existing Animated Icon page | Actual icon behavior, customization and dependency details |
| React button / dialog components | Existing Button and Dialog pages | Usable examples, API, states and installation |
| shadcn registry installation | Getting Started and registry guide | Current accepted namespace and full-URL fallback, verified against production |
| Next.js / Vite integration | Dedicated guides | Fresh consumer builds, versions, styles, client boundaries |
| Astro integration | Conditional later guide | Passing React-island fixture with explicit hydration and limitations |
| Reduced-motion React components / source-owned components | First-hand engineering articles | Code, test method, real examples and limitations |

The initial five pages are Bento Grid, Motion Drawer, Animated Icon, Button, and Dialog, subject to current production quality checks. A broken example is repaired before promotion. Broad “Next.js components” queries should lead to verified compatibility information, not near-duplicate component pages with framework names swapped.

Start category hubs for **Layout and Bento** and **Motion and Effects**, provided each has enough useful examples and distinct selection guidance. Keep `/docs/` as the main index. Do not create a second general `/components/` index unless the information architecture demonstrates a distinct purpose; category pages can live under `/components/{collection}/` without duplicating every component URL.

No runtime CDN product is currently established by the research. Do not market one. A registry-versus-CDN explanation is optional only if real developer questions justify it. Localization and further framework support follow English-page quality and verified compatibility.

## Budget and tool decision

**Recommendation: spend $0 on tools initially. Keep the $10–$20 available for one bounded research purchase after the pages and measurement are ready.** Money buys supplementary data, not organic placement.

| Item | Planned incremental cash | Decision |
| --- | ---: | --- |
| Google Search Console and Bing Webmaster Tools | $0 | Primary search measurement, inspection and sitemap submission |
| Existing analytics | $0 target | Verify connection and current allowance; retain bounded events, avoid a second analytics tracker |
| Local Lighthouse, Linkinator, existing tests | $0 software fees | Reuse the local machine and existing tools; check CI allowance before adding scheduled workloads |
| Ahrefs Free | $0 | Optional audit/backlink view for our verified site; not unrestricted competitor research |
| Hosted OpenSEO | $10/month including $10 usage; $0.50 trial credit | Optional one-month research sprint only if the complete payable amount fits |
| Direct DataForSEO / self-hosted OpenSEO | Outside this budget when the $50 minimum deposit applies | Defer |
| Paid AI visibility, new LLM APIs, paid backlinks, ads, paid directory listings | $0 allocated | Defer; use manual search samples and earned distribution |
| Taxes and exchange/card fees | Remaining reserve | No extra data-credit purchase is planned |

Ahrefs' [official free offering](https://ahrefs.com/webmaster-tools) currently advertises 5,000 monthly crawl credits per verified project and up to 1,000 visible backlinks/keywords at once. Its free site access does not imply unrestricted analysis of competitors. OpenSEO's [pricing page](https://openseo.so/pricing) confirms $10/month including $10 usage; included credits reset each cycle, and exhausted credits stop paid tasks. Its [homepage](https://openseo.so/) advertises a no-card trial. Its [terms](https://openseo.so/terms-and-conditions) confirm recurring billing and cancellation with access through the paid period. Checkout tax/card costs remain unverified. [DataForSEO pricing](https://dataforseo.com/pricing) confirms the $50 minimum direct payment.

### Cash scenarios

- **$10 hard total:** default to the free stack. A $10 advertised subscription may exceed the ceiling after tax/card fees, so it is not assumed affordable.
- **$20 hard total:** allocate $10 to one hosted month including its usage allowance, and retain up to $10 for tax/card fees or simply leave it unspent. If checkout exceeds $20, skip it and continue free. No top-up is planned.
- **Ongoing:** no automatic renewal is budgeted. Export useful results before access expires; another paid month requires a new decision. Nothing in core SEO depends on renewing.

### Paid research purchase gate

- [ ] List the unanswered decisions first: which five pages to improve next, which query intent is strongest, and which competing pages genuinely serve it.
- [ ] Verify checkout price, billing period, included credits, minimum top-up, relevant feature access, cancellation terms and actual all-in charge. A free trial is useful only if its limits and later charges are understood.
- [ ] Show the exact proposed vendor, charge, deliverables, and remaining budget before purchase. The workflow requires approval of paid upgrades.
- [ ] If purchased later, cancel renewal through the billing portal after purchase and retain the period-end confirmation. Leave auto top-ups disabled. Record usage after each batch and stop the first batch at $5 of included usage; do not confuse consuming included credits with another cash charge.
- [ ] Bound the sprint to one site, one market and device initially, 20 candidate queries, and three direct competitors. Use US English desktop provisionally; change it if first-party audience data supports another market. Avoid duplicating every query across US/India and desktop/mobile on day one.
- [ ] Produce a CSV with query, intent, target URL, sampled top results, data source/date, estimated volume if supplied, and one recommended action. Missing volume is “unavailable,” never zero.
- [ ] Start with keyword research and a small competitor comparison. Weekly tracking of up to 20 selected terms can use remaining included credits after checking the current estimate. Skip paid AI visibility scans, daily tracking, bulk backlink exports, and repeated full crawls.

The paid sprint succeeds if it changes or confirms actionable page priorities with evidence. A dashboard score alone is not sufficient value.

## Delivery roadmap

These are sequencing estimates, not ranking deadlines. Week 1 begins when implementation starts. Parallel product changes, account access, and production approval can move the calendar.

| Window | Checkpoints | Concrete output | Tool spend |
| --- | --- | --- | ---: |
| Week 1 | SEO-01; SEO-02a | Verified baseline, URL inventory, measured crawler/index issues, mapped first five pages | $0 |
| Week 2 | SEO-02b; SEO-03; early SEO-08 | Canonical/crawl fixes, useful metadata, truthful markup, measured loading defects fixed | $0 |
| Weeks 3–4 | SEO-06a; SEO-04a; SEO-07a then SEO-05a | Five complete component pages, two hubs, shared guide system, Next.js and Vite installation evidence | $0 |
| Weeks 4–6 | SEO-09; SEO-10a | AI retrieval checks, optional generated text index, launch kit and approved initial distribution | $0; optional research within total cap |
| Weeks 6–8 | SEO-06b; SEO-07b; conditional SEO-05b | Next five components if quality/data justify it; two first-hand articles; Astro only if verified | No required new spend |
| Days 60–90 | SEO-11; selected expansion | Compare outcomes, improve pages with demand, decide whether further pages/tools are worthwhile | No assumed renewal |

### Phase 1 — Measurement and a reliable public inventory

**Checkpoint:** SEO-01. **Files:** `docs/seo/README.md`, `docs/seo/baseline-YYYY-MM-DD.md`, `docs/seo/keyword-map.csv`, `docs/seo/measurement-contract.md`; inspect `docs/launch/analytics.md`, `lib/analytics/client.ts`, and the deployed catalogue.

- [ ] Verify the actual release checkout, deployed revision, domain/base-path configuration, public registry namespace, and public component count. The active workspace currently defaults to the old GitHub Pages origin unless build variables override it; verify the release environment before changing defaults.
- [ ] Verify Search Console ownership with either a domain property such as `000h.cojeev.com` or URL-prefix property `https://000h.cojeev.com/`; do not confuse their syntax or verification methods. Verify Bing access and submit the current validated sitemap.
- [ ] Inspect homepage, docs index, five initial component pages and Getting Started. Record submitted, discovered, crawled and indexed states separately. Mark unavailable historical data explicitly.
- [ ] Check the property's generative-AI inclusion control and report availability. Google's [report documentation](https://support.google.com/webmasters/answer/16984139) describes impressions by page/country/device/date; insufficient impressions can mean no report. Do not invent AI-only clicks, CTR, positions or prompt queries from that report.
- [ ] Export available search queries, pages, countries/devices and backlinks. Record the most recent complete 28-day window when available and a baseline for the five pages.
- [ ] Verify a deliberate live analytics visit and command copy. Audit source attribution: the current event contract records bounded campaign labels but does not prove general organic-referrer classification. Use Search Console clicks independently until attribution is tested.
- [ ] Keep anonymous event limitations visible. Do not add persistent identifiers, fingerprinting or installed-component telemetry to manufacture a conversion number. Any needed referrer classification should retain only an approved source category and receive focused privacy tests.
- [ ] Map 20 candidate queries to real pages using first-party data and manual SERP inspection. Prioritize product fit, current page quality, observed demand, and achievable distinctiveness; paid volumes are optional.

**Done when:** ownership/access status, public inventory, first five pages, metric definitions and a reproducible baseline are recorded. Account-access gaps do not block independent page audits; never mark them complete without evidence.

### Phase 2 — Crawlability, snippets and performance essentials

**Checkpoints:** SEO-02a (inventory/crawl checks), SEO-02b (redirects/submission), SEO-03 (metadata), early SEO-08 (measured performance). **Files:** existing `app/robots.ts`, `app/sitemap.ts`, `lib/site-config.ts`, `app/layout.tsx`, `app/docs/[component]/page.tsx`, `workers/registry-host/src/index.mjs`; proposed SEO helpers/tests from the engineering plan.

- [ ] Reuse current sitemap and canonical logic. Check real status codes, indexability, internal links, canonical host/base path, static HTML text and excluded routes.
- [ ] Fix demonstrated duplicate routes and origin drift at the actual response layer. Confirm whether old-origin redirects are supported before promising them; canonical hints remain the fallback.
- [ ] Give initial pages accurate, distinctive titles and descriptions. Add breadcrumbs only with matching visible navigation, plus truthful product/creator/source markup. Validate against the supported schema without manufacturing ratings.
- [ ] Treat automated observations proportionately: conflicting canonicals or missing content are defects; multiple H1s or a description length alone are review signals, not universal ranking failures.
- [ ] Measure homepage, docs index, one simple component and one heavy demo on mobile and desktop. Fix severe loading, layout-shift or interaction problems now. Keep heavy animation isolated, offscreen work paused and static/reduced-motion fallbacks usable.
- [ ] Add a small deterministic crawl check using existing dependencies before introducing a second crawler service. Enable IndexNow after canonical URLs and the successful-deployment trigger are correct.

**Done when:** priority pages are reachable, internally linked, indexable and canonical; metadata matches visible content; measured serious performance failures are resolved; required checks pass. Search-engine indexing remains separately tracked.

### Phase 3 — Five excellent pages and verified installation journeys

**Checkpoints:** SEO-06a, SEO-04a, SEO-07a (shared guide renderer), SEO-05a. **Files:** `data/component-guides.json`, `lib/catalog.ts`, existing component docs/examples; proposed collection and guide files in the engineering plan.

- [ ] Complete each initial component page with a direct summary, best use, limitations, tested install command, meaningful example, API, dependencies, supported versions, keyboard/motion notes and related pages. Require useful content rather than an arbitrary word count.
- [ ] Produce three concise demonstrations for Bento Grid, Motion Drawer and Animated Icon. Show the component immediately, one meaningful interaction, then where/how to install. Use actual working UI, readable captions, a poster and a short text explanation. Review the visual result before publishing.
- [ ] Publish the two category hubs with genuinely different selection guidance and links to the five pages and other verified examples. Keep priority pages within three crawlable links of the homepage.
- [ ] Build one guide rendering path before adding guide content. Reuse it across framework and editorial pages; do not maintain parallel hardcoded and content-driven versions.
- [ ] Record fresh Next.js and Vite consumer installation and render checks using representative simple and interactive components. Include versions, styles, aliases, hydration/client boundary and known limitations. Confirm the shadcn registry command separately.
- [ ] Add original social images to the promoted pages. Keep visual personality while making text and install actions legible.

**Done when:** a new developer can select, preview, install and understand the limitations from the page, and every advertised setup path has recorded evidence.

### Phase 4 — AI discovery and the first marketing release

**Checkpoints:** SEO-09, SEO-10a. **Files:** `docs/seo/ai-discovery-policy.md`, existing robots/docs-search outputs; `docs/launch/creator-kit.md`, `README.md`, `docs/seo/authority-log.csv`.

- [ ] Verify search/user-retrieval bots can receive normal public text, and distinguish training access. Check edge logs before changing rules; a spoofed user-agent result is only a diagnostic sample.
- [ ] Keep direct answers, requirements, source links, author and meaningful review dates visible in HTML. Add a generated `llms.txt` or clean Markdown output only when it reuses existing canonical data cheaply. Defer MCP and a bespoke search API.
- [ ] Establish ten fixed AI-search questions spanning brand, component, installation and use case. Record tool/mode, date, locale, exact question and actual cited URL. Do not prompt engines to mention us or treat one answer as a universal visibility score.
- [ ] Prepare a launch kit: one-sentence product description, canonical link, current install command, three good demos, screenshots, verified framework support, license and one feedback request.
- [ ] Reconcile GitHub homepage/topics/README and the merged shadcn listing against production. Retrieve existing creator research referenced in the launch checklist before researching the same people again; that research is not currently in this checkout's `docs/marketing/` directory.
- [ ] Select one community where sharing fits its rules and up to three relevant creators. Prepare specific messages tied to their interests and one useful demonstration; obtain exact copy/destination approval before sending.
- [ ] Publish approved material over two weeks, one strong asset at a time. Use bounded UTM labels; answer feedback and fix failed installations before increasing distribution. No cold-email blast or paid links.
- [ ] Record destination, publication URL, date, campaign, feedback and attributable actions. Keep private contact details out of public evidence.

**Done when:** retrieval checks and launch assets are ready, approved distribution has evidence links, and responses feed the product/content backlog. Draft completion and actual publication are separate statuses.

### Phase 5 — Expand useful content and run the learning loop

**Checkpoints:** SEO-06b, SEO-07b, conditional SEO-05b, SEO-11. **Files:** same content system, `docs/seo/weekly-review.md`, `docs/seo/monthly-review.md`; reporting script only after manual reports prove a need.

- [ ] Review weekly for indexing failures, broken journeys, new queries, feedback and spend. Start with a compact Markdown/CSV report; no dashboard project is required.
- [ ] Publish two first-hand articles: reduced motion in a real 000h interaction, and a Bento layout built and installed in a clean project. Include code, screenshots, tested versions, methods and limitations.
- [ ] Expand from five to ten improved pages when the initial batch has working installs and credible content. Use query impressions, internal search, feedback and product fit; a young site with little data should improve useful pages without inventing demand.
- [ ] Add Astro only after the representative React-island integration passes. Add a fair competitor comparison later if it answers an observed decision and each claim is sourced/date-stamped.
- [ ] At day 30 compare crawl/index and implementation state. At day 60 compare non-branded query clusters and page engagement. At day 90 assess search growth, links, AI citations and attributable intent against baseline.
- [ ] Continue, revise or consolidate pages based on evidence. If a page is crawled but not indexed, investigate usefulness, duplication and canonical selection before submitting it again. If indexed with impressions but low clicks, inspect the query/page match and snippet.
- [ ] Reassess tools only when free data leaves a specific unresolved decision. Export a paid sprint's findings and stop recurring charges unless a further month is approved.

**Done when:** there is a repeatable review record with a short evidence-based next-action list. Ongoing marketing is an operating activity, not a promise of a fixed search position.

## Scorecard and decision rules

| Measure | Source | How we use it |
| --- | --- | --- |
| Canonical pages submitted/crawled/indexed | Search Console, Bing, live audit | Distinguish discovery problems from content or canonical issues |
| Non-branded impressions and clicks | Search Console/Bing exports | Identify relevant demand; show absolute numbers when baseline is near zero |
| Query/page position and CTR | Same exports, country/device noted | Investigate opportunity; do not call averaged position a universal ranking |
| Successful install-command copies | Existing analytics after live verification | Measure intent, not completed installations |
| Organic/referral-attributed actions | Only tested bounded attribution | If unavailable, show separately rather than joining incompatible datasets |
| Verified fresh installations | Recorded consumer checks | Prove compatibility, not the number of real users |
| Relevant editorial links and community feedback | Authority log | Prefer useful sources and feedback over a domain-score target |
| AI citations and referral visits | Fixed prompt sample and attribution | Keep sampled answers, visits and conversions separate |
| Loading and interaction quality | Local lab checks; field data when available | Fix user-facing failures; low traffic may mean no field report |
| Actual spend and next renewal | Receipt/billing record | Stop before exceeding the total approved ceiling |

Controllable first-month targets: five complete pages, two useful hubs, two verified framework journeys, three good demos, no known critical crawl defect in the priority set, and a baseline/reporting routine. Indexing, a traffic increase, backlinks and top rankings are tracked outcomes, not guaranteed acceptance criteria.

## Validation and handoff

- Documentation-only planning: inspect changes, relative links, contradictions, budget math and placeholders. Skip application launch/tests.
- Implementation: read the installed Next.js documentation before code changes. Use the relevant tests proposed in the engineering plan only after their files exist; verify actual scripts and invocation in the release checkout.
- Reuse existing site-config, analytics and registry-host checks. Add focused tests for new route/schema/attribution behavior. Check the working app once at the end of the changed slice; do not repeat the catalogue for prose updates.
- Before combined production promotion, apply the repository release gate and fresh consumer installation requirement. Record source revision, check results, visual evidence where relevant and rollback.
- Report check-running time separately from writing, debugging, review and packaging.

When implementation is requested, begin with **SEO-01 and the read-only inventory portion of SEO-02a**. Prepare account instructions and technical work first; surface login/DNS actions only where actual access is missing. The free path is sufficient to begin immediately, and no paid tool blocks it.
