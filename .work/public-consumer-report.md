# Public registry consumer — final PASS

Eight requested specimens were installed into the new external app `/tmp/sahajiv-ui-stranger-qFCcg0` using npm, real `shadcn@latest init --template vite --base radix --preset nova`, and public component URLs. No local registry source or generated JSON was copied into the consumer. Final confirmation uses cumulative evidence: the original unchanged interactions plus the corrected public theme and ShapeScene checks. This is not a public all-77 installation sweep.

## Published bytes verified

All three endpoints returned HTTP 200 JSON with these exact SHA-256 values before the final CLI update:

| Payload | Public URL | SHA-256 |
| --- | --- | --- |
| Manifest, 78 entries: 77 UI + foundation | https://luv-jeri.github.io/sahajiv-ui/registry.json | `8cdc014555da7eb2c07db8c6f91f51943d063f6d76f436a2c8ed184498aaf0b6` |
| Foundation | https://luv-jeri.github.io/sahajiv-ui/r/sahajiv.json | `7f7324e45bec802c4b18bbb1c09d74b3597dc2cce9ea87db49e166c7b5d7d3b6` |
| Corrected ShapeScene | https://luv-jeri.github.io/sahajiv-ui/r/shape-scene.json | `24d28f9a9bf111af79e6d7624c5a1d16f72abdd1842f63b4f3ca15678fd9b3c3` |

The initial real CLI request installed Button, Badge, Card, Accordion, Dialog, CodeBlock, TextReveal, and ShapeScene with their actual public dependency closure. The final request updated **Button, Card, and ShapeScene component URLs**, exercising the foundation through dependency installation. There was no explicit-base shortcut and no second CLI request after the update succeeded.

## Verified result

- TypeScript and production Vite build pass with all eight real imports.
- Original public Button action, Accordion open, Dialog focus/Escape, exact CodeBlock clipboard bytes, Badge/Card content, and accessible TextReveal content passed. Those unrelated actions were not repeated.
- Corrected public ShapeScene renders real shaded geometry in Chromium/SwiftShader: **1,393 sampled colors**, 852 × 639 drawing buffer. The screenshot was visually inspected: star, flower, heart, and crescent are present. The probe retains explicit fallback assertions, but fallback was not used in this run.
- Both **390px and 1440px**, light and dark, match document bounds with no horizontal overflow. Dark/mobile screenshot was visually inspected.
- Canvas and text aliases resolve to SahaJiv colors: light background `rgb(251,244,230)`; dark `rgb(23,21,18)`. Card title contrast is **16.68:1 light / 13.14:1 dark**.
- Actual body font is DM Sans; display font is Bricolage Grotesque; both font faces are loaded. Host-owned `font-sans` remains preserved.
- Zero browser page errors and zero console errors in the original and final runs.

All 29 installed component/support module hashes were compared. **27 are byte-identical**. ShapeScene contains the expected runtime change. Card adds only the authored `"use client"` directive and its following blank line: removing those two lines exactly reproduces the original installed SHA-256. Every remaining byte matches. The public Card JSON is unchanged from the initial installation, and current installed Card equals its published source byte-for-byte. This is a CLI directive difference with no runtime effect in this Vite consumer, not an unreviewed component change.

## First failures retained

The initial browser run correctly failed theme validation. Fresh shadcn's later neutral `:root` semantic variables overrode the imported SahaJiv aliases. The result was a white page in both modes and a black Card title on a dark Card. Root corrected foundation delivery using native CSS declaration merging with `:root, :root[data-mode]` aliases and the documented dark variant. No consumer-specific CSS workaround was applied.

A previous readiness watcher was stopped when the parent reported a failed deployment mobile gate; it never ran an update CLI. That pause receipt remains preserved. The final update's strict byte-identity guard also stopped before build because of Card's restored directive. Its first failure is preserved, the exact difference is proven, and build resumed without reinstalling.

## Versions and timings

Node v22.22.0; npm 10.9.4; shadcn 4.21.0; React 19.2.8; Vite 7.3.6; Tailwind 4.3.3; TypeScript 5.9.3; Three 0.185.1; @types/three 0.185.4. The initial receipt records all resolved package versions.

| Phase | Seconds | Scope |
| --- | ---: | --- |
| Fresh initialization, first public install/build | 282.952 | Includes 212.698 waiting for first deployment |
| First browser probe | 7.897 | Interactions passed; real theme failure preserved |
| Corrected public hash wait + CLI update | 374.727 | Includes 365.806 waiting; stopped at explained directive guard |
| Resumed TypeScript + build | 3.462 | No repeated CLI install |
| Final theme/ShapeScene browser confirmation | 6.257 | Four viewport/theme captures; unrelated interactions omitted |

These are phase runtimes, not end-to-end elapsed time including investigation and the deliberately stopped deployment wait. Vite reports the expected optional Three.js chunk above 500 kB; it remains a separate dynamic runtime chunk. No new runtime dependency or consumer workaround was added by this probe.

## Receipts and artifacts

- `public-consumer-install-receipt.json` / corresponding log: initial public CLI, versions, per-entry hashes, and build.
- `public-consumer-browser-first-failure-receipt.json` / log / `public-consumer-browser/`: original unmodified failure and screenshots.
- `public-consumer-update-paused-receipt.json`: stopped deployment wait; no update ran.
- `public-consumer-corrected-update-receipt.json` / log: exact three hashes and real public component update.
- `public-consumer-update-guard-failure.json`: first identity-guard failure.
- `public-card-format-equivalence.json` and the published/recovered source text receipts: exact directive evidence.
- `public-consumer-module-hashes-before.json` / `public-consumer-module-hashes-after.json`: all 29 modules.
- `public-consumer-resumed-build.log`: final TypeScript/build.
- `public-consumer-theme-receipt.json` / `public-consumer-theme-closeout.log` / `public-consumer-theme-closeout/`: final PASS, colors, fonts, contrast, bounds, and screenshots.

Probe source files are retained beside the receipts. All temporary preview/browser processes were closed. Physical iPhone testing and public all-entry behavior are outside this bounded consumer check; root owns those separate release receipts. This agent did not publish or alter production files.
