# Interactive fixture conversion handoff

The converter implements all 29 interactive families using the production exports in commit 02267c1 and the integrated static/composed union. `apps/gate/candidate.tsx` dispatches composed, interactive, then static mappings. Shared types are in `fixture-shared.ts`; the composed mapper is root-owned. `fixture-semantic-map.json` lists every reference part selector and its production equivalent, plus state/scene problems that must not be counted as passes.

## State and identity

Native checked/open/default values move into real Radix roots. Source data-gate identities and content remain. Slider outputs, select labels, date labels, and toast triggers use local React state. Combobox and Command use actual cmdk APIs; Calendar uses actual DayPicker; OTP and Resizable use the installed libraries. No reference CSS or source behavior script is imported or invoked.

Two compatible API additions preserve consumer composition boundaries: `Select.containerProps` configures its owned menu host; `ComboboxInput.wrapperProps` and `leading` configure its owned input wrapper and leading content. AccordionIndicator, CollapsibleIndicator, and SelectTrigger now use the shared authored Icon export for the chevron, ensuring stroke/linecap styles arrive with the SVG.

## Required semantic sampling

Use the JSON mapping before comparing parts. Source native checkbox/radio inputs become visible indicator spans; Switch's real thumb replaces the source pseudo-element (the original part selector incorrectly names its hidden input). Slider's pseudo thumb needs explicit computed pseudo-style sampling. Closed source content may be equivalent to unmounted Radix content only after a visibility check. Portals change ancestry and DOM order; compare canonical visible boundaries, not incidental parent tags.

## Oracle limitations and replacement behavior scenarios

- Menubar `*open*` simultaneously exposes all three sibling menus. Contract lines 5, 19, 34 require moving between open menus. Start from rest, open File, move with arrows and hover, and compare the same real state on both sides. The original simultaneous-open scene remains unverified.
- Context-menu `*open*` inserts `position:static` and unhides the menu without invocation. Contract lines 5, 19, 34 require pointer/keyboard invocation. Open with the same contextmenu coordinates or Shift+F10 on both sides. The original static scene remains unverified.
- Hover-card, tooltip, and toast `*open*` change only the outer data-gate label. Initial DOM and behavior remain closed; explicit pointer/focus/click scenarios must prove open states.
- Sheet and hover-card embed the excluded health-line composite (`.v-health/.v-word/.v-age`). No substitute implementation or borrowed CSS was added. Root owns any explicitly named scoped fixture using only published base children; the original complete scene is not claimed verified.

## Checks

- Clean fast-forward of union commits e8be272 and 5344819.
- Node 22 npm ci: 932 packages installed, zero audit vulnerabilities.
- Full union TypeScript passes after candidate interface and interactive converter work.
- Browser and pixel/interaction gates are deliberately deferred to the root's sequential harness. No visual or interaction PASS is claimed by this report.
