# Fidelity gate

Candidate source SHA-256: 168c45892dc9ec5472bb507caff8e8d018efe2b923b6da53155fe0d9309a056e. Unchanged during run: yes.

Scope: select, combobox, date-picker, questionnaire. 18 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| select | default-default-rest-480x360.html | 360 | PASS | 0 | 0.0000% |
| select | default-default-rest-dark-480x360.html | 360 | PASS | 0 | 0.0000% |
| select | default-default-selected-480x360.html | 360 | PASS | 0 | 0.0000% |
| select | default-default-selected-dark-480x360.html | 360 | PASS | 0 | 0.0000% |
| select | default-default-open-480x360.html | 360 | FAIL | 8 | 3.8537% |
| select | default-default-open-dark-480x360.html | 360 | FAIL | 8 | 3.7605% |
| combobox | default-default-rest-480x360.html | 360 | PASS | 0 | 0.0000% |
| combobox | default-default-rest-dark-480x360.html | 360 | PASS | 0 | 0.0000% |
| combobox | default-default-open-480x360.html | 360 | FAIL | 2 | 3.8994% |
| combobox | default-default-open-dark-480x360.html | 360 | FAIL | 2 | 3.8142% |
| date-picker | default-default-rest-480x520.html | 360 | PASS | 0 | 0.0000% |
| date-picker | default-default-rest-dark-480x520.html | 360 | PASS | 0 | 0.0000% |
| date-picker | default-default-open-480x520.html | 360 | FAIL | 2 | 2.6796% |
| date-picker | default-default-open-dark-480x520.html | 360 | FAIL | 2 | 2.9154% |
| questionnaire | default-default-rest-720x600.html | 360 | PASS | 0 | 0.0000% |
| questionnaire | default-default-rest-dark-720x600.html | 360 | FAIL | 0 | 3.3182% |
| questionnaire | default-default-checked-720x600.html | 360 | PASS | 0 | 0.0000% |
| questionnaire | default-default-checked-dark-720x600.html | 360 | FAIL | 0 | 3.3182% |

Open-state preparation: the source UI bootstrap closes layers even when the generated isolation file is labeled open (ui.js:330–334). Those state rows load the paired authored rest scene, then perform the same recorded real click/right-click/hover on each side. This avoids stale simultaneous-open menu attributes and verifies an actually visible state. Each raw result names the source file and trigger; the durable authored Toast trigger is used to keep its native timeout out of the static width sweep. Original open files remain unchanged and earlier raw-scene diagnostics are retained.
