Missing inputs: approved comp, QUALITY BAR card, and a five-block direction contract with corroborated FORM seed were not supplied; PRODUCT.md, DESIGN.md, the current brief, prior audit reports and all variant screenshots were available.

## persistence

Pass: PRODUCT.md and DESIGN.md exist and match the warm paper, ink typography, branded color, organic contour, local-demo and accessible-control direction. OVERHAUL-PLAN.md explicitly treats the prior release as a starting point rather than proof. Formal Impeccable contract/seed provenance remains unverified; no seed or approved comp was invented.

`scripts/check-overhaul-variants.mjs` is a repeatable Playwright audit of the 61 non-chart IDs in `verification/overhaul-scope.json`. It compares docs controls to registry metadata, iterates the complete documented variant×size cross-product, waits for the selected data attributes and actual rendered child after external presence exits, rejects Loading preview, stores browser accessibility snapshots, checks page/control bounds, exercises hover/focus and a real native disabled pointer action where available, and screenshots every case. `--ids` and `--variants` support bounded confirmations.

Full pass: 194 combinations × two contexts (390/dark and 1440/light) = 388 captured cases. Original result:386 mechanical passes and 2 Command name failures; no placeholder failures and no navigation/HMR retries. Targeted confirmation:24 soft Badge cases and 2 Command cases pass. `final-results.json` preserves the original matrix and replaces affected cases with targeted Command, Badge, Item, Avatar, Combobox and Questionnaire confirmations, giving 388 current mechanical passes. Mechanical pass is not a claim that every brief requirement is finished.

Receipts: `output/playwright/overhaul-variants/results.json`, `final-results.json`,388 raw screenshots,26 contact sheets `all-390-dark-00.png`…`12.png` and `all-1440-light-00.png`…`12.png`, and `review-index.json` mapping every image to its entry/variant/size. All 26 sheets were opened and inspected, with raw screenshots used for ambiguous detail. Confirmation receipts live in `overhaul-variants-badge-confirm` and `overhaul-variants-command-confirm`. TypeScript check passed after the Command and Badge fixes. A bounded 18-case follow-up covered Item, Avatar, Combobox and Questionnaire without repeating the full matrix. Its results and the specific Item/Avatar computed-style evidence are in `overhaul-variants-finish-confirm`. All 18 passed mechanical checks; manual screenshot review still identified a Questionnaire paint defect, fixed and confirmed separately below. The matrix JSON therefore remains a geometry/semantics result, not full brief acceptance.

## fidelity

- Intentional evolution: the brief permits moving beyond the static handoff. Card and alert accents, organic active controls and expressive status forms retain the named type/color family; no approved-comp pixel comparison was possible.
- Corrected defect: CommandInput lacked an accessible name in the native accessibility tree. It now defaults to “Search commands” while caller props can override the label.
- Corrected defect: dark soft Badge variants paired #111 text with muted midtone fills. Component-scoped deep tints and pale foreground now measure 10.53–11.89:1 contrast; light styling is preserved.
- Corrected defect: selected Item changed its disk to the dark canvas while retaining a dark icon. The disk now sets `color: var(--v-text)` with its selected background. Six Item variant/context cases reconfirmed; actual glyph stroke is rgb(246,239,226) on rgb(23,21,18).
- Retired finding: the reduced Avatar contact-sheet image made square/lg look circular. Close original images and live geometry confirm square uses a 26px radius at 110px while default uses 50%; neither has an overriding morph layer. Eight Avatar cases reconfirmed. No Avatar code was changed.
- Unresolved intent: Spinner point/default captures use the same flower silhouette. The documented distinction needs an intentional visible result or an explicit alias contract.
- Corrected defect: Questionnaire hover paint obscured enabled content: an opaque hover surface at z-index 2 sat above the label at z-index 1. Only its existing component-specific rule in `styles/flow-press.css` changed to an 8% translucent ink tint. Both contexts now show readable hover text/icon; Space selects the first option and ArrowDown selects only the second. Two targeted matrix cases plus `interaction-results.json` and four manually inspected hover/selection screenshots are in `overhaul-variants-questionnaire-confirm`. The original paint defect evidence remains in `overhaul-variants-finish-confirm`. No Questionnaire component-style override remains.
- Retired capture ambiguity: focusing Combobox opens a real portal outside the specimen crop. The script now presses Escape before its final resting capture. Both cases pass and both clean resting screenshots were inspected in `overhaul-variants-combobox-confirm`; no component change was needed.

Every row below has screenshots in both requested contexts and every documented size combination. This covers the options actually advertised by the docs controls, not every additional color or prop exposed only by a component's TypeScript API.

| Entry | Documented variants | Sizes | Cases | Exercised surface | Visual result |
| --- | --- | --- | --- | --- | --- |
| aspect-ratio | default | default | 2/2 | passive specimen | No additional visible defect identified in supplied states. |
| card | default, pink, yellow, olive, blue, ink, cream, featured, panel, lift | default, sm | 40/40 | passive specimen | No additional visible defect identified in supplied states. |
| collapsible | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| resizable | default, v | default | 4/4 | passive specimen | No additional visible defect identified in supplied states. |
| scroll-area | default, ink | default | 4/4 | passive specimen | No additional visible defect identified in supplied states. |
| separator | default, v | default | 4/4 | passive specimen | No additional visible defect identified in supplied states. |
| sidebar | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| breadcrumb | default | default | 2/2 | passive specimen | No additional visible defect identified in supplied states. |
| menubar | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| navigation-menu | default | default | 2/2 | passive specimen | No additional visible defect identified in supplied states. |
| pagination | default | default | 2/2 | native disabled pointer; hover/focus | No additional visible defect identified in supplied states. |
| tabs | default, underline, lenses | default | 6/6 | hover/focus | No additional visible defect identified in supplied states. |
| alert | default, info, ok, warn, danger, pink | default | 12/12 | hover/focus | No additional visible defect identified in supplied states. |
| alert-dialog | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| badge | default, pink, yellow, olive, blue, ink, cream, pink-soft, yellow-soft, olive-soft, blue-soft, danger, pending, count, dashed, caps, test, live | default, sm, lg | 108/108 | passive specimen | Soft dark contrast corrected and 24 cases reconfirmed. |
| empty | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| progress | default, cream, unavail | default, lg, sm | 18/18 | native disabled pointer; hover/focus | No additional visible defect identified in supplied states. |
| skeleton | default, line, disk, card, skel-group | default | 10/10 | passive specimen | No additional visible defect identified in supplied states. |
| spinner | default, point | default | 4/4 | passive specimen | Point/default distinction unclear in captures; motion owner checking. |
| toast | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| tooltip | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| avatar | default, square | default, lg | 8/8 | passive specimen | Close inspection confirms square geometry; 8 cases reconfirmed, no code change. |
| bubble | default | default | 2/2 | passive specimen | No additional visible defect identified in supplied states. |
| data-table | default | default | 2/2 | native disabled pointer; hover/focus | No additional visible defect identified in supplied states. |
| item | default, selected, flat | default | 6/6 | hover/focus | Selected dark icon foreground fixed; 6 cases reconfirmed. |
| kbd | default | default | 2/2 | passive specimen | No additional visible defect identified in supplied states. |
| marker | default, ok, danger | default | 6/6 | passive specimen | No additional visible defect identified in supplied states. |
| table | default | default | 2/2 | passive specimen | No additional visible defect identified in supplied states. |
| typography | default | default | 2/2 | passive specimen | No additional visible defect identified in supplied states. |
| context-menu | default | default | 2/2 | passive specimen | No additional visible defect identified in supplied states. |
| dialog | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| drawer | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| dropdown-menu | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| hover-card | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| popover | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| sheet | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| button | default, accent, secondary, ghost, outline, danger, block | default, sm, lg | 42/42 | native disabled pointer; hover/focus | No additional visible defect identified in supplied states. |
| button-group | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| checkbox | default | default | 2/2 | native disabled pointer; hover/focus | No additional visible defect identified in supplied states. |
| combobox | default | default | 2/2 | hover/focus | Focus opens a portal outside specimen crop; Escape restores resting screenshot. |
| command | default | default | 2/2 | hover/focus | Accessible name corrected and 2 cases reconfirmed. |
| date-picker | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| calendar | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| direction | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| field | default, invalid | default | 4/4 | hover/focus | No additional visible defect identified in supplied states. |
| input | default, cream | default, sm | 8/8 | native disabled pointer; hover/focus | No additional visible defect identified in supplied states. |
| input-group | default | default | 2/2 | native disabled pointer; hover/focus | No additional visible defect identified in supplied states. |
| input-otp | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| label | default | default, sm | 4/4 | hover/focus | No additional visible defect identified in supplied states. |
| native-select | default, ink | default | 4/4 | hover/focus | No additional visible defect identified in supplied states. |
| radio-group | default | default | 2/2 | native disabled pointer; hover/focus | No additional visible defect identified in supplied states. |
| select | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| slider | default, pink | default | 4/4 | hover/focus | No additional visible defect identified in supplied states. |
| switch | default | default | 2/2 | native disabled pointer; hover/focus | No additional visible defect identified in supplied states. |
| textarea | default | default | 2/2 | native disabled pointer; hover/focus | No additional visible defect identified in supplied states. |
| toggle | default, pressed, pink, circle | default | 8/8 | native disabled pointer; hover/focus | No additional visible defect identified in supplied states. |
| toggle-group | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| attachment | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| message | default, me | default | 4/4 | passive specimen | No additional visible defect identified in supplied states. |
| message-scroller | default | default | 2/2 | hover/focus | No additional visible defect identified in supplied states. |
| questionnaire | default | default | 2/2 | hover/focus | Hover paint corrected; both contexts reconfirmed with Space/ArrowDown selection. |

## ceiling

The world uses branded warm/dark surfaces, a coherent type scale, explicit selected colors and authored geometric accents. The shared motion system's temporal quality cannot be judged from this settled-state matrix. Identity is stronger in Card/Alert/Spinner and compound examples than in passive Separator/Table/Label specimens; the brief's “signature for every component” is not proven merely by matching their palette. No QUALITY BAR card was supplied, so this review cannot claim its ceiling was reached.

Eleven entries render native disabled examples: pagination,progress,data-table,button,checkbox,input,input-group,radio-group,switch,textarea,toggle. Their tested disabled pointer action did not change visible state. None of the 61existing docs specimens supplied a dedicated long text label/description over 120 characters in this run; no synthetic text was injected to claim long-content acceptance. This matrix does not establish 320/768 layouts, every submenu, every checked/error state, universal exit/Off/reduced-motion behavior, backend integration, or consumer installation. Those require the parent's separate existing streams/gates.

Demo text and actions describe local examples; the screenshots do not invent live AI activity or commercial performance claims. There was no approved image-native composition available to judge asset fidelity.

## material_fixes

1. Resolve Spinner point/default visual equivalence with the motion owner (variant fidelity).
2. Close dedicated long-content and 320/768 coverage gaps with explicit cases; this 388-case matrix does not substitute for the parent's responsive checks (responsive-boundary promise).
3. Keep universal actual-boundary presence, keyboard interruption and Off/reduced-motion acceptance separate from default variant screenshots (motion promise).
4. Record each passive entry's intended signature device before asserting the “every component” identity requirement is complete (ceiling promise).
5. Reconcile missing FORM seed, approved-comp and QUALITY BAR evidence before claiming formal contract/ceiling acceptance; do not fabricate retrospective provenance.

## keep

Keep the warm paper/ink hierarchy, readable themed foregrounds, explicit local-demo outcomes, complete variant/size controls, native input semantics and immediate cancellation behavior while resolving these bounded findings.

## Integration resolution

The subsequent primitive audit resolved Spinner point/default geometry and verified motion/quiet behavior in [OVERHAUL-PRIMITIVES.md](OVERHAUL-PRIMITIVES.md). Fourteen dedicated long-content compositions passed at 320px in both themes in [OVERHAUL-LONG-CONTENT.md](OVERHAUL-LONG-CONTENT.md). Retained membership, keyboard interruption and Off/reduced behavior have separate evidence in [OVERHAUL-LIFECYCLE.md](OVERHAUL-LIFECYCLE.md). [DESIGN.md](DESIGN.md) records the implemented identity and atomic treatment. These follow-ups close the concrete implementation gaps; they do not invent missing owner-approved composition or QUALITY BAR provenance.
