# Fidelity gate

Candidate source SHA-256: ad0ae11ba614602076a2dbec4734e8d0b9b64e4be552bba97acc612aa6c70c92. Unchanged during run: yes.

Scope: tabs. 6 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| tabs | default-default-on-720x320.html | 360 | PASS | 0 | 0.0123% |
| tabs | default-default-on-720x320.html | 390 | PASS | 0 | 0.0114% |
| tabs | default-default-on-720x320.html | 768 | PASS | 0 | 0.0058% |
| tabs | default-default-on-720x320.html | 1024 | PASS | 0 | 0.0043% |
| tabs | default-default-on-720x320.html | 1440 | PASS | 0 | 0.0031% |
| tabs | default-default-on-720x320.html | 1920 | PASS | 0 | 0.0023% |
