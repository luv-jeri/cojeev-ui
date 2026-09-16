# Cojeev UI production refinement

The owner updated the goal on 8 September 2026: retain the supplied design philosophy, refine broken or excessive motion, expand useful general-purpose variants, and publish a polished MIT registry with Fumadocs documentation built from Cojeev components. This supersedes the earlier requirement to reproduce confirmed source bugs. Historical comparisons remain evidence; an intentional, documented improvement does not have to reproduce a broken export.

## Design

Preserve the warm canvas, physical accent colors, typefaces, rounded controls and distinct nine selection characters. Use a calm, interruptible Glide by default. Moving selection indicators should carry the motion while labels remain readable and still. Expressive presets remain opt-in. Reduced motion and Off must be still without hiding content or losing state.

Documentation is a reading and experimentation surface. Keep the existing Cojeev navigation and components, improve hierarchy and touch access, and show one live configurable specimen at a time. Place variant and size controls beside the preview; copied code must reproduce that exact selection. Put motion settings within one action of every example and include an adjacent real selection example. Advanced body tuning stays available in Adjuster, with clear persistence and reset behavior.

Expand proven gaps in reusable components and examples, rather than duplicating APIs that already exist. IconButton is already implemented and needs a proper catalog presence. Research recommendations must identify current missing behavior and cite primary documentation. No private product screens belong in this public release.

## Parallel implementation plan

- [x] Motion quality: `motion/flow.ts`, `flow-press.ts`, `use-flow.ts`, `settings.ts`, Flow styles/tokens and Tabs integration. Capture the current real Tabs behavior once, correct stacked motion and interruption, validate nine choices and pointer/keyboard/touch. Owner: motion delivery.
- [x] Motion stillness: `motion/use-morph.ts`. Preserve authored spinner fill under reduced motion; stop deformation, rotation and color cycling under Off; verify live preference changes and cleanup. Owner: composed delivery.
- [x] Documentation experience: `components/component-preview.tsx`, `components/docs-shell.tsx`, `app/docs/*`, Preview and Adjuster exports. One specimen with variant/size controls, exact code, visible motion panel with all nine presets, correct landmarks and current-page navigation, usable mobile layout. Owner: root.
- [x] Catalog and primary-source research: identify useful missing general-purpose components and improve discoverability of existing IconButton treatments. Preserve public API compatibility and track additions separately from the original 66. Owner: interactive delivery; implementation scope follows its concrete gap report.
- [x] Release: rebuild the registry, run focused behavior/type/lint/build checks, one desktop/mobile visual review and one confirmation after corrections, fresh outside-consumer installation, repository/licence review, publish GitHub Pages and verify public URLs and public installation. Owner: root.

## Release evidence

Keep the original per-component fidelity checklist with its historical failures. Add a refinement log explaining intentional changes and their user-facing benefit. Require working selection, open/close and focus return, accessible names, keyboard and touch, light/dark themes, reduced motion, and responsive examples. Use focused regression checks when a behavior changes; do not repeat an exhaustive source matrix merely to chase an original bug or a frozen-clock artifact.

The public release must include a licence file, font notices, install instructions, generated dependencies, a complete catalog, usable examples and API documentation, passing build/CI and a successful install from the deployed registry. Completed release evidence is recorded in RELEASE-REPORT.md.

The scope now includes Backgrounds, 3D, Effects and Creative categories. Seven new entries extend the base without changing its visual family. The owner explicitly requests natural, polished motion with stable layout and committed progress. All integrations are saved in local Git checkpoints; public publication passed the production and consumer gates.
