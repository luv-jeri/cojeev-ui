# Measurement contract

## Reporting window and authority

The first comparison window is **19 August through 15 September 2026 inclusive, UTC**: the 28 complete UTC days preceding collection before the partly elapsed 16 September UTC day. Reports must retain both their provider timezone and this comparison timezone. If a provider supplies a different reporting timezone or delays the final day, exclude its incomplete day and record the replacement window; never pad missing data with zero.

Google Search Console is the source for Google Search clicks, impressions, CTR, average position, canonical-page reporting, and index/crawl status. Its performance report supports query, page, country, and device breakdowns. PostHog/browser analytics is the source for on-site behaviour. These systems have different attribution and URL models, so their counts need not match: [Google's comparison guidance](https://developers.google.com/search/docs/monitor-debug/google-analytics-search-console) explains why. Bing Webmaster Tools is the source for Bing/Copilot discovery and Bing performance. Public HTTP evidence establishes only a response at collection time.

## Metric definitions and limits

| Measure | Source and segmentation | It can show | It cannot show |
| --- | --- | --- |
| Google clicks, impressions, CTR, average position | Search Console Performance; page/query/country/device; branded and non-branded query classes | Google Search exposure and visits in the selected window | Total site traffic, conversion, or a ranking guarantee |
| Google page indexing and sitemap state | Search Console Page indexing, URL Inspection, Sitemaps | Google's reported index/canonical and sitemap processing state | A causal reason for every rank change |
| Google generative-AI report | Search Console only when the verified property exposes it; page/country/device/date impressions | Available generative-search exposure | Dedicated AI clicks, CTR, ranking position, prompt/query terms, or citations |
| Bing clicks/impressions and index state | Bing Webmaster Tools performance, URL Inspection, Sitemaps | Bing exposure and discovery processing | Google coverage or Copilot citation frequency |
| Organic landing sessions | Browser analytics, referrer/channel where available; route and approved UTM fields | On-site arrivals attributed by that implementation | Search Console clicks or a verified person |
| Page/demo/copy events | Browser analytics, route/component and event type | Intent and interaction on enabled, unsuppressed browsers | A successful install, retained use, or unique person |
| Registry requests | Registry-host Analytics Engine only if deployed and read | File delivery attempts by item/outcome | Unique installers, CLI completion, or downstream use |
| Verified consumer install | Scoped clean-consumer test receipt | The exact component set, toolchain and build in that test | Whole catalogue compatibility or real-user installs |

The client currently carries only four bounded UTM parameters and a per-page-load anonymous ID. DNT, GPC, and opt-out suppress capture. Consequently organic attribution is incomplete, visitors are not durable identities, and browser event totals must not be joined to account data or presented as people.

## Collection and review routine

1. Export only aggregate tables for the defined complete-day window. Redact account IDs, visitor data, raw referrers, and query rows that are sensitive or too sparse to share.
2. Record source, property scope, timezone, date range, filters, export time, and whether a zero is observed or a metric is unavailable.
3. Keep normal Google Search and generative-AI rows separate. Google's generative report documentation limits the baseline to supported impression dimensions; if the report is absent, record unavailable and its observed reason.
4. Review sparse data with feedback: prioritise pages with installation/copy feedback, recurring support questions, verified gaps in component coverage, and queries that show enough impressions to diagnose a mismatch. Do not chase a single low-volume position.
5. Weekly, inspect new crawl/index errors and material deployment changes. Monthly, compare like-for-like complete-day windows by cluster, page and country/device. A deployment or tracking change starts a new annotation rather than rewriting a historical baseline.

## Required baseline exports when accounts are verified

- Google: Performance (web) by query/page/country/device; Page indexing summary; Sitemaps status; URL Inspection for homepage plus the sampled docs pages; Core Web Vitals if available; generative-AI report availability and its supported dimensions.
- Bing: Search performance by page/keyword, Sitemaps status, URL Inspection/sample site explorer findings, and any available backlink/referring-domain summary as a separate metric.
- Analytics: one deliberate production page-view and one copy result, then dashboard receipt, with the deliberate test excluded from interpretation.

No Search Console, Bing, analytics, or third-party value is recorded as zero merely because this checkpoint cannot access it.
