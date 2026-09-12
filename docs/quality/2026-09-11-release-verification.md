# Release verification — 11 September 2026

Status: **Local implementation and release verification complete, with the explicit native-picker and external-delivery limits below.**

This closes the verification work left after the [component recovery](2026-09-11-recovery-delivery.md), not a new visual redesign. The primary assistant performed these checks directly, without sub-agents. Owner aesthetic acceptance, technical verification and public deployment remain separate decisions.

## Corrections found during the release checks

- The decorative docs-header artwork could extend the document by three pixels at tablet width. Its reserved right inset now accommodates its seeded geometry and pointer drift. The regression failed before the change and passes afterwards on three routes at 360, 768, 1024 and 1440 pixels, including pointer movement toward the edge.
- Cartesian charts measured hidden preview panels as one pixel wide, producing negative SVG rectangle widths when Code/Preview changed. They now retain the last valid width while hidden and clamp exceptionally small visible containers to a valid plotting coordinate space. A dedicated regression failed before the change and now passes initial hidden mounting, reveal, a 24px container, re-hide and restore. All six chart families also pass their actual-docs tests.
- A final Slider check exposed another real shared bug: changing reduced-motion preferences during a menu's retained closing animation could leave an invisible modal locking pointer access and hiding the page from accessibility queries. The existing quiet-exit completion was limited to sliding drawers. It now finishes every shared surface's retained exit. The native regression fails before the repair and passes afterwards for system reduced motion, Motion Off and Flow Off, including unmount, restored focus, outside actions and reopening. The production export was rebuilt and a new complete catalogue sweep started after this repair; the earlier sweep is historical evidence, not the final build's sign-off.
- Six inherited CSS rules violated the repository's prohibition on `!important`. The affected Dock, Native Select, Option Wheel, Scroll Area, Sidebar and Switch rules now use owned/scoped styles. Native Dock, choice, selection, adjustment and scrollbar checks pass; unrelated caller styles remain intact.
- The full unit suite's copied-source check assumed a particular import-line format. It now checks the TypeScript import structure, preserving the semantic requirement after source formatting.
- Older browser checks referred to retired demo labels, confused nested specimen markup with registered gallery roots, selected a hidden inner `pre` instead of the host Code panel, or treated an intentionally screen-reader-only chart table as removed. Those checks now target the current public controls and real outcomes. Missing meaningful cases were added for Bento, Dock and the pattern-background family. No failure was turned into an unconditional pass.
- The broad browser harness now destroys each old page rather than navigating a busy graphics renderer to `about:blank`. It records an explicit source hash for disposable verification snapshots and rejects source drift or incomplete component coverage.

## Fresh passing evidence

Evidence is preserved under `output/playwright/release-20260911/`. The [consolidated catalogue receipt](../../output/playwright/release-20260911/artifacts/release/docs-verified.json) contains every entry, its exact source run, and the remaining verification limitation. The initial failed runs remain alongside the passing rechecks.

| Check | Result and scope |
| --- | --- |
| Complete catalogue | PASS with one explicit behavior limitation: 172 entries, 1,032 viewport/theme layout cases, all shared Preview checks, zero outstanding failures and zero recorded runtime errors. Component behavior coverage is 159 passing, 12 explicitly passive specimens, and one limited Native Select case. Behaviors run in the primary desktop/light context; this is not every interaction at every width. |
| Timeout rechecks | Eight entries received full six-layout rechecks; Shape Scene also received a final solo run. Every outstanding layout/copy/action timeout is closed by fresh passing evidence. The final six-context shell matrix passes. Product source and exported build bytes remained unchanged throughout these rechecks; only the archived browser harness changed. |
| Production build | PASS: 173 registry payloads, 189 static pages; final rebuild includes the chart, tablet-artwork and interrupted quiet-exit fixes. |
| Unit tests | PASS: 293 tests, no failures or skips. |
| Full lint | PASS across app, components, library, registry, examples, scripts and tests, rerun after the final source and harness corrections. |
| Copied examples | PASS: 172 defaults and 791 configured snippets, zero extraction/coverage/TypeScript diagnostics. |
| Fresh consumer installation | PASS: real shadcn CLI installation of 12 roots into a new temporary Vite project, followed by TypeScript and production build. |
| Installed runtime | PASS: native Button, flower Checkbox, rocker Switch, rubber Slider, Accordion, Dialog focus/Escape, Motion Drawer, Code Block copy, both Bento modes with stable seam resize and Undo, reduced motion, and 390/1440 light/dark overflow checks. |
| Final installed shared motion | PASS: the updated base was reinstalled through the real CLI, its installed flow source exactly matches the fixed payload, the consumer builds and the runtime suite passes again. An additional installed Dialog test interrupts closing with reduced motion and proves unmount, focus return, usable outside actions and reopening. |
| Charts | PASS: six chart families, all exposed geometry modes, three compositions, real dataset menus, numeric edge cases, keyboard inspection and 72 responsive/theme captures; annotated Chart introduction also passes. |
| Motion | PASS: nine presets and five additional checks, including persistence, a single paint owner with stable Pagination targets, and Motion Off. |
| Mobile WebKit | PASS: seven groups covering touch navigation, Button outcomes/retry, Tabs, motion settings, Multi Select, 3D view and Marquee. This is browser emulation, not a physical iPhone test. |
| Homepage / maker page | PASS: six viewport/theme runs, native demo actions, navigation, shared Shape Studio, creator/GitHub journey, quiet motion and no document overflow. |
| Landing scroll | PASS: native smooth-scroll checks. |
| Bento recording regression | PASS again on the production docs: both modes, fixed canvas, near-stationary pointer, live grip alignment, release and Undo. |
| Shared Button contract | PASS: related links and setup actions use the actual Button/AnimatedIcon, changing contours, steady native hit targets, keyboard navigation and quiet motion. |
| Sidebar | PASS: expanded default, categorized index, delayed hover/focus previews, compact labels, persistent invitations, small-screen bounds and focus behavior. |
| Preview backgrounds | PASS: real pigment/depth/ambient fields, preserved example state, Plain, live/quiet motion, forced colors and responsive themes. |
| Setup / Request Board | PASS: exact copied setup commands, studio entry points, honest disconnected request flow and eight responsive/theme captures. |
| Reporting UI | PASS: independent persisted request/bug fields and files, review state, pin lifecycle, responsive themes and disabled disconnected sending; real submissions blocked during this test. |
| Reporting integration | PASS: 18 local integration tests. |
| Registry host | PASS: four local tests. |
| Download delivery | Source-verified closure delivery refreshed 11 affected foundational payloads, then 21 chart/dependency payloads and finally the shared Cojeev base; these counts overlap and must not be added as unique entries. Unrelated generated entries were preserved. |

## Runtime and provenance

- Initial sweeps, stale-harness failures and the quiet-exit regression are retained. They are not replaced with hand-written passing statuses. The final evidence combines the new complete sweep with isolated, full-matrix rechecks of timed-out cases against the **same final production export**. It is not an untouched one-shot `npm run gate` pass. Source/harness hashes and a separate 2,394-file manifest reject product/build drift or incomplete coverage. The recheck harness also retires the primary behavior page, which previously left animated examples alive during the next entry's other layouts; it does not change the product or bypass clicks.
- Original working checkout: `/Users/sanjaykumar/Documents/ChatGPT/sahajiv ui`.
- Exact-lockfile release snapshot: `/private/tmp/cojeev-release-71N1IP`, Node 22.22.0. Original dependencies were not replaced.
- The user's port 4321 serves this snapshot's production export at `/cojeev-ui/`.
- Temporary consumer and registry-mirror test servers were stopped after verification; the user's port 4321 preview remains running. Refresh an already-open page to load the final build.
- Fresh consumer: `/var/folders/zg/bhf3_vfs37ld0_7yp5k4cwlh0000gn/T/cojeev-ui-stranger-YOXthW`. Its install used a loopback registry mirror which rewrote dependency URLs only, not component source.
- The combined 12-component consumer reports a large-bundle warning. This gate proves installation and runtime behavior, not a bundle-size or performance budget.
- Intermittent short/empty reads in the original macOS checkout also affected Git metadata reads. No destructive Git repair was attempted. Snapshot provenance uses hashes of source files, not an unverifiable Git-history claim; generated delivery checks compare actual original source before replacing payloads.
- Native Select's callback and controlled value are checked. Keyboard operation of the operating-system popup remains unverified on this headless macOS Chromium setup: a separate bare native select reproduces the same limitation. This is recorded as **limited**, not silently counted as a keyboard pass. The intentionally native popup/listbox also retains its platform scrollbar, as documented in the existing scrollbar scope.

## External boundaries

Read-only requests to the live reporting configuration and request-list endpoints returned HTTP 200. The live configuration reports `emailEnabled: false`. No real report, attachment, email, GitHub issue or delivery job was submitted by these checks. Enabling email and certifying live end-to-end delivery remain a separate configuration/deployment task.

No commit, push or public deployment was performed. This evidence does not assert that the public website has these local changes, that every hidden state was tested in every browser, or that the owner has approved every aesthetic choice.
