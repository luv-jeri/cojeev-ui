# Expanded release consumer audit

## Current checkpoint

The release catalog readiness signal was received and the new **77-entry fresh consumer audit passed**. The earlier 70-entry installer receipt remains historical evidence for that earlier catalog. This report now records a separate fresh install for all 77 current UI entries plus their foundation and dependency closure.

Owned changes are limited to `scripts/audit-registry-consumer.mjs`, `scripts/verify-install.mjs`, and this report. No builder, package, manifest, registry JSON, or component file was edited.

## All-entry local audit

The script now defaults to a fresh directory outside the repository and refuses a repository-local output path. The release execution will explicitly use `/tmp`. It copies `data/component-guides.json` and `data/component-additions.json` into the isolated registry source alongside the builder and components. Subprocesses spawn their actual executable directly; installing RTK is no longer a requirement to run this public script.

The receipt records the source commit, actual entry names/count, start/end timestamps, elapsed seconds, log paths, and exact optional dependency versions. Import closure analysis uses the TypeScript AST, covering normal imports/exports, dynamic `import()`, and import types. It normalizes versioned package declarations and verifies both installed dependencies and devDependencies.

The audit requires `three` and `@types/three` in the ShapeScene closure and actual fresh consumer installation, while ensuring both stay out of the foundation closure. It imports every public UI entry, typechecks and builds the actual installed source, then loads the built consumer. When present, it renders real CodeBlock, TextReveal, and ShapeScene specimens. The scene check loads the built lazy runtime chunk and checks shaded canvas pixels, retaining a screenshot. Existing exact CSS sidecar/layer and table background-clip checks remain.

## Public URL specimen

The default remains Button, Badge, Card, Accordion, and Dialog. Optional supported entries are CodeBlock, TextReveal, and ShapeScene; they can also be requested independently. `--tmp=/tmp` places the real fresh consumer explicitly outside the project. `--receipt` selects the receipt path; the default now includes a timestamp to retain previous receipts.

```sh
node scripts/verify-install.mjs --url=https://luv-jeri.github.io/sahajiv-ui --tmp=/tmp --components=button,badge,card,accordion,dialog,code-block,text-reveal,shape-scene
```

The specimen checks actual installed Three/type-package versions when the scene is requested, and rejects those packages leaking into a specimen that did not request it. It records failures as failures, along with the fresh directory and timing. This script builds the rendered specimen for later browser review; its receipt explicitly says screenshot verification was not run. It does not silently label a build as browser verification.

## Preflight evidence

- Both scripts pass Node 22.22.0 syntax checks.
- ESLint passes for both scripts without warnings/errors.
- All eight generated JSX specimen fragments parse with TypeScript, including the literal newline in CodeBlock source.
- Direct executable spawning and both newly required data-copy paths are present.
- No install or server was launched for these preflight checks.

The final execution results follow. Public deployed URL verification remains separate from this local copied registry audit; no deployment was performed here.


## Final release execution: PASS

Fresh directory: `/tmp/sahajiv-release-consumer-77-20260908/consumer`. The real shadcn CLI installed every public UI URL from an isolated copied registry on an ephemeral loopback server. Installed package resolution used an empty Vite/React/Tailwind project, not the repository's node_modules. The builder copy used the worktree dependencies only for building the registry itself.

Production input checkpoint: **429a49a**. The initial audit runner/source receipt records `999dcf9b53484c35674455060bcb880f96762c7a`; the corrected runner records `113ec3520a7f8e6594d93c12607f620a8c94d914`. A Git comparison confirms zero changes to registry sources, data, package files, builder, or API extractor between release429a49a and these runner-only commits.

- **77 UI modules**: real CLI installation, all public exports imported, TypeScript check, production Vite build, and runtime module loading PASS. This is complete module/dependency closure coverage; it does not claim that every one of the 77 families was behavior-tested by this installer script.
- **12 actual rendered families**: ShapeScene, Button, Badge, Card, Accordion, Dialog, CodeBlock, TextReveal, AnimatedNumber, AmbientBackground, Marquee, MultiSelect. Browser interactions checked Button state, Accordion expansion, Dialog opening/Escape dismissal, exact clipboard text from CodeBlock, MultiSelect selection/removable token, and Marquee pause/resume. TextReveal retained its accessible full text. The other selected families were mounted as real components.
- **82 CSS sidecars**: source/generated/installed contents match the exact expected bytes and layers. The historical repeated-selector and shorthand-order hazard remains closed. Installed and source table scrollbar thumb `background-clip` both resolve to `border-box`.
- **Optional scene**: installed **three0.185.1** and **@types/three0.185.4**; both absent from the foundation dependency closure. The built lazy WebGL chunk loaded and rendered actual shaded geometry, with **670 sampled colors**. The installed scene screenshot was visually inspected at `/tmp/sahajiv-release-consumer-77-20260908/shape-scene.png`.
- **Browser errors**: zero page errors. The server and browser were closed after the run.
- **Timing**: 193.923s from initial start to final completion, including the audit-fixture correction. The resumed build/browser phase took 16.313s. No dependency installation was repeated.

## Audit fixture correction and preserved receipts

The first build failed because the new audit specimen generator placed a literal newline inside a TypeScript string. This was confined to generated `src/main.tsx`; it was not a registry component failure. The fixture generator now uses JSON.stringify for that source string. All 12 generated JSX snippets passed parsing before the corrected run.

The script now accepts `--resume` after the existing output directory. This mode requires recorded successful registry build, fresh package installation, and full CLI installation; it archives the previous receipt, keeps the original source revision, and reuses the installed registry/component/dependency tree. It only regenerates the specimen and repeats the downstream build/checks. Resume logs get new names, retaining the first error. It does not claim a second fresh install or silently promote a failed attempt.

Committed evidence:

- `.work/release-consumer-77-receipt.json`: untouched final raw receipt.
- `.work/release-consumer-77-initial-receipt.json`: untouched first failure receipt.
- `.work/release-consumer-77-cli.log`: all-entry CLI install evidence.
- `.work/release-consumer-77-fixture-error.log`: original fixture-only TypeScript failure.
- `.work/release-consumer-77-build.log`: passing TypeScript/Vite production build.

The raw receipt's historical `renderedEntries:77` field counts loaded export-list entries, not mounted component families; `renderedComponents` explicitly lists the 12 actual families. The script now names that count `loadedModuleCount` and separately records `renderedComponentCount` for future receipts. That reporting-only rename does not require another install/build. The selected installed-component checks supplement root's broader built-docs and motion gates.
