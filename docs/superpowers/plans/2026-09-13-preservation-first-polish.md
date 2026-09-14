# Preservation-first polish implementation plan

> **For agentic workers:** Use subagent-driven-development or executing-plans, one checkpoint per branch and PR. Sanjay approved the written design on 13 September and requested parallel work with personal code and visual review.

**Goal:** Make existing choice settings and Accordion content easier to read without replacing their character or options.

**Architecture:** Compose the existing selector glyph into the docs picker; honor the examples' existing compact prop. Adjust Accordion's existing appearance CSS, not its disclosure controller. The two checkpoints are independent and can be implemented in isolated worktrees.

**Tech Stack:** Next.js 16.3, React, TypeScript, CSS, existing Node tests and Playwright scripts. Use installed Node 22 and shared dependencies; no new dependencies.

## Global Constraints

- Follow the approved [design contract](../specs/2026-09-13-preservation-first-polish-design.md) and `docs/checkpoint-workflow.md`.
- Preserve Organic, Circle, Rounded, Pebble, Leaf and Flower; every mark, show/hide, Row/Card/Chip, state and copied configuration.
- Preserve FAQ, Chapters and Editorial, stable full-row targets, disclosure-height ownership, refs, controlled state and existing contour/icon motion.
- No new idle animation, dependency, global event listener or competing transform owner. Keep keyboard access and reduced motion, Motion Off and Flow Off.
- No homepage changes, provider configuration, deployment or registry submission. Regenerating local direct-download payloads is in scope.
- Each checkpoint needs focused functional checks plus personal desktop/390px light/dark visual review. Do not run the full catalogue for these isolated edits.

### Task 1: H03-2 — choice-workbench clarity

**Files:** `components/component-preview.tsx`, `components/examples/choice-foundations.tsx`, `registry/cojeev/styles/choice-foundations.css`, `tests/docs-preview.test.ts`, `tests/choice-recovery.docs.browser.mjs`; generated payloads only where those source changes affect them.

**Interfaces:** Consume `SelectorGlyph` from `registry/cojeev/lib/selector.tsx`, the existing `SelectItem` adornment prop, and `ExampleProps.compact`. Do not change shared selector geometry or global Select behavior. Output remains the same public examples and component APIs.

- [ ] Add SSR behavior tests for Checkbox and Radio compact examples. The main header remains, compact headers disappear, three controls and live selection feedback remain. Test real output, not source text:

```ts
const $ = load(renderToString(createElement(CheckboxExample, { compact: true })));
assert.equal($('.v-choice-example header').length, 0);
assert.equal($('[role="checkbox"]').length, 3);
assert.match($('[role="status"]').text(), /Working notes/);
```

- [ ] Run `node --import tsx --test tests/docs-preview.test.ts` and observe the missing compact behavior fail before changing it. Extend the existing browser script to open Glyph shape and assert each option contains the corresponding existing selector silhouette; observe the current unrelated adornments fail.
- [ ] Destructure `compact = false` in both examples; render their existing header with `{!compact && <header>…</header>}`. Retain status and name the checkbox group. Give only Glyph shape options an explicit `SelectorGlyph` adornment, using the actual prop types and existing shape vocabulary; leave every other menu unchanged. Remove the final Row control's bottom border inside `.v-choice-options[data-approach="row"]`, retaining `.v-choice-result` as the one closing divider.
- [ ] Run the SSR test and `DOCS_BASE_URL=http://127.0.0.1:4322 node tests/choice-recovery.docs.browser.mjs` against this worktree's dev server. Add menu keyboard selection, compact group names/status, single divider and retained state assertions to that focused script. Capture the real Checkbox and Radio pages at 1440px/390px, light/dark; inspect Shape menu, Row/Card/Chip, quiet mode and focus. Use `node node_modules/typescript/bin/tsc --noEmit` and lint only changed source files. Regenerate with `node scripts/build-registry.mjs`, inspect generated diff, validate affected payloads using the existing registry tests. No unrelated generated changes.
- [ ] Commit explicit changed paths with `fix(workbench): clarify choice shapes and comparisons`, body `Checkpoint: H03-2`, test results and limits. Primary reviews code and screenshots; independent review checks spec and quality. Open its own PR; do not label rendered result owner-approved until reviewed by Sanjay.

### Task 2: V50-1 — Accordion reading hierarchy

**Files:** `registry/cojeev/styles/accordion.css`, `components/examples/disclosure.tsx` only if the composition needs it, `tests/disclosure-recovery.docs.browser.mjs`; affected generated payloads. No changes to the shared controller in `registry/cojeev/ui/accordion.tsx` unless a separately reproduced issue requires escalation.

**Interfaces:** Existing `data-appearance`, `.v-acc__index`, `.v-acc__summary`, `.v-acc__detail` and `.v-acc__preview` slots. Preserve all structure/motion interfaces and native ARIA contracts.

- [ ] Extend the real docs browser check at 390px to require the Editorial artwork to accompany, not precede the answer as a full-width block. Example assertion after selecting Editorial and opening its first item:

```js
const art = await openItem.locator('.v-acc__preview').boundingBox();
const detail = await openItem.locator('.v-acc__detail').boundingBox();
assert.ok(art && detail);
assert.ok(art.width <= 80, 'mobile artwork is a small motif');
assert.ok(Math.abs(art.y - detail.y) <= 8, 'answer starts alongside the motif');
```

- [ ] Run `DOCS_BASE_URL=http://127.0.0.1:4323 node tests/disclosure-recovery.docs.browser.mjs`; observe that the current full-width artwork fails. Measure Chapters summary/detail starts on desktop and mobile and add a close-alignment assertion before fixing the mismatch.
- [ ] Give resting FAQ items a subtle paired tonal surface via the existing `--mfill` and background rules, with the existing open accent retained. Align Chapters reading starts using the actual index width, trigger padding and gap; keep the numbered spine. Set Editorial content to a restrained art column plus `minmax(0,1fr)` answer column. Start with mobile `grid-template-columns: 56px minmax(0,1fr); gap:16px`, artwork `width:56px; min-height:56px`, existing shapes scaled within it; suppress its decorative caption on mobile. On desktop keep the motif subordinate, approximately 96px, with readable caption. Review actual narrow gallery widths before settling values; never clip long answers or change the height owner.
- [ ] Run the affected disclosure browser check against the worktree dev server. Verify all three approaches at 1440px/390px, light/dark, long titles, keyboard, focus, rapid reversal and quiet settings. Capture and personally inspect screenshots. Run existing `tests/disclosure-slots.test.tsx`, changed-file lint, type checking and registry generation/affected payload validation. No full catalogue.
- [ ] Commit explicit paths with `fix(accordion): refine reading columns and supporting artwork`, body `Checkpoint: V50-1`, evidence and limitations. Primary reviews exact code and real screenshots; independent review checks spec and quality. Open its own PR. Neither checkpoint closes the whole library overhaul or authorizes deployment.
