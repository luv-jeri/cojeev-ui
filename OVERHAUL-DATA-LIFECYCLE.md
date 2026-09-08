# Data and command lifecycle confirmation

## Result

DataTable now retains removed rows and its empty state at real, persistent presence boundaries. Pagination does the same for its generated page buttons and ellipses. Command and Combobox preserve cmdk's native filtering and selection, with a coordinated transition on the persistent results surface.

**Explicit exception:** cmdk-filtered Item and Empty content is still removed immediately. The results transition does not claim per-item exit retention or universal lifecycle coverage.

## Frozen implementation

- [DataTable](registry/sahajiv/ui/data-table.tsx): source rows receive identities before filtering, sorting or page slicing. `getRowId(row, index)` receives the source-data index; the fallback is that same index. Callers inserting or reordering source data should provide stable IDs. The existing callback/API surface otherwise stays unchanged. A persistent MotionPresence inside TableBody owns keyed MotionSurface children using `asChild` on TableRow. The DOM remains `tbody > tr > td`; the bounded sibling fade delay uses the shared stagger. A second persistent boundary retains DataTableEmpty. Sorting, filter/page callbacks and nested row-action guards remain in place.
- [Pagination](registry/sahajiv/ui/pagination.tsx): generated pages use `page:number` keys; each gap uses both neighboring page numbers. The persistent boundary owns buttons and ellipses separately. A retained link clears its active/current state through `useIsPresent`, preventing stale selection paint. Previous/Next and page-status text remain persistent; caller-supplied children retain their existing ownership contract.
- [Command](registry/sahajiv/ui/command.tsx): `useCommandResultsMotion` observes actual cmdk option IDs/order and Empty membership. A membership change uses the shared quick duration/entrance easing to settle the results opacity from 0.86 to 1. It does not react to label-only changes. Quiet settings immediately settle the motion lane. Item registration, keywords, filter callbacks, ranking, forceMount, refs and keyboard selection remain owned by cmdk. Plain string/number item content is marked for its own text-column geometry.
- [Combobox](registry/sahajiv/ui/combobox.tsx): reuses the Command results hook through its existing content-ref chain. Its selection callbacks, query/input behavior, portal appearance and dismissal remain intact.
- [Command styles](registry/sahajiv/styles/command.css): the internal list-sizer is an actual grid box so its opacity visibly affects results. Groups retain their semantic DOM and contents layout. Plain-text items get a flexible text column plus a dedicated trailing hint column; the Enter hint no longer overlaps the label. The shared results class carries the component-local opacity property.
- [Runnable browser proof](scripts/check-overhaul-data-lifecycle.mjs): contains one in-memory React fixture built from repository-relative source imports. It uses the existing docs stylesheet and writes only receipts/screenshots to the selected output directory. No fixture route, Next build or registry regeneration is performed.

Added source dependencies are DataTable/Pagination → Presence, DataTable → Choreography, Command → Choreography/Refs, and Combobox → Command. No Table primitive, shared motion, product documentation or other audit report was edited in this stream. DataTable and Pagination styles did not need changes.

## Reproducible evidence

With a running docs server:

```sh
node scripts/check-overhaul-data-lifecycle.mjs --url=http://127.0.0.1:4320/sahajiv-ui
node scripts/check-overhaul-data-lifecycle.mjs --url=http://127.0.0.1:4320/sahajiv-ui --only=followup --output=output/playwright/data-table-lifecycle-followup
npx tsc --noEmit --incremental false
```

The script was promoted to its final descriptive filename after verification; it was not rerun solely for that rename.

| Workflow | Evidence at 390px dark and 1440px light |
| --- | --- |
| Row actions | Native row pointer and Enter each invoke the row callback; nested button pointer and Enter invoke only their own callback. |
| Table membership | Rapid filter and page reversal retains inert, aria-hidden semantic rows and returns to the correct keyed row set without duplicates. |
| Identity / sorting | `getRowId` source index stays correct across filtering and descending sorting; fallback indexes remain distinct across pages and filters. |
| Empty state | Appears at its real conditional boundary; Clear filters retains an inert, aria-hidden empty surface for exit, then removes it. |
| Pagination | Page buttons and gap spans are retained separately; rapid reversal settles correctly. A follow-up verifies an exiting formerly-current page clears `aria-current`. |
| Command | Native pointer and ArrowDown/Enter selection, keyword matching, forced item retention, custom enabled-item ranking and `shouldFilter=false` behavior pass. Label-only updates do not restart results motion. |
| Combobox | Native query filtering, Enter selection, pointer selection, empty results and Escape dismissal pass. |
| Quiet behavior | Motion Off and system reduced motion produce immediate table/empty membership updates and no retained Pagination delay; Command/Combobox results opacity settles immediately to 1. |
| Geometry / visuals | No page overflow in the fixture. All eight main screenshots and both final Command correction screenshots were opened and inspected. Final Command text/hint geometry and real container paint were measured separately. |

Receipts: combined results (`output/playwright/data-table-lifecycle/results.json`, local artifact) and targeted final results (`output/playwright/data-table-lifecycle-followup/results.json`, local artifact). The combined run passed both contexts with zero browser errors. The targeted final run passed both contexts with zero browser errors; it records the visible container box, intermediate opacity, separated label/hint geometry and cleared current state on exiting links. Final focused TypeScript checking passed.

## cmdk boundary and remaining scope

The installed cmdk Item performs filtering inside its own component and returns null for unmatched results. Empty also makes its own null/render decision. Wrapping those components externally cannot retain their hidden DOM, and forcing Item to mount bypasses its normal registration. A `shouldFilter=false` replacement would need to own registration, inferred values/keywords, grouped ranking, forceMount and selection across arbitrary nested children. That would be a filtering architecture rewrite, not a safe presence wrapper.

This change therefore uses the explicitly accepted persistent-results transition. It preserves immediate semantic filtering and cmdk selection. Per-item and Empty exits remain the stated exception. Their public API semantics were checked in the real fixture rather than replaced with a simplified imitation.

This proof uses Chromium and current local source. It does not establish a fresh consumer installation, a full production build, WebKit parity or every user-defined cell/filter implementation. Those release gates remain separate.
