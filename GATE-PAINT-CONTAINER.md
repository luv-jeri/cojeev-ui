# Fidelity gate

Candidate source SHA-256: 255e31f82795422245313d94093336a341fe3a42fd744d6583057008a43f1fe3. Unchanged during run: yes.

Scope: empty, skeleton, pagination, input-otp. 8 measured comparisons. Full six-width isolation coverage: NO.

Oracle: handoff v4. Fonts ready + 1800ms settle; sequential independent reloads; rewind then step; no re-seeding. Static frames use reduced motion. Self agreement requires exact visible computed state and zero decoded-pixel differences using pixelmatch threshold 0.1 with anti-alias pixels included; raw PNG hash agreement is retained separately. Demonstrably hidden source content may correspond to unmounted Radix content; visible absence always fails. Motion and keyboard coverage are separate reports.

| Component | Isolation variant / size / state / mode | Width | Verdict | Style differences | Pixel difference |
| --- | --- | ---: | --- | ---: | ---: |
| empty | default-default-rest-960x360.html | 360 | PASS | 0 | 0.0000% |
| empty | default-default-rest-960x360.html | 1440 | PASS | 0 | 0.0000% |
| skeleton | default-default-rest.html | 360 | PASS | 0 | 0.0000% |
| skeleton | default-default-rest.html | 1440 | PASS | 0 | 0.0000% |
| pagination | default-default-rest.html | 360 | FAIL | 1 | 0.1571% |
| pagination | default-default-rest.html | 1440 | FAIL | 1 | 0.0424% |
| input-otp | default-default-rest.html | 360 | FAIL | 7 | 0.3731% |
| input-otp | default-default-rest.html | 1440 | FAIL | 1 | 0.0779% |

Recorded fixture adapters: original-alive-runtime, otp-catalog-sizing. Reference files remain unchanged.

The original catalog's loader runtime is restored only where the isolation generator omitted it.

OTP uses the catalog's definite grid track and inline-size containment on BOTH sides. The isolation generator omitted that geometry, making native input intrinsic widths expand the scene. This adapter changes only the surrounding canvas, with no control styles or pixel masks (catalog/index.html:114,160,172).
