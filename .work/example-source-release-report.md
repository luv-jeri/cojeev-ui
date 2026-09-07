# Documentation copied-source release check

Measured revision: `429a49a`. **PASS: all 77 default documentation snippets compile.** The complete run compiled 246 independently extracted TSX modules: every documented variant/size combination (238) plus eight meaningful multi-size wrappers. There were zero extraction errors, repository-local snippet imports, coverage gaps, or TypeScript diagnostics.

## Reusable release / CI command

```sh
node scripts/check-example-source.mjs
```

The command needs the repository's installed dependencies and current generated `registry.json`; it does not need a browser, network access, RTK, or a running docs server. It starts a child with the installed `tsx` loader and imports the actual `components/example-source.ts` extractor. The extractor architecture is unchanged.

The checker compares all production `registry/sahajiv/ui/*.tsx` names with the documentation manifest and generated UI catalog, so a new component missing its copied example fails coverage. It writes each extractor result into a separate temporary module under the repository, rejecting snippet imports of local project helpers. Only `@/components/ui/*` is mapped to `registry/sahajiv/ui/*` for the installed-target compatibility check. The regular root alias remains available to the production component dependency graph. Thus a copied snippet cannot rely on the surrounding example module's top-level helpers or imports. A strict, no-emit TypeScript program compiles all resulting modules and their production dependencies. Temporary source is removed even on failure; `--keep` retains it for diagnosis.

Default JSON receipt: `artifacts/example-source/results.json`. Override with `--output <path>`. The committed release receipt is `.work/example-source-verification.json`; it retains every component/case, emitted source SHA-256, and verdict. The command exits nonzero for coverage, extraction, or TypeScript errors.

## Results and scope

- Production UI modules: **77**; manifest entries: **77**; catalog UI entries: **77**.
- Default snippets: **77 / 77**.
- Total snippets: **246 / 246**. These include **155** invocations with nondefault variants, **97** with nondefault sizes or multi-size arrays (these categories overlap), and **8** multi-size wrappers.
- TypeScript diagnostics: **0**.
- Extractor or example implementation changes: **none**. No core examples needed missing-import or top-level-constant repairs.
- `npx eslint scripts/check-example-source.mjs`: passed.

All new families were included: AmbientBackground, Marquee, MultiSelect, ShapeScene, AnimatedNumber and TextReveal. Root's prior Marquee local-topics correction and Ambient variant handling are present in the measured revision. The actual docs' optimized source template and invocation construction use the same declaration and variant/size props as the extractor; this was reviewed alongside the compile check.

This proves copied-source compilation against the local installed-target module mapping. It does not replace the separate consumer install/dependency audit, runtime behavior checks, or visual review. No browser matrix or repeated motion gate was run.
