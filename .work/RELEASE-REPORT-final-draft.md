# SahaJiv UI 0.1.0

**Final acceptance: pending.** Public source [`479d13a`](https://github.com/luv-jeri/sahajiv-ui/commit/479d13a) includes the installer-theme and Safari touch corrections. Its final CI, deployment and public-consumer confirmation must finish before this report records release acceptance.

The library contains **77 UI entries**: 66 original components, four helpers (Icon, Shape, Preview and Adjuster), and seven additions (CodeBlock, MultiSelect, AnimatedNumber, TextReveal, AmbientBackground, Marquee and ShapeScene). A separate foundation brings the registry total to 78. Fumadocs supplies the documentation framework; visible navigation, controls and surfaces use SahaJiv components. Library code is [MIT licensed](LICENCE); bundled DM Sans and Bricolage Grotesque retain [SIL OFL 1.1 notices](FONT-NOTICES.md). Three.js belongs only to the optional ShapeScene dependency tree.

## Recorded verification

- **Build and examples:** a real fresh public clone at [`47e30c0`](https://github.com/luv-jeri/sahajiv-ui/commit/47e30c0) passed `npm ci` and `npm run build`, producing 82 pages and 78 registry entries with clean initial and final Git status. All 77 default examples and 246 total default/variant/size snippets compile.
- **Documentation and motion:** the [first complete CI and deployment](https://github.com/luv-jeri/sahajiv-ui/actions/runs/34167226450) passed. Recorded coverage includes 462 default layouts (77 entries × three widths × two themes), 77 Preview/copy checks, six documentation-shell cases, all nine motion presets, five additional motion checks and seven WebKit touch journeys. [GATE.md](GATE.md) gives per-entry behavior coverage; [DOCS-VERIFICATION.md](DOCS-VERIFICATION.md) records the separate 154-image review.
- **Installation:** all 77 entries installed, imported, typechecked and built through the real shadcn CLI against an isolated local registry. The initial deployed documentation/registry check passed **159/159 URLs**. A separate fresh public-only consumer installed and built eight specimens; their actions, disclosure, focus/Escape, exact clipboard copy, text content and real shaded WebGL output passed.
- **Installer correction:** that public consumer exposed neutral starter-theme aliases overriding SahaJiv colors. The corrected foundation passed actual direct Button/Card installation into a copy of the initialized consumer, followed by default/light/dark canvas, Card and dark-utility checks. The original app stayed unchanged. Confirmation against the final deployed public registry remains pending.
- **Safari correction:** compatibility mouse movement after touch incorrectly started ShapeScene hover tilt. A deterministic focused WebKit regression failed on the old build and passed after requiring hover-capable input. Thirteen separate ShapeScene checks passed, covering server fallback, rendered geometry, bounded pixel ratio, Off/reduced motion, visibility, pointer settling and GPU cleanup. This is browser-engine coverage, not a physical iPhone claim.

## Preserved failures and limits

The historical source-comparison checkpoint remains **3,096/3,252 pass and 156 fail** in [BASELINE-STATUS.md](BASELINE-STATUS.md). It measures the earlier fidelity phase, not final production acceptance; [REFINEMENTS.md](REFINEMENTS.md) describes intentional corrections and additions.

A local full documentation run failed one combined AnimatedNumber sampling assertion. Its original receipt could not distinguish insufficient samples from an endpoint violation. Focused unchanged-source checks then passed, including 650 recorded values within the endpoints; the checker now records separate sample-count and range evidence. The original failure remains recorded.

The [second CI run](https://github.com/luv-jeri/sahajiv-ui/actions/runs/34168747473) passed all documentation, motion and snippet checks but failed ShapeScene pause in WebKit: six of seven mobile journeys passed, while draw calls increased from 306 to 333. That run did not deploy. The subsequent focused regression passed, but it does not replace final CI or public-consumer verification.

Coverage does not exhaust every variant, state, content length or browser combination. The native picker keyboard limitation remains documented; physical-device and hardware-specific WebGL performance are unmeasured. See [INSTALLATION.md](INSTALLATION.md) for reproduction commands and consumer setup.

## Final confirmation to complete

- CI and deployment for `479d13a`: **PENDING** — add the completed public run URL and exact conclusion.
- Public consumer after that deployment: **PENDING** — record the verified manifest/foundation hashes and actual theme/font/Card outcome.
- Release acceptance: **PENDING** until both results above are recorded.
