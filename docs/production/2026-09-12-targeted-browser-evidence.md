# Targeted browser evidence — 12 September 2026

This is a focused local artifact check, not a full library certification or a live launch claim.

## Source and serving boundary

Tested the existing production artifact under `artifacts/task2-final-pair/production/site`, built from `9c3dbfedf0ae3827ecf751cf564bb615c4a1e3f4`. Served read-only at `http://127.0.0.1:4337` for these checks. Pipeline-only edits in progress do not change these component files. This simple server does not exercise the website Worker's CSP or custom domains.

## Fresh results

| Check | Actual result |
| --- | --- |
| `tests/bento-resize-stability.docs.browser.mjs` | PASS: Classic and Interlock fixed canvas, no cell oscillation during nearly stationary pointer resize, grip follows live edge, release and Undo |
| `tests/choice-recovery.docs.browser.mjs` | PASS: checkbox/radio six glyph shapes, five marks plus hidden, selected answers retained, no misleading Row corner control, keyboard and copy; 24 responsive/theme captures |
| `tests/sidebar-recovery.docs.browser.mjs` | PASS: three approaches, selection/draft retention, collapsed labels, drawer dismissal/copy; 14 captures |
| `tests/disclosure-recovery.docs.browser.mjs` | PASS: accordion three approaches, open-state retention, keyboard, rapid reversal and actual height motion; 12 captures |
| `tests/quiet-exit.native.browser.mjs` | PASS: system reduced motion, Motion Off and Flow Off during retained Select exit release pointer/accessibility locks, restore focus and permit reopening |
| `tests/selection-recovery.docs.browser.mjs` with `RECOVERY_COMPONENTS=native-select` | PASS: compositions, retained values, semantic feedback, radius, themes and configured copy. This does not certify the previously outstanding macOS-native popup keyboard interaction. |

Commands use Node 22.22.0 and `DOCS_BASE_URL=http://127.0.0.1:4337` (Bento uses `POLISH_URL`). Quiet-exit builds a local native fixture without remote bindings. No reports or outreach messages were submitted.

## Root visual inspection

Inspected `output/playwright/choice-recovery/checkbox-card-1440-light.png`, `radio-group-row-390-dark.png`, `output/playwright/sidebar-recovery/drawer-390-light.png`, and `output/playwright/disclosure-recovery/accordion-chapters-1440-dark.png`. The sampled controls show readable labels, restored selection glyphs, contained drawer content and a coherent open accordion chapter. This is four inspected images, not approval of every capture. The floating reporting launcher appears in a cropped choice screenshot; assess its full-viewport placement in the final page pass rather than inferring clipping from an element crop.

## Live boundary still open

Fresh read-only probes: production website `/health` returned 404 HTML, production API `/health` returned 404 JSON, both beta hostnames failed DNS resolution. GitHub main is still `49292870ca75712b558baa3b802e8f2469750815`. The new release has not been published.

Browser account operations reported `User unavailable`. Protected beta/production GitHub environments each list `REPORTING_SECRETS_JSON`, but missing service credentials and real delivery/Turnstile acceptance remain prerequisites. Do not infer secret values from name presence or provider acceptance from configured DNS.
