# Optional website analytics: explicit opt-in

Checkpoint E03-2, a child of E03; engineering evidence also contributes to E04.

## Owner-approved behavior

On 17 September 2026, after the proposed “Allow analytics / No thanks” design and its readiness matrix were presented, Sanjay approved analytics activation. This authorizes implementation of that explicit opt-in rule. It does not bypass the repository's protected production approval or establish legal compliance.

The website sends no optional analytics before the visitor chooses Allow. Both actions are equally accessible. Declining persists, so visitors are not repeatedly prompted; allowing persists and can be withdrawn on the existing Privacy page. DNT/GPC always suppress capture. A failed storage read or write keeps capture off. Existing opt-out choices stay respected; an old opt-out=false value is not new consent.

## Small interface

Reuse the site's Button, typography and theme tokens. Show one compact, non-modal paper surface on eligible public routes in a configured build. Its heading is “Help improve 000h”; copy explains that optional PostHog analytics measures page views and component interactions, with no recordings or typed content. Use “Allow analytics” and “No thanks” with equal prominence, plus a Privacy link. Do not steal focus or obstruct the reporting controls on mobile. On the Privacy page, use the inline preference controls instead of duplicating the prompt. No prompt appears in disabled builds, private routes, or with overriding browser privacy signals.

## Capture and storage

Use a versioned local preference key with unset/allowed/declined state. Store only the choice, never a visitor identifier. Consent changes update all mounted controls and other tabs. Unknown, malformed and unavailable state suppresses capture. Withdrawal takes effect before a storage write is attempted and stays effective even if that write fails. Re-read persisted choice before capture so an older open tab cannot continue after withdrawal elsewhere.

Failure and compatibility boundary: a failed write blocks the current page and broadcasts withdrawal to already-open tabs where BroadcastChannel is available, but cannot promise persistence across reload. The failure message explicitly discloses that a previously saved allowance may return on reload. If BroadcastChannel is unavailable, persisted withdrawal still suppresses other tabs; re-allowing an already-declined peer requires that peer to reload. A failed write cannot notify peers in that fallback. This conservative fallback never promotes an ambiguous storage event into consent.

No suppressed event history is queued or replayed. Allow does not retroactively send the initial page view. Later eligible navigation and interactions can send. Exposure/debounce timers must start only after consent and cancel on withdrawal. Keep existing bounded properties, private-route exclusions, credentials omission, no-referrer requests, and disabled profiles/GeoIP. Page-load identifiers remain memory-only and are created only when capture can occur.

## Delivery boundary

This checkpoint supplies implementation, tests, preview and a scoped PR. Keep both remote enable flags off until the reviewed exact candidate is ready for deliberate activation. Check an enabled test build with intercepted capture requests, a disabled build, then the exact beta/production artifacts through the existing release process. A production dashboard receipt requires the separately approved deployed artifact. No public token or private dashboard row belongs in evidence.

Google/Bing indexing and reports, reporting-data retention, and broader policy questions remain separate. Use existing owner facts; do not invent a legal basis, processing agreement, age audience, retention setting, or jurisdiction conclusion.
