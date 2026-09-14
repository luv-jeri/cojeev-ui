# Documentation map

Extended documentation lives here. The repository root keeps the essentials —
`README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `LICENCE` and `FONT-NOTICES.md` —
the files a visitor, a contributor, an agent or a licence check needs to find
without searching.

The short root `INSTALLATION.md` pointer also remains so links from already
published website versions continue to reach the full guide.

Nothing was deleted or rewritten in this reorganisation. Historical documents
were moved, their relative links repaired, and their text left as written.

## If you are using the library

| Start here | What it answers |
| --- | --- |
| [Project README](../README.md) | What 000h by Cojeev is, and how to install one component |
| [Installation](guides/INSTALLATION.md) | Registry configuration, theming, and the fresh-install check |
| [Design system](design/DESIGN.md) | Tokens, typography, colour roles, shape language and motion contracts |
| [Product definition](design/PRODUCT.md) | Platform, audience and product scope |

## If you are developing in this repository

| Start here | What it answers |
| --- | --- |
| [Contributing](../CONTRIBUTING.md) | What a new component needs before it is accepted |
| [Agent rules](../AGENTS.md) | Framework rules and the checkpoint delivery directive |
| [Checkpoint workflow](checkpoint-workflow.md) | One checkpoint, one branch, one commit, one PR — and the verification owed |
| [Documentation components](reference/DOCS-COMPONENTS.md) | Which parts of the documentation site are library components |
| [Semantic bloom](semantic-bloom.md) | The semantic colour and surface model |
| [Quality records](quality/) | Audits, ledgers, and per-area quality plans |

## If you are running a release

| Start here | What it answers |
| --- | --- |
| [Launch master checklist](superpowers/plans/2026-09-12-launch-master-checklist.md) | The live task list, its IDs and their acceptance state |
| [Plans and specs](superpowers/) | Written plans and design specs behind the current work |
| [Production operations](production/OPERATIONS.md) | Deployment, promotion and recovery procedure |
| [Production records](production/) | Dated release, recovery and gate-repair evidence |
| [Launch records](launch/) | Registry submission, analytics, creator kit and verification |
| [Reporting](reporting/) | The in-product reporting service: plan, operations and verification |
| [Privacy](privacy/) | Processing inventory and diagnostics disclosure |
| [Marketing](marketing/) | Outreach research and shortlists |
| [Gate reports](gates/GATE.md) | The latest generated production gate result |

`docs/gates/` is written by the gate scripts (`npm run gate`, `npm run
gate:static`, `npm run gate:reference`). Treat its contents as generated output,
not as hand-edited documentation.

## Archive — historical plans and evidence, kept as written

These are historical plans and evidence, not current completion claims. Each
describes the state of the repository at the time it was written, **not** the
current state, and what a plan proposed is not proof that it was delivered.
Several say so in their own opening paragraph. They are retained as a record and
are not maintained; check the current source, the launch checklist and the gate
reports for what is actually true now.

### Signature overhaul — September 2026

| Document | Subject |
| --- | --- |
| [`OVERHAUL-PLAN.md`](archive/overhaul/OVERHAUL-PLAN.md) | Signature overhaul — implementation and release |
| [`OVERHAUL-REPORT.md`](archive/overhaul/OVERHAUL-REPORT.md) | Cojeev UI 0.2.0 — signature overhaul |
| [`OVERHAUL-AGENT.md`](archive/overhaul/OVERHAUL-AGENT.md) | Agent workspace implementation |
| [`OVERHAUL-CHARTS.md`](archive/overhaul/OVERHAUL-CHARTS.md) | Chart suite implementation and evidence |
| [`OVERHAUL-COMPONENTS.md`](archive/overhaul/OVERHAUL-COMPONENTS.md) | Overhaul component audit |
| [`OVERHAUL-DATA-LIFECYCLE.md`](archive/overhaul/OVERHAUL-DATA-LIFECYCLE.md) | Data and command lifecycle confirmation |
| [`OVERHAUL-DATA-OVERLAYS.md`](archive/overhaul/OVERHAUL-DATA-OVERLAYS.md) | Data and overlay audit |
| [`OVERHAUL-DOCS.md`](archive/overhaul/OVERHAUL-DOCS.md) | Documentation composition overhaul |
| [`OVERHAUL-FORMS-NAV.md`](archive/overhaul/OVERHAUL-FORMS-NAV.md) | Forms and navigation audit |
| [`OVERHAUL-LIFECYCLE.md`](archive/overhaul/OVERHAUL-LIFECYCLE.md) | Library lifecycle acceptance checklist |
| [`OVERHAUL-LONG-CONTENT.md`](archive/overhaul/OVERHAUL-LONG-CONTENT.md) | Bounded long-content consumer pass |
| [`OVERHAUL-MOTION.md`](archive/overhaul/OVERHAUL-MOTION.md) | Motion and scroll implementation evidence |
| [`OVERHAUL-PRIMITIVES.md`](archive/overhaul/OVERHAUL-PRIMITIVES.md) | Final primitive motion audit |
| [`OVERHAUL-VARIANTS.md`](archive/overhaul/OVERHAUL-VARIANTS.md) | Variant audit against the product and design contracts |
| [`OVERHAUL-WEBKIT-LIFECYCLE.md`](archive/overhaul/OVERHAUL-WEBKIT-LIFECYCLE.md) | Targeted WebKit and final lifecycle corrections |

### Refinement passes

| Document | Subject |
| --- | --- |
| [`REFINEMENT-PLAN.md`](archive/refinement/REFINEMENT-PLAN.md) | Living showcase and component refinement — plan |
| [`REFINEMENT-REPORT.md`](archive/refinement/REFINEMENT-REPORT.md) | Living showcase and component refinement — report |
| [`REFINEMENTS.md`](archive/refinement/REFINEMENTS.md) | Production refinements |
| [`REFINEMENT-BUILD.md`](archive/refinement/REFINEMENT-BUILD.md) | Production build shutdown refinement |
| [`REFINEMENT-CONTROLS.md`](archive/refinement/REFINEMENT-CONTROLS.md) | Controls and selectors refinement |
| [`REFINEMENT-ICON-FEEDBACK.md`](archive/refinement/REFINEMENT-ICON-FEEDBACK.md) | Shared icon feedback |
| [`REFINEMENT-MARKETING.md`](archive/refinement/REFINEMENT-MARKETING.md) | Narrative pages and documentation integration |
| [`REFINEMENT-MENUS-ICONS.md`](archive/refinement/REFINEMENT-MENUS-ICONS.md) | Menus, list identity, and icons |
| [`REFINEMENT-THEME-SCROLL.md`](archive/refinement/REFINEMENT-THEME-SCROLL.md) | Theme reveal and native scrollbar refinement |

### Local review passes

| Document | Subject |
| --- | --- |
| [`REVIEW-PASS-PLAN.md`](archive/review/REVIEW-PASS-PLAN.md) | Local review pass — 8 September 2026 |
| [`REVIEW-PASS-REPORT.md`](archive/review/REVIEW-PASS-REPORT.md) | Local review handoff — 8 September 2026 |
| [`REVIEW-ASSEMBLY.md`](archive/review/REVIEW-ASSEMBLY.md) | Assembly specimen redesign |
| [`REVIEW-ASSEMBLY-COLOUR-FLOW.md`](archive/review/REVIEW-ASSEMBLY-COLOUR-FLOW.md) | Assembly colour and Glide follow-up |
| [`REVIEW-ASSEMBLY-MOTION.md`](archive/review/REVIEW-ASSEMBLY-MOTION.md) | Assembly choreography correction |
| [`REVIEW-DEPTH-LAYERS.md`](archive/review/REVIEW-DEPTH-LAYERS.md) | DepthBackground and FloatLayer |
| [`REVIEW-EXPANSION-BATCH-01.md`](archive/review/REVIEW-EXPANSION-BATCH-01.md) | First expansion batch |
| [`REVIEW-EXPANSION-BATCH-02.md`](archive/review/REVIEW-EXPANSION-BATCH-02.md) | Typography, action icons and glyph sculpture |
| [`REVIEW-EXPANSION-BATCH-03.md`](archive/review/REVIEW-EXPANSION-BATCH-03.md) | Catalogue expansion — batch 3 |
| [`REVIEW-EXPANSION-BATCH-04.md`](archive/review/REVIEW-EXPANSION-BATCH-04.md) | Final expansion checkpoint |
| [`REVIEW-LANDING-STUDIO.md`](archive/review/REVIEW-LANDING-STUDIO.md) | Landing studio |
| [`REVIEW-LIVING-DETAILS.md`](archive/review/REVIEW-LIVING-DETAILS.md) | Living details |
| [`REVIEW-MOTION-PROGRESS.md`](archive/review/REVIEW-MOTION-PROGRESS.md) | Local motion, Progress and Slider review |
| [`REVIEW-SELECTORS-LISTS.md`](archive/review/REVIEW-SELECTORS-LISTS.md) | Selector and list review |
| [`REVIEW-SHAPE-ARTWORK.md`](archive/review/REVIEW-SHAPE-ARTWORK.md) | Shape artwork and workbench |

### Superseded releases

| Document | Subject |
| --- | --- |
| [`RELEASE-REPORT.md`](archive/release/RELEASE-REPORT.md) | Cojeev UI 0.1.0 release record |
| [`RELEASE-0.2.0.md`](archive/release/RELEASE-0.2.0.md) | Cojeev UI 0.2.0 release record |
| [`RELEASE-REFERENCE-EFFECTS.md`](archive/release/RELEASE-REFERENCE-EFFECTS.md) | Reference collection release |

### Superseded plans

| Document | Subject |
| --- | --- |
| [`EXPANSION-PLAN.md`](archive/plans/EXPANSION-PLAN.md) | Catalogue expansion scope, closed 2026-09-09 |
| [`PRODUCTION-PLAN.md`](archive/plans/PRODUCTION-PLAN.md) | Production refinement direction, 8 September 2026 |

### Frozen status records

| Document | Subject |
| --- | --- |
| [`BASELINE-STATUS.md`](archive/status/BASELINE-STATUS.md) | Cumulative source-comparison checkpoint; historical verdicts only |
| [`BUILD-STATUS.md`](archive/status/BUILD-STATUS.md) | Build status as of the 0.1.0 release |
| [`DOCS-VERIFICATION.md`](archive/status/DOCS-VERIFICATION.md) | Default documentation screenshot review |

### Supplied-reference findings

| Document | Subject |
| --- | --- |
| [`REFERENCE-ISSUES.md`](archive/reference/REFERENCE-ISSUES.md) | Historical reference issues and refinement follow-up |
| [`REFERENCE-RUNTIME-FINDINGS.md`](archive/reference/REFERENCE-RUNTIME-FINDINGS.md) | Reference runtime conflicts |
