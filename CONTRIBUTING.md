# Contributing

Use Node.js 22.12+, run `npm ci`, then `npm run dev -- --port 4320`. Documentation lives at `/cojeev-ui/`.

Keep every component in the same family: warm canvas, purposeful pink/olive/blue/yellow accents, Bricolage Grotesque headings, DM Sans body text, shared spacing and authored shapes. Moving parts should respond naturally without moving the surrounding layout. Respect reduced motion and global Off. Background effects and 3D should stop unnecessary work offscreen and release resources when removed.

Components live under `registry/cojeev/ui/`, with scoped CSS sidecars under `registry/cojeev/styles/`. Use existing primitives and tokens. Keep optional heavy dependencies in the entry that needs them. A new component also needs metadata in `data/component-additions.json`, a useful guide in `data/component-guides.json`, a real example registered in `components/examples/manifest.ts` and `index.ts`, and its stylesheet imported by the docs. Example functions must be self-contained because the docs extract their actual source.

Before submitting a change, run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and the relevant production behavior checks. `npm run gate` checks the built docs and shared motion. Add meaningful behavior cases for new interactive entries in `scripts/check-docs.mjs`; static entries must be explicitly identified. Test pointer and keyboard separately, open/close and focus return, disabled/error states, light/dark themes and mobile layout.

Use focused logic tests for hand-written behavior. Preserve source-comparison evidence; do not weaken a comparison or edit the reference to conceal a difference. The refinement brief permits intentional improvements to confirmed source defects, with the benefit and evidence recorded in REFINEMENTS.md and the release report.

Do not commit credentials, machine-specific paths or private application code. Font licences remain separate from the MIT licence. Contributions use the repository's MIT licence.
