# Search and analytics account procedure

This is a narrow, repeatable procedure for the existing production origin. Do not create a duplicate property, grant broad access, paste a token into this repository, or change mail/DNS records other than the verification record shown by the selected service.

## Current sanitized state

- Google Search Console: `sc-domain:000h.cojeev.com` was initiated. DNS TXT verification is pending; no existing 000h/Cojeev property was observed in the controller's property list.
- Bing Webmaster Tools: `https://000h.cojeev.com/` was added and is Not verified. Bing's CNAME method was prepared but not published.
- Sitemap: the public `https://000h.cojeev.com/sitemap.xml` returns 200 with 179 URLs. No account submission or processing result is recorded.
- Analytics: source configuration names the EU PostHog host. The signed-in identity reached Create a new organization in both EU and US; no replacement was created. A deliberate production Button copy displayed `Copied to clipboard.` and the sanitized network capture found no PostHog request, which does not diagnose configuration/privacy suppression or prove disabled capture.

## Google Search Console

1. In the existing account, continue only the domain property already initiated. Google documents ownership verification and the available reports in its [Search Console getting-started guide](https://developers.google.com/search/docs/monitor-debug/search-console-start).
2. Sign in to the DNS provider and add exactly the Google-provided TXT record for `000h.cojeev.com`. Preserve all existing records. Return to Search Console and refresh verification.
3. After ownership is shown, submit `https://000h.cojeev.com/sitemap.xml` once in Sitemaps. Record submitted date, processing status, discovered URLs, and any errors. Submission is a discovery signal, not index confirmation.
4. Export the aggregate baseline specified in [the measurement contract](measurement-contract.md). Check availability of normal Performance, Page indexing, URL Inspection, Core Web Vitals, and the generative-AI report; record each absent report as unavailable with its reason.

## Bing Webmaster Tools

1. Keep the existing `https://000h.cojeev.com/` site. Bing documents current [site verification](https://www2.bing.com/webmasters/help/add-and-verify-site-12184f8b) and [sitemap processing](https://www2.bing.com/webmasters/help/sitemaps-3b5cf6ed).
2. Publish only the CNAME record displayed in Bing for this property, then press Verify. Do not substitute a broader DNS change.
3. Once verified, inspect whether the existing sitemap was imported or discovered. Submit it only if needed; record source (imported, discovered, or submitted), date, processing status, and discovered count separately.
4. Export aggregate Bing performance, URL Inspection/site-explorer findings for the sample routes, and sitemap state. Bing says data can take time after verification, so unavailable is a valid result.

## Analytics receipt

1. Obtain the existing EU PostHog project URL/access; do not create a replacement organisation merely to satisfy this checkpoint. The currently signed-in identity has no accessible organisation in either region.
2. On production, make one deliberate normal page view and one copy action. Check the corresponding event names and route in the dashboard. Exclude this deliberate test from baseline interpretation.
3. Record only aggregate receipt status, date, event names and environment/release filter availability. An HTTP ingestion response alone is not a dashboard-receipt proof.

If ownership or sign-in is blocked, write the exact missing user action in the baseline ledger and leave J02–J05 open. Never put a DNS token, PostHog token, raw account identifier, visitor record, or screenshot with private content in this repository.
