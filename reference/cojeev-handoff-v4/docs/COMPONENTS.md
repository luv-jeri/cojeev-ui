# COMPONENTS.md — Cojeev Design System component reference

Generated from `vriksha/catalog/reg-*.js` on 2026-09-05. Live demos: `vriksha/catalog/index.html`. Evidence codes are Intelly boards I01–I21 (research/REFERENCE-ANALYSIS.md); **Ext** = derived extension.

Shared contract: sizes sm 32 / md 40 / lg 48 · states default, :hover (fill deepens), :active (translateY 1 px), :focus-visible (2 px mulberry ring, offset 2), :disabled (`--v-disabled-fill`), aria-invalid (1.5 px danger border + message line), aria-busy (spinner replaces icon, width locked) · keyboard per WAI-ARIA (ui.js) · text never truncates; icon-only controls carry aria-label · reduced motion honoured.

## Honest tab semantics
A `[role=tablist]` is only used where real `[role=tabpanel]` elements exist and each tab carries `aria-controls`. A group of buttons that narrows one list is **not** a tablist: use `.v-tabs[data-filters] role="group" aria-label="…"` with `aria-pressed` on each button (see **Data Table** and **Tabs**). `demo-behaviour.js` enforces this by converting any panel-less tablist it finds.

## Chart data alternatives
Every chart must ship a text equivalent covering all plotted values. `.v-ring` generates one automatically from `data-segs` (arcs, centre total, legend and a `.v-sr` table with a Total row all come from the same numbers). Bar charts carry a hand-written `.v-sr` table. The line chart and ranked-bar rows do not yet — see `AUDIT.md` remaining issue 3.

## Base components (64)

### Accordion
- Evidence: Ext I11 · derived extension
- API: .v-acc > details > summary + .v-acc__body · native disclosure, one or many open
- Demo: `catalog/index.html#accordion` · React: `react/Accordion.tsx`

### Alert
- Evidence: I12 I16 · source-evidenced
- API: .v-alert.-info|-ok|-warn|-danger|-pink · icon + __title + __text · word carries meaning, never colour alone
- Demo: `catalog/index.html#alert` · React: `react/Alert.tsx`

### Alert Dialog
- Evidence: Ext I07 · derived extension
- API: .v-dialog[data-dialog] opened by [data-dialog-open="#id"] · role=alertdialog · destructive named in words · focus trap, Escape, return
- Demo: `catalog/index.html#alert-dialog` · React: `react/AlertDialog.tsx`

### Aspect Ratio
- Evidence: I05 I17 I20 · source-evidenced
- API: .v-ratio style="--ar:16/9" > img|div
- Demo: `catalog/index.html#aspect-ratio` · React: `react/AspectRatio.tsx`

### Attachment
- Evidence: I09 I16 I17 · source-evidenced
- API: .v-attach · black disk type + __name + __meta + .v-actions (two outline circles)
- Demo: `catalog/index.html#attachment` · React: `react/Attachment.tsx`

### Avatar
- Evidence: I04 I11 I18 · source-evidenced
- API: .v-avatar[.-square][.-lg] · .v-hex + .v-hexgroup · .v-avatar-wrap > .v-edit (star-4 badge)
- Demo: `catalog/index.html#avatar` · React: `react/Avatar.tsx`

### Badge
- Evidence: I03 I18 · source-evidenced
- API: .v-badge.-pink|-yellow|-olive|-blue|-ink|-cream|-*-soft|-danger|-pending|-count|-dashed|-caps|-test|-live[.-sm|-lg]
- Demo: `catalog/index.html#badge` · React: `react/Badge.tsx`

### Breadcrumb
- Evidence: I16 · source-evidenced
- API: .v-crumbs > .v-ibtn.-dashed (back) + a + separator icon + [aria-current=page]
- Demo: `catalog/index.html#breadcrumb` · React: `react/Breadcrumb.tsx`

### Bubble
- Evidence: I09 I16 · source-evidenced
- API: .v-bubble[.-me] · cream on ink, pink for the person
- Demo: `catalog/index.html#bubble` · React: `react/Bubble.tsx`

### Button
- Evidence: I07 I15 I18 · source-evidenced
- API: .v-btn[.-accent|-secondary|-ghost|-outline|-danger][.-sm|-lg|-block] · states: :hover :active :focus-visible :disabled [aria-busy] · add data-morph for the alive body
- Demo: `catalog/index.html#button` · React: `react/Button.tsx`

### Button Group
- Evidence: I15 I18 · source-evidenced
- API: .v-utility (joined black circles) · .v-seg (segmented pills, aria-pressed)
- Demo: `catalog/index.html#button-group` · React: `react/ButtonGroup.tsx`

### Calendar
- Evidence: I15 · source-evidenced
- API: .v-cal[data-cal][data-selected=YYYY-MM-DD] · grid roles, arrow-key navigation across months, pink selected disk, week numbers · emits v-date
- Demo: `catalog/index.html#calendar` · React: `react/Calendar.tsx`

### Card
- Evidence: I07 I11 I15 I17 · source-evidenced
- API: .v-card[.-pink|-yellow|-olive|-blue|-ink|-cream|-featured][.-sm|-panel][.-lift] > .v-wm.v-shape (watermark) + __head + __title
- Demo: `catalog/index.html#card` · React: `react/Card.tsx`

### Carousel
- Evidence: I11 · source-evidenced
- API: .v-carousel[data-carousel] > __track (scroll-snap) + __nav · .v-deck (offset stacked cards)
- Demo: `catalog/index.html#carousel` · React: `react/Carousel.tsx`

### Chart
- Evidence: I07 I09 I15 I16 I18 · source-evidenced
- API: .v-bars > i[style=--p][.-ink|-dash|-pink] + .v-axis · svg.v-line path.-hist|-next|-cross · .v-ring[data-segs][data-sw] · .v-prow (ranked) · dashed = missing (data-missing) never colour alone · each chart ships a table alternative
- Demo: `catalog/index.html#chart` · React: `react/Chart.tsx`

### Checkbox
- Evidence: I07 · source-evidenced
- API: label.v-check > input[type=checkbox] · states checked / indeterminate / disabled
- Demo: `catalog/index.html#checkbox` · React: `react/Checkbox.tsx`

### Collapsible
- Evidence: Ext I11 · derived extension
- API: details.v-collapsible > summary + __body · for technical detail behind plain language
- Demo: `catalog/index.html#collapsible` · React: `react/Collapsible.tsx`

### Combobox
- Evidence: I07 · source-evidenced
- API: .v-combo[data-combo] > .v-input > input + .v-menu > .v-menu__item · filter, highlight, ArrowUp/Down, Enter, Escape · emits v-pick
- Demo: `catalog/index.html#combobox` · React: `react/Combobox.tsx`

### Command
- Evidence: Ext I15 · derived extension
- API: .v-cmd[data-command] > __input + __list (.v-menu__group / .v-menu__item) + __empty · filter across groups, arrow keys, Enter
- Demo: `catalog/index.html#command` · React: `react/Command.tsx`

### Context Menu
- Evidence: Ext I18 · derived extension
- API: [data-context="#menu"] · right-click opens .v-menu at the pointer · roving focus, typeahead, Escape
- Demo: `catalog/index.html#context-menu` · React: `react/ContextMenu.tsx`

### Data Table
- Evidence: I18 · source-evidenced
- API: .v-table-wrap > .v-table · th grey 12 · td 72 · .-num right/tabular · status pills · trailing .v-actions · filters as pill tabs · empty / filtered-empty / error rows
- Demo: `catalog/index.html#data-table` · React: `react/DataTable.tsx`

### Date Picker
- Evidence: I07 I15 · source-evidenced
- API: .v-menuhost[data-datepicker] > button.v-select.-ink > [data-value] + .v-popover > .v-cal[data-cal] · Escape closes, focus returns
- Demo: `catalog/index.html#date-picker` · React: `react/DatePicker.tsx`

### Dialog
- Evidence: Ext I07 · derived extension
- API: .v-dialog[data-dialog] r28 cream · [data-dialog-open] · [data-close] · focus trap · Escape · scrim click · focus returns to opener
- Demo: `catalog/index.html#dialog` · React: `react/Dialog.tsx`

### Direction
- Evidence: Ext · derived extension
- API: dir="rtl" on any ancestor · logical properties flip layout; brand shapes, watermarks and photos never mirror
- Demo: `catalog/index.html#direction` · React: `react/Direction.tsx`

### Drawer
- Evidence: I07 · source-evidenced
- API: .v-drawer[data-drawer] black bottom panel attached above the dock · [data-drawer-open] · Escape / scrim / [data-close]
- Demo: `catalog/index.html#drawer` · React: `react/Drawer.tsx`

### Dropdown Menu
- Evidence: I18 · source-evidenced
- API: [data-menu="#id"] trigger + .v-menu (group, item, sep, -danger) · ArrowUp/Down, Home/End, typeahead, Escape returns focus
- Demo: `catalog/index.html#dropdown-menu` · React: `react/DropdownMenu.tsx`

### Empty
- Evidence: I12 · source-evidenced
- API: .v-empty > .v-shape + __title + __text + .v-btn · variants: first-run (shape) · cleared (word only) · error (crescent, "Ooops!", Retry) · filtered-empty uses .v-state.-filtered
- Demo: `catalog/index.html#empty` · React: `react/Empty.tsx`

### Field
- Evidence: I07 · source-evidenced
- API: .v-field[.-invalid] > .v-label + control + .v-help (reserved line, becomes the error) · aria-describedby / aria-invalid
- Demo: `catalog/index.html#field` · React: `react/Field.tsx`

### Hover Card
- Evidence: Ext · derived extension
- API: [data-hovercard="#id"] trigger + .v-hovercard > .v-popover · 300 ms delay, stays while hovered, focus opens
- Demo: `catalog/index.html#hover-card` · React: `react/HoverCard.tsx`

### Input
- Evidence: I07 I15 · source-evidenced
- API: .v-input[.-cream|.-sm] · beige pill, pink focus ring + tint, reserved message line via Field · disabled 50 %
- Demo: `catalog/index.html#input` · React: `react/Input.tsx`

### Input Group
- Evidence: I15 · source-evidenced
- API: .v-igroup > .v-addon + input + .v-btn|.v-badge · topbar variant: .v-search (pink disk + cream field + scope chips)
- Demo: `catalog/index.html#input-group` · React: `react/InputGroup.tsx`

### Input OTP
- Evidence: Ext · derived extension
- API: .v-otp[data-otp] > input×6 · auto-advance, Backspace, paste, ArrowLeft/Right · emits v-complete
- Demo: `catalog/index.html#input-otp` · React: `react/InputOtp.tsx`

### Item
- Evidence: I11 I15 I16 · source-evidenced
- API: .v-item[.-selected|.-flat] > .v-disk + __body(__title, __sub) + trailing .v-time|.v-badge|chevron · .v-list[.-grouped]
- Demo: `catalog/index.html#item` · React: `react/Item.tsx`

### Kbd
- Evidence: Ext · derived extension
- API: .v-kbd
- Demo: `catalog/index.html#kbd` · React: `react/Kbd.tsx`

### Label
- Evidence: I07 · source-evidenced
- API: .v-label[.-sm] (bold display label) · .v-caps (10–11 px tracked caption for stats)
- Demo: `catalog/index.html#label` · React: `react/Label.tsx`

### Marker
- Evidence: Ext I09 · derived extension
- API: .v-marker[.-ok|.-danger] · dashed rule with a short status note inside a transcript
- Demo: `catalog/index.html#marker` · React: `react/Marker.tsx`

### Menubar
- Evidence: Ext · derived extension
- API: .v-menubar > .v-menubar__trigger[data-menu] · hover moves between open menus · keyboard as Dropdown
- Demo: `catalog/index.html#menubar` · React: `react/Menubar.tsx`

### Message
- Evidence: I09 I16 · source-evidenced
- API: .v-msg[.-me] > .v-disk (avatar) + __stack (.v-bubble…, .v-prov) · provenance line "Summary generated by Cojeev"
- Demo: `catalog/index.html#message` · React: `react/Message.tsx`

### Message Scroller
- Evidence: Ext I09 · derived extension
- API: .v-scroller[data-scroller] · follows new messages only while at the bottom; __jump appears when detached
- Demo: `catalog/index.html#message-scroller` · React: `react/MessageScroller.tsx`

### Native Select
- Evidence: Ext I07 · derived extension
- API: select.v-native[.-ink] · OS picker, styled pill
- Demo: `catalog/index.html#native-select` · React: `react/NativeSelect.tsx`

### Navigation Menu
- Evidence: I15 · source-evidenced
- API: .v-nav > __group + __item[aria-current=page] (pink text, 2 px bar, breathing dot) + __count · lives inside .v-sidebar
- Demo: `catalog/index.html#navigation-menu` · React: `react/NavigationMenu.tsx`

### Pagination
- Evidence: Ext I18 · derived extension
- API: .v-pager[data-pager][data-pages][data-page] · windowed pages, prev/next, "Page n of N" · emits v-page
- Demo: `catalog/index.html#pagination` · React: `react/Pagination.tsx`

### Popover
- Evidence: Ext I15 · derived extension
- API: .v-popover (cream, r20, hairline, float shadow) — the only surface that casts a shadow · positioned by the host
- Demo: `catalog/index.html#popover` · React: `react/Popover.tsx`

### Progress
- Evidence: I04 I09 I16 · source-evidenced
- API: .v-track[.-lg|.-sm|.-cream|.-unavail] > i[style=--p;--c] · role=progressbar · .v-prow row (disk + label + track + value "of 10")
- Demo: `catalog/index.html#progress` · React: `react/Progress.tsx`

### Questionnaire
- Evidence: Ext I07 · derived extension
- API: .v-quest > __progress + __q (.v-label + __opts/.v-quest__opt | .v-iradio | .v-weekdays | .v-check)
- Demo: `catalog/index.html#questionnaire` · React: `react/Questionnaire.tsx`

### Radio Group
- Evidence: I07 · source-evidenced
- API: label.v-radio > input[type=radio] · pictographic: label.v-iradio (icon + caption, pink pill when checked)
- Demo: `catalog/index.html#radio-group` · React: `react/RadioGroup.tsx`

### Resizable
- Evidence: Ext I16 · derived extension
- API: .v-resizable[data-resizable][.-v] style="--split:50%" > __pane + __handle + __pane · pointer drag, ArrowLeft/Right, role=separator
- Demo: `catalog/index.html#resizable` · React: `react/Resizable.tsx`

### Scroll Area
- Evidence: I07 · source-evidenced
- API: .v-scroll[.-ink] style="--h" · thin warm scrollbar; cream on black panels
- Demo: `catalog/index.html#scroll-area` · React: `react/ScrollArea.tsx`

### Select
- Evidence: I07 I11 I15 · source-evidenced
- API: .v-menuhost[data-select] > button.v-select[.-ink|.-block|.-sm] > [data-value] + .v-listbox.v-menu > .v-menu__item[aria-selected] · listbox keyboard · emits v-change
- Demo: `catalog/index.html#select` · React: `react/Select.tsx`

### Separator
- Evidence: I11 I18 · source-evidenced
- API: hr.v-sep[.-v] · low-contrast warm hairline; prefer whitespace
- Demo: `catalog/index.html#separator` · React: `react/Separator.tsx`

### Sheet
- Evidence: I16 · source-evidenced
- API: .v-sheet[data-sheet] cream side panel r24 · [data-sheet-open] · stacked = second sheet with depth · Escape, scrim, [data-close]
- Demo: `catalog/index.html#sheet` · React: `react/Sheet.tsx`

### Sidebar
- Evidence: I15 I16 I17 I18 · source-evidenced
- API: .v-shell > .v-sidebar (detached black, r24, inset 28) > .v-brand + .v-collapse + .v-nav + __foot · .-mini collapses to 76 px · hidden under 720 (dock takes over)
- Demo: `catalog/index.html#sidebar` · React: `react/Sidebar.tsx`

### Skeleton
- Evidence: Ext · derived extension
- API: .v-skel[.-pill|.-card] · beige shimmer; mirrors the layout it replaces
- Demo: `catalog/index.html#skeleton` · React: `react/Skeleton.tsx`

### Slider
- Evidence: Ext I09 · derived extension
- API: input.v-slider[.-pink][data-slider-out="#out"][data-unit] · beige track, ink thumb, pink fill
- Demo: `catalog/index.html#slider` · React: `react/Slider.tsx`

### Spinner
- Evidence: Ext · derived extension
- API: .v-spinner (ring) · inside buttons: [aria-busy] + .v-spin · alive variant: [data-morph][data-tier=spinner]
- Demo: `catalog/index.html#spinner` · React: `react/Spinner.tsx`

### Switch
- Evidence: I07 · source-evidenced
- API: label.v-switch > input[type=checkbox] · black track / cream thumb when on; beige when off
- Demo: `catalog/index.html#switch` · React: `react/Switch.tsx`

### Table
- Evidence: I18 · source-evidenced
- API: table.v-table · grey 12 px headers, no rules, aligned numerics (.-num) · wrap in .v-table-wrap
- Demo: `catalog/index.html#table` · React: `react/Table.tsx`

### Tabs
- Evidence: I11 I16 I18 · source-evidenced
- API: .v-tabs.-underline|-pills|-lenses[data-tabs] > .v-tab[role=tab][aria-selected][aria-controls] · arrow keys, Home/End
- Demo: `catalog/index.html#tabs` · React: `react/Tabs.tsx`

### Textarea
- Evidence: Ext · derived extension
- API: textarea.v-textarea · beige r16, pink focus · composer pattern adds a send .v-ibtn
- Demo: `catalog/index.html#textarea` · React: `react/Textarea.tsx`

### Toast
- Evidence: Ext · derived extension
- API: VUI.toast({text,kind:"-cream|-danger",action,durable}) or [data-toast][data-kind][data-durable][data-action] · durable toasts stay until dismissed (receipts)
- Demo: `catalog/index.html#toast` · React: `react/Toast.tsx`

### Toggle
- Evidence: I07 I18 · source-evidenced
- API: .v-toggle[data-toggle][aria-pressed][.-pink|.-circle]
- Demo: `catalog/index.html#toggle` · React: `react/Toggle.tsx`

### Toggle Group
- Evidence: I07 I18 · source-evidenced
- API: [data-togglegroup="single|multi"] > .v-toggle|.v-btn[aria-pressed] · weekday picker: .v-weekdays (checkboxes)
- Demo: `catalog/index.html#toggle-group` · React: `react/ToggleGroup.tsx`

### Tooltip
- Evidence: Ext · derived extension
- API: [data-tooltip="text"] · ink surface, 250 ms delay, on hover and focus, Escape hides · icon-only buttons get aria-label from it
- Demo: `catalog/index.html#tooltip` · React: `react/Tooltip.tsx`

### Typography
- Evidence: I03 · source-evidenced
- API: .v-hero .v-display .v-section .v-title .v-lead .v-body .v-body-2 .v-control .v-meta .v-caps .v-value(.u) .v-id · .v-prose for documents · Bricolage Grotesque (display) + DM Sans (text) stand in for Acorn + TT Commons
- Demo: `catalog/index.html#typography` · React: `react/Typography.tsx`

## Intelly composites

### Floating Sidebar
- Evidence: I15 I16 I17 I18 · source-evidenced
- API: .v-shell + .v-sidebar (see Sidebar) · pink collapse tab on the right edge · groups General / Tools · Stop all in the foot
- Demo: `catalog/index.html#floating-sidebar`

### Joined Utility Circles
- Evidence: I15 I16 I17 I18 · source-evidenced
- API: .v-utility > .v-ibtn×3 · 44 px black circles overlapping −4 px with a 2 px canvas ring
- Demo: `catalog/index.html#joined-utilities`

### Mobile Dock + Attached Panel
- Evidence: I07 I09 · source-evidenced
- API: .v-dock (5 columns, shoulder ::before) > .v-dock__item[aria-current] + .v-dock__action[data-dock-toggle="#panel"] · .v-dockpanel black r28 above the dock · plus rotates to × when open
- Demo: `catalog/index.html#mobile-dock`

### Assistant Panel
- Evidence: I09 I16 · source-evidenced
- API: .v-assist[.-mini|.-anchored] > __close (pink, protrudes top-right) + __title + .v-bubble… + .v-btn.-accent · close pulses once on reply (.-pulse)
- Demo: `catalog/index.html#assistant-panel`

### Notched Action Card
- Evidence: I05 I11 I17 · source-evidenced
- API: .v-notchwrap > .v-notch[.-pink|-blue|-yellow] (mask cut, --nd circle size, --nc clearance) + .v-ibtn (black circle in the notch) · .v-attached (pink circle on a card corner)
- Demo: `catalog/index.html#notched-card`

### Connected Master / Detail
- Evidence: I15 · source-evidenced
- API: .v-md > __list (.v-item.-selected bridges into the detail with a pink bar) + __detail (pink panel) · collapses to stacked under 900 px
- Demo: `catalog/index.html#master-detail`

### Category Tile
- Evidence: I07 I09 · source-evidenced
- API: .v-ctile style="--sz" > .v-shape|[data-shape] + one span (word) [+ small] · .v-cluster positions tiles absolutely · alive: add data-morph data-shape
- Demo: `catalog/index.html#category-tile`

### Metric Hero / Card / Compact
- Evidence: I07 I15 I18 I14 · source-evidenced
- API: .v-mhero (96 px value + caption) · .v-card.-pink > .v-mcard (__head disk+title, __value display 44, .v-delta, caption) · .v-compact (title, value+unit, gradient range, caps rows) · .-unavail greys the value, never shows 0
- Demo: `catalog/index.html#metric-cards`

### Segmented Ring
- Evidence: I09 I18 · source-evidenced
- API: .v-ring[data-segs="yellow:30,pink:25,…"][data-sw][data-gap][.-draw] style="--sz" > .v-ring__c · thick rounded arcs, draws in once · icon disks at joins via absolute .v-disk
- Demo: `catalog/index.html#segmented-ring`

### Date Strip + Weekday Picker
- Evidence: I07 · source-evidenced
- API: .v-datestrip > button[aria-pressed][data-mark][disabled] (b = day number) · .v-weekdays (7 pink circles, checkboxes)
- Demo: `catalog/index.html#date-strip`

### Mini Calendar / Agenda / Weekly Grid
- Evidence: I15 I18 · source-evidenced
- API: .v-cal[data-cal] (date selection) · .v-agenda (30-min slots, .v-agenda__now pill+dashed) · .v-week (7 columns, day headers, 30-min rows of 56 px, events positioned by --start/--dur, overlap = side-by-side) · mobile shows agenda, never 7 columns
- Demo: `catalog/index.html#calendars`

### Hex Participant Group
- Evidence: I04 I18 · source-evidenced
- API: .v-hexgroup > .v-hex[style=--c]×n + .v-more · 24 px flat-top hexagons, 9 px initials
- Demo: `catalog/index.html#hex-group`

### Profile Header / Identity Band / Record Card
- Evidence: I11 I16 · source-evidenced
- API: .v-profile (portrait + star edit badge, display name, caps metadata) · .v-band (olive id band) · .v-record > __head[.-blue|-pink|-olive] (disk, title, id pill, watermark) + __body (.v-kv) + __foot
- Demo: `catalog/index.html#profile-record`

### File / Resource / Featured Media Cards
- Evidence: I16 I17 · source-evidenced
- API: .v-file (tag, date, ⋮, title, thumb) · .v-resource > __head[.-blue] + __body + __link · .v-feature (pink 1.5 px outline, media + text panel, play circle)
- Demo: `catalog/index.html#file-resource`

### Compact Summary / Live Activity Widget
- Evidence: I12 I13 · source-evidenced
- API: .v-widget (cream, value + 4 progress rows + 2 circle buttons) · .v-capsule (black pill: avatar, pink name pill, progress line, circle controls)
- Demo: `catalog/index.html#widgets`

### Shape Masks / Collage
- Evidence: I03 I13 I20 · source-evidenced
- API: .v-mask.-circle|-blob (photo clip) · .v-collage (beige r40 canvas, ≤7 shapes, 2 photos, black .v-caption-pill) · z-order photo < shape < label · flat, no shadows
- Demo: `catalog/index.html#masks-collage`

### Empty / Error Compositions
- Evidence: I12 I20 · source-evidenced
- API: .v-empty with a category shape · error: crescent + "Ooops!" + reason + black Retry + .v-heap of shapes
- Demo: `catalog/index.html#empty-error`

## Cojeev families

### App Shell + Page Header
- Evidence: I15 · source-evidenced · group Shell
- API: .v-shell > .v-sidebar + .v-page (.v-topbar, .v-main > .v-content + .v-rail) · .v-pagehead (display title + grey subtitle) · container-query breakpoints 1180 / 900 / 720
- Demo: `catalog/index.html#app-shell`

### Project Scope Picker + Default Project Action
- Evidence: I11 · derived extension · group Shell
- API: .v-select.-block with a disk · viewing ≠ default: an .v-alert.-info names both · default change is a separate .v-btn with outcome
- Demo: `catalog/index.html#scope-picker`

### Observation Badge / Stamp / Capability / Evidence
- Evidence: I16 · derived extension · group Shell
- API: .v-stamp[.-stale] ("observed 09:12") · .v-badge.-live (dot + word) · .v-cap.-yes|-no|-unknown · details.v-collapsible for evidence · presence never implies liveness
- Demo: `catalog/index.html#observation`

### Data State Panel
- Evidence: — · derived extension · group Shell
- API: .v-state.-loading|-empty|-filtered|-partial|-stale|-unavail|-error > __word + __why + action · null usage → "unavailable", never 0 · pending ≠ success
- Demo: `catalog/index.html#data-state`

### Action Receipt / Receipt Timeline
- Evidence: I15 (agenda) · derived extension · group Shell
- API: .v-receipt > (__dot.-ok|-pending|-danger|-you + __row(__title, __meta))× · requested → pending → outcome with evidence · pending never renders as success
- Demo: `catalog/index.html#receipt`

### Contextual Chat Dock + Context Header + Typed Action Card
- Evidence: I09 I16 · source-evidenced · group Global
- API: .v-assist.-mini → .-anchored · context chips (.v-badge) + evidence disclosure · typed action card: proposed / running / done with result
- Demo: `catalog/index.html#chat-dock`

### Quick Note + Destination Chip
- Evidence: — · derived extension · group Global
- API: .v-card > .v-textarea + destination .v-badge with change control + save outcome (durable toast)
- Demo: `catalog/index.html#quick-note`

### Notification Drawer + Needs You Access
- Evidence: I12 · derived extension · group Global
- API: .v-utility bell with unread dot · sheet of durable events (read/unread) · Needs You count links to the read-only inbox
- Demo: `catalog/index.html#notifications`

### Work · Tabs, Session Row, Task Row, Attempt List
- Evidence: I15 I16 · derived extension · group Work
- API: .v-tabs.-lenses (Now · Needs You · Tasks · History · Agents · Explainers) · session row = .v-item + observation stamp · task row adds derived state word + attempts
- Demo: `catalog/index.html#work-views`

### Needs You Item (read-only)
- Evidence: I15 · derived extension · group Work
- API: .v-needs > disk + reason/meta + ONE action "Open in <host>" · no reply control anywhere · sourced from decision_requested / decision_resolved events
- Demo: `catalog/index.html#needs-you`

### Agent Card + Health Line
- Evidence: I15 · derived extension · group Automations
- API: .v-health.-ok|-check|-you|-none > icon + .v-word + .v-age + .v-next (one real next action) · four states: Working · Needs a check · Needs You · Not checked yet
- Demo: `catalog/index.html#health-line`

### Automation Idea / Definition / Schedule / Upgrade
- Evidence: I15 · derived extension · group Automations
- API: idea card (repeated work + evidence + "Build this") · definition card (name, health line, schedule pill, on/off switch) · schedule editor (supported fields + timezone + preview) · .v-upgrade panel (dismissible)
- Demo: `catalog/index.html#automation-cards`

### Run Row / Run Detail / Fork Preview / Test badge
- Evidence: I18 · derived extension · group Automations
- API: run row = table row with status pill · detail = .v-receipt timeline with plain summary + technical code behind .v-collapsible + one next action · fork preview lists reuse vs re-run · .v-badge.-test persists on test results
- Demo: `catalog/index.html#run-detail`

### Agent Builder · Node / Wire / Palette / Inspector / Validation
- Evidence: — · derived extension · group Automations
- API: .v-node[.-ai|-selected|-invalid] > __head + __sub + __port.-in|-out · svg path.v-wire[.-dashed|-error] + .v-wirelabel · .v-palette__item · .v-inspector · .v-validation.-ok|-error (sticky summary) · Canvas/Outline parity ≥1180, Outline-first <720
- Demo: `catalog/index.html#builder`

### Memory · Entry Card / Search / Recall / Graph / Import / Review
- Evidence: — · derived extension · group Memory
- API: entry = .v-card with content, source, project, tags, trust · search results grouped · recall panel shows evaluation info, no fabricated score · graph offers a list alternative · import preview lists conflicts
- Demo: `catalog/index.html#memory`

### Library · Skill Card / Hook Intent / Quarantine / Diff
- Evidence: I17 · derived extension · group Library
- API: skill card (name, scope, enabled switch, origin, usage) · hook row (plain intent, host, coverage) · quarantine notice with restore · config diff before/after + receipt
- Demo: `catalog/index.html#library`

### AI Apps · App Card / Capability Matrix / Usage Limit / Model Row
- Evidence: I18 · derived extension · group AI Apps
- API: app card (identity, version, sign-in, health) · matrix = .v-table with .v-cap cells + evidence · .v-usage[.-unavail] (used / remaining / window / reset; null = unavailable) · model row with effort values + source
- Demo: `catalog/index.html#ai-apps`

### Settings · System Checks / Theme / Alive
- Evidence: — · derived extension · group Settings
- API: check list (name, result word, time, run) · fix-conversation action · theme switcher (mode, density, text size) · Alive personality picker (10) + per-effect switches — see Alive lab
- Demo: `catalog/index.html#settings`

### Explainer Card / Viewer / Version History
- Evidence: I17 · derived extension · group Work
- API: card = .v-feature or .v-file with provenance · viewer has interactive + written-summary variants · version history = .v-receipt · fallbacks: missing / invalid / oversized as .v-state
- Demo: `catalog/index.html#explainers`

## Inventory check
Base entries 64 / 64. Missing: none.
