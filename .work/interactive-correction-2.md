# Interactive correction checkpoint 2

Scope: owned interactive production components and semantic fixture conversion. The supplied source remains authoritative. No reference file was modified.

## Root causes and changes

- Command's semantic cmdk group wrappers use display:contents. The selected item's text was behind the travelling selection pill because the source only needed direct-child stacking. The owned item now gets source-equivalent position:relative/z-index:1. Bounded360 result: zero style and pixel differences.
- ToggleGroup single selection uses Radix radio roles/aria-checked. CSS and FlowGroup now recognize that state. Composing ToggleGroupItem asChild with Button preserves Button styling without injecting v-toggle. The authored source circle selection precedence from components-2.css1359 is expressed without important, including the Morph fill token. Source alive.css425 suppresses segmented button shadows; the dead earlier unselected shadow declaration was removed.
- InputOTP keeps the public div Slot DOM and real input-otp keyboard/paste input. Group owns the source field-fill flow; slots expose active/inactive state. Its min-height matches the source containing block. Full catalog reference at360 measured a288px group and six43px slots. Original isolated overflow is separate evidence; root owns an explicit common catalog containing-block adapter (catalog/index.html114,122,172).
- Slider paints the authored single-value gradient on its root and updates --p for controlled/uncontrolled values. The source wrapper's border/shadow precedence now targets the actual Radix root. Multi-value/vertical sliders retain a real Radix range. Bounded360 result: zero styles and pixels; Chromium native thumb pseudo computed styles are explicitly unavailable, so physical thumb needs pixels and real drag evidence.
- RadioGroup native labels become real buttons, so text-align:start restores the source inherited label alignment.
- Accordion removes the extra useFlowAppearance hook. Radix temporarily suppresses an initially open content animation while measuring; the component restores the source CSS animation after that initial measurement. Actual source boot resolves vf-enter with flow easing (confirmed by getComputedStyle and animation timing), overriding the earlier components-2 v-acc-in definition. The shared semantic alias therefore remains vf-enter. Reduced motion preserves that animation with duration0 instead of replacing animation-name with none. Root explicitly delegated this narrow flow-press.css change.
- Source Resizable --split counts the complete group including its14px handle. The framework percentages exclude the handle. The fixture converts dimensions through Group.setLayout, preserves user-driven resize values, and reapplies the percentage convention on viewport resize. The initial source track is quantized to Chromium grid layout units (1/64px) before converting into framework flex percentages. The public framework API retains its documented semantics.

## Independent checks

- Final focused registry/gate TypeScript: PASS.
- Focused owned TSX/gate ESLint: zero warnings/errors after converting the measured Resizable fixture to direct JSX ref props.
- Seven changed/related CSS files parsed with PostCSS successfully.
- artifacts/interactive-correction2b-360: Command and Slider exact pass. ToggleGroup2shadow deltas, Popover3width deltas, and Resizable4width deltas diagnosed above. Popover was shared Button/Icon ownership; source18px icon became20px when a composed trigger changed data-slot. Composed owner's4e00fb4 fixes the source class context.

## Final bounded progress

artifacts/interactive-correction2c-360 confirms exact0 styles/0pixels for Checkbox, OTP, NavigationMenu, Popover, RadioGroup, ToggleGroup, Switch, and Tooltip. Command and Slider already exact in2b. The Accordion and Resizable follow-up in2e also passes with exact0 styles/0pixels.

Real candidate interaction receipt .work/interactive-owned-behavior-check.json: typing123 selected the fourth visual OTP slot and its actual field-fill glide; Slider ArrowRight changed40→41, then a real pointer drag changed value to95 and the gradient stop to95%.

The fixed-revision full154-file/six-width interactive matrix remains outstanding. This is not a complete component or interaction proof.
