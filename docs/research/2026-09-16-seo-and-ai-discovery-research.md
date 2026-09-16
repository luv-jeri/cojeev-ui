# 000h SEO and AI Discovery Research

**Research date:** 2026-09-16

**Review, 2026-09-17:** Read the [budget and evidence review](2026-09-17-seo-budget-and-evidence-review.md) and [overall execution plan](../superpowers/plans/2026-09-17-seo-growth-master-plan.md) before acting on recommendations below. This memo is a historical research snapshot: its 124-component repository description conflicts with the local 172 guide records and previous live 173 component routes. Reconcile the production catalogue before publishing a count. OpenSEO is optional under the $10–$20 initial budget; its hosted $10 month includes $10 usage, while direct DataForSEO's $50 minimum payment is outside scope. Google AI reporting must be qualified by actual property availability and supported metrics.

**Scope:** Primary-source research for a Google Search, Bing/Copilot, ChatGPT Search, Claude Search, and agent-friendly discovery plan for 000h by Cojeev.

**Product evidence used:** the repository describes 000h as an MIT-licensed library of 124 React 19, TypeScript, Tailwind CSS v4, and shadcn-registry components with organic shapes, warm surfaces, and purposeful motion.

## Executive conclusion

000h should not try to win the broad phrase “React component library” through homepage metadata alone. The credible path is to build a technically clean, deeply indexable component catalogue and become the strongest answer for a specific cluster: expressive, organic, characterful React components with purposeful motion, delivered through a shadcn-compatible source registry.

The same work supports classic search and AI search. Google explicitly says its generative search features use the normal Search index and ranking systems; it does not require a separate “AI SEO” technique. Bing says its normal crawl, index, content-quality, and authority signals also support Copilot grounding and citations. OpenAI and Anthropic expose separate search-oriented crawlers that should be allowed if 000h wants to be discovered and cited by their products.

The highest-value work is therefore:

1. Make every useful component, category, guide, and compatibility claim independently crawlable, canonical, fast, and understandable as text.
2. Give every component page a real demo, concise description, use cases, installation command, dependencies, API, accessibility and motion behavior, compatibility facts, related components, and original screenshots or video.
3. Build topic clusters around the product’s proven strengths and concrete tasks instead of generating thin keyword variants.
4. Establish measurement in Google Search Console, Bing Webmaster Tools, analytics, and a small rank/citation benchmark before scaling content.
5. Use OpenSEO as a controlled research and monitoring pilot, not as the source of truth and not as a production dependency.
6. Add an automatically generated `llms.txt` because it is cheap and common among the direct competitors, while describing it accurately: it may help agents navigate documentation, but Google states that it ignores `llms.txt` for ranking and AI-search eligibility.

No tactic can guarantee a number-one Google result. Google explicitly says indexing and serving are not guaranteed, and changes can take from hours to months to be reflected. The plan should optimize qualified discovery, installation, and retained use rather than raw impressions alone.

## What the authoritative sources say

### Google Search and Google’s generative AI features

Documented facts:

- Google’s [generative AI optimization guide](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) says AI Overviews and AI Mode are rooted in its core Search index, ranking, and quality systems. SEO remains the foundation.
- The guide prioritizes unique, first-hand, non-commodity content, a clear technical structure, crawlability, useful visual media, good page experience, and content written for people.
- Google cautions against mass-producing pages for every keyword variation. It calls this ineffective and potentially subject to the scaled-content-abuse policy.
- Google states that it does not use `llms.txt` or special AI markup for Google Search, and that adding such a file neither helps nor harms Google rankings.
- Google’s [AI features guidance](https://developers.google.com/search/docs/appearance/ai-features) says eligible pages must be indexed and allowed to show a snippet. Important information should be available in text, internal links should be crawlable, and structured data must match visible content.
- Google’s [technical requirements](https://developers.google.com/search/docs/essentials/technical) are minimal but non-negotiable: Googlebot must not be blocked, the page must return HTTP 200, and it must have indexable content.
- A sitemap helps discovery but does not guarantee indexing or improve ranking. Google recommends fully qualified canonical URLs and accurate `lastmod` values for significant changes in its [sitemap documentation](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).
- Google’s [Core Web Vitals guidance](https://developers.google.com/search/docs/appearance/core-web-vitals) recommends LCP within 2.5 seconds, INP below 200 milliseconds, and CLS below 0.1. These are user-experience signals, not substitutes for relevance or quality.
- Google primarily generates snippets from page content, sometimes using a unique meta description when it describes the page better. See [snippet guidance](https://developers.google.com/search/docs/appearance/snippet).
- Google recognizes canonical hints from redirects, sitemap inclusion, HTTPS, and `rel="canonical"`; duplicate URLs weaken reporting and crawl efficiency. See [canonicalization guidance](https://developers.google.com/search/docs/crawling-indexing/canonicalization).
- Google supports structured data only when it represents visible page content. `BreadcrumbList` is a sound fit for the docs hierarchy. `SoftwareApplication` rich-result eligibility requires an offer plus a genuine rating or review, so 000h should not add fabricated rating data. See [general structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies), [breadcrumb markup](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb), and [software-app markup](https://developers.google.com/search/docs/appearance/structured-data/software-app).
- As of 2026-08-31, Google says the [Generative AI performance report](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports) is available worldwide in Search Console. It reports impressions, pages, countries, devices, and dates for generative Search and Discover features.

Implication for 000h:

The Google strategy should be an excellent public documentation site with real experience and proof. A content farm, hidden keyword copy, invented ratings, or AI-specific schema would add risk without creating a durable advantage.

### Bing Search, Copilot, and IndexNow

Documented facts:

- Bing’s current [Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a) state that classic SEO fundamentals also support Bing, Copilot grounding, and citations.
- Bing recommends crawlable internal links, XML sitemaps containing only canonical URLs, accurate freshness signals, correct redirects, efficient rendering, and IndexNow notifications for added, updated, and deleted URLs.
- Bing explicitly says timely IndexNow notifications reduce stale references in Copilot responses and grounding results.
- The [IndexNow setup guide](https://www.bing.com/indexnow/getstarted) requires a domain key, a publicly hosted key file, and URL submissions through the API. Submission notifies participating engines but does not guarantee crawl or index inclusion.

Implication for 000h:

IndexNow is a good fit after the canonical URL and sitemap model is stable. Submissions should be event-driven from successful production deployments and should include only genuinely added, updated, or removed canonical URLs.

### ChatGPT Search and OpenAI agents

Documented facts:

- OpenAI’s [publisher and developer guidance](https://help.openai.com/en/articles/12627856) says public pages can appear in ChatGPT Search when `OAI-SearchBot` can access them.
- OpenAI distinguishes `OAI-SearchBot`, which supports search discovery and citations, from `GPTBot`, which is used for potential model training. A publisher can allow search while separately deciding whether to allow training.
- OpenAI says ChatGPT referral URLs include `utm_source=chatgpt.com`, which can be measured in analytics.
- The same guidance says accessible structure and accurate ARIA roles, labels, and states help ChatGPT agents interpret interactive pages.

Implication for 000h:

The crawler policy should make an explicit, documented product decision for search retrieval and training instead of treating all AI crawlers as one category. Search visibility requires more than a permissive `robots.txt`; Cloudflare bot controls and other edge rules must also allow the verified crawler.

### Claude Search and Anthropic agents

Documented facts:

- Anthropic’s [crawler guidance](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler) distinguishes three agents:
  - `Claude-SearchBot` indexes public content to improve search results.
  - `Claude-User` retrieves pages at a user’s direction.
  - `ClaudeBot` collects public content that may contribute to model training.
- Anthropic says blocking `Claude-SearchBot` may reduce visibility and accuracy in Claude search results, while blocking `ClaudeBot` communicates a training opt-out.
- Anthropic says all three honor `robots.txt` and publishes crawler verification information.

Implication for 000h:

Allowing search and user-directed retrieval while making a separate training decision is technically possible. The implementation should document that choice and verify live edge behavior with the actual user agents.

## Direct competitor patterns

This is a current pattern audit of public competitor surfaces, not a claim about their private SEO strategy or their exact rankings. Search results vary by country, device, history, and time.

| Site | Observable search and discovery patterns | Useful lesson for 000h |
|---|---|---|
| [shadcn/ui](https://ui.shadcn.com/) | Homepage title states a clear category position; canonical URL and JSON-LD are present; `robots.txt` links to an XML sitemap; [`llms.txt`](https://ui.shadcn.com/llms.txt) provides a curated docs map. A [component page](https://ui.shadcn.com/docs/components/base/button) includes a one-sentence definition, live examples, install command, usage, variants, accessibility-relevant notes, API reference, previous/next links, and related docs. | Treat each component as a complete answer and a hub in a dense internal-link graph. |
| [Magic UI](https://magicui.design/) | XML sitemap carries page-level `lastmod`; [`llms.txt`](https://magicui.design/llms.txt) lists components with descriptions. The [Animated Beam page](https://magicui.design/docs/components/animated-beam) uses a query-shaped title, categorized navigation, preview/code tabs, code examples, a shadcn-style install path, and “Open in v0.” It also exposes MCP documentation. | Use category-specific titles and let both people and coding agents move from preview to source installation quickly. |
| [Aceternity UI](https://ui.aceternity.com/) | Homepage title and description explicitly say React, Tailwind CSS, component library, copy-paste, blocks, and templates. It exposes canonical metadata, multiple JSON-LD blocks, a large component sitemap, [`llms.txt`](https://ui.aceternity.com/llms.txt), a fuller text corpus, and a machine-readable component API. The [3D Card page](https://ui.aceternity.com/components/3d-card-effect) has a descriptive title, tags, preview/code, CLI installation, examples, and props. | Combine keyword clarity with component-specific proof, tags, and machine-readable catalogue data. |
| [React Bits](https://reactbits.dev/) | Homepage title targets “Animated UI Components For React”; description says open source, animated, interactive, and customizable. It publishes an XML sitemap, [`llms.txt`](https://reactbits.dev/llms.txt), a showcase, categories, and four implementation variants across JavaScript/TypeScript and CSS/Tailwind. | Own a sharp visual and technical subcategory rather than relying on “component library” alone. |
| [21st.dev](https://21st.dev/) | Homepage title and description name React, Tailwind CSS, components, templates, shadcn themes, one-command installation, and AI agents. It publishes structured data, a very large sitemap, [`llms.txt`](https://21st.dev/llms.txt), category pages, popularity signals, and searchable component inventory. Its [community page](https://21st.dev/community/components) exposes text headings and many category links to crawlers. | Searchable inventory, category landing pages, and visible popularity can turn a catalogue into many discovery surfaces. Do not imitate its scale with thin pages. |
| [Flowbite](https://flowbite.com/) | Mature framework and component documentation, examples, versioned integrations, and a broad educational footprint support many query intents. Its root crawl endpoints currently redirect, so implementation quality should be verified rather than assumed. | Framework guides and long-lived education can widen reach, but only for integrations actually supported and tested. |
| [daisyUI](https://daisyui.com/) | Homepage title directly targets “Tailwind CSS Component Library”; canonical and sitemap are present. It supports many languages, versioned docs, blog and trend content, MCP and skills. A [component page](https://daisyui.com/components/button/) exposes human docs, “Open in ChatGPT,” “Open in Claude,” Markdown docs, source code, class tables, and many examples. Its [`llms.txt`](https://daisyui.com/llms.txt) is formatted as an agent skill. | Give agents clean Markdown and source entry points, and consider localization only after the English information architecture is stable. |

### Common pattern across the strongest sites

The durable common denominator is not a single meta tag. It is a large set of useful, independently addressable pages linked from a clear hierarchy. Strong component pages usually include:

- A unique, descriptive title and plain-language summary.
- A live or recorded visual result near the top.
- Copyable source and a one-command install path.
- Usage examples and API/prop documentation.
- Framework, dependency, version, accessibility, and motion details.
- Category, tag, previous/next, and related-component links.
- A canonical URL and inclusion in a clean XML sitemap.
- A social image that shows the actual component rather than a generic logo.
- A machine-readable entry point such as registry JSON, Markdown docs, `llms.txt`, or an MCP/search surface.

## Keyword and page opportunity for 000h

This is a strategic hypothesis to validate with Search Console and paid SERP-volume data. It is not a measured ranking report yet.

### 1. Brand and entity cluster

- `000h`
- `000h UI`
- `000h component library`
- `000h by Cojeev`
- `Cojeev UI components`

Every public surface should use one canonical name, one short factual description, the same public URL, the same GitHub repository, and consistent creator/organization attribution. This reduces ambiguity for search engines and answer systems.

### 2. Primary category cluster

- `React component library`
- `Tailwind CSS component library`
- `Next.js component library`
- `shadcn component registry`
- `React 19 components`
- `Tailwind CSS v4 components`
- `open source React components`
- `copy paste React components`

These phrases belong in useful page titles, headings, copy, installation docs, and category introductions only when they describe the page. The homepage should not carry the entire cluster by itself.

### 3. Defensible differentiation cluster

- `animated React components`
- `organic UI components`
- `expressive React components`
- `characterful UI component library`
- `motion UI components React`
- `accessible animated React components`
- `reduced motion React components`
- `creative Tailwind components`
- `brutalist React components` only if the visible design and product language truthfully support that term

This is where 000h has original experience to contribute. Pages should explain the motion system, quiet/reduced-motion behavior, organic shape system, visual character, and performance boundaries with first-hand examples and measurements.

### 4. Component-level intent

Every component should target its natural intent instead of a forced keyword template. Examples:

- `<component name> React component`
- `<component name> Tailwind component`
- `<component name> shadcn registry`
- `accessible <component name> React`
- `animated <component name> React`
- `<specific task> React component`, where the component demonstrably solves the task

The page must be substantial enough to deserve indexing. If several variants share the same purpose and copy, consolidate them under one canonical page rather than creating near-duplicates.

### 5. Integration and task cluster

High-value guides should be based on clean, recorded installation evidence:

- Install 000h in a Next.js project.
- Install 000h in a Vite React project.
- Use the `@cojeev` shadcn registry namespace.
- Theme 000h with Tailwind CSS v4.
- Use animated components with reduced motion.
- Use heavy visual components without shipping Three.js to every page.
- Review and customize source-installed shadcn components.

Astro should not be marketed as supported until a fresh Astro + React integration has been installed and verified. If the test passes, publish a dedicated guide with the exact adapter, rendering boundary, client directive, supported component set, and limitations.

### 6. Terms to avoid or qualify

- **CDN:** 000h currently presents itself as a shadcn-compatible source registry. A registry URL may be delivered through edge infrastructure, but that does not make the product a general “React component CDN.” Target `component registry`, `shadcn registry`, and `one-command install`. Use CDN language only for a documented delivery feature.
- **Works with any React project:** qualify this with the actual requirements: React 19, Tailwind CSS v4, TypeScript/source installation expectations, aliases, and client/browser constraints.
- **Accessible:** make component-level statements backed by keyboard, name/role/state, contrast, reduced-motion, and screen-reader checks. Avoid a blanket guarantee.
- **Fast or lightweight:** publish bundle and runtime measurements for representative components before using these claims.

## AI discovery strategy without “AI SEO” theatre

### Foundation shared with classic SEO

- Crawlable, server-rendered or statically generated text for every important page.
- Concise answers to “what it is,” “when to use it,” “how to install it,” and “what its constraints are.”
- Original screenshots, short videos, code examples, measured results, and change dates.
- Consistent product/entity names, source repository, license, version, and author/organization information.
- Stable canonical URLs and deep internal links between components, categories, guides, and source.
- Public changelog and version-specific compatibility statements.
- Third-party references earned through useful integrations, honest comparisons, tutorials, showcases, and maintainer/community participation.

### Agent-oriented additions

- Allow `OAI-SearchBot`, `Claude-SearchBot`, and user-directed retrieval crawlers if discovery in those products is desired; make separate training-crawler decisions.
- Generate `llms.txt` from the same canonical metadata and content index as the sitemap so it cannot drift.
- Provide stable Markdown representations or clean text exports for component docs where practical.
- Keep registry JSON publicly reachable and describe its schema and install command in text.
- Expose accessibility names and states correctly so browser agents can understand the demos.
- Consider an MCP or documented search endpoint only after the static catalogue and registry metadata are complete. The MCP should expose canonical source data rather than separate, hand-maintained descriptions.

### What `llms.txt` can and cannot do

The [Answer.AI `llms.txt` project](https://github.com/AnswerDotAI/llms-txt) describes an evolving proposal for a curated, Markdown map that agents can fetch on demand. Several direct competitors now publish one, so generating it from canonical data is a reasonable low-cost experiment.

It is not a standard ranking control. Google’s current guidance says Google Search ignores it. OpenAI and Anthropic document crawler access through `robots.txt`; neither source says that `llms.txt` is required for search inclusion. Success should therefore be measured through actual citations, referral traffic, and agent retrieval tests rather than file presence.

## OpenSEO assessment

### Repository facts

- Repository: [every-app/open-seo](https://github.com/every-app/open-seo)
- Positioning: open-source alternative to Semrush and Ahrefs; workflows include keyword research, rank tracking, competitor insights, backlinks, site audits, and AI visibility.
- License: MIT.
- Snapshot on 2026-09-16: about 18.8k GitHub stars, 2.4k forks, active commits, and release `v0.1.8` published 2026-09-12.
- Agent support: an MCP server and prebuilt agent skills.
- Data dependency: self-hosted OpenSEO still requires a paid [DataForSEO](https://github.com/every-app/open-seo/blob/main/docs/DATAFORSEO_API_KEY.md) account. The repository says new accounts include a small test credit and the minimum top-up is $50.
- Docker security: the project’s [Docker guide](https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_DOCKER.md) says local Docker runs in `local_noauth` mode and must not be exposed publicly without an authenticated reverse proxy, tunnel, or private network.
- Hosted business model: the README describes a free trial and a $10/month hosted subscription, with hosted DataForSEO usage marked up over direct self-hosting cost.

### Fit for 000h

**Recommended: controlled pilot.** OpenSEO is a good candidate for keyword expansion, competitor SERP sampling, backlink-gap research, rank tracking, site-audit corroboration, and a recurring AI-visibility benchmark. It should not be installed into the public site or treated as the authority for technical correctness.

Pilot boundaries:

1. Start with the hosted/free path or a local-only Docker instance. Do not expose unauthenticated Docker to the internet.
2. Set a small DataForSEO cost ceiling and log the cost per workflow.
3. Connect Google Search Console only when the property and OAuth permissions have been reviewed; use read-only access for research.
4. Compare OpenSEO findings against Search Console, Bing Webmaster Tools, live crawls, and first-party analytics.
5. Keep the MCP read-only during the research phase. Implementation changes should still go through the normal repository review and release process.
6. Evaluate the pilot after four weeks on usefulness, data accuracy, cost, and time saved.

### What the referenced video actually demonstrates

The user-provided video, [“I Found The Ultimate Open Source SEO Tool”](https://www.youtube.com/watch?v=dQ_gnts0JCE), is a nine-minute walkthrough published by AI Automation Station. The transcript shows:

- Account setup, project/country selection, and Google Search Console connection.
- Keyword research with volume, CPC, competition, long-tail results, and SERP competitors.
- Competitor and own-domain backlink counts, referring domains, spam score, broken pages, and trends.
- Site audits over a chosen page limit, highlighting slow responses, titles, and meta descriptions.
- MCP connection to a coding agent and generation of an audit report.
- A paid AI-visibility/brand lookup for citations in ChatGPT and Google AI features.

The actionable lesson is to use the product for a repeatable measurement and diagnosis loop. The video is a product demonstration, not independent evidence that OpenSEO improves rankings or that backlinks alone determine Google or AI visibility. Its statements about competitor pricing and ranking causes should be independently verified before becoming planning assumptions.

## Open-source and official tool decision table

Repository activity and star counts below are a 2026-09-16 snapshot and will change.

| Tool | Status | Why | Guardrail |
|---|---|---|---|
| [GoogleChrome/lighthouse-ci](https://github.com/GoogleChrome/lighthouse-ci) — Apache-2.0, ~7.1k stars, current release `v0.15.1` | **Adopt** | Runs repeatable Lighthouse checks and can fail regressions in SEO, accessibility, performance, and best practices on representative routes. | Use a small route set and realistic budgets. Lighthouse lab scores do not replace Search Console field data. |
| [JustinBeckwith/linkinator](https://github.com/JustinBeckwith/linkinator) — MIT, ~1.3k stars, active release `v8.1.0` | **Adopt** | Recursively checks broken links, redirects, HTTPS, CSS links, Markdown, and fragments; fits docs and CI. | Treat transient external failures separately so flaky third-party sites do not block every PR. |
| [every-app/open-seo](https://github.com/every-app/open-seo) — MIT, ~18.8k stars, active release `v0.1.8` | **Pilot** | Consolidates keyword, competitor, backlink, rank, audit, GSC, AI-visibility, MCP, and skill workflows. | Requires DataForSEO for much of the data; local Docker is unauthenticated by default; cap cost and start read-only. |
| [harlan-zw/unlighthouse](https://github.com/harlan-zw/unlighthouse) — MIT, ~4.8k stars, active release `v0.18.0` | **Pilot, likely adopt for scheduled audits** | Runs Lighthouse across an entire site with sampling and a useful UI, good for a large component catalogue. | Do not run every route on every PR. Start with a scheduled or release audit and compare overlap with Lighthouse CI. |
| [janreges/siteone-crawler](https://github.com/janreges/siteone-crawler) — MIT, ~900 stars, release `v2.5.1` | **Defer** | Broad crawler for SEO, security, accessibility, and performance. | It overlaps with Linkinator, Unlighthouse, and existing tests. Add only if its crawl reports expose gaps the smaller stack misses. |
| [StJudeWasHere/seonaut](https://github.com/StJudeWasHere/seonaut) — MIT, ~780 stars | **Skip initially** | Self-hosted open-source SEO audit UI. | Additional service and overlap are not justified before the simpler audit stack is operational. |
| [Google Search Console](https://search.google.com/search-console/about) | **Adopt; official, not open source** | Canonical source for Google indexing, queries, clicks, pages, Core Web Vitals, structured-data issues, and Google generative-AI visibility. | Verification and access are account actions. Export and annotate data rather than relying on screenshots. |
| [Bing Webmaster Tools](https://www.bing.com/webmasters/about) and [IndexNow](https://www.bing.com/indexnow/getstarted) | **Adopt; official, not open source** | Bing/Copilot crawl, index, query, sitemap, and fast-update signals. | IndexNow is a freshness notification, not a ranking or indexing guarantee. |
| [Rich Results Test](https://search.google.com/test/rich-results) and [PageSpeed Insights](https://pagespeed.web.dev/) | **Adopt; official, not open source** | Validates supported structured data and combines lab and available field performance data. | Only add markup supported by the visible page; do not chase a score without user impact. |

## Measurement model

### Establish the baseline before changing pages

Record:

- Indexed and excluded canonical URLs in Google and Bing.
- Search clicks, impressions, CTR, average position, countries, devices, queries, and landing pages.
- Google generative-AI impressions and visible pages.
- ChatGPT referrals through `utm_source=chatgpt.com`; Claude, Perplexity, Copilot, and other referrals where identifiable.
- Organic landing-page visits, meaningful demo interactions, copy actions, install-command copies, outbound GitHub visits, registry requests, and verified successful installations as separate funnel events.
- Branded versus non-branded search.
- Referring domains and links to the homepage, component pages, and guides.
- Field LCP, INP, and CLS by route type; lab regression checks for routes without field volume.
- A fixed prompt set for AI citation checks, including product, category, comparison, component, and task queries.

### North-star and supporting measures

Use **qualified organic installers** as the long-term outcome: sessions arriving from organic or answer engines that proceed to an install action and, where technically measurable without invasive tracking, a successful component retrieval.

Supporting measures:

- Non-branded impressions and clicks for priority clusters.
- Number and share of component pages indexed.
- Click-through rate by page/query after sufficient impressions.
- Search referrals that reach a relevant component page rather than bouncing at the homepage.
- ChatGPT and other answer-engine referrals and citations.
- New high-quality referring domains to specific useful assets.
- Copy-to-install and install-to-repeat-use conversion.
- Core Web Vitals pass rate and technical error counts.

Do not collapse visits, page views, copy events, registry requests, and successful installations into one “usage” number.

### Review rhythm

- Weekly: crawl/index errors, deployment changes, broken links, top new queries, and anomalous drops.
- Monthly: query-cluster movement, page winners/losers, content decay, link acquisition, AI citations, and conversion quality.
- Quarterly: competitor architecture, keyword opportunity, framework support, tool cost, and whether the content plan is attracting the intended users.

## Recommended research-to-implementation order

1. **Baseline and ownership:** verify production domain, Google Search Console, Bing Webmaster Tools, analytics definitions, and current index state.
2. **Technical crawl model:** canonical origin, redirects, robots, sitemap, status codes, index/noindex policy, internal links, rendered text, and edge-bot access.
3. **Page templates:** metadata, headings, breadcrumb markup, social images, component text, examples, related links, and source/registry identity.
4. **Priority component pages:** fully upgrade a small group representing base UI, motion, text, background, chart, and 3D categories; measure before scaling.
5. **Category and guide clusters:** publish useful category introductions and verified Next.js/Vite/shadcn integration guides.
6. **Performance and accessibility:** keep the catalogue crawlable without letting visual demos harm page experience; publish factual behavior and limits.
7. **AI/agent surfaces:** explicit crawler policy, generated `llms.txt`, Markdown/source entry points, registry schema docs, and agent retrieval tests.
8. **Authority:** earn links through the shadcn directory, GitHub, integration guides, original benchmarks, showcases, release notes, and creator/community education.
9. **OpenSEO pilot:** add keyword, rank, competitor, backlink, and AI-citation monitoring after first-party measurement is trusted.
10. **Expansion:** scale only page formats that are indexed, attract qualified traffic, and produce meaningful install behavior.

## Risks and anti-patterns

- Generating hundreds of near-identical keyword pages would conflict with Google’s people-first and scaled-content guidance.
- Adding framework names without installation proof can win impressions temporarily while damaging trust and conversion.
- Animated and WebGL demos can weaken LCP/INP/CLS if loaded before interaction or when offscreen.
- A hand-maintained sitemap, `llms.txt`, registry catalogue, and docs index will drift. Generate all of them from one canonical component manifest.
- Self-referential review/rating structured data is not a shortcut to rich results.
- Broad, reciprocal, paid, or irrelevant backlink outreach can create spam signals. Links should follow real utility, community participation, and editorial relevance.
- “AI visibility scores” from third parties are samples, not a universal measure of what all users see.
- A one-time audit does not create SEO. The operating loop is publish, crawl, index, measure, learn, and improve.

## Source index

### Search and answer engines

- [Google: Optimizing your website for generative AI features](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide)
- [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features)
- [Google: SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Google: Technical requirements](https://developers.google.com/search/docs/essentials/technical)
- [Google: Build and submit a sitemap](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap)
- [Google: Core Web Vitals and Search](https://developers.google.com/search/docs/appearance/core-web-vitals)
- [Google: General structured-data guidelines](https://developers.google.com/search/docs/appearance/structured-data/sd-policies)
- [Google: Generative AI performance reports](https://developers.google.com/search/blog/2026/06/gen-ai-performance-reports)
- [Bing Webmaster Guidelines](https://www.bing.com/webmasters/help/webmaster-guidelines-30fba23a)
- [Bing IndexNow setup](https://www.bing.com/indexnow/getstarted)
- [OpenAI publisher and developer guidance](https://help.openai.com/en/articles/12627856)
- [Anthropic crawler guidance](https://support.claude.com/en/articles/8896518-does-anthropic-crawl-data-from-the-web-and-how-can-site-owners-block-the-crawler)

### Tools and proposal

- [OpenSEO repository](https://github.com/every-app/open-seo)
- [OpenSEO Docker self-hosting guide](https://github.com/every-app/open-seo/blob/main/docs/SELF_HOSTING_DOCKER.md)
- [OpenSEO DataForSEO setup](https://github.com/every-app/open-seo/blob/main/docs/DATAFORSEO_API_KEY.md)
- [User-provided OpenSEO video](https://www.youtube.com/watch?v=dQ_gnts0JCE)
- [Answer.AI `llms.txt` proposal](https://github.com/AnswerDotAI/llms-txt)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [Unlighthouse](https://github.com/harlan-zw/unlighthouse)
- [Linkinator](https://github.com/JustinBeckwith/linkinator)
- [SiteOne Crawler](https://github.com/janreges/siteone-crawler)
- [SEOnaut](https://github.com/StJudeWasHere/seonaut)

## Research boundary

This memo defines the evidence base and recommended direction. It does not include a live Search Console export, country-specific keyword volumes, current rank tracking, backlink inventory, or production implementation. Those require property access or paid SERP data and belong in the baseline checkpoint before any ranking claim is made.
