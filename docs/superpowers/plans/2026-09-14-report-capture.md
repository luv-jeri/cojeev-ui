# Report capture implementation plan

> For agentic workers: execute this bounded plan with executing-plans. Owner approved the Select area / Full page interaction on 14 September 2026.

**Goal:** Make screenshot capture discoverable, cancellable and visibly progressing, with rectangle selection before capture.

**Architecture:** Keep local DOM capture and review-before-attachment. A viewport rectangle picker owns selection; capture.ts owns rendering, privacy and cleanup; the report form owns task identity and status. Do not replace rectangle selection with element-only selection.

**Tech stack:** Existing React, Cojeev Button/Input, modern-screenshot 4.7.0, existing Node/browser checks. No new dependency.

## Constraints

- Checkpoint C08-1, branch fix/c08-1-capture-feedback; no changes to delivery, providers, unrelated components or existing drafts.
- Keep bug-report screenshot scope and Full page. Replace This view with Select area. Retain existing crop review and upload alternatives.
- Paired semantic colours, restrained rectangular capture frame, stable label slots, shared buttons and focus rings. Quiet motion must remain usable.
- Visible capture stages and elapsed seconds next to screenshot actions. Asset counts describe asset embedding only; do not invent whole-operation percentages.
- Cancel discards late results, cooperatively interrupts cloning, cleans up sandbox/resources, and never adds an attachment. No claim that already-started network requests are aborted.
- Keep form-field/private-region and reporting-overlay exclusions, admin-page capture prohibition, image limits, Escape/focus return and draft persistence.

## Task 1: Area capture and visible lifecycle

Files: lib/reporting/capture.ts; new components/reporting/area-picker.tsx; components/reporting/reporting-widget.tsx; components/reporting/reporting.css; tests/reporting-browser-client.test.ts; new tests/reporting-capture.browser.mjs.

Interfaces: retain capturePage("viewport" | "page") compatibility; add optional options with area in viewport CSS pixels, AbortSignal, and onProgress carrying phase plus optional current/total asset counts. Define the exact type once in capture.ts and import it in the consumer. Picker returns `{x,y,width,height}` in viewport pixels or cancels.

- [ ] Extend focused tests first: rectangle validation rejects nonfinite/out-of-bounds/zero rectangles, and preserves existing page size guards. Add browser assertions that the new Select area control and nearby progress/cancel are present; record the pre-change failures.
- [ ] Implement rectangle drawing using pointer capture; Escape cancels; a compact toolbar has numeric x/y/width/height controls and Capture area so keyboard users can adjust a valid default rectangle without pointer input. Suppress underlying page actions only while selecting. Restore focus and existing drawer state; never discard drafts.
- [ ] Preserve page styling for arbitrary rectangles: capture a correctly translated document viewport then crop to the selected rectangle, or a demonstrably equivalent region render. Do not blindly prune offscreen ancestors or descendants with visible overflow/fixed positioning. Claim speed improvement only if measured.
- [ ] Use explicit modern-screenshot createContext/destroyContext with finally cleanup. Yield to paint before expensive work and periodically during cloning; check cancellation in clone/progress hooks. Signal phases preparing/reading/assets/rendering/ready and expose elapsed seconds. Bound hangs and suppress stale progress/results after Cancel, drawer close or a new task.
- [ ] Keep redaction before serialization and exclude picker/status chrome. Existing CropEditor remains the final user review. Do not upload on screenshot completion.
- [ ] Run only affected unit checks and TypeScript, then one real-app browser session covering rectangle pointer and keyboard selection, Full page, cancellation, redaction and sandbox cleanup. Inspect desktop light and mobile dark screenshots from that session. Record capture duration; no full catalogue or Lighthouse.
- [ ] Add C08-1 under C08 in the master checklist, update rapid-fix ledger with honest evidence and limitations. Commit exact paths with Checkpoint: C08-1; primary review before push/PR. No merge/deployment in executor.
