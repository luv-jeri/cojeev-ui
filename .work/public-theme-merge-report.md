# Direct component installation: theme merge proof

Candidate foundation passed the actual shadcn installer and browser check on 2026-09-08. Local source candidate `bd4a239` corresponds to public `6408c5f`; foundation SHA-256 was `7f7324e45bec802c4b18bbb1c09d74b3597dc2cce9ea87db49e166c7b5d7d3b6`, with manifest `8cdc014555da7eb2c07db8c6f91f51943d063f6d76f436a2c8ed184498aaf0b6`.

## Actual installation and rendering

The probe copied the existing public-only Vite/React/Tailwind consumer `/tmp/sahajiv-ui-stranger-qFCcg0` into a new external temporary directory, preserving its initialized neutral shadcn `:root`, `.dark`, Geist `font-sans`, class-only dark variant, and installed dependencies. It served the candidate registry locally and used the public `shadcn/registry` `addRegistryItems` API from pinned shadcn 4.21.0. Only Button and Card were requested explicitly; the foundation arrived as their dependency. `overwriteCssVars` was omitted. Only registry dependency URLs were redirected to the local server.

An isolated Chromium viewport of 1200 × 900 rendered a default Card and a Tailwind dark-utility specimen in the copied app. The existing Theme control selected light and dark; a third row removed `data-mode` to check defaults. The original consumer stylesheet hash remained unchanged. Runtime was 11.99 seconds, with zero page errors. Browser and both owned servers closed afterward.

| Mode | Body background / foreground | Card background / foreground | Dark utility |
| --- | --- | --- | --- |
| No data-mode | `rgb(251,244,230)` / `rgb(14,11,11)` | `rgb(238,231,218)` / `rgb(14,11,11)` | `rgb(4,5,6)` |
| Light | `rgb(251,244,230)` / `rgb(14,11,11)` | `rgb(238,231,218)` / `rgb(14,11,11)` | `rgb(4,5,6)` |
| Dark | `rgb(23,21,18)` / `rgb(246,239,226)` | `rgb(34,31,27)` / `rgb(246,239,226)` | `rgb(1,2,3)` |

Each canvas, foreground, Card background, and sidebar foreground was asserted against the resolved authored token. Body font remained DM Sans; the host-owned `--font-sans` remained Geist. Raw values and the disposable copy location are in [public-theme-merge-proof.json](public-theme-merge-proof.json).

## Why the correction works

Inspection of installed `node_modules/shadcn/dist/chunk-B2MD6U5O.js` found:

- Internal `La`/`Rh` (line 134) decide CSS-variable replacement from explicitly requested registry items. A dependency-only `registry:base` does not enable replacement of existing neutral variables.
- `Td` (line 101) preserves existing CSS-variable declarations when replacement is disabled. `Pd` (line 103) leaves an existing class-only dark variant in place.
- The native CSS merge through `Ld` (line 111) and `Ge` (line 124) supports adding the later `:root, :root[data-mode]` semantic bridge and the exact data-mode custom variant. The default root selector supplies default values; the data-mode selector provides specificity for explicit light/dark operation. The final Tailwind custom variant includes data-mode.
- A separate in-memory check through the installed native CSS transformer confirmed a second merge was byte-identical, with one bridge and the data-mode variant last. This is transformer idempotence evidence, not a second complete installer/browser run.

The final candidate excludes the five layout knobs from semantic color aliases and includes corrected primary/sidebar color mappings. An attempted native `@theme inline` variable override was unsupported by this CLI merge path. No font-sans override is needed: SahaJiv exposes and uses its own text/display font tokens.

## Replay and limits

Run the focused probe from this checkout, which must have its pinned shadcn, Vite, React plugin, Tailwind plugin, and Playwright dependencies installed:

```sh
rtk proxy node .work/probe-public-theme-merge.mjs /path/to/existing-consumer /path/to/candidate/public/r /path/to/receipt.json
```

The consumer fixture must contain `src/index.css`, `src/App.tsx`, `components.json`, installed dependencies, the existing Theme select, and Card imports. It is a reusable probe for this real initialized scaffold, not a universal consumer-app generator. Input paths are command arguments; it always works in a new external temporary copy. The archived receipt remains from the successful run before path arguments were introduced; the argument-only edit received a syntax check.

The initial harness copy filter mistakenly removed dependency directories named `dist`, causing Vite package-entry failures. Restricting that exclusion to the consumer's top-level `dist` corrected the fixture; it was not a library defect. The successful run preserved dependency build directories.

This check covers the candidate installer merge and the three listed rendered modes. It does not claim mobile coverage, fresh dependency installation, all component interactions, the final deployed public rerun, or CI completion. Those are separate release checks. No production files, package scripts, or CI gates were changed for this evidence.
