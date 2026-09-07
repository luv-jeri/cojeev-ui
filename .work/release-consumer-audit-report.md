# Expanded release consumer audit

## Current checkpoint

The audit scripts have been adapted for the expanded release catalog. **No new all-entry install, browser server, or release consumer claim has been made yet.** Execution is waiting for root's explicit `release catalog ready` signal. The earlier 70-entry installer receipt remains historical evidence for that earlier catalog; it does not cover the new creative/general entries.

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

Final catalog execution results will be appended here after the readiness signal, with its exact source revision and new receipt. Public deployed URL verification remains separate from the local copied registry audit.
