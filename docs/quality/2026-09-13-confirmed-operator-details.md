# E02-1 — confirmed operator and offer details

13 September 2026 · base `3e8495c` · branch `chore/e02-operator-details`.
Scope: child checkpoint [E02-1](../superpowers/plans/2026-09-12-launch-master-checklist.md),
publishing A01's confirmed facts only. This is not E02, not E05 and not a legal opinion.

## 1. What was confirmed, and by whom

Sanjay confirmed these on 13 September 2026. Nothing else was treated as settled.

| Fact | Confirmed value |
| --- | --- |
| Operator / legal name | Sanjay Kumar |
| Place of operation | Madhya Pradesh, India |
| The component library | Free |
| Services | Sold separately from the library |
| Public contact address | `hello@cojeev.com` — previously approved, unchanged |
| Homepage for this release (A04) | Keep the current/restored homepage unchanged |

## 2. What is published, and where

Two prose insertions in existing routes and components. No styling, motion, variant or flag changed.

**`app/privacy/page.tsx`** — a new `Who runs this site` section, placed immediately before
the existing `Settings and questions` section so identity sits next to the contact route:

> The operator of 000h by Cojeev is Sanjay Kumar, based in Madhya Pradesh, India.
>
> The component library is free: the source is published under the MIT licence, and this
> website takes no payments. Sanjay also offers paid design and development services
> separately from the library.

**`components/landing/creator-page.tsx`** — one added `Body` paragraph in the existing
`creator-practice` section, before the existing contact sentence:

> The library itself is free: MIT licensed, yours to download, read and change. I work from
> Madhya Pradesh, India, and I take on design and development projects separately from it.

This component backs both `/about` and `/work-with-me`, so both routes show it. That is the
pre-existing arrangement (`app/about/page.tsx`, `app/work-with-me/page.tsx`), not a new one.

## 3. Claims checked against the repository before publishing

| Published claim | How it was checked |
| --- | --- |
| "published under the MIT licence" | `LICENCE` is the MIT License; the footer already states "MIT licensed" (`components/landing/marketing-shell.tsx:76`). |
| "this website takes no payments" | Searched `app`, `components`, `lib`, `workers` for `stripe\|razorpay\|paypal\|payment\|checkout`. The only hits are a `BuyMeCoffee` reference example whose own copy says "it does not take a payment" (`components/examples/reference-layouts.tsx:20`) and an unrelated "stripes" string. No payment route, key or provider exists. |
| Identity is consistent with existing prose | `site.author` is already "Sanjay Kumar" (`lib/site-config.ts`), the footer already says "Made by Sanjay Kumar", and the E01 inventory records that name and the contact email (`docs/privacy/2026-09-13-processing-inventory.md`, §11). The state and country come from the owner's new confirmation, not the earlier inventory. |
| Contact behaviour unchanged | The contact address is still rendered only through `siteFlags.contactEnabled`; the new prose adds no address, no `mailto:` and no reply promise. `NEXT_PUBLIC_CONTACT_ENABLED` is untouched in source and configuration. |

## 4. What was deliberately NOT written

None of the following was published anywhere, because none of it is confirmed:

- Any company, firm or registered entity; any registration, CIN, GST or tax identity.
- Any postal or street address beyond the confirmed state and country.
- Any statement that no entity exists — the negative is as unconfirmed as the positive.
- Service prices, engagement terms, refund or cancellation promises.
- Intended countries served, geography targeting, or any jurisdiction/applicable-law claim.
- Any age threshold, children's-data position or age-gating statement.
- Any compliance assertion (DPDP, GDPR, UK GDPR or otherwise).
- Any promise that email to `hello@cojeev.com` is received, read or answered.

## 5. Checks run

Run in the worktree at this change, against shared `node_modules` mounted read-only via a
symlink (no install, no dependency mutation):

- `npx tsc --noEmit` — "TypeScript: No errors found". A baseline run before the edits was
  also clean, so this is a comparison, not a bare assertion.
- `node scripts/lint.mjs` — exit 0, no output.
- `node --import tsx --test tests/*.test.ts tests/*.test.mjs` — 476 passed, 0 failed.
- `node --import tsx --test tests/launch-environment.test.ts` — 8 passed; specifically
  *"the contact surface publishes only the public address, and GitHub either way"*, which
  renders `CreatorPage` in both contact states and asserts exactly two `mailto:` matches
  when enabled and none when disabled. The added paragraph keeps both states correct.
- `git diff --check` — clean.
- Application diff reviewed line by line: two files, +2/−1, plus checklist and evidence documentation. The only
  risk in the creator-page edit was the significant JSX space before `{contactEnabled …}`;
  it was removed by the first edit and restored before any check was run.

Primary and independent review removed unconfirmed one-person/business-arrangement wording,
corrected the build-input description below, and clarified that the change is not deployed.
After those application corrections, the primary reran the eight launch-environment tests
and `git diff --check`: both passed. The independent reviewer also reran lint and TypeScript
successfully. This is source-level checkpoint evidence, not live-release certification.

## 6. Checks NOT run, and why

These were out of proportion to a two-paragraph copy change, per
`docs/checkpoint-workflow.md`. None of them is claimed as passing.

- `npm run build` / `npm run registry:build` — deferred for this copy-only checkpoint. The website copy is a build input, so a new release must contain newly built and verified artifacts; the previous candidate does not cover these bytes. Registry component sources are unchanged.
- The full component catalogue (`gate:*`, 172 entries), motion, mobile-WebKit, docs and
  marketing gates — only body copy in existing containers changed; no component behavior, token, style or motion changed.
- `npm run analytics:browser`, reporting worker and reporting browser suites — untouched.
- `node scripts/check-launch-readiness.mjs` — requires `--url=<deployed origin>`; there is
  no deployed build of this change, so it cannot apply here.
- No visual/owner design approval is claimed. The two routes gain one and two paragraphs of
  body text in existing containers; `/privacy` and `/about` were not re-captured.
- No live provider, account, mailbox or deployment state was inspected, and no credentials
  were read or handled.

## 7. Remaining policy gaps after this checkpoint

E02 stays open. This checkpoint closes only the operator-identity and free-versus-paid parts
of it. Still missing from the published notice:

1. Forms, uploads and diagnostics: what the reporting widget collects and when.
2. Purpose and lawful basis for each processing activity (E01 §11 leaves every basis open).
3. Named disclosures and recipients: Cloudflare, GitHub, Resend, PostHog, the destination inbox.
4. Public GitHub issue visibility as the permanent record of a report.
5. Retention periods — none exists in code or docs for `contact_hash`, `email_attempts`,
   `email_events` or the residual `outbox` identity.
6. The rights and contact process (access, correction, erasure, withdrawal) and who answers it.
7. International transfers, and any children/age statement.
8. E05: terms separating the free MIT download from paid services, and a recorded reason why a
   purchase refund policy is or is not applicable — not an invented commercial contract.
9. A05: which regimes actually apply. A01's open facts (countries served, age audience) block it.

## 8. Recommended next narrow checkpoint

**E02-2 — publish the reporting data flow.** It is the largest published-versus-actual gap and
the only remaining E02 piece that needs no new owner decision: the E01 inventory already
documents the widget's fields, diagnostics, drafts, Turnstile and the GitHub issue path from
source. Writing it needs verification against code, not a legal answer, so it can land while
A01's open facts and A05 remain with the owner. Retention and lawful basis must stay excluded
from it; they are owner/legal gates.
