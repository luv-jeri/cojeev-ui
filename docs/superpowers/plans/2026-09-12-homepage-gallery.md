# Homepage Gallery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build the owner-approved short living homepage with genuinely distinct profile specimens and restrained animated atmosphere.

**Architecture:** Page-local ProfileStage composes existing primitives and owns demo state; FeaturedComponents owns the bounded real gallery. Marketing shell remains shared, with explicit homepage-only presentation. Existing shared motion, backgrounds, branding, contact configuration and analytics remain the owners of those concerns.

**Tech Stack:** Existing React, Next static export, TypeScript, Motion for React, Cojeev registry primitives and Playwright. No new dependencies.

## Global Constraints

- Follow `docs/superpowers/specs/2026-09-12-homepage-gallery-design.md` and DESIGN.md; the approved PNG is a visual reference only.
- No sparkle particles, invented social proof, external code/assets with unverified redistribution rights, moving click targets or public API breakage.
- Reuse PigmentField; one active background field per viewport, quiet/offscreen fallback, theme-safe foregrounds.
- Preserve release Task 3 beta badge, analytics/privacy controls and contact gate. Do not edit deployment files or credentials. Do not deploy or push from this task.
- Work only in the isolated release checkout. Commit only scoped source/tests/docs. Do not commit screenshots containing private data or generated mockups as production assets.

## Task 1: Approved interactive homepage

**Files:** Modify `components/landing/landing-page.tsx`, `components/landing/featured-components.tsx`, `components/landing/landing.css`, `app/page.tsx` only for scoped imports, and an explicit homepage option in `components/landing/marketing-shell.tsx` only if required. Create `components/landing/profile-stage.tsx`, `scripts/check-homepage-gallery.mjs` and focused tests under `tests/`. Do not change registry component defaults to style the page.

**Interfaces:** Existing `LandingPage({componentCount:number})` remains. `ProfileStage()` owns local state and returns a labelled section. Shared exports are `PigmentField`, `Button`, `Avatar`, `AnimatedIcon`, `useChoreography`, `useMotionVisibility`; inspect their actual types before use. Local treatment type is `type ProfileTreatment = 'classic' | 'fold' | 'stack'`. Public ProfileCard contracts remain unchanged.

- [ ] Read PRODUCT.md, DESIGN.md, creative-repertoire.md, craft skill, actual imported landing styles, installed Next docs, profile/assembly primitives and their consumers. Trace existing homepage browser selectors before replacing markup.
- [ ] Add a browser regression against the current page, proving the requested scene is absent. Use actual accessibility targets, e.g. `await page.getByRole('button', {name:'Replay assembly', exact:true}).click()` inside the new profile stage; `await expect(page.getByRole('button', {name:'Fold', exact:true})).toHaveAttribute('aria-pressed','true')` after selection (use the repo's existing assertion style if not Playwright Test). Assert all three treatments and gallery doc links, no horizontal overflow at 320px, not merely class strings. Record initial failure.
- [ ] Build ProfileStage from genuine library components with distinct Classic/Fold/Stack layout. Keep selected treatment, follow/save and local message state outside animation keys. Use a single shared choreography owner and stable native control roots; Replay restarts finite paint/presence sequencing rather than remounting the form. Quiet mode renders settled state immediately and disables unnecessary replay. Mark local feedback truthfully, never simulate remote send success.
- [ ] Replace current crowded opening and extra shape playground with the approved three-section hierarchy. Keep the canonical seed logo. Use an explicit labelled selector and Replay in one small stage toolbar. Animate existing PigmentField gently behind the bounded stage, never behind essential small text. Keep at most one live selected profile; quiet alternate previews have labelled selectors and no nested interactive controls.
- [ ] Replace featured shelf with bounded live Rubber Slider, MotionDrawer, Bento Grid and Command, using their real contracts. Each has a short label, purpose and separate documentation link. Add only useful filters with genuinely different contents; ensure switching does not erase intentional state. No fake previews promoted as working controls.
- [ ] Implement the olive shallow-wave contact close and quiet utilities. Preserve verified contact gating, GitHub, privacy and motion controls. Scope style changes to homepage, not all marketing pages. Use fluid tracks/min-width zero and stacked mobile composition; avoid clipping focus with decorative masks.
- [ ] Extend focused tests for replay retaining state, rapid switching latest intent, reduced motion/Motion Off/Flow Off, background pause hidden/offscreen, keyboard controls, local message feedback and no console errors. Run focused type/lint/tests and existing landing browser/smooth-scroll gates affected by selectors; update obsolete selectors to the new intended behavior without weakening assertions.
- [ ] Start a separate coordinated local dev server (do not mutate production); capture full-page desktop/mobile light/dark and stage detail. Inspect each image and fix material hierarchy, contrast, clipping or crowding defects. Record screenshot paths, actual interactions and limits.
- [ ] Commit scoped work and write task report with changed files, red/green evidence, exact commands, screenshot evidence and remaining limits. Return commit and status. Independent task review and root visual inspection are required before release integration.

## Release integration

After review, rerun release checks on the complete combined commit, build separate beta and production artifacts from that same SHA, deploy beta and perform live acceptance, then use the configured owner approval gate for production. Do not claim rollout complete from local screenshots.
