# Fidelity gate

Candidate source SHA-256: 168c45892dc9ec5472bb507caff8e8d018efe2b923b6da53155fe0d9309a056e. Unchanged during run: yes.

Scope: alert, aspect-ratio, avatar, bubble, direction, empty, item, kbd, label, marker, message, progress, separator, skeleton, spinner, typography. 32 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| alert | demo.html | 360 | PASS | 0 | 0.0000% |
| alert | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| aspect-ratio | demo.html | 360 | PASS | 0 | 0.0000% |
| aspect-ratio | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| avatar | demo.html | 360 | PASS | 0 | 0.0000% |
| avatar | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| bubble | demo.html | 360 | PASS | 0 | 0.0000% |
| bubble | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| direction | demo.html | 360 | PASS | 0 | 0.0000% |
| direction | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| empty | demo.html | 360 | PASS | 0 | 0.0000% |
| empty | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| item | demo.html | 360 | PASS | 0 | 0.0000% |
| item | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| kbd | demo.html | 360 | PASS | 0 | 0.0000% |
| kbd | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| label | demo.html | 360 | PASS | 0 | 0.0000% |
| label | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| marker | demo.html | 360 | PASS | 0 | 0.0000% |
| marker | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| message | demo.html | 360 | PASS | 0 | 0.0000% |
| message | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| progress | demo.html | 360 | PASS | 0 | 0.0000% |
| progress | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| separator | demo.html | 360 | PASS | 0 | 0.0000% |
| separator | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| skeleton | demo.html | 360 | PASS | 0 | 0.0497% |
| skeleton | demo-dark.html | 360 | PASS | 0 | 0.0556% |
| spinner | demo.html | 360 | FAIL | 0 | 1.1494% |
| spinner | demo-dark.html | 360 | FAIL | 0 | 1.1352% |
| typography | demo.html | 360 | PASS | 0 | 0.0000% |
| typography | demo-dark.html | 360 | PASS | 0 | 0.0000% |

This supplementary run compares each original entries/<component>/demo.html, including parts omitted by the generated isolation cases. The same authored markup is rendered in both initial themes; no documentation example or newly designed fixture replaces it.
