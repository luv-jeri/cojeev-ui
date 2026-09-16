# B05-1: one combined candidate for the open fixes

Owner decision, 14 September 2026: combine the seven non-draft PRs shown in the
request into one integration PR. This overrides separate promotion for this batch,
not branch protection or production approval. Preserve original commits and PR
discussions. Older drafts #23 and #33 are not part of this batch.

| Original PR | Checkpoint | Included head |
| --- | --- | --- |
| #49 | G02-1 font loading | 6931629d55e65bb29d653ea3e99be907807fc930 |
| #50 | F05-1 headings and accessible labels | c4dcd14a12f065a5f7d2944d74fbb8f76b01be37 |
| #51 | G01-1 homepage measurement evidence | 33602466186acdd29563c1fbc24a10a38bdb862f |
| #52 | H02-1 sidebar scrollbar | df47cb1e7e544c9d1fc3ac1c879835aae72bc2c3 |
| #54 | C10-1 report notifications | 615f2d69a79587e98bbb0c58017da4f5875f9644 |
| #55 | C08-1 screenshot capture | a9c76061e3d83b01ab5f324d5a1b567ab7431a51 |
| #57 | B02-5 completion-focus test observation | 793aae6d49e009c4d700a1655f146601ab6defd3 |

Base: main `72f00e173d0280363d95d3f3b71465cb8f6faad8`. PR51 already contains
PR49 and PR50. Normal local merge commits retain all seven source histories.
No force push or original branch deletion is needed.

## Integration resolution

One conflict occurred in the report launcher. Preserve PR55's
`data-hidden={open || picking || !!progress || undefined}` and PR50's removal of
the redundant `aria-label`, so the visible button text remains its accessible
name. No new behavior beyond the two source changes is introduced. Other merges
were automatic; the combined diff still requires review and CI acceptance.
The newly added capture browser check also needed its launcher selector updated
to the visible slash-separated label introduced by PR50. Its dialog-title selector
is unchanged because the dialog still uses the original title.

## Evidence and open acceptance

- Original PR checks remain historical evidence, not a combined-candidate pass.
- PR50's Article Headings/Shape Scene checks and PR52's Shape Scene check failed
  remotely. Local passes did not establish their cause. Carry these concerns
  into the combined run; do not waive or silently hide them.
- Run one combined PR verification instead of refreshing each source PR after
  every merge. Cancel the superseded PR54 run after the replacement PR exists.
- Existing main release automation is unchanged: merging this candidate still
  triggers its configured release workflow. This consolidation does not claim
  cross-run artifact reuse or eliminate every post-merge check.
- Keep original PRs linked as superseded, rather than mark them individually
  merged. Record actual integration PR and merge outcome separately.
- Beta notifications are configured in source but need deployed end-to-end proof.
  Production email remains staged pending its distinct webhook key and owner
  production approval. No historical reports may be replayed.
- Existing local screenshots/targeted checks from source PRs are retained.
  Combined visual acceptance, delivery receipt, GitHub issue creation and deployment
  are not established by combining Git commits.
