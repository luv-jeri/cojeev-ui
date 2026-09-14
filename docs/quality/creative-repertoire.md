# Cojeev creative repertoire

Maintained from the owner's component-library feedback, 2026-09-10. This is a menu of distinct design approaches, not a requirement to decorate every surface. Select one leading idea and at most one supporting device. Current `DESIGN.md` and runtime tokens own the system; this file records applications and proposals.

## Reusable approaches

| Approach | Useful job | Existing source / status | Restraint |
|---|---|---|---|
| Connected paper files | Switch related tasks without losing context | MotionDrawer stack; reporting correction in progress | Label the alternate file; no detached title or tab plaque |
| Tactile living edge | Make a control respond to intent | Shared morph runtime, Button, Shape | Keep text still; settle after interaction |
| Travelling selection | Show continuity between choices | Shared flow runtime, menus/navigation | One selected surface; no extra stick and loose dot |
| Semantic icon parts | Explain the action through micro-motion | Icon / AnimatedIcon and action geometry | A tray stays still while its arrow moves; finite feedback |
| Tonal watermark | Give a spacious state/category a recognisable silhouette | Shape and signature-shapes | Behind content, not confetti in dense forms |
| Dotted work surface | Light spatial reference behind an example | DotsBackground | Low contrast and a Plain option |
| Drafting grid | Align technical/layout specimens | GridBackground | Not a universal page wallpaper |
| Contour lines | Quiet, flowing spatial depth | ContoursBackground | Keep labels clear and frequency restrained |
| Woven surface | Material texture without imagery | WeaveBackground | Let reading dominate |
| Pebble field | Discrete organic rhythm | PebblesBackground | Use sparsely, not under dense code |
| Sunwash | Broad atmospheric light | SunwashBackground | Theme-aware foreground contrast |
| Folded paper | Direction and shallow depth | FoldsBackground | No extra floating card around every group |
| Sprouts | A living, constructive motif | SproutsBackground | Decorative; never imply success by itself |
| Pigment atmosphere | Frame a spacious introduction | PigmentField / DocsAtmosphere | Quiet-mode and visibility suspension; not every nested surface |
| Modern floating dock | Fast proximity navigation | Dock glass | Bound magnification and preserve hit targets |
| Raised shelf | A physical home for tools | Dock shelf | Contain paint and allow internal narrow-screen scrolling |
| Labelled tool rail | Persistent destination discovery | Dock rail | Labels are first-class; small motion |
| Compact choice tiles | Choose a layout or mode | Button shape=card, bottom drawer example | Modest corners, no gigantic outlined pills |
| Terminal window | Make an install command recognisable | InstallCommand / CodeBlock | One copy action, icon feedback without layout shift |
| Receipt seal | Distinguish a durable outcome from a toast | Reporting receipt | Only after real acceptance; local draft is not success |

## Candidates, not shipped claims

- **Thumb-index navigation:** category labels cut into a paper edge; useful for a collapsible docs index, provided full names remain available and focus does not disappear.
- **Shared shoulder:** one curved surface joins a dominant action to its toolbar; do not create a notch that clips the focus ring.
- **Quiet margin annotations:** short hints aligned to a field group rather than another box; move them inline on narrow screens.
- **Fold-to-detail:** a selected summary unfolds into its detail plane; preserve reading order and instant quiet-mode access.
- **Category imprint:** one large low-contrast silhouette anchors an empty state with a reason and a useful action; not a substitute for content.

## Decisions from this review cycle

1. Original references lead when a clone is requested. Adapt minimally first; additions must earn their difference.
2. A variant must change composition or behavior. Size and color are parameters, not a claim of a new concept.
3. All live variants are visible on their docs page. Avoid duplicating full configuration forms for every specimen.
4. Copy, loading and transient statuses keep the surrounding geometry stable. Preserve readable failure/retry guidance.
5. Global appearance policy belongs at the shared owner. Repeated per-consumer scrollbar/selection fixes signal a root cause to trace.
6. One card stack is one object, with card-owned headings and attached alternate-card labels. “Attached” includes continuous painted corners and an unobscured hit target: a square tab above a rounded body is still disconnected. The earlier three-box report composition was explicitly rejected despite passing behavior tests.
7. Screenshot inspection, interaction tests, installable source validation and user approval are different evidence. Record them separately.
8. Full-width is deliberate. A menu trigger is not a layout block, and a multi-line choice is not an inflated action pill.
9. Motion expresses function and respects quiet settings. Show meaningful progress only while the application is actually busy.
10. Reuse the codebase before adding code; do not remove safety, semantics, privacy or required customization in the name of simplicity.

## Inspiration and knowledge map

- `reference/cojeev-handoff-v4/docs/DESIGN.md`: Intelly-derived warm ground, black structure, pastel semantics, connected geometry. Its blanket no-gradient/no-shadow rule is historical; later user direction and current DESIGN.md explicitly allow restrained authored depth and fields.
- `reference/cojeev-handoff-v4/docs/MOTION.md`: bounded response, shared selection and explicit rest/quiet behavior. Treat old numeric settings as historical; inspect the current React implementation.
- `reference/motion-drawer/TEARDOWN.md` and preserved MIT source: original UI Layouts drawer geometry/gesture, intentional native differences and accessibility repairs.
- `data/reference-effects.json`: per-component original links and reused/new dispositions; `docs/reference-guide/` route renders the comparison inventory.
- `reference/expansion/skiper/research.md`: public behavior and licensing boundaries, icon adaptation evidence; don't redistribute restricted examples.
- `docs/quality/stack-reporting-dock-plan.md`: Apple old/current Dock, Aceternity and Magic UI references. Its separated reporting header/tabs composition is superseded by `reporting-craft-plan.md`.
- `docs/quality/rapid-fix-ledger.md` and family coverage JSON: current session's symptoms, shared causes and verified/partial evidence. `OVERHAUL-*.md` retain earlier project work; historical gates are not fresh certification.

Reusable skill installed at `/Users/sanjaykumar/.codex/skills/cojeev-component-craft/SKILL.md`. Invoke `$cojeev-component-craft`; its project files, not duplicated token tables, provide live context. New skill discovery may require a new Codex session.

## Skill validation

The skill-format validator passed. An independent agent forward-tested two prompts without changing components: “add three calendar variants plus docs” and “terminal copy feedback shifts layout; remove focus outlines.” The first produced reuse of Calendar/DatePicker, structurally different examples, API preservation and metadata checks. The second routed to the existing copy-feedback issue/shared owner while preserving failure guidance and keyboard focus. Review refinements were applied: scope file geometry to file stacks, allow deliberate visibility-gated ambient fields, preserve public APIs, and use bounded re-verification rather than stopping after one repair. These are instruction-quality checks, not proof that future implementations will automatically pass.
