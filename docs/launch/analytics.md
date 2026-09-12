# Website analytics

000h uses a small direct PostHog capture transport for explicit website events. It does not load an analytics SDK or enable automatic capture, cookies, session replay, fingerprinting, or persistent visitor profiles. No PostHog project is connected by this repository alone.

## Connect a project

Use a PostHog **public project token**, never a personal or private API key. Set the matching ingestion host exactly:

    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_your_public_project_token
    NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

The only accepted hosts are https://us.i.posthog.com and https://eu.i.posthog.com. Public variables are frozen into the browser bundle when Next.js builds it, so changing them requires a new build.

A production build captures when both values are valid. Development, test, and any loopback-host run also require:

    NEXT_PUBLIC_ANALYTICS_ENABLED=true

That extra switch prevents local browser checks and exported-site gates from sending synthetic traffic if a real token happens to be present. It is an enable switch for non-production testing, not a production opt-out switch.

The transport follows PostHog's [public capture endpoint](https://posthog.com/docs/api/capture): POST /i/v0/e/ with the project token, an event name, an ephemeral distinct ID, and bounded properties. Every payload sets $process_person_profile to false and $geoip_disable to true.

## Runtime integration

The root layout wraps its children with:

    import { AnalyticsProvider } from "@/components/analytics/analytics-provider";

    <AnalyticsProvider>{children}</AnalyticsProvider>

AnalyticsProvider accepts { children: React.ReactNode | null }. It records the completed usePathname() route, retains approved campaign labels during client-side navigation, deduplicates the initial Strict Mode effect, and categorizes outbound links.

Use the preview boundary around a visible specimen:

    import { AnalyticsPreview } from "@/components/analytics/analytics-preview";

    <AnalyticsPreview componentId="button" placement="landing">
      <ButtonExample />
    </AnalyticsPreview>

Its signature is { componentId: string; placement: "landing" | "docs" | "getting_started" | "about"; children: React.ReactNode; className?: string }. It records one impression after the specimen is at least 50% visible for one second. Hidden, detached, and short-lived views are cancelled. An impression can occur again after a new route navigation.

AnalyticsPreferences from @/components/analytics/analytics-preferences renders the truthful browser preference on the privacy page. track(event, properties) from @/lib/analytics/client is available for explicit website controls. The event and property types reject values outside the contract.

Distributed registry components contain no analytics imports or endpoint. Their optional onCopyResult(result) callback reports only "success" or "failure" after the browser copy mechanisms finish. Website wrappers convert that result into a bounded event.

## Event contract

| Event | Properties |
| --- | --- |
| page_viewed | normalized route; optional utm_source, utm_medium, utm_campaign, utm_content |
| component_impression | component_id, placement, normalized route |
| demo_interacted | component_id, placement, normalized route, interaction_kind (activate or change) |
| variant_selected | component_id, placement, normalized route, known variant_id, bounded committed variant_value |
| install_command_copied | normalized route, optional component_id |
| source_copied | component_id, normalized route |
| guide_copied | component_id, normalized route |
| copy_failed | normalized route, copy_kind, optional component_id |
| outbound_clicked | destination_category only: github, shadcn, npm, or external |

Copy success is emitted only after the Clipboard API or selection fallback succeeds. Failure is emitted only after both fail. Exceptions in the reporting callback do not alter the copy result shown to the visitor.

demo_interacted comes from actual activation or change inside a marked example. Preview tabs, copy controls, surrounding cards, labels, and raw text are not used as interaction metadata. variant_selected uses explicitly marked known variant IDs. Continuous controls report a committed, debounced value rather than every intermediate input.

Campaign parsing accepts only the four named UTM fields with short token-like values. It supports the bounded labels used by shadcn links and carries them in memory during SPA navigation. It discards every other query parameter. Routes contain only a normalized pathname with the deployment base path, query, and fragment removed.

## Privacy boundary

The anonymous identifier is generated in memory and resets on a full page load. It is never saved to cookies or storage. The only stored analytics value is the visitor's boolean opt-out choice.

Do Not Track, Global Privacy Control, or the stored opt-out suppresses new events. Suppressed events are discarded immediately and are never queued for a later opt-in. Storage access failures do not break the page; the choice still applies to the current document.

The event body never includes copied source, clipboard data, button labels, form values, feedback drafts, attachments, full referrer URLs, arbitrary query values, IP fields, or user-agent strings. /feedback-admin/ and /workspace/ are excluded entirely, including their links and query context. PostHog and the hosting provider still receive ordinary network information while serving a request; disabling GeoIP enrichment does not remove infrastructure logs.

Website sessions and conversions are approximate. A copied command does not prove that it ran, a registry request does not prove an installation, and the installed source has no downstream telemetry.

## Local intercepted verification

Start a separate development server with the dummy public token:

    NEXT_PUBLIC_SITE_URL=http://127.0.0.1:4338/cojeev-ui \
    NEXT_PUBLIC_ANALYTICS_ENABLED=true \
    NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=phc_public_test_token \
    NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com \
    npm run dev -- --hostname 127.0.0.1 --port 4338

Then run:

    ANALYTICS_URL=http://127.0.0.1:4338/cojeev-ui node tests/analytics.browser.mjs

The browser gate installs route interception before navigation, so the dummy events never reach PostHog. It checks the event allowlists and request privacy flags, route consistency, campaign carry-forward, page and impression deduplication, real demo intent, successful and failed copy outcomes, DNT, GPC, stored opt-out, no historical flush, and private-route exclusion.

After connecting a real project and publishing the final origin, make one deliberate visit and confirm the expected event in PostHog. That live check is required before describing analytics as connected.
