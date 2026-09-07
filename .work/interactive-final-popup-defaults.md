# Fidelity gate

Candidate source SHA-256: 34274188f4fdc24ac42782f2a9f4424c4eb7aaba6485a6ebfad6744fc4b99bda. Unchanged during run: yes.

Scope: hover-card, popover, date-picker. 6 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| hover-card | default-default-open-480x360.html | 360 | FAIL | 21 | 0.6806% |
| hover-card | default-default-open-dark-480x360.html | 360 | FAIL | 21 | 0.6917% |
| popover | default-default-open-480x360.html | 360 | FAIL | 1 | 2.4330% |
| popover | default-default-open-dark-480x360.html | 360 | FAIL | 1 | 2.4198% |
| date-picker | default-default-open-480x520.html | 360 | FAIL | 0 | 2.4401% |
| date-picker | default-default-open-dark-480x520.html | 360 | FAIL | 0 | 2.6466% |

Open-state preparation: the source UI bootstrap closes layers even when the generated isolation file is labeled open (ui.js:330–334). Those state rows load the paired authored rest scene, then perform the same recorded real click/right-click/hover on each side. This avoids stale simultaneous-open menu attributes and verifies an actually visible state. Each raw result names the source file and trigger; the durable authored Toast trigger is used to keep its native timeout out of the static width sweep. Original open files remain unchanged and earlier raw-scene diagnostics are retained.
