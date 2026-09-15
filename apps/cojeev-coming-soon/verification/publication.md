# CJ01-2: publish Cojeev.com

Parent: CJ01-1 / PR #68, source c6d3a953326078375746cb5327d789dc255e6eae.

The owner requested production deployment on 2026-09-15 after reviewing the optimized page. This supersedes the earlier no-deployment restriction for this landing page and authorizes starting its shared 30-day countdown at first publication.

Scope: a new static-assets Worker named `cojeev-coming-soon`, serving `cojeev.com` in account `25369d7051a3d996a1bca81f462a1fbc`, zone `12e8b50b78c2c6af9e28406fede10d4e`. Existing library and reporting Workers/subdomains are outside this publication. The apex currently serves a parking page at A records `3.33.130.190` and `15.197.148.33`. No existing Worker owns the apex.

- [x] Owner approved the page for publication in this conversation.
- [x] Account, active zone and existing Worker domain bindings verified.
- [x] Configure the dedicated static host and cache policy.
- [x] Build/packaging and shared-countdown checks.
- [ ] Publish and record the immutable deployment version and timestamp.
- [ ] Verify live page, assets, compression and browser behavior.

The first library PR check failed lint. Commit 7e303e4 repairs that failure, declares the shared shader packages and resolves their DOM typing conflict. The next library run (34961695420) passed lint, typecheck, 166 unit tests and reporting tests, then failed its separate registry packaging step: `Undeclared registry helper: membrane`. The existing landing-page-only experimental components were never declared in that catalogue. No library release or merge is part of this publication, and its failing gate stays intact. The owner originally directed that separately publishing new library components must not block the landing page.

The landing page has its own build and static host. Its production build, Wrangler dry-run, 118 story checks, 21 lifecycle checks, 11 focused startup/mobile/fallback checks and five shared-countdown unit tests pass. The final review-checkout build was separately checked for lifecycle and startup because its clean dependency installation differs from the earlier runtime preview. The early-input regression check caught a race between a restored state update and replayed Enter; initializing prompt state directly from the captured startup value fixes it, with no hydration errors.

Fresh compressed production Lighthouse scores are 100 mobile / 100 desktop. These are local measurements, not claims about the live host. Raw reports and browser evidence are beside this record. No style or shader source changed.

Publication does not promote the component library to main or bypass its production environment. Its own deployment is explicitly authorized by the owner in this conversation.
