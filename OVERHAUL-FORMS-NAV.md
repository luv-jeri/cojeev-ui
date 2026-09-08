# Forms and navigation audit — 8 September 2026

Audited all 26 Form & Input and Navigation entries in the current shared checkout. Every UI source and corresponding style file was read. Field and InputGroup were read-only; their current linked validation and multiline composition were retained. Prior root edits were preserved. No build, registry generation, commit, or push was performed by this stream.

## Changes

- Button now guards keyboard activation while loading/busy or aria-disabled. It keeps focus and its native button contract. Disabled paint wins over the dark default and hover colors.
- Combobox options render through the Radix portal, with component-owned styling, collision bounds, available-height limits, and wrapping. A menu inside an overflow-hidden ancestor remains selectable.
- Slider uses Radix Range geometry for every value configuration, correcting RTL and inverted single-value fills. Single-thumb labels inherit aria-label/aria-labelledby. Disabled track/thumb styles remain distinct.
- Calendar months use a compact 360px maximum and shrink inside narrow forms. Multiple-month containers can wrap. Disabled dates no longer acquire a hover wash.
- OTP groups stay together at desktop width and shrink at mobile width; explicit separator spacing replaces a redundant third-slot margin.
- Tabs now separates the list and panel by the shared 16px spacing token. Preview explicitly keeps its integrated frame gap at zero. Vertical lists stack and content has a shrink boundary.
- Checkbox body alignment follows reading direction and wraps; coarse-pointer rows have a 44px minimum target.
- NativeSelect preserves visible SVG arrows across light/dark, ink/default, and disabled states; RTL positioning and width bounds are explicit.
- Select and DatePicker ink chevrons inherit text color, and disabled paint wins over variants/themes.
- Toggle and ToggleGroup disabled selections retain disabled paint instead of inheriting the enabled pink state in dark mode.
- Documentation filtering omits Getting Started while a query is present, restoring the one-result filter contract.

Files changed in this stream: `components/docs-shell.tsx`; `registry/sahajiv/ui/{button,combobox,slider,tabs}.tsx`; `registry/sahajiv/styles/{button,calendar,checkbox,combobox,date-picker,input-otp,native-select,preview,select,slider,tabs,toggle,toggle-group}.css`. No example content or metadata was edited.

## Evidence boundaries

The baseline documentation run covered 26 entries × 390/1440 × light/dark = 104 layout cases. All component layout cases and shared Preview copy/source/variant controls passed. The original documentation filter failure was fixed and the final chrome tests pass at both widths and themes.

The default interaction suite ran at 1440 and then separately at 390. The mobile run covered 52 layout cases; one light radio-group navigation was interrupted with `ERR_ABORTED` while the shared dev checkout changed. A focused 44-case corrective run subsequently passed every case, including radio-group. A final disabled-paint pass covered 16 cases; one light desktop toggle navigation was likewise interrupted, then the direct final capture confirmed its rendered state. These interruption records are retained, not rewritten as successes.

Visual inspection covered all 26 default specimens at 390 and 1440 in light mode, all 26 at 390 in dark mode, corrective calendar/checkbox/OTP/select/date-picker/tabs/slider/combobox captures, and a direct consumer fixture. Dark desktop layout metrics passed; not every dark desktop screenshot was individually judged. One intermediate screenshot caught a loading placeholder during shared HMR; final slider captures show the actual specimen. Calendar's decorative paint can extend about 7px beyond its structural grid; all dates and controls are visible at 390.

Direct consumer fixture passes at 390/1440 in both themes: busy and aria-disabled callbacks stay at zero under Enter/Space; LTR/RTL/inverted/range geometry is correct; RTL arrow keys update the value; clipped-ancestor Combobox pointer and keyboard selection work; native arrows exist in all four theme/disabled combinations; OTP remains compact; calendar stays bounded; all four Tab variants support pointer/arrow activation and keep panel spacing. Six Button color variants and disabled Toggle/Switch states are rendered in this fixture. This is a bounded relevant-state pass, not an exhaustive permutation claim.

`npx tsc --noEmit` passed after the parent corrected an unrelated workspace Button-asChild use. Scoped `git diff --check` passed. Browser artifacts are under `artifacts/overhaul-forms-navigation/` and `output/playwright/overhaul-forms-navigation/`; `consumer-results.json` records the four final direct-consumer passes.

## Per-entry results

All rows include source/style reading and the default visual/layout coverage described above. “Pointer + keyboard” refers to the component behavior at both 390 and 1440, not every variant.

| Entry | Actual evidence and changes | Remaining scope |
| --- | --- | --- |
| Button | Pointer loading/disabled pending, keyboard failure/retry; busy/aria-disabled consumer guard; six color variants; disabled dark paint fixed | Every size × long-label combination not exercised |
| ButtonGroup | Pointer/keyboard selection updates associated content | All segmented layouts not exhaustively permuted |
| Checkbox | Pointer/Space checked changes; indeterminate and disabled states; body alignment/coarse target fixed | Coarse device hardware not tested |
| Combobox | Pointer filtered item, keyboard filtered selection; portalled clipped-ancestor consumer case at both widths/themes | Large data sets and nested modal stacking not exercised |
| Command | Pointer action and keyboard search/action; grouped content and shortcuts inspected | Every custom nested group composition not exercised |
| DatePicker | Pointer date selection; keyboard opening, Escape, focus return; theme chevron and disabled precedence fixed | Range/multi-month date-picker consumer combinations not exhaustive |
| Calendar | Pointer date and arrow/Enter selection; month width/wrapping fixed; complete narrow date grid inspected | Multiple-month/range selection not fully browser exercised |
| Direction | Pointer/keyboard direction switching and Arabic composition | Every directional primitive was not tested under RTL |
| Field | Read-only: edits clear invalid; keyboard empty value restores linked error | No issue found within default tested composition; parent owns changes |
| Input | Pointer edit and keyboard clear receipt; disabled specimen inspected | Every size/type/validation combination not exercised |
| InputGroup | Read-only: pointer/keyboard save receipt; address and multiline composition inspected | No issue found within current tested composition; parent owns changes |
| InputOTP | Pointer focus, digit entry, completion, keyboard deletion; compact grouping fixed | OS autofill and password-manager badges not tested |
| Label | Static visual and size/source controls inspected | Explicit click-to-focus behavior was not part of automated default case |
| NativeSelect | `selectOption` changes receipt; both variants/disabled arrows checked in both themes | OS picker keyboard remains unverified on headless macOS Chromium; the same ArrowDown/Enter attempt failed on a bare unstyled select |
| RadioGroup | Pointer selection and arrow-key selection; normal/pictographic/disabled inspected | Full pictographic color/state permutation not exercised |
| Select | Pointer and keyboard item selection; theme arrow/disabled precedence fixed | Every size and nested modal case not exercised |
| Slider | Pointer placement and arrow increment; RTL/inverted/range fill and inherited label consumer tests | Vertical consumer geometry not separately browser tested |
| Switch | Pointer/Space changes and disabled state; checked disabled inspected | RTL thumb mirroring not changed or separately tested |
| Textarea | Pointer composition and keyboard save render note and clear input | All standalone invalid/composer combinations not exercised |
| Toggle | Pointer/Space pressed changes; dark disabled/pressed precedence fixed | Every shape/color variant not exhaustively exercised |
| ToggleGroup | Pointer/keyboard formatting updates real text; disabled selected precedence fixed | Multiple-selection/disabled permutations not exhaustively exercised |
| Breadcrumb | Keyboard activation reaches Sidebar documentation; narrow wrapping inspected | Pointer link was not separately exercised by its behavior case |
| Menubar | Pointer action and keyboard checked menu item | Deep submenus not separately exercised |
| NavigationMenu | Pointer and keyboard collection navigation | Alternate horizontal/dropdown compositions not exercised |
| Pagination | Pointer next and keyboard previous update content | Large page-count/long localized labels not separately exercised |
| Tabs | Pointer/arrow matching content; default/pills/underline/lenses tested at both widths/themes; panel spacing fixed | Vertical variant is source-corrected but not separately keyboard browser tested |

## Integration follow-up

Root still owns registry regeneration, whole-library gates, and the shared checklist. The new universal Motion/AnimatePresence requirement should be checked against the shared motion integration; this stream retained the existing primitive motion hooks and did not gratuitously animate static labels. Combobox retains its authored CSS scrollbar; the root should decide whether the universal library ScrollArea policy requires replacing that scrolling surface. In the dark portalled-menu capture, motion-painted menu surfaces permit some underlying content to show through; assess shared surface opacity/stacking with the motion owner before calling every overlay visually final.

## Current dark-popup follow-up

After the user reported current dark readability/stacking/entrance problems, performed a new direct open-state pass rather than relying on prior gates. DatePicker, Select, Menubar, and Combobox were captured at 390 and 1440, during entry and after 900ms. Found three concrete causes: shared entrance origins used coordinates from Radix's temporary unpositioned rectangle; Menubar had `z-index:auto` and Select/Combobox used dialog layer40; Combobox's contents-only cmdk sizer left its active item beneath selection paint, hiding the first label.

The motion owner corrected the shared origin to Radix's live transform-origin. This stream moved all relevant menu surfaces to popover45, added DatePicker's overridden-slot bounds/collision padding, and positioned Combobox options above the selection paint. Added changes are `ui/{date-picker,select}.tsx` and `styles/{menubar,navigation-menu}.css`, in addition to the files listed earlier.

Final direct results: all eight open width/component cases have opacity1, opaque warm-dark backgrounds, cream text, z45, correct center hit targets, bounded origins (top edge, not far outside the menu), and Escape focus return after exit. No runtime errors. The formerly hidden Combobox selected row is visible. Current settled transparency was not reproduced after these fixes; the earlier concern is superseded by this direct evidence. Final captures and measurements: `output/playwright/overhaul-forms-navigation/dark-open/`. Menubar is the tested navigation popup; NavigationMenu's dropdown-style optional composition still lacks a separate open-state example. Typecheck passed following these component changes.


## Final Menubar correction

The production keyboard journey reproduced a closing-layer race: after selecting a Notebook item, quickly opening View with ArrowDown focused the new checkbox, then the retained closed Notebook layer dismissed the shared menu value. Closed retained Menubar content now prevents its outside-interaction dismissal while retaining caller callbacks. The same guard covers submenu content. The exact pointer-then-keyboard production journey is the regression check; shared focus behavior and active open-menu dismissal remain native Radix responsibilities.
