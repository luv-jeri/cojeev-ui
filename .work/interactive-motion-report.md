# Interactive motion integration audit

All 29 owned IDs were checked against `motion/category.ts` CATS, FILL, STROKE, NEVER, native VOID, and scroll exclusions. This pass adds component-owned refs only; source category defaults and eligibility remain controlled by the shared resolver. Root/motion owner supplies the exact Radix selector aliases and state-attribute observation.

| ID | Ownership decision |
| --- | --- |
| accordion | AccordionItem → cards; source details selector requires the exact motion-owner alias. |
| alert-dialog | AlertDialogContent → surfaces; Trigger/Action/Cancel reuse child Button ownership. |
| calendar | CalendarCaption month → buttons; day → nav; active week number → pills. IconButton owns the previous/next bodies. |
| checkbox | Checkbox → controls for explicit root overrides; automatic native-input eligibility is not broadened. |
| collapsible | CollapsibleContent → cards, composed with appearance ref. |
| combobox | Content → surfaces; Item → nav; InputWrapper receives its inputs body from the composed Input component. |
| command | Command root → surfaces; CommandInput wrapper → inputs; Item → nav. |
| context-menu | Content/SubContent → surfaces; Item/SubTrigger/CheckboxItem/RadioItem → nav. |
| date-picker | Trigger already owns buttons; Content delegates to Popover surfaces; Calendar owns its eligible internal bodies. |
| dialog | Content → surfaces; trigger and close composition reuse the visual child. |
| drawer | Content → surfaces; trigger and close composition reuse the visual child. |
| dropdown-menu | Content/SubContent → surfaces; Item/SubTrigger/CheckboxItem/RadioItem → nav. |
| hover-card | Content → surfaces; the actual popover owns the body. |
| input-otp | InputOTPGroup → inputs for explicit group overrides only. Source native cells are VOID-excluded and remain without automatic bodies. |
| menubar | Root → nav; Trigger already owns buttons; Content/SubContent → surfaces; menu item variants → nav. |
| navigation-menu | Link → nav; Count → pills. List and layout wrappers do not gain automatic paint bodies. |
| popover | Content → surfaces, composed with appearance ref. |
| radio-group | RadioGroupItem → controls for explicit overrides. Source label/VOID exclusions are not replaced with broad automatic aliases. |
| resizable | PanelGroup → cards via the current library elementRef API; handle behavior unchanged. |
| scroll-area | No automatic body added: source overflow:auto/scroll is rejected before category lookup. Radix changes the root to overflow:hidden, so adding a root hook would accidentally change eligibility. |
| select | Trigger already owns buttons; Content → surfaces; Item → nav. |
| sheet | Content → surfaces; trigger and close composition reuse the visual child. |
| slider | No automatic body added: the source native range input is VOID-excluded, and neither FILL nor STROKE selects its body. |
| switch | Root → controls, preserving the real Radix thumb and source category default. |
| tabs | List and Trigger → nav; exact source FILL/STROKE eligibility still controls whether a body appears. Existing group/press refs compose through morphRef. |
| toast | Root → surfaces. Action/Close delegate default visual bodies to the production Button through Radix asChild; caller asChild remains supported. |
| toggle | Existing Toggle → buttons retained. |
| toggle-group | Root → nav; Item → buttons. Item asChild delegates its body/press ref to the chosen child to avoid duplicate ownership with production Button. |
| tooltip | Content → surfaces for explicit overrides; source has no automatic .v-tip category selector. |

## Related integration fixes

- Removed the dead malformed `::-webkit-[data-slot="accordion-item"]-marker` rule. The native details marker does not exist on Radix AccordionTrigger. No further malformed pseudo-selector replacements were found in the owned stylesheet audit.
- Calendar day buttons now expose valid `aria-pressed` and retain `data-state=active`; DayPicker owns gridcell `aria-selected`. Owned selected-day CSS and flow selectors follow the valid button state.
- Combobox derives query text from a selected-label snapshot without a state-setting effect. A separate callback-ref context prevents ref values from contaminating render state. Input focus remains an event-driven operation.
- Removed three unused Button imports. Toast default action/close now compose the actual Button export, preserving its source body and motion API.

## Checks and evidence boundary

- Full union TypeScript: passed.
- ESLint on all 29 interactive TSX files with max-warnings 0: passed after the context ref correction.
- No new package dependency; added imports target existing production modules.
- Browser appearance, interaction, motion lifecycle, and saved-settings parity remain for the root sequential harness. This report does not claim those gates passed.
