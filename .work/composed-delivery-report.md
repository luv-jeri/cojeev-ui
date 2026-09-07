# Composed wave delivery — 18/18 implementations

Implementation count is 18/18. This is not a visual PASS claim: all 60 source isolation pages and interaction/motion/browser gates remain for root integration. No placeholder components are included.

## Validation

- `npm ci` completed: 910 packages, zero audit vulnerabilities. No package.json/package-lock.json changes and no new dependencies. The initial shell resolved Node 25.3.0; final TypeScript and composition smoke ran on Node 22.22.0.
- TypeScript passed with temporary cross-worktree paths to static Icon/Label/Progress and motion hooks, and a unified React type path.
- ESLint passed for all 18 owned TSX files.
- 18-component SSR composition smoke passed; checked zero/missing data, empty ring, ring totals, clamped filtered paging, native selection, field aria linkage, questionnaire selection, collapsed names, and stage announcement. Temporary smoke/tsconfig files stay uncommitted in `.work`.
- All 18 stylesheets parsed; 284 scoped rules, no importance flags and no reference runtime imports/browser-global wrappers.
- No browser, fidelity, frozen-motion, keyboard, drag/drop or focus gate was run in this worktree, per the parallel contract.

## Dependencies / integration

Existing npm dependencies used: React, class-variance-authority, @radix-ui/react-slot. Native scroll-snap/native inputs replace unnecessary added carousel/data-table packages; no npm dependency additions.

Cross-wave imports: `ui/icon` (Icon, IconButton, Disk), `ui/label` (Label, LabelProps), `ui/progress` (Progress), `motion/use-flow` (useFlowGroup). Existing sibling Button/Input/Textarea/Table/Pagination are reused. No interactive-wave module import is required. Root must register these dependencies and all same-name CSS files.

## Coverage and exports

### attachment

Type disk, filename, metadata and named action controls; shared Disk/IconButton motion.
Variants: default. Sizes: default. Source states: rest, hover, focus, active.

Exports: `attachmentVariants`, `AttachmentProps`, `Attachment`, `AttachmentTypeProps`, `AttachmentType`, `AttachmentNameProps`, `AttachmentName`, `AttachmentMetaProps`, `AttachmentMeta`, `AttachmentActionsProps`, `AttachmentActions`, `AttachmentActionProps`, `AttachmentAction`.

### breadcrumb

Navigation/list/item/link/current page/separator/back; asChild links and icon back control.
Variants: default. Sizes: default. Source states: rest, hover, focus, active, selected.

Exports: `breadcrumbVariants`, `BreadcrumbProps`, `Breadcrumb`, `BreadcrumbListProps`, `BreadcrumbList`, `BreadcrumbItemProps`, `BreadcrumbItem`, `BreadcrumbLinkProps`, `BreadcrumbLink`, `BreadcrumbPageProps`, `BreadcrumbPage`, `BreadcrumbSeparatorProps`, `BreadcrumbSeparator`, `BreadcrumbEllipsisProps`, `BreadcrumbEllipsis`, `BreadcrumbBackProps`, `BreadcrumbBack`.

### button-group

Controlled/uncontrolled exclusive selection; travelling group; utility circles and source shape silhouettes.
Variants: default. Sizes: default. Source states: on, rest, hover, focus, active.

Exports: `buttonGroupVariants`, `ButtonGroupProps`, `ButtonGroup`, `ButtonGroupItemProps`, `ButtonGroupItem`, `ButtonGroupUtilityProps`, `ButtonGroupUtility`, `ButtonGroupUtilityItemProps`, `ButtonGroupUtilityItem`.

### carousel

Native scroll-snap track, focused arrow-key navigation, previous/next bounds, current dots, resize/content observation and deck offsets.
Variants: default. Sizes: default. Source states: rest, hover, focus, active.

Exports: `useCarousel`, `carouselVariants`, `CarouselProps`, `Carousel`, `CarouselContentProps`, `CarouselContent`, `CarouselItemProps`, `CarouselItem`, `CarouselNavigationProps`, `CarouselNavigation`, `CarouselPreviousProps`, `CarouselPrevious`, `CarouselNextProps`, `CarouselNext`, `CarouselDotsProps`, `CarouselDots`, `CarouselDotProps`, `CarouselDot`, `CarouselDeckProps`, `CarouselDeck`.

### chart

Bars and missing-data strokes, line paths, exact ring circumference/gap calculation, ranked parts, same-data accessible tables; zero ring reports no data.
Variants: default. Sizes: default. Source states: rest, hover, focus, active.

Exports: `ChartDatum`, `ChartContainerProps`, `ChartContainer`, `chartVariants`, `ChartProps`, `Chart`, `chartBarVariants`, `ChartBarProps`, `ChartBar`, `ChartAxisProps`, `ChartAxis`, `ChartLineProps`, `ChartLine`, `ChartLinePathProps`, `ChartLinePath`, `ChartRingSegment`, `ChartRingProps`, `ChartRing`, `ChartRingCenterProps`, `ChartRingCenter`, `ChartRankedRowProps`, `ChartRankedRow`, `ChartRankedLabelProps`, `ChartRankedLabel`, `ChartRankedValueProps`, `ChartRankedValue`, `ChartDataTableProps`, `ChartDataTable`.

### data-table

Generic typed columns, per-filter counts, filtering, client sorting, clamped pages, empty state, row activation and source surface subparts.
Variants: default. Sizes: default. Source states: rest, hover, focus, active, on.

Exports: `DataTableColumn`, `DataTableFilter`, `DataTableProps`, `DataTable`, `DataTableViewportProps`, `DataTableViewport`, `DataTableFiltersProps`, `DataTableFilters`, `DataTableFilterButtonProps`, `DataTableFilterButton`, `DataTablePaginationProps`, `DataTablePagination`, `DataTableEmptyProps`, `DataTableEmpty`.

### dropzone

Keyboard/native picker and drag/drop File callbacks; drag nesting, disabled state, selection receipt; no reading/uploading is performed by the component.
Variants: default. Sizes: default. Source states: over, rest.

Exports: `dropzoneVariants`, `DropzoneFile`, `DropzoneProps`, `Dropzone`.

### field

Default/invalid state; label, Slot control, description/error association; fieldset, legend and group helpers.
Variants: default, invalid. Sizes: default. Source states: error, rest, hover, focus, active.

Exports: `FieldProps`, `Field`, `FieldLabelProps`, `FieldLabel`, `FieldControlProps`, `FieldControl`, `FieldDescriptionProps`, `FieldDescription`, `FieldErrorProps`, `FieldError`, `FieldSetProps`, `FieldSet`, `FieldLegendProps`, `FieldLegend`, `FieldGroupProps`, `FieldGroup`.

### input

Default/cream variants and default/sm sizes; native input API with nativeSize escape hatch; nested wrapper/control/addon/affix/clear parts; source decorative ink/lg/affix classes and native input selectors.
Variants: default, cream. Sizes: default, sm. Source states: rest, hover, focus, active, disabled, error.

Exports: `InputProps`, `Input`, `InputWrapperProps`, `InputWrapper`, `InputControlProps`, `InputControl`, `InputAddonProps`, `InputAddon`, `InputAffixProps`, `InputAffix`, `InputClearProps`, `InputClear`.

### input-group

Nested input/addon/button/text/textarea; source topbar search and scope parts; sibling Button/Input/Textarea reuse.
Variants: default. Sizes: default. Source states: rest, hover, focus, active.

Exports: `inputGroupVariants`, `InputGroupProps`, `InputGroup`, `InputGroupAddonProps`, `InputGroupAddon`, `InputGroupInputProps`, `InputGroupInput`, `InputGroupTextareaProps`, `InputGroupTextarea`, `InputGroupButtonProps`, `InputGroupButton`, `InputGroupTextProps`, `InputGroupText`, `InputSearchProps`, `InputSearch`, `InputSearchScopeProps`, `InputSearchScope`.

### message-scroller

Follow new content only while within bottom threshold; detach/jump state; MutationObserver/ResizeObserver cleaned on unmount.
Variants: default. Sizes: default. Source states: rest, hover, focus, active.

Exports: `messageScrollerVariants`, `MessageScrollerProps`, `MessageScroller`, `MessageScrollerJumpProps`, `MessageScrollerJump`.

### native-select

Real OS select, option and optgroup; default/ink; shared buttons morph hook and native disabled/selection.
Variants: default, ink. Sizes: default. Source states: rest, hover, focus, active.

Exports: `nativeSelectVariants`, `NativeSelectProps`, `NativeSelect`, `NativeSelectOptionProps`, `NativeSelectOption`, `NativeSelectOptGroupProps`, `NativeSelectOptGroup`.

### pagination

Controlled/uncontrolled current page; exact source window [first,current-1,current,current+1,last], ellipses, bounds and live page announcement; native reusable subparts.
Variants: default. Sizes: default. Source states: selected, rest.

Exports: `paginationVariants`, `PaginationProps`, `Pagination`, `PaginationContentProps`, `PaginationContent`, `PaginationItemProps`, `PaginationItem`, `PaginationLinkProps`, `PaginationLink`, `PaginationPreviousProps`, `PaginationPrevious`, `PaginationNextProps`, `PaginationNext`, `PaginationEllipsisProps`, `PaginationEllipsis`.

### questionnaire

Progress, question, label, native radio option group with controlled/uncontrolled selection and source body/disk placement; named parts accept interactive siblings as children.
Variants: default. Sizes: default. Source states: rest, hover, focus, active, checked.

Exports: `questionnaireVariants`, `QuestionnaireProps`, `Questionnaire`, `QuestionnaireProgressProps`, `QuestionnaireProgress`, `QuestionnaireQuestionProps`, `QuestionnaireQuestion`, `QuestionnaireLabelProps`, `QuestionnaireLabel`, `QuestionnaireOptionsProps`, `QuestionnaireOptions`, `QuestionnaireOptionProps`, `QuestionnaireOption`, `QuestionnaireOptionBodyProps`, `QuestionnaireOptionBody`.

### sidebar

Controlled/uncontrolled standalone/provider collapse; preserved trigger, navigation group, labels/count/footer; collapsed accessible names derived from children.
Variants: default. Sizes: default. Source states: collapsed, rest, hover, focus, active, selected.

Exports: `useSidebar`, `SidebarProviderProps`, `SidebarProvider`, `sidebarVariants`, `SidebarProps`, `Sidebar`, `SidebarHeaderProps`, `SidebarHeader`, `SidebarTriggerProps`, `SidebarTrigger`, `SidebarContentProps`, `SidebarContent`, `SidebarGroupLabelProps`, `SidebarGroupLabel`, `SidebarMenuButtonProps`, `SidebarMenuButton`, `SidebarMenuLabelProps`, `SidebarMenuLabel`, `SidebarFooterProps`, `SidebarFooter`, `SidebarMenuBadgeProps`, `SidebarMenuBadge`.

### stepper

Controlled/uncontrolled stage provider, list/item/number/title, done checks, Back/Next bounds and live stage announcement.
Variants: default. Sizes: default. Source states: selected, rest, hover, focus, active.

Exports: `useStepper`, `StepperProps`, `Stepper`, `stepperVariants`, `StepperListProps`, `StepperList`, `StepperItemProps`, `StepperItem`, `StepperIndicatorProps`, `StepperIndicator`, `StepperTitleProps`, `StepperTitle`, `StepperPreviousProps`, `StepperPrevious`, `StepperNextProps`, `StepperNext`, `StepperStatusProps`, `StepperStatus`.

### table

Native table/header/body/footer/row/head/cell/caption; numeric columns and viewport; source row interactions and measured scroll-more fade with observer cleanup.
Variants: default. Sizes: default. Source states: rest.

Exports: `tableVariants`, `TableContainerProps`, `TableContainer`, `TableProps`, `Table`, `TableHeaderProps`, `TableHeader`, `TableBodyProps`, `TableBody`, `TableFooterProps`, `TableFooter`, `TableRowProps`, `TableRow`, `TableHeadProps`, `TableHead`, `TableCellProps`, `TableCell`, `TableCaptionProps`, `TableCaption`.

### textarea

Native textarea and source composer/bar/count; hover/focus/disabled/dark states.
Variants: default. Sizes: default. Source states: rest, hover, focus, active.

Exports: `textareaVariants`, `TextareaProps`, `Textarea`, `TextareaComposerProps`, `TextareaComposer`, `TextareaComposerBarProps`, `TextareaComposerBar`, `TextareaCountProps`, `TextareaCount`.

## Class to export map

Mappings are contextual per entry. CSS source classes are retained. `data-part` values follow the contract; component-specific `data-slot` names scope shipped CSS.

```json
{
  "attachment": {
    ".v-attach": "Attachment",
    ".v-disk": "AttachmentType",
    ".v-attach__name": "AttachmentName",
    ".v-attach__meta": "AttachmentMeta",
    ".v-actions": "AttachmentActions",
    ".v-ibtn": "AttachmentAction"
  },
  "breadcrumb": {
    ".v-crumbs": "Breadcrumb",
    ".v-crumbs a": "BreadcrumbLink",
    "[aria-current=page]": "BreadcrumbPage",
    ".v-crumbs > .v-ibtn:first-child": "BreadcrumbBack"
  },
  "button-group": {
    ".v-seg": "ButtonGroup",
    ".v-seg > .v-btn": "ButtonGroupItem",
    ".v-utility": "ButtonGroupUtility",
    ".v-utility .v-ibtn": "ButtonGroupUtilityItem"
  },
  "carousel": {
    ".v-carousel": "Carousel",
    ".v-carousel__track": "CarouselContent",
    ".v-carousel__track > *": "CarouselItem(asChild)",
    ".v-carousel__nav": "CarouselNavigation",
    ".v-carousel__nav button:first-of-type": "CarouselPrevious",
    ".v-carousel__nav button:last-of-type": "CarouselNext",
    ".v-carousel__dots": "CarouselDots",
    ".v-carousel__dots button": "CarouselDot",
    ".v-deck": "CarouselDeck"
  },
  "chart": {
    ".v-bars": "Chart",
    ".v-bars > i": "ChartBar",
    ".v-axis": "ChartAxis",
    ".v-line": "ChartLine",
    ".v-line path": "ChartLinePath",
    ".v-ring": "ChartRing",
    ".v-ring__c": "ChartRingCenter",
    ".v-prow": "ChartRankedRow",
    ".v-prow__lab": "ChartRankedLabel",
    ".v-prow__val": "ChartRankedValue"
  },
  "data-table": {
    ".v-table-wrap": "DataTableViewport",
    ".v-table": "Table",
    ".v-tabs[data-filters]": "DataTableFilters",
    ".v-tab": "DataTableFilterButton",
    ".v-pager": "DataTablePagination",
    ".v-state.-filtered": "DataTableEmpty"
  },
  "dropzone": {
    ".v-drop": "Dropzone"
  },
  "field": {
    ".v-field": "Field",
    ".v-label": "FieldLabel",
    ".v-help": "FieldDescription or FieldError",
    ".v-input/.v-textarea": "FieldControl(asChild slot around Input/Textarea)"
  },
  "input": {
    "input.v-input": "Input",
    "div.v-input/label.v-input": "InputWrapper",
    ".v-input input": "InputControl",
    ".v-input .v-disk": "InputAddon",
    ".v-affix": "InputAffix",
    ".v-clear": "InputClear"
  },
  "input-group": {
    ".v-igroup": "InputGroup",
    ".v-addon": "InputGroupAddon",
    ".v-igroup input": "InputGroupInput",
    ".v-igroup .v-btn": "InputGroupButton",
    ".v-search": "InputSearch",
    ".v-scope": "InputSearchScope"
  },
  "message-scroller": {
    ".v-scroller": "MessageScroller",
    ".v-scroller__jump": "MessageScrollerJump"
  },
  "native-select": {
    ".v-native": "NativeSelect",
    "option": "NativeSelectOption",
    "optgroup": "NativeSelectOptGroup"
  },
  "pagination": {
    ".v-pager": "Pagination",
    ".v-pager button[data-p]": "PaginationLink",
    ".v-ellipsis": "PaginationEllipsis"
  },
  "questionnaire": {
    ".v-quest": "Questionnaire",
    ".v-quest__progress": "QuestionnaireProgress",
    ".v-quest__q": "QuestionnaireQuestion",
    ".v-quest__q > .v-label": "QuestionnaireLabel",
    ".v-quest__opts": "QuestionnaireOptions",
    ".v-quest__opt": "QuestionnaireOption",
    ".v-quest__opt-body": "QuestionnaireOptionBody"
  },
  "sidebar": {
    ".v-sidebar": "Sidebar",
    ".v-brand": "SidebarHeader",
    ".v-collapse": "SidebarTrigger",
    ".v-nav": "SidebarContent",
    ".v-nav__group": "SidebarGroupLabel",
    ".v-nav__item": "SidebarMenuButton",
    ".v-nav__label": "SidebarMenuLabel",
    ".v-nav__count": "SidebarMenuBadge",
    ".v-sidebar__foot": "SidebarFooter"
  },
  "stepper": {
    ".v-stepper-flow": "StepperList (inside Stepper provider)",
    ".v-step": "StepperItem",
    ".v-step__n": "StepperIndicator",
    ".v-step__t": "StepperTitle",
    "[data-step-back]": "StepperPrevious",
    "[data-step-next]": "StepperNext",
    "[data-step-say]": "StepperStatus"
  },
  "table": {
    ".v-table-wrap": "TableContainer",
    ".v-table": "Table",
    "thead": "TableHeader",
    "tbody": "TableBody",
    "tfoot": "TableFooter",
    "tr": "TableRow",
    "th": "TableHead",
    "td": "TableCell",
    "caption": "TableCaption"
  },
  "textarea": {
    ".v-textarea": "Textarea",
    ".v-composer": "TextareaComposer",
    ".v-composer__bar": "TextareaComposerBar",
    ".v-composer__count": "TextareaCount"
  }
}
```

## Fixture conversion notes

- Preserve source children, labels, inline style/custom variables and default native values when mapping fixtures. Use semantic variant/size props for declared axes. Context decorative modifiers remain className.
- Carousel: wrap source track/nav/dots in Carousel; CarouselContent is the actual scrolling viewport. Use CarouselItem asChild around the original Card to avoid extra layout nodes. CarouselDots generates dots from measured track children when children are omitted. Previous/Next are specific named controls, and the viewport receives keyboard navigation.
- Stepper: put the list and sibling Back/Next/status inside one Stepper provider (`count`, `value` or `defaultValue`, optional `labels`). Map the source ol to StepperList; each item and indicator require the 1-based `step`. StepperItem derives done/current state from provider, and StepperIndicator derives the completed check.
- Questionnaire: source options require one QuestionnaireOptions group with `name`, `value`/`defaultValue`; each QuestionnaireOption receives its source radio value. It renders its own radio input, so do not also copy the input child. Preserve the disk and body children. Other radio/weekday/checkbox groups are sibling components placed inside QuestionnaireQuestion. Progress requires numeric `value` and `total`; a custom children tree preserves exact authored markup.
- DataTable: for a reusable dataset example, parse source th headings into typed `columns` and td rows into `data`, expose per-column cell renderers for badges/icons/actions, and create filter predicates from source row fields. Do not scrape/populate via demo behavior. For exact static oracle markup, compose DataTableViewport + Table subparts + DataTableFilters + DataTablePagination and retain `data-static-fixture`; supply pressed callbacks for interactive gate states. Generic DataTable provides sorting and synchronized filter counts, pages and empty state from the single supplied dataset.
- Chart: source bars use Chart with explicit children or `data`; ChartBar requires numeric value/max and source ink/dash/pink variant. Ring parses `data-segs` into `{label,value,color}` segments, plus source strokeWidth/gap/unit; generated SVG uses the literal circumference algorithm. Set `showTable=false` only when the fixture already supplies its own equivalent table alternative. ChartLine accepts the original source paths/points via ChartLinePath; its data alternative must be supplied by data or an equivalent sibling table.
- Field: use Field controlId from source for stable for/describedby links and FieldControl around Input/Textarea to derive invalid/description. Native Input has `size` as the authored size axis; HTML numeric size is `nativeSize`.
- Sidebar derives an accessible name from child labels for collapsed links; source explicit aria-label takes precedence. The reusable primitive is container-sized and never uses viewport height.
- Dropzone provides actual native file selection and File callbacks, reads/uploads nothing by itself, and emits a selection receipt. Source demo simulation text should be passed as fixture children, not hardcoded into the library.

## Remaining verification / limits

- Whole-wave visual and behavior gates, registry packaging, consumer install, and docs examples are intentionally root-owned next work. No exception to visual fidelity has been claimed.
- Source names include incidental demo helper classes and 17 out-of-scope composites; this wave ports only the 18 base entries and the explicitly named source subparts.
- Selection callback/state behavior has static and type evidence; real browser resizing, scroll following, focus, drag/drop, native picker, and all flow characters still require the integrated gate.
- The .work class map above is the integration handoff; no registrybuilder/gate/docs/global-motion files were modified.
