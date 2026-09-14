# 000h launch verification — 10 September 2026

The local launch implementation is prepared. A public deployment, custom domain, live analytics project, and connected feedback delivery are separate from the evidence below.

## The final experience

The homepage opens with “Good things come together.” Existing Sunwash and Contours backgrounds, restrained scroll depth, and a small clover character connect the introduction to the Interface Assembly. Visitors can gather and scatter a working focus timer, task panel, or local chat. Six smaller previews lead directly to installation commands and documentation. The SVG workbench is removed from the homepage, and feedback uses “Request a feature / Report a bug.”

Assembly parts retain native controls and state while moving. Reversals continue from the displayed position, velocity, and text opacity. Departing parts finish their exit before removal; reduced motion removes them immediately. A deterministic particle field follows the native parts, fades at rest, and pauses when quiet, hidden, or offscreen. The documentation still provides all six compositions.

## Verified locally

- Production compilation, TypeScript, and static export passed in the isolated launch checkout. The main working copy also passed TypeScript after integration. Unknown duplicate files and simultaneous navigation changes were preserved.
- The complete unit suite passed: **261 tests**. The isolated snapshot initially had an outdated documentation test; it was refreshed from the current working copy and the full suite then passed. Full lint and the final focused lint passed.
- `scripts/check-assembly-continuity.mjs` passed native identity, rapid-reversal geometry and text fade, timer state, outgoing presence, chat persistence, replay after scrolling away, profile expansion/focus, draft retention, dock selection, and RSVP checks. It captured all three hero compositions in light/dark at desktop/mobile widths and verified visible particle rendering plus reduced-motion clearing.
- `scripts/check-launch-browser.mjs` passed six journey groups on the static export: live previews, drawer focus return, actual clipboard installation command, mobile maker navigation, getting-started/privacy routes, and reduced-motion drawer access. The desktop homepage measured 1882px at 1440px width.
- `scripts/check-refinement-marketing.mjs` passed all six combinations of 390/768/1440px and light/dark against the final static export, including live timer/chat actions, mobile navigation focus, and quiet composition changes.
- `scripts/check-landing-smooth-scroll.mjs` passed four checks: progressive wheel motion, anchor navigation, immediate reduced-motion navigation, and touch access. Documentation returns to native scrolling.
- An independent reviewer verified replay after leaving the viewport, zero retained exiting nodes across reduced-motion composition changes, and readable settled desktop/mobile scenes.
- The analytics browser test passed against the integrated working copy with all PostHog requests intercepted: bounded event payloads, successful/failed copy distinction, impressions, interactions, route deduplication, opt-out, DNT, and GPC. No real project token was configured.
- The exported-build readiness check passed metadata, share-image delivery, registry/index responses, dependencies, and missing-item 404 behavior for **171 index entries and five sampled components**. Local checks explicitly retained the intended Pages canonical origin.
- A fresh external project installed Interface Assembly through the shadcn CLI against a local mirror of the generated registry, including the new particle helper. The final lifecycle update was also reinstalled through the CLI. Its TypeScript and production build passed, and browser checks confirmed timer/reversal state, sending chat text, light/dark styles, mobile fit, and zero retained quiet exits. Vite reported a large-chunk advisory for this all-six-composition consumer; no loading-performance claim is made. Earlier fresh-project checks also covered Button, Semantic Bloom, Animated Icon, Motion Drawer, and Code Block. These are local artifact checks, not proof of the eventual domain.
- Registry-host unit checks and a deployment dry run passed earlier in this launch work. A private GitHub traffic snapshot was stored outside the public repository; recurring capture has not been scheduled.

Evidence is retained in the isolated launch checkout under `output/playwright/000h-assembly/`, `output/playwright/000h-launch/`, `output/playwright/refinement-marketing/`, `artifacts/landing-smooth-scroll/`, and `artifacts/stranger/`. Build and integration receipts are under `.superpowers/000h-launch/`.

## Still needed for the public launch

1. Supply the purchased domain and choose its deployment destination, then rebuild with matching canonical, registry, and base-path configuration.
2. Configure the PostHog public project token and US/EU ingestion region. Verify one deliberate real event after deployment; local tests do not establish a live dashboard connection.
3. Finish the existing feedback service connection and delivery verification for the final allowed origin.
4. Repeat readiness and fresh installation checks against the real domain. Submit the registry listing and begin approved outreach only after that review.

Website visits and source/command copies, registry HTTP requests, and GitHub clones are separate measurements. They cannot establish how many downstream products use copied code.

The snapshot commit used to isolate this work is local evidence and must not be pushed wholesale. Only reviewed launch source changes were integrated into the working copy; generated registry artifacts should be rebuilt from the final publication checkout.
