# Landing studio — local review, 8 September 2026

This pass implements the owner's screenshot feedback. It is a local development review, not a release. No production build, installation, commit, push or publication was performed for this pass. The public registry remains on its earlier payloads.

## What changed

- Matching Theme and Colours controls share a neutral surface and silhouette. Desktop labels explain their purpose; compact controls keep accessible names and tooltips. The colour control uses a palette glyph. GitHub moves into navigation on the narrowest screens.
- A centred “Make it feel alive.” hero replaces the left-copy/right-model layout. Real Button, Switch, Avatar and Card components sit among authored shapes, glazed sculptures and particles on different depth planes.
- New **HeroButton** extends the library Button. Its arrow draws and curls toward its destination; its body uses the shared organic morph. `asChild` provides a real anchor without nesting a button. Busy and disabled slotted actions are guarded.
- Profile, task panel, action dock and conversation panel have distinct compositions using the same base components as the docs. Dashboard was removed from the chooser; the older wrapper remains compatible. The profile has a colourful cover and inline message disclosure; chat starts with a usable local conversation.
- New **DepthBackground** offers seeded pollen, contour and orbital variants. New **FloatLayer** provides an 800ms entrance, native-scroll depth and optional drift. Layers pause offscreen, on a hidden page and with reduced/global-off motion. These are documented library entries, not landing-only helpers.
- The page continues through a native Marquee, an open shape workbench, a working motion instrument, a textured material room, concise principles and a source/installation close. The generic scroll-following blob is removed from this landing.
- The material scene uses the installed Three.js APIs for path conversion and shadow filtering. The static fallback retains its palette instead of being overwritten by landing CSS.
- The local catalogue has 106 UI entries. Examples, API metadata, stylesheet imports and README reflect HeroButton, DepthBackground, FloatLayer, FocusSession and InviteCard. Only documentation metadata was regenerated; new public registry payloads are held for approval.

## Research and design reasoning

[Codrops' particle/depth experiments](https://tympanus.net/codrops/tag/generative-art/) informed separate focal planes, blur and drift. [Motion's scroll guide](https://motion.dev/docs/react-scroll-animations) informed the separation of viewport entrances from native-scroll parallax. Geometry and textures here are authored with SahaJiv's existing shapes, tokens and component APIs. There is no scroll hijacking or downloaded artwork in the implementation.

## Verification

The combined review covers Chromium desktop, tablet and narrow mobile views in light/dark themes, followed by a mobile WebKit confirmation. Screenshots are in `output/playwright/landing-studio/` and `output/playwright/landing-studio-confirm/`; assembly evidence is in `output/playwright/review-assembly-redesign/`.

Verified integration corrections include a tablet canvas intercepting a real pointer click, collapsed whitespace in a mobile heading, status tabs referencing missing panels, and insufficient space for the 320px header. Floating controls are tested with real pointer coordinates because continuous drift intentionally never becomes geometrically stationary.

Initial landing confirmation: TypeScript and full lint passed; 22 copied examples compiled; ten focused palette/depth/geometry tests passed. Chromium checks passed at 1440/light, 390/dark, 320/light and, after the canvas stacking correction, 768/dark. WebKit passed at 390/dark with no runtime warnings/errors. New documentation and creator routes returned200 with no page overflow or runtime errors. Assembly quiet-mode interruption was separately diagnosed and corrected before the follow-up below.

## Owner follow-up while reviewing the live page

The owner approved the profile appearance and requested another polish pass for panel, dock and chat, stronger transition choreography and additional compositions. The follow-up preserves the profile artwork, reworks panel/dock/chat, and adds a real local focus session plus an invitation/RSVP card. The chooser now exposes six compositions and the landing links their actual base ingredients. Shared Motion drives curved travel, a small anticipation, staged contour changes and a late content reveal. Native control rotation, clipping and interaction ownership are released after arrival, including interrupted and quiet-mode transitions. No second animation framework was installed.

The six-composition Chromium integration pass passed at 390/light and 1440/dark: profile follow, pointer/keyboard task completion, dock selection, local chat send, focus start/pause/reset and reversible RSVP. It also passed rapid target changes, mid-flight reduced-motion cleanup and 320px chooser bounds, with no page errors. Screenshots and structured receipts are in `output/playwright/composite-studio/`. The screenshot review then identified small-clock typography, an overly prominent chat scrollbar and dark-mode cover/bubble paint for a focused correction. Final paint confirmation measured48px/64px focus clocks, fitting chat content without a thumb, and corrected dark cover/bubble paint. WebKit then passed all six interactions and the two new documentation routes.

All 11 affected default examples and 24 copied snippets compiled with no diagnostics. Sixteen focused palette/depth/composition/geometry tests passed. Project typecheck passed; full lint exposed one assembly layout-effect update which was corrected and then passed scoped lint.

This pass does not claim a fresh audit of all 106 entries, a performance benchmark, or testing on a physical iPhone. WebGL can fall back to coloured static shapes when unavailable. Owner visual approval and all release work remain separate.

Implementation contracts: `docs/superpowers/plans/2026-09-08-landing-studio.md`, `REVIEW-ASSEMBLY.md`, `REVIEW-DEPTH-LAYERS.md`.

## Latest continuity and workbench review

The owner subsequently requested smoother colour handoff, native chat/send feedback, controllable/exportable shape layers, consistent Glide and a quieter stationary foreground. These changes and their final evidence are recorded in `REVIEW-LIVING-DETAILS.md`. That report supersedes the earlier hero/workbench descriptions where they differ. Release approval remains held.
