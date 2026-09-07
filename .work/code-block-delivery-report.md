# CodeBlock and example delivery

New public entry: `code-block`. Exports `CodeBlock`, `CodeBlockProps`, `CopyButton`, and `CopyButtonProps` from `registry/sahajiv/ui/code-block.tsx`, with same-name scoped CSS. No new npm dependency; sibling dependencies are Button and Typography, plus the existing cn utility.

CodeBlock takes `code: string`, optional `language`, visible `title`, and `wrap` (default false), plus native figure props except children/title. It renders actual text in a focusable pre/code surface. Language is a label, not simulated syntax highlighting. Long content scrolls within 24rem; wrapping uses pre-wrap and does not change copied text. Native ref/className are forwarded.

CopyButton takes Button props plus required `code`; children can remain `Copy code` or `Copy command`. Default labels are Copy / Copying… / Copied. Live success is exactly `Copied to clipboard.` Failure says `Copy unavailable. Select the text and copy it manually.` Caller onClick runs first and preventDefault cancels copying. Pending actions are guarded; aria-busy/aria-disabled communicate pending without removing focus. Actual disabled remains respected. Source changes do not show stale success.

Copy first tries the Clipboard API, then a temporary read-only textarea and execCommand(copy). The textarea stays inside the control's DOM tree, including modal focus scopes. Fallback removes the temporary control, restores focus, restores document/contenteditable selection, then restores a native input selection range/direction (document restoration can reset native selection), and restores window scroll. A false copy result never produces success feedback. Both failure paths leave source text available for manual selection.

## Root integration

- Add `code-block` helper metadata: name `Code block`, variants `[]`, sizes `[]`, states `rest`, `copying`, `copied`, `error`. The `wrap` API is a boolean, not an invented source variant.
- Add `CodeBlockExample` in `components/examples/static.tsx` to the example manifest/index mapping. Its entire state and source string are inside that function, so the existing source extractor remains sufficient.
- Import `styles/code-block.css` into app styles in the component/state layer. Registry builder handles the same-name sidecar and Button/Typography dependencies once metadata exists.
- Preview/InstallCommand should consume CodeBlock/CopyButton as desired. This delivery does not modify either, the builder, docs shell, MotionControls, or catalog infrastructure.

## Existing examples improved

ButtonExample keeps chosen variant/size, one actionable Button, and one static disabled Button. `Add a note` becomes disabled/loading `Adding…`, with `Running the local example…`; after 650ms success increments a count and reports `1 note added in this example.` `Example outcome` select accepts success/error; error produces `Retry example` and `The example action failed. Choose Success and retry.` Retry with success increments the count. The example explicitly says it only updates this page. Timer cleanup handles unmount.

IconExample exposes all existing six IconButton treatments (default/dashed/ink/pink/beige/cream) and four sizes (default/sm/lg/xl) through `Button style` and `Button size` controls, mounting one active and one disabled example rather than all combinations. `Save example` toggles aria-pressed and star/check with live result `Example saved on this page.` The disabled action is `Unavailable settings`. Decorative Disk remains distinct; searchable glyph catalog remains below. No duplicate icon primitive or icon-button registry entry was added.

## Focused evidence

`.work/verify-code-block.mjs` and `.work/code-block-fixture.tsx` exercise production components in an isolated Vite/Chromium page on port4351. `.work/code-block-verification.json` records seven passing behavior/geometry checks with zero page errors, 2026-09-07T21:17:34.074Z–21:17:37.328Z.

- Real Clipboard API copies exact multiline text.
- With Clipboard API unavailable, real execCommand copies the text; active input focus and backward selection range survive.
- Contenteditable focus and document selection survive fallback.
- API rejection falls back to real copy.
- API plus execCommand failure reports manual-copy guidance; source remains unchanged.
- Temporary textarea cleanup is verified.
- Long code remains bounded, without page overflow, at360/1440 in light/dark; wrap is opt-in.

The test first failed because CodeBlock did not exist. Its first working-browser run then exposed a real input-selection restoration bug; the corrected restoration order passes. Test-server PostCSS/preamble configuration failures were tooling setup errors and were resolved before evidence was collected. Clipboard absence/rejection is simulated at the platform API boundary; actual execCommand and clipboard contents are verified in Chromium. Physical iPhone Safari was not run, so this is not a device-specific success claim. Dark screenshot was inspected at `artifacts/code-block/code-block-1440-dark.png`.

TypeScript passed for registry source plus static examples (`.work/tsconfig-code-block.json`). ESLint passed for code-block.tsx and static.tsx. The unchanged interactive gate typecheck also passed. Root owns the Button/Icon docs behavior sweep; no full browser gate or source-baseline matrix was repeated.
