# Build status

The library is under construction. Phase 0 has resumed after the owner approved the reduced-motion behavior documented in [PHASE-0-DECISION.md](PHASE-0-DECISION.md). Three component candidates exist; the full library is not complete or published.

| Phase | Status | Evidence |
| --- | --- | --- |
| 0 — Button, Badge, Card spike | In progress | Reference manifest: 924/924 hashes verified; static and interaction harnesses implemented; local CLI installation of three components exercised |
| 1 — Foundation | Pending | |
| 2 — Motion and Adjuster | Pending | |
| 3A — 19 static components | Pending | |
| 3B — 29 interactive components | Pending | |
| 3C — 18 composed components | Pending | |
| 4 — Documentation and publication | Pending | |

Scope: 66 base components, 542 supplied isolation pages. App screen migration is a later project.
MIT licence. Initial hosting: GitHub Pages; a custom domain may follow after completion.

## Definition of done tracking

| Requirement | Current evidence / remaining work |
| --- | --- |
| Public repo; fresh clone, install, build | Public repo created; source remains local. Fresh-clone proof pending. |
| All 66 base ports | Button, Badge and Card candidates only. Other 63 not implemented; generated skeletons are not ports. |
| Complete fidelity gate | `GATE.md` contains the latest bounded run. Full six-width coverage and motion agreement remain pending. |
| Three motion engines; nine flow animations | Scoped morph implementation and literal spring parity test exist. Full effects, flow and category behavior remain incomplete. |
| Adjuster and three settings keys | Typed settings foundation exists; Adjuster UI and interoperability proof pending. |
| Public installable registry | Local registry JSON installed through the actual shadcn CLI; public hosting pending. |
| Five-component stranger install with Radix | A clean external consumer installed three components through the real CLI and built successfully; light and dark previews checked. Final five-component proof including Radix is pending. |
| 66 published Fumadocs pages | Three Fumadocs component pages build with source-derived props, live variants, theme switching and working copy commands. Remaining 63 pages and public hosting are pending. |
| CI build and gate on every push | Workflow implemented; first remote run pending. |
| Final coverage and accepted-difference report | Reduced-motion static bodies accepted by owner. Final coverage report pending. |

## Documentation UI direction

Fumadocs supplies the framework. The visible documentation UI will use SahaJiv library components. The owner authorized creating any missing documentation helpers and adding them to the library; [DOCS-COMPONENTS.md](DOCS-COMPONENTS.md) tracks those additions separately from the original66. The current preview's default Fumadocs navigation and native controls are still awaiting that migration.
