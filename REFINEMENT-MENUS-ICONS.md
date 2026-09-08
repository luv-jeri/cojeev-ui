# Menus, list identity, and icons

Group C is implemented in the reusable components. Dropdown, Menubar, ContextMenu, Select, Combobox, MultiSelect, NavigationMenu, and Command now share decorative item identity. Radix and cmdk continue to own their native focus, matching, selection, and dismissal contracts.

## Public contracts

`ItemAdornment` is a decorative primitive with required `identity`, optional `value`, and `size="sm" | "default" | "lg"`. Its wrapper is hidden from the accessibility tree; the item's existing text remains its accessible label.

`ItemAdornmentValue` accepts:

- `"auto"` or omitted: a deterministic shape, palette color, and icon derived from identity.
- `{ shape, color, foreground, icon, effect }`: explicit customization. `shape` accepts the 12 signature shape names; `color` accepts pink, yellow, olive, blue, or a CSS color; `foreground` supplies the matching ink for a custom color. `icon` accepts an Icon name, custom decorative React node, or `false` for the silhouette alone.
- A React element: the consumer's custom decorative icon, without an automatic silhouette.
- `false` or `"none"`: text-only composition.

The shared `ItemAdornmentItemProps` supplies `adornment` and `adornmentId`. Menu items derive identity from an explicit ID, native value/textValue, or child text. Consumers should provide `adornmentId` when a translated or changing label must retain the same appearance. `resolveItemAdornment(identity)` is pure: there is no random choice, row-index dependence, hydration-time variation, or reassignment after filtering. Existing Icon, AnimatedIcon, Disk, and ItemAdornment children remain intact when automatic decoration is omitted; recognition compares actual component types, including inside fragments, so minification does not change that behavior. An explicit `adornment` is the consumer's choice and is added as requested.

The shared contract is exposed by ordinary, checkbox, radio, and submenu items in DropdownMenu, Menubar, and ContextMenu; SelectItem; ComboboxItem; CommandItem; and NavigationMenuLink/Trigger. `MultiSelectOption.adornment` overrides `MultiSelect.adornment`; `ComboboxOption.adornment` customizes each generated option. `SelectItem` keeps decoration outside Radix ItemText so selected values contain only the original label. `asChild` menu/link composition decorates the single native child and keeps its element, ref, and event behavior.

`StateChevron` accepts an optional `open` value, `direction="down" | "right"`, and span props. With no `open`, it observes the closest native trigger's `aria-expanded`/`data-state`; it does not maintain a competing open state. Off and reduced motion update the final angle immediately. Select, MultiSelect, NavigationMenu triggers and all submenu triggers use it. Menubar triggers show it by default; DropdownMenuTrigger opts in with `chevron`.

`AnimatedIcon` retains its name, preset, active, and SVG props and adds `preset="pulse" | "none"`, `amplitude` (clamped to 0–3), and `duration` (seconds, clamped to 0.08–10). Existing presets remain auto, tremor, draw, spin, bounce, and validation. Automatic hover/focus detection recognizes native menu/option roles and labels as well as buttons and links. Decorative effects use shared choreography and visibility rules.

The exported Icon pack contains 136 unique names. Sixteen additions are `github`, `save`, `circle-help`, `menu`, `mail`, `link`, `code`, `compass`, `folder-plus`, `undo-2`, `redo-2`, `globe`, `log-in`, `filter`, `palette`, and `rocket`.

## Layout and paint

Top-level DropdownMenu, Menubar, and ContextMenu panels default to 260px and support the `--menu-width` CSS property or ordinary inline width customization. They retain viewport limits and native scrolling. Submenu widths respect Radix's measured available width, allowing labels to wrap when a flyout shares a narrow viewport with its parent. Select defaults to the greater of its trigger width and 240px, still bounded by the viewport. Combobox and MultiSelect intentionally match their input/trigger width.

Highlighted, pressed, checked, disabled, and destructive menu states use explicit ink/fill pairs. Menubar's former broad highlighted selector no longer replaces an open trigger's dark fill with a pale one. Checkbox/radio indicators have a persistent trailing slot. NavigationMenu has local surface-readable text and selection colors instead of assuming a dark sidebar. Consumers can override `--nav-ink`, `--nav-active-ink`, `--rail-sel`, and `--rail-hover` for a custom rail. The single shared flow rule uses `--nav-active-ink` with its prior pink fallback.

Combobox's position-based pseudo-element blobs are removed. Its labels and real ItemAdornment elements occupy separate columns, including after filtering. Command's existing shortcut and explicit-icon compositions retain their native columns.

The documentation preview's Variant and Size controls now use Select, SelectTrigger, SelectValue, SelectContent, and SelectItem. They still update the keyed specimen and copied example source. The server docs page contained no native selector and required no edit.

`IconPackExample` provides a searchable pack, effect selection, and a real IconButton specimen for the existing default/dashed/ink/pink/beige/cream variants and default/sm/lg/xl sizes. `ItemAdornmentExample` demonstrates automatic, explicit, custom, and none choices, plus a locally interactive menu. These examples do not claim a backend connection or dispatch external actions.

## Evidence

Run from the repository root against the existing development server:

```sh
rtk proxy node scripts/check-refinement-menus-icons.mjs --url=http://127.0.0.1:4320/sahajiv-ui --output=output/playwright/refinement-menus-icons
rtk proxy node --import tsx --test tests/item-adornment.test.ts
rtk tsc --noEmit
```

Two visual batches were used. The diagnostic batch's native checks passed but its geometry result recorded a mobile submenu extending to x=499 at a 390px viewport. Screenshot review also found Combobox's inherited column collision and light NavigationMenu's unreadable rail colors. The correction batch fixed all three. Early diagnostic attempts exposed runner readiness mistakes around native focus and accessibility-hidden triggers; the runnable script now waits for mounted menu content and addresses a modal-hidden trigger by its actual DOM selector.

Final artifacts are in `output/playwright/refinement-menus-icons-round2/`: `results.json`, 28 individual screenshots, and `contact-dark.jpg` / `contact-light.jpg`. Every final screenshot was inspected through the two contact sheets; larger individual images were inspected for the earlier problem states. Final results: two contexts, zero runtime errors, zero recorded bounds defects, and document widths of 390 and 1440 respectively.

| Workflow | 390px dark and 1440px light evidence |
| --- | --- |
| DropdownMenu | Compact panel; long label wraps in the scrollable list; explicit/custom/none choices; native link root; checkbox/radio state changes; keyboard opening and Enter; submenu keyboard/pointer action. |
| Menubar | Pointer opening, keyboard sibling switching, native Enter action; inspected trigger and panel screenshots; preserved closed-retained-content outside-interaction guard. Open trigger computes dark text on light fill in dark mode, and light text on dark fill in light mode. |
| Select | Pointer choice, keyboard Home/Enter, disabled option visible, state chevron; no decorative glyph copied into the selected text. |
| Combobox | Identity unchanged after filtering; native Home/Enter and pointer selection; readable single-row icon/label composition. |
| MultiSelect | Label pointer activation, native checkbox Space, selected state, Escape, and actual FormData values. |
| NavigationMenu | Native custom link root and aria-current update; visible local content; inspected light/dark labels and selection fill. |
| ContextMenu | Right click, checkbox update, Shift+F10, Home/Enter, disabled action visible. |
| Command | Existing GitHub icon remains singular; keyword filtering retains identity; native Enter and pointer actions; readable shortcuts. |
| Docs controls | Library Variant and Size options select secondary/large and update the actual keyed Button specimen. |
| Quiet modes | Off and reduced motion tested independently: animated icon settles, state chevron updates immediately, Select closes without retained delay. |

Four focused tests pass: stable identity after reorder/filter, automatic/explicit/custom/none SSR contracts, SVG rendering for all 136 advertised icons, and legacy Disk/Icon composition without duplicate adornment. TypeScript and targeted ESLint checks pass. The type-reference deduplication hardening was covered by the focused SSR test after the final visual batch; it does not change the verified explicit-icon composition.

## Native boundaries and unverified cases

- cmdk still removes filtered Item/Empty nodes immediately. Command and Combobox retain the existing coordinated results-container transition; this work does not claim per-item exit retention or replace cmdk's matching, ranking, typeahead, or forceMount behavior.
- On a narrow viewport, native flyouts become narrower and wrap their labels; they remain native nested menus rather than becoming a separate mobile sheet.
- Native HTML selects elsewhere remain native. This change covers the custom library menu/list items and the documentation's Variant/Size controls.
- Final browser coverage is Chromium at 390px dark and 1440px light, with independent Off and reduced-motion cases. This task did not repeat every documented IconButton variant/size in the browser, run WebKit, regenerate the registry, or perform a production build. Root integration owns those gates.

## Changed paths

- UI: `registry/sahajiv/ui/{item-adornment,icon,animated-icon,dropdown-menu,menubar,context-menu,select,combobox,multi-select,navigation-menu,command}.tsx`.
- Styles: `registry/sahajiv/styles/{item-adornment,animated-icon,dropdown-menu,menubar,context-menu,select,combobox,multi-select,navigation-menu,command}.css`, plus the one authorized navigation foreground variable in `styles/flow-press.css`. Existing `styles/icon.css` needed no edit.
- Examples and documentation control: `components/examples/menu-icons.tsx`, `components/component-preview.tsx`.
- Reproducible checks: `scripts/check-refinement-menus-icons.mjs`, `tests/item-adornment.test.ts`.
- This report: `REFINEMENT-MENUS-ICONS.md`.

Root integrated registry metadata, public example mappings, and the global ItemAdornment stylesheet import. Motion ownership added pulse/none to the existing AnimatedIcon example's preset list. No commits, pushes, resets, registry generation, or Next build were performed by this task.
