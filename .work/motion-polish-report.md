# Production motion polish

The owner approved production refinement on 8 September 2026, superseding exact reproduction of source defects. This change preserves all nine preset IDs, persisted settings and the shared hooks; it intentionally changes default motion and segmented-control feedback.

## Measured problem and result

A live browser capture of the actual docs Tabs found approximately **4.48 px default Glide overshoot**, two stacked content animations in the fresh case, and up to 11 concurrent selection/content animations. Frame p95 was already about 16.7 ms. The reported bounce was primarily excessive movement, not sustained low frame rate.

The updated production docs now show **less than 0.001 px measured overshoot**, zero automatic content animations and still tab hosts. Final selection alignment is within Chromium layout precision (at most 0.016 px). Fresh settings, a persisted authored profile and native mobile touch all settle correctly; live frame p95 remains approximately 16.7–16.8 ms. Isolated development-frame gaps still occur, so this is not a claim of universal jank elimination. Root's updated docs also reduce specimen density; before/after frame workload is not identical.

## Changes and intentional departures

- Glide keeps its public ID and becomes a 240 ms monotonic slide with no landing bounce. The other eight expressive characters remain available. Speed still tunes Glide; intensity primarily controls expressive deformation and glow.
- Tabs content no longer mounts the generic enter-plus-land effect. Tabs triggers delegate release feedback to their travelling group instead of acquiring a redundant press subscription.
- Group indicator geometry preserves subpixels. Interrupted Stretch, Drop and Rubber phases use the currently visible body as their origin; changing a preset cancels its old phase timers before seating the current selection.
- Segmented group containers and controls keep their Morph decoration static even if an authored profile enables breathing, reach or press. The profile itself is retained. Field groups and standalone bodies keep their existing behavior.
- Touch does not start pointer-preview work. Reduced-motion label delays are zero, and Off suppresses native CSS press movement after automatic Morph decoration is removed.
- The already documented nearest-group marker ownership fix is retained; it does not reproduce the source parent-removal defect.

## Verification

All nine presets were selected using the actual updated docs MotionControls. Every preset passed a native pointer sequence with two rapid reversals, ended on the current selection with exactly aligned geometry, one of each owned layer, no stale phase, still labels and no remaining group animation. The Speed and Intensity sliders update the stored settings and preserve the chosen preset after reload.

Fresh, authored-profile, native touch, reduced and Off Tabs cases were recorded with the live browser clock. The final reduced/Off checks show zero running group/content animations and still hosts. An authored Pagination body retains the same exact path through pointer hold and release; Off removes a standalone Button's Morph body and its native active translation. Collected Tabs runtime logs contain no errors.

The reduced-label FAILs in the preceding synthetic 228 matrix are not presented as production failures: that harness imports Flow unlayered and can override the layered accessibility reset. Actual docs already set reduced duration to zero; their remaining 100 ms label delay was independently observed and removed here.

Focused TypeScript and ESLint checks passed. Existing settings persistence/reset and cancellable motion-clock tests passed. The two browser diagnostics are `.work/tabs-polish-probe.mjs` and `.work/motion-presets-polish-probe.mjs`; compact results and raw receipt hashes are in `.work/motion-polish-receipt.json`. Raw frames and screenshots remain under `output/playwright/motion-polish/{before,after,quiet-final,presets}`.

The final keyboard diagnostic waits one native frame between ArrowRight presses so Radix can finish deferred focus; the initial baseline's immediate two-key sequence remains preserved. No keyboard implementation changed. Nine-preset reversal coverage is pointer-based; default Tabs additionally covers keyboard and native touch. This is bounded production evidence, not an exhaustive cross-browser or all-page performance claim.

Registry artifacts were generated only to make the isolated docs catalog runnable. They are not included in this scoped production commit; root owns regeneration and the integrated build/install gate.
