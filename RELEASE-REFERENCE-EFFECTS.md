# Reference collection release

Adds 35 new Cojeev components covering 41 requested references. Six mappings reuse or consolidate existing APIs. The public guide explains each mapping, category and landing-page placement.

Text Loop/Circular Text/Curved Loop reuse Text Ribbon; Split Text reuses Text Reveal; Text Pressure uses Variable Proximity pressure; Clip Path uses Image Masking clip. New Motion Drawer and Linear Modal reuse existing Sheet/Dialog semantics.

All new entries expose public shadcn install commands and generated registry payloads. The addition scripts preserve publication status on later runs. Copied examples resolve through installed module paths. Each new component is included in the production documentation behavior gate.

Validation: release lint, 148 unit tests, 159 default examples and 723 variant/size snippets, plus production build. The implementation was additionally checked in 82 desktop/mobile reference cases, focused WebKit cases, eight runtime regressions and a fresh registry consumer. Deployment remains gated by the existing complete GitHub Actions workflow.

Prepared from current remote main, with only the reference collection and its integration changes. Unrelated local Semantic Bloom and reporting work remain in the original checkout.
