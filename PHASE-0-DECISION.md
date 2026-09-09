# Phase 0 decision: reduced-motion press behavior

Status: accepted by the owner on 2026-09-07. Phase 0 verification has resumed and is not yet complete.

The Button reference contradicts its own reduced-motion contract. The owner approved retaining static bodies under reduced motion and recording the reference's press deformation as an explicitly accepted difference, citing that contract. Normal-motion behavior must still match. The reference files remain unchanged.

## Reproducible difference

On the default Button in light mode at 480px, with `prefers-reduced-motion: reduce`, pointerdown followed by a frozen-clock step of 16ms produces:

| Measurement | Reference | React port |
| --- | --- | --- |
| Host transform | `matrix(0.998896, 0, 0, 0.999448, 0, 0)` | `none` |
| SVG body path | deforms | remains static |

Both sides were independently loaded twice. Each side has zero self-differences over 29 recorded frames. Rest and hover match; the press/release trajectory produces 40 differing fields. Focus was verified with actual keyboard Tab, but follows release without rewind: later differences are not evidence of a separate focus defect. This diagnostic does not cover normal-motion fidelity or all Button variants.

The harness follows the supplied protocol: one sequential page at a time, fonts ready plus 1800ms settle, bodies built before rewind and clock steps, no reseeding. Sparse clock samples invoke the documented 50ms frame-delta cap.

## Conflicting source contracts

- [MOTION.md section 7](reference/cojeev-handoff-v4/docs/MOTION.md#7--what-never-moves) says: “Under `prefers-reduced-motion`: static bodies, no travel, loops still, durations 0.”
- [morph.js](reference/cojeev-handoff-v4/js/morph.js), lines 122–125, sets press targets without checking reduced motion. Lines 203–204 retain press/focus targets, and line 233 applies the host scale without a reduced-motion guard.
- The port suppresses press/hold deformation under reduced motion, following the written contract.

The owner's build brief explicitly required stopping for an owner decision when the gate cannot match and the design system appears wrong. The owner has now resolved that decision: follow the documented reduced-motion rule and continue the build. This approval applies to the reduced-motion body deformation only; other fidelity differences must still be resolved.

## Evidence and reproduction

- Harness: `scripts/gate-interactions.mjs`
- Full local evidence: `artifacts/gate-interactions/results.json`
- Short local audit: `.work/interaction-report.md`
- Reproduce with `npm run gate:interactions`. The harness starts its own isolated server; set `GATE_URL` only when intentionally reusing an existing one. It retains the accepted reduced-motion differences and exits nonzero for unaccepted differences or unstable comparisons.

## Separate port corrections

The static sweep exposed Tailwind's extra transparent shadow layers and a missing dark disabled-text override. Those are port issues, separate from this decision. Shadow utilities now set the exact `box-shadow` value through arbitrary-property utilities, and dark secondary/ghost/outline text follows the reference cascade. Gate thresholds and reference source were not changed.

The local registry install also exposed CSS merge ordering that cached a light morph fill after a dark-mode switch. A dedicated emitted morph layer corrected the ordering. The installed dark view was inspected after verifying that the SVG fill equals the dark host background.

The focused correction run passed all 12 comparisons: secondary Button, default size, rest/disabled/busy, light/dark, at 360px and 1440px. Every computed style and pixel matched. `npm run typecheck` and `npm run build` passed after these corrections. This is bounded evidence, not full Phase 0 coverage.
