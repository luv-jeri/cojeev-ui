# Bounded long-content consumer pass

Completed 2026-09-08. Scope: fourteen consumer compositions at 320px, light and dark, using real registry primitives and the existing running docs CSS. The fixture supplies 205 characters of prose and a 186-character unbroken filename. No production/registry build or shared example edit was performed by this stream.

## Four concrete corrections

| File | Reproduced defect | Correction |
| --- | --- | --- |
| `registry/sahajiv/styles/item.css` | Description's unbroken filename forced the inner grid track beyond the row; page expanded to 1223px. | Description gets `min-width:0` and `overflow-wrap:anywhere`. Existing selected Disk foreground is preserved. |
| `registry/sahajiv/styles/attachment.css` | An AttachmentName nested in a body div remained inline, so ellipsis did not apply; page expanded to 1592px. | Name is a block with `max-width:100%`, preserving its existing ellipsis and full DOM text. |
| `registry/sahajiv/styles/input-group.css` | Long InputGroupText expanded beyond the multiline composer; page expanded to 1317px. | Helper text gets bounded width and unbroken-word wrapping. |
| `registry/sahajiv/styles/alert.css` | Inner grid track expanded behind the Alert's clipped surface, hiding most prose despite correct outer width. This was found in screenshot review. | Body uses `minmax(0,1fr)`; title and description wrap long words. |

These are the only product source files changed during this pass. Sources were frozen after the Alert correction.

## Per-entry evidence

Every row below was rendered in both themes at 320px. Final light and dark screenshots were inspected, including the corrected Alert and multiline controls scrolled to the filename's end.

| Composition | Observed result and interaction evidence |
| --- | --- |
| Card | Long title and descriptions wrap; footer action is reachable and activates by pointer and Enter. |
| Alert | Complete prose and filename wrap inside the body after correction; action remains reachable and activates by pointer and Enter. |
| Empty | Long description wraps inside the centered composition; action activates by pointer and Enter. |
| Bubble | Prose and unbroken filename wrap inside a real BubbleRow/BubbleContent composition. No action is supplied by this passive primitive. |
| Message | Bubble and provenance text wrap; composed action activates by pointer and Enter. |
| Item | Description wraps after correction; title retains its deliberate two-line clamp. Full filename remains in the button's accessible snapshot; row activates by pointer and Enter. |
| Attachment | Name ellipsis works in the nested body composition. Full name remains in DOM text, explicit title, and the action's accessible label. Open action activates by pointer and Enter. Long metadata wraps. |
| Field | Long help and error text wrap. Input references both description IDs through `aria-describedby`. |
| InputGroup multiline | Textarea and helper prose stay bounded; filename wraps. Arrow keys reach character 392 and scroll the inner control by 193px; footer action activates by pointer and Enter. |
| Textarea | Long content wraps without horizontal overflow. Arrow keys reach character 392 and scroll by 180px; final filename text is visible. |
| Table | Intentional horizontal table overflow is contained in TableContainer. Keyboard scrolling works, and focusing the last-column action brings it into view; pointer and Enter activate it. |
| DataTable | Same contained horizontal overflow and reachable last-column action; footer remains inside the viewport. |
| DropdownMenu | Open long label and filename wrap in the bounded popup; keyboard reaches and activates the following Continue item. |
| Tooltip | Full long label and filename render in a bounded popup on keyboard focus. Tooltip retains the full text and dismisses with Escape. |

## Reusable gate and recorded runs

Added `scripts/check-overhaul-long-content.mjs`. It bundles only an isolated in-memory React consumer with esbuild, loads CSS links from the running docs page, and mounts each case on a separate audit route. It writes its fixture source, screenshots, and result records to the selected artifact folder. It does not generate the registry or build Next.

```sh
rtk proxy node scripts/check-overhaul-long-content.mjs --url=http://127.0.0.1:4320/sahajiv-ui --output=output/playwright/overhaul-long-content/verified
```

The gate checks outer viewport width, actual text ranges against the owning element **and the surface bounds**, accessible filename retention for deliberate truncation, table scrolling, multiline caret/scroll reachability, and the stated actions. Text-range measurement excludes morph decorations; their painted overhang must not be mistaken for clipped text.

- Initial artifact root preserves the three overflowing layouts and the early overly broad `scrollWidth` probe failures caused by decorative morph geometry.
- `output/playwright/overhaul-long-content/final/` is the intermediate 28/28 numeric run. Its Alert screenshots revealed the hidden text that required the fourth correction, so it is not final acceptance evidence.
- `output/playwright/overhaul-long-content/verified/results.json`: 24/28 passed with the corrected Alert and stronger text-range probe. The four multiline cases failed only the platform-specific `ControlOrMeta+End` shortcut assumption; it left the caret at zero.
- Replacing that shortcut with real ArrowDown navigation, `output/playwright/overhaul-long-content/multiline-final/results.json`: 4/4 passed. The caret reached the full 392-character value in both controls/themes, with no horizontal scrolling. `*-end-320-*.png` records the revealed end state.
- Every one of the 28 specified cases therefore has a successful final-behavior record across the last two runs. Earlier failures are retained rather than relabeled.
- `rtk git diff --check` passed after all four CSS corrections.

This pass does not claim exhaustive long-copy coverage for every registry variant, native screen-reader hardware, or every browser engine. It covers precisely the compositions and interactions listed above. Parent owns the refreshed registry consumer snapshot for `alert`, `attachment`, `input-group`, and `item` and the final integrated build.
