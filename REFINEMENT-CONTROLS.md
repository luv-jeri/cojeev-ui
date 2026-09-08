# Controls and selectors refinement

Group B of `REFINEMENT-PLAN.md`. The final selector direction follows the owner's correction: the default is a subtly asymmetric near-circle, with the stronger shapes available only by explicit choice. Existing callbacks, native selection semantics, and Calendar/Button lifecycle ownership remain in place.

## Findings and resulting behavior

**Button.** The live baseline did not show a missing secondary SVG fill: its real path matched the near-canvas beige face. The fixed inset border and very slight surface difference made its deformation read chiefly as an outside edge. Secondary now has a clear blue face with ink text in both themes. Loading previously inherited disabled styling because its activation guard uses `aria-disabled`; a broad direct-child rule also dimmed the owned morph SVG to 0.85 opacity. Busy buttons now retain their variant face and full foreground opacity. Native disabled and consumer `aria-disabled` still get the quiet disabled surface, and activation guards remain unchanged. The existing loader presence was retained.

The first interaction batch exposed a separate shared defect: secondary's hovered host changed to `oklab(0.769051 -0.007636 -0.0454984)` while its actual SVG retained `rgb(182, 202, 235)`. `motion/use-morph.ts` now repaints at pointer enter/leave and focus boundaries, and observes disabled/aria-disabled/aria-busy along with its existing selected/open/highlight attributes. The follow-up measured the same intended color on both the real path and host. The prior synchronous endpoint sampling fix remains intact. Group C was informed before this shared change.

**Checkbox, RadioGroup, Questionnaire.** The shared `lib/selector.tsx` owns silhouette geometry, fill, mark presence, and interaction attachment. Both selector families default to `organic`: a near-circle with a small asymmetry. The small selector surface uses the same `useMorph` engine as Button for pointer attraction and contour stretch; the text does not receive that deformation. Focus and Space/Enter press are forwarded to the surface. Off, Flow Off, reduced motion, and disabled states use an immediate SVG fallback. The check, indeterminate dash, and radio dot retain clear independent meanings.

Questionnaire carries the same shape/tone choices into its existing native radio inputs. The input remains the form/focus owner; the shared glyph is decorative. Selected progress and callbacks still work. Its legend has explicit spacing above the option list.

**Calendar and DatePicker.** Calendar now uses an open month/year hierarchy, compact paired navigation, unfilled weekday labels, quieter week numbers, a pink selected date, and an outlined/dotted today marker. Its semantic date grid, selected callback, disabled days, marks, and DayPicker retained month transitions remain. Range-start/middle/end modifier flags have paint rules; the existing public selection contract remains single-date rather than claiming a new range-selection API. DatePicker now starts as a quiet field-like trigger, becomes blue when open, and uses the same calendar in an opaque viewport-bounded popup. Selecting a date closes it and restores trigger focus.

**Dropzone.** The default and compact compositions use actual ShapeMorph and Icon primitives. Empty/hover/drag, selected-file receipts, size/type rejection, and disabled states are explicit. File selection and drop both send real File objects to the existing callback. Optional type/size rejection provides a visible explanation and a rejected-file callback. No upload or server processing is simulated. Receipt names wrap and keep a full title. “Choose files again” accurately reflects replacement of the current selection.

## APIs and examples

| Component | Additions / compatible values |
| --- | --- |
| Checkbox | `shape?: SelectorShape`, `tone?: SelectorTone` |
| RadioGroup | Inherited `shape` / `tone`; each RadioGroupItem may override either; existing pictographic mode retained |
| QuestionnaireOptions | `selectorShape` / `selectorTone`, inherited by options |
| QuestionnaireOption | Optional per-option `selectorShape` / `selectorTone` |
| Shared shapes | `organic` **default**, `pebble`, `rounded`, `circle`, `leaf`, `flower` |
| Shared tones | `pink` default, `blue`, `olive`, `yellow` |
| Dropzone | `variant="default" | "compact"`, optional `maxSize` in bytes, `onFilesRejected(DropzoneRejection[])`; rejection code is `file-type` or `file-size` |
| Button / Calendar / DatePicker | Existing public props and callbacks retained |

`components/examples/refined-controls.tsx` exports RefinedButtonExample, RefinedCheckboxExample, RefinedRadioGroupExample, RefinedCalendarExample, RefinedDatePickerExample, RefinedDropzoneExample, and RefinedQuestionnaireExample. Root retained the original richer Button docs workflow and registered the six other examples. Shared registry/catalog files were not edited by this stream. The three selector entries need the `lib/selector.tsx` helper and its signature-shape/Motion dependencies in consumer closure.

## Evidence and limits

- `output/playwright/refinement-controls/button-baseline/`: actual initial SVG/foreground measurements and light/dark screenshots; not a claimed reproduction of missing fill.
- `output/playwright/refinement-controls/round-1/`: first mobile/desktop light/dark visual batch, including all six shape choices and all seven component compositions.
- `output/playwright/refinement-controls/confirmation/`: confirmation of local paint/cascade and shared hover corrections. The functional sequence stopped at a zero-duration automated key event: Radix moved focus after keyup and did not select the next radio. The focused `diagnose-radio.mjs` trace demonstrated the ordering; a 60ms held ArrowDown completed native selection. Component keyboard code was not replaced to accommodate the probe.
- `output/playwright/refinement-controls/functional/results.json`: **4/4 pass**, 390 and 1440 pixels × light/dark. Covers 18 Button state combinations per context, all six selector shapes via pointer/Space/ArrowDown, indeterminate and disabled states, Calendar retained month pointer/Enter navigation and selection callback, DatePicker selection/close/focus/bounds, both Dropzones' native chooser and real accepted/rejected Files, Questionnaire native radio/progress callbacks, and Off/Flow Off/reduced state changes. Every document width equalled its viewport. No runtime errors. The 48 opaque default/secondary/accent/danger button states measured at least 4.76:1 text-to-actual-fill contrast; outline/ghost were inspected visually rather than incorrectly treating a transparent fill as a color sample.
- `output/playwright/refinement-controls/motion/results.json`: **4/4 pass** at the same widths/themes. Confirms real SVG path changes from cursor attraction and keyboard press in both default selector families, drag-enter/drop callbacks in both Dropzones, final quiet DatePicker trigger, and unchanged visible fallback contours with no attached moving body in Off/Flow Off/reduced.
- Final typecheck, focused ESLint, and owned source diff checks passed. Browser artifact scripts use current component source with the running docs CSS; this stream did not run a Next build or regenerate registry output.

Useful captures:

- `functional/390-dark-buttons-busy.png`: readable busy and distinct disabled faces.
- `confirmation/1440-light-selectors.png`: all six silhouettes, default and semantic states.
- `motion/390-dark-organic-checkbox-attract.png` and `motion/1440-light-organic-radio-attract.png`: default contour during pointer attraction.
- `motion/390-dark-organic-off.png`: static fallback and clear marks.
- `functional/390-dark-date-picker-open.png` and `motion/390-dark-date-picker-final.png`: bounded calendar and final trigger.
- `functional/390-light-dropzone-compact-error.png` and `motion/390-dark-dropzone-compact-drag.png`: real rejected/drag states. The former intentionally samples entry and previous-receipt exit; it is not a settled-opacity color measurement.
- `functional/1440-dark-questionnaire-organic-selected.png`: native selected state and shared organic glyph.

All capture paths above are under `output/playwright/refinement-controls/`. The review used two composition batches; the additional continuation covered blocked functional states, and the final narrow check proved the late-requested cursor behavior. No extra cosmetic redesign cycle followed the inspected results.

Runnable gate: `node scripts/check-refinement-controls.mjs --output=output/playwright/refinement-controls/local`. Add `--only=motion` for the narrow cursor/keyboard/drag/quiet proof. `--skip-overviews=true` omits repeated static composition captures while retaining interactions. The fixture is `scripts/fixtures/refined-controls.tsx`; paths resolve from the repository location.

## Frozen owned paths

Product source:

- `registry/sahajiv/ui/{button,calendar,date-picker,dropzone,checkbox,radio-group,questionnaire}.tsx`
- `registry/sahajiv/styles/{button,calendar,date-picker,dropzone,checkbox,radio-group,questionnaire}.css`
- `registry/sahajiv/lib/selector.tsx`
- `registry/sahajiv/motion/use-morph.ts`

Examples, proof, report:

- `components/examples/refined-controls.tsx`
- `scripts/check-refinement-controls.mjs`
- `scripts/fixtures/refined-controls.tsx`
- `REFINEMENT-CONTROLS.md`

Root owns registry closure, original Button workflow integration, fresh build, and production/consumer verification. This refinement browser batch was Chromium; earlier WebKit lifecycle receipts are historical and are not relabeled as acceptance of the new styling.
