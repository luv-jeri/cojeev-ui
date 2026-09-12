# 000h Launch — Master Checklist and Implementation Plan

> **For agentic workers:** Use the executing-plans skill for an approved implementation batch. This is the owner's tracking document, not permission to execute every task immediately. Read the evidence and current source before changing a status.

**Goal:** Finish the requested library work, launch a trustworthy production site and isolated beta, then complete search discovery, registry submission and approved marketing.

**Architecture:** Keep the static Next.js export and Cloudflare website/reporting Workers. Use isolated beta services, receipt-first reporting, and a tested release promoted through owner approval.

**Tech stack:** Next.js, React, shared Cojeev motion and components, Cloudflare Workers/D1/R2/Turnstile, GitHub Actions, Resend and PostHog EU.

**Status date:** 12 September 2026. **Owner:** Sanjay. **Implementation/review:** Cojeev. This document consolidates the recorded work and latest audit; it is not a fresh test of every component or account setting.

## Start here

**The project is not launch-complete.** Component recovery has implementation evidence, but final owner visual acceptance is still open. The rejected homepage was reverted and preserved separately. The latest release has not reached production or beta.

| Area | Where we stand | What closes it |
| --- | --- | --- |
| Component overhaul | Recovery report records all 55 intake rows, plus Hero Button and shared-shell work | Final acceptance checklist below, with reopened defects actually repaired |
| Homepage | Earlier version restored; rejected redesign preserved | New design approved, implemented and verified |
| Release PR | Original #2 closed automatically when its source branch was renamed; replacement pending | Complete passing combined-candidate checks and owner gates, then normal merge |
| Production | Existing older website remains online | Approved, recorded release and live acceptance |
| Beta | Resources partly provisioned; last DNS checks failed | Credentials, Workers, domains, HTTPS and isolated live tests |
| Email/reporting/analytics | Code and some accounts ready | Real end-to-end evidence, privacy controls and owner inbox confirmation |
| Performance/privacy/accessibility | Read-only audit completed with open findings | Implement approved corrections and verify them |
| Search/registry | Submission work is not completed or claimed | Separate submission and accepted/indexed evidence |
| Marketing | Research and shortlist prepared | Approved assets, recipients, messages and tracked outcomes |

### The next actions, in order

1. Agree which audit fixes block launch, and confirm the business/privacy facts in section A.
2. Repair CI scheduling: use affected checks on small PRs and the full suite for the combined candidate. Finish account credentials in parallel where account access permits.
3. Close the launch-blocking privacy, accessibility, licensing and product issues; approve the final homepage and component visuals.
4. Run all checks against the final source revision. Merge the release PR only when its required checks pass and beta can deploy safely.
5. Deploy and verify beta. Exercise recovery. Obtain production approval, promote the same recorded source revision, and complete production smoke tests.
6. Submit the production site to search tools, then submit the approved registry namespace and launch the approved marketing campaign.

Work may proceed in parallel, but a later phase cannot turn an earlier failed gate into a pass. If the homepage rework is deferred, Sanjay must explicitly approve the restored page as the release homepage.

## How to use this checklist

**Required delivery rule:** Follow [checkpoint workflow](../../checkpoint-workflow.md). Each checkpoint gets a scoped commit and PR using `feat`, `fix` or `chore`; record its ID, PR URL, commit and evidence. Auto-merge is permitted after the required checks, review and acceptance gates pass; production approval remains separate. Implementation, merge, visual approval and live verification remain distinct statuses.

- `[x]` means the **specific stated outcome** has evidence. A provisioned resource does not mean its service works end to end.
- `[ ]` means pending, blocked, awaiting approval, or unverified. Those states are explained alongside the task.
- Owners: **C** = Cojeev; **S** = Sanjay; **B** = both; **L** = qualified legal/privacy reviewer where needed.
- Before checking an item, add its task ID, date, source revision, result and evidence link to the completion log at the end.
- Mark a task **Not applicable — approved by Sanjay, with reason** when appropriate. Do not silently delete it or count it as implemented.
- A reappearing bug reopens its checkbox. Machine tests, visual approval and production verification are separate outcomes.
- There is deliberately no overall completion percentage: provisioning a bucket is not equivalent to finishing a legal review or a component family.

## Global constraints

- Preserve unrelated local changes, private files, backups, production reports and existing resource identifiers.
- Keep the owner's tracking copy of this checklist in the durable original project folder, `/Users/sanjaykumar/Documents/ChatGPT/sahajiv ui`. The release source baseline is branch `chore/production-beta` at `cc971887e4e6825bd5568815cb76ebf22c602e04`; Phase 1 runs in isolated worktrees, with W01 integration in `/private/tmp/000h-phase1-jKXhib/repo`. The earlier `/private/tmp/cojeev-production-cLJFa8tY/repo` path is historical, not the current-checkout authority. Do not overwrite the durable original's dirty application source or one working copy with another.
- Do not deploy an uncommitted snapshot. Build beta and production from the same reviewed commit, using their own public URLs and separately verified artifacts.
- No paid upgrade, billing activation or new paid dependency is authorized.
- Keep secrets out of chat, browser build variables, source, logs and public evidence. Owner security prompts remain owner actions.
- Historical reports must not be automatically emailed or published when integrations are enabled.
- Registry registration and marketing are included here as **future work**. Obtain final approval of the namespace/submission or exact outreach text and destination before acting.
- Do not claim guaranteed indexing, directory acceptance, search ranking, legal compliance, or complete accessibility from limited evidence.

## Handoff bootstrap

- [ ] **W01 · C — Land the handoff rules.** Carry this checklist, `docs/checkpoint-workflow.md` and the scoped `AGENTS.md` rule into the verified release working copy without replacing other instructions or dirty source. Review and commit them on `chore/w01-checkpoint-workflow`, open a `chore(workflow)` PR and follow the required checks/merge process. These local documents are not yet a merged policy change.

## Completed baseline — retain these achievements

These checkmarks refer to recorded source/provisioning work, not a production launch.

- [x] **D01 · C — Original overhaul inventory recorded.** All reported component families and shared-shell requests are retained in the intake and recovery documents.
- [x] **D02 · C — Recovery implementation recorded.** The September 11 report records all 55 intake rows, twelve Hero Button concepts, Bento and shared-shell fixes. Owner aesthetic approval is explicitly separate.
- [x] **D03 · C — Earlier homepage restored.** Release commit `cc971887e4e6825bd5568815cb76ebf22c602e04` restores the four earlier homepage files while retaining other release work. The rejected design remains on `chore/homepage-rework-preserved`.
- [x] **D04 · C — Local rollback checks recorded.** Static build/type checks, lint and targeted homepage/browser checks passed. These do not replace the incomplete full GitHub release run.
- [x] **D05 · C — Deployment and recovery implementation prepared.** Environment-aware build/deployment configuration, operating procedures and local reporting/hosting tests exist; live exercises remain below.
- [x] **D06 · B — GitHub protections configured.** Main requires PR checks; beta/production environments exist; production requires `luv-jeri` approval, including permitted owner self-approval. Do not bypass them.
- [x] **D07 · B — Isolated beta storage and feedback repository created.** Private beta repository, separate D1 database and private media bucket are provisioned. They are not proof of an operational beta site.
- [x] **D08 · B — Email foundations provisioned.** Resend verified `cojeev.com`; protected environment bundles contain sending credentials; `hello@cojeev.com` forwarding is configured. Actual inbox receipt is unverified.
- [x] **D09 · B — PostHog EU project created.** Free project prepared with automatic capture and replay disabled. Real event arrival and final privacy behavior remain unverified.
- [x] **D10 · B — Private recovery resources created.** Backup bucket with bounded expiry and isolated restore database exist. No successful restore drill is claimed.
- [x] **D11 · C — Audit and marketing preparation completed.** Read-only performance/Ponytail/privacy/accessibility findings and creator research are available. Corrections and outreach are not complete.
- [x] **D12 · C — Direct-download infrastructure exists.** Registry generation and previous clean-consumer checks are recorded. Current-release installation and public directory registration are separate gates.

### Evidence index

These links intentionally point to the release revision, because the original local checkout does not contain all release documents.

- [Original PR #2](https://github.com/luv-jeri/cojeev-ui/pull/2) — historical discussion, now closed after its source branch was renamed to `chore/production-beta`; commit `cc971887e4e6825bd5568815cb76ebf22c602e04` is preserved. Replacement pending.
- [Cancelled required check](https://github.com/luv-jeri/cojeev-ui/actions/runs/34666264387/job/103478640491) — beta and production jobs were skipped.
- [Original intake](https://github.com/luv-jeri/cojeev-ui/blob/cc971887e4e6825bd5568815cb76ebf22c602e04/docs/quality/2026-09-10-library-overhaul-intake.md), [recovery delivery](https://github.com/luv-jeri/cojeev-ui/blob/cc971887e4e6825bd5568815cb76ebf22c602e04/docs/quality/2026-09-11-recovery-delivery.md), [release verification](https://github.com/luv-jeri/cojeev-ui/blob/cc971887e4e6825bd5568815cb76ebf22c602e04/docs/quality/2026-09-11-release-verification.md).
- [Homepage rollback](https://github.com/luv-jeri/cojeev-ui/blob/cc971887e4e6825bd5568815cb76ebf22c602e04/docs/production/2026-09-12-homepage-rollback.md), [preserved rejected design](https://github.com/luv-jeri/cojeev-ui/tree/chore/homepage-rework-preserved).
- [Provisioning record](https://github.com/luv-jeri/cojeev-ui/blob/cc971887e4e6825bd5568815cb76ebf22c602e04/docs/production/provisioning-status.md), [operations runbook](https://github.com/luv-jeri/cojeev-ui/blob/cc971887e4e6825bd5568815cb76ebf22c602e04/docs/production/OPERATIONS.md), [local release evidence](https://github.com/luv-jeri/cojeev-ui/blob/cc971887e4e6825bd5568815cb76ebf22c602e04/docs/production/2026-09-12-local-release-verification.md).
- [Marketing start here](https://github.com/luv-jeri/cojeev-ui/blob/cc971887e4e6825bd5568815cb76ebf22c602e04/docs/marketing/START-HERE.md), [creator shortlist](https://github.com/luv-jeri/cojeev-ui/blob/cc971887e4e6825bd5568815cb76ebf22c602e04/docs/marketing/2026-09-12-creator-shortlist.md), [outreach research](https://github.com/luv-jeri/cojeev-ui/blob/cc971887e4e6825bd5568815cb76ebf22c602e04/docs/marketing/2026-09-12-launch-outreach-research.md).

## A. Decisions and owner-assisted prerequisites

- [ ] **A01 · S — Confirm business facts.** Record the actual operator/legal name, country/state of operation, appropriate public business/contact details, intended countries served, whether paid services are sold, and intended age audience. Done when policies can be written without invented facts.
- [ ] **A02 · B — Set launch blockers explicitly.** Classify the findings in sections E–H as required before launch or an expressly accepted, bounded follow-up. Do not defer exposed private data, broken core journeys, missing required notices or unusable controls merely to launch faster.
- [ ] **A03 · S — Make account access available.** Keep the Mac unlocked and the signed-in browser accessible; complete security-key, email and account confirmations when prompted. Last account automation returned `User unavailable`; login alone is not a deployment credential.
- [ ] **A04 · B — Confirm release design.** Approve the new homepage after review, or explicitly choose the restored homepage for this release. Keep the rejected version isolated.
- [ ] **A05 · S/L — Resolve applicable-law questions.** Use A01 and actual data flows to determine Indian requirements and any EU/UK or other targeting/monitoring obligations. Review current commencement dates and rules; a worldwide-accessible site does not by itself settle jurisdiction. Record advice and remaining risks, not a blanket compliance guarantee.

## B. CI/CD and the release PR

**Starting blocker, before Phase 1:** the required `Verify release` job ran into its 90-minute budget. The recorded run reached 132 of 172 catalogue entries without recorded failures before cancellation; later checks did not execute. Partial progress is not a passing gate.

**Phase 1 update, 12 September:** bounded parallelism subsequently completed all 172 entries / 1,032 layouts and all nine motion presets in run `34688330949`, but enabled analytics failed on a removed homepage Slider fixture. A second run (`34688474452`) exposed three short-lived interaction observation failures. B02-1 and B02-2 track these separately. No complete required run or accepted release artifact exists yet; earlier partial evidence is retained, not presented as a pass.

**Implementation locations:** `.github/workflows/verify.yml`, `scripts/run-production-gate.mjs`, release scripts and `docs/production/OPERATIONS.md` in the release checkout.

**Owner correction:** small checkpoint PRs must use affected checks, not repeat all 172 components. Keep full coverage for the combined release candidate, shared/uncertain-impact changes and main promotion. Plain `feat/`, `fix/` and `chore/` branch names are required. PRs #2–#8 were closed automatically by source-branch renaming; their commits and discussions are preserved and linked replacement PRs are pending. None of these closures was a merge.

- [ ] **B01 · C — Repair CI runtime and scope.** Retain bounded catalogue partitions and add conservative affected-check selection for small checkpoints. Preserve exact full-release coverage, source provenance and all later checks. Scoped code acceptance permits the repair PR to merge; this runtime checkpoint closes when the combined full run finishes within its budget without hiding failures.
- [ ] **B02 · C — Verify the complete final-source gate.** Lint, type checking, unit tests, reporting/hosting tests, code-example checks, catalogue/browser/motion tests, reporting/analytics browser checks and clean-consumer install/build must all finish. Save sanitized evidence from the exact final revision.
  - [ ] **B02-1 · C — Repair the stale landing analytics fixture.** Run34688330949 passed the full catalogue/motion and later browser stages, then waited for a Slider no longer present on the restored homepage. Reproduce the failure and test an actual featured landing component without removing impression, deduplication, copy or privacy checks. Use its own `fix(ci)` PR; keep homepage and analytics product code unchanged unless a distinct defect is separately evidenced.
  - [ ] **B02-2 · C — Observe short-lived interactions reliably.** Run34688474452 missed Agent Chat cancellation, Guided Pointer arrival and Text Reveal replay states. Source and browser diagnosis must distinguish a product failure from late test observation. Preserve real pointer/keyboard actions, visible-frame and completion assertions; prove the correction with delayed-driver reproduction and negative controls. Use a separate `fix(ci)` PR without changing product timing or weakening checks.
- [ ] **B03 · C — Verify release safety controls.** Confirm pinned Node/dependencies/actions, no deployment secrets for fork PRs, per-environment serialization, no independent automatic GitHub Pages publication, and preserved manual Pages compatibility.
  - [ ] **B03-1 · C — Pin the consumer installer.** Phase 1 inspection found two `shadcn@latest` invocations in `scripts/verify-install.mjs`. Use the repository's reviewed exact installer version, keep the fresh consumer outside the repo, and verify its real install/build. Separate `fix(ci)` PR; do not change component code or silently upgrade dependencies.
- [ ] **B04 · C — Verify artifact identity and separation.** Record commit, beta/prod artifact hashes and build configuration. Reject localhost URLs, wrong base paths and cross-environment API/download dependencies. Do not rebuild an arbitrary newer commit after approval.
- [ ] **B05 · B — Merge the release PR normally.** Recheck the successor to original PR #2: exact head, diff, conversations and required checks; confirm beta prerequisites are ready. Merge only the reviewed head with protections intact. Record the merge commit; do not call this a production deployment.
- [ ] **B06 · C — Exercise a failed release safely.** Demonstrate that a failing gate or wrong artifact blocks promotion; keep test failures out of production. Record the negative test as well as the successful release.

## C. Hosting, credentials and live services

| Environment | Website | Reporting API | Data/notifications |
| --- | --- | --- | --- |
| Production | `https://000h.cojeev.com` | `https://feedback.cojeev.com` | Existing production data; safe public issues and private inbox |
| Beta | `https://beta.000h.cojeev.com` | `https://feedback-beta.cojeev.com` | Isolated data, private beta issue repository and approved tester mail only |

Last live probes: older production homepage returned 200; website/API `/health` returned 404; both beta hostnames failed DNS resolution. Recheck before acting.

- [ ] **C01 · B — Finish scoped GitHub credentials.** Provision issue-creation/synchronisation credentials for the correct production and private beta repositories, with the minimum required permissions and expiry/rotation ownership. Keep beta incapable of modifying production issues.
- [ ] **C02 · B — Finish Cloudflare CI credentials and server secrets.** Add only required deployment/health/webhook/auth values through protected secrets. Preserve the existing Resend bundles; do not replace them with incomplete values or rotate keys merely because setup buffers are gone.
- [ ] **C03 · B — Configure isolated Turnstile.** Create the beta widget with exact allowed hosts and separate key/secret; verify production bindings. Test valid challenges, failure, expiry and retry in the real browser.
- [ ] **C04 · C — Deploy isolated beta services.** Bind only beta D1/media/secrets/repository, apply reviewed migrations and deploy beta website/API Workers. Never copy production reports into beta.
- [ ] **C05 · C — Connect domains and verify HTTPS.** Configure the exact beta website and API hostnames, validate DNS and certificates, and preserve existing production DNS/mail records.
- [ ] **C06 · C — Verify hosting behavior.** Check deep links, assets, search, previews, downloads, canonical URLs, real missing-page 404s, security headers, correct HTML/immutable-asset caching and private media access. Exercise CSP with Turnstile and enabled analytics, not only an inert local page.
- [ ] **C07 · C — Verify beta/private-page exclusion.** Beta indicator, `noindex` response/page directives, sitemap exclusion and suitable crawler rules must agree. Private maintainer routes require authentication regardless of indexing rules; keep them out of analytics. Do not assume robots blocking alone removes indexed URLs.
- [ ] **C08 · C — Verify receipt-first reports.** Save and return the report receipt before attempting email/GitHub. Exercise duplicate submission, interrupted attachments, retries and provider downtime without losing or duplicating the report.
- [ ] **C09 · C — Verify private/public boundaries.** Full descriptions, contact details, media and diagnostics stay in the authenticated inbox. Public issues use safe titles/summaries and an opaque reference, never credentials or private content. Test unauthorised report/media access and redaction.
- [ ] **C10 · C — Verify GitHub synchronisation.** Valid signed webhooks update the intended report; invalid/replayed events are rejected; duplicate issue creation is prevented; explicit Released status controls completion notification.
- [ ] **C11 · C — Hold historical deliveries.** Inventory pre-activation jobs privately and retain review holds. Get explicit selection/approval before publishing or emailing any old report.
- [ ] **C12 · B — Activate verified email webhooks.** Verify signatures and event replay protection. Team-wide events are approved, but discard unrelated provider message IDs immediately. Do not infer ownership from message wording or retain unrelated messages.
- [ ] **C13 · C — Verify email queue behavior.** Distinguish queued, provider-accepted, delivered, bounced and failed states; use stable job idempotency; hold uncertain sends beyond the provider deduplication window; retain queued mail when free allowance is exhausted. Check current quotas without upgrading.
- [ ] **C14 · C — Enforce beta notification isolation.** Restrict recipient to the approved tester inbox, enforce a small daily allowance server-side, and visibly label beta notification behavior. Arbitrary supplied emails must not receive beta messages.
- [ ] **C15 · B — Test real contact delivery.** Send a labelled test through the intended journey; confirm acknowledgement, reply-to `hello@cojeev.com`, forwarding to `unread.fyi@gmail.com`, and completion mail in the actual inbox. Only then enable the public hiring/contact link.
- [ ] **C16 · B — Verify analytics in PostHog.** After section E's privacy decision, observe permitted visit/component/interaction/copy events with release/environment identifiers. Confirm beta excluded from production dashboards and privacy controls stop capture. Visits, copies, download requests and successful installs must remain distinct metrics.

## D. Recovery, monitoring and production promotion

- [ ] **D13 · C — Back up before production migrations.** Create a private D1 snapshot, record its integrity and revision, verify bounded retention, and keep reports/backups out of public workflow artifacts.
- [ ] **D14 · C — Perform an isolated restore drill.** Restore into the dedicated scratch database, verify expected schema/data and application reads, then remove only approved disposable test data. Never test restoration over production.
- [ ] **D15 · C — Exercise code rollback.** Verify website and reporting API version rollback in a safe environment. Document that code rollback does not restore database/media contents; use backward-compatible migrations and a separate data recovery procedure.
- [ ] **D16 · C — Enable health monitoring after authentication works.** Public health/release manifest must identify the deployed release without leaking secrets. Authenticated checks cover stalled queues/quota limits. Prove unauthorized diagnostics are denied.
- [ ] **D17 · B — Confirm independent alerts.** Trigger a safe availability/delivery-health failure and verify GitHub notification arrival in the chosen inbox, independently of Resend. Do not enable a broken scheduled monitor or count an alert issue as inbox delivery.
- [ ] **D18 · B — Accept beta end to end.** Fresh consumer installation, browser report with attachment, correct private inbox/repository, email receipt, analytics controls and failure paths all pass on actual beta domains. Record source, hashes and evidence.
- [ ] **D19 · S — Approve production promotion.** Review beta evidence, residual-risk decisions, backup/rollback proof and the exact release manifest in the protected production environment.
- [ ] **D20 · C — Deploy and verify production.** Promote the approved revision and correct production artifacts; verify HTTPS/assets/deep links/search/previews/downloads/headers/404s and release identity.
- [ ] **D21 · B — Finish one labelled production smoke journey.** Submit an explicitly labelled test report; confirm storage, private inbox, safe public issue, actual acknowledgement and Released notification. Record agreed treatment of the synthetic report; do not silently erase production records.

## E. Privacy, policies, consent and security

**Audit baseline:** `/privacy` exists but focuses on analytics. Terms, cookie and refund routes were not found. Configured analytics currently starts without an explicit prior opt-in unless a privacy signal/opt-out disables it. The following are open findings, not completed fixes or a legal opinion.

**Implementation locations:** `app/privacy/page.tsx`, `lib/analytics/client.ts`, `components/reporting/reporting-widget.tsx`, `components/reporting/turnstile.tsx`, `lib/reporting/draft.ts`, `lib/reporting/contracts.ts`, `workers/reporting/src/lifecycle.ts` and the actual release configuration.

- [ ] **E01 · B/L — Complete the processing inventory.** Document each collected field, diagnostic, draft, cookie/storage key and third-party request; purpose, recipient, lawful basis, location, retention and deletion owner. Include Cloudflare, GitHub, Resend, PostHog and the destination inbox.
- [ ] **E02 · B/L — Expand the privacy notice.** Add confirmed operator/contact details, forms/uploads/diagnostics, purposes, disclosures, public issue visibility, retention, rights/contact process and relevant transfers/children information. Verify published promises against actual behavior.
- [ ] **E03 · B/L — Resolve cookie/storage consent.** Audit cookies, IndexedDB, local storage and tracking under the applicable jurisdictions. Add a clear cookie/storage policy; implement prior opt-in where required, easy rejection/withdrawal and persistent choices. Do not assume cookieless analytics is automatically exempt. Keep optional analytics off until its basis and behavior are verified.
- [ ] **E04 · C — Verify analytics minimisation.** Keep replay/autocapture/form content/private-report tracking disabled; honor GPC/DNT and chosen consent controls; verify network behavior before and after choice/withdrawal. Avoid claiming absolute anonymity when providers receive network metadata.
- [ ] **E05 · B/L — Add appropriate terms and refund information.** Separate free MIT-licensed downloads from paid consulting or future sales. If no payment is taken, record why a purchase refund policy is not applicable rather than inventing a commercial contract. Publish required terms/refund details once the actual offering is confirmed.
- [ ] **E06 · C/L — Improve form notice and agreement.** Link the notice next to submission; explain private storage versus safe public issues before sending. Capture consent/version evidence when consent is the chosen basis; do not bundle marketing permission into a required service action or add meaningless blanket checkboxes.
- [ ] **E07 · B — Minimise required data.** Decide whether every report truly needs an email address; document or remove the requirement where unnecessary. Keep optional uploads/diagnostics obvious and reviewable, without collecting form contents, authentication headers or request bodies.
- [ ] **E08 · C — Review diagnostic timing and draft expiry.** Current diagnostics buffer before the report opens; drafts may persist locally without a TTL. Reduce collection where possible, disclose it, add appropriate expiry/clear controls and a shared-device warning; preserve useful unsent drafts deliberately.
- [ ] **E09 · C/L — Reconcile all retention.** Recheck implemented 30-day media/diagnostic and 180-day contact/description cleanup, plus contact hashes, public titles, email event/attempt records, provider logs, backups and inbox retention. Give each a justified period and test cleanup without exposing real data.
- [ ] **E10 · B/L — Establish a rights and incident process.** Document how to verify and handle access/correction/deletion/objection requests, public GitHub constraints, incidents and credential rotation. Test privately; no new public deletion endpoint is required if an authenticated manual process suffices.
- [ ] **E11 · C — Audit embeds and security in enabled production mode.** Check fonts, images, YouTube/other embeds, Turnstile and all network origins. Prefer consent-gated or click-to-load optional embeds as appropriate; add required provider notices. Test authentication, media isolation, upload limits/type validation and rate limiting.

## F. Accessibility and truthful presentation

**Audit baseline:** eight sampled route/viewport cases returned zero automated violations, but numerous contrast checks were inconclusive. This is not whole-site WCAG certification. Sampled images had alt attributes; full meaningful-alt and asset review remain open.

- [ ] **F01 · C — Manually verify contrast.** Check text, controls, selected/focus/error states and animated surfaces in both themes and representative palettes. Resolve inconclusive automated cases; save measured ratios against the applicable criteria.
- [ ] **F02 · C — Complete keyboard and assistive-technology journeys.** Navigate menus, search, forms, validation, choice controls, dialogs and report review with keyboard and a screen reader; verify labels, focus order/trap/return and status announcements.
- [ ] **F03 · B — Finish real native-browser checks.** Test the macOS native-select popup using keys, including disabled options, and actual background-tab motion suspension. The prior native listbox and simulated hidden-state checks do not replace these.
- [ ] **F04 · C — Verify zoom, reflow and alternatives.** Test 200%/400% zoom, narrow screens, long content, touch and forced-colour modes; give resize/drag-only operations keyboard alternatives and clear blocked-movement feedback. Preserve accessible scrollbar fallbacks.
- [ ] **F05 · C — Check content and action clarity.** Meaningful alt text for informative images; decorative artwork hidden appropriately; descriptive buttons and links; form help/errors bound to fields; no icon-only essential action without a usable name.
- [ ] **F06 · B — Remove or substantiate claims.** Review the “aim to build within 36 hours” message and all component counts, performance statements, reviews and adoption claims. No fake testimonials were found in the sampled marketing review; verify the final content and remove unsupported promises.
- [ ] **F07 · C — Recheck the final release pages.** Repeat automated scans and manual journeys after visual/privacy changes. Record coverage and limitations; do not claim blanket AA conformance from an automated score.

## G. Performance and Ponytail simplicity review

**Measured local baseline, not public field performance:** sampled routes loaded roughly 2.0–2.1 MB of decoded JavaScript over the first two seconds, including prefetch. Global CSS was approximately 1.14 MB decoded. A Button page main-thread task lasted about 412 ms. These are not compressed transfer sizes or proof that every loaded byte is unnecessary.

- [ ] **G01 · C — Capture a repeatable baseline.** Measure homepage/docs/privacy/reporting under representative mobile CPU/network throttling, with prefetch separated. Record transfer and decoded sizes, LCP/CLS and interaction traces; agree performance budgets before optimizing.
- [ ] **G02 · C — Reduce global CSS where supported by measurement.** Review `app/globals.css` and globally imported component styles. Route-split heavy styles while preserving CSS layers, overlays, themes and dynamic examples; compare before/after bundles and visuals.
- [ ] **G03 · C — Avoid shipping the entire icon library for a few controls.** Trace `registry/cojeev/ui/icon.tsx` and icon-data imports; test a small common-icon path and lazy studio/catalogue loading while keeping all public names and animations available.
- [ ] **G04 · C — Defer expensive optional UI.** Review the globally mounted reporting widget and heavy route prefetch. Keep a fast accessible launcher; load drawing/review tools on intent without losing drafts, receipt recovery or keyboard access.
- [ ] **G05 · C — Profile interaction costs.** Measure pointer movement, scroll, morph observers and Bento resizing on slower devices. Fix demonstrated expensive work without reintroducing unstable hit areas or removing requested motion indiscriminately.
- [ ] **G06 · C — Reduce install payload carefully.** The shared `public/r/cojeev.json` payload was approximately 1.27 MB with 69 files. Review unconditional helper inclusion in `scripts/build-registry.mjs`; derive only necessary dependencies and prove each clean installation still builds.
- [ ] **G07 · C — Apply the confirmed small Ponytail cleanup if approved.** Remove unused `components/landing/launch-faq.tsx` and only its exclusive CSS; remove unused `deleteDraft` from `lib/reporting/draft.ts`. Preserve `saveDraft`, `loadDraft`, shared CSS, public APIs and safety checks. The confirmed opportunity was about 19 lines, not a justification for a rewrite.
- [ ] **G08 · C — Re-measure and gate regressions.** Compare the same routes/devices/build mode, verify visuals and interactions, and record the actual improvement. Do not present localhost timing as production Core Web Vitals or claim unused-code percentages from failed coverage collection.

## H. Design acceptance and every requested component

The recovery report records implementation for the intake. **Every checkbox below is final acceptance still to close**, not a claim that implementation is absent. If behavior is correct and Sanjay accepts the design, check it without redesigning again. If rejected, preserve the useful API/variants and repair the named defect.

For each item: open its actual docs route, try every meaningful approach, inspect desktop/mobile and both themes, test reduced/quiet motion, keyboard/focus, rapid reversals and empty/disabled/long content, then confirm configured copy and downloads. Record a screenshot or clip plus behavior evidence and Sanjay's visual decision. Colour, size and shape changes alone do not count as distinct problem-solving variants.

### Shared shell and hero features

- [ ] **H01 · B — Homepage rework.** Revisit A's footer, B's browser treatment and C's middle/profile-assembly direction; approve a visible prototype before implementation. Keep it short, calm and authored, with tasteful animated backgrounds, useful featured components and a strong contact ending. Remove rejected sparkles/crowding; verify the actual assembly animation, not just a still image.
- [ ] **H02 · B — Documentation sidebar.** Default open; calm hierarchy, readable categories, useful hover/focus previews and stable links. Compact mode keeps understandable search/settings, reversible readable index and prominent Work with me/GitHub without competing decoration.
- [ ] **H03 · B — Shared workbench.** Intentional responsive toolbar, working depth-background choices, discoverable motion/radius settings, state preservation, formatted/highlighted code and copy of the selected configuration; readable API tables.
- [ ] **H04 · B — Shared buttons, icons and pointer stability.** Check related-component links and all sidebar/menu click targets use the intended shared controls. Reproduce movement across edges in Chrome as well as the in-app browser; confirm ghost hover, theme-icon seam, cursor flicker and overlapping panel/tab seams stay fixed.
- [ ] **H05 · B — Hero Button collection.** Review the twelve recorded concepts against the request for 10–15 genuinely different hero buttons, not repeated sizes/colours. Confirm shared morphing, clear actions and quiet-mode behavior.
- [ ] **H06 · B — Command and Fumadocs search.** Sidebar click and shortcut open the authored Command surface; actual Fumadocs results, keyboard selection, empty/loading states and navigation work without broken layout or moving hit targets.
- [ ] **H07 · B — Scrollbars and discovery.** Recheck all owned overflow regions, including portals, tables and reading examples, both axes and usable rail thickness. Keep one scroll owner and document native browser/forced-colour exceptions. Put Icon/Shape studios near the top, group Charts and retain compatible table routes.
- [ ] **H08 · B — Make it yours and Request board.** Verify clear setup steps, customisation, top-level Request board link, useful request states and truthful availability/privacy. Do not submit a real report just to take a screenshot.

### Forms and choices — all original rows

- [ ] **V01 · B — Calendar:** single/range/multiple selection; visible moving selection contour; disabled/outside-day/month behavior.
- [ ] **V02 · B — Date Picker:** shared field appearance; single day, interval and presets; keyboard and validation.
- [ ] **V03 · B — Input:** genuinely different Contour/Editorial/Inset compositions with readable labels, focus and errors.
- [ ] **V04 · B — Field:** clearly explain label/control/help/error composition versus Input; useful stacked/inline/integrated arrangements.
- [ ] **V05 · B — Input Group:** affixes, quantity/unit and composer layouts; actions and text remain aligned.
- [ ] **V06 · B — Label:** correct associations, required/optional/help semantics and consistent typography.
- [ ] **V07 · B — Multi-select:** tokens, summary and searchable checklist; removal and overflow remain usable.
- [ ] **V08 · B — Native Select:** consistent surface plus actual native popup operation; documented platform exception.
- [ ] **V09 · B — Number Input:** stepper, quantity and scrub approaches; bounds, precision and keyboard alternative.
- [ ] **V10 · B — Select:** useful choice compositions, coherent radius, keyboard operation and custom scrolling.
- [ ] **V11 · B — Textarea:** writing/composer/limited-response approaches; resizing, text selection and owned scrolling.
- [ ] **V12 · B — Checkbox:** all six legacy shapes including round/star and selected-mark options discoverable; row/card/chip clarity; no decorative corners pretending to be functional settings.
- [ ] **V13 · B — Radio Group:** retained shapes/marks; understandable one-of-many list/card/segmented choices and visible selected value.
- [ ] **V14 · B — Questionnaire:** stacked/journey/worksheet approaches; retained answers, clear validation and responsive headings.
- [ ] **V15 · B — Option Wheel:** arc/reel/compact approaches; real trackpad/wheel changes, page-scroll release at boundaries and keyboard control.
- [ ] **V16 · B — Slider:** named Rubber variant visibly thick near zero and thinner as stretched; range/vertical/marks retained; steady thumb and quiet-mode value geometry.
- [ ] **V17 · B — Switch:** genuinely different tactile/labelled/state-rail approaches and an unmistakable state without colour alone.

### Navigation and progression

- [ ] **V18 · B — Breadcrumb:** quiet, overflow and contextual navigation with real destinations.
- [ ] **V19 · B — Carousel:** shelf/story/index approaches; buttons, keys, touch and focus remain useful.
- [ ] **V20 · B — Navigation Menu:** popup/layout/focus repaired; compact, index and rich preview approaches.
- [ ] **V21 · B — Pagination:** number/previous-next/jump approaches; repeated changes without colour flicker.
- [ ] **V22 · B — Reading Trail:** spine/bookmark/overview, retained scroll and usable organic scrollbar.
- [ ] **V23 · B — Sidebar component:** folio/index/drawer compositions, distinct from the docs shell; focus and selected destination retained.
- [ ] **V24 · B — Stepper:** journey/current-total/review approaches; correct progression and completion semantics.
- [ ] **V25 · B — Tabs:** meaningful navigation styles; attached sections and rapid selection/reversal without broken seams or content motion.
- [ ] **V26 · B — Toggle:** clear tool/bookmark/preference interactions; selection paint and native targets remain stable.

### Feedback

- [ ] **V27 · B — Alert:** authored note/banner/actionable dispatch, not only status colours.
- [ ] **V28 · B — Progress:** clear determinate/unknown states and line/segment/orbit controls with accurate geometry.
- [ ] **V29 · B — Skeleton:** reading/profile/board layouts; matching content geometry and quiet-safe effects.
- [ ] **V30 · B — Loading / Spinner:** distinct mechanisms with working pause/finish and honest busy state.
- [ ] **V31 · B — Toast:** non-stretched trigger, aligned title/body/actions and distinct useful notification compositions.
- [ ] **V32 · B — Activity Feed:** polish hierarchy, timestamps and update continuity only; do not add unwanted variants.

### Data, icons and shapes

- [ ] **V33 · B — Charts introduction:** coherent category and explanation of frame/series/legend/tooltip/table composition.
- [ ] **V34 · B — Area Chart:** trend/composition/summary, retained step/stacked modes and Cojeev dataset picker.
- [ ] **V35 · B — Bar Chart:** comparison/contribution/ranking with accurate scales and values.
- [ ] **V36 · B — Line Chart:** trend/step/compact reading; no misleading connection across missing data.
- [ ] **V37 · B — Pie Chart:** share/ring/labelled contributions with meaningful denominators.
- [ ] **V38 · B — Radar Chart:** profile comparison and readable companion values without distorted scales.
- [ ] **V39 · B — Radial Chart:** goal/concentric/gauge approaches with honest denominators.
- [ ] **V40 · B — Chart Tooltip:** compare/summary/ranked reading, keyboard inspection and edge placement.
- [ ] **V41 · B — Avatar:** portrait/identity/group compositions; fallback, loading, error and edit behavior.
- [ ] **V42 · B — Badge:** stamp/tag/counter approaches with working radius and correct non-interactive semantics.
- [ ] **V43 · B — Table + Data Table:** one discoverable guide, retained primitives and composed features; paging/sorting/filtering without flicker and readable owned scrolling.
- [ ] **V44 · B — Hover Card:** identity/context/media detail with keyboard/touch access to equivalent content.
- [ ] **V45 · B — Icon + Animated Icon:** hero studio, foreground/accent controls visibly work, search/timing/replay/copy and responsive layout.
- [ ] **V46 · B — Item:** distinct ledger/cover/detail layouts, working actions and no invalid nested buttons.
- [ ] **V47 · B — Milestone Path:** journey/sequence/review with correct status and usable horizontal overflow.
- [ ] **V48 · B — Shape + Shape Artwork:** one reusable studio with retained silhouettes, colour/layers, animation/replay/pause and truthful SVG/React export. Keep distinct 3D/effect primitives rather than deleting them as duplicates.
- [ ] **V49 · B — Tooltip:** callout/shortcut/annotation with legible text, stable targets and correct collision/focus behavior.

### Layout and disclosure

- [ ] **V50 · B — Accordion:** reopen Sanjay's reported dissatisfaction; review compact, connected and editorial approaches individually, including actual opening/closing and rapid reversal. Do not close on screenshot or count alone.
- [ ] **V51 · B — Bento, superseding Aspect Ratio redesign:** templates/randomise/custom rows/columns, snapping/gap behavior, Classic/Interlock, immediate resize preview, stable canvas and grips, blocked-action feedback, Undo/Redo and keyboard alternatives. Keep the old aspect-ratio primitive/route compatible.
- [ ] **V52 · B — Card:** distinct editorial/actionable/layered compositions, clean selection and responsive content; preserve existing variants.
- [ ] **V53 · B — Collapsible:** useful inline/attached/summary disclosure, reliable motion and safe focus when folding.
- [ ] **V54 · B — Dialog:** confirmation/editor/exhibit compositions with proper dismissal, focus trap/return and long-content scroll.
- [ ] **V55 · B — Linear Modal:** compare actual open/close and rapid reversal with the original reference; card/image/title continuity, centered/gallery approaches and quiet-mode readability.

## I. README, assets and redistribution rights

- [ ] **I01 · B — Finish the README after visual approval.** Use the approved brand and actual final screenshots, concise installation, best examples, docs/contact links, contribution instructions and truthful status. Remove imagery from the rejected homepage. GitHub Markdown cannot reproduce the live site's JavaScript interactions; use restrained accessible static/SVG/GIF/video-link fallbacks instead.
- [ ] **I02 · C/L — Complete the asset/licence ledger.** Record provenance and redistribution rights for images, fonts, illustrations, icons, adapted components and reference material. Keep existing `LICENCE`, font notices and upstream MIT attributions; check brand/trademark usage separately.
- [ ] **I03 · C — Include required notices in downloads.** Sampled component/shared payloads did not include the project's MIT notice. Correct registry generation so recipients receive applicable notices, then test clean consumer output and upstream attribution.
- [ ] **I04 · C — Reconcile public claims and repository presentation.** Verify final catalogue counts, live links, GitHub description/topics, contribution/reporting/security guidance and examples. Never imply shadcn endorsement or acceptance before it exists.

## J. Search discovery and indexing

These tasks begin after the production page/content is approved and live. Keep beta and private/report-token URLs out of discovery.

- [ ] **J01 · C — Verify production search readiness.** Crawl public routes for titles/descriptions, canonical URLs, useful headings, internal links, robots directives, sitemap contents, redirects and real 404 responses. Check social-preview images and only truthful structured data.
- [ ] **J02 · B — Verify Google Search Console ownership.** Use the appropriate property for the production site; add only the required verification record and preserve DNS/mail settings. Record the verified property and account owner without publishing credentials.
- [ ] **J03 · B — Submit the production sitemap.** Inspect the homepage and representative docs URLs, request indexing where appropriate, and record submission dates/results. Google recommends sitemaps for many URLs and URL Inspection for individual pages; a request does not guarantee indexing. [Google guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl).
- [ ] **J04 · B — Complete Bing discovery if approved.** Verify the production property using its current official procedure, submit the validated sitemap and record results. This is a separate account action, not an automatic consequence of Google verification.
- [ ] **J05 · C — Follow up on index coverage.** Review crawl errors, excluded pages, selected canonicals and actual indexed URLs. Fix genuine errors and record indexing separately from submission; do not promise search position or repeatedly submit the same page to force ranking.

## K. shadcn registry and other listings

Direct component URLs working is not the same as a namespace being accepted into the directory. This phase is now on the checklist; no submission has been made by creating this document.

- [ ] **K01 · B — Choose and approve the namespace.** Check current availability, branding and upstream requirements; record the exact requested name. Do not assume an earlier proposed namespace is reserved or that a numeric name guarantees placement.
- [ ] **K02 · C — Verify public registry eligibility.** Validate the current production catalogue/index, item schemas, HTTPS URLs, metadata, licence notices and dependency closures against the official requirements. Distinguish catalogue metadata from install payloads; do not remove required payload content based on index-only rules.
- [ ] **K03 · C — Test real consumer installation from production.** Install/build representative simple, motion-heavy, form and composed components in a clean app. Confirm files come from production only, no private/local paths leak, and docs show correct commands.
- [ ] **K04 · B — Prepare and approve the upstream submission.** Follow the current official process: update the directory entry, run its validator and prepare the PR. Review exact metadata/logo/homepage/registry URL and Sanjay's approval before posting. [Official registry submission guide](https://ui.shadcn.com/docs/registry/registry-index).
- [ ] **K05 · C — Submit and handle review.** Record the upstream PR URL, date and requested changes; keep status Submitted until the maintainers actually accept it. Do not mark acceptance when a PR is merely opened.
- [ ] **K06 · C — Verify accepted namespace discovery.** After acceptance, test actual CLI lookup/install and directory links, record listing evidence and monitor registry health. Acceptance and placement are controlled by maintainers.
- [ ] **K07 · B — Select other relevant listings.** Evaluate 21st.dev and suitable UI/open-source directories individually for fit, licence and submission rules; propose a short list, then submit only approved entries. Do not register unrelated accounts or buy placement.

## L. Marketing — research to actual outcomes

Existing research is a starting point, not completed outreach. Creator/video metadata was checked; do not imply every recommended video was fully watched or every email remains current.

- [ ] **L01 · C — Revalidate the shortlist.** Review the linked reference libraries and associated channels, watch relevant video sections, confirm topic fit and public business contact routes. Record channel/video URL, why our component helps, current public email/source or contact page, and any contact restrictions. Do not guess private addresses.
- [ ] **L02 · B — Select a small launch audience.** Prioritise creators and communities interested in motion, accessible React components, shape/icon tools and Bento. Separate product feedback requests, hiring leads and promotional outreach.
- [ ] **L03 · C — Prepare a truthful launch kit.** Final production link, repository, short description, actual installation example, a few strong screenshots and a short component demonstration. Use accessible captions/alt text and clearly labelled sample data; no fake testimonials or unsupported performance/adoption claims.
- [ ] **L04 · B — Approve personalised creator pitches.** Draft a short relevant message for each chosen recipient, with transparent maker identity and useful demo context. Sanjay approves exact recipient and text before sending; honour opt-outs and applicable outreach rules.
- [ ] **L05 · B — Publish approved YouTube comments selectively.** Choose genuinely relevant videos, explain useful context rather than posting repeated advertisements, disclose creator affiliation, and follow channel/platform rules. Record actual comment links; do not mass-post through the account.
- [ ] **L06 · B — Publish the approved LinkedIn launch.** Review the post and demo on desktop/mobile, confirm destinations and attribution, then publish through the chosen account. Record the post URL and replies; do not privately message unrelated people without approved targeting/text.
- [ ] **L07 · B — Evaluate community launches individually.** Consider appropriate Show HN, Product Hunt, Reddit or developer communities only after checking current eligibility/self-promotion rules and choosing timing. Submit only where approved; each has its own checklist/result, not an assumed bulk registration.
- [ ] **L08 · C — Measure without overclaiming.** Use permitted campaign tags and environment-filtered analytics after privacy gates pass. Keep impressions/referrals/visits/copies/download requests/verified installations/hiring enquiries distinct. Do not place email addresses or private report IDs in campaign URLs.
- [ ] **L09 · B — Follow up thoughtfully.** Maintain recipient, approval, sent date, message link, reply, objection and agreed next action. Use a limited owner-approved follow-up cadence; stop on rejection/opt-out and do not create automated outreach from this document alone.
- [ ] **L10 · B — Review launch outcomes.** At one week and one month, review useful traffic, installation feedback, errors, creator responses and hiring enquiries; choose the next improvements based on evidence, not vanity counts.

## M. Post-launch ownership and final close-out

- [ ] **M01 · B — Assign ongoing owners.** Record who receives health alerts, reviews reports/public issues, handles privacy requests, rotates credentials, checks domain renewals and watches free-tier limits.
- [ ] **M02 · C — Keep operations safe and current.** Verify scheduled backup expiry, restore checks, delivery backlog, quota alerts, webhook failures and access controls on the agreed schedule. Document manual intervention rather than silently purchasing capacity.
- [ ] **M03 · B — Maintain releases and compatibility.** Use the same beta/check/approval flow for later changes; keep changelog, component examples, downloads, policies and screenshots aligned with the deployed release.
- [ ] **M04 · B — Complete the evidence handover.** Link the deployed version, successful CI run, artifact hashes, beta/prod acceptance, inbox confirmation, restore/rollback proof, policy decisions, visual approvals and approved residual risks.
- [ ] **M05 · B — Close launch separately from external outcomes.** Mark engineering launch complete only after its gates pass. Keep search indexing, directory acceptance and marketing responses open until observed, or explicitly record an external rejection/unresolved outcome. A third-party delay is not proof our submission succeeded.

## Completion log

Add one row when closing or reopening a task. Never record secrets, personal report contents or private attachments here.

| Date | Task ID | Status change | Revision / environment | Evidence and result | Owner / next action |
| --- | --- | --- | --- | --- | --- |
| 2026-09-12 | D01–D12 | Recorded baseline only | Release `cc971887` plus linked historical checkpoints | Evidence index above; not production acceptance | Cojeev; revalidate affected checks after changes |
| 2026-09-12 | B05 | Still blocked | PR #2, head `cc971887` | Required Verify release cancelled; beta/prod skipped | Cojeev; B01–B04 and beta prerequisites |
| 2026-09-12 | H01 | Visual rework pending | Earlier homepage restored | Rejected implementation preserved on separate branch | Sanjay + Cojeev; approve next design or release fallback |
| 2026-09-12 | W01 | Implemented and reviewed; checks/merge pending | W01 `ac39450`; B01 dependency merged locally as `1f6698c` | [PR #4](https://github.com/luv-jeri/cojeev-ui/pull/4); two source documents copied byte-for-byte, scoped AGENTS rule preserved, both reviews approved; combined tree 343 unit tests passed | Cojeev; merge B01 first and require complete checks |
| 2026-09-12 | B01 | Implemented and reviewed; full remote acceptance pending | `d345a58` | [PR #3](https://github.com/luv-jeri/cojeev-ui/pull/3), [full run](https://github.com/luv-jeri/cojeev-ui/actions/runs/34688330949); 14 focused runner checks and 343 unit tests passed; 90-minute budget and all later checks retained | Cojeev; do not close on partial/cancelled results |
| 2026-09-12 | A03 / C01–C03 | Prerequisites rechecked; still incomplete | GitHub access verified; browser reports User unavailable | beta and production each list only the preserved REPORTING_SECRETS_JSON bundle; no repository secrets. Main protections and owner production approval are intact. Auto-merge is disabled | Sanjay + Cojeev; owner-assisted credentials remain separate from CI |
| 2026-09-12 | B03-1 | Implemented and reviewed; checks/merge pending | [`e9d45b0`](https://github.com/luv-jeri/cojeev-ui/commit/e9d45b08c989b8292c4b6c0ca019bcce6b765646), [PR #5](https://github.com/luv-jeri/cojeev-ui/pull/5) | Installer pinned to 4.21.0; real fresh-consumer install/build passed. Primary review confirmed 343 unit tests and consumer rebuild passed; [scoped evidence](../../production/2026-09-12-phase-1-release-controls.md). Full CI acceptance remains pending | Cojeev; require complete checks and merge before closing |
| 2026-09-12 | B03 | Source controls reviewed; checks/merge pending | [`89fdef4`](https://github.com/luv-jeri/cojeev-ui/commit/89fdef409810c026a55796d5c8cd44a24488b751), [PR #6](https://github.com/luv-jeri/cojeev-ui/pull/6) | [Dated control audit](../../production/2026-09-12-release-control-audit.md); 25 release/operations fixture tests passed, GitHub protections freshly verified, independent review approved. Missing protected-environment secret names recorded without inspecting values | Cojeev; merge after PR #5 and complete checks; B02/B04 and live acceptance remain separate |
| 2026-09-12 | B03-1 | Opened after release-control inspection | `scripts/verify-install.mjs` in `cc971887` | Two unpinned installer invocations; exact root dependency is 4.21.0. No upgrade or installation claim | Cojeev; scoped installer pin and real consumer verification |
| 2026-09-12 | B03-1 | Implemented and reviewed; required checks/merge pending | `e9d45b0` | [PR #5](https://github.com/luv-jeri/cojeev-ui/pull/5); pinned installer and real five-component install/build passed; [scoped evidence](https://github.com/luv-jeri/cojeev-ui/blob/e9d45b08c989b8292c4b6c0ca019bcce6b765646/docs/production/2026-09-12-phase-1-release-controls.md) | Cojeev; complete remote checks and merge parent checkpoints first |
| 2026-09-12 | B03 | Source controls reviewed; checks/merge pending | `89fdef4`, final tracking `1491794` | [PR #6](https://github.com/luv-jeri/cojeev-ui/pull/6); [dated control audit](https://github.com/luv-jeri/cojeev-ui/blob/89fdef409810c026a55796d5c8cd44a24488b751/docs/production/2026-09-12-release-control-audit.md); 25 release/operations fixture tests passed, GitHub protections freshly verified, independent review approved | Cojeev; merge after PR #5 and complete checks; B02/B04 and live acceptance remain separate |
| 2026-09-12 | A03 / C01–C03 | Cloudflare command-line access verified; provisioning still pending | Read-only update at 11:13 UTC | Production reporting Worker lists ADMIN_TOKEN, GITHUB_WEBHOOK_SECRET, IP_HASH_SECRET and TURNSTILE_SECRET. Configured beta reporting Worker returned not found. GitHub deployment credentials remain missing; no values read or provider changes made. Evidence update on [PR #6](https://github.com/luv-jeri/cojeev-ui/pull/6) | Cojeev; preserve existing bindings and provision only verified gaps in the deployment phase |
| 2026-09-12 | B01 / W01 | Full checks failed; checkpoints remain open | Runs `34688330949` / `34688474452` | First run passed catalogue/motion but failed stale landing analytics; second failed Agent Chat cancellation, Guided Pointer arrival and Text Reveal replay observation. Downstream skipped checks are not passes. Findings recorded on [PR #3](https://github.com/luv-jeri/cojeev-ui/pull/3#issuecomment-5645736706) and [PR #4](https://github.com/luv-jeri/cojeev-ui/pull/4#issuecomment-5645736846) | Cojeev; repair B02-1/B02-2, then rerun complete checks |
| 2026-09-12 | B02-1 | Implemented and independently reviewed; full CI pending | `4601595` | [PR #7](https://github.com/luv-jeri/cojeev-ui/pull/7), [run](https://github.com/luv-jeri/cojeev-ui/actions/runs/34692165467); exact old selector failure reproduced, complete enabled test passed locally, separate unset/disabled builds captured nothing, 12 focused tests passed | Cojeev; preserve the restored homepage and await full acceptance |
| 2026-09-12 | B02-2 | Implemented and independently reviewed; full CI/merge pending | `39d0c31` | [PR #8](https://github.com/luv-jeri/cojeev-ui/pull/8), stacked on PR #7; [full run](https://github.com/luv-jeri/cojeev-ui/actions/runs/34693991893) pending. Delayed-driver reproduction and negative controls passed; provenance and full-intervention guard corrections reviewed; 345 root tests passed; zero product changes | Cojeev; await complete final-source CI and dependency acceptance; no checkpoint closure |
| 2026-09-12 | W01 | Reviewed dependencies integrated locally; full checks/merge pending | Local merge `b613fb2`, incorporating `39d0c31` | [PR #4](https://github.com/luv-jeri/cojeev-ui/pull/4); combined tree passed 345 root tests and whitespace checks; product directories and package manifests unchanged from W01 start `93fe99b`. B01/B02-1/B02-2 remote acceptance remains pending | Cojeev; primary review and exact-final-source checks before delivery or closure |

## Final sign-off card

- [ ] All required product and shared-shell acceptance items are closed with evidence or an explicit approved deferral.
- [ ] Privacy/security/licensing/accessibility launch blockers are resolved; remaining limitations are documented honestly.
- [ ] Full checks pass for the reviewed release; PR merged through protections.
- [ ] Both environments run their recorded artifacts; beta isolation, production journeys and actual inbox delivery pass.
- [ ] Recovery and independent alerting have been exercised.
- [ ] README, legal notices, component downloads and production content match the release.
- [ ] Search submissions and registry submission are recorded; accepted/indexed status is tracked separately.
- [ ] Approved marketing has been published/sent with outcome links and responsible follow-up.
- [ ] Sanjay has the operational handover and has accepted the remaining risk/deferred-work list.

Creating this checklist does not implement audit fixes, merge PR #2, deploy a release, change account settings, submit a registry, or send outreach.
