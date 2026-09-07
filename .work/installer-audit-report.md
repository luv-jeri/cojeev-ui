# Fresh all-entry consumer audit

PASS against source checkpoint `7f0893e`, including the ordered stylesheet sidecar builder and corrected `states → flow → morph → accessibility` precedence.

## Reproduction

After `npm ci`, run Node 22 with `scripts/audit-registry-consumer.mjs [new-output-directory]`. The output directory must not exist. The script makes an isolated registry copy, serves it on an ephemeral loopback port, initializes a fresh Vite/React 19/Tailwind 4 consumer with a `src/` alias layout, and invokes the real local shadcn CLI against every public UI URL. It does not modify the checkout's registry or builder.

## Evidence

- All 70 public UI entries installed successfully with their foundation and sibling dependencies. The consumer starts with only React and React DOM as runtime dependencies.
- Every entry is statically imported, its actual exported names are read and rendered, and `tsc --noEmit && vite build` passes. All 70 import records render in Chromium without a page error. This checks real consumer module closure rather than only registry JSON.
- Each entry's recursive registry dependency set contains every referenced UI, motion, and helper module and every imported npm package. No missing entry, unnormalized relative source import, unresolved alias, or undeclared package was found.
- All 75 delivered CSS files equal the source exactly, with only the declared outer layer added where required. The declared layer order is `theme, base, components, utilities, sahajiv-states, sahajiv-flow, sahajiv-morph, sahajiv-accessibility`.
- Browser-computed `background-clip` on the Table scrollbar thumb equals `border-box` in both the installed built consumer and an authored-source CSS probe.
- The standalone audit script passes focused ESLint with zero warnings.

The complete machine receipt, source and installed CSS SHA-256 hashes, entry list, and browser values are in `.work/installer-sidecars-receipt.json`. Generated build/install logs and the disposable source and consumer remain in `.work/installer-audit-sidecars/` and are intentionally not committed.

## Closed finding

The previous CSS-to-JSON object delivery collapsed repeated selectors and moved longhands relative to later shorthands. Table's first scrollbar-thumb rule (`table.css:173–178`) sets `background-clip: content-box`; its later rule (`197–199`) assigns a new `background`, which should reset the clip to `border-box`. The old installed object retained `content-box`. The verbatim sidecars now preserve both rules and their actual order, and Chromium confirms the corrected value.

## Scope

This is installer, dependency, CSS transport, and runtime-import evidence. It does not claim that all component interaction or visual fixtures pass. Importing all 70 entries together produces Vite's expected large-chunk warning; a normal consumer imports the components it uses.
