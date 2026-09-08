# Catalogue expansion — batch 3

Local review checkpoint, September 8, 2026. The release hold remains: no production build, dependency installation, commit, push or publication. Metadata-only registry refreshes expose local docs without changing public payloads.

## What changed

- All 100 canonical Remocn icon actions now have individual source/render inspections and original native semantic feedback. Added 29 installed-Lucide geometry entries with retained ISC/Feather MIT notices. Existing Icon/AnimatedIcon APIs are preserved. The examples search all 100 actions and paginate 12 at a time using native Input, Label and Button.
- Text Reveal measures actual wrapped lines, preserves graphemes and hard breaks, adapts to resizing/fonts/padding/typography, and rebinds observers when its native tag changes. Prose beyond 4000 graphemes stays readable without measurement animation. Resizing settles instead of replaying.
- Word Relay supports phrase/word/grapheme choreography, first/last/center/edges order, explicit up/down travel, controlsRef navigation and optional non-looping playback. Its normal ref still returns the span. Controlled navigation requests parent updates; all candidates retain one wrapping layout footprint.
- Presence gained settle, soften and focus arrivals/exits, bounded exitDelay and exitDuration, and real word-level departure examples. Exiting surfaces remain inert until removal. Directional blur in all four directions is composed from the same MotionSurface API.
- Living Link gained underline-start/end/center and wash-up/across treatments. Organic ink paths and restrained pigment keep text contrast stable; arrows exchange through a small window. Reading direction, real anchor navigation, pointer/focus parity and local/global quiet modes are preserved.
- Existing native controls gained interruptible Accordion collapse, AsyncContent loading/fallback with retained edited content, horizontal Stepper stages, Bubble reactions/typing, and persistent committed-selection marks in Select/Combobox. Fast radio keys now select correctly without duplicate callbacks. The Bubble root and timestamps use normal themed surface/text roles, fixing the white conversation background in dark mode.
- Sheet and Drawer now travel their full measured distance to the viewport edge. Sheet supports logical start/end sides and RTL. Interrupted motion, changed content size, native modal focus and quiet-mode cleanup are covered.
- Dither Sculpture, Ink Sculpture and Sculpture Orbit are new local entries. Glyph Sculpture gains bounded local GLB/SVG/PNG/JPEG intake, custom geometry, orbit/zoom, contour marks and explicit failure/fallback states. Print treatments use actual lit, depth-tested geometry and original rendering algorithms.
- The API extractor now follows local imported aliases/interfaces and re-export barrels with cycle guards. Shared sculpture props appear on Dither/Ink docs without expanding native DOM or package APIs.

## Evidence

- Full project TypeScript and lint passed. TypeScript was repeated after the local-link quiet fix; targeted link lint also passed. No production build was run.
- 114 copied snippets across 21 affected components compile with zero TypeScript diagnostics: `output/playwright/expansion/examples-03.json`. Catalogue/source/example manifests all contain 118 entries. The later link lifecycle change does not alter the copied example API and passed final project TypeScript.
- Text: five unit tests and Chromium 1440 light/390 dark plus WebKit 390 light. Actual intermediate letters, stable footprint, rapid retargets, manual navigation, empty/long/Unicode/RTL content, resizing/fonts/padding, host replacement, quiet/offscreen and simulated hidden state were checked. Receipts: `output/playwright/expansion/text-sequences/results.json` and `line-final.json`.
- Presence: all three contexts pass actual retained exit/removal/reversal, child-transform preservation, staggered descendants and reduced/Flow Off/Motion Off. Receipt: `output/playwright/expansion/presence-exits/results.json`. Four-direction blurred wrapper evidence is in `reference/expansion/remocn/receipts/guidance-prototypes/verification.json`.
- Icons: six tests plus focused type/lint and 200 actual controls per engine in Chromium and WebKit. Search/pagination/touch/disabled/quiet checks reran after root replaced the search field with native Input/Label. Receipts: `.work/skiper-icons/output/verification.json`, `interactions.json` and `explorer.json`.
- Controls: individual source comparisons for all 37 Remocn UI primitives, targeted native runtime at 390/1440, fast/held radio keys, committed selection markers and vertical option rows. Exact scope and retained diagnostic failures are in `reference/expansion/remocn/receipts/ui-primitives/handoff.json`. Its broad docs harness is not claimed green: four stale assumptions remain saved alongside passing current-example checks.
- Root docs integration: nine initial routes at 1440 light/390 dark, three new control examples at both widths, and six final routes at both widths pass layout/no-error checks. Actual Sheet/Drawer open bounds and Escape removal were checked. Four Skeleton variants retain their dimensions and edited input across loading toggles. Receipts: `output/playwright/expansion/docs-03/results.json`, `native-docs-03/results.json`, `native-docs-03/skeleton-variants.json` and `docs-03-final/results.json`.
- Directional panels: two tests and four Chromium/WebKit desktop/mobile contexts, 40 checks. Native tap/outside/Escape/focus/disposal run live; deterministic entry/reversal positions use the existing document motion clock. Receipt: `output/playwright/expansion/directional-presence/results.json`.
- Links: all six treatments in Chromium 1440/390 and WebKit 390 pass intermediate paint, reversal, focus, native navigation, disabled, RTL, long-content and quiet checks. A further 54 cases verify ancestor/self/no-glide quiet changes and recovery. Receipts: `output/playwright/expansion/living-link/results.json` and `living-link-local/results.json`.
- Objects: ten unit/SSR tests, 233 native browser checks, four real Chromium CDP touch checks and three SVG-bound follow-ups. No physical-phone or hardware context-loss test is claimed. Limits and exact evidence: `reference/expansion/canvas/object-treatments-result.md` and its `receipts/object-treatments-handoff.json`.
- API extraction: three focused tests passed, including imported common props, re-export cycles and preservation of existing Button/Slider/TextReveal API output.

## Review corrections

Text review found padding measurement, same-size typography invalidation and host-replacement observer ownership. Runtime exposed a WebKit Range caret rect after blank RTL lines; choosing the painted glyph rect fixes false line breaks. Source review also found local-off link paint still interpolating; a scoped observer and immediate static CSS now settle it. The initial disabled-link harness tried Playwright's enabled-only click helper; a real coordinate click correctly verifies disabled anchors instead.

Object review found image aspect applied twice, excessive overlapping-triangle work and SVG bounds checked after extrusion. All three were fixed and specifically verified. Raster sampling coarsens under heavy overdraw; SVG complexity is checked before allocation. The orbit disable-mid-drag state now clears completely. Panel runtime found quiet changes could strand retained exits; guarded completion now releases the closed surface without removing a rapid reopen.

Current source hashes and verification pointers are recorded in `reference/expansion/checkpoint-03.json`. Earlier agent receipts can predate root example/theme integration; that final checkpoint records the resulting local source.

## Completion boundary

The ledger has **151 verified useful-core adaptations, 2 in progress and 460 pending out of 613**. The local catalogue contains **118 UI entries** (66 base and 52 additions). A source adaptation is not a new library entry: existing families and icons deliberately cover overlaps.

Verified means the individually compared useful behavior is implemented and checked in original SahaJiv code. Exact source assets, APIs, video-frame scheduling, pixel artwork and renderer parity are not claimed. Glyph Sculpture still lacks measured glyph-template matching; Reading Trail still lacks the reference drag affordance/hover preview. These two remain in progress. Decorative caret/pointer and the next three object effects are isolated prototypes, not counted additions.

This checkpoint does not establish a full 118-component visual audit, physical-device performance, installability of unpublished payloads or completion of the four-source goal. Work continues through every remaining row; owner review still precedes release.
