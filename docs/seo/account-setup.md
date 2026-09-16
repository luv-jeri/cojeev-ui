# Search and analytics account procedure

This is a narrow, repeatable procedure for the existing production origin. Do not create a duplicate property, grant broad access, paste a token into this repository, or change mail/DNS records other than the verification record shown by the selected service.

## Current sanitized state

- Google Search Console: authenticated dashboard ownership for `sc-domain:000h.cojeev.com` is verified after the controller added exactly the presented TXT record; owner identity is private. The sitemap was submitted once and its list/detail views say Success/processed successfully, last read 9/17/26, 179 discovered pages, 0 videos. Performance/Page indexing are still processing. Homepage and `/docs/button/` URL Inspection say unknown/not indexed and no referring sitemap before refresh; after each live test completed, one indexing request was accepted into the priority crawl queue. `/docs/bento-grid/` is also unknown/not indexed with last crawl/canonicals N/A; it was inspected but not individually requested. No all-route request campaign was run. Mobile and desktop Core Web Vitals each report insufficient usage data for the last 90 days; this is unavailable field data, not a performance result.
- Bing Webmaster Tools: `https://000h.cojeev.com/` is verified after the controller added exactly Bing's DNS-only CNAME. The sitemap was submitted once. Bing shows one submitted row (UI last-submit 9/16/2026), Processing, with last crawl and URLs discovered unset; its displayed total discovered 0 is provisional.
- Bing AI Performance Beta: the default 16 June–15 September 2026 view shows 0 citations/0 average cited pages and no query rows while the new property is processing. It is not a historical-zero baseline. Chart download was available, but query download was disabled with no rows; no raw chart was exported.
- Analytics: source configuration names the EU PostHog host. The signed-in identity reached Create a new organization in both EU and US; no replacement was created. A deliberate production Button copy displayed `Copied to clipboard.` and the sanitized network capture found no PostHog request, which does not diagnose configuration/privacy suppression or prove disabled capture.

## Google Search Console

1. Reuse the verified domain property; do not add a duplicate. Google documents ownership verification and the available reports in its [Search Console getting-started guide](https://developers.google.com/search/docs/monitor-debug/search-console-start).
2. Keep the single submitted sitemap detail as the receipt: processed successfully, last read 9/17/26, 179 discovered pages, 0 videos. This establishes processing, not URL indexing.
3. Compare the completed homepage, `/docs/button/`, and `/docs/bento-grid/` inspections with sitemap status after processing refreshes. The sitemap remains the discovery route for the other public pages; do not run an all-route request campaign. Keep every result separate from actual indexed coverage.
4. Export the aggregate baseline specified in [the measurement contract](measurement-contract.md) only when data is ready. Check normal Performance, Page indexing, URL Inspection, Core Web Vitals, and the generative-AI report; record each absent report as unavailable with its reason. Current mobile and desktop Core Web Vitals are unavailable because neither has enough 90-day field usage data.

## Bing Webmaster Tools

1. Reuse the verified `https://000h.cojeev.com/` site. Bing documents current [site verification](https://www2.bing.com/webmasters/help/add-and-verify-site-12184f8b) and [sitemap processing](https://www2.bing.com/webmasters/help/sitemaps-3b5cf6ed).
2. Retain the single submitted sitemap row: source Submitted, status Processing, UI last-submit 9/16/2026, no last crawl and no discovered URLs yet. Do not resubmit it to force processing.
3. Wait for Bing processing: Search Performance explicitly asks to check back in 48 hours while site data is prepared. Then record last crawl, discovered count, sample URL inspection/site-explorer findings, and conventional search performance. The current AI Performance Beta zero display is provisional, not an observed historical absence.

## Analytics receipt

1. Obtain the existing EU PostHog project URL/access; do not create a replacement organisation merely to satisfy this checkpoint. The currently signed-in identity has no accessible organisation in either region.
2. On production, make one deliberate normal page view and one copy action. Check the corresponding event names and route in the dashboard. Exclude this deliberate test from baseline interpretation.
3. Record only aggregate receipt status, date, event names and environment/release filter availability. An HTTP ingestion response alone is not a dashboard-receipt proof.

If report processing, inspection, or sign-in is blocked, write the exact missing user action in the baseline ledger and leave the relevant acceptance open. Never put a DNS token, PostHog token, raw account identifier, visitor record, or screenshot with private content in this repository.
