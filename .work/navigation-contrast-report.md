# Navigation contrast corrections

Two-file scope: `registry/sahajiv/styles/navigation-menu.css` and `registry/sahajiv/styles/sidebar.css`. Base worktree `35ad091`; both target styles matched main before editing. No markup, shared styles, reference files, registry, or server changes.

## Confirmed causes and scoped corrections

- `navigation-menu.css:106–109`: the later count rule used `--v-text`, overriding the same component's earlier `--v-on-accent` declaration. In dark docs this computed to `rgb(246,239,226)` on pink `rgb(245,184,219)`, **1.44:1**. The count now consistently uses existing `--v-on-accent`, `rgb(17,17,17)`, **11.48:1**. Light count remains dark and readable (11.91→11.48:1 due the fixed accent ink token).
- `sidebar.css:92–95`: the broad dark rail icon rule assigned the collapse chevron `--structure-text`, `rgb(222,214,198)`, even though its own button stays pink. That yielded **1.14:1**. A dark selector scoped to the SidebarTrigger icon restores existing `--v-on-accent`, **11.48:1**, in expanded and collapsed states. The light trigger is unchanged.

## Focused evidence

Isolated Playwright Chromium at 1440×1100 against actual main docs port 4320. Used the rendered appearance select, Notes/Ideas selection, inactive Archive hover, and Sidebar collapse/expand controls in both themes. Candidate entire CSS was appended in the same `sahajiv-states` layer; source/server files were not changed. Unlike the preceding Card test, no original rules needed removal because these fixes preserve the relevant existing selector order or add a narrower override.

**12 state snapshots, 20 target contrast samples: all pass 4.5:1; minimum 11.48:1. Zero page errors.** Before/after item, selected label/icon, and available muted group/footer colors compare exactly equal. Collapse state and subsequent expansion both operated. Inspected actual dark NavigationMenu and Sidebar screenshots; pink count text and collapse chevron are visibly dark.

Reproducer: `.work/verify-navigation-contrast.mjs`. Raw before/after values, state checks and errors: `.work/navigation-contrast-receipt.json`. Local screenshots: `artifacts/navigation-contrast/{navigation-menu,sidebar}-{light,dark}.png` (generated, not committed). `git diff --check` passed. Root's rebuilt registry/docs release pass will provide final integration confirmation. No mobile, all-variant or full-library accessibility claim.
