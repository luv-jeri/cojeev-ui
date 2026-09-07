# Fidelity gate

Candidate source SHA-256: a4db5ff9946e0bd35fc86e6449166fcbac82857f33d7f56979dc60b61c37f162. Unchanged during run: yes.

Scope: select. 12 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| select | default-default-open-480x360.html | 360 | FAIL | 6 | 3.5469% |
| select | default-default-open-480x360.html | 390 | FAIL | 6 | 3.3236% |
| select | default-default-open-480x360.html | 768 | FAIL | 6 | 1.7177% |
| select | default-default-open-480x360.html | 1024 | FAIL | 6 | 1.2883% |
| select | default-default-open-480x360.html | 1440 | FAIL | 6 | 0.9161% |
| select | default-default-open-480x360.html | 1920 | FAIL | 6 | 0.6871% |
| select | default-default-open-dark-480x360.html | 360 | FAIL | 6 | 3.4593% |
| select | default-default-open-dark-480x360.html | 390 | FAIL | 6 | 3.2271% |
| select | default-default-open-dark-480x360.html | 768 | FAIL | 6 | 1.6466% |
| select | default-default-open-dark-480x360.html | 1024 | FAIL | 6 | 1.2349% |
| select | default-default-open-dark-480x360.html | 1440 | FAIL | 6 | 0.8782% |
| select | default-default-open-dark-480x360.html | 1920 | FAIL | 6 | 0.6586% |

Open-state preparation: the source UI bootstrap closes layers even when the generated isolation file is labeled open (ui.js:330–334). Those state rows load the paired authored rest scene, then perform the same recorded real click/right-click/hover on each side. This avoids stale simultaneous-open menu attributes and verifies an actually visible state. Each raw result names the source file and trigger; the durable authored Toast trigger is used to keep its native timeout out of the static width sweep. Original open files remain unchanged and earlier raw-scene diagnostics are retained.
