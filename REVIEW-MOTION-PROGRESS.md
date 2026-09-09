# Local motion, Progress and Slider review

Completed against the existing development server on 8 September 2026. Publishing remains stopped. No Next build, registry generation, production gate, install audit, commit or push was run in this stream.

## Implemented behavior

The nine flow presets retain distinct travel springs and authored gathering, stretching, trail, skew and aura behavior. Local `data-flow` presets now choose their own travel response instead of accidentally using the global preset's timing. Speed scales stiffness and damping consistently.

Selection coordinates account for the group border and native scroll offset. React text changes trigger a new measurement. Keyboard focus receives the same hover body as a pointer; disabled items receive neither. Selection transfer clears the former hover, offscreen groups settle their paint, and visible groups remeasure on return. Positive layer dimensions are bounded during reversals.

The demonstrated cancellation bug came from Motion's DOM visual-element transform renderer: stopping it could leave a queued transform write after restoration. Landing feedback now uses the existing shared scalar Motion lane and owns only its inline transform. Completion, interruption and teardown restore the exact original transform and transform-origin, including priority. Ripple/halo decorations are removed as well. The standalone press hook also cancels when its target becomes disabled, inert or hidden, or when the document becomes hidden.

Progress now has four actual-value appearances: `organic`, `line`, `segmented` and `orbit`. The first three show a bar or line; orbit shows the same supplied ratio as an arc and a decorative percentage. Value changes move the fill and briefly deform its contour, then settle. There is no idle oscillator. The first visual batch found inherited page beige hiding the fill and invalid unitless CSS transforms stacking segments; both are corrected. Default fill is now locally scoped yellow, and explicit inline `--c` colors retain precedence.

Slider now supports `organic`, `line` and `segmented` rails, with an authored eight-curve thumb. Hover, focus, press and value changes deform the paint. Radix continues to own the real thumb positions, hit testing, values, hidden form inputs, pointer capture, range constraints, RTL, inversion, vertical orientation and keyboard operations. The thumb's 28px box has an 8px hit extension, giving a 44px target. Motion never delays the native value or independently moves the hit target.

Global Motion Off, Flow Off, reduced motion and offscreen visibility settle the new optional contours. Colors remain live CSS role references, so `cojeev:appearancechange` needs no extra repaint listener or motion restart in these files. The preset engine still uses specialized phase geometry; this is a bounded correction of the existing Motion pipeline, not a claim of a fresh universal engine migration.

## Public APIs

```tsx
<Progress value={67} max={100} appearance="organic" />
<Progress value={67} appearance="line" />
<Progress value={67} appearance="segmented" segments={12} />
<Progress value={67} appearance="orbit" />
<Progress value={67} variant="cream" size="lg" />
<Progress variant="unavail" aria-label="Upload progress" />

<Slider appearance="organic" value={value} onValueChange={setValue}
  thumbLabel="Focus duration" />
<Slider appearance="segmented" defaultValue={[20, 70]} name="range"
  minStepsBetweenThumbs={2} step={5}
  thumbLabel={index => index ? "Range end" : "Range start"} />
```

`ProgressAppearance` and `SliderAppearance` are exported. Progress `variant="default" | "cream" | "unavail"`, `size`, `value`, `max`, root props/ref and custom `ProgressIndicator` composition remain available. `segments` is normalized to 3–32. Supplied values clamp to a finite valid range; missing/unavailable values do not invent a completion value. Custom indicators retain `--p` width and `--c` paint. Use a root `aria-label` or `aria-labelledby` for progress.

Slider's existing `variant="default" | "pink"`, controlled/uncontrolled value API, refs and `thumbLabel` remain available. Explicit thumb labels retain priority over an inherited root label; descriptions and invalid state reach the native thumbs. Radix intentionally names a multi-thumb form field `range[]`.

New dedicated examples export `ProgressExample` and `SliderExample` from `components/examples/motion-progress.tsx`. Progress exposes working increment/decrement/complete/reset controls and comparisons using the same real value; Slider includes a working range. Root owns their catalog mappings and registration.

## Acceptance evidence

One initial visual/interaction batch and one visual confirmation were used. The final confirmation passed all families in WebKit 390px dark and Progress/Slider in Chromium 1440px light. All nine Chromium preset iterations completed before a quiet-mode harness assertion sent Space ahead of Radix's deferred ArrowRight focus. A separate **no-screenshot**, quiet/cancellation/unmount-only tail passed with explicit native focus readiness. No source changed for that tail. The original failed receipt remains intact.

| Preset | Rapid pointer transfer | Native keyboard / focus hover | Disabled / resize / group scroll | Mid-landing preset cancellation / idle |
| --- | --- | --- | --- | --- |
| Glide | Pass | Pass | Pass | Pass |
| Stretch | Pass | Pass | Pass | Pass |
| Jelly | Pass | Pass | Pass | Pass |
| Comet | Pass | Pass | Pass | Pass |
| Ink drop (`drop`) | Pass | Pass | Pass | Pass |
| Rubber | Pass | Pass | Pass | Pass |
| Pebble | Pass | Pass | Pass | Pass |
| Ripple | Pass | Pass | Pass | Pass |
| Halo | Pass | Pass | Pass | Pass |

Both contexts also passed:

- Flow Off/global Off remove the travelling layers; reduced motion places them immediately. Native quiet keyboard selection, exact inline restoration and unmount decoration cleanup pass.
- Progress: four distinct appearances; visible fill versus track; separated segment positions; rapid value reversal; 0/100 endpoints; actual aria values; unavailable and max-clamp semantics; custom indicator width; bounded SVG paint; quiet and offscreen stability; live palette role changes.
- Slider: pointer hover/hold/track click/drag, Arrow/Home/End, two-thumb constraints, RTL, inverted and vertical values, disabled state, native form values, quiet interaction, idle contour stability and no document overflow.

Receipts and inspected screenshots:

- [Combined acceptance](output/playwright/review-motion-progress/verified-results.json)
- [Raw visual confirmation](output/playwright/review-motion-progress/confirmation/results.json)
- [Chromium native-focus tail](output/playwright/review-motion-progress/keyboard-tail/results.json)
- [Light Progress](output/playwright/review-motion-progress/confirmation/chromium-1440-progress-settled.png)
- [Dark Progress](output/playwright/review-motion-progress/confirmation/webkit-390-progress-settled.png)
- [Dark Slider held](output/playwright/review-motion-progress/confirmation/webkit-390-slider-held.png)

Reproduce against a running development server:

```sh
rtk proxy node scripts/check-review-motion-progress.mjs --url=http://127.0.0.1:4320/cojeev-ui --output=output/playwright/review-motion-progress/local
rtk proxy node --import tsx --test tests/progress-geometry.test.ts
```

The browser script uses an in-memory source fixture and the existing server's CSS; it does not start or generate a site. It checks native component behavior, not the entire catalog. Optional `--engines=chromium --only=flow --tail=true` runs only the no-screenshot flow tail.

Four focused geometry/timing tests pass. Scoped ESLint passes. The Impeccable detector returned no findings. Root reported its no-emit TypeScript check and repository lint passing after these features; root owns the final canonical compiler check. Earlier duplicated compiler processes stalled on obsolete generated type files and were stopped, not reported as passes.

## Exact source ownership and limits

Changed in this review:

- `registry/cojeev/motion/flow.ts`
- `registry/cojeev/motion/flow-motion.ts`
- `registry/cojeev/motion/flow-press.ts`
- `registry/cojeev/motion/progress-geometry.ts` (new)
- `registry/cojeev/motion/use-organic-value.ts` (new)
- `registry/cojeev/ui/progress.tsx`
- `registry/cojeev/styles/progress.css`
- `registry/cojeev/ui/slider.tsx`
- `registry/cojeev/styles/slider.css`
- `components/examples/motion-progress.tsx` (new)
- `tests/progress-geometry.test.ts` (new)
- `scripts/check-review-motion-progress.mjs` (new)
- This report and scoped artifacts.

`use-flow.ts` and `styles/flow-press.css` retain prior work and were not edited in this review. No token/theme, general morph, scrollbar, menu, catalog/index or package files were edited here. The palette's inherited `--c` issue was resolved inside Progress's own CSS. The assembly owner also observed that exact defect in a nested Progress; final nested assembly confirmation belongs to that owner/root.

The nine-preset fixture covers the shared native Tabs boundary, not every consumer family. Group offscreen suspension and the standalone press hook's ancestor/disabled lifecycle were inspected in source; this batch does not claim a standalone press-hook browser matrix or a performance benchmark. Native Slider pointer drag was exercised in desktop browser automation; this pass does not claim a separate physical touch-device audit. Registration/build/publishing and any further whole-library integration remain with root and are deliberately outside this local source freeze.
