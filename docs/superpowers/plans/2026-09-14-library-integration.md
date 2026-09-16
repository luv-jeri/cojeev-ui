# Library Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Resolve verified 000h integration defects and deliver the approved reusable branch-ledger Tree with qualified installation guidance.

**Architecture:** Correct shared owners without replacing public components. Compose Tree from existing row/icon vocabulary with native disclosure semantics and controlled consumer-owned data. Keep packaging options explicit and measure emitted bundles before optimizing.

**Tech Stack:** React 19, TypeScript, existing Radix/Motion/CSS primitives, existing Node/esbuild/browser fixtures and shadcn registry tooling.

## Global Constraints

- Current user-approved design: docs/superpowers/specs/2026-09-14-library-integration-design.md. Warm paper, precise ink, living contours; existing runtime tokens own exact colours and motion.
- Preserve public props/ref/controlled-state contracts and genuine disabled/focus styling. No consumer application edits, filesystem/Git services, new dependency, production deployment or credentials changes.
- Tree uses native disclosure-list semantics, separate expansion and selection controls, branch-local feedback and consumer-owned state; no nested interactive controls and no unsupported ARIA tree role.
- Use GPT Sol or Terra fresh implementers and independent reviewers. Only one implementer writes at once. Controller does not fix implementation findings.
- Use rtk for shell commands and apply_patch for source edits. Conventional feat/fix/chore naming; checkpoint ID in commit body, no agent/vendor attribution.
- Run focused affected checks only; no full catalogue or complete release suite during this work. Report executable-check time separately from implementation/investigation. Reviewers do not repeat a passing check without a concrete uncovered concern.
- Update installable source, registry metadata and docs for affected items. Keep mirror compatibility explicit; no fabricated outage or unsupported performance claim.
- Final handoff lists every L/C/I ID as fixed, documented boundary, measured, or unresolved, with exact evidence. New designs need viewed screenshots, not only saved files.

### Task 1: L-01 semantic press feedback; L-03 busy integration notes

**Files:** Modify registry/cojeev/motion/flow-press.ts; create tests/flow-availability.test.ts (or existing test-runner-compatible .mjs); create docs/quality/library-integration-status.md. Inspect Button/IconButton/Item callers. Do not change their legitimate disabled styling.

**Interfaces:** Preserve useFlowPress<T extends HTMLElement>(externalRef?:React.Ref<T>):React.RefCallback<T>. Only semantic selection/input changes may trigger a pulse; availability/visibility changes must not.

- [ ] Reproduce with the actual hook and rendered Button/IconButton/Item: disabled=true→false, loading=true→false, aria-disabled, inert and hidden removal must produce no programmatic pulse. Include old and final data-state values in mutation batches; disabled/busy/rest are availability states, not selection. Keep checked/unchecked, on/off, open/closed, real pointer and keyboard input feedback. Avoid adding observations for unsupported new states.
- [ ] Minimal candidate shape (adapt to actual callers, preserve cleanup):
  ```ts
  const availabilityStates = new Set(['disabled', 'busy', 'rest']);
  // Observe attributeOldValue. Classify each data-state transition using its
  // previous and next value, including multiple records in one observer batch.
  // Availability-only transitions do not pulse; genuine selection still can.
  ```
- [ ] Test first: assert pulse count stays zero after programmatic readiness; assert actual activation/selection produces feedback; cancellation/unmount restores inline styles and quiet settings suppress motion. Show old-source failure and patched pass. Run the focused test, not the catalogue.
- [ ] Document L-03 separately: transient native disabling and row opacity belong to the consumer; Button loading/aria-busy preserves guards but must not be claimed visually stable until checked. No app changes or startup-flicker completion claim.
- [ ] Commit fix(motion): prevent readiness changes from pulsing controls; body Checkpoint: L-01. Write report with command/output/duration and remaining concerns.

### Task 2: L-02/C-02 theme-correct travelling tabs and icon composition

**Files:** Modify registry/cojeev/styles/tabs.css and scoped Tabs selectors in registry/cojeev/styles/flow-press.css if needed; components/examples/navigation.tsx (locate owning Tabs example); relevant docs metadata; create tests/tabs-integration.browser.mjs or reuse affected fixture.

**Interfaces:** Preserve Tabs/TabsList/TabsTrigger/TabsContent props and arbitrary children. Reuse decorative Icon with text; no new Tabs family or required wrapper.

- [ ] Reproduce dark pills/lenses travelling layer paint separately from stationary active trigger; verify Flow Off/reduced motion fallback.
- [ ] Add token-paired dark overrides scoped to pills/lenses: --glide-bg uses existing accent and --glide-fg its fixed ink. Keep default light treatment and notebook/rail/underline behavior.
- [ ] Supported inline composition:
  ```tsx
  <TabsTrigger value="files"><Icon name="folder" aria-hidden="true" />Files</TabsTrigger>
  ```
  Apply inline-flex alignment and var(--s-2) gap at the trigger owner, with text-only dimensions preserved. Avoid forcing SVG labels into screen-reader names.
- [ ] Focused checks cover visible settled/moving selection, paired foreground, icon/text row alignment, text-only/long/disabled triggers and keyboard focus. Capture affected variants for final visual review; do not run broad catalogue.
- [ ] Commit fix(tabs): preserve dark selection and align icon labels; body Checkpoint: L-02, C-02. Record evidence and limitations.

### Task 3: I-01/I-02 declaration-safe public helpers and compiler boundary

**Files:** registry/cojeev/ui/input.tsx; registry/cojeev/lib/reference-gallery-motion.ts; create scripts/verify-declaration-consumer.mjs and docs/guides/strict-typescript-integration.md; link from existing contributor/install guidance.

**Interfaces:**
```ts
export function InputWrapper(/* existing props */): React.ReactElement
export function useGalleryRef<T>(hostRef: React.RefObject<T | null>, forwardedRef: React.Ref<T> | undefined): React.RefCallback<T>
```

- [ ] Add a small declaration-emitting composite consumer fixture using actual copied registry source and existing dependencies, not hand-written stubs. Verify the original exported inference fails before applying the two return annotations.
- [ ] Preserve callback-ref cleanup and app strictness. Document library compiler/React versions actually in package.json/lockfile, upstream strict settings, and the separate composite-project route for exactOptionalPropertyTypes/noUncheckedIndexedAccess. Do not claim those flags supported for every copied file without proof.
- [ ] Run only declaration consumer and affected typecheck; record actual commands/results/times. Commit fix(types): annotate public helper return types; body Checkpoint: I-01, I-02.

### Task 4: C-01/C-03 branch-ledger Tree

**Files:** create registry/cojeev/ui/tree.tsx, registry/cojeev/styles/tree.css, components/examples/tree.tsx, focused tests/tree.test.ts and tests/tree.browser.mjs; register through data/component-additions.json, data/component-guides.json, scripts/component-api.mjs and generated registry.json, plus components/examples/index.ts and components/examples/manifest.ts. lib/catalog.ts consumes generated metadata. Inspect nearby Item/Collapsible entries before edits; use existing metadata structure rather than inventing a parallel catalogue.

**Interfaces:** Export controlled Tree with supplied nodes, expandedIds, selectedId, onExpandedChange(id, expanded), onSelectionChange(id), onRetry(id); retain caller-owned child data. Suggested node contract:
```ts
type TreeNode = {
  id: string; label: string; kind: 'file' | 'folder';
  children?: readonly TreeNode[]; icon?: React.ReactNode;
  status?: 'idle' | 'loading' | 'error'; message?: string;
  truncated?: boolean; trailing?: React.ReactNode; disabled?: boolean;
};
```
Exact exported type names may follow existing naming; document them and avoid callbacks secretly fetching data. Undefined children on folder means not yet supplied; [] means loaded empty.

- [ ] Implement native ul/li disclosure list: labelled separate expansion button and selection button, aria-expanded/controls, aria-current on selected row where appropriate, normal Tab/Enter/Space. Trailing actions are siblings. Reuse Item as a noninteractive row wrapper if needed, ItemAdornment decorative icons and native controls; no nested button and no fake role=tree keyboard contract.
- [ ] Apply approved branch ledger: compact 4px rhythm, subtle logical-inline connector lines, gentle chevron turn through shared quiet/motion policy, stable icons and one selected soft surface. No idle animation, extra dots or random identity shifts. Long labels truncate visually with full accessible text; actions remain reachable on narrow screens and RTL.
- [ ] Keep branch-local loading, retry, empty and truncated notices; preserve selection/cache across collapse/reopen; return focus to collapsing ancestor when a focused descendant hides. Avoid changing scroll position on unrelated node updates. Disabling/collapsing never causes readiness pulse regression.
- [ ] Demo nested mixed files, long/deep paths, loading, empty, failure/retry and supplied truncation. Show actual states without backend claims; expanding one folder emits only its callback. Document consumer-owned fetching/cache/limits and scope exclusions (no editing/drag-drop/IDE).
- [ ] Focused tests assert expansion/selection independence, controlled updates, collapsed state retention, retry routing, focus recovery and keyboard/quiet behavior. Save desktop/narrow light/dark screenshots for actual viewing at final review. Registry build and one fresh-install check may be combined with Task5.
- [ ] Commit feat(tree): add controlled branch-ledger disclosure list; body Checkpoint: C-01, C-03. Report API and viewed/unviewed evidence honestly.

### Task 5: I-03/I-04/I-05 font delivery, measured payload and installation handoff

Installer-placement clarification: retain the registry target
`scripts/cojeev-materialize-fonts.mjs`. shadcn places that target beneath
`src/` in a src-layout consumer, so the measured fixture invokes
`node src/scripts/cojeev-materialize-fonts.mjs --css src/styles/cojeev-fonts.css`.
Do not use a `../scripts` target to force project-root placement or risk writing
outside a consumer without `src/`.

**Files:** inspect scripts/build-registry.mjs, scripts/verify-install.mjs, registry.json, registry/cojeev/styles/fonts.css and licensed font sources; add registry/cojeev/scripts/materialize-fonts.mjs shipped as a text-only registry:file targeting scripts/cojeev-materialize-fonts.mjs; docs/guides/local-fonts.md; docs/quality/library-integration-status.md; create focused delivery/measurement script only if existing scripts cannot express it.

- [ ] Implement explicit offline materialization: `node scripts/cojeev-materialize-fonts.mjs --css src/styles/cojeev-fonts.css` decodes the two existing WOFF2 data sources into sibling fonts/*.woff2 and changes only those src values to relative URLs in the same active stylesheet. Preserve all other CSS/family/weight declarations, shipped OFL notices and default embedded install until opted in. Inspect/verify canonical source hashes; idempotent rerun must not overwrite unrelated fonts or silently accept partial/drifted input. Installed shadcn4.21.0 reads registry files as UTF-8, so never list binary WOFF2 as registry files. No new font endpoint, runtime dependency, second active stylesheet or network request is needed.
- [ ] Prove one offline self-only font-src CSP consumer renders bundled fonts; leave default embedded-font option intact. Do not loosen CSP or claim network-free behavior without checking requests.
- [ ] Measure fresh minimal Button and Projects set (Button/IconButton/Input/Tabs/Item/ActivityFeed/Tree) emitted JS/CSS/font raw and gzip bytes and import graph. Example measurement uses gzipSync(actualBuiltFile).length; distinguish installed registry JSON size from emitted bundle. Do not raise warning thresholds, add dependency frameworks, or claim startup improvements without timing. Apply only a small clearly attributable reduction; otherwise report measured cost as open optimization with concrete owner.
- [ ] Verify documented shadcn CLI against primary production with a clean temporary consumer; verify local candidate registry including Tree/fonts separately. Keep an explicit mirror/local override; historical 403 is not a current outage and Pages compatibility is intentional. No provider protection bypass, publication or consumer-repository edits.
- [ ] Complete status for all L/C/I IDs and upgrade notes: L-01/L-02/I-01 workarounds removable only after qualified revision installed, app busy handling/fonts/compiler boundaries retained until corresponding fixture passes. Include artifacts/commands/timings and any external gap.
- [ ] Commit chore(integration): qualify fonts payload and consumer delivery; body Checkpoint: I-03, I-04, I-05. Final whole-branch review and one viewed visual pass precede any merge/deploy decision.
