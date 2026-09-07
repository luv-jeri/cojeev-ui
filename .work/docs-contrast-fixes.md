# Alert and Button Group visibility fixes

Implementation base: `cce04c9`. Production changes are confined to `registry/sahajiv/styles/alert.css`, `styles/button-group.css`, and `ui/button-group.tsx`.

## Problems and changes

**Button Group:** the generic dark default Button selector has higher specificity than the group's inactive styling. It painted inactive Day and Month pink, matching the travelling Week selection. Group items now use the existing transparent ghost base, leaving selection paint to the group and Flow. The dark selected fallback also explicitly uses pink when motion is Off, when the travelling layer is removed. Native value changes, focus and disabled behavior keep the existing primitives.

**Alert:** the standard AlertIcon body is authored transparent, so its fixed black glyph sat directly on dark default/info/ok/warn surfaces; danger's white glyph also sat on a pale light surface. Glyphs now use theme text ink, with danger ink for danger and fixed accent ink for pink. The shape/body paint policy is unchanged. Reviewing the six variants exposed an adjacent dark-pink issue: its description and ghost action inherited dark-surface foregrounds. Scoped pink-surface rules keep secondary copy and enabled ghost actions legible, including hover.

These are deliberate production readability fixes, not attempts to reproduce the historical source-export defects.

## Focused evidence

`node .work/verify-docs-contrast.mjs` starts/stops a local fixture on port 4355 using the real `AlertExample` / `ButtonGroupExample` functions and actual production `app/globals.css`. No broad docs matrix or motion gate was repeated.

The four light/dark × Subtle/Off contexts pass:

- Six Alert variants per context: **24 glyph checks**, minimum measured contrast **5.30:1**.
- Alert descriptions: **24 checks**, minimum **5.80:1**.
- Alert action text: **24 checks**, minimum **11.38:1**; pink ghost hover minimum **8.73:1**.
- One distinct selected Button Group item before interaction, after a real pointer click, and after keyboard Space. Every inactive item remains transparent; the selected item has visible selection paint in both motion modes.
- Zero browser page errors.

Colors are read from computed styles and converted by browser Canvas to sRGB for relative-luminance calculations. This validates these actual surfaces and glyphs, not a blanket component accessibility certification. Screenshots in `output/playwright/docs-contrast/` were visually inspected, including final dark-pink detail.

Receipts: `.work/docs-contrast-baseline.json` retains the measured original colors; `.work/docs-contrast-verification.json` retains the final checks. The original screenshot review/checklist covers all 77 default desktop-light/mobile-dark pairs in `.work/docs-default-visual-review.md` and `.work/docs-visual-review/review-checklist.json`.

Focused registry TypeScript, ButtonGroup ESLint, CSS parsing/no-important checks, and git whitespace checks pass. Remaining visual findings V3 Navigation Menu counts, V4 Sidebar chevron, and V5 default Tabs padding were handed to root/other owners; this commit does not touch their files.
