# Card and Bubble secondary text correction

Scope: only `registry/sahajiv/styles/card.css` and `bubble.css`. Worktree base `429a49a`; actual docs were served by the existing main development server at port 4320. No reference or shared layer changes.

Confirmed defects: physical colored Card surfaces retained their authored fill in dark mode, but Typography/Card dark rules assigned pale secondary text. The ink variant also received the wrong secondary ink in both themes. The light olive variant's translucent ink fell below 4.5:1. Bubble timestamp used a pale color at 70% opacity on its reversed cream surface in dark mode.

The correction binds secondary text to the nearest Card's own surface token through `--card-secondary-ink`. Colored surfaces use the existing opaque `--muted-foreground-ink`; ink surfaces use `--v-on-ink`. Neutral and cream surfaces retain their existing light/dark values. The scoped dark text selector also takes precedence over Typography's dark rule. This covers nested Cards within the actual Preview cream Card. Bubble changes only its scoped dark timestamp to `--v-on-ink` and retains opacity and light behavior.

## Focused verification

Playwright Chromium, 1440×1100, actual docs theme and variant selects. All seven Card variants in light/dark and the Bubble timestamp in light/dark: **16/16 computed contrast samples pass 4.5:1**, minimum 5.48:1; zero page errors. Ratios composite text alpha/element opacity over the nearest opaque background. This checks the shown description/timestamp text, not every possible consumer child, breakpoint, or state.

To test without changing the running shared server, the harness removes the three original Card text-color rules from the browser CSSOM and inserts candidate Card/Bubble CSS in the existing `sahajiv-states` layer. Other production styles and live React controls remain intact. This proves the candidate cascade against the actual docs; integration/rebuilt-registry confirmation belongs to root's release pass.

| Component | Theme | Variant | Before | After |
|---|---|---|---:|---:|
| card | light | default | 5.48:1 | 5.48:1 |
| card | light | pink | 4.93:1 | 8.66:1 |
| card | light | yellow | 5.3:1 | 10.12:1 |
| card | light | olive | 3.97:1 | 5.69:1 |
| card | light | blue | 4.9:1 | 8.58:1 |
| card | light | ink | 2.8:1 | 17.25:1 |
| card | light | cream | 8.19:1 | 8.19:1 |
| card | dark | default | 7.31:1 | 7.31:1 |
| card | dark | pink | 1.36:1 | 8.66:1 |
| card | dark | yellow | 1.59:1 | 10.12:1 |
| card | dark | olive | 1.12:1 | 5.69:1 |
| card | dark | blue | 1.35:1 | 8.58:1 |
| card | dark | ink | 2.05:1 | 17.25:1 |
| card | dark | cream | 6.7:1 | 6.7:1 |
| bubble | light | timestamp | 7.23:1 | 7.23:1 |
| bubble | dark | timestamp | 1.21:1 | 6.78:1 |

Receipts: `.work/card-bubble-contrast-before.json`, `.work/card-bubble-contrast-after.json`. Reproducer: `.work/verify-card-bubble-contrast.mjs`. Screenshots: `artifacts/card-bubble-contrast/{card,bubble}-{light,dark}.png` (local generated evidence; not committed). Visually inspected dark olive Card and dark Bubble screenshots. The Card screenshot also captured a dark active Preview tab label outside this CSS scope; root was notified rather than broadening this patch.

No source-fidelity matrix, new variants, markup changes, or full-library accessibility claim.
