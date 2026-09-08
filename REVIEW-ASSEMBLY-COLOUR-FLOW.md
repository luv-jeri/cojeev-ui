# Assembly colour and Glide follow-up

The existing curved travel, contour interpolation, staging and six composition layouts are preserved. The temporary blob surface now converges on the native root's authored background and foreground before release. A synchronous paint probe excludes only the temporary paint override and generated morph layer; it keeps the native root and its content in place. CSS `color-mix(in oklab, …)` blends the visible colour during the existing travel clock. Transparent content roots gradually reveal the real surface below them.

Theme and palette changes rebase colour from the currently visible mixture without restarting travel. Resting native endpoints are remembered for replay after a state or palette change. Off, reduced motion and interrupted travel stop the current writer and immediately restore usable native paint and geometry.

## Source and API

- [AssemblyPart](registry/sahajiv/ui/assembly-part.tsx) and [its stylesheet](registry/sahajiv/styles/assembly-part.css): progressive native background/ink handoff. No new public props; existing duration, delay, curve, transitionKey, immediate and release contracts remain.
- [OrganismAssembly](registry/sahajiv/ui/organism-assembly.tsx) and [its stylesheet](registry/sahajiv/styles/organism-assembly.css): chooser uses the shared selection group, with native Button roots and a single travelling pink Glide. The six choices retain keyboard navigation and their two-row narrow layout. Decorative injected layers no longer affect the responsive child-count selector.
- [Item](registry/sahajiv/ui/item.tsx): the existing morph ref is composed through `useFlowPress`. Consumer refs and event props remain intact. Independent task completion rows each receive release feedback; they are not treated as one mutually exclusive selection.
- Coordinated changes by the composition owner in [OrganismComposition](registry/sahajiv/ui/organism-composition.tsx), [its stylesheet](registry/sahajiv/styles/organism-composition.css) and [shared flow paint](registry/sahajiv/styles/flow-press.css): settled dock selection group, pink native/group endpoint parity, optional `--glide-layer-z`, `--glide-hover-z`, `--glide-trail-z`, and exclusion of AssemblyPart roots from the generic relative-position flow rule. Dock surface stays at z0, pill at z1, native tools at z2 and hover at z3. Chat's InputGroupButton already inherits Button feedback; its send icon uses AnimatedIcon.

## Reproducible local evidence

Run `rtk proxy node scripts/check-assembly-colour-flow.mjs` against an existing local dev server. `BASE_URL` and `OUTPUT_DIR` can override the defaults. The script does not build or generate registry payloads.

The final Chromium run used 390px in light and dark, with additional 320px chooser checks. It recorded 112 native part handoffs across Profile, Panel, Dock, Chat, Focus and Invite, plus rapid replay → Chat with a theme and palette change. The maximum RGBA channel change at native release was **0** for fill and ink. The settled visible stack differed by at most **1** channel value, on the dock where the transparent native root reveals the same-coloured Glide. The original baseline had single-colour travel and jumps up to 255.

Fourteen actual pointer workflows passed: Follow, independent task toggle, dock selection, local chat send, focus start/pause, RSVP and chooser selection in both themes. The pulse checks sampled the native root's individual scale, and the group checks sampled the moving Glide transform and layer position. The local chat action clears its input and disables the empty send button. Twelve Off/reduced checkpoints after rapid reversals retained empty clip paths, released local motion/flow locks, paint progress1 and stable native backgrounds at immediate, +260ms and +900ms samples.

The two 320px chooser screenshots were visually inspected: all six labels fit in a deliberate two-row arrangement, with a readable pink selected surface in both themes. Scoped ESLint and TypeScript checks passed for the modified UI dependency graph.

Receipts are written to `output/playwright/review-assembly-colour-flow/`: `baseline.json`, `paint.json`, and `chooser-320-light.png` / `chooser-320-dark.png`. The proof samples actual computed root/SVG paint and composites the actual selected Glide underneath transparent controls; CSS variable presence alone is not counted as visible paint.

## Boundaries

This is a local Chromium paint, native-control and interruption confirmation. It does not replace the parent's broader visual/WebKit review. The handoff owns native background colour and foreground ink; image pixels, gradients, borders and shadows retain their component contracts. No geometry changes, new dependencies, production build, registry generation, installation audit or publication were performed in this follow-up.
