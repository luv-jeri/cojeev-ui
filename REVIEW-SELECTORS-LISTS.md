# Selector and list review

Implemented and frozen for the current local review. No production build, registry generation, consumer audit, commit, push, or publishing action was performed in this pass.

## Selector API

Checkbox, RadioGroup, and RadioGroupItem now accept:

```tsx
size?: "sm" | "default" | "lg" | number
indicator?: "auto" | "dot" | "check" | "diamond" | "flower"
showIndicator?: boolean
```

- Sizes are 20, 28, and 36 px. Numeric sizes clamp to **16–64 px**; non-finite values resolve to 28 px.
- Label rows retain a minimum height of **44 px**. Visual size does not reduce that height.
- `auto` keeps the Checkbox check and Radio dot. The other marks work in either family.
- `showIndicator={false}` removes the inner mark. Checked state still fills the outer silhouette and increases its outline to 2.5 px.
- RadioGroup settings inherit into items; an item can override them.
- QuestionnaireOptions and QuestionnaireOption expose the equivalent `selectorSize`, `selectorIndicator`, and `showSelectorIndicator` properties, with group inheritance and option overrides.
- The default outer shape remains `organic`: a subtly modified circle. Removing the fixed 12 px morph radius keeps that shape circular at larger sizes. Existing circle, rounded, pebble, leaf, and flower options remain available.
- Selected ink uses `--v-on-accent`; fill, inactive stroke, and disabled paint use their semantic variables. Appearance changes therefore reach both the static fallback and the owned SVG surface.

The existing controlled/uncontrolled callbacks, Radix checkbox/radio semantics, native Questionnaire inputs, form names/values, and keyboard ownership remain in place.

## Independent item appearance

`ItemAdornmentOptions` adds:

```tsx
showIcon?: boolean        // default true
showBackground?: boolean  // default true
```

This provides both layers, icon only, blob only, or neither. Icon-only adornments inherit the row foreground unless the consumer provides `foreground`. Neither renders no decorative wrapper, allowing the label column to use the available width.

Existing `icon: false`, `adornment: false`, `adornment: "none"`, custom React elements, explicit shape/color/effect options, deterministic identity, and explicitly composed icons remain supported. Custom elements also retain their supplied wrapper style.

The same options pass through DropdownMenu, ContextMenu, Menubar, Select, Combobox, MultiSelect, Command, and NavigationMenu. MultiSelect retains per-option overrides and its root default.

## Internal scrolling and cursors

`ScrollArea` adds `variant="plain"` and a viewport-composition hook. `ScrollAreaList` supplies a neutral internal scrollport with a configurable `maxHeight`, custom thumb, and no extra region role or tab stop. `scrollAreaListChildren` preserves the consumer's native `asChild` element while wrapping its contents.

| Entry | Integration |
| --- | --- |
| Select | Radix SelectViewport composes around the actual ScrollArea viewport, preserving its native scroll/focus reference and scroll buttons. Long labels wrap. |
| Combobox | A popover surface contains ScrollArea around the complete cmdk List. cmdk's item/sizer structure remains intact. |
| Command | ScrollArea wraps the complete cmdk List, preserving filtering, sorting, selection, and empty feedback. |
| MultiSelect | Its real checkbox options live in ScrollArea; search, arrow/Home/End navigation, selection, tokens, and callbacks remain intact. |
| DropdownMenu / ContextMenu / Menubar | Root and submenu contents use the shared scrollport, retaining Radix semantics and existing lifecycle owners. |
| NavigationMenu | Both force-mounted and retained content branches forward children through the shared scrollport. |

The viewport normalizes an `asChild` parent's overflow shorthand before Radix writes axis styles, removing the React `overflow`/`overflowY` conflict. Fixed table layout constrains Radix's content wrapper without `!important`.

Plain scrollports leave room for decorative control paint. In the appearance popover, the last Button's SVG previously extended 8 px beyond a fitting viewport and invented a small scroll range. With paint room, fitting content reports equal viewport/scroll heights and no thumb; genuinely long lists retain draggable thumbs.

The base cursor rule covers semantic clickable controls and labels. Disabled controls receive `not-allowed`. Disabled menu items remain hit-testable so that cursor can appear; Radix/cmdk still prevent their activation. MenubarTrigger also preserves a false chevron option instead of resetting it during class-name composition.

## Examples

`components/examples/review-selectors-lists.tsx` exports:

- `ReviewCheckboxExample`
- `ReviewRadioGroupExample`
- `ReviewQuestionnaireExample`
- `ReviewItemAdornmentExample`
- `ReviewMultiSelectExample`

The selector examples expose a shared, controlled **Select** mark chooser and a show/hide Checkbox. Questionnaire now uses those controls too. All selector examples receive the documented size axis. ItemAdornment receives its existing sm/default/lg size axis and exposes independent icon/background switches. MultiSelect offers 24 actual local options with search, multiple selection, and one disabled option.

Adornment example variants are `both`, `icon-only`, `blob-only`, and `none`. Root owns catalogue registration and shared example metadata.

## Focused evidence

The runnable local review is `scripts/check-review-selectors-lists.mjs`, using `scripts/fixtures/review-selectors-lists.tsx`. It mounts real source components and the current AppearanceProvider in an isolated, same-origin page with the running dev site's CSS. The isolation prevents concurrent Next HMR from replacing the fixture.

Evidence is scoped to the following receipts:

- `output/playwright/review-selectors-lists/round-1/`: the first batch confirmed selector sizing, all marks, appearance modes, pointer/keyboard controls, and native FormData in both themes at 390 and 1440 px. It exposed Select's old nowrap rule and an initially incorrect cmdk scroll-wrapper placement. Both defects were corrected; the failed receipt is retained.
- `output/playwright/review-selectors-lists/confirmation/results.json`: **11 checks passed in each of the four width/theme contexts**, with no runtime errors. This covers selectors, adornments, Select, Combobox, MultiSelect, three menu families, Off/Flow Off/reduced behavior, and an actual selected-SVG fill change to the Tide palette. Two remaining checks identified missing retained Navigation children and an offscreen Command drag probe.
- `output/playwright/review-selectors-lists/targeted-scroll/results.json`: the corrected Navigation and Command checks passed at 1440 px light. This also measured the appearance popover's decorative overflow before correction.
- `output/playwright/review-selectors-lists/final-targeted/results.json`: **four targeted checks passed at 390 px dark and 1440 px light**: Select, Navigation, Command, and appearance scroll fit. React development-mode console warnings and runtime errors were empty. Viewport/scroll height was **603/603 px** on mobile and **619/619 px** on desktop, with **no thumb** for fitting appearance content. Document width matched each viewport.

Inspected screenshots include the large near-circle selector, markless checked state, independent adornments, wrapped long Select/MultiSelect labels, active custom thumbs, and the appearance popup without a false scrollbar. Useful captures are `final-targeted/390-dark-selectors.png`, `final-targeted/390-dark-select.png`, `confirmation/390-dark-multi-select.png`, and `final-targeted/1440-light-appearance.png` under the evidence directory above.

Root reports its final compiler and lint checks passed. An earlier local no-emit process produced no output and was stopped; that run is not counted as passing.

Root separately traced a WebKit ResizeObserver warning to the press-scaled Select trigger feeding the menu width. Select now observes layout width independently of that transform. The final WebKit six-palette integration passes without page or console errors; see `REVIEW-PASS-REPORT.md` and `output/playwright/review-appearance-final/results.json`. This is not a full catalogue or production approval.

## Exact changed paths in this pass

- `registry/sahajiv/lib/selector.tsx`
- `registry/sahajiv/ui/checkbox.tsx`, `radio-group.tsx`, `questionnaire.tsx`, `item-adornment.tsx`, `scroll-area.tsx`, `select.tsx`, `combobox.tsx`, `multi-select.tsx`, `command.tsx`, `dropdown-menu.tsx`, `context-menu.tsx`, `menubar.tsx`, `navigation-menu.tsx`
- `registry/sahajiv/styles/base.css`, `checkbox.css`, `radio-group.css`, `questionnaire.css`, `scroll-area.css`, `select.css`, `combobox.css`, `multi-select.css`, `command.css`, `dropdown-menu.css`, `context-menu.css`, `menubar.css`, `navigation-menu.css`
- `components/examples/review-selectors-lists.tsx`
- `scripts/check-review-selectors-lists.mjs`
- `scripts/fixtures/review-selectors-lists.tsx`
- `REVIEW-SELECTORS-LISTS.md`

`item-adornment.css` was inspected and reused; its existing layer styles needed no edit. Shared palette tokens, appearance state, morph engine, presence engine, documentation layout, package configuration, generated registry files, and publishing remain with their respective owners.
