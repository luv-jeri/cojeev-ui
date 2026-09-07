# Reference issues to revisit after the baseline

The owner prioritised exact matching before improvements. This file separates issues observed in the supplied design from mistakes in the React port. None is a blanket fidelity waiver.

- **Dark Card text:** the original dark rule for `.v-card .v-meta`, `.v-body-2` and `.v-caps` overrides the ink used on physical pink/yellow/olive/blue surfaces. Keep the authored baseline; review contrast in the next improvement stage.
- **Bubble timestamp:** the original timestamp uses `--structure-text` while its container uses `--v-ink`, which changes in dark mode. Keep the original baseline and revisit the mismatched surface/foreground pair later.
- **Morph effects under the complete component cascade:** `components-2.css` rules at lines 460 and 483 override fills on echo, sheen, grain and color paths. The engine-only comparison and full-cascade comparison must be reported separately. The baseline gate must retain this difference until resolved against the actual reference.
- **Frozen flow cancellation:** the original frozen clock returns an object handle which a cancellation branch passes to native `clearTimeout`. The motion gate documents its narrow clock adapter and records the literal-source probe; normal runtime behavior is the target.
- **Missing loader runtime in isolation pages:** the full catalog loads original `js/alive.js` (catalog/index.html:202); generated isolation pages omit it. Pages containing `.v-pulse` are served with that original runtime restored, and the gate records the bootstrap adapter. Reference files remain unchanged. The earlier untouched-loader FAIL screenshots are retained in `artifacts/gate-smoke`.

The documentation Preview's local muted-text reset addresses context introduced by the documentation helper. It does not change a component's authored standalone colors.
