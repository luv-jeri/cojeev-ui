# Explicit browser details — E08-1

Base: `5358d25aded2c7b030d394e289475bc030a82578`.

## Correction

Creating a bug draft used to snapshot browser details immediately, before the user pressed the panel's Include browser details control. `selectDraft` now uses the existing empty-draft default (`diagnostics: null`) for both report kinds. Explicit inclusion, refresh, per-group removal, complete removal and existing saved drafts keep their existing behavior.

The production change removes one automatic snapshot assignment. No new API, storage format, visual treatment or provider integration is introduced.

## Verification

The new `scripts/check-reporting-consent.mjs` mounts the real reporting widget and its existing controls in an isolated Chromium fixture. It supplies only the Next pathname context; diagnostics, draft persistence and UI handlers are real. It uses the actual IndexedDB workspace, waits for the existing save debounce to complete, and blocks all external requests. No report is sent.

- Before the fix, it failed with `New bug draft must not attach diagnostics before explicit inclusion`: one diagnostics group container existed when zero was expected.
- After the fix, new bug drafts have no attached diagnostics; explicit inclusion survives reload unchanged; removing details leaves them absent after reload.
- The fixture needed the library's existing layout styles before its normal pointer clicks were meaningful. An initial fixture-only layout timeout is not counted as the regression proof.
- Six reporting-contract tests passed.
- ESLint passed for the changed widget and both browser scripts.
- The existing full reporting browser journey now asserts no diagnostics before inclusion and explicitly includes them before its existing upload/redaction/reload checks. That complete Worker-backed journey was **not rerun** for this local checkpoint; it remains release acceptance.

Commands (Node 22.22.0, existing lock-installed dependencies):

```sh
node scripts/check-reporting-consent.mjs
node --import tsx --test tests/reporting-contract.test.ts
node node_modules/eslint/bin/eslint.js scripts/check-reporting-consent.mjs scripts/check-reporting-browser.mjs components/reporting/reporting-widget.tsx --max-warnings=0
```

## Limits and remaining E08 work

This fixes **attachment to new drafts**, not the separate in-memory diagnostics buffer: that buffer still starts when the widget mounts. Draft expiry, shared-device guidance and buffering timing remain open under E08. Existing saved drafts, including drafts that already contain diagnostics, are deliberately preserved; there is no silent data deletion or claim of retroactive consent. Real deployed journeys and the separate privacy policy/retention decisions remain pending.

Rollback is a normal revert of this checkpoint. It changes no database schema or server-side report contents.
