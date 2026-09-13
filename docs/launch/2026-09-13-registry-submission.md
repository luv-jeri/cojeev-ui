# shadcn submission readiness — K02

Checked 13 September 2026. Sanjay authorized submission and explicitly approved
`@cojeev`, the production URLs and the existing theme-adapted 000h mark below.
Nothing has been submitted yet.

## Approved identity and prepared entry

Use the existing consumer namespace `@cojeev`, the approved production domain,
and the existing 000h mark with theme-aware ink. No new brand or domain choice
is needed. `@000h` would require changing the existing catalogue/configuration.

```json
{
  "name": "@cojeev",
  "homepage": "https://000h.cojeev.com",
  "url": "https://000h.cojeev.com/r/{name}.json",
  "description": "Expressive React components with organic shapes, purposeful motion, and source you can make your own.",
  "logo": "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 96 96' fill='var(--foreground)'><path fill-rule='evenodd' d='M58 9C77 10 87 27 86 45C84 66 63 87 43 86C25 85 10 71 10 52C10 33 36 7 58 9ZM56 30C47 27 35 36 31 47C26 60 32 70 40 69C52 68 64 54 65 43C66 37 62 32 56 30Z'/></svg>"
}
```

## Verified and remaining

- Research checked the live directory: `@cojeev` and `@000h` were absent. This does not reserve either name; recheck before posting.
- The existing production catalogue contains 173 entries (172 UI components and the base item); research checked their endpoints and dependency URLs. The Pages mirror has only 161 entries and is not the submission target.
- Live index schema checks and representative CLI dry runs succeeded. Dry runs are not actual consumer install/build acceptance (K03).
- Matching component names do **not** prove the latest source is deployed. Primary live checks found production `/health` and `/release.json` return 404; both beta domains fail DNS resolution. Production reporting still returns `emailEnabled: false`.
- The live sampled component downloads lack the project's own MIT notice. I03 is implemented in newer source, not yet verified on production. Include the notice fix in the release before posting this submission.
- The identity is approved. Verified production release/downloads, a fresh consumer build and the upstream validator remain before posting. No directory acceptance or indexing is claimed.

## Submission procedure

The [official procedure](https://ui.shadcn.com/docs/registry/registry-index) is to
add one entry to `apps/v4/registry/directory.json` in `shadcn-ui/ui`, run
`pnpm validate:registries`, then open an upstream PR. Publication follows the
maintainers' merge, not our PR creation.

The [entry schema](https://github.com/shadcn-ui/ui/blob/2b3e6d4f8d9161fe5c19340dc383aade392012dd/apps/v4/lib/registry-directory.ts)
requires name, homepage, placeholder URL, description and logo; it rejects extra
keys and duplicate names. The catalogue must be public, flat and schema-valid,
without inline `content` in index file entries. Keep inline source in individual
install payloads; that is a different object.

Before posting, verify the exact final upstream diff and validator output. Record
the PR URL and submission date under K05; leave K06 open until actual acceptance
and namespace installation are observed. Preserve GitHub Pages compatibility;
do not republish it or change its domain as part of this submission.
