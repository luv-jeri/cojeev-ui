# Built Animated Number diagnostic

The final built docs gate recorded `Numeric transition remains within its endpoints`. Its combined assertion required both more than two observer samples and every numeric sample in 1240–1365; the failing receipt did not preserve the samples, so it cannot identify which condition failed.

A bounded probe served the actual main `out` export from build 9ac1fcd with an ephemeral Vite preview server, using Chromium 1440×1000. It repeated the actual Code/Preview controls, Add 125 click, Subtract 75 keyboard Enter and interrupted Reset click. It observed raw formatted text, parsed value, timestamp, viewport position and real RAF timestamps without modifying animation values or clocks.

- Initial run: 69 observer samples, all 1240–1365; first raw sample `1,240`; no page errors. Receipt: `.work/animated-number-built-samples.json`.
- One bounded follow-up: original sequence plus eight Add/Reset cycles, 581 samples, all 1240–1365. First raw sample `1,240`; no page errors. Receipt: `.work/animated-number-built-repeat-samples.json`.
- The repeat captured 563 actual Animated Number RAF callbacks. Minimum callback timestamp minus its scheduling time was +1.000ms. No negative elapsed admission was observed.
- Fractional displays such as `1,246.605` are valid numeric values within the endpoints; parsing removes grouping commas and retains the fraction.

This evidence does not reproduce the original full-gate failure or prove that a rare timing issue cannot occur. No production code changed. The existing interpolation bounds progress above by 1 but not below by 0; a lower clamp would be defensive hardening, not a demonstrated fix from these receipts.

Root owns `scripts/check-docs.mjs`: keep actual raw sample/count/range evidence and split the minimum-sample assertion from the endpoint assertion so a future failure identifies its cause. Do not weaken the bound or waive the unreproduced result. Root independently reported the exact targeted production gate now passes at 1440/light.

Probe: `BUILT_DOCS_DIRECTORY=../../out node .work/probe-animated-number-built.mjs` from this worktree, or set the directory to a built export. It starts and closes its own ephemeral server/browser. No broad visual or component matrix repeated.
