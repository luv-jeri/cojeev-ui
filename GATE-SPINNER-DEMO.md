# Fidelity gate

Candidate source SHA-256: dfc61308673e5becc6febb51150a042b4559c24a1f588f6a0eb93976c92d4e7f. Unchanged during run: yes.

Scope: spinner. 12 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| spinner | demo.html | 360 | PASS | 0 | 0.0000% |
| spinner | demo.html | 390 | PASS | 0 | 0.0000% |
| spinner | demo.html | 768 | PASS | 0 | 0.0000% |
| spinner | demo.html | 1024 | PASS | 0 | 0.0000% |
| spinner | demo.html | 1440 | PASS | 0 | 0.0000% |
| spinner | demo.html | 1920 | PASS | 0 | 0.0000% |
| spinner | demo-dark.html | 360 | PASS | 0 | 0.0000% |
| spinner | demo-dark.html | 390 | PASS | 0 | 0.0000% |
| spinner | demo-dark.html | 768 | PASS | 0 | 0.0000% |
| spinner | demo-dark.html | 1024 | PASS | 0 | 0.0000% |
| spinner | demo-dark.html | 1440 | PASS | 0 | 0.0000% |
| spinner | demo-dark.html | 1920 | PASS | 0 | 0.0000% |

This supplementary run compares each original entries/<component>/demo.html, including parts omitted by the generated isolation cases. The same authored markup is rendered in both initial themes; no documentation example or newly designed fixture replaces it.

Recorded fixture adapters: original-alive-runtime. Reference files remain unchanged.

The original catalog's loader runtime is restored only where the isolation generator omitted it.
