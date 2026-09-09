# Final expansion checkpoint

Expansion was stopped by the owner on 2026-09-09. This closes the existing work at **124 native UI entries**, including **18 additions since the four-source request**. No remaining source inventory is scheduled for cloning. Publication is authorized; see [the release record](RELEASE-0.2.0.md).

This checkpoint adds Writing Caret, Guided Pointer, Glass Sculpture, Flow Sculpture, Particle Sculpture and Number Input to the previous 118-entry checkpoint. Animated Number, Text Ribbon and Marquee receive the existing numeric and typographic-loop improvements. These are original native implementations with documented source differences, not claims of identical upstream code or APIs.

## Verification

- All 124 UI entries install through the shadcn CLI into an external consumer, import, pass TypeScript and build; 112 installed CSS files preserve their exact authored bytes and layers. The browser loads every module and exercises the selected installed controls.
- All 524 copied snippets, including documented variants and sizes, compile with zero TypeScript diagnostics. The earlier compilation preceded private helper renames; public component imports and examples remain unchanged. The release workflow repeats this check against the release commit.
- 114 unit tests pass. Production lint passes; forbidden importance flags were replaced with explicit CSS ownership and quiet/fallback states were checked again.
- Text Ribbon and Marquee: Chromium and WebKit at 1440 and 390 pixels cover paths, drag/keyboard control, pace changes, real scroll reversal, interaction/static mode and lifecycle. Final Marquee follow-up verifies both projected edges across the loop seam, attribute changes and all inert copies.
- Numeric family: four browser contexts, signed/localized values, interruption, native edits, form behavior, IME and quiet/visibility cases. Sculpture materials: geometry intake, fallback/context restoration, pointer responses, offscreen/hidden/quiet lifecycle and forced colors. Guidance primitives: finite blink, continuous retargeting, local/global quiet and cleanup.
- A real fresh install exposed a shadcn basename collision between private helpers and public UI entries. The three helpers now have distinct names; a registry guard prevents reintroducing the collision. Optional sculpture runtime/type dependencies are pinned and included.

The historical source ledger now records **169 verified useful core interpretations**, two partially matched concepts, and 442 unimplemented comparisons. The latter 444 rows are deferred. Reading Trail does not reproduce the source scrollbar's drag/preview behavior; Glyph Sculpture does not claim exact source glyph matching. These limits do not indicate missing dependencies or unfinished published component APIs.

Detailed local receipts remain in the checkpoint's evidence paths. Source captures keep their own upstream terms and are excluded from the public implementation. Release browser/installation evidence is separate from a claim of exhaustive physical-device or exact source-parity verification.
