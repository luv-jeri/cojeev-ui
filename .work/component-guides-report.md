# Component guide content receipt

Content snapshot: `f36d13e` on `codex/composed-components`, plus the finalized CodeBlock API and source from interactive-owner commit `16ec4d1`. This change owns only `data/component-guides.json` and this report.

The JSON is an object keyed by registry ID. It contains the 70 UI file IDs in this snapshot plus `code-block`: **71 unique entries**, each with exactly `description`, `category`, `usage`, `accessibility`, and `related`. Entries describe a useful function, give practical composition advice, and distinguish provided semantics from caller responsibilities.

## Verification

A Python JSON/schema check compared the IDs against `registry/sahajiv/ui/*.tsx` plus `code-block`, detected duplicate JSON keys, checked field types and allowed categories, enforced 1–3 usage bullets and 1–2 accessibility notes, and verified all related IDs exist with no duplicate or self links.

- 71 entries; no missing or extra IDs.
- 143 usage bullets; 99 accessibility notes; 212 valid related links.
- Categories: Actions 7; Forms 17; Navigation 7; Feedback 7; Data display 12; Layout 12; Conversation 5; Tools 4.
- JSON parses and `git diff --check` passes.

Reviewed each existing entry's public exports and the relevant custom-control implementations. Particular boundaries checked in source: Calendar and DatePicker select one date; Combobox and Select hold one value; DataTable filters/sorts/pages the supplied data locally; Dropzone reports local File objects and does not implement server upload or enforce dropped-file MIME restrictions; Button loading does not automatically disable activation; Field's default description and error share a message ID; Stepper and Questionnaire do not validate a workflow for the caller. The guides state these boundaries or give composition advice that respects them.

CodeBlock was planned when assigned and has since been implemented by its owner. Its guide matches `code`, optional `language`, `title`, and `wrap`, and the same-entry CopyButton export. Language is a plain label, not syntax highlighting. Copy attempts the Clipboard API, then the selection fallback, and provides success or manual-copy feedback.

No production component, builder, catalog, sidebar, or docs renderer was edited. No browser matrix or build was run for this content-only change. Runtime accessibility conformance is not inferred from the source review. Integration and any future API changes remain the consuming owners' responsibility; no unfinished content entries remain.
