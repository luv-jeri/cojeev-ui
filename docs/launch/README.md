# 000h by Cojeev launch setup

The selected website name is **000h by Cojeev**. Existing `@cojeev` consumer configuration and source paths stay compatible. The future directory namespace is a separate reviewed submission, not registered by these changes.

## What is prepared

- A flowing homepage with an interactive Interface Assembly hero, six directly usable component previews, installation guide, expanded maker page at `/about/`, and privacy controls. `/work-with-me/` still works and points search engines to `/about/`.
- Explicit website analytics: page visits, component exposure, demo interaction, variant selection, successful command/source/guide copies, and broad outgoing-link categories. See [analytics setup](analytics.md).
- A future static registry host with separate request measurement. See [registry measurement](registry-measurement.md).
- Private GitHub clone/view snapshots with daily upserts, and a live-domain readiness check.
- Page metadata, social image, sitemap and public configuration for the eventual domain.

The [dashboard definitions](dashboard.md) explain what to chart and how to interpret the numbers. The [verification record](verification.md) separates local evidence from the remaining live connection and domain checks.

## Connect website analytics

Supply a PostHog **public project token** and ingestion host: `https://us.i.posthog.com` or `https://eu.i.posthog.com`. Do not use a personal/private API key. The public token is intentionally included in browser code.

The build reads `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST`. The existing GitHub workflow reads repository variables `POSTHOG_PROJECT_TOKEN` and `POSTHOG_HOST`. Setting these values requires a new build; they cannot modify already exported files.

Local development is off by default. For the intercepted local browser test only, set `NEXT_PUBLIC_ANALYTICS_ENABLED=true` and the documented dummy token. Keep session replay, autocapture and unrelated paid products off. The implementation uses explicit capture requests and does not load the PostHog SDK. A working local event test does not prove that a real project is connected: check real events in its dashboard after publishing.

## Attach the domain

Use the actual purchased origin for `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_REGISTRY_URL`, and `COJEEV_REGISTRY_URL`. Set `COJEEV_BASE_PATH=""` for a separate root-domain build. These values must agree with the artifact's deployment path.

The existing Pages build defaults to `/cojeev-ui/` and remains the compatibility destination until a cutover is explicitly ready. Its workflow accepts `SITE_URL` and `REGISTRY_URL` variables but deliberately retains the Pages base path. Do not put a root-domain URL in that workflow while still publishing the same artifact under a Pages subpath.

Update the reporting service's allowed origins and site URL when the domain is attached. The reporting widget already exists; its connected backend, Turnstile and delivery status are a separate release check. No contact email is invented by the maker page.

After the actual domain is serving the matching build:

```sh
npm run launch:check -- --url=https://YOUR-ACTUAL-DOMAIN
node scripts/verify-install.mjs --url=https://YOUR-ACTUAL-DOMAIN --components=button,semantic-bloom,animated-icon,motion-drawer,code-block,organism-assembly
```

The first check tests canonical links, share-image delivery, sampled registry payloads/dependencies, and missing-item behavior. The second performs a fresh-project install. Neither proves every component works. The featured components are included in the consumer fixture; repeat the check against the final domain before publishing an installation claim.

## Repository traffic

Run `npm run analytics:github` with a GitHub CLI account that can read traffic for `luv-jeri/cojeev-ui`. The default output is `~/.local/share/cojeev-ui-analytics/traffic.json`, outside the public repository, with owner-only file permissions. Pass `--output=/absolute/private/path.json` to choose another private destination.

GitHub supplies a rolling 14-day daily series. Run once daily to retain history; no schedule is installed by this change. Repeat runs replace overlapping UTC days. Missing historical days stay missing rather than becoming invented zeros. Daily uniques cannot be summed into a meaningful monthly unique-person count. See [GitHub's traffic API](https://docs.github.com/en/rest/metrics/traffic).

Keep repository clones, registry requests and website copies as separate panels. None reveals how many downstream applications or people use the installed source.

## First review after launch

1. Confirm the public token/region by seeing one deliberate event in PostHog.
2. Verify opt-out and browser privacy signals prevent subsequent capture.
3. Compare component impressions, interactions and successful copies by placement. Treat low-volume comparisons as preliminary.
4. Review final-domain registry responses and a fresh installation.
5. Use the [creator kit](creator-kit.md) for a small, relevant outreach wave. Send messages only after the actual recipients and content are approved. A directory listing and first position remain subject to maintainer review.
