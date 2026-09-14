# Local release verification — September 12

This records local evidence for the integrated homepage and release implementation. It is not
a public deployment certificate or confirmation of real email delivery.

## Verified

- Unit tests: 329/329, including the disposable reporting fixture; lint passes.
- Catalogue: 172 default specimens at three widths in light and dark themes — 1,032 layouts;
  18 documentation-shell checks and nine motion presets. See [the generated gate](../../GATE.md)
  for each interaction and its explicit limitations.
- Homepage: 19 checks, including real profile controls, assembly/replay, live component filters,
  keyboard focus, reduced motion and offscreen background suspension. Desktop/light and
  mobile/dark exported pages were visually reviewed.
- Marketing pages: six layout/theme cases. Smooth scrolling: four cases.
- Safari-engine automation: seven touch journeys, including navigation, tabs, motion settings,
  multiselect and shape scene. This is not physical-device testing.
- Copied code: 172 default examples and 791 snippets compiled without TypeScript diagnostics.
- Reporting Worker: 35 integration tests; hosting Worker: seven tests.
- Disposable reporting browser journey: nine checks covering draft persistence, validation,
  ambiguous-response retry, real local D1/R2 attachments, private screenshot redaction,
  maintainer read/status/lock and mobile layouts. No provider delivery is possible in this fixture.
- Analytics: unset and explicitly disabled configurations remain silent; configured explicit
  events pass consent/privacy, interaction and copy assertions. Provider requests are intercepted.
- Launch browser: six checks against a packaged production artifact, including exact production
  canonical URL, live previews, copied installation command and responsive navigation.
- README: original brand artwork, actual component screenshots, installation instructions,
  accessible text alternatives and responsive light/dark rendering reviewed locally.

The final test corrections update the replaced homepage heading, parameterize the expected
canonical origin without reading it from the page, and start the disposable reporting services
that CI previously omitted. They do not alter component, Worker or registry behavior.

## Still required before launch

Build and validate the final beta/production pair from the same clean release commit. Pass
GitHub checks, finish narrowly scoped deployment/issue credentials and beta Turnstile, then
exercise actual-domain HTTPS, reporting, signed webhooks, inbox receipt, analytics dashboard,
backup/restore and rollback. Native macOS select-popup and native background-tab checks remain
explicitly unverified. Production requires the owner approval gate after beta acceptance.

See [owner return steps](OWNER-RETURN.md). No shadcn directory/namespace submission and no
marketing outreach have been performed. The [marketing guide](../marketing/START-HERE.md)
contains research and drafts, not sent messages.
