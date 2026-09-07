# Popup defaults checkpoint

The exact source defaults identified in the scope classification are corrected: HoverCard300ms open/150ms close, bottom/start8px spacing with8px collision padding; Popover start alignment with its authored6px spacing; DatePicker8px spacing. Removed un-authored viewport max-size/overflow constraints from their body CSS; Radix still owns real positioning and interactions. Sheet already matches its source fixed geometry and is unchanged.

HoverCard source positioning-wrapper data-gate/data-canvas identity now annotates the actual Radix wrapper. No positioning/style is fabricated and the hidden source placeholder remains only closed-state evidence. The raw source transform:none versus the real Radix translation matrix stays visible in gate output.

TypeScript and focused ESLint passed. Affected open360 light/dark evidence:

| Family/file | Verdict | Style deltas | Pixels |
|---|---|---:|---:|
| hover-card/default-default-open-480x360.html | FAIL | 21 | 0.6806% |
| hover-card/default-default-open-dark-480x360.html | FAIL | 21 | 0.6917% |
| popover/default-default-open-480x360.html | FAIL | 1 | 2.4330% |
| popover/default-default-open-dark-480x360.html | FAIL | 1 | 2.4198% |
| date-picker/default-default-open-480x520.html | FAIL | 0 | 2.4401% |
| date-picker/default-default-open-dark-480x520.html | FAIL | 0 | 2.6466% |

HoverCard now has18 direct excluded product-child differences plus the same derived21.453px height increase sampled on two boundaries, and the explicit CSS positioning representation difference. No missing visible wrapper remains. This is not whole-scene acceptance. DatePicker width/style deltas are gone; its popup position/pixel comparison remains open. Popover retains the known source hidden-child transition difference.

The first requested frozen follow-up revision18d000d proves Calendar24/24 exact and ToggleGroup-on12/12 exact. Selection36 rows failed: Combobox has only source in-flow ancestor height differences; DatePicker had a360px width clamp fixed here; Select was dismissed on viewport resize by Radix (dist/index.mjs390–398), which the old open-before-resize harness incorrectly mixes into intended open comparisons. Roota077a48 adds a recorded before-open viewport scenario; Select-only12 rows will be rerun with that methodology. All original receipts remain committed and unchanged.
