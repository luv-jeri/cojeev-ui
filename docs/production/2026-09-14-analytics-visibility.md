# B02-4 — Landing analytics visibility investigation

Status: diagnosis, not a confirmed repair. Base: `9c8aa334f0692ece3097ac267221e83c6481897c`.

The [combined release run](https://github.com/luv-jeri/cojeev-ui/actions/runs/34783759033)
passed the catalogue/motion gate in 60m02s, followed by mobile, marketing,
smooth-scroll, local reporting and analytics-disabled checks. The enabled
analytics browser test then failed at the Motion Drawer impression assertion.
Its original message listed `page_viewed, component_impression` without identifying
which component had emitted the impression. Fresh consumer installation and the
accepted release-artifact upload did not run. No deployment followed.

## Evidence and narrow change

- A fresh local locked-dependency installation and enabled static export built
  successfully. The unchanged complete analytics browser suite passed locally.
- Additional local probes at 4x CPU throttling and script delays of 0, 600 and
  1600ms all observed the real Motion Drawer impression. Its sampled rectangle
  stayed at y=353px, height=194px, with scrollY=644px in a 1280x900 viewport.
- Those passes do not reproduce or explain the Linux failure. DOM attachment,
  hydration, native scrolling and observed visibility remain distinct signals.
- The test now includes component IDs in timeout messages and captures the
  target rectangle, viewport, scroll position, document visibility/readiness and
  font status immediately after scrolling and again if the assertion fails.
  It reads state only: the component, scrolling, observer, exposure duration,
  timeout, deduplication and payload/privacy requirements are unchanged.

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

B02-4 stays open until the failure is explained and the bounded correction is
verified. Do not merge diagnostics as a purported fix or call one green retry a
root-cause finding. Final combined acceptance, real browser checks and production
approval remain separate. Rollback is reverting this test-only diagnostic change;
there is no product, secret, schema, hosting or data change.
