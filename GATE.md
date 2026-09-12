# Production gate

Result: **PASS**. Started 2026-09-12T00:23:43.660Z; finished 2026-09-12T00:48:21.001Z.

Built registry SHA-256: `c503f2622a2867863e5a790cf70d76043e5571aab1bf388f59e34544da8b3381`.

Source provenance: {"mode":"source-snapshot","head":null,"sourceSha256":"5e6ef31bba9e86334e3e42ba847684695182abd7826555849ed0d831f79bd204","files":808}. Source-snapshot mode, when requested, hashes the copied source and does not certify Git history.

Run `npm run build && npm run gate` to reproduce. This gate serves the static build. It checks default specimens at 360, 768 and 1440 pixels in both themes, documentation controls and meaningful component interactions. Copied variant/size snippets are separately compiled by `npm run check:examples`. It does not claim every state in every browser or physical-device verification.

Documentation: 172 entries, 1032 layouts. Shell checks: 18/18.

| Component | Layouts | Preview / copy | Behavior | Runtime errors |
| --- | --- | --- | --- | ---: |
| accordion | 6/6 | pass | pass: Pointer expansion; arrow focus navigation and Enter expansion | 0 |
| accordion-gallery | 6/6 | pass | pass: pointer panel selection, keyboard selection and visible story, reduced motion stays still | 0 |
| action-dock | 6/6 | pass | pass: Pointer and keyboard dock selection update the exclusive selected state and destination description. | 0 |
| activity-feed | 6/6 | pass | pass: Progressive reveal moves focus, local prepend preserves all five entries, and quiet content remains readable | 0 |
| adjuster | 6/6 | pass | pass: Pointer export, keyboard invalid import/error, reset runtime | 0 |
| agent-chat | 6/6 | pass | pass: Keyboard send; explicit deny; Stop cancels timers; attach/remove; error and retry reach a sample result; completion restores focused Stop without stealing outside focus | 0 |
| agent-state | 6/6 | pass | pass: Pointer and keyboard state changes retain named status and recovery description | 0 |
| alert | 6/6 | pass | pass: Pointer dismissal and keyboard restoration | 0 |
| alert-dialog | 6/6 | pass | pass: Pointer/keyboard opening, focus inside, Escape, confirmation and restore | 0 |
| ambient-background | 6/6 | pass | pass: Composition control and pointer/keyboard pause-resume | 0 |
| animated-icon | 6/6 | pass | pass: Search, selection, keyboard inspector replay, disabled lifecycle and reduced-motion settling | 0 |
| animated-number | 6/6 | pass | pass: Decimal add/subtract and reversal, rolling/stepped treatments, locale formatting and exact quiet updates | 0 |
| appearance | 6/6 | pass | pass: Palette updates actual theme tokens, keyboard contrast persists, and reset restores Paper at 60% | 0 |
| area-chart | 6/6 | pass | pass: Keyboard inspection and Escape, legend hide/show, data table, empty state and new dataset; all chart layouts covered by chart gate | 0 |
| article-headings | 6/6 | pass | pass: finite heading decode, canonical accessible heading, reduced motion stays still | 0 |
| aspect-ratio | 6/6 | pass | pass: Randomization changes the real partition; keyboard Undo restores it; Interlock exports reusable layout code (seam gestures covered by the resize suite) | 0 |
| assembly-part | 6/6 | pass | pass: Real button retains DOM identity and press count through expand/compact reshapes; pointer and keyboard remain usable. | 0 |
| attachment | 6/6 | pass | pass: Real text download by pointer, keyboard removal and restoration | 0 |
| avatar | 6/6 | pass | passive: No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately. | 0 |
| badge | 6/6 | pass | passive: No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately. | 0 |
| bar-chart | 6/6 | pass | pass: Keyboard inspection and Escape, legend hide/show, data table, empty state and new dataset; all chart layouts covered by chart gate | 0 |
| bento-builder | 6/6 | pass | pass: Randomization changes the real partition; keyboard Undo restores it; Interlock exports reusable layout code (seam gestures covered by the resize suite) | 0 |
| bento-grid | 6/6 | pass | pass: Randomization changes the real partition; keyboard Undo restores it; Interlock exports reusable layout code (seam gestures covered by the resize suite) | 0 |
| breadcrumb | 6/6 | pass | pass: Keyboard ancestor navigation updates the local folder and transfers focus to its heading | 0 |
| bubble | 6/6 | pass | passive: No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately. | 0 |
| button | 6/6 | pass | pass: Pointer loading preserves busy styling, adjustable duration, cancel, keyboard failure and retry | 0 |
| button-group | 6/6 | pass | pass: Pointer and keyboard selection update content | 0 |
| buy-me-coffee | 6/6 | pass | pass: keyboard support link reaches real local information, reduced motion stays still | 0 |
| calendar | 6/6 | pass | pass: Pointer date selection and arrow/Enter selection | 0 |
| card | 6/6 | pass | passive: No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately. | 0 |
| caret-swap | 6/6 | pass | pass: keyboard pause stops paint, reduced motion stays still | 0 |
| carousel | 6/6 | pass | pass: Pointer next and keyboard previous update active idea | 0 |
| chart | 6/6 | pass | pass: Pointer reveals the data table; keyboard hides it visually while retaining accessible values and the zero datum | 0 |
| chart-tooltip | 6/6 | pass | pass: Pointer and keyboard contextual values; Escape dismisses tooltip | 0 |
| checkbox | 6/6 | pass | pass: Pointer/Space toggles independent choices and the explicit packed summary | 0 |
| click-spark | 6/6 | pass | pass: keyboard activation, reduced motion stays still | 0 |
| code-block | 6/6 | pass | pass: Wrap control and actual clipboard preserves exact code | 0 |
| collapsible | 6/6 | pass | pass: Pointer expands and keyboard collapses content | 0 |
| combobox | 6/6 | pass | pass: Pointer filtered option and keyboard filtered option selection | 0 |
| command | 6/6 | pass | pass: Pointer action and keyboard search/action | 0 |
| compact-dashboard | 6/6 | pass | pass: Historical task-panel alias: Pointer and keyboard task completion update progress to 100%; Start fresh clears all tasks and progress. | 0 |
| context-menu | 6/6 | pass | pass: Pointer context menu action and keyboard context menu/Escape | 0 |
| contour-field | 6/6 | pass | pass: Save result, keyboard pause, tone and pace controls, and a still reduced-motion surface | 0 |
| contours-background | 6/6 | pass | pass: Spacing and strength change the actual decorative paint; foreground action remains usable | 0 |
| conversation-panel | 6/6 | pass | pass: Native bubbles; empty/whitespace send guard; keyboard and pointer sends clear draft; clear restores empty conversation. | 0 |
| data-table | 6/6 | pass | pass: Pointer and keyboard filters, numeric ascending sort, next page and row selection | 0 |
| date-picker | 6/6 | pass | pass: Pointer date selection; keyboard opening/Escape/focus return | 0 |
| depth-background | 6/6 | pass | pass: Native scroll moves the decorative plane; reduced motion holds it still and preserves content | 0 |
| dialog | 6/6 | pass | pass: Pointer rename/save; focus entry and restoration; keyboard opening/Escape | 0 |
| direction | 6/6 | pass | pass: Pointer/keyboard direction switching | 0 |
| dither-dissolve | 6/6 | pass | pass: keyboard scene transition, interrupted reversal, inactive content inert, still mode settles target, reduced motion stays still | 0 |
| dither-sculpture | 6/6 | pass | pass: Form changes actual paint; color, print-specific controls and disabled dependencies work; reduced motion stays still | 0 |
| dock | 6/6 | pass | pass: Native pointer/keyboard destinations, unavailable action, selection receipt and actual item-size control | 0 |
| dots-background | 6/6 | pass | pass: Spacing and strength change the actual decorative paint; foreground action remains usable | 0 |
| drawer | 6/6 | pass | pass: Pointer open/close and keyboard open/Escape | 0 |
| dropdown-menu | 6/6 | pass | pass: Pointer checked item; keyboard menu opening/Escape | 0 |
| dropzone | 6/6 | pass | pass: Pointer/keyboard file picker with one and two real callback files | 0 |
| elastic-mesh | 6/6 | pass | pass: mesh deformation, keyboard pause stops paint, reduced motion stays still | 0 |
| empty | 6/6 | pass | pass: Pointer note creation; keyboard reset; partial/error/filtered states rendered | 0 |
| falling-text | 6/6 | pass | pass: keyboard pause stops paint, reduced motion stays still | 0 |
| field | 6/6 | pass | pass: Pointer edits clear invalid state; keyboard empty input restores linked error | 0 |
| float-layer | 6/6 | pass | pass: Native scroll moves the decorative plane; reduced motion holds it still and preserves content | 0 |
| flow-sculpture | 6/6 | pass | pass: Material form changes actual paint; color and material controls, paused-action semantics and reduced-motion stability | 0 |
| focus-session | 6/6 | pass | pass: Elapsed-time countdown advances, keyboard pause holds time, resume works, reset clears progress, and duration selection creates a fresh session. | 0 |
| folds-background | 6/6 | pass | pass: Spacing and strength change the actual decorative paint; foreground action remains usable | 0 |
| ghost-cursor | 6/6 | pass | pass: visible paint changes, keyboard pause stops paint, reduced motion stays still | 0 |
| glass-sculpture | 6/6 | pass | pass: Material form changes actual paint; color and material controls, paused-action semantics and reduced-motion stability | 0 |
| glyph-sculpture | 6/6 | pass | pass: Form changes actual paint; color, print-specific controls and disabled dependencies work; reduced motion stays still | 0 |
| grain-dissolve | 6/6 | pass | pass: keyboard scene transition, interrupted reversal, inactive content inert, still mode settles target, reduced motion stays still | 0 |
| grid-background | 6/6 | pass | pass: Spacing and strength change the actual decorative paint; foreground action remains usable | 0 |
| guided-pointer | 6/6 | pass | pass: Waypoint controls move the decorative pointer, finite ring settles, hand geometry renders, and quiet navigation retains endpoint bounds | 0 |
| hero-button | 6/6 | pass | pass: Native pointer, Enter and Space activation each produce one visible result, including reduced motion | 0 |
| hover-card | 6/6 | pass | pass: Pointer hover and keyboard focus show card; Escape dismisses | 0 |
| icon | 6/6 | pass | pass: Keyboard icon selection, semantic search/empty results, clear and real result pagination | 0 |
| image-masking | 6/6 | pass | pass: shape choice changes actual image mask, semantic image alternative, reduced motion stays still | 0 |
| image-trail | 6/6 | pass | pass: visible paint changes, keyboard pause stops paint, reduced motion stays still | 0 |
| infinite-spiral | 6/6 | pass | pass: pointer image selection, keyboard next image, reduced motion stays still | 0 |
| ink-sculpture | 6/6 | pass | pass: Form changes actual paint; color, print-specific controls and disabled dependencies work; reduced motion stays still | 0 |
| input | 6/6 | pass | pass: Pointer input change and keyboard clear action | 0 |
| input-group | 6/6 | pass | pass: Pointer and keyboard saving; multiline instruction remains inside the input group | 0 |
| input-otp | 6/6 | pass | pass: Pointer focus, digit entry, completion and keyboard deletion | 0 |
| invite-card | 6/6 | pass | pass: Pointer acceptance and keyboard decline update mutually exclusive RSVP states and the example's local-only receipt. | 0 |
| item | 6/6 | pass | pass: Pointer and keyboard selection callbacks | 0 |
| item-adornment | 6/6 | pass | pass: Independent icon/background switches remove and restore decoration while preserving the item text | 0 |
| kbd | 6/6 | pass | passive: No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately. | 0 |
| label | 6/6 | pass | passive: No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately. | 0 |
| line-chart | 6/6 | pass | pass: Keyboard inspection and Escape, legend hide/show, data table, empty state and new dataset; all chart layouts covered by chart gate | 0 |
| linear-modal | 6/6 | pass | pass: keyboard open, modal focus containment, Escape dismissal and focus return, reduced motion stays still | 0 |
| living-link | 6/6 | pass | pass: Native fragment navigation reaches real content, disabled link cannot navigate, and quiet keyboard activation stays native | 0 |
| magic-rings | 6/6 | pass | pass: visible paint changes, keyboard pause stops paint, reduced motion stays still | 0 |
| marker | 6/6 | pass | passive: No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately. | 0 |
| marquee | 6/6 | pass | pass: Explicit pause, direction/pace controls, four inert copies and static reduced-motion reading | 0 |
| menubar | 6/6 | pass | pass: Pointer menu action and keyboard checked menu item | 0 |
| message | 6/6 | pass | passive: No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately. | 0 |
| message-scroller | 6/6 | pass | pass: Pointer/keyboard append, detached scrolling and jump to latest | 0 |
| meta-balls | 6/6 | pass | pass: visible paint changes, keyboard pause stops paint, reduced motion stays still | 0 |
| milestone-path | 6/6 | pass | pass: Caller-owned progress completes and restarts without a false current step; keyboard title selection preserves progress | 0 |
| motion-drawer | 6/6 | pass | pass: keyboard open, modal focus containment, Escape dismissal and focus return, pointer drag dismissal, reduced motion stays still | 0 |
| multi-select | 6/6 | pass | pass: Real workspace search, disabled option, selection token, Escape/focus restoration and keyboard removal | 0 |
| native-select | 6/6 | pass | limited: Native selectOption updates the callback receipt. Native picker keyboard selection is unverified on this headless macOS Chromium platform; ArrowDown/Enter also failed on a separate bare unstyled select. | 0 |
| navigation-menu | 6/6 | pass | pass: Pointer and keyboard collection navigation | 0 |
| number-input | 6/6 | pass | pass: Native step buttons and keyboard, controlled decimal edits, maximum clamping/disabled increment, clear/reset and quiet updates | 0 |
| option-wheel | 6/6 | pass | pass: listbox keyboard selection, pointer wraparound selection, reduced motion stays still | 0 |
| orbit-images | 6/6 | pass | pass: visible paint changes, keyboard pause stops paint, reduced motion stays still | 0 |
| organism-assembly | 6/6 | pass | pass: Assembly/replay preserve native control identity and state; pointer choices and arrow-key navigation produce an interactive native chat. | 0 |
| organism-composition | 6/6 | pass | pass: Native bubbles; empty/whitespace send guard; keyboard and pointer sends clear draft; clear restores empty conversation. | 0 |
| pagination | 6/6 | pass | pass: Pointer next and keyboard previous update page content | 0 |
| particle-sculpture | 6/6 | pass | pass: Material form changes actual paint; color and material controls, paused-action semantics and reduced-motion stability | 0 |
| particle-text | 6/6 | pass | pass: keyboard pause stops paint, reduced motion stays still | 0 |
| pattern-background | 6/6 | pass | pass: Spacing and strength change the actual decorative paint; foreground action remains usable | 0 |
| pebbles-background | 6/6 | pass | pass: Spacing and strength change the actual decorative paint; foreground action remains usable | 0 |
| pie-chart | 6/6 | pass | pass: Keyboard inspection and Escape, legend hide/show, data table, empty state and new dataset; all chart layouts covered by chart gate | 0 |
| pigment-field | 6/6 | pass | pass: Save result, keyboard pause, tone and pace controls, and a still reduced-motion surface | 0 |
| pixel-swap | 6/6 | pass | pass: tiled transition, outgoing content inert, reduced motion stays still | 0 |
| popover | 6/6 | pass | pass: Pointer edit and keyboard opening/Escape | 0 |
| portal-field | 6/6 | pass | pass: organic WebGL halo changes, keyboard pause stops paint, reduced motion stays still | 0 |
| presence | 6/6 | pass | pass: Actual keyed removal and replacement complete with pointer and keyboard | 0 |
| preview | 6/6 | pass | pass: Nested preview pointer code tab and keyboard preview tab | 0 |
| profile-card | 6/6 | pass | pass: Follow/save retain state; keyboard-opened message composer receives focus, saves a local note and closes cleanly. | 0 |
| progress | 6/6 | pass | pass: Pointer and keyboard progress changes | 0 |
| questionnaire | 6/6 | pass | pass: Pointer and keyboard answers complete both questions and save a local summary | 0 |
| radar-chart | 6/6 | pass | pass: Keyboard inspection and Escape, legend hide/show, data table, empty state and new dataset; all chart layouts covered by chart gate | 0 |
| radial-chart | 6/6 | pass | pass: Keyboard inspection and Escape, legend hide/show, data table, empty state and new dataset; all chart layouts covered by chart gate | 0 |
| radio-group | 6/6 | pass | pass: Pointer and arrow-key selection choose exactly one project starting point | 0 |
| reading-trail | 6/6 | pass | pass: Trail links scroll the actual article, transfer focus and update progress/current location; quiet keyboard return works | 0 |
| resizable | 6/6 | pass | pass: Keyboard handle resize and pointer drag | 0 |
| ripple-distortion | 6/6 | pass | pass: visible paint changes, keyboard pause stops paint, reduced motion stays still | 0 |
| scroll-area | 6/6 | pass | pass: Pointer wheel and keyboard PageDown scrolling | 0 |
| scroll-expand | 6/6 | pass | pass: controlled expansion, reduced motion stays still | 0 |
| scroll-organism | 6/6 | pass | pass: Native scroll moves the decorative plane; reduced motion holds it still and preserves content | 0 |
| scroll-reveal | 6/6 | pass | pass: keyboard pause stops paint, reduced motion stays still | 0 |
| sculpture-orbit | 6/6 | pass | pass: Turn button changes geometry; keyboard zoom/Home and explicit reduced-motion orbit preserve real view controls | 0 |
| select | 6/6 | pass | pass: Pointer and keyboard option selection | 0 |
| semantic-bloom | 6/6 | pass | pass: Pause holds the canvas; pointer scatter and keyboard gather change it; palette, wordmark and cursor controls update real component state; reduced motion stays still | 0 |
| separator | 6/6 | pass | passive: No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately. | 0 |
| shape | 6/6 | pass | pass: Unified shape studio changes actual contour, palette, shadow and copied JSX; keyboard Breathe remains still under reduced motion | 0 |
| shape-artwork | 6/6 | pass | pass: Unified shape studio changes actual contour, palette, shadow and copied JSX; keyboard Breathe remains still under reduced motion | 0 |
| shape-scene | 6/6 | pass | pass: Usable renderer/fallback, pointer and keyboard composition changes, and still reduced-motion paint | 0 |
| sheet | 6/6 | pass | pass: Pointer preference toggle and keyboard opening/Escape | 0 |
| sidebar | 6/6 | pass | pass: Pointer navigation, keyboard collapse, collapsed accessible link and expansion | 0 |
| skeleton | 6/6 | pass | passive: No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately. | 0 |
| slider | 6/6 | pass | pass: Pointer/keyboard value changes, named range thumbs with minimum separation, and actual rubber waist thinning even with reduced motion | 0 |
| spinner | 6/6 | pass | passive: No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately. | 0 |
| sprouts-background | 6/6 | pass | pass: Spacing and strength change the actual decorative paint; foreground action remains usable | 0 |
| stepper | 6/6 | pass | pass: Validation gates advancement; pointer/keyboard steps preserve the draft and save a truthful local receipt | 0 |
| strands | 6/6 | pass | pass: visible paint changes, keyboard pause stops paint, reduced motion stays still | 0 |
| sunwash-background | 6/6 | pass | pass: Spacing and strength change the actual decorative paint; foreground action remains usable | 0 |
| swapy | 6/6 | pass | pass: keyboard reorder persists, pointer handle swaps real cards, order change announced, reduced motion stays still | 0 |
| swarm-cursor | 6/6 | pass | pass: visible paint changes, keyboard pause stops paint, reduced motion stays still | 0 |
| switch | 6/6 | pass | pass: Pointer/Space changes the named quiet-hours setting and visible result | 0 |
| table | 6/6 | pass | pass: Pointer and keyboard filters, numeric ascending sort, next page and row selection | 0 |
| tabs | 6/6 | pass | pass: Pointer tab and arrow-key tab activate matching content | 0 |
| target-cursor | 6/6 | pass | pass: keyboard target tracking, reduced motion stays still | 0 |
| text-reveal | 6/6 | pass | pass: Real pointer/keyboard replay, stable layout and reduced-motion stillness | 0 |
| text-ribbon | 6/6 | pass | pass: Editable phrase reaches the path; pause, keyboard positioning, reverse and guide controls work, with quiet motion held | 0 |
| textarea | 6/6 | pass | pass: Pointer composition and keyboard save confirm the local note, preserve the draft and clear stale confirmation on edit | 0 |
| theme-toggle | 6/6 | pass | pass: Pointer and keyboard theme callback; morphing switch exposes checked state | 0 |
| toast | 6/6 | pass | pass: Pointer save/undo; keyboard save and explicit dismissal | 0 |
| toggle | 6/6 | pass | pass: Pointer and Space pressed-state changes | 0 |
| toggle-group | 6/6 | pass | pass: Pointer and keyboard toggles change actual text formatting | 0 |
| tooltip | 6/6 | pass | pass: Pointer hover and keyboard focus reveal tooltip; Escape dismisses | 0 |
| typography | 6/6 | pass | passive: No direct component action in this specimen. Shared Preview controls and applicable decorative motion are checked separately. | 0 |
| typography-vortex | 6/6 | pass | pass: visible paint changes, keyboard pause stops paint, reduced motion stays still | 0 |
| variable-proximity | 6/6 | pass | pass: keyboard pause stops paint, reduced motion stays still | 0 |
| warp-text | 6/6 | pass | pass: visible paint changes, keyboard pause stops paint, reduced motion stays still | 0 |
| wave-wipe | 6/6 | pass | pass: keyboard scene transition, interrupted reversal, inactive content inert, still mode settles target, reduced motion stays still | 0 |
| weave-background | 6/6 | pass | pass: Spacing and strength change the actual decorative paint; foreground action remains usable | 0 |
| word-relay | 6/6 | pass | pass: Navigation handle updates real phrases; word split, timed cycle and quiet manual/reset behavior remain readable | 0 |
| word-stream | 6/6 | pass | pass: keyboard pause stops paint, reduced motion stays still | 0 |
| work-side-panel | 6/6 | pass | pass: Pointer and keyboard task completion update progress to 100%; Start fresh clears all tasks and progress. | 0 |
| writing-caret | 6/6 | pass | pass: Keyboard replay blinks, the still control settles visibly, and reduced motion preserves the decorative mark | 0 |
| zoom-words | 6/6 | pass | pass: keyboard pause stops paint, reduced motion stays still | 0 |

Motion presets: 9/9. Additional checks: 5/5.

- glide: PASS
- stretch: PASS
- jelly: PASS
- comet: PASS
- drop: PASS
- rubber: PASS
- pebble: PASS
- ripple: PASS
- halo: PASS
- speed and intensity controls persist independently of preset: PASS
- preset and tuning survive page reload: PASS
- no runtime errors: PASS
- Pagination keeps one animated paint owner and steady native targets through selection: PASS
- Off disables native Button press movement after Morph detaches: PASS

Raw JSON, screenshots and frame samples are written under `artifacts/production-docs/` and `artifacts/production-motion/`. CI uploads both folders. Historical reference differences are recorded separately in [BASELINE-STATUS.md](BASELINE-STATUS.md).
