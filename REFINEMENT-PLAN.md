# Living showcase and component refinement

**Goal:** Implement the owner's September 8 visual feedback: a varied, slower theme-changing blob, a responsive narrative landing page and Work with Me page, and stronger, readable control states with reusable organic iconography.

**Architecture:** Keep the existing React/TypeScript, Radix, Motion and Fumadocs system. Marketing pages compose the library's actual parts and share the same theme. Fix shared paint ownership at its source, then add explicit selector/adornment options without breaking native semantics. Demonstration state stays local and clearly described.

**Execution:** Four independent groups in the existing shared checkout. No root reset, cleanup or root-history publication. Reconcile named ownership before touching another group's files. The previous release checks and consumer were stopped when this refinement was requested; prior evidence is historical, not acceptance of this pass.

## Direction and decisions

- Preserve Bricolage Grotesque, DM Sans and the established paper/ink/pink/olive/blue/yellow family. This is an expressive expansion of that world.
- The homepage is a Persuade/Experience surface: an open composition of real parts, a native-scroll assembly passage, an interactive component playground, the design principles, installation and the creator link. Avoid using repeated identical cards as its page structure.
- The opening proposition is “Little parts. Big personality.” The first viewport must explain React components, show the actual parts in motion, and expose an Explore components action.
- Components visibly assemble into a conversation interface; the sequence has explicit replay/step controls and a complete static reduced-motion state. Parallax uses native scroll, with no scroll locking.
- Dark and light transitions reveal the actual destination page through an expanding organic mask from varied viewport origins. Rapid toggles, Off/reduced, unsupported APIs, scrolling and cleanup must preserve a usable final theme.
- Default menu-item shapes vary deterministically by item identity. Consumers can suppress them, choose a shape/colour or supply their own icon. No render-time Math.random or server/client mismatch.
- The Work with Me page may use the confirmed creator name and current project work. Do not fabricate clients, metrics, experience duration, availability guarantees or testimonials. GitHub is the temporary contact destination unless the owner supplies another public link.

## Group A — theme and scrolling (motion_scroll)

Own: `registry/cojeev/motion/theme-transition.ts`, `ui/theme-toggle.tsx`, `styles/theme-toggle.css`, `motion/scroll-thumb.ts`, `ui/scroll-area.tsx`, `styles/scroll-area.css`, related focused checks and examples in `components/examples/motion-primitives.tsx` when needed.

- [x] Replace the uniform theme crossfade with a slower organic reveal from varied corners, edges and centre. Reveal both destination colours and actual page text/components coherently.
- [x] Preserve sun/moon morphing and expose the origin through the existing theme callback contract, without coupling registry code to the docs app.
- [x] Redesign document and region scroll thumbs with readable affordances, rounded organic contours and motion tied to direction/velocity, hover, press and dragging. Keep usable hit areas and actual native scroll.
- [x] Prove actual reveal frames/origin, interruption, exact final theme, focus, Off/reduced cleanup and Chromium/WebKit fallback. Prove pointer drag, keyboard scroll, direction reversal and narrow layouts.

## Group B — controls and selectors (docs_craft)

Own: Button, Calendar, DatePicker, Dropzone, Checkbox, RadioGroup and Questionnaire UI/style files; `motion/use-morph.ts` only if the shared paint defect needs correction. Own new selector helpers and isolated examples/checks; do not edit shared example registries or global tokens without coordination.

- [x] Reproduce the visible secondary/disabled/loading Button defects in both themes and active/Off modes. Fix actual SVG fill/foreground ownership, not merely an isolated CSS expectation.
- [x] Rework Calendar/DatePicker hierarchy, month navigation, selected/today/range cells and popup geometry using the existing primitives. Preserve real date keyboard semantics and retained month exits.
- [x] Give Dropzone a designed empty/hover/drag/error/selected presentation with reusable shapes, readable guidance and real file callbacks.
- [x] Offer multiple polished selector silhouettes for Checkbox and RadioGroup, including organic blobs. Carry those options into Questionnaire. Preserve checked/indeterminate/disabled/focus semantics and consumers' controlled state.
- [x] Inspect all advertised new variants at mobile/desktop, light/dark; sample active interaction frames and reduced motion. Keep defects and accepted cases separately in the report.

## Group C — menus and icon system (agent_workspace)

Own: DropdownMenu, Menubar, Select, Combobox, MultiSelect, NavigationMenu, Icon and AnimatedIcon UI/style files; new reusable item adornment helper/component; `app/docs/[component]/page.tsx` and `components/component-preview.tsx` only for variant/size selectors. Coordinate any shared paint cause with Group B. Preserve the final Menubar retained-exit dismissal guard.

- [x] Constrain menu panels to intentional intrinsic/min/max widths and the available viewport. Fix highlighted/pressed/checked paint contrast in light and dark modes.
- [x] Replace native documentation variant/size controls with library Select or DropdownMenu while preserving labels, keyboard use and copied example selection.
- [x] Add default varied organic item adornments with a consistent public API for automatic, explicit shape/colour, custom icon and none. Use stable identity, not visual reshuffling during a render.
- [x] Expand the reusable animated icon catalogue and demonstrate the names/presets in the library. Include GitHub, navigation arrows and chevrons. State-driven arrows must animate with their open/closed/active state.
- [x] Apply the shared adornment/arrow APIs to supported custom menu/select lists, document the browser-owned NativeSelect exception, and expose configuration in live examples.
- [x] Inspect real menu states at mobile/desktop in both themes, keyboard switching, selected contrast, interrupted exits and Off/reduced behavior.

## Group D — narrative pages and integration (root)

Own: `app/page.tsx`, new `components/landing/*`, landing CSS, new `app/work-with-me/page.tsx`, `components/docs-shell.tsx`, documentation shell CSS, app metadata as necessary, shared catalog/example/guide registration and release integration. Use existing component APIs; coordinate additions before registration.

- [x] Build a top navigation with brand, GitHub icon/link, theme toggle and reachable mobile navigation using library components.
- [x] Build the complete opening composition with real ShapeScene, ShapeMorph, Button, Badge and typography, then a scroll-driven assembly of library primitives into an actual interactive conversation mockup.
- [x] Add distinct interactive showcase passages, clear principles, source/installation controls and a grounded footer. Provide keyboard replay and static states; every useful action must do something observable.
- [x] Build Work with Me with confirmed creator content and the chosen public contact link. Reuse the marketing navigation and visual system.
- [x] Refine the existing library Sidebar composition and link all routes. Update the component/addition inventory for new reusable primitives, example source and public registry closure.
- [x] Batch desktop/tablet/mobile and light/dark visual review, then one correction/confirmation round. Verify interactions and reduced motion at the real boundaries; do not relabel a code/build pass as visual acceptance.
- [ ] Run integrated lint/typecheck/build, copied snippets and focused logic tests, then production browser checks for changed paths. Publish once the finite pass is complete and verify public installation from a fresh consumer.

## Completion record

Record changed components, new public APIs, meaningful checks, known native boundaries and final URLs in `REFINEMENT-REPORT.md`. The previous `OVERHAUL-*` reports remain historical evidence. Owner's custom domain remains a later task.

## Latest owner steering

The theme reveal must be slower and vary its origin across the viewport, including corners and centre. This supersedes the original clicked-button-only origin. Radio and Checkbox defaults must remain close to circles with subtle asymmetry and shared cursor attraction/morphing; strong silhouettes are optional. Creator contact is https://github.com/luv-jeri.
