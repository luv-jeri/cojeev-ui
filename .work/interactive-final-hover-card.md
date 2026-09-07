# Fidelity gate

Candidate source SHA-256: a4db5ff9946e0bd35fc86e6449166fcbac82857f33d7f56979dc60b61c37f162. Unchanged during run: yes.

Scope: hover-card. 12 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| hover-card | default-default-open-480x360.html | 360 | FAIL | 21 | 1.8981% |
| hover-card | default-default-open-480x360.html | 390 | FAIL | 21 | 1.7732% |
| hover-card | default-default-open-480x360.html | 768 | FAIL | 21 | 0.4060% |
| hover-card | default-default-open-480x360.html | 1024 | FAIL | 21 | 0.3045% |
| hover-card | default-default-open-480x360.html | 1440 | FAIL | 21 | 0.2165% |
| hover-card | default-default-open-480x360.html | 1920 | FAIL | 21 | 0.1624% |
| hover-card | default-default-open-dark-480x360.html | 360 | FAIL | 21 | 1.8824% |
| hover-card | default-default-open-dark-480x360.html | 390 | FAIL | 21 | 1.7630% |
| hover-card | default-default-open-dark-480x360.html | 768 | FAIL | 21 | 0.4093% |
| hover-card | default-default-open-dark-480x360.html | 1024 | FAIL | 21 | 0.3070% |
| hover-card | default-default-open-dark-480x360.html | 1440 | FAIL | 21 | 0.2183% |
| hover-card | default-default-open-dark-480x360.html | 1920 | FAIL | 21 | 0.1637% |

Open-state preparation: the source UI bootstrap closes layers even when the generated isolation file is labeled open (ui.js:330–334). Those state rows load the paired authored rest scene, then perform the same recorded real click/right-click/hover on each side. This avoids stale simultaneous-open menu attributes and verifies an actually visible state. Each raw result names the source file and trigger; the durable authored Toast trigger is used to keep its native timeout out of the static width sweep. Original open files remain unchanged and earlier raw-scene diagnostics are retained.
