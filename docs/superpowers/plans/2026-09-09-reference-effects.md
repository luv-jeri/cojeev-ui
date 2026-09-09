# Reference effects implementation plan

**Goal:** Add all 41 requested reference-inspired variants to the Cojeev component registry, with real previews, installable source, usable motion controls, and an explicit landing-page recommendation for each.

**Architecture:** Preserve the incumbent design world. New entries use existing motion visibility/settings, shared tokens, React and SVG/canvas where the mechanism requires them. Adapt the interaction idea in original source rather than importing a foreign theme. Reuse existing TextRibbon/WordRelay/TextReveal primitives where they already provide the requested mechanism. No dependency additions are planned.

**Authority:** The attached objective authorizes implementation and design adaptation. Continue autonomously within that scope. This heavily dirty feature checkout contains the live library and must be preserved: no staging, commits, cleanup, or replacement of unrelated work. Board health has no active agents or path holds; it has no inbox marker. Root owns integration; task implementers own only their named new paths.

## Design contract

Warm paper, precise ink, living contours. Typography stays Bricolage/DM Sans. Color comes from the existing pink, olive, blue and yellow tokens. Effects have finite or pausable movement; hidden/offscreen/quiet settings stop work. Essential content remains available to assistive technology and in still mode. Pointer decoration stays inside its own stage and never hides the native cursor. Touch retains page scrolling. Galleries expose keyboard-operable navigation and true selected states.

Duplicate audit: reuse TextRibbon for Text Loop, Circular Text and Curved Loop; reuse TextReveal for Split Text; combine Text Pressure and Variable Proximity in one new component. No aliases. The recommended landing sequence uses one headline effect (existing TextReveal), Scroll Reveal for the narrative, Scroll Expand for a feature demonstration, and Accordion Gallery for component discovery. Wave Wipe can bridge one scene. Heavy decorative loops belong in an optional playground. The existing landing route is not being redesigned; this task supplies components and concrete placement guidance.

## Task 1: Typography (14 references, 9 new entries)

- [x] Inspect supplied public references and incumbent text primitives.
- [x] Build `typography-vortex`, `text-loop`, `particle-text`, `warp-text`, `split-text`, `circular-text`, `text-pressure`, `curved-loop`, `falling-text`, `scroll-reveal`, `variable-proximity`, `word-stream`, `caret-swap`, `zoom-words`.
- [x] Own only corresponding `registry/cojeev/ui/<id>.tsx`, `styles/<id>.css`, unique `lib/reference-text-*` helpers, `components/examples/reference-typography.tsx`, `tests/reference-typography.test.ts`, and `verification/reference-typography.json` metadata/report.
- [x] Export PascalCase named components and `<PascalCase>Example` functions. Real configurable component APIs; examples receive `{variant?:string,size?:string}`. Pausable/replay controls use the existing Button. Each stage exposes `data-slot="<id>"` and meaningful `data-running` or `data-state` attributes. Use `useMotionVisibility` for shared quiet settings.
- [x] Metadata report is an array of `{id,name,category,variants,sizes,states,description,usage,accessibility,related,reference,landing,notes}`. Use Typography category. Include actual source observations and honest limitations.
- [x] First write focused tests for risky contracts (readable still content, controlled values, grapheme safety, bounds). Run failing then passing checks; root owns browser acceptance.

## Task 2: Pointer and field effects (13 entries, root)

Duplicate audit: source contracts confirm these mechanisms are missing. Existing FlowSculpture, SemanticBloom, GuidedPointer, AmbientBackground and Presence are related but serve distinct content/interaction contracts. Exact evidence is recorded per row in verification/reference-effects.json.

- [x] Inspect references for `scroll-expand`, `ripple-distortion`, `elastic-mesh`, `swarm-cursor`, `pixel-swap`, `orbit-images`, `target-cursor`, `magic-rings`, `ghost-cursor`, `click-spark`, `strands`, `image-trail`, `meta-balls`.
- [x] Implement each in a named registry UI/CSS file with original mechanisms, scoped pointer events, bounded arrays, resize handling and cleanup. Reuse a shared effect runtime only across actual callers. Swarm must paint on pointer movement at every viewport width without external assets or global event interception.
- [x] Add `components/examples/reference-effects.tsx`, meaningful geometry/runtime tests and per-entry source/placement metadata.

## Task 3: Galleries and transitions (6 entries)

- [x] Inspect references and build `infinite-spiral`, `accordion-gallery`, `option-wheel`, `grain-dissolve`, `wave-wipe`, `dither-dissolve`.
- [x] Own corresponding new UI/CSS, unique `lib/reference-gallery-*` helpers, `components/examples/reference-galleries.tsx`, tests and `verification/reference-galleries.json`. Same metadata and named-export contract as Task 1.
- [x] Gallery content is supplied through props, transitions wrap caller content and handle interrupted changes. Controls are operable with keyboard/touch; outgoing content must not retain tab stops. Reduced motion settles immediately. Illustrative artwork uses local existing assets.

## Task 4: Registry, docs and verification (root)

- [x] Merge entries into additions/guides, example index/manifest, CSS imports and generated registry. Preserve existing content. Source extraction must produce copyable examples.
- [x] Add a single complete reference coverage/landing guide with 41 rows and a bounded verification ledger.
- [x] Run typecheck, lint, unit tests, example extraction, registry build and production build. Diagnose actual new failures without unrelated refactoring.
- [x] Exercise every entry in real browser at desktop and mobile, pointer plus keyboard on interactive components, theme and reduced motion. Capture evidence. Check motion changes and stop behavior, not merely element existence.
- [x] One batched visual inspection, one material fix batch, one confirmation. Independent final review of this task's files and screenshots; resolve material findings. Summarize evidence and any remaining limits honestly.

## Updated scope and verification state

The final objective adds Portal Field, Article Headings, Motion Drawer, Linear Modal, Image Masking, Clip Path, Buy Me Coffee and Swapy. These add seven registry entries: Clip Path is the clip method of Image Masking. Total: 41 references, 35 new entries, six consolidated mappings. Each entry is assigned an existing category.

Implementation, source inspection, first browser pass and independent reviews are complete. Production rebuild, fresh consumer installation and browser confirmations are complete. Receipts and adaptation limits are recorded in verification/reference-effects-final.md.
