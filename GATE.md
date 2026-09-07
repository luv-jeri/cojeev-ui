# Production gate

Result: **PASS**. Started 2026-09-07T23:26:49.311Z; finished 2026-09-07T23:34:23.576Z.

Built registry SHA-256: `8cdc014555da7eb2c07db8c6f91f51943d063f6d76f436a2c8ed184498aaf0b6`.

Run `npm run build && npm run gate` to reproduce. This gate serves the static build. It checks default specimens at 360, 768 and 1440 pixels in both themes, documentation controls and meaningful component interactions. Copied variant/size snippets are separately compiled by `npm run check:examples`. It does not claim every state in every browser or physical-device verification.

Documentation: 77 entries, 462 layouts. Shell checks: 6/6.

| Component | Layouts | Preview / copy | Behavior | Runtime errors |
| --- | --- | --- | --- | ---: |
| accordion | 6/6 | pass | pass: Pointer expansion; arrow focus navigation and Enter expansion | 0 |
| adjuster | 6/6 | pass | pass: Pointer export, keyboard invalid import/error, reset runtime | 0 |
| alert | 6/6 | pass | pass: Pointer dismissal and keyboard restoration | 0 |
| alert-dialog | 6/6 | pass | pass: Pointer/keyboard opening, focus inside, Escape, confirmation and restore | 0 |
| ambient-background | 6/6 | pass | pass: Composition control and pointer/keyboard pause-resume | 0 |
| animated-number | 6/6 | pass | pass: Pointer/keyboard updates, interruption without overshoot, reduced motion and exact reset | 0 |
| aspect-ratio | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| attachment | 6/6 | pass | pass: Real text download by pointer, keyboard removal and restoration | 0 |
| avatar | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| badge | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| breadcrumb | 6/6 | pass | pass: Keyboard activation reaches Sidebar documentation | 0 |
| bubble | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| button | 6/6 | pass | pass: Pointer loading, disabled pending state, keyboard failure and retry | 0 |
| button-group | 6/6 | pass | pass: Pointer and keyboard selection update content | 0 |
| calendar | 6/6 | pass | pass: Pointer date selection and arrow/Enter selection | 0 |
| card | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| carousel | 6/6 | pass | pass: Pointer next and keyboard previous update active idea | 0 |
| chart | 6/6 | pass | pass: Pointer reveals all three data tables; keyboard hides them; zero datum retained | 0 |
| checkbox | 6/6 | pass | pass: Pointer/Space checked changes, disabled option | 0 |
| code-block | 6/6 | pass | pass: Wrap control and actual clipboard preserves exact code | 0 |
| collapsible | 6/6 | pass | pass: Pointer expands and keyboard collapses content | 0 |
| combobox | 6/6 | pass | pass: Pointer filtered option and keyboard filtered option selection | 0 |
| command | 6/6 | pass | pass: Pointer action and keyboard search/action | 0 |
| context-menu | 6/6 | pass | pass: Pointer context menu action and keyboard context menu/Escape | 0 |
| data-table | 6/6 | pass | pass: Pointer and keyboard filters, numeric ascending sort, next page and row selection | 0 |
| date-picker | 6/6 | pass | pass: Pointer date selection; keyboard opening/Escape/focus return | 0 |
| dialog | 6/6 | pass | pass: Pointer rename/save; focus entry and restoration; keyboard opening/Escape | 0 |
| direction | 6/6 | pass | pass: Pointer/keyboard direction switching | 0 |
| drawer | 6/6 | pass | pass: Pointer open/close and keyboard open/Escape | 0 |
| dropdown-menu | 6/6 | pass | pass: Pointer checked item; keyboard menu opening/Escape | 0 |
| dropzone | 6/6 | pass | pass: Pointer/keyboard file picker with one and two real callback files | 0 |
| empty | 6/6 | pass | pass: Pointer note creation; keyboard reset; partial/error/filtered states rendered | 0 |
| field | 6/6 | pass | pass: Pointer edits clear invalid state; keyboard empty input restores linked error | 0 |
| hover-card | 6/6 | pass | pass: Pointer hover and keyboard focus show card; Escape dismisses | 0 |
| icon | 6/6 | pass | pass: Pointer/keyboard icon-name filtering and reset | 0 |
| input | 6/6 | pass | pass: Pointer input change and keyboard clear action | 0 |
| input-group | 6/6 | pass | pass: Pointer and keyboard saving update the displayed address | 0 |
| input-otp | 6/6 | pass | pass: Pointer focus, digit entry, completion and keyboard deletion | 0 |
| item | 6/6 | pass | pass: Pointer and keyboard selection callbacks | 0 |
| kbd | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| label | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| marker | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| marquee | 6/6 | pass | pass: Explicit pause, direction/pace controls, inert copy and static reduced-motion reading | 0 |
| menubar | 6/6 | pass | pass: Pointer menu action and keyboard checked menu item | 0 |
| message | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| message-scroller | 6/6 | pass | pass: Pointer/keyboard append, detached scrolling and jump to latest | 0 |
| multi-select | 6/6 | pass | pass: Search selection, Escape/focus return, keyboard removal and visible validation/reset | 0 |
| native-select | 6/6 | pass | pass: Native selection and keyboard selection update receipt | 0 |
| navigation-menu | 6/6 | pass | pass: Pointer and keyboard collection navigation | 0 |
| pagination | 6/6 | pass | pass: Pointer next and keyboard previous update page content | 0 |
| popover | 6/6 | pass | pass: Pointer edit and keyboard opening/Escape | 0 |
| preview | 6/6 | pass | pass: Nested preview pointer code tab and keyboard preview tab | 0 |
| progress | 6/6 | pass | pass: Pointer and keyboard progress changes | 0 |
| questionnaire | 6/6 | pass | pass: Pointer and keyboard answers update completion and summary | 0 |
| radio-group | 6/6 | pass | pass: Pointer selection and arrow-key radio selection | 0 |
| resizable | 6/6 | pass | pass: Keyboard handle resize and pointer drag | 0 |
| scroll-area | 6/6 | pass | pass: Pointer wheel and keyboard PageDown scrolling | 0 |
| select | 6/6 | pass | pass: Pointer and keyboard option selection | 0 |
| separator | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| shape | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| shape-scene | 6/6 | pass | pass: Scene rendering, pause/resume and palette update | 0 |
| sheet | 6/6 | pass | pass: Pointer preference toggle and keyboard opening/Escape | 0 |
| sidebar | 6/6 | pass | pass: Pointer navigation, keyboard collapse, collapsed accessible link and expansion | 0 |
| skeleton | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| slider | 6/6 | pass | pass: Pointer slider placement and arrow-key increment | 0 |
| spinner | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| stepper | 6/6 | pass | pass: Pointer/keyboard forward steps, final disabled boundary and back | 0 |
| switch | 6/6 | pass | pass: Pointer/Space changes and disabled state | 0 |
| table | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |
| tabs | 6/6 | pass | pass: Pointer tab and arrow-key tab activate matching content | 0 |
| text-reveal | 6/6 | pass | pass: Real pointer/keyboard replay, stable layout and reduced-motion stillness | 0 |
| textarea | 6/6 | pass | pass: Pointer composition and keyboard save render local note and clear input | 0 |
| toast | 6/6 | pass | pass: Pointer save/undo; keyboard save and explicit dismissal | 0 |
| toggle | 6/6 | pass | pass: Pointer and Space pressed-state changes | 0 |
| toggle-group | 6/6 | pass | pass: Pointer and keyboard toggles change actual text formatting | 0 |
| tooltip | 6/6 | pass | pass: Pointer hover and keyboard focus reveal tooltip; Escape dismisses | 0 |
| typography | 6/6 | pass | passive: Static content; no component-owned interaction. Shared Preview controls tested independently. | 0 |

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
- authored Pagination bodies remain still during pointer hold: PASS
- Off disables native Button press movement after Morph detaches: PASS

Raw JSON, screenshots and frame samples are written under `artifacts/production-docs/` and `artifacts/production-motion/`. CI uploads both folders. Historical reference differences are recorded separately in [BASELINE-STATUS.md](BASELINE-STATUS.md).
