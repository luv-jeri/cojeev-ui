# Native Select: macOS popup keyboard verification

Checkpoint: F03. Recorded 13 September 2026. This closes the previously missing
native-popup observation only. Real background-tab motion suspension, other
browsers/platforms and final deployed-release checks remain open.

## Environment and source

- Google Chrome 152.0.7977.83 on the owner's Mac, driven through native keyboard
  and accessibility APIs. This was the operating-system popup, not Playwright's
  `selectOption`, a synthetic change event, or the example's separate listbox.
- Route: `/cojeev-ui/docs/native-select/`, served locally from the existing
  `analytics-fixture/out` static export. The export uses a synthetic public
  analytics test token, not the production project token.
- The export's checkout is `0ed8d06c47121763189f5f4fac3971fa675dad36`.
  Comparing `app`, `components`, `registry`, `registry.json`, `data`, `lib`, `public`,
  package manifests, `tsconfig.json`, `components.json`, `postcss.config.mjs` and
  `next.config.ts` against candidate `5358d25aded2c7b030d394e289475bc030a82578`
  returned an empty diff. This establishes unchanged product source, not byte
  identity with the future production artifact or its environment configuration.
- No component code, account settings, real report or production data changed.

## Observed interaction

The primary `Review rhythm` control initially displayed `Daily`. Its native popup
showed group label `Reflection schedule` (reported disabled/non-selectable by the
native accessibility tree, not disabled in source), `Daily`, `Weekly`, `Monthly`
(disabled), and `Off`.

| Action | Observed result |
| --- | --- |
| First opening: open the primary control, press Down, then Enter | Popup closes; control reads `Weekly`; status live region reads `Selected: Weekly.` |
| Second opening: reopen with Space; press Down to highlight Monthly, then Enter | Monthly is not committed; control and status remain `Weekly` |
| Third opening: reopen with Space; press Down | Native menu reports Monthly as both selected/highlighted and disabled |
| Continue in that third popup: press Down again, then Enter | Highlight moves to Off; popup closes; control reads `Off`; status live region reads `Selected: Off.` |
| Reopen with Space, press Up to highlight Monthly, then Escape | Popup closes without changing Off; focus returns to the Review rhythm control |

The independent Field, Toolbar and Listbox gallery examples retained their own
`Daily` values; the primary example's state did not overwrite those examples.

## Platform detail

Do not assert that every operating system skips disabled options while moving the
popup highlight. On this Mac, the native menu can highlight Monthly but refuses
to commit it. The accessibility tree explicitly reports `(selected, disabled)`
while it is highlighted. Pressing Enter leaves the form value unchanged. This is
different from the previously tested inline listbox behavior, and is not evidence
that a disabled form option can be selected.

## Evidence and limits

The native UI observations in this task showed the actual popup and the resulting
control/status text, including returned focus. A screenshot was inspected after
the rejected Monthly selection and showed Weekly still selected. No screenshot
of the owner's surrounding desktop or unrelated tabs is committed.

Documentation checks: exact diff reviewed and `git diff --check` passed. No
catalogue, component build or unrelated browser suite was repeated for this
evidence-only checkpoint. No screen-reader certification, all-platform result,
background-tab suspension result or deployed-site acceptance is claimed.
