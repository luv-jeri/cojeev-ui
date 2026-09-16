# B02-4 — Landing analytics fixture readiness

Status: a fixture precondition is corrected and locally verified; the exact cause
of the original Linux timeout remains unconfirmed. Base:
`9c8aa334f0692ece3097ac267221e83c6481897c`.

The [combined release run](https://github.com/luv-jeri/cojeev-ui/actions/runs/34783759033)
passed the catalogue/motion gate in 60m02s, followed by mobile, marketing,
smooth-scroll, local reporting and analytics-disabled checks. The enabled
analytics browser test then failed at the Motion Drawer impression assertion.
Its original message listed `page_viewed, component_impression` without identifying
which component had emitted the impression. Fresh consumer installation and the
accepted release-artifact upload did not run. No deployment followed.

## Evidence and narrow change

- A fresh local locked-dependency installation and enabled static export built
  successfully. The unchanged complete analytics browser suite passed locally
  under the machine's default Node25.3.0; this was not a pinned-Node CI reproduction.
- Additional local probes at 4x CPU throttling and script delays of 0, 600 and
  1600ms all observed the real Motion Drawer impression. Its sampled rectangle
  stayed at y=353px, height=194px, with scrollY=644px in a 1280x900 viewport.
- Those passes do not reproduce or explain the Linux failure. DOM attachment,
  hydration, native scrolling and observed visibility remain distinct signals.
- The test now includes component IDs in timeout messages and captures the
  target rectangle, viewport, scroll position, document visibility/readiness and
  font status immediately after scrolling and again if the assertion fails.
  These diagnostics read state only. The diagnostic-only
  [Linux checkpoint](https://github.com/luv-jeri/cojeev-ui/actions/runs/34788265562)
  passed; that retry did not establish the original failure's cause.

## Demonstrated fixture precondition

The landing test used an SSR-visible locator as readiness, unlike the docs test
which first waits for the actual `page_viewed` capture. A controlled browser case
now holds JavaScript responses, starts the landing exposure helper and inspects
scroll position before releasing scripts. Removing the helper's new readiness
wait reproduces premature scrolling: **644px instead of 0px**. This demonstrates
the fixture precondition defect, not the original CI timeout itself.

The helper now waits for the real landing `page_viewed` capture before scrolling,
then verifies at least half the specimen's area is within the viewport. This is
an analytics-provider readiness signal, not a claim that every child on the page
has hydrated. The actual impression still has to arrive within the existing
six-second observation budget. The provider-readiness wait has a separate
30-second setup budget, matching browser setup actions. No product observer,
motion, one-second dwell rule, payload, deduplication or privacy check changed.
Both normal loading and the controlled blocked-script case exercise the complete
landing impression and re-entry deduplication assertions.

The first attempt to reuse a local `node_modules` symlink failed before browser
testing because Turbopack rejects a dependency symlink outside its filesystem
root. That symlink alone was removed and replaced with `npm ci`; no other
checkout or preview was changed. This setup error is not the CI analytics cause.

## Verification and completion

Build flags match the workflow's enabled Pages fixture: public test token,
EU PostHog host, beta environment and the all-zero 40-character test release.
Requests are intercepted by the existing browser harness, not sent to PostHog.
Run the existing affected analytics checkpoint (including unset, disabled and
enabled configurations), not another component catalogue for these diagnostics.

Fresh verification of the correction used **Node22.22.0**, the pinned CI runtime:

- Enabled static export: passed, 189 routes generated.
- `ANALYTICS_TEST_ENVIRONMENT=beta ANALYTICS_TEST_RELEASE=0000000000000000000000000000000000000000 node tests/analytics.browser.mjs`: passed, including both landing loading cases and existing copy/privacy journeys.
- Negative control: an ignored copy of the same harness with only the provider-readiness wait removed failed at `644 !== 0` under Node22.22.0. No production code was altered for that control.
- `node --import tsx --test tests/analytics.test.ts tests/github-traffic.test.ts`: 12 passed.
- Scoped ESLint: passed.

The updated focused Linux checkpoint must pass before merging this correction.
The complete catalogue was not rerun for this bounded edit; the combined release
still needs its own acceptance. Retain the diagnostics if that run fails again.
Do not present this as a reproduced product defect or proof that the original
intermittent failure cannot recur. Rollback reverts this test-only change; no
product, secret, schema, hosting or data changes are included.
