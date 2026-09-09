# Completed candidate behavior subset

**48/48 rows passed**, each run twice in a fresh candidate context: **672 assertion evaluations**, zero page runtime errors and zero repeated-check disagreements. Production revision: `f26365d`. The only changes during this task were the behavioral harness verdict/reporting corrections described below; production and reference files were unchanged.

| Family | Width/theme rows | Assertions per pass | Total evaluations across both passes |
| --- | ---: | ---: | ---: |
| lifecycle | 12 | 10 | 240 |
| live-settings | 12 | 7 | 168 |
| media-change | 12 | 5 | 120 |
| adjuster | 12 | 6 | 144 |

Covered widths: 360, 390, 768, 1024, 1440, 1920; both light and dark. These are **candidate behavior assertions**, not 48 source paint/geometry comparisons and not approval of the full 576-row motion manifest.

- **Lifecycle:** StrictMode produces three layers once; controlled rerender preserves host/focus; child replacement repairs layers; interrupted selection settles on the newest winner; final unmount releases owned observers/listeners and generated DOM while preserving unrelated DOM; remount, simulated visibility and clock release remain usable.
- **Live settings:** a dispatched storage event synchronizes stored settings, root variables and the mounted group; category changes retain authored geometry; global Off removes selection decoration while retaining real selection, Subtle restores it, ancestor Off/re-enable works, and scoped disable preserves an explicit body. This is not a native two-tab storage propagation test.
- **Media change:** browser reduced-motion emulation during a press/selection flight removes press deformation, leaves a static body, cancels travel phases, preserves saved profile data and restores one body/group when normal preference returns.
- **Adjuster:** version-4 export, spinner amplitude shown as 14%, visible atomic invalid-import error, valid authored import surviving a category change, profile-only reset and document bounds.

The original behavior branch ignored returned runtime errors and allowed a PASS even when its two check arrays disagreed. The harness now treats those existing signals as ERROR/HARNESS_UNSTABLE and retains both arrays; it does not relax any assertion. Report columns show an em dash for unmeasured cross-source fields/pixels instead of a misleading zero. Both edited scripts pass Node syntax checking. No equivalent browser matrix was repeated after success.

[All 48 rows and both check arrays](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/artifacts/gate-motion-behavior-complete/results.json>) · [source cancellation adapter self-check](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/artifacts/gate-motion-behavior-complete/source-cancellation-probe.json>).

Remaining boundaries: native touch/coarse-pointer trajectories, real background-tab throttling, native OS preference changes, full shared-role parity and the full 576-row matrix remain unverified here. The Off differences and the pending export-versus-effect paint decision remain unresolved baseline choices.

## Execution and per-row receipts

Command: `MOTION_CASES=lifecycle,live-settings,media-change,adjuster MOTION_GATE_PORT=4350 MOTION_GATE_OUTPUT=artifacts/gate-motion-behavior-complete MOTION_GATE_REPORT=GATE-MOTION-BEHAVIOR.md node scripts/gate-motion.mjs`. The run used Node 22, the default six widths and both themes. Each context waited for readiness, fonts and 1800 ms of settling, then exercised real production hooks with the deterministic gate clock. The existing source cancellation adapter self-check passed. The temporary Vite server and all isolated browser contexts closed when the run completed.

| Scenario | Width | Theme | Verdict | Source self | Candidate self | Cross fields | Nonzero pixel samples |
| --- | ---: | --- | --- | --- | --- | ---: | ---: |
| adjuster | 360 | light | PASS | — | true | — | — |
| adjuster | 360 | dark | PASS | — | true | — | — |
| adjuster | 390 | light | PASS | — | true | — | — |
| adjuster | 390 | dark | PASS | — | true | — | — |
| adjuster | 768 | light | PASS | — | true | — | — |
| adjuster | 768 | dark | PASS | — | true | — | — |
| adjuster | 1024 | light | PASS | — | true | — | — |
| adjuster | 1024 | dark | PASS | — | true | — | — |
| adjuster | 1440 | light | PASS | — | true | — | — |
| adjuster | 1440 | dark | PASS | — | true | — | — |
| adjuster | 1920 | light | PASS | — | true | — | — |
| adjuster | 1920 | dark | PASS | — | true | — | — |
| lifecycle | 360 | light | PASS | — | true | — | — |
| lifecycle | 360 | dark | PASS | — | true | — | — |
| lifecycle | 390 | light | PASS | — | true | — | — |
| lifecycle | 390 | dark | PASS | — | true | — | — |
| lifecycle | 768 | light | PASS | — | true | — | — |
| lifecycle | 768 | dark | PASS | — | true | — | — |
| lifecycle | 1024 | light | PASS | — | true | — | — |
| lifecycle | 1024 | dark | PASS | — | true | — | — |
| lifecycle | 1440 | light | PASS | — | true | — | — |
| lifecycle | 1440 | dark | PASS | — | true | — | — |
| lifecycle | 1920 | light | PASS | — | true | — | — |
| lifecycle | 1920 | dark | PASS | — | true | — | — |
| live-settings | 360 | light | PASS | — | true | — | — |
| live-settings | 360 | dark | PASS | — | true | — | — |
| live-settings | 390 | light | PASS | — | true | — | — |
| live-settings | 390 | dark | PASS | — | true | — | — |
| live-settings | 768 | light | PASS | — | true | — | — |
| live-settings | 768 | dark | PASS | — | true | — | — |
| live-settings | 1024 | light | PASS | — | true | — | — |
| live-settings | 1024 | dark | PASS | — | true | — | — |
| live-settings | 1440 | light | PASS | — | true | — | — |
| live-settings | 1440 | dark | PASS | — | true | — | — |
| live-settings | 1920 | light | PASS | — | true | — | — |
| live-settings | 1920 | dark | PASS | — | true | — | — |
| media-change | 360 | light | PASS | — | true | — | — |
| media-change | 360 | dark | PASS | — | true | — | — |
| media-change | 390 | light | PASS | — | true | — | — |
| media-change | 390 | dark | PASS | — | true | — | — |
| media-change | 768 | light | PASS | — | true | — | — |
| media-change | 768 | dark | PASS | — | true | — | — |
| media-change | 1024 | light | PASS | — | true | — | — |
| media-change | 1024 | dark | PASS | — | true | — | — |
| media-change | 1440 | light | PASS | — | true | — | — |
| media-change | 1440 | dark | PASS | — | true | — | — |
| media-change | 1920 | light | PASS | — | true | — | — |
| media-change | 1920 | dark | PASS | — | true | — | — |

The raw results and PNGs are in artifacts/gate-motion-behavior-complete in the worktree where the command ran. MOTION_GATE_OUTPUT and MOTION_GATE_REPORT select distinct artifact destinations for bounded checks. All public production hook signatures remain unchanged.

## Morph-Off: the 90 fields are explained

The existing root result at 390/light has source A/A and candidate B/B agreement, **90 differing fields over 13 recorded frames**, and no initialization mismatch. A fresh, direct probe of the same gate route confirmed identical saved inputs: `v-motion.mode=off`, `v-flow-v1.variant=glide`, no authored profile, no VPanel. The source reports all seven documented engine flags false. The discrepancy is observable consumer behavior, not the catalog workbench exception or a wrong saved setting.

| Fields | Cause and observed difference | Classification |
| ---: | --- | --- |
| 52 | Four root flow fields across 13 frames: source remains glide with its curve, 0.420s duration and vf-land; candidate maps global Off to flow Off, linear, 0.000s and none. | Different public setting semantics. Source keeps selection motion under its separate flow setting; candidate global Off also disables it. |
| 26 | Spinner rotation and computed color across 13 frames: source keeps rotating/color-cycling; candidate stays unrotated at the first color. | Source color/rotation loops check reduced motion, not global Off. Color visibility also depends on the separately pending full-stylesheet fill conflict. |
| 12 | Primary body: two transforms, one viewBox and nine body/sheen/grain path fields during press, release and the subsequent category sample. Source press scales to 0.973557×0.986778 despite cfg.press=false; candidate remains static. | A real source consumer defect against the documented static-body contract. Source press/ripple state and final transform bypass cfg.press. |

The twelve body fields sum to **5 at press, 4 at release, 3 at cards-enabled**; the latter are remaining release geometry, not proof that enabling cards causes the defect. The direct fresh probe reproduces the same press and release transforms, unchanged candidate geometry, and source spinner rotation from 40° to 72.8° while Off. It recorded no page runtime errors.

Source evidence: [motion.js:38](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/reference/cojeev-handoff-v4/js/motion.js:38>) clears flags, but [morph.js:122](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/reference/cojeev-handoff-v4/js/morph.js:122>) still starts press and release state; [222](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/reference/cojeev-handoff-v4/js/morph.js:222>) applies ripple, [229](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/reference/cojeev-handoff-v4/js/morph.js:229>) changes color/rotation, and [233](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/reference/cojeev-handoff-v4/js/morph.js:233>) writes the unconditional scale. [flow.js:60](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/reference/cojeev-handoff-v4/js/flow.js:60>) uses its own flow configuration. Candidate evidence: [settings.ts:79](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/registry/cojeev/motion/settings.ts:79>) maps global Off to flow Off, while [use-morph.ts:90](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/registry/cojeev/motion/use-morph.ts:90>), [125](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/registry/cojeev/motion/use-morph.ts:125>) and [127](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/registry/cojeev/motion/use-morph.ts:127>) freeze explicit bodies and reject the press.

This extends the earlier catalog report: its clean-consumer check tested hover only, which is static. It did not test pointer press; a clean consumer still deforms on press. No production policy was changed and no reference shim was added. The owner must still choose whether this baseline copies the source behavior or follows the static Off contract; the separate flow-setting scope also needs to remain explicit.

[Fresh initialization/press evidence](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/.worktrees/composed/.work/morph-off-initialization.json>) · [original root 90-field result](</Users/sanjaykumar/Documents/ChatGPT/cojeev ui/artifacts/gate-motion-paint-followup/results.json>).
