# Final primitive motion audit

September 8, 2026. Working-tree audit against the existing Next dev server at `http://127.0.0.1:4320/cojeev-ui`. No registry generation, Next build, commit, or publication was performed by this stream.

## Repeatable check

Run `rtk proxy node scripts/check-overhaul-primitives.mjs --url=http://127.0.0.1:4320/cojeev-ui`. Optional arguments: `--widths=1440,390`, `--only=theme,icons,depth,spinner,skeleton`, and `--output=PATH`.

The check opens an independent Chromium browser. It uses actual docs examples for component behavior, plus an isolated in-memory React consumer fixture for native SVG props/ref, Card+MotionSurface composition, and applying shared theme colors. The fixture uses the real components and existing page styles. It does not change application examples or generate registry/build output.

## Demonstrated defects and fixes

1. **Validation SVG contract.** The custom check/x SVG ignored supplied id, accessible label, aria-hidden override, style, size, and ref. It now shares Icon's class construction and forwards native SVG props/ref. A mounted consumer proves a 24px large icon, supplied red color, role=img, aria-hidden=false, its label, and an actual SVG ref. Names such as circle-check retain their own icon geometry instead of being replaced by a plain check.
2. **Pointer/focus overlap.** A Settings icon stopped when the pointer left even while its button remained focused. Hover and focus now have separate state; either can engage the icon. Blur stops it when no pointer engagement remains.
3. **Offscreen icon settling.** After leaving the viewport, a validation icon still ran its return spring (scale .958 to .999 in two samples). Non-permitted states now settle immediately, including the validation path. Visible interaction retains its spring return.
4. **Card depth composition.** A Card with 22px lifecycle translation and -3px depth lift computed 22px, so the lift was lost. Its CSS now adds both channels with explicit ownership: the same native Card computes 19px while retaining its independent rotation and contour transform. Keyboard focus produces a -1.8px lift; quiet modes reset depth to zero.
5. **Spinner point variant.** The original handoff declares a point variant but supplies no distinct point geometry rule. The implementation now provides a sharper four-point breathing contour, distinct from the default pebble/star/puff cycle. Both use the same seed language, turning motion, and ink core. Quiet point remains visibly distinct. No ring-spinner variant was introduced.
6. **Interrupted theme cleanup.** Switching Off or reduced motion during an active crossfade left a queued intermediate token, such as `rgba(73,70,66,1)`, instead of the requested dark endpoint. Cleanup now restores original token declarations again in Motion's post-render phase, guarded against any newer owner. Both viewport cases pass exact endpoint color and empty temporary inline tokens after interrupting midflight.
7. **CSS ownership and lint.** Removed the stream's `!important` declarations. Motion flow selectors outrank legacy phase transitions/animations, including pseudo-element ripple paint; the Radix sentinel remains in the flow layer. TextReveal animates private CSS variables, allowing normal reduced/Off CSS to reveal words without competing with inline opacity/transform. Presence's quiet CSS needs no priority override. A `prefer-const` issue in theme transition cleanup was also corrected.

## Browser coverage

| Primitive | Verified at 1440px and 390px |
| --- | --- |
| ThemeToggle / applyTheme | Actual sun-to-moon path interpolation; pointer and Space callback; rapid reversal; intermediate root color between light `#fbf4e6` and dark `#171512`; temporary inline token cleanup; Off, Flow Off, and reduced motion; Off/reduced interruption during an active crossfade |
| AnimatedIcon | Actual Settings rotation on hover; continued engagement after focused pointer leave; stop on blur; changing stroke draw length; intermediate check/x geometry; explicit active state; quiet modes and immediate offscreen settling |
| Card depth | Actual pointer lift/rotation; additive MotionSurface translation; native SVG contract fixture; keyboard lift; zero depth in quiet modes |
| Spinner | Contour changes; all contour/rotation/core paint stays static in quiet modes and offscreen; resumes on return; meaningful status label; distinct point contour, active breathing, and reduced static state |
| Skeleton | Actual sheen movement; quiet/offscreen static state; resumes on return; supplied accessible label remains |

Light-theme screenshots cover each tested primitive and both Spinner variants. Theme assertions inspect actual light/dark endpoint and midflight colors. This is a Chromium behavior audit, not a cross-browser or full dark-theme visual acceptance claim.

## Integration regressions

- Final shared typecheck and focused ESLint on the changed primitive files/script passed. The full lint run cleared the CSS rule; at that run, other streams still had setState-in-effect errors in agent.tsx and chart.tsx, which were reported to the parent.
- After the CSS priority cleanup, all nine shared flow presets passed rapid reversal with exact endpoint bounds and zero running group animations. That stream run stopped at the old `Motion speed` slider locator. The parent subsequently corrected Slider labeling and reported a complete 9-preset + 5-auxiliary pass. Evidence: `artifacts/production-motion/results.json`; the auxiliary rerun belongs to parent integration.
- Dialog exit sampled opacity .797 during the retained sentinel, then unmounted and returned focus; rapid reopen and immediate reduced removal passed. Toast sampled .855 before removal. Evidence: `output/playwright/overhaul-motion/presence-results.json`.
- TextReveal still produced real ordered per-word opacity and restored all words to opacity 1/transform none when reduced motion changed during the reveal. Document scrollbar drag, keys, hash navigation, and touch also remained functional in that targeted check. Evidence: `output/playwright/overhaul-motion/page-results.json`.

## Evidence and boundaries

**All 10 primitive/viewport cases have passing latest evidence.** The main run is `output/playwright/overhaul-primitives/results.json`. Its failed offscreen-icon cases are retained as discovery evidence. The corrected icon cases are in `icons-final/results.json`; strengthened all-layer Spinner checks are in `spinner-final/results.json`; theme interruption checks are in `theme-final/results.json`. `verified-results.json` selects the latest result for each primitive/width and records those source files.

No universal migration claim is made here. Existing bespoke surface geometry remains its own contour engine, CSS still supplies paint, and conditional removal requires a persistent external presence boundary. Parent-owned charts, tabs, registry closure, and full application gates remain separate integration work.

## Frozen source refresh list

The final primitive audit changed these nine registry files; the source stream is now frozen:

- `ui/animated-icon.tsx`
- `ui/icon.tsx`
- `ui/spinner.tsx`
- `ui/text-reveal.tsx`
- `motion/theme-transition.ts`
- `styles/card.css`
- `styles/flow-press.css`
- `styles/presence.css`
- `styles/text-reveal.css`

Paths are relative to `registry/cojeev/`. ThemeToggle TSX, Card TSX, use-depth, Skeleton, and their other styles were inspected and not edited by this final audit. The only additional source artifact is `scripts/check-overhaul-primitives.mjs`.

After the freeze request, the finish reviewer supplied a separate Questionnaire hover-opacity defect. This stream forwarded its selector and screenshot to the parent and made no further source edit. It is outside this completed primitives pass, not silently marked resolved here.
