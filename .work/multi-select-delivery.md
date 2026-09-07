# MultiSelect delivery

Implementation base: `5b9b3ab`. Scope: the new MultiSelect TSX/CSS, Forms example, and focused browser fixture/receipt. Existing components, shared motion, globals, metadata and references were not edited.

## Public API and integration

- `registry/sahajiv/ui/multi-select.tsx` exports `MultiSelect`, `MultiSelectProps`, `MultiSelectOption`.
- `registry/sahajiv/styles/multi-select.css` belongs in the existing component/state CSS layer.
- `components/examples/forms.tsx` exports self-contained `MultiSelectExample`.
- Suggested category: **Forms**. Suggested summary: “Searchable multiple choices with removable selections.”
- Registry dependencies: `badge`, `button`, `checkbox`, `icon`, `input`, `label`, `popover`; shared `utils` comes through the normal library dependencies. No new package dependency.

`label` and `options` are required. An option is `{ value: string, label: string, disabled?: boolean }`. Values are controlled through `value`/`onValueChange`, or internal through `defaultValue`. Other props: `name`, `id`, `disabled`, `description`, `error`, `placeholder`, `searchPlaceholder`, `emptyMessage`, `noResultsMessage`, `className`.

The search compares the visible option label, case-insensitively. Selected values are deduplicated in order. Values absent from the options remain visible/removable using their raw value as the label. Disabled options cannot be selected, deselected or removed. A disabled field closes its popup, locks all actions, and omits its values from native form submission. A `name` emits one hidden form entry per selected value; uncontrolled native form reset restores `defaultValue`. Controlled forms should reset the parent's value. `error` supplies the visible announced error and `aria-invalid`; `description` and selection count are associated with the trigger.

The component uses the existing Popover, Input and Checkbox primitives. A checkbox group accurately exposes independent multiple selection, avoiding a single-active combobox model. Tokens sit outside the labelled button trigger, with real remove buttons inside noninteractive Badge spans. Escape uses the Popover focus return; removal moves focus to an adjacent enabled remove button or the trigger. Arrow keys/Home/End move among enabled choices; Space toggles. The trigger opts out of body deformation so the field edge and invalid outline remain steady. Popover appearance and checkbox feedback retain the shared motion settings.

## Example and guide suggestions

`MultiSelectExample` keeps actual React selection state, externally filters unavailable options, displays the selected labels in a live status, resets both values/filter, and exposes an empty-selection error through Clear selection. Suggested docs sections: controlled usage; initial values/native form submission; disabled options; description and validation; keyboard use. Explain that removing an option from the options catalog does not silently delete an existing value. Use single Select for a single choice; use this component for a bounded set of multiple choices. No remote fetching or virtualized catalog is implied.

## Verification

Commands from the repository root:

```sh
rtk proxy node .work/verify-multi-select.mjs
rtk proxy npx tsc --noEmit -p .work/tsconfig-multi-select.json
rtk proxy npx eslint registry/sahajiv/ui/multi-select.tsx components/examples/forms.tsx
```

The dedicated browser check starts/stops its own Vite server on `4354`, uses the actual `app/globals.css` layer order plus the new stylesheet, and drives native pointer/keyboard events. Final receipt: `.work/multi-select-verification.json`. **14 check groups pass, zero page errors:** controlled pointer selection, filtered search/no-match, keyboard selection/disabled skipping, Escape/focus return, removal focus, example reset/validation/filter, uncontrolled form submission/reset, runtime disabling/re-enable behavior, disabled/invalid/description semantics, empty catalogs/unknown values, no nested interactive trigger, and 360px light/dark viewport bounds. Focus handoffs are awaited rather than asserted before the scheduled update. The fixture declares dependency entry discovery and disables HMR so browser checks use a settled module graph.

Focused TypeScript and ESLint pass. The new CSS parses and contains no `!important` declarations. No broad visual matrix was run. Screenshots in `output/playwright/multi-select/` were reviewed for open/closed 360px layouts. These are local raw artifacts; the compact JSON receipt is committed.

## Shared dark Checkbox follow-up

Visual review found that the existing dark Checkbox sheet cleared its checked tick image: dark indicator rules used the `background` shorthand, overriding the later image through specificity. The root fixed the shared primitive in `60c62f7` and `6315478`; those commits are merged here. The bounded follow-up `rtk proxy node .work/verify-multi-select-dark.mjs` passes for both initially selected and pointer-selected dark choices: the authored SVG check image remains in computed background-image. The screenshot `output/playwright/multi-select/multi-select-390-dark-glyph-fixed.png` visibly confirms all three selected ticks. Receipt: `.work/multi-select-dark-verification.json`, zero page errors. No duplicate renderer or out-of-scope primitive patch was added, and the broader 14-group suite was not repeated for this shared fix. No remaining MultiSelect implementation issue was found in the scoped checks.

Root retains registry/index/package/CSS/docs integration. The previously requested actual-docs motion release probe is now `rtk proxy node scripts/check-motion.mjs --serve` under main; no equivalent motion checks were rerun here.
