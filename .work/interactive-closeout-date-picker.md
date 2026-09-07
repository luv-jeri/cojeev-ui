# Fidelity gate

Candidate source SHA-256: ad0ae11ba614602076a2dbec4734e8d0b9b64e4be552bba97acc612aa6c70c92. Unchanged during run: yes.

Scope: date-picker. 12 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| date-picker | default-default-open-480x520.html | 360 | FAIL | 0 | 2.4401% |
| date-picker | default-default-open-480x520.html | 390 | FAIL | 0 | 2.3305% |
| date-picker | default-default-open-480x520.html | 768 | FAIL | 0 | 0.4698% |
| date-picker | default-default-open-480x520.html | 1024 | FAIL | 0 | 0.3523% |
| date-picker | default-default-open-480x520.html | 1440 | FAIL | 0 | 0.2505% |
| date-picker | default-default-open-480x520.html | 1920 | FAIL | 0 | 0.1879% |
| date-picker | default-default-open-dark-480x520.html | 360 | FAIL | 0 | 2.6466% |
| date-picker | default-default-open-dark-480x520.html | 390 | FAIL | 0 | 2.4974% |
| date-picker | default-default-open-dark-480x520.html | 768 | FAIL | 0 | 0.4805% |
| date-picker | default-default-open-dark-480x520.html | 1024 | FAIL | 0 | 0.3604% |
| date-picker | default-default-open-dark-480x520.html | 1440 | FAIL | 0 | 0.2563% |
| date-picker | default-default-open-dark-480x520.html | 1920 | FAIL | 0 | 0.1922% |

Open-state preparation: the source UI bootstrap closes layers even when the generated isolation file is labeled open (ui.js:330–334). Those state rows load the paired authored rest scene, then perform the same recorded real click/right-click/hover on each side. This avoids stale simultaneous-open menu attributes and verifies an actually visible state. Each raw result names the source file and trigger; the durable authored Toast trigger is used to keep its native timeout out of the static width sweep. Original open files remain unchanged and earlier raw-scene diagnostics are retained.
