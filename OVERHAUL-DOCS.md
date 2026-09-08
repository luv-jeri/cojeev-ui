# Documentation composition overhaul

September 8, 2026. Implemented within the documentation work stream in `OVERHAUL-PLAN.md`. Fumadocs remains the page/provider foundation, with visible controls composed from registry components.

## Composition

- The 232px navigation rail shares the warm paper canvas. A fine divider, smaller category labels and soft selection replace the large dark panel. Search remains labelled, and filtered results now expose a clear-search action and result status.
- The navigation scroll region uses the registry `ScrollArea`; its root fills the available rail height with no surrounding frame. The semantic `SidebarContent` navigation remains inside the viewport.
- Titles use the existing Bricolage face; category badges sit beside the title. DM Sans reading measure, section spacing and API group rhythm distinguish the specimen, installation, usage, API and accessibility material.
- A sticky local contents rail appears from 1280px. At 900px and below, Browse reveals navigation in the document flow. Opening focuses search; Escape closes the menu and restores Browse focus unless another control has already handled the key.
- The live specimen is one framed composition: Preview/Code tabs, copy, integrated variant/size controls, motion settings, reset and canvas. Entries with no selectable variant or size place Motion/Reset in the top toolbar and omit the extra controls row. Narrow screens wrap the toolbar and place labels above full-width selectors.
- The title/category row and shorter specimen header bring the example closer to the first viewport. The repeated instruction under “Try it” was removed after the first rendered review identified unnecessary vertical cost.
- No page-load animation or hidden initial reading state was added. Existing selection, shape and example motion remain owned by the library.

## Changed files

| File | Change |
| --- | --- |
| `components/docs-shell.tsx` | Quiet navigation composition, registry ScrollArea, search recovery, mobile focus restoration and source footer |
| `components/component-preview.tsx` | Integrates controls/actions with Preview while retaining selected source, variant/size state, reset and Suspense fallback |
| `app/docs/docs.css` | Documentation-only layout, type hierarchy, rail roles, controls, responsive arrangements and local contents styles |
| `app/docs/[component]/page.tsx` | Article/contents composition, title/category row, installation before usage, anchor targets and API grouping |
| `registry/sahajiv/ui/preview.tsx` | Backward-compatible optional `controls` and `actions` ReactNode slots plus named frame/toolbar/panel subparts |
| `registry/sahajiv/styles/preview.css` | Installable integrated specimen frame, canvas and responsive toolbar styles |

## Evidence and limits

- Read local Next.js CSS and Server/Client Component guides before changes.
- Typecheck passed before the first rendered review and again after the vertical-density correction and new Preview action slot.
- `git diff --check` passed for all six implementation files after compaction.
- The Impeccable mechanical detector returned `[]` on the initial finished implementation. Subsequent edits address the single visual review’s vertical-density finding; the detector was not rerun as an equivalent verification loop.
- Parent’s first rendered inspection described the layout as clearer and measured the old specimen content at approximately y603 on a 1280×720 viewport. The resulting correction consolidates the category/title row, removes the redundant instruction, shortens specimen padding and removes the controls row when selectors are absent.
- Final screenshots and exact post-correction placement, dark theme contrast, mobile/320px wrapping, pointer and keyboard behavior, scrolling/drag behavior, code copying and reduced-motion/Off runtime behavior remain part of the parent’s bounded integration review. Source/type checks do not establish those visual and interaction results.
- No build, registry generation, metadata changes, package changes, commits or publication were performed by this work stream. Registry regeneration must include the new Preview props.

## Focused confirmation targets

1. A page with variant and size selectors, plus one without selectors, at desktop and mobile widths; verify all actions and copy/source parity.
2. Browse → search → clear → Escape, plus navigation through the scroll viewport. Ensure the upgraded fluid thumb is visible and draggable when content overflows.
3. Local contents anchors and long API tables, including 320px horizontal access without document overflow.
4. Light/dark navigation and specimen contrast; reduced motion/Off keeps reading visible and controls functional.
