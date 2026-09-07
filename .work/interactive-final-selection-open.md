# Fidelity gate

Candidate source SHA-256: 33fca106edbfa0912fd065e0c7ca552ff043e76249257c4170fe35108a15fa3c. Unchanged during run: yes.

Scope: select, combobox, date-picker. 36 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| select | default-default-open-480x360.html | 360 | FAIL | 14 | 3.8080% |
| select | default-default-open-480x360.html | 390 | FAIL | 14 | 3.5644% |
| select | default-default-open-480x360.html | 768 | FAIL | 14 | 1.8400% |
| select | default-default-open-480x360.html | 1024 | FAIL | 14 | 1.3800% |
| select | default-default-open-480x360.html | 1440 | FAIL | 14 | 0.9813% |
| select | default-default-open-480x360.html | 1920 | FAIL | 14 | 0.7360% |
| select | default-default-open-dark-480x360.html | 360 | FAIL | 13 | 3.7522% |
| select | default-default-open-dark-480x360.html | 390 | FAIL | 13 | 3.4991% |
| select | default-default-open-dark-480x360.html | 768 | FAIL | 13 | 1.7846% |
| select | default-default-open-dark-480x360.html | 1024 | FAIL | 13 | 1.3384% |
| select | default-default-open-dark-480x360.html | 1440 | FAIL | 13 | 0.9518% |
| select | default-default-open-dark-480x360.html | 1920 | FAIL | 13 | 0.7138% |
| combobox | default-default-open-480x360.html | 360 | FAIL | 2 | 3.8994% |
| combobox | default-default-open-480x360.html | 390 | FAIL | 2 | 3.5994% |
| combobox | default-default-open-480x360.html | 768 | FAIL | 2 | 1.8278% |
| combobox | default-default-open-480x360.html | 1024 | FAIL | 2 | 1.3709% |
| combobox | default-default-open-480x360.html | 1440 | FAIL | 2 | 0.9748% |
| combobox | default-default-open-480x360.html | 1920 | FAIL | 2 | 0.7311% |
| combobox | default-default-open-dark-480x360.html | 360 | FAIL | 2 | 3.8142% |
| combobox | default-default-open-dark-480x360.html | 390 | FAIL | 2 | 3.5208% |
| combobox | default-default-open-dark-480x360.html | 768 | FAIL | 2 | 1.7879% |
| combobox | default-default-open-dark-480x360.html | 1024 | FAIL | 2 | 1.3409% |
| combobox | default-default-open-dark-480x360.html | 1440 | FAIL | 2 | 0.9535% |
| combobox | default-default-open-dark-480x360.html | 1920 | FAIL | 2 | 0.7152% |
| date-picker | default-default-open-480x520.html | 360 | FAIL | 2 | 2.6796% |
| date-picker | default-default-open-480x520.html | 390 | FAIL | 0 | 2.5353% |
| date-picker | default-default-open-480x520.html | 768 | FAIL | 0 | 0.9271% |
| date-picker | default-default-open-480x520.html | 1024 | FAIL | 0 | 0.6953% |
| date-picker | default-default-open-480x520.html | 1440 | FAIL | 0 | 0.4944% |
| date-picker | default-default-open-480x520.html | 1920 | FAIL | 0 | 0.3708% |
| date-picker | default-default-open-dark-480x520.html | 360 | FAIL | 2 | 2.9157% |
| date-picker | default-default-open-dark-480x520.html | 390 | FAIL | 0 | 2.7479% |
| date-picker | default-default-open-dark-480x520.html | 768 | FAIL | 0 | 0.9776% |
| date-picker | default-default-open-dark-480x520.html | 1024 | FAIL | 0 | 0.7332% |
| date-picker | default-default-open-dark-480x520.html | 1440 | FAIL | 0 | 0.5214% |
| date-picker | default-default-open-dark-480x520.html | 1920 | FAIL | 0 | 0.3910% |

Open-state preparation: the source UI bootstrap closes layers even when the generated isolation file is labeled open (ui.js:330–334). Those state rows load the paired authored rest scene, then perform the same recorded real click/right-click/hover on each side. This avoids stale simultaneous-open menu attributes and verifies an actually visible state. Each raw result names the source file and trigger; the durable authored Toast trigger is used to keep its native timeout out of the static width sweep. Original open files remain unchanged and earlier raw-scene diagnostics are retained.
