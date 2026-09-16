# Analytics readiness — 17 September 2026

## Current evidence and gap

Both GitHub analytics enable flags remain false under the [launch hold](../production/2026-09-13-analytics-launch-hold.md). After hydration, the live privacy page displayed `Analytics is not connected on this site. No website events are being sent.` The existing `tests/analytics.test.ts` suite also passed 10 tests under Node v25.3.0 through the release checkout's `tsx` loader in 0.47 seconds. This verifies existing disabled/source behavior only. It does not prove the exact release artifact, prior opt-in behavior, deployment, or dashboard receipt.

A read-only check of existing EU project 272306 found `Discard client IP data` on. Web autocapture, Web Vitals autocapture and dead-click autocapture were off. Session Replay said `Record user sessions` off and explicitly reported `Recording is disabled`. No setting was changed. Disabled subordinate controls are not evidence of active capture, and event retention was not verified; replay retention is irrelevant while replay recording is disabled. This provider snapshot and the source checks still do not replace an exact enabled-artifact network test.

The current client is opt-out. With an enabled host/token/flag and no stored opt-out value, its status is active. The provider then attempts the initial page event after hydration, and the privacy control offers withdrawal after analytics is already on. E03/E04 therefore remain open even though SEO-01 can close as a documentation evidence checkpoint.

## Minimal proposed opt-in design

Use one persistent analytics choice with three states: unset, allowed, and declined. Unset and declined suppress every analytics request. A clear Allow action changes the choice to allowed; a clear decline action persists declined; withdrawal changes allowed to declined. DNT or GPC overrides an allowed choice. Do not replay suppressed events or retroactively send the initial page view. Keep the existing bounded event schemas, route exclusions, no-referrer request, disabled person profiles and disabled GeoIP enrichment.

The owner choice is still pending: approve this browser-level prior opt-in rule, or keep optional analytics disabled indefinitely. No account, flag, runtime, or deployment change should occur from this document. Applicable-law and policy conclusions remain separate work; this record makes none.

## Prospective engineering acceptance

| Case | Expected network behavior | Expected persistent state/UI |
| --- | --- | --- |
| First visit before a choice | No analytics request | Unset; offer Allow and decline |
| Allow | No suppressed-history replay; only later eligible events may send | Allowed; offer withdrawal |
| Decline | No analytics request | Declined; offer Allow |
| Reload/navigation | Follow the stored choice | Choice survives reload and navigation |
| Withdraw after allowing | No later analytics request | Declined persists |
| GPC | No analytics request, even if previously allowed | Explain browser privacy suppression |
| DNT | No analytics request, even if previously allowed | Explain browser privacy suppression |
| Storage unavailable or failing | No analytics request | Fail closed for the page load |
| `/feedback-admin/` and `/workspace/` | No analytics request in every choice state | Private-route exclusion remains enforced |

Focused implementation verification should cover the client state transitions and persistence, then one enabled browser journey through before-choice, allow, decline, reload, withdrawal, GPC/DNT, storage failure and private routes. The disabled-build journey must remain silent regardless of stored choice.

## Separate release gates

After owner approval and the remaining E03/E04 policy work, build the exact approved revision with the deliberate environment configuration. Verify its embedded flags and real network behavior before choice, after allow and after withdrawal. Production promotion remains a separate protected-environment approval. Only after that approved deployment may one deliberate page/copy action be checked for receipt in the existing EU PostHog project. Artifact behavior and dashboard receipt are separate gates; neither is satisfied by the source tests recorded above.
