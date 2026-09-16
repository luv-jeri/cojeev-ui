# Library integration corrections and branch ledger

Approved by Sanjay on 14 September 2026 after source review by GPT Sol and Terra.

## Direction and ownership

Repair shared motion and dark Tabs first; preserve public APIs, genuine selection,
disabled paint and focus indicators. Extend existing Tabs for decorative icons.
Add one reusable Tree using the approved **branch-ledger** direction: compact
rows, quiet connecting lines, separate expand/select controls, stable file icons,
one soft selection surface, and gentle chevron motion. Loading, empty, retry and
truncation feedback belong to the affected branch, not an overlay on the list.

Use the current warm-paper/precise-ink tokens, shared motion/quiet contracts and
Item/ItemAdornment vocabulary. No idle bouncing, random row reshaping, extra
selection dots or duplicate Tabs family. Long names remain available to assistive
technology; narrow views keep controls reachable. Reduced motion and Flow Off
keep all controls functional and still.

Tree is a controlled native disclosure list, not an ARIA treegrid: native lists,
labelled expansion buttons with aria-expanded/aria-controls, sibling selection
buttons and optional trailing actions. Normal Tab, Enter and Space behavior is
documented honestly. Ancestor collapse returns focus from hidden descendants to
the expansion control; supplied data and stable IDs preserve selection and cached
state. Filesystem/Git access, fetching, caching, permissions, pagination limits and
previews remain consumer-owned. No consumer application files are edited.

## Reconciled review

- L-01 is present. Availability attributes and Button's disabled/busy/rest
  data-state transitions both trigger unintended pulses. The partial consumer
  patch must not be ported as a complete fix.
- L-02 is present in the travelling selection layer. Scope its theme correction
  to Tabs rather than globally recolouring all flow consumers.
- L-03 includes real app-owned transient disabled paint. Preserve genuine
  disabled/focus styling; document stable busy integration. Startup/native
  frame stability remains unverified, not implicitly solved by L-01.
- C-01 is missing; C-03 is satisfied through Tree composition, not another
  decorative component. C-02 extends current Tabs children/layout.
- I-01 needs explicit React.ReactElement and React.RefCallback<T> returns.
- I-02 needs documented compiler boundaries and declaration-consumer evidence.
- I-03 needs opt-in self-hosted font delivery with identical licensed assets.
- I-04 requires actual bundle/import measurements; registry JSON size is not JS
  bundle size. Optimize only a demonstrated dependency cost with preserved closure.
- I-05 primary HTTP endpoints respond today; historical downloader failure is not
  a present outage. Qualify the supported CLI and document intentional mirror use.

## Acceptance and release boundary

Each checkpoint gets focused checks, a scoped commit and separate review.
One final light/dark, narrow/desktop, normal/quiet visual pass covers affected
components; actually view the captures. Report test time separately from diagnosis
and packaging. Do not rerun a passing check unless relevant code changed.
Provide source revision, affected registry items and an upgrade guide identifying
removable versus still-required consumer workarounds. No production deployment,
consumer upgrade, new credentials or registry-directory submission is part of
this implementation approval. Preserve the separate beta capture hotfix PR59.
