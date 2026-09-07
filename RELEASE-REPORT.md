# SahaJiv UI 0.1.0

The release contains **77 UI registry entries**: the original 66 components, four shared helpers, and seven additions. The separate foundation entry provides the shared tokens, fonts, styles and motion code. Documentation uses Fumadocs with SahaJiv's own visible components. Code is MIT licensed; bundled fonts retain their SIL Open Font Licences.

The [public documentation](https://luv-jeri.github.io/sahajiv-ui/) and [MIT source repository](https://github.com/luv-jeri/sahajiv-ui) are live. The first complete [GitHub verification and deployment](https://github.com/luv-jeri/sahajiv-ui/actions/runs/34167226450) passed. A final public-consumer theme correction is being verified before release acceptance.

## Scope and evidence

- **Installation:** all 77 entries installed through the real shadcn CLI into a fresh Vite/React/Tailwind project outside this repository. Every module imported, typechecked and built. Twelve component families rendered; selected actions, disclosure, copying, multiple selection and pause controls worked. The optional Three.js runtime loaded and drew shaded geometry. This audit used the local registry; public installation is a separate release check.
- **Copied examples:** all 77 default snippets and 246 total extracted default/variant/size snippets compile. The check rejects local-only helper imports and missing catalog examples.
- **Visual review:** all 77 default pages were reviewed at desktop light and mobile dark sizes, using 154 screenshots. Focused follow-ups corrected Alert glyphs and text, selected ButtonGroup state, Card/Bubble secondary text, navigation counts, Sidebar collapse controls and default Tabs targets. Contrast confirmations cover the stated affected surfaces; this is not an automated claim of universal accessibility compliance.
- **Motion:** all nine presets remain available. Glide is calmer, fast changes follow the latest selection, and moving selection layers keep labels and hit targets still. Off and reduced motion preserve content and state. Separate focused checks cover Marquee pause/inert copies, effects stillness, and ShapeScene rendering, fallback and cleanup.
- **Production pages:** the final reproducible static-build gate is recorded in [GATE.md](GATE.md). Raw receipts and screenshots are saved as CI artifacts. Each entry has an explicit meaningful behavior case or is identified as passive content.

## Local release confirmation

The final local static build produces 82 pages. TypeScript, lint, four core tests and 246 copied snippets pass. The documentation run passed 462/462 layouts, 77/77 Preview/copy checks and all six shell cases with zero runtime errors; its combined AnimatedNumber sample assertion failed once. The exact unchanged-source six-entry sequence and a focused check subsequently passed; 650 additional recorded values remained within endpoints. That initial failure is preserved and not relabeled. The checker now records raw text, numeric values and times, with separate sample-count and range assertions. The complete GitHub CI run subsequently passed every documentation behavior, all nine motion presets and mobile WebKit checks before the first publication.

All nine motion presets and five additional motion checks pass. All seven WebKit touch journeys pass against the static build, including every-frame mobile navigation/close bounds, unclipped MotionControls and actual WebGL rendering. This is Safari-engine coverage, not a physical iPhone test.

## Intentional differences and limits

This release preserves the supplied design family and intentionally corrects broken source behavior. It is not a claim of pixel identity with every original export. [REFINEMENTS.md](REFINEMENTS.md) lists additions and changes; [BASELINE-STATUS.md](BASELINE-STATUS.md) preserves the historical 3,096/3,252 source comparison checkpoint and its 156 failures without relabeling them as passes.

The browser gate checks default layouts and interactions, with separate copied-source compilation for variants and sizes. It does not exhaust every combination of browser, state and content. Native select's programmatic selection and callbacks pass; the original headless Chromium native-picker keyboard check remains limited. Physical iPhone behavior and hardware-specific WebGL performance have not been measured. ShapeScene supplies a static fallback when WebGL is unavailable.

## Reproduce

```sh
npm ci
npx playwright install chromium webkit
npm run lint
npm run typecheck
npm test
npm run build
npm run check:examples
npm run gate
npm run gate:mobile
node scripts/audit-registry-consumer.mjs
node scripts/verify-install.mjs
```

The full consumer audit installs all entries against an isolated local registry. The final command installs selected components from the public registry into a separate fresh project. See [INSTALLATION.md](INSTALLATION.md).
