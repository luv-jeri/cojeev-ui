# Documentation component ownership and coverage

The documentation keeps Fumadocs `RootProvider` and `DocsPage` for framework integration. Visible navigation, filtering, appearance, examples, copy actions, typography, badges and prop tables compose SahaJiv components. Documentation layout CSS is scoped to the docs/home pages. No reference HTML or reference runtime is imported.

## Public documentation helper

`preview` is a shared helper, separate from the **66 base components**. Source: `registry/sahajiv/ui/preview.tsx` and `registry/sahajiv/styles/preview.css`. It composes Card, Tabs, Button and Typography. Its standard section props include `children`, required `code`, optional `title` and `description`. Preview/code tabs use Radix keyboard behavior via Tabs; copy reports success or a usable manual-copy failure message. The component can be used outside documentation.

The other shared helpers are Icon, Shape and Motion Adjuster. All four have their own live documentation examples.

## Example implementation

- Explicit, typed React examples exist for all 66 base components and four helpers. There is no catchall placeholder example.
- Every registry source variant/size combination is rendered. Each variant’s code tab includes the same sizes shown in its preview.
- Copyable snippets are extracted from the live example functions with TypeScript AST parsing. Only referenced imports are included, rewritten to consumer `@/components/ui` paths. The example install command includes every component directly imported by that snippet.
- Stateful controls use real local state. Attachment downloads actual generated text; Dropzone lists selected file metadata without uploading; textarea creates a displayed local note; tables filter/sort/page actual data; tabs, menus and overlays use their production APIs; questionnaire answers update progress; stepper, carousel and message scrolling use their contexts.
- The navigation supports filtering, active links, keyboard access, a mobile toggle and a skip link. Appearance persists when local storage is available and synchronizes across tabs. Storage-denied environments still support changes in the current page.
- Publication/fidelity status is stated separately; a rendered docs example is not a visual gate approval.

## Per-entry coverage

| Registry ID | Exported live example | Source variants | Source sizes |
| --- | --- | --- | --- |
| `accordion` | `AccordionExample` | default | default |
| `adjuster` | `AdjusterExample` | default | default |
| `alert` | `AlertExample` | default, info, ok, warn, danger, pink | default |
| `alert-dialog` | `AlertDialogExample` | default | default |
| `aspect-ratio` | `AspectRatioExample` | default | default |
| `attachment` | `AttachmentExample` | default | default |
| `avatar` | `AvatarExample` | default, square | default, lg |
| `badge` | `BadgeExample` | default, pink, yellow, olive, blue, ink, cream, pink-soft, yellow-soft, olive-soft, blue-soft, danger, pending, count, dashed, caps, test, live | default, sm, lg |
| `breadcrumb` | `BreadcrumbExample` | default | default |
| `bubble` | `BubbleExample` | default | default |
| `button` | `ButtonExample` | default, accent, secondary, ghost, outline, danger, block | default, sm, lg |
| `button-group` | `ButtonGroupExample` | default | default |
| `calendar` | `CalendarExample` | default | default |
| `card` | `CardExample` | default, pink, yellow, olive, blue, ink, cream, featured, panel, lift | default, sm |
| `carousel` | `CarouselExample` | default | default |
| `chart` | `ChartExample` | default | default |
| `checkbox` | `CheckboxExample` | default | default |
| `collapsible` | `CollapsibleExample` | default | default |
| `combobox` | `ComboboxExample` | default | default |
| `command` | `CommandExample` | default | default |
| `context-menu` | `ContextMenuExample` | default | default |
| `data-table` | `DataTableExample` | default | default |
| `date-picker` | `DatePickerExample` | default | default |
| `dialog` | `DialogExample` | default | default |
| `direction` | `DirectionExample` | default | default |
| `drawer` | `DrawerExample` | default | default |
| `dropdown-menu` | `DropdownMenuExample` | default | default |
| `dropzone` | `DropzoneExample` | default | default |
| `empty` | `EmptyExample` | default | default |
| `field` | `FieldExample` | default, invalid | default |
| `hover-card` | `HoverCardExample` | default | default |
| `icon` | `IconExample` | default | default, sm, lg |
| `input` | `InputExample` | default, cream | default, sm |
| `input-group` | `InputGroupExample` | default | default |
| `input-otp` | `InputOTPExample` | default | default |
| `item` | `ItemExample` | default, selected, flat | default |
| `kbd` | `KbdExample` | default | default |
| `label` | `LabelExample` | default | default, sm |
| `marker` | `MarkerExample` | default, ok, danger | default |
| `menubar` | `MenubarExample` | default | default |
| `message` | `MessageExample` | default, me | default |
| `message-scroller` | `MessageScrollerExample` | default | default |
| `native-select` | `NativeSelectExample` | default, ink | default |
| `navigation-menu` | `NavigationMenuExample` | default | default |
| `pagination` | `PaginationExample` | default | default |
| `popover` | `PopoverExample` | default | default |
| `preview` | `PreviewExample` | default | default |
| `progress` | `ProgressExample` | default, cream, unavail | default, lg, sm |
| `questionnaire` | `QuestionnaireExample` | default | default |
| `radio-group` | `RadioGroupExample` | default | default |
| `resizable` | `ResizableExample` | default, v | default |
| `scroll-area` | `ScrollAreaExample` | default, ink | default |
| `select` | `SelectExample` | default | default |
| `separator` | `SeparatorExample` | default, v | default |
| `shape` | `ShapeExample` | default | default |
| `sheet` | `SheetExample` | default | default |
| `sidebar` | `SidebarExample` | default | default |
| `skeleton` | `SkeletonExample` | default, line, disk, card, skel-group | default |
| `slider` | `SliderExample` | default, pink | default |
| `spinner` | `SpinnerExample` | default, point | default |
| `stepper` | `StepperExample` | default | default |
| `switch` | `SwitchExample` | default | default |
| `table` | `TableExample` | default | default |
| `tabs` | `TabsExample` | default, underline, lenses | default |
| `textarea` | `TextareaExample` | default | default |
| `toast` | `ToastExample` | default | default |
| `toggle` | `ToggleExample` | default, pressed, pink, circle | default |
| `toggle-group` | `ToggleGroupExample` | default | default |
| `tooltip` | `TooltipExample` | default | default |
| `typography` | `TypographyExample` | default | default |

## Validation

- `npm ci`: 932 packages installed; zero reported audit vulnerabilities.
- TypeScript: passed across all components and documentation.
- Next production build: passed, all 75 routes generated, including all 70 component/helper pages. This used the root’s updated registry builder (read from the main checkout and executed with this worktree as cwd) because helper registration is owned by root.
- Registry build: passed, 71 registry items = one base registry + 66 base components + four shared helpers.
- Focused ESLint: passed for all documentation files and the Preview helper.
- Generated HTML coverage: all 70 pages contained their live preview and SahaJiv sidebar; all 205 required variant/size combinations were present exactly once.
- Bounded docs browser QA now covers all 70 pages at three widths and both themes, with per-entry interaction and visual observations in [DOCS-VERIFICATION.md](DOCS-VERIFICATION.md). This remains separate from the root’s exact reference fidelity gate.
- The earlier malformed WebKit details marker selector warning in Accordion CSS was resolved by its owner before the browser audit.

No new runtime npm dependency was added for documentation or Preview. TypeScript is used at build time for source extraction; all example pages are statically exported.
