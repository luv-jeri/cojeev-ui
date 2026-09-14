# Documentation component ownership and coverage

The documentation keeps Fumadocs `RootProvider` and `DocsPage` for framework integration. Visible navigation, filtering, appearance, examples, copy actions, typography, badges and prop tables compose Cojeev components. Documentation layout CSS is scoped to the docs/home pages. No reference HTML or reference runtime is imported.

## Public documentation helper

`preview` is a shared helper, separate from the **66 base components**. Source: `registry/cojeev/ui/preview.tsx` and `registry/cojeev/styles/preview.css`. It composes Card, Tabs, CodeBlock, CopyButton and Typography. Its standard section props include `children`, required `code`, optional `title` and `description`. Preview/code tabs use Radix keyboard behavior via Tabs; copy reports success or a usable manual-copy failure message, with native selection fallback on HTTP. The component can be used outside documentation.

The other shared helpers are Icon, Shape and Motion Adjuster. All four have their own live documentation examples.

## Example implementation

- Explicit, typed React examples exist for all 77 public entries. There is no catchall placeholder example.
- Each page renders one configurable live specimen. Variant and size controls select the displayed invocation; the code tab and clipboard use that exact selection. All 246 extracted default, variant and size snippets compile.
- Copyable snippets are extracted from the live example functions with TypeScript AST parsing. Only referenced imports are included, rewritten to consumer `@/components/ui` paths. The example install command includes every component directly imported by that snippet.
- Stateful controls use real local state. Attachment downloads actual generated text; Dropzone lists selected file metadata without uploading; textarea creates a displayed local note; tables filter/sort/page actual data; tabs, menus and overlays use their production APIs; questionnaire answers update progress; stepper, carousel and message scrolling use their contexts.
- The navigation supports filtering, active links, keyboard access, a mobile toggle and a skip link. Appearance persists when local storage is available and synchronizes across tabs. Storage-denied environments still support changes in the current page.
- Publication/fidelity status is stated separately; a rendered docs example is not a visual gate approval.

## Per-entry coverage

| Registry ID | Source variants | Source sizes |
| --- | --- | --- |
| `accordion` |  |  |
| `adjuster` | default | default |
| `alert` | info, ok, warn, danger, pink |  |
| `alert-dialog` |  |  |
| `ambient-background` | drift, orbit, contour |  |
| `animated-number` | default | default |
| `aspect-ratio` |  |  |
| `attachment` |  |  |
| `avatar` | square | lg |
| `badge` | pink, yellow, olive, blue, ink, cream, pink-soft, yellow-soft, olive-soft, blue-soft, danger, pending, count, dashed, caps, test, live | sm, lg |
| `breadcrumb` |  |  |
| `bubble` |  |  |
| `button` | accent, secondary, ghost, outline, danger, block | sm, lg |
| `button-group` |  |  |
| `calendar` |  |  |
| `card` | pink, yellow, olive, blue, ink, cream, featured, panel, lift | sm |
| `carousel` |  |  |
| `chart` |  |  |
| `checkbox` |  |  |
| `code-block` | default | default |
| `collapsible` |  |  |
| `combobox` |  |  |
| `command` |  |  |
| `context-menu` |  |  |
| `data-table` |  |  |
| `date-picker` |  |  |
| `dialog` |  |  |
| `direction` |  |  |
| `drawer` |  |  |
| `dropdown-menu` |  |  |
| `dropzone` |  |  |
| `empty` |  |  |
| `field` | invalid |  |
| `hover-card` |  |  |
| `icon` | default, dashed, ink, pink, beige, cream | default, sm, lg, xl |
| `input` | cream | sm |
| `input-group` |  |  |
| `input-otp` |  |  |
| `item` | selected, flat |  |
| `kbd` |  |  |
| `label` |  | sm |
| `marker` | ok, danger |  |
| `marquee` | default |  |
| `menubar` |  |  |
| `message` | me |  |
| `message-scroller` |  |  |
| `multi-select` | default | default |
| `native-select` | ink |  |
| `navigation-menu` |  |  |
| `pagination` |  |  |
| `popover` |  |  |
| `preview` | default | default |
| `progress` | cream, unavail | lg, sm |
| `questionnaire` |  |  |
| `radio-group` |  |  |
| `resizable` | v |  |
| `scroll-area` | ink |  |
| `select` |  |  |
| `separator` | v |  |
| `shape` | default | default |
| `shape-scene` | default | default |
| `sheet` |  |  |
| `sidebar` |  |  |
| `skeleton` | line, disk, card, skel-group |  |
| `slider` | pink |  |
| `spinner` | point |  |
| `stepper` |  |  |
| `switch` |  |  |
| `table` |  |  |
| `tabs` | underline, lenses |  |
| `text-reveal` | rise, fade | default |
| `textarea` |  |  |
| `toast` |  |  |
| `toggle` | pressed, pink, circle |  |
| `toggle-group` |  |  |
| `tooltip` |  |  |
| `typography` |  |  |
