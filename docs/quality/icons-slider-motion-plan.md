# Icons, slider and motion controls — 2026-09-10

Rapid-fire continuation, preserving the incumbent visual world and public native-control contracts. No palette overhaul, new dependencies, commits or publication.

## Direction

Job: make small interactions tactile, legible and adjustable. One metaphor: ink under gentle tension. Icons bow at the stroke, gallery choices use compact card geometry, and a near-round slider thumb stretches along movement then settles. Quiet mode retains complete readable shapes. All appearances remain available on the docs page.

The option of merely slowing existing blob-backed icons would preserve the rejected geometry; individually redrawing 1,722 glyphs would introduce a second catalogue. Extend existing geometry and semantic motion recipes instead. Reuse InputGroup for search rather than create another field implementation.

## Work / evidence

- [ ] Icons: isolate geometry from semantic action, configurable timing/easing, card-shaped gallery hover, integrated native search/clear. Verify replay, controls, quiet/hidden cleanup and all existing names.
- [ ] Slider: circular rest silhouette, direction-aware active thumb and rail response, existing appearance compatibility and structurally different step/range/vertical examples. Verify controlled/uncontrolled, limits, keyboard, RTL, vertical and disabled/quiet behavior.
- [ ] Settings: reproduce on the real docs sheet. Fresh default Glide and Ink Drop already animate; verify persisted Flow Off and zero ghost strength rather than claim an engine failure without evidence. Correct misleading effective-state controls and provide explicit replay.
- [ ] Integration: registry/API guidance, regression ledger, focused tests, desktop/mobile light/dark image inspection, typecheck/lint/unit checks.

Separate agents own icon files and slider files. Coordinator owns shared flow/settings consumer and metadata. Existing unregistered `semantic-bloom 2` artifact remains an unrelated publication blocker; do not delete it.
