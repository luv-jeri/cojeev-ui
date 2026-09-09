# Living specimen studio — implementation contract

Goal: replace the generic landing composition with a concise, tactile demonstration of Cojeev's actual component family. The user's full creative authority and request to implement locally govern this pass; the earlier release hold remains. No new design-approval gate, production build, install, commit or publication.

Thesis: a component library should demonstrate its personality before explaining it.
Own world: existing Bricolage/DM Sans, six semantic palettes, signature shapes, soft sculpted contours and readable ink. This is a landing redesign inside the established component identity.
Story: touch a part, assemble a useful composition, explore shape and motion, then take the source.
First viewport: a centred six-word-or-shorter headline and a sculpted CTA, surrounded by an asymmetric constellation of live controls and shapes. Quiet central space and particles on different depth planes replace the old left-copy/right-model layout.
Form: living specimen studio selected from a component orbit, scroll-through sketchbook and interactive specimen wall. The orbit best exposes real behavior immediately; the sketchbook adds copy and the wall repeats tiles. Later sections alternate an assembly stage, open shape workbench, motion instrument, material exhibition and large typographic principles.

Research: [Codrops particle depth](https://tympanus.net/codrops/tag/generative-art/) motivates separated focal planes; [Motion's scroll guide](https://motion.dev/docs/react-scroll-animations) distinguishes entrance triggers from scroll-linked parallax. Author original geometry using existing library primitives and shared motion; no copied raster assets, new animation framework or scroll hijacking.

- [x] Header/CTA — docs_craft: matching theme/colour control silhouettes, identifiable palette glyph plus label; new HeroButton with native link support, organic face and directional arrow. Scope: Button/HeroButton, ThemeToggle/AppearanceMenu, ThemeControl and marketing shell.
- [x] Composites — agent_workspace: profile, side panel, dock and seeded chat have distinct layouts. Shape travel uses actual primitives and releases contour/motion ownership after settling. Keep state/keyboard/quiet behavior; remove dashboard from the chooser. Scope: assembly UI, geometry, CSS and examples.
- [x] Depth — motion_scroll: new decorative DepthBackground (`pollen|contour|orbital`, density/intensity/seed) and FloatLayer (depth/delay/drift/asChild) primitives. Deterministic render, no per-frame React state, bounded active/offscreen lifetime and usable quiet mode.
- [x] Landing — root: centred interactive hero, native Marquee, redesigned assembly framing, open shape controls, actual flow/agent interactions, large material stage and concise close. Every visible control/shape uses registered library primitives.
- [x] Catalogue — root: examples, imports, metadata and documentation for the three new primitives. Use only metadata-only registry update; public payloads stay held.
- [x] Verification — root: one combined Chromium desktop/mobile light/dark capture and interaction pass, batch corrections, one final confirmation with WebKit mobile. Check readable paint, clipping, route/CTA semantics, assembly choices, backgrounds, hover/arrow, actual scroll movement, marquee pause and reduced motion. Typecheck/lint and relevant source tests; no broad production gates.

Acceptance: explicit user issues must be findable in the running result. No claim of universal visual completion, performance benchmark or physical-device verification. Save screenshots and a concise report for review.


## Owner follow-up during live review

The owner likes the profile appearance and requests a more polished panel, dock and especially chat, better assembly transitions, and more composites. Preserve the profile artwork. Extend the studio to six kinds with a real local focus countdown and an invitation/RSVP card. Continue with installed Motion rather than adding a second animation system.

- [x] Choreography: agent_workspace owns AssemblyPart/OrganismAssembly and their styles. Guarantee quiet-mode interruption cleanup; improve gathered motion, curved travel and progressive reveal. Native roots keep their own controls after arrival.
- [x] Composite craft: docs_craft owns core composition, geometry and composition styles. Rework panel/dock/chat; add focus/invite with working local state and existing base components only.
- [x] Documentation: motion_scroll owns the two wrapper entries, examples and metadata records. Root regenerates documentation metadata once after source freeze.
- [x] Integration: root keeps the working landing, exposes ingredient links, and reviews six live compositions in the same bounded desktop/mobile batch. No publication or release builds.


## Owner follow-up: continuity and a quieter foreground

- [x] agent_workspace: gradual assembly colour handoff without a release snap; shared Glide on the chooser and standalone task press feedback.
- [x] docs_craft: native Bubble signature, send-arrow draw/check feedback, dock selection Flow.
- [x] motion_scroll: reusable ShapeArtwork, controlled shadow/outline angles and visibility, SVG download and React copy, documentation.
- [x] root: quieter and more spacious hero, stationary foreground, background-only drift, replayable scroll reveals, shared global character, native material/character/atmosphere selection groups.
- [x] root: focused integration receipts, desktop/tablet/mobile visual checks, WebKit confirmation, local README/report update. No publication.
