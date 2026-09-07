# Interactive delivery — 29 base components

All29 production component TSX files and their same-name scoped CSS are implemented. No browser/fidelity PASS is asserted. Root owns registry assembly, all154 isolation pages, width/theme/motion/interaction gates, and the wave review.

## Checks

- npm ci succeeded; additions installed with zero reported audit vulnerabilities. Initial shell Node was 25.3.0.
- Local npm run typecheck reached only unresolved cross-wave modules after three local typing fixes.
- Focused TypeScript check using Node22.22.0 and real peer-source paths passed (use-flow from motion worktree, Input from composed worktree, Icon/data from main); React type paths unified to this worktree to avoid duplicate package unique-symbol artifacts.
- All29 TSX and all29 CSS parsed/formatted successfully; static scan found no !important and no reference imports. No browser or full gate launched in this worktree.

## Dependencies

- `@radix-ui/react-accordion` `^1.2.20`
- `@radix-ui/react-alert-dialog` `^1.1.23`
- `@radix-ui/react-checkbox` `^1.3.11`
- `@radix-ui/react-collapsible` `^1.1.20`
- `@radix-ui/react-context-menu` `^2.3.7`
- `@radix-ui/react-dialog` `^1.1.23`
- `@radix-ui/react-dropdown-menu` `^2.1.24`
- `@radix-ui/react-hover-card` `^1.1.23`
- `@radix-ui/react-menubar` `^1.1.24`
- `@radix-ui/react-navigation-menu` `^1.2.22`
- `@radix-ui/react-popover` `^1.1.23`
- `@radix-ui/react-radio-group` `^1.4.7`
- `@radix-ui/react-scroll-area` `^1.2.18`
- `@radix-ui/react-select` `^2.3.7`
- `@radix-ui/react-slider` `^1.4.7`
- `@radix-ui/react-switch` `^1.3.7`
- `@radix-ui/react-tabs` `^1.1.21`
- `@radix-ui/react-toast` `^1.2.23`
- `@radix-ui/react-toggle` `^1.1.18`
- `@radix-ui/react-toggle-group` `^1.1.19`
- `@radix-ui/react-tooltip` `^1.2.16`
- `cmdk` `^1.1.1`
- `input-otp` `^1.5.0`
- `react-day-picker` `^10.0.1`
- `react-resizable-panels` `^4.12.4`

## Cross-wave imports and public contract

- `@/registry/sahajiv/motion/use-flow`: useFlowGroup/useFlowAppearance per agreed signature; no copied global wrappers.
- `@/registry/sahajiv/ui/icon`: Icon, IconButton, Disk. Names used: search, calendar, chevron-left, chevron-right, chevron-down; root verified these exact glyph names exist.
- `@/registry/sahajiv/ui/input`: InputWrapper and InputControl. Existing Button is reused.
- All exported React components have exported Props types; parts retain source v-* classes and data-part roles. Simple unconditional root rules moved into CVA token/arbitrary utilities. Scoped CSS retains conditional states, descendants, shape masks, responsive rules, and Radix structure adapters.

## Per-entry coverage and source-to-component mapping

### accordion

- Coverage: production implementation complete; integrated gate pending.
- Exports: `accordionVariants`, `Accordion`, `AccordionItem`, `AccordionTrigger`, `AccordionContent`, `AccordionIndicator`.
- Mapping: .v-acc → Accordion (type=single with collapsible or type=multiple); details → AccordionItem(value); summary → AccordionTrigger; .v-acc__body → AccordionContent; .v-chev → AccordionIndicator. Header is a display:contents h3; native open becomes root defaultValue containing the item value.

### alert-dialog

- Coverage: production implementation complete; integrated gate pending.
- Exports: `AlertDialog`, `AlertDialogTrigger`, `AlertDialogPortal`, `AlertDialogOverlay`, `alertdialogContentVariants`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`, `AlertDialogTitle`, `AlertDialogDescription`, `AlertDialogAction`, `AlertDialogCancel`.
- Mapping: .v-dialog[role=alertdialog] → AlertDialogContent inside AlertDialog; [data-dialog-open] → AlertDialogTrigger(asChild); .v-dialog__head → AlertDialogHeader; .v-dialog__actions → AlertDialogFooter; title/description → AlertDialogTitle/Description; destructive action → AlertDialogAction; cancel/close → AlertDialogCancel. Root defaultOpen follows fixture open state.

### calendar

- Coverage: production implementation complete; integrated gate pending.
- Exports: `calendarVariants`, `Calendar`, `CalendarCaption`, `CalendarGrid`, `CalendarDayButton`, `CalendarWeekNumber`.
- Mapping: .v-cal → Calendar(mode=single, defaultMonth, selected, marks). Parse data-date/data-selected as local year/month/day. DayPicker generates the real header/grid/days; do not duplicate the static reference grid. .v-cal__grid → CalendarGrid, .v-cal__d → CalendarDayButton, month/head → CalendarCaption, week number → CalendarWeekNumber. Table structural rows use display:contents for the source eight-column grid.

### checkbox

- Coverage: production implementation complete; integrated gate pending.
- Exports: `checkboxVariants`, `Checkbox`, `CheckboxGroup`, `CheckboxBody`.
- Mapping: .v-check label → Checkbox Radix button; move native input checked/indeterminate/disabled/name/value/id to root (defaultChecked can be indeterminate). Remove source input; visual span data-slot=checkbox-indicator replaces it. Preserve remaining label children inside Checkbox; .v-check__body → CheckboxBody; .v-checks → CheckboxGroup.

### collapsible

- Coverage: production implementation complete; integrated gate pending.
- Exports: `collapsibleVariants`, `Collapsible`, `CollapsibleTrigger`, `CollapsibleContent`, `CollapsibleIndicator`.
- Mapping: details.v-collapsible → Collapsible(defaultOpen); summary → CollapsibleTrigger; body → CollapsibleContent; .v-chev → CollapsibleIndicator. Native open becomes defaultOpen.

### combobox

- Coverage: production implementation complete; integrated gate pending.
- Exports: `comboboxVariants`, `Combobox`, `ComboboxInput`, `ComboboxContent`, `ComboboxList`, `ComboboxItem`, `ComboboxEmpty`, `ComboboxGroup`.
- Mapping: .v-combo → Combobox; source input → ComboboxInput; source menu → ComboboxContent; rows → ComboboxItem(value,label); no match row → ComboboxEmpty; headings/groups → ComboboxGroup. Root options prop also provides standalone composition. InputWrapper/InputControl and Icon/Disk come from sibling waves. cmdk owns filtering/highlight; Radix Popover owns dismissal/placement.

### command

- Coverage: production implementation complete; integrated gate pending.
- Exports: `commandVariants`, `Command`, `CommandDialog`, `CommandInput`, `CommandList`, `CommandEmpty`, `CommandGroup`, `CommandItem`, `CommandSeparator`, `CommandShortcut`.
- Mapping: .v-cmd → Command; __input input → CommandInput (leading/trailing props preserve source glyph/kbd); __list → CommandList; each heading and following items → CommandGroup(heading); .v-menu__item → CommandItem; __empty → CommandEmpty. Also CommandDialog for accessible overlay composition.

### context-menu

- Coverage: production implementation complete; integrated gate pending.
- Exports: `ContextMenu`, `ContextMenuPortal`, `ContextMenuGroup`, `ContextMenuRadioGroup`, `ContextMenuSub`, `ContextMenuTrigger`, `contextmenuContentVariants`, `ContextMenuContent`, `ContextMenuSubContent`, `ContextMenuItem`, `ContextMenuSubTrigger`, `ContextMenuCheckboxItem`, `ContextMenuRadioItem`, `ContextMenuLabel`, `ContextMenuSeparator`, `ContextMenuShortcut`.
- Mapping: [data-context] → ContextMenuTrigger inside ContextMenu; .v-menu → ContextMenuContent; item/sep/group → ContextMenuItem/Separator/Label. Submenus use Sub/SubTrigger/SubContent. Checked/radio rows use CheckboxItem/RadioGroup/RadioItem. Keyboard ContextMenu and Shift+F10 dispatch the trigger-owned contextmenu event at its center; Radix handles actual focus and positioning.

### date-picker

- Coverage: production implementation complete; integrated gate pending.
- Exports: `datePickerVariants`, `DatePicker`, `DatePickerTrigger`, `DatePickerContent`.
- Mapping: .v-menuhost[data-datepicker] → DatePicker(defaultDate, defaultOpen, calendarProps), which composes Popover and Calendar. Also DatePickerTrigger and DatePickerContent for custom Popover composition. Move fixture data-date/data-selected into calendarProps/defaultDate. Preserve formatted label through formatDate if fixture locale is fixed.

### dialog

- Coverage: production implementation complete; integrated gate pending.
- Exports: `Dialog`, `DialogTrigger`, `DialogPortal`, `DialogOverlay`, `dialogContentVariants`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`.
- Mapping: .v-dialog → DialogContent inside Dialog; opener → DialogTrigger(asChild); .v-dialog__head → DialogHeader; .v-dialog__actions → DialogFooter; title/description → DialogTitle/Description; [data-close] → DialogClose(asChild). Root defaultOpen follows fixture state. Content portals and includes scrim.

### drawer

- Coverage: production implementation complete; integrated gate pending.
- Exports: `Drawer`, `DrawerTrigger`, `DrawerPortal`, `DrawerOverlay`, `drawerContentVariants`, `DrawerContent`, `DrawerHeader`, `DrawerFooter`, `DrawerTitle`, `DrawerDescription`, `DrawerClose`.
- Mapping: .v-drawer → DrawerContent inside Drawer (Radix Dialog semantics); opener → DrawerTrigger(asChild); [data-close] → DrawerClose(asChild). Header/Footer/Title/Description available. Source bottom offset above dock retained; no swipe gesture added because reference only specifies scrim/Escape/close.

### dropdown-menu

- Coverage: production implementation complete; integrated gate pending.
- Exports: `DropdownMenu`, `DropdownMenuPortal`, `DropdownMenuGroup`, `DropdownMenuRadioGroup`, `DropdownMenuSub`, `DropdownMenuTrigger`, `dropdownmenuContentVariants`, `DropdownMenuContent`, `DropdownMenuSubContent`, `DropdownMenuItem`, `DropdownMenuSubTrigger`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`, `DropdownMenuShortcut`.
- Mapping: [data-menu] → DropdownMenuTrigger inside DropdownMenu; .v-menu → DropdownMenuContent; .v-menu__item → DropdownMenuItem; .v-menu__group → DropdownMenuLabel; separator → DropdownMenuSeparator. Submenu and checkbox/radio families are real Radix parts.

### hover-card

- Coverage: production implementation complete; integrated gate pending.
- Exports: `HoverCard`, `HoverCardTrigger`, `HoverCardPortal`, `hoverCardContentVariants`, `HoverCardContent`.
- Mapping: [data-hovercard] → HoverCardTrigger inside HoverCard; .v-hovercard>.v-popover → HoverCardContent. Default 300ms open delay, pointer/focus semantics from Radix. Existing source positioning wrapper is replaced by the portal.

### input-otp

- Coverage: production implementation complete; integrated gate pending.
- Exports: `inputOTPVariants`, `InputOTP`, `InputOTPGroup`, `InputOTPSlot`, `InputOTPSeparator`.
- Mapping: .v-otp → InputOTP(maxLength, defaultValue) with InputOTPGroup and InputOTPSlot(index) children. Join native input values into one defaultValue; source six native cells become six visible slots over the library-owned accessible input. Paste/backspace/arrows/complete come from input-otp. InputOTPSeparator available.

### menubar

- Coverage: production implementation complete; integrated gate pending.
- Exports: `Menubar`, `MenubarMenu`, `MenubarPortal`, `MenubarGroup`, `MenubarRadioGroup`, `MenubarSub`, `MenubarTrigger`, `menubarContentVariants`, `MenubarContent`, `MenubarSubContent`, `MenubarItem`, `MenubarSubTrigger`, `MenubarCheckboxItem`, `MenubarRadioItem`, `MenubarLabel`, `MenubarSeparator`, `MenubarShortcut`.
- Mapping: .v-menubar → Menubar; each host → MenubarMenu; __trigger → MenubarTrigger; .v-menu → MenubarContent; rows → MenubarItem; labels/separators/submenus/checkbox/radio families provided. Root value/defaultValue controls open menu.

### navigation-menu

- Coverage: production implementation complete; integrated gate pending.
- Exports: `navigationMenuVariants`, `NavigationMenu`, `NavigationMenuList`, `NavigationMenuItem`, `NavigationMenuLink`, `NavigationMenuGroup`, `NavigationMenuCount`, `NavigationMenuTrigger`, `NavigationMenuContent`, `NavigationMenuViewport`, `NavigationMenuIndicator`, `NavigationMenuLabel`.
- Mapping: .v-nav → NavigationMenu; container → NavigationMenuList; each link uses NavigationMenuItem + NavigationMenuLink(active when aria-current=page); __group → NavigationMenuGroup; __label → NavigationMenuLabel; __count → NavigationMenuCount. Trigger/Content/Viewport/Indicator provided for Radix navigation disclosure composition.

### popover

- Coverage: production implementation complete; integrated gate pending.
- Exports: `Popover`, `PopoverTrigger`, `PopoverPortal`, `PopoverAnchor`, `PopoverClose`, `popoverContentVariants`, `PopoverContent`.
- Mapping: .v-popover → PopoverContent inside Popover; opener → PopoverTrigger(asChild); PopoverAnchor and PopoverClose available. If fixture surface is initially visible, set root defaultOpen and supply a real anchor/trigger.

### radio-group

- Coverage: production implementation complete; integrated gate pending.
- Exports: `radioGroupVariants`, `RadioGroup`, `RadioGroupItem`, `RadioGroupBody`.
- Mapping: .v-radios/.v-iradios → RadioGroup(defaultValue,pictographic); .v-radio/.v-iradio labels → RadioGroupItem(value,pictographic); remove source native radio and move disabled/name/value to appropriate root/item. Keep label children/body/icon. __body → RadioGroupBody. Visual indicator is span; Radix owns checked state and hidden form controls. Pictographic fill belongs to shared travelling layer.

### resizable

- Coverage: production implementation complete; integrated gate pending.
- Exports: `resizableVariants`, `ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`.
- Mapping: .v-resizable → ResizablePanelGroup(direction or orientation; variant=v for vertical); __pane → ResizablePanel(defaultSize/minSize/maxSize); __handle → ResizableHandle. Source --split maps to first defaultSize percentage; library API uses Group/Panel/Separator and elementRef rather than old PanelGroup/PanelResizeHandle names.

### scroll-area

- Coverage: production implementation complete; integrated gate pending.
- Exports: `scrollAreaVariants`, `ScrollArea`, `ScrollBar`.
- Mapping: .v-scroll → ScrollArea(variant=ink where applicable); children go into generated Radix Viewport. Keep --h in root style. ScrollBar is exported; source child paragraph rhythm is translated through Radix viewport/content wrappers.

### select

- Coverage: production implementation complete; integrated gate pending.
- Exports: `Select`, `selectTriggerVariants`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`, `SelectGroup`, `SelectLabel`, `SelectSeparator`, `SelectScrollUpButton`, `SelectScrollDownButton`.
- Mapping: .v-menuhost[data-select] → Select(defaultValue,defaultOpen); .v-select → SelectTrigger; [data-value] → SelectValue; .v-listbox → SelectContent; .v-menu__item → SelectItem(value); group/label/sep → SelectGroup/SelectLabel/SelectSeparator. Preserve row text and glyph children inside ItemText. Native selected option becomes root defaultValue.

### sheet

- Coverage: production implementation complete; integrated gate pending.
- Exports: `Sheet`, `SheetTrigger`, `SheetPortal`, `SheetOverlay`, `sheetContentVariants`, `SheetContent`, `SheetHeader`, `SheetFooter`, `SheetTitle`, `SheetDescription`, `SheetClose`.
- Mapping: .v-sheet → SheetContent inside Sheet; opener → SheetTrigger(asChild); [data-close] → SheetClose(asChild); header/footer/title/description use named Sheet parts. Content portals and includes scrim; nested Sheets use independent roots.

### slider

- Coverage: production implementation complete; integrated gate pending.
- Exports: `sliderVariants`, `Slider`, `SliderWrapper`, `SliderRow`, `SliderOutput`.
- Mapping: .v-sliderwrap → SliderWrapper; __row → SliderRow; output → SliderOutput; input.v-slider → Slider(value/defaultValue arrays, min,max,step,variant=pink). Radix Track/Range/Thumb replace native pseudo elements; scalar source value becomes one-element array. Caller may bind output with onValueChange.

### switch

- Coverage: production implementation complete; integrated gate pending.
- Exports: `switchVariants`, `Switch`, `SwitchRow`.
- Mapping: label.v-switch → Switch; remove native checkbox and transfer checked/defaultChecked, disabled,name,value,id onto root. [data-slot=switch-thumb] is a real Radix thumb, replacing ::after. .v-switchrow → SwitchRow; source color/sm modifiers stay className.

### tabs

- Coverage: production implementation complete; integrated gate pending.
- Exports: `tabsVariants`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`.
- Mapping: .v-tabs → TabsList inside Tabs(defaultValue,variant). Each .v-tab → TabsTrigger(value); panels → TabsContent(value). aria-controls relationships become matching values. variant default maps source pills; underline/lenses are explicit variants. A source demo containing several independent tablists needs separate Tabs roots.

### toast

- Coverage: production implementation complete; integrated gate pending.
- Exports: `toastVariants`, `ToastProvider`, `ToastViewport`, `Toast`, `ToastTitle`, `ToastDescription`, `ToastAction`, `ToastClose`.
- Mapping: .v-toaster → ToastViewport under ToastProvider; .v-toast → Toast(open/defaultOpen,durable,variant); text → ToastDescription; optional title → ToastTitle; action → ToastAction(altText); dismiss → ToastClose. Durable enforces Infinity duration. Toast trigger fixtures need local state and a rendered Toast; there is deliberately no global VUI.toast.

### toggle

- Coverage: production implementation complete; integrated gate pending.
- Exports: `toggleVariants`, `Toggle`, `ToggleWell`.
- Mapping: .v-toggle → Toggle(defaultPressed/pressed,variant), data-toggle removed from behavior but retained marker. aria-pressed becomes defaultPressed. Variants default/pressed/pink/circle are public; extra source hue classes remain className. .v-togglewell → ToggleWell.

### toggle-group

- Coverage: production implementation complete; integrated gate pending.
- Exports: `toggleGroupVariants`, `ToggleGroup`, `ToggleGroupItem`.
- Mapping: [data-togglegroup] → ToggleGroup(type=single|multiple,defaultValue,variant). Child v-toggle → ToggleGroupItem(value). Single string or multiple string[] values come from aria-pressed. Existing .v-seg class enables shared travel; multi groups keep individual state paint.

### tooltip

- Coverage: production implementation complete; integrated gate pending.
- Exports: `Tooltip`, `TooltipProvider`, `TooltipTrigger`, `TooltipPortal`, `tooltipContentVariants`, `TooltipContent`.
- Mapping: [data-tooltip] → TooltipTrigger(asChild) inside Tooltip under TooltipProvider; value text → TooltipContent. Default 220ms token delay. Preserve icon-only aria-label; use defaultOpen for explicit visible fixture state.

## Remaining integration evidence

- The whole wave still requires exact reference fixture conversion, keyboard/pointer/focus proof, both themes, reduced motion, all width gates, frozen-clock flow/morph comparisons, and stranger installation.
- Calendar intentionally exposes single-date mode for DatePicker; range/multiple date selection is outside the source contract. The rendered table semantics differ structurally from the source flat grid but retain per-part CSS and the eight-column geometry; confirm geometry in the integrated gate.
- Native label/input structures for Checkbox/Radio/Switch become Radix button roots plus visible indicators and hidden form controls. Compare visible part geometry through data-part mapping rather than blindly comparing native tag names.
- Source global state markers (`open`, native checked, aria-pressed) must seed React default state in gate fixtures; cloning source HTML alongside a component does not verify its behavior.
