# Fidelity gate

Candidate source SHA-256: dfc61308673e5becc6febb51150a042b4559c24a1f588f6a0eb93976c92d4e7f. Unchanged during run: yes.

Scope: calendar, tooltip, drawer, switch, toggle. 90 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| calendar | default-default-rest-480x480.html | 360 | PASS | 0 | 0.0318% |
| calendar | default-default-rest-480x480.html | 390 | PASS | 0 | 0.0293% |
| calendar | default-default-rest-480x480.html | 768 | PASS | 0 | 0.0149% |
| calendar | default-default-rest-480x480.html | 1024 | PASS | 0 | 0.0112% |
| calendar | default-default-rest-480x480.html | 1440 | PASS | 0 | 0.0079% |
| calendar | default-default-rest-480x480.html | 1920 | PASS | 0 | 0.0060% |
| calendar | default-default-rest-dark-480x480.html | 360 | PASS | 0 | 0.0228% |
| calendar | default-default-rest-dark-480x480.html | 390 | PASS | 0 | 0.0211% |
| calendar | default-default-rest-dark-480x480.html | 768 | PASS | 0 | 0.0107% |
| calendar | default-default-rest-dark-480x480.html | 1024 | PASS | 0 | 0.0080% |
| calendar | default-default-rest-dark-480x480.html | 1440 | PASS | 0 | 0.0057% |
| calendar | default-default-rest-dark-480x480.html | 1920 | PASS | 0 | 0.0043% |
| calendar | default-default-selected-480x480.html | 360 | PASS | 0 | 0.0318% |
| calendar | default-default-selected-480x480.html | 390 | PASS | 0 | 0.0293% |
| calendar | default-default-selected-480x480.html | 768 | PASS | 0 | 0.0149% |
| calendar | default-default-selected-480x480.html | 1024 | PASS | 0 | 0.0112% |
| calendar | default-default-selected-480x480.html | 1440 | PASS | 0 | 0.0079% |
| calendar | default-default-selected-480x480.html | 1920 | PASS | 0 | 0.0060% |
| calendar | default-default-selected-dark-480x480.html | 360 | PASS | 0 | 0.0228% |
| calendar | default-default-selected-dark-480x480.html | 390 | PASS | 0 | 0.0211% |
| calendar | default-default-selected-dark-480x480.html | 768 | PASS | 0 | 0.0107% |
| calendar | default-default-selected-dark-480x480.html | 1024 | PASS | 0 | 0.0080% |
| calendar | default-default-selected-dark-480x480.html | 1440 | PASS | 0 | 0.0057% |
| calendar | default-default-selected-dark-480x480.html | 1920 | PASS | 0 | 0.0043% |
| tooltip | default-default-open.html | 360 | PASS | 0 | 0.0475% |
| tooltip | default-default-open.html | 390 | PASS | 0 | 0.0439% |
| tooltip | default-default-open.html | 768 | PASS | 0 | 0.0223% |
| tooltip | default-default-open.html | 1024 | PASS | 0 | 0.0167% |
| tooltip | default-default-open.html | 1440 | PASS | 0 | 0.0119% |
| tooltip | default-default-open.html | 1920 | PASS | 0 | 0.0089% |
| tooltip | default-default-open-dark.html | 360 | PASS | 0 | 0.0481% |
| tooltip | default-default-open-dark.html | 390 | PASS | 0 | 0.0444% |
| tooltip | default-default-open-dark.html | 768 | PASS | 0 | 0.0226% |
| tooltip | default-default-open-dark.html | 1024 | PASS | 0 | 0.0169% |
| tooltip | default-default-open-dark.html | 1440 | PASS | 0 | 0.0120% |
| tooltip | default-default-open-dark.html | 1920 | PASS | 0 | 0.0090% |
| drawer | default-default-open-480x480.html | 360 | FAIL | 1 | 1.2605% |
| drawer | default-default-open-480x480.html | 390 | FAIL | 1 | 1.1635% |
| drawer | default-default-open-480x480.html | 768 | FAIL | 1 | 0.5909% |
| drawer | default-default-open-480x480.html | 1024 | FAIL | 1 | 0.4431% |
| drawer | default-default-open-480x480.html | 1440 | FAIL | 1 | 0.3151% |
| drawer | default-default-open-480x480.html | 1920 | FAIL | 1 | 0.2363% |
| drawer | default-default-open-dark-480x480.html | 360 | FAIL | 1 | 1.1401% |
| drawer | default-default-open-dark-480x480.html | 390 | FAIL | 1 | 1.0524% |
| drawer | default-default-open-dark-480x480.html | 768 | FAIL | 1 | 0.5344% |
| drawer | default-default-open-dark-480x480.html | 1024 | FAIL | 1 | 0.4008% |
| drawer | default-default-open-dark-480x480.html | 1440 | FAIL | 1 | 0.2850% |
| drawer | default-default-open-dark-480x480.html | 1920 | FAIL | 1 | 0.2138% |
| switch | default-default-disabled-dark.html | 360 | PASS | 0 | 0.0000% |
| switch | default-default-disabled-dark.html | 390 | PASS | 0 | 0.0000% |
| switch | default-default-disabled-dark.html | 768 | PASS | 0 | 0.0000% |
| switch | default-default-disabled-dark.html | 1024 | PASS | 0 | 0.0000% |
| switch | default-default-disabled-dark.html | 1440 | PASS | 0 | 0.0000% |
| switch | default-default-disabled-dark.html | 1920 | PASS | 0 | 0.0000% |
| toggle | circle-default-rest.html | 360 | PASS | 0 | 0.0340% |
| toggle | circle-default-rest.html | 390 | PASS | 0 | 0.0313% |
| toggle | circle-default-rest.html | 768 | PASS | 0 | 0.0000% |
| toggle | circle-default-rest.html | 1024 | PASS | 0 | 0.0000% |
| toggle | circle-default-rest.html | 1440 | PASS | 0 | 0.0000% |
| toggle | circle-default-rest.html | 1920 | PASS | 0 | 0.0000% |
| toggle | circle-default-rest-dark.html | 360 | PASS | 0 | 0.0333% |
| toggle | circle-default-rest-dark.html | 390 | PASS | 0 | 0.0308% |
| toggle | circle-default-rest-dark.html | 768 | PASS | 0 | 0.0000% |
| toggle | circle-default-rest-dark.html | 1024 | PASS | 0 | 0.0000% |
| toggle | circle-default-rest-dark.html | 1440 | PASS | 0 | 0.0000% |
| toggle | circle-default-rest-dark.html | 1920 | PASS | 0 | 0.0000% |
| toggle | circle-default-disabled.html | 360 | PASS | 0 | 0.0340% |
| toggle | circle-default-disabled.html | 390 | PASS | 0 | 0.0313% |
| toggle | circle-default-disabled.html | 768 | PASS | 0 | 0.0000% |
| toggle | circle-default-disabled.html | 1024 | PASS | 0 | 0.0000% |
| toggle | circle-default-disabled.html | 1440 | PASS | 0 | 0.0000% |
| toggle | circle-default-disabled.html | 1920 | PASS | 0 | 0.0000% |
| toggle | circle-default-disabled-dark.html | 360 | PASS | 0 | 0.0333% |
| toggle | circle-default-disabled-dark.html | 390 | PASS | 0 | 0.0308% |
| toggle | circle-default-disabled-dark.html | 768 | PASS | 0 | 0.0000% |
| toggle | circle-default-disabled-dark.html | 1024 | PASS | 0 | 0.0000% |
| toggle | circle-default-disabled-dark.html | 1440 | PASS | 0 | 0.0000% |
| toggle | circle-default-disabled-dark.html | 1920 | PASS | 0 | 0.0000% |
| toggle | circle-default-on.html | 360 | PASS | 0 | 0.0340% |
| toggle | circle-default-on.html | 390 | PASS | 0 | 0.0313% |
| toggle | circle-default-on.html | 768 | PASS | 0 | 0.0000% |
| toggle | circle-default-on.html | 1024 | PASS | 0 | 0.0000% |
| toggle | circle-default-on.html | 1440 | PASS | 0 | 0.0000% |
| toggle | circle-default-on.html | 1920 | PASS | 0 | 0.0000% |
| toggle | circle-default-on-dark.html | 360 | PASS | 0 | 0.0333% |
| toggle | circle-default-on-dark.html | 390 | PASS | 0 | 0.0308% |
| toggle | circle-default-on-dark.html | 768 | PASS | 0 | 0.0000% |
| toggle | circle-default-on-dark.html | 1024 | PASS | 0 | 0.0000% |
| toggle | circle-default-on-dark.html | 1440 | PASS | 0 | 0.0000% |
| toggle | circle-default-on-dark.html | 1920 | PASS | 0 | 0.0000% |

Open-state preparation: the source UI bootstrap closes layers even when the generated isolation file is labeled open (ui.js:330–334). Those state rows load the paired authored rest scene, then perform the same recorded real click/right-click/hover on each side. This avoids stale simultaneous-open menu attributes and verifies an actually visible state. Each raw result names the source file and trigger; the durable authored Toast trigger is used to keep its native timeout out of the static width sweep. Original open files remain unchanged and earlier raw-scene diagnostics are retained.

This bounded follow-up skipped 27 files already exact at every requested width in .work/interactive-prior-combined.json. The skipped-case manifest is retained separately; those earlier rows are not relabeled as measurements from this revision. The complete default command does not skip any cases.
