# Numeric motion and editing overlap review

Captured 2026-09-08. This bounded slice covers eight canonical source entries. Every entry received an individual public desktop/mobile inspection. Six public source bodies were read: Skiper37, four pinned Remocn components and pinned React Bits Count Up. Skiper68 and Skiper69 remain public-preview-only: their Pro source was not requested. The complete machine-readable handoff is `numeric-mapping.json`.

| Reference | Inspected behavior | Native disposition |
| --- | --- | --- |
| [Skiper37](https://skiper-ui.com/v1/skiper37) | Countdown controls, in-view counting and stepped random-number demonstration; public source read | Extend AnimatedNumber with a first-visible `from` entrance, controlled count/roll/steps treatments. Application state owns timers. |
| [Skiper68](https://skiper-ui.com/v1/skiper68) | Transparent native text input with separate animated glyphs. Decimal/negative editing and selection replacement work; long values overflow the mobile preview. Pro source not requested. | New NumberInput adds a missing composed numeric field: native editing, stepping, nullable controlled values and formatted idle animation. Editing remains real visible input text. |
| [Skiper69](https://skiper-ui.com/v1/skiper69) | Shuffle changes independently moving digits, signs and formatted suffixes. Pointer and Enter activation observed. Pro source not requested. | AnimatedNumber `roll` keeps Intl formatting and uses a bounded wheel per decimal place. |
| [Number Wheel](https://remocn.dev/docs/typography/number-wheel) | Integer odometer with late carry, fixed glyph strips and timeline timing | AnimatedNumber `roll`, with signed/decimal/localized values and bounded interruptible travel. |
| [Rolling Number](https://remocn.dev/docs/typography/rolling-number) | Independent place speeds, leading-place reveal and exact landing | The same reusable `roll` treatment. New places reveal, changed places roll; large changes do not create unbounded turns. |
| [Hand Count](https://remocn.dev/docs/typography/hand-count) | Stepped numeric poses, individual glyph offsets and exact frozen endpoint | AnimatedNumber `steps`: twelve authored poses, inherited typography, Intl formatting and finite motion. |
| [Value Swap](https://remocn.dev/docs/typography/value-swap) | Draft → In review → Shipped, vertical overlap/fade and a hidden width sizer | Existing WordRelay with a controlled `index`, `split="phrase"` and `direction`. Independently verified without changing WordRelay. |
| [React Bits Count Up](https://reactbits.dev/text-animations/count-up) | In-view spring count and restart. The early later sample remained 97; the 4.38-second mobile sample reached 100. | AnimatedNumber `count` and optional `from`, with exact bounded completion and final SSR text. |

Remocn source is pinned to `3e03565f5c0001e143c2ed941eea7c3181f13260`; React Bits is pinned to `4bb4491b3879b115eb6758fae7f5b6c3ec7eb0a3`. The live deployments are observations, not claims that the deployed revision equals those commits. `receipts/numeric-family/source-index.json` records source URLs, timestamps and SHA-256 hashes. Research captures use `.tsx.txt` so they never enter TypeScript compilation.

No source implementation was copied. Skiper has custom usage/attribution terms; its Pro source stayed restricted. The pinned React Bits license contains a component-redistribution restriction, so it was used only to understand behavior. Remocn is MIT with a separately licensed Remotion dependency; the native implementation imports neither Remocn code nor Remotion. Existing Motion and native SahaJiv primitives supply the runtime.

## Native API and behavior

AnimatedNumber preserves its value/locale/format/duration/fallback/native-span API. `treatment` adds `count` (default), `roll`, and `steps`. `from` optionally supplies a first-visible entrance value; the server always paints the final formatted value. Changing the key replays an entrance. Duration remains 500ms by default, bounded to 0–2000 before Flow-speed scaling. The shared numeric lane supports deterministic document-clock sampling and retargeting; offscreen, hidden, reduced, global quiet and local flow-off/no-glide boundaries settle immediately.

Intl parts retain signs, grouping, decimal punctuation, currency and other literals. Only decimal digits become wheels, keyed by integer/fraction place. Each wheel needs two visible glyphs rather than a large strip. Numeric runs preserve mathematical digit order inside RTL layouts. Long standalone numbers can wrap; NumberInput's idle text scales within the available field width. Missing/non-finite data remains a fallback, never zero.

NumberInput is the one new base role. `value?: number | null` and `onValueChange` support controlled usage; `defaultValue` supports native form reset for uncontrolled usage. `min`, `max` and `step` control the native button/arrow adjustments. `locale` controls raw decimal editing; `format` controls idle display only. The control renders a real text input with decimal input mode and spinbutton semantics. While focused its native text, caret and selection are visible. Partial text such as `-` stays editable; incomplete text fails native validity, completed IME text commits once composition ends, Enter/blur commit and clamp, and Escape restores the current owner value. Blank means null. Adjustments use `onValueChange`; `onChange` retains its normal native typing-event meaning. Disabled and read-only inputs disable both step buttons. Modified keyboard shortcuts are preserved.

The input ref remains a real input. `className` and `style` decorate the composed outer field; aria labels/descriptions, name, required, events and other native input props go to the input. Buttons have independently configurable `decrementLabel`/`incrementLabel` defaults. They use the existing Flow press behavior.

```tsx
<AnimatedNumber value={total} treatment="roll" locale="de-DE"
  format={{ style: "currency", currency: "EUR" }} />

<AnimatedNumber value={1284} from={0} treatment="steps" />

<NumberInput value={amount} onValueChange={setAmount}
  min={0} max={500} step={0.5} aria-label="Weekly contribution"
  format={{ style: "currency", currency: "USD" }} />
```

Examples are `components/examples/numeric-values.tsx`: `AnimatedNumberExample` accepts the existing `ExampleProps` variant and provides count/roll/steps, values, locale and replay controls; `NumberInputExample` exposes a controlled amount with real reset/clear actions. Root owns catalogue, registry, guide and global CSS registration.

## Validation and limits

The native matrix passes Chromium 1440/390 and WebKit 1440/390: exact signed/grouped/fractional final text in four locales, retained wheel positions during reversal, quiet/hidden cancellation, real pointer/touch and keyboard stepping, partial drafts and selection, controlled rejection, disabled/read-only handling, native form submission/reset, long values, missing values and unmount. The supplement passes Chromium 1440/390 and WebKit390 for first-visible entrance, offscreen cancellation, actual RTL ancestors, IME completion and controlled WordRelay value swaps. Screenshots were visually reviewed; this caught a real Arabic cell-order bug that text equality alone missed, and the final regression checks geometry as well.

Six focused unit/SSR tests cover Intl parts, wheel direction, extreme finite interpolation, precise decimal and safe-integer stepping, localized draft parsing including tiny scientific values and signed zero, final SSR text and real disabled input/button markup. Targeted TypeScript and ESLint pass. Small signed-zero/non-finite-default guards added after the main matrix have separate unit and native edge receipts. No full build, installation, commit or publication was performed.

Primary receipts:

- `receipts/numeric-family/public-final-index.json`: final 16 public entry/width observations; earlier initial/failed-index captures remain historical.
- `receipts/numeric-family/value-swap-late.json`: actual outgoing/incoming value transforms and opacity, beyond initial playback.
- `output/playwright/expansion/numeric-family/results.json`: four native contexts.
- `output/playwright/expansion/numeric-family/supplement.json`: three additional focused contexts.
- `output/playwright/expansion/numeric-family/numeric-edges.json`: final signed-zero/reset edges.
- `.work/numeric-family/`: reproducible isolated fixture, source capture scripts, runtime scripts and scoped TypeScript config.

These are original native UI interpretations. They do not claim source API, fixed-video-timeline or pixel parity. No other canonical source entry is marked inspected by this slice.
