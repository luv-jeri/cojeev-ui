# First expansion batch — local review

The local catalogue grew from 106 to **113 entries**. This is the first implementation slice of the 613-entry, four-source expansion, not completion of that goal. Release builds, installs, commits, pushes and publication remain on hold for owner review.

## Added and improved

- **Word Relay:** stable phrase changes, opt-in cycling, pointer/focus pause, interrupted-change settling, responsive wrapping and shared quiet settings.
- **Text Reveal:** word/grapheme segmentation, rise/fade/soften/fold, direction and bounded stagger. Complete accessible text remains available.
- **Reading Trail:** native section links, current-section feedback and actual progress. Also used in the documentation contents rail.
- **Living Link:** original ink emphasis and a directional cue with pointer/focus parity and native link behavior.
- **Milestone Path:** a supplied-data journey composed from native Stepper parts, typography, Badge and Button.
- **Activity Feed:** supplied chronology composed from native Item, Avatar, Badge and Presence, with explicit progressive reveal and focus management.
- **Pigment Field / Contour Field:** original GPU backgrounds with native palette colors, bounded buffers, static fallback, pause, context recovery and shared motion lifecycle. Example text sits on an opaque native Card for contrast.

The seven additions have local documentation and runnable examples. Their pages say **Local review** and omit unpublished registry installation commands. Existing component installation sections remain intact.

## Source comparison and limits

Discovery covers Skiper 106, Remocn 301 (296 components and five helpers), Canvas 35 and React Bits 171. Framework/language variants are deduplicated. Each source entry has its own record in `reference/expansion/coverage.json`.

The first completed core adaptation is React Bits Blur Text → Text Reveal's soften variant. Other first-batch mappings remain partial: automatic line segmentation for Split Text, character choreography/imperative controls for Rotating Text, Skiper's scrollbar hover/drag treatment, and the complete CSS link treatment set. Milestone Path adapts related checklist/onboarding ideas; Activity Feed has no direct source equivalent. The shader fields are original foundation work and do **not** close Canvas UI effect rows.

React Bits and Canvas source licenses prohibit redistributing their components/ports; Skiper does not supply a verified MIT redistribution grant. This batch uses original source and geometry. Upstream research captures retain their own provenance, are excluded from Git by the receipts ignore rule, and are absent from registry payloads. Remocn source/dependency terms are documented separately. No dependency was added.

## Verification

- Project TypeScript and lint passed after first-batch integration.
- Copied examples: eight defaults and **24 snippets**, covering the documented variants/sizes, passed with zero TypeScript diagnostics (`output/playwright/expansion/examples.json`).
- Live docs: eight routes at 1440px light and 390px dark, **16 checks passed**; HTTP 200, no captured page errors, no horizontal overflow. This is not a full width × theme matrix.
- Text: Chromium desktop/mobile and mobile WebKit passed phrase interpolation, stable layout, rapid retargeting, blur settling, Unicode graphemes, automatic/hover pause, quiet/offscreen behavior, long/RTL input, empty input and invalid index.
- Reading/link: focused runtime and four tests passed. A nested navigation bug was reproduced (outer page moved 650→1055px), then fixed. Chromium/WebKit in normal/reduced motion now retain outer position at 650px while correctly scrolling the inner panel, including border, scroll-padding and scroll-margin offsets.
- Activity/milestones: six focused tests and four browser contexts passed, including keyboard selection, completion/restart, reveal focus, new supplied entries, mobile, RTL and quiet settings. The composite disables its non-selection group glider; this does not claim a base Stepper RTL fix.
- Shader fields: three focused tests and 16 browser checks passed, including WebGL failure/context recovery, unmount/StrictMode, mobile, quiet/offscreen behavior and real sibling controls. Body contrast measured **9.00:1 light / 8.61:1 dark** after adding the native Card. Natural browser-tab hiding was not successfully exercised; its code path is present but runtime verification is still a limit.

The bounded finish review is `.work/expansion/finish-review.md`. Its sole actionable finding was the scoped Reading Trail navigation issue, now fixed and verified. Final field screenshots and contrast measurements are under `reference/expansion/canvas/receipts/fields-surface-*`. Some earlier docs captures precede the field/number-width fixes; those are supported by the component-specific final receipts.

This report describes the first batch before subsequent typography/icon/glyph and documentation work. It does not certify every source variant, a physical iPhone, a performance benchmark, a production build, or publication.
