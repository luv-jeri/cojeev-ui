# Production static-mode paint correction

Off and reduced motion now preserve an explicit spinner’s authored `--mfill`, including live paint changes, instead of substituting the first `data-colors` animation color. Normal modes continue to opt into the animated path fill. The only production file changed is `registry/sahajiv/motion/use-morph.ts`.

The hook already clears active press state, suppresses deformation, stops spinner rotation and prevents color cycling in Off/reduced mode. This change closes the remaining static-paint error. Existing normal geometry, cadence, press spring and color/rotation calculations remain unchanged. Native Button CSS press transforms outside the hook’s decoration are being handled separately by the shared-flow owner; this report does not claim their validation.

## Regression evidence

The new browser probe imports the real public Button, production `useMorph`, settings and complete production style aggregate into an isolated 390px Chromium page. It uses real pointer and keyboard input, changes the production mode at runtime while a body is pressed, and changes the browser reduced-motion preference while pressed. It returns to normal mode after each quiet state.

Before the change, each theme failed exactly three assertions: Off spinner authored fill, reduced spinner authored fill, and live authored paint while static. The other fourteen assertions per theme passed. After the fix, **all 34 assertions pass** (17 light + 17 dark), with zero page errors.

The assertions cover normal color cycling/rotation/deformation; Off clearing active deformation and rotation; static Off under pointer and Space-key interaction; authored fill retention; live reduced preference; static reduced interaction; live authored fill change to `#336699`; normal animation resumption after Off and reduced motion; and exactly one explicit body per owner throughout the mode changes. This is production behavior evidence, not source-appearance parity.

## Existing checks

- Canonical `live-settings` and `media-change` at 390px/light, each repeated in fresh contexts: **2/2 rows PASS, 24 assertions**.
- Existing settings, spring and motion-clock tests: **3/3 PASS**.
- ESLint for `use-morph.ts`: PASS.
- Typecheck for the hook and its transitive dependencies using the project compiler configuration: PASS.
- Full-project typecheck: blocked by existing generated-registry metadata in `lib/catalog.ts` (`meta.baseComponent` missing). No registry/catalog file was modified to conceal that failure.

The initial test command used a nonexistent `tests/motion-settings.test.ts` name; the actual `tests/settings.test.ts` was then located and passed with the two related logic tests. That command error is not a test result.

## Evidence and reproduction

- Probe: `.work/morph-static-mode-probe.mjs`.
- Machine receipt: `.work/morph-static-mode-receipt.json`.
- Before/after raw states: `artifacts/morph-static-mode-red/results.json`, `artifacts/morph-static-mode-green/results.json`.
- Six after-fix screenshots: light/dark normal, Off and reduced in `artifacts/morph-static-mode-green/`.
- Existing behavior results: `artifacts/morph-static-mode-behavior/results.json`.
- Reproduce the focused browser test with Node 22: `rtk proxy env STATIC_MODE_OUTPUT=artifacts/morph-static-mode-green node .work/morph-static-mode-probe.mjs`.

All owned browsers and the port-4350 server are closed. The earlier partial source-baseline matrix is preserved independently in commit `cf6f4c4`; its historical FAIL rows were not relabeled by this production refinement.
