# Tree and Tabs craft: the branch ledger and the travelling sheet

Checkpoint C01-1, branch `fix/c01-1-tree-docs-rtl`, local preview only.
Pages: `http://127.0.0.1:4358/cojeev-ui/docs/tree/` and
`http://127.0.0.1:4358/cojeev-ui/docs/tabs/`. Nothing here was deployed,
merged or shown to the owner for design approval; this record hands the local
result over for that visual review.

## What the owner will see

**Tree** is now an index card with ruled guides. Each open folder draws a
hairline that drops from the folder and ends in a rounded elbow at every child;
the line stops at the last child instead of running past it. Folders read in
ink with an open or closed folder icon, files read in secondary ink with a
document icon, and one soft-pink slip with a hairline edge marks the selected
row. The default example is a calm project ledger (Field notes, drafts,
chapters, References, one disabled Locked record). Loading, empty and failed
branches are demonstrated as three separate variants, each with its own icon,
tint and, for the failure, a Retry button that resolves locally. Long file
names truncate with an ellipsis and keep their full accessible name in the
title. Controlled expansion and selection, independent row actions, retry,
disabled rows and keyboard behaviour are unchanged in contract.

**Tabs** keep six distinct treatments, each with its own travelling surface:
pills carry an ink lozenge, lenses a beige lens with a hairline edge, underline
a pink marker on a ruled baseline, notebook a paper sheet that is outlined on
three sides and open at the bottom so it joins the page below, and rail a
soft-pink index line that travels vertically. Icons, labels and counts sit on
one baseline with the shared 8px gap; counts are tabular. On phones the
notebook sheets fill the row without shrinking below their labels and the
counts step aside, as the rail's already did.

## Shared effects, and how to exercise them locally

Open either page, then press **Motion settings** in the Preview toolbar.

- **Glide and stretch** are flow characters. Under *Choose a character* pick
  Glide, then Stretch, and click rows or tabs. The slip, lozenge, lens, marker,
  sheet or index line travels from the old selection to the new one; stretch
  elongates in flight and settles. Both components register with the existing
  `useFlowGroup` machinery (`registry/cojeev/motion/flow.ts`) as a `pill`
  group (`bar` for the underline treatment), so there is one motion owner per
  list and no second animation system.
- **Ghost** is the *Pointer preview* switch. Move the pointer over an
  unselected enabled row or tab: a quiet grey preview follows it and fades when
  it leaves. It also appears on keyboard focus. Disabled rows never receive it.
  *Pointer preview strength* scales its opacity.
- **Morph** is the living edge. Under motion mode pick *Subtle* and keep the
  Buttons category on, then open the **Failed branch** variant on the Tree page:
  the Retry button carries the living contour in the notice's own ink. The
  trailing "more" action on the long file name is the shared IconButton and
  morphs with the Icons category. Rows, chevrons and tab triggers deliberately
  do not morph: the flow layer owns their selected surface, and giving the same
  element two owners would produce competing transforms.
- **Quiet modes**: Motion Off, Flow Off, `[data-flow="off"]` and the system
  reduced-motion preference all resolve to the stationary paint. The selected
  row returns to its soft-pink slip, the selected tab to its own treatment, and
  no glide layers are mounted.

## Root cause repaired in the documentation preview

The right-to-left arrow rule was written with `:dir(rtl)`, which is correct
CSS. The documentation preview never showed it because the Next.js build had no
`browserslist`, so Turbopack's Lightning CSS fell back to Next's default
targets (Chrome 64 era) and compiled every `:dir(rtl)` into a `:lang(ar, he,
…)` list, which a `dir` attribute never matches. Seven registry stylesheets use
`:dir()` (calendar, dock, living-link, native-select, stepper, table, tree), so
all of them were silently wrong in the docs. `package.json` now declares modern
targets (Chrome and Edge 120, Firefox 129, Safari 17.5), which matches the
library's real baseline (`@starting-style`, `color-mix`, `:has()`) and leaves
`:dir()` intact. The tree rule itself now reads direction from the tree
(`.v-tree:dir(rtl)`) rather than the document root, because the docs Preview
frame is a Radix Tabs root that pins `dir="ltr"` on itself.

## Verification

Focused checks only. Times are check-running time, measured with `time`,
separate from implementation and debugging.

| Check | Result | Time |
| --- | --- | --- |
| `npm run registry:build` (twice) | regenerated `registry.json`, `public/r/*` | 6s each |
| `npx tsc --noEmit` | exit 0 | 13s |
| `node --test tests/tree.test.ts` | 3 pass | 3s |
| `node --test tests/tree.browser.mjs` | 2 pass (contracts, RTL matrix, slip and ghost paint, glide and stretch travel, Flow Off and Motion Off) | 12s final run |
| `node --test tests/tabs-integration.browser.mjs` | 2 pass (light/dark pills and lenses; notebook sheet and rail line travel and stay connected) | 11s each of two runs |
| Docs matrix (Playwright against port 4358) | below | 38s + 15s + 12s |

Docs matrix facts, all on the real documentation pages:

- Mobile 390px, light and dark, both pages: zero horizontal page overflow,
  zero page errors. The notebook row no longer clips its last count.
- RTL set on the specimen: collapsed chevron mirrors, open chevron rotates,
  elbow guides swap sides, slip sits on the selected row; English file names
  keep `dir="auto"` left-to-right.
- Reduced motion: `data-motion-quiet` present, chevron transition 0s, slip on
  the clicked row within 60ms.
- Keyboard: Enter on a chevron expands; focus-visible outline 2px solid;
  ghost appears on focus; Space selects; ArrowRight moves tab selection with a
  visible outline and the sheet on the new tab; panel content follows.
- Rapid clicks (five in 200ms) with glide and with stretch, both pages: the
  layer settles on the last choice, exactly one selected row, zero errors.
- Long label: ellipsis, no overflow, full name in `title`; the slip stays
  inside the list box.
- Flow Off and Motion Off: no glide layers; selected row background is
  `--v-pink-soft`; notebook sheet background is paper.

Screenshots reviewed by eye, light and dark: `evidence/library-integration/tree/2026-09-15/`
and `evidence/library-integration/tabs/2026-09-15/`.

## Limitations, stated plainly

- **Tabs in RTL** need `dir="rtl"` on the Tabs root or a Radix
  `DirectionProvider`; the Radix root pins `dir="ltr"` otherwise. That is
  Radix behaviour and existed before this checkpoint.
- **Morph on tab triggers** stays dormant by design (the `nav` category is off
  and not exposed in the docs sheet).
- The branch reveal uses `@starting-style`; older browsers show branches
  without the fade.
- The worktree's gitignored `node_modules` symlink was replaced with an APFS
  clone so Turbopack would start; this does not touch tracked files.
- No push, pull request, deployment or owner approval.
