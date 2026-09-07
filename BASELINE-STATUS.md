# Component baseline status

Built: **66/66 base components**. Latest recorded isolation comparisons: **3096/3252 PASS** (2990 with zero sampled style/pixel differences), **156 FAIL**, **0 unstable**, **0 errors**, **0 pending real opening**, **0 not yet recorded**.

This is a cumulative checkpoint across the frozen runs and targeted corrections listed below. It is not a new single-revision release gate. Active run receipts are snapshotted as written; later rows are not implied. PASS retains the existing pixel comparator allowance and source/candidate self-agreement. Earlier raw-open comparisons without a real trigger event are explicitly pending; Select also requires viewport setup before opening because it dismisses on resize. These remain historical source-comparison verdicts. The owner now authorizes production refinements under PRODUCTION-PLAN.md; that decision does not retroactively turn old failures into passes.

Shared motion, actual interaction and full original entry demos are separate evidence. Card and Badge full entry demos now pass all six widths in both themes, including the previously missing dot/stat/watermark contexts. The 16 additional static families have a 360px entry-demo probe, with Spinner additionally checked across all six widths after restoring the original loader bootstrap. This does not imply complete entry-demo coverage for all 66 components. See [reference runtime findings](REFERENCE-RUNTIME-FINDINGS.md) and the archived motion behavior checks.

| Component | Expected | Pass | Exact | Fail | Unstable | Error | Open pending | Not run |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| accordion | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| alert | 72 | 72 | 72 | 0 | 0 | 0 | 0 | 0 |
| alert-dialog | 24 | 12 | 12 | 12 | 0 | 0 | 0 | 0 |
| aspect-ratio | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| attachment | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| avatar | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| badge | 648 | 648 | 648 | 0 | 0 | 0 | 0 | 0 |
| breadcrumb | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| bubble | 12 | 12 | 8 | 0 | 0 | 0 | 0 | 0 |
| button | 756 | 756 | 756 | 0 | 0 | 0 | 0 | 0 |
| button-group | 24 | 24 | 12 | 0 | 0 | 0 | 0 | 0 |
| calendar | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| card | 240 | 240 | 240 | 0 | 0 | 0 | 0 | 0 |
| carousel | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| chart | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| checkbox | 48 | 48 | 48 | 0 | 0 | 0 | 0 | 0 |
| collapsible | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| combobox | 24 | 12 | 12 | 12 | 0 | 0 | 0 | 0 |
| command | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| context-menu | 24 | 12 | 12 | 12 | 0 | 0 | 0 | 0 |
| data-table | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| date-picker | 24 | 12 | 12 | 12 | 0 | 0 | 0 | 0 |
| dialog | 24 | 12 | 12 | 12 | 0 | 0 | 0 | 0 |
| direction | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| drawer | 24 | 12 | 12 | 12 | 0 | 0 | 0 | 0 |
| dropdown-menu | 24 | 12 | 12 | 12 | 0 | 0 | 0 | 0 |
| empty | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| field | 24 | 24 | 20 | 0 | 0 | 0 | 0 | 0 |
| hover-card | 24 | 12 | 0 | 12 | 0 | 0 | 0 | 0 |
| input | 36 | 36 | 36 | 0 | 0 | 0 | 0 | 0 |
| input-group | 12 | 12 | 10 | 0 | 0 | 0 | 0 | 0 |
| input-otp | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| item | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| kbd | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| label | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| marker | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| menubar | 24 | 12 | 12 | 12 | 0 | 0 | 0 | 0 |
| message | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| message-scroller | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| native-select | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| navigation-menu | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| pagination | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| popover | 24 | 12 | 12 | 12 | 0 | 0 | 0 | 0 |
| progress | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| questionnaire | 24 | 24 | 8 | 0 | 0 | 0 | 0 | 0 |
| radio-group | 36 | 36 | 36 | 0 | 0 | 0 | 0 | 0 |
| resizable | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| scroll-area | 24 | 24 | 0 | 0 | 0 | 0 | 0 | 0 |
| select | 36 | 24 | 24 | 12 | 0 | 0 | 0 | 0 |
| separator | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| sheet | 24 | 12 | 12 | 12 | 0 | 0 | 0 | 0 |
| sidebar | 36 | 36 | 36 | 0 | 0 | 0 | 0 | 0 |
| skeleton | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| slider | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| spinner | 48 | 48 | 48 | 0 | 0 | 0 | 0 | 0 |
| switch | 36 | 36 | 36 | 0 | 0 | 0 | 0 | 0 |
| table | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| tabs | 108 | 108 | 90 | 0 | 0 | 0 | 0 | 0 |
| textarea | 12 | 12 | 10 | 0 | 0 | 0 | 0 | 0 |
| toast | 24 | 12 | 12 | 12 | 0 | 0 | 0 | 0 |
| toggle | 144 | 144 | 144 | 0 | 0 | 0 | 0 | 0 |
| toggle-group | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |
| tooltip | 24 | 24 | 12 | 0 | 0 | 0 | 0 | 0 |
| typography | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| dropzone | 12 | 12 | 12 | 0 | 0 | 0 | 0 | 0 |
| stepper | 24 | 24 | 24 | 0 | 0 | 0 | 0 | 0 |

The local development archive retains each latest measured row, its original verdict, receipt name and receipt SHA-256. Original failures remain unchanged there. The archived receipts are not included in the public source snapshot.

## Receipt sources

- local archive run `full-button` — 756 rows; SHA-256 `be551a19a80279ffc7872ddc1bb2774b99d2ce286a364ea4f02dfba744dc3524`.
- local archive run `full-badge` — 648 rows; SHA-256 `ea0af069f1ff8a58fe2efd38d7ad038e0f0ce56ed3ec33776b35b35db198684d`.
- local archive run `full-card` — 240 rows; SHA-256 `dbebc6aa18a48cfb4835b9500e815b6de133359998c627dbafac467f56e543ea`.
- local archive run `corrected-block` — 108 rows; SHA-256 `86ea4f3c446ec96813920907a5841e6f2eff230745a400f355047cecad148698`.
- local archive run `gate-static-complete` — 324 rows; SHA-256 `587329590449d2107c2c38551acb7935563fc0ce0fcb89867d71be65b7f7e3a0`.
- local archive run `gate-alert-explicit` — 72 rows; SHA-256 `348c492e584d7775c806c5897bf79b0fddcc07dbd69e1791b0cef4f5a1323a15`.
- local archive run `gate-composed-full-frozen` — 360 rows; SHA-256 `7db4bcbe712664e213b98008b0b2376c5bd60096593cdcfe3a76f649ee17647c`.
- local archive run `gate-composed-batch-data-table` — 12 rows; SHA-256 `1eb0cb49bfbb2c36a785e9334f8fea139c267475cf712baa7c73b7ad9946d8a1`.
- local archive run `gate-composed-batch-native` — 6 rows; SHA-256 `df9aff3eb22b9e53d938818a7413a80ef1b04fda19ee4978c4e1725f851519b7`.
- local archive run `gate-composed-batch-sidebar` — 12 rows; SHA-256 `4ebf78c3e6f1117201d4ffecbb8d5d1ff41953fb0bf9bc2f559e40068cd62662`.
- local archive run `gate-composed-textarea-self-recheck` — 6 rows; SHA-256 `fb0a0789de2b05679c0219f8d71e207969ab0ffcc4b95ffc5e782f244f5025c4`.
- local archive run `gate-composed-batch-buttons` — 36 rows; SHA-256 `04aaa53de32dd507e8521e3ab2487ab1a156844dbba8fe173388a64a961b4874`.
- local archive run `gate-composed-button-group-initial` — 12 rows; SHA-256 `b4542d5b57cc33d3a09b754b51c0bbe888df3fb7d9637309d3f8d81b767ce475`.
- local archive run `interactive-full-matrix` — 234 rows; SHA-256 `48b82be055acbfb4443eda9a35431fd5badefe43cec2bf879afa86686768a3dc`.
- local archive run `interactive-partition-a` — 228 rows; SHA-256 `252579a4bdb0c19183e6c79ef23ba4737e588b6332b8af03aed92b8b83eb7cfa`.
- local archive run `interactive-partition-b` — 240 rows; SHA-256 `20577dbf6e6229d68d4d7bf42642ab53d61081e57b4c7ad4bd4628be1399306f`.
- local archive run `interactive-partition-c` — 306 rows; SHA-256 `f5eb520028607e47cc39c87b36c7815858f3395e7a41b067ce7741bb4174347d`.
- local archive run `gate-selection-open` — 18 rows; SHA-256 `efe8dc5a76a4ba61337b8d4bc87726a5d807e16e5bfcddbfa293748c35f5bb46`.
- local archive run `gate-data-table-on` — 12 rows; SHA-256 `c3dc7036e08a3cd3da36dac827947887706436d3f6d1747b126c761655cd7bea`.
- local archive run `gate-questionnaire-final` — 24 rows; SHA-256 `7c7c437acc8df4e3af321f8835ab11ae7c6fea983233efd9ee1923c033bf503b`.
- local archive run `gate-interactive-css-followup` — 90 rows; SHA-256 `775788701351eae659fb3c035f18b759952d7ba868de86f06382fb848e2a8de9`.
- local archive run `gate-toggle-radius` — 36 rows; SHA-256 `79cfd359e35b1086f23de3a57a55110c2659adc38978afee8340ee55c4313d66`.
- local archive run `gate-toggle-group-radius` — 12 rows; SHA-256 `8721c6217e016924f5898524c841dd104d05dd3d262cc623685da70f08e68df4`.
- local archive run `interactive-final-calendar-receipt` — 24 rows; SHA-256 `7bdea9469121ae773ce87fb7a80d024aef544e1bf486c127ead255a51b5e6ebf`.
- local archive run `interactive-final-toggle-group-receipt` — 12 rows; SHA-256 `bd0682a42c4b1d7eff8128158b4d21b5f89f119c5e44472b1b08cc2acf5d4349`.
- local archive run `interactive-final-selection-open-receipt` — 36 rows; SHA-256 `f13bcc0f1b6209e990e11da440507a201e109fdd61f52ed66426cddb507d6517`.
- local archive run `interactive-final-popup-defaults-receipt` — 6 rows; SHA-256 `7aa86db1425dd45b0cadb5fa25fb3978555b169e0d54472633963c539e1e6a22`.
- local archive run `interactive-final-select-before-open-receipt` — 12 rows; SHA-256 `86301c7154bcca1ba5d457b1aaa4642f70de0c66a8dd8af71ee66992b397bc04`.
- local archive run `interactive-final-hover-card-receipt` — 12 rows; SHA-256 `40510027f0445dcb7a805ed383a35c52c98e05a50f6673a44e4abae97e7c0e23`.
- local archive run `interactive-closeout-tabs-receipt` — 6 rows; SHA-256 `beb23c78524f16ee601b6d00fab2f6a85b9123a0bfdfb3f9f870a094cb01cee7`.
- local archive run `interactive-closeout-date-picker-receipt` — 12 rows; SHA-256 `e9dff66d7db6d35a735a91b81b7478a636837b8ea7dc013a777bcc6c3f211491`.
