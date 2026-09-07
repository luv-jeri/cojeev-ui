# Button, Badge and Card static variant fidelity

**1608/1644 supplied file-width comparisons passed.** This is the complete reduced-motion static isolation matrix for these three families, not a real-animation or all-public-parts approval. The 36 initial failures are retained below; all are resolved by the 108-case focused recheck described next.

## Follow-up correction and bounded verification

The frozen matrix found **36 failing Button comparisons**, all Button block/busy cases. The candidate was 10px narrower (default 150.719px versus reference 160.719px; small 136.281px versus 146.281px; large 165.188px versus 175.188px). Its spinner also reported min-height 0px versus auto. The cause was class merging: the source modifier `-block` removed the Button's `inline-flex` utility, so it rendered as a block and lost its 10px flex gap. This is a port defect, not an authored reference issue.

Correction commit **`f2d9d9a28bc9b9425a2e45f6cbd0272545495e9b`** changes the authored display utility to `[display:inline-flex]`, which survives that source modifier. It also applies the requested Button sheet scope `.v-btn:where([data-slot])` to every state and descendant rule, preserving selector specificity when InputGroupButton, ButtonGroupItem or another composition retains its own slot. Only Button TSX/CSS were changed; no shared layers, source fixtures, gate files or other owners' components changed.

All **108 block comparisons passed after correction**: all 3 sizes × rest/disabled/busy × 2 themes × 6 widths, including every one of the initial 36 failing cases. Every corrected row has zero measured style/pixel differences and source A/A plus candidate B/B agreement. Source SHA-256 was `8edf03c71d2cc80e5a7aa488e52db2fac44401d9d0dcc0c26005b3f6544e22d6`, unchanged throughout this focused run. The complete 1,644-case run remains the earlier frozen snapshot; it was not rerun or relabeled as a final-revision matrix.

The original InputGroup dark fixture at 768px also verifies an actual `InputGroupButton` retaining `data-slot="input-group-button"`. Its dark rest and real pointer-hover states have zero differences across the measured display, background, color, padding, height, width, gap, radius, shadow, cursor, pointer-events and morph-fill properties. Each side agrees with its second settled observation; there are no runtime/console errors. Screenshots are retained. This proves the selected composed Button states, not all InputGroup geometry, ButtonGroup motion, or every Button descendant. Focused Button ESLint passed.

- [Corrected 108-case results](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/corrected-block/results.json>) and [per-case report](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/corrected-block.md>).
- [Composed dark/rest and pointer-hover receipts](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/composed-button/results.json>), [reference hover](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/composed-button/reference-hover.png>) and [candidate hover](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/composed-button/candidate-hover.png>).

## Frozen candidate and method

- Candidate commit: `4e00fb4a956b8c1b985c5098b11593622448e8cb`, incorporating main `a90c918` and the final shared flow checkpoint `7ec9da1`.
- Candidate source SHA-256 for every family: `f462786e51956ecc44cee01f22792e62ffa7f69f28c6226ff009c35a4987e12d`. Unchanged checks: button=yes, badge=yes, card=yes. No component, motion, base or gate source was edited during the matrix.
- Original runner: `apps/gate/run.mjs`. Each family used its own isolated browser/context/server (ports 4331–4333), and independently loaded oracle A/A then production candidate B/B sequentially. All unstable and runtime-error rows were retained. No reference file was changed.
- Oracle bootstrap adapters recorded by the runner: original-alive-runtime. Busy Button isolation pages receive the original alive loader runtime that the full authored catalog loads but its isolation generator omitted; the reference files are unchanged.
- Six widths: 360, 390, 768, 1024, 1440, 1920. All **274 supplied isolation files** exist and were compared: Button 126, Badge 108, Card 40. Total **1,644 file-width cases**.
- The runner waits for fonts/readiness, settles for 1800 ms, rewinds and steps the source/candidate clocks. Oracle and candidate self-agreement require zero detected pixel differences and matching visible computed state; raw PNG self-agreement is also retained in each JSON row. Final fidelity uses the existing gate's pixel threshold (0.001 maximum fraction, pixelmatch threshold 0.1 with anti-alias pixels included) and exact computed properties. Actual maximum pixel fraction across these results is 0.004953703703703704.
- Before the complete run, one non-default light and dark variant per family passed at 360/1440: Button secondary/sm, Badge blue-soft/lg, Card pink/sm. Those 12 comparisons on a90c918 had zero style/pixel differences. Successful probes were not needlessly repeated after the independent shared field/indicator checkpoint.

## Complete family results

| Family | Files | Cases | PASS | FAIL | Unstable | Runtime error | Oracle self-agreement failures | Candidate self-agreement failures | Style differences | Maximum pixel fraction |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| button | 126 | 756 | 720 | 36 | 0 | 0 | 0 | 0 | 72 | 0.004953703703703704 |
| badge | 108 | 648 | 648 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| card | 40 | 240 | 240 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

## Fix and coverage boundary

Before the full matrix, this workstream applied the root-requested Button icon ownership scope correction in 4e00fb4: `[data-slot="button"] .v-icon` became `.v-btn:where([data-slot]) .v-icon`. It retains the authored 18px icon size and selector specificity when a composed trigger replaces the Button's data-slot. No Icon base, shared motion, gate, token, new variant, or design refinement was added. The isolated Button files contain no icons, so the composed-trigger correction's direct browser proof belongs to the interactive owner's Popover gate; these family rows alone are not that proof.

Supplied fixtures cover Button rest/disabled/busy across all 7 variants × 3 sizes × 2 themes, Badge all 18 variants × 3 sizes × 2 themes, and Card all 10 variants × 2 sizes × 2 themes. Hover, focus, active and real animated motion are separate checks. Exact part presence in the supplied files:

| Part | Button files | Badge files | Card files |
| --- | ---: | ---: | ---: |
| Root | 126 | 108 | 40 |
| Busy indicator / Badge dot | 42 | 0 | — |
| Button icon | 0 | — | — |
| Card title | — | — | 40 |
| Card header | — | — | 0 |
| Card watermark | — | — | 0 |

Thus the complete supplied matrix does not independently exercise BadgeIndicator, CardHeader, or CardWatermark. Card/Bubble authored contrast questions remain reference issues; no baseline color refinement was made here.

## Evidence

- button: [every result](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/full-button/results.json>) · [full per-case report](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/full-button.md>) · [initial probes](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/probe-button.md>).
- badge: [every result](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/full-badge/results.json>) · [full per-case report](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/full-badge.md>) · [initial probes](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/probe-badge.md>).
- card: [every result](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/full-card/results.json>) · [full per-case report](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/full-card.md>) · [initial probes](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/probe-card.md>).
- [Exact file manifest](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/manifest.json>) and [part coverage](</Users/sanjaykumar/Documents/ChatGPT/sahajiv ui/.worktrees/composed/.work/static-three/fixture-part-coverage.json>).
- Artifact PNGs are written for failures by the unchanged runner. Passing rows retain the measured computed/pixel/self-agreement receipts in JSON. Artifacts stay local, outside the source commit.
- Earlier generated registry files in this worktree were preserved in stash `8e893e207bcbe12cd05ff50508b9db508d60c1de` before merging the frozen checkpoint. No generated registry output was included in this component change. No npm dependency was added or changed.

## Failures

| Family / file | Width | Verdict | Style difference count | Pixel fraction |
| --- | ---: | --- | ---: | ---: |
| button/block-default-busy.html | 360 | FAIL | 2 | 0.004182098765432099 |
| button/block-default-busy.html | 390 | FAIL | 2 | 0.0038603988603988604 |
| button/block-default-busy.html | 768 | FAIL | 2 | 0.0019603587962962964 |
| button/block-default-busy.html | 1024 | FAIL | 2 | 0.0014702690972222222 |
| button/block-default-busy.html | 1440 | FAIL | 2 | 0.0010455246913580248 |
| button/block-default-busy.html | 1920 | FAIL | 2 | 0.0007841435185185185 |
| button/block-default-busy-dark.html | 360 | FAIL | 2 | 0.003506172839506173 |
| button/block-default-busy-dark.html | 390 | FAIL | 2 | 0.0032364672364672367 |
| button/block-default-busy-dark.html | 768 | FAIL | 2 | 0.0016435185185185185 |
| button/block-default-busy-dark.html | 1024 | FAIL | 2 | 0.0012326388888888888 |
| button/block-default-busy-dark.html | 1440 | FAIL | 2 | 0.0008765432098765433 |
| button/block-default-busy-dark.html | 1920 | FAIL | 2 | 0.0006574074074074074 |
| button/block-sm-busy.html | 360 | FAIL | 2 | 0.003712962962962963 |
| button/block-sm-busy.html | 390 | FAIL | 2 | 0.003427350427350427 |
| button/block-sm-busy.html | 768 | FAIL | 2 | 0.0017404513888888888 |
| button/block-sm-busy.html | 1024 | FAIL | 2 | 0.0013053385416666667 |
| button/block-sm-busy.html | 1440 | FAIL | 2 | 0.0009282407407407408 |
| button/block-sm-busy.html | 1920 | FAIL | 2 | 0.0006961805555555556 |
| button/block-sm-busy-dark.html | 360 | FAIL | 2 | 0.0030617283950617282 |
| button/block-sm-busy-dark.html | 390 | FAIL | 2 | 0.0028262108262108263 |
| button/block-sm-busy-dark.html | 768 | FAIL | 2 | 0.0014351851851851852 |
| button/block-sm-busy-dark.html | 1024 | FAIL | 2 | 0.0010763888888888889 |
| button/block-sm-busy-dark.html | 1440 | FAIL | 2 | 0.0007654320987654321 |
| button/block-sm-busy-dark.html | 1920 | FAIL | 2 | 0.0005740740740740741 |
| button/block-lg-busy.html | 360 | FAIL | 2 | 0.004953703703703704 |
| button/block-lg-busy.html | 390 | FAIL | 2 | 0.0045726495726495725 |
| button/block-lg-busy.html | 768 | FAIL | 2 | 0.002322048611111111 |
| button/block-lg-busy.html | 1024 | FAIL | 2 | 0.0017415364583333334 |
| button/block-lg-busy.html | 1440 | FAIL | 2 | 0.001238425925925926 |
| button/block-lg-busy.html | 1920 | FAIL | 2 | 0.0009288194444444445 |
| button/block-lg-busy-dark.html | 360 | FAIL | 2 | 0.0042716049382716045 |
| button/block-lg-busy-dark.html | 390 | FAIL | 2 | 0.003943019943019943 |
| button/block-lg-busy-dark.html | 768 | FAIL | 2 | 0.002002314814814815 |
| button/block-lg-busy-dark.html | 1024 | FAIL | 2 | 0.001501736111111111 |
| button/block-lg-busy-dark.html | 1440 | FAIL | 2 | 0.0010679012345679011 |
| button/block-lg-busy-dark.html | 1920 | FAIL | 2 | 0.000800925925925926 |
