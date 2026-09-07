"use client";
import * as React from "react";
import type { ExampleProps } from "./types";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/registry/sahajiv/ui/accordion";
import * as AlertDialogParts from "@/registry/sahajiv/ui/alert-dialog";
import { Calendar } from "@/registry/sahajiv/ui/calendar";
import {
  Checkbox,
  CheckboxGroup,
  CheckboxBody,
} from "@/registry/sahajiv/ui/checkbox";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/registry/sahajiv/ui/collapsible";
import { Combobox } from "@/registry/sahajiv/ui/combobox";
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/registry/sahajiv/ui/command";
import * as ContextMenuParts from "@/registry/sahajiv/ui/context-menu";
import { DatePicker } from "@/registry/sahajiv/ui/date-picker";
import * as DialogParts from "@/registry/sahajiv/ui/dialog";
import * as DrawerParts from "@/registry/sahajiv/ui/drawer";
import * as DropdownMenuParts from "@/registry/sahajiv/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/registry/sahajiv/ui/hover-card";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "@/registry/sahajiv/ui/input-otp";
import * as MenubarParts from "@/registry/sahajiv/ui/menubar";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuLabel,
  NavigationMenuCount,
} from "@/registry/sahajiv/ui/navigation-menu";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverClose,
} from "@/registry/sahajiv/ui/popover";
import {
  RadioGroup,
  RadioGroupItem,
  RadioGroupBody,
} from "@/registry/sahajiv/ui/radio-group";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "@/registry/sahajiv/ui/resizable";
import { ScrollArea } from "@/registry/sahajiv/ui/scroll-area";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectLabel,
} from "@/registry/sahajiv/ui/select";
import * as SheetParts from "@/registry/sahajiv/ui/sheet";
import {
  Slider,
  SliderWrapper,
  SliderRow,
  SliderOutput,
} from "@/registry/sahajiv/ui/slider";
import { Switch, SwitchRow } from "@/registry/sahajiv/ui/switch";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/registry/sahajiv/ui/tabs";
import {
  ToastProvider,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastAction,
  ToastClose,
  ToastViewport,
} from "@/registry/sahajiv/ui/toast";
import { Toggle } from "@/registry/sahajiv/ui/toggle";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/registry/sahajiv/ui/toggle-group";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/registry/sahajiv/ui/tooltip";
import { Button } from "@/registry/sahajiv/ui/button";
import { Card, CardTitle, CardDescription } from "@/registry/sahajiv/ui/card";
import { Input } from "@/registry/sahajiv/ui/input";
import { Label } from "@/registry/sahajiv/ui/label";
import { Avatar, AvatarFallback } from "@/registry/sahajiv/ui/avatar";
import { Icon, IconButton, Disk } from "@/registry/sahajiv/ui/icon";
import { Body, Meta, Title } from "@/registry/sahajiv/ui/typography";

export function AccordionExample() {
  return (
    <Accordion type="single" collapsible defaultValue="local">
      <AccordionItem value="local">
        <AccordionTrigger>Where do my notes live?</AccordionTrigger>
        <AccordionContent>
          Keep your own data and choose where it belongs. These examples run
          locally in the page.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="compose">
        <AccordionTrigger>Can I compose the pieces?</AccordionTrigger>
        <AccordionContent>
          Each part is a React component. Add your content, state and event
          handlers.
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="keyboard">
        <AccordionTrigger>Does it work with a keyboard?</AccordionTrigger>
        <AccordionContent>
          Tab to a trigger, use arrows to move, and press Enter or Space to open
          it.
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
export function AlertDialogExample() {
  const [archived, setArchived] = React.useState(false);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <AlertDialogParts.AlertDialog>
        <AlertDialogParts.AlertDialogTrigger asChild>
          <Button variant="danger">Archive example note</Button>
        </AlertDialogParts.AlertDialogTrigger>
        <AlertDialogParts.AlertDialogContent>
          <AlertDialogParts.AlertDialogHeader>
            <AlertDialogParts.AlertDialogTitle>
              Archive this note?
            </AlertDialogParts.AlertDialogTitle>
          </AlertDialogParts.AlertDialogHeader>
          <AlertDialogParts.AlertDialogDescription>
            The note will move to the archive in this example. You can restore
            it below.
          </AlertDialogParts.AlertDialogDescription>
          <AlertDialogParts.AlertDialogFooter>
            <AlertDialogParts.AlertDialogCancel>
              Keep note
            </AlertDialogParts.AlertDialogCancel>
            <AlertDialogParts.AlertDialogAction
              onClick={() => setArchived(true)}
            >
              Archive note
            </AlertDialogParts.AlertDialogAction>
          </AlertDialogParts.AlertDialogFooter>
        </AlertDialogParts.AlertDialogContent>
      </AlertDialogParts.AlertDialog>
      <Meta role="status">
        {archived
          ? "Example note archived."
          : "Example note is in your notebook."}
      </Meta>
      {archived && (
        <Button size="sm" variant="ghost" onClick={() => setArchived(false)}>
          Restore note
        </Button>
      )}
    </div>
  );
}
export function CalendarExample() {
  const [date, setDate] = React.useState<Date | undefined>(
    new Date(2026, 8, 7),
  );
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Calendar
        selected={date}
        onSelect={setDate}
        defaultMonth={new Date(2026, 8, 1)}
        marks={{ "2026-09-12": "pink", "2026-09-18": "olive" }}
      />
      <Meta role="status">
        {date
          ? `Selected: ${date.toLocaleDateString("en-GB")}`
          : "No date selected."}
      </Meta>
    </div>
  );
}
export function CheckboxExample() {
  const [checked, setChecked] = React.useState(false);
  return (
    <CheckboxGroup>
      <Checkbox
        checked={checked}
        onCheckedChange={(value) => setChecked(value === true)}
      >
        <CheckboxBody>
          <strong>Keep a daily note</strong>
          <Meta>
            {checked
              ? "Daily notes enabled in this example."
              : "Capture one small thing each day."}
          </Meta>
        </CheckboxBody>
      </Checkbox>
      <Checkbox defaultChecked="indeterminate">
        Partially selected group
      </Checkbox>
      <Checkbox disabled>Unavailable option</Checkbox>
    </CheckboxGroup>
  );
}
export function CollapsibleExample() {
  return (
    <Collapsible>
      <CollapsibleTrigger>3 details worth keeping</CollapsibleTrigger>
      <CollapsibleContent>
        <Body>Make time for the work that matters.</Body>
        <Body>Leave a useful note for tomorrow.</Body>
        <Body>Small progress still counts.</Body>
      </CollapsibleContent>
    </Collapsible>
  );
}
export function ComboboxExample() {
  const [value, setValue] = React.useState("notes");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Combobox
        value={value}
        onValueChange={setValue}
        aria-label="Choose a collection"
        options={[
          { value: "notes", label: "Personal notes" },
          { value: "ideas", label: "Project ideas" },
          { value: "reading", label: "Reading list" },
          { value: "archive", label: "Archive", disabled: true },
        ]}
      />
      <Meta role="status">Selected collection: {value}</Meta>
    </div>
  );
}
export function CommandExample() {
  const [action, setAction] = React.useState("");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Command>
        <CommandInput placeholder="Find an action…" />
        <CommandList>
          <CommandEmpty>No matching action.</CommandEmpty>
          <CommandGroup heading="Notebook">
            <CommandItem onSelect={() => setAction("Created a blank note")}>
              New note<CommandShortcut>⌘ N</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => setAction("Opened your reading list")}>
              Reading list
            </CommandItem>
            <CommandItem onSelect={() => setAction("Showing archived notes")}>
              Archive
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </Command>
      <Meta role="status">
        {action || "Choose an action with the pointer or keyboard."}
      </Meta>
    </div>
  );
}
export function ContextMenuExample() {
  const [status, setStatus] = React.useState("Ready");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <ContextMenuParts.ContextMenu>
        <ContextMenuParts.ContextMenuTrigger asChild>
          <Card
            tabIndex={0}
            aria-label="Example note context menu"
            style={{ padding: 40 }}
          >
            <CardTitle>Morning note</CardTitle>
            <CardDescription>
              Right click or use Shift + F10 for actions.
            </CardDescription>
          </Card>
        </ContextMenuParts.ContextMenuTrigger>
        <ContextMenuParts.ContextMenuContent>
          <ContextMenuParts.ContextMenuLabel>
            Note actions
          </ContextMenuParts.ContextMenuLabel>
          <ContextMenuParts.ContextMenuItem
            onSelect={() => setStatus("A copy of the example note was created")}
          >
            Duplicate
          </ContextMenuParts.ContextMenuItem>
          <ContextMenuParts.ContextMenuSeparator />
          <ContextMenuParts.ContextMenuCheckboxItem
            onCheckedChange={(value) =>
              setStatus(value ? "Example note pinned" : "Example note unpinned")
            }
          >
            Pin note
          </ContextMenuParts.ContextMenuCheckboxItem>
        </ContextMenuParts.ContextMenuContent>
      </ContextMenuParts.ContextMenu>
      <Meta role="status">{status}</Meta>
    </div>
  );
}
export function DatePickerExample() {
  const [date, setDate] = React.useState<Date | undefined>();
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DatePicker
        date={date}
        onDateChange={setDate}
        placeholder="Choose a reflection date"
        triggerProps={{ "aria-label": "Choose a reflection date" }}
        calendarProps={{ defaultMonth: new Date(2026, 8, 1) }}
      />
      <Meta role="status">
        {date
          ? `Reflection date: ${date.toLocaleDateString("en-GB")}`
          : "Choose a date to plan your reflection."}
      </Meta>
    </div>
  );
}
export function DialogExample() {
  const [name, setName] = React.useState("Personal space");
  const [draft, setDraft] = React.useState(name);
  const id = React.useId();
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DialogParts.Dialog>
        <DialogParts.DialogTrigger asChild>
          <Button onClick={() => setDraft(name)}>Rename workspace</Button>
        </DialogParts.DialogTrigger>
        <DialogParts.DialogContent>
          <DialogParts.DialogHeader>
            <DialogParts.DialogTitle>
              A name that feels like yours
            </DialogParts.DialogTitle>
          </DialogParts.DialogHeader>
          <DialogParts.DialogDescription>
            Change the name for this example workspace.
          </DialogParts.DialogDescription>
          <Label htmlFor={id}>Workspace name</Label>
          <Input
            id={id}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
          <DialogParts.DialogFooter>
            <DialogParts.DialogClose asChild>
              <Button variant="secondary">Cancel</Button>
            </DialogParts.DialogClose>
            <DialogParts.DialogClose asChild>
              <Button onClick={() => setName(draft)} disabled={!draft.trim()}>
                Save name
              </Button>
            </DialogParts.DialogClose>
          </DialogParts.DialogFooter>
        </DialogParts.DialogContent>
      </DialogParts.Dialog>
      <Meta role="status">Workspace: {name}</Meta>
    </div>
  );
}
export function DrawerExample() {
  return (
    <DrawerParts.Drawer>
      <DrawerParts.DrawerTrigger asChild>
        <Button>Open daily reflection</Button>
      </DrawerParts.DrawerTrigger>
      <DrawerParts.DrawerContent>
        <DrawerParts.DrawerHeader>
          <DrawerParts.DrawerTitle>A moment to reflect</DrawerParts.DrawerTitle>
        </DrawerParts.DrawerHeader>
        <DrawerParts.DrawerDescription>
          What was one useful thing you learned today?
        </DrawerParts.DrawerDescription>
        <Body>Give yourself a little room to notice.</Body>
        <DrawerParts.DrawerFooter>
          <DrawerParts.DrawerClose asChild>
            <Button>Done for now</Button>
          </DrawerParts.DrawerClose>
        </DrawerParts.DrawerFooter>
      </DrawerParts.DrawerContent>
    </DrawerParts.Drawer>
  );
}
export function DropdownMenuExample() {
  const [pinned, setPinned] = React.useState(false);
  const [status, setStatus] = React.useState("");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DropdownMenuParts.DropdownMenu>
        <DropdownMenuParts.DropdownMenuTrigger asChild>
          <Button variant="secondary">
            Note actions
            <Icon name="chevron-down" />
          </Button>
        </DropdownMenuParts.DropdownMenuTrigger>
        <DropdownMenuParts.DropdownMenuContent>
          <DropdownMenuParts.DropdownMenuLabel>
            Morning note
          </DropdownMenuParts.DropdownMenuLabel>
          <DropdownMenuParts.DropdownMenuItem
            onSelect={() => setStatus("Example note duplicated")}
          >
            Duplicate
          </DropdownMenuParts.DropdownMenuItem>
          <DropdownMenuParts.DropdownMenuCheckboxItem
            checked={pinned}
            onCheckedChange={setPinned}
          >
            Pin note
          </DropdownMenuParts.DropdownMenuCheckboxItem>
          <DropdownMenuParts.DropdownMenuSeparator />
          <DropdownMenuParts.DropdownMenuItem disabled>
            Share link · unavailable in example
          </DropdownMenuParts.DropdownMenuItem>
        </DropdownMenuParts.DropdownMenuContent>
      </DropdownMenuParts.DropdownMenu>
      <Meta role="status">
        {status || (pinned ? "Note pinned" : "Note unpinned")}
      </Meta>
    </div>
  );
}
export function HoverCardExample() {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Button variant="ghost">About this notebook</Button>
      </HoverCardTrigger>
      <HoverCardContent>
        <Avatar variant="pink">
          <AvatarFallback>SJ</AvatarFallback>
        </Avatar>
        <Title>Personal space</Title>
        <Body>A collection of notes, ideas and useful little discoveries.</Body>
        <Meta>12 notes · updated today</Meta>
      </HoverCardContent>
    </HoverCard>
  );
}
export function InputOTPExample() {
  const [value, setValue] = React.useState("");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Label>Enter the six digit example code</Label>
      <InputOTP
        aria-label="Six digit example code"
        maxLength={6}
        value={value}
        onChange={setValue}
        pattern="^[0-9]+$"
      >
        <InputOTPGroup>
          {[0, 1, 2].map((index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          {[3, 4, 5].map((index) => (
            <InputOTPSlot key={index} index={index} />
          ))}
        </InputOTPGroup>
      </InputOTP>
      <Meta role="status">
        {value.length === 6
          ? `Complete: ${value}. This example does not authenticate.`
          : `${value.length} of 6 digits entered.`}
      </Meta>
    </div>
  );
}
export function MenubarExample() {
  const [status, setStatus] = React.useState("Choose a menu action.");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <MenubarParts.Menubar>
        <MenubarParts.MenubarMenu>
          <MenubarParts.MenubarTrigger>Notebook</MenubarParts.MenubarTrigger>
          <MenubarParts.MenubarContent>
            <MenubarParts.MenubarItem
              onSelect={() => setStatus("New notebook created in the example")}
            >
              New notebook
            </MenubarParts.MenubarItem>
            <MenubarParts.MenubarItem
              onSelect={() => setStatus("Example notebook renamed")}
            >
              Rename
            </MenubarParts.MenubarItem>
          </MenubarParts.MenubarContent>
        </MenubarParts.MenubarMenu>
        <MenubarParts.MenubarMenu>
          <MenubarParts.MenubarTrigger>View</MenubarParts.MenubarTrigger>
          <MenubarParts.MenubarContent>
            <MenubarParts.MenubarCheckboxItem
              onCheckedChange={(value) =>
                setStatus(value ? "Compact view on" : "Compact view off")
              }
            >
              Compact view
            </MenubarParts.MenubarCheckboxItem>
          </MenubarParts.MenubarContent>
        </MenubarParts.MenubarMenu>
      </MenubarParts.Menubar>
      <Meta role="status">{status}</Meta>
    </div>
  );
}
export function NavigationMenuExample() {
  const [active, setActive] = React.useState("Notes");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <NavigationMenu aria-label="Example collections">
        <NavigationMenuList>
          {["Notes", "Ideas", "Reading"].map((name, i) => (
            <NavigationMenuItem key={name}>
              <NavigationMenuLink
                href={`#collection-${name.toLowerCase()}`}
                active={active === name}
                onClick={(e) => {
                  e.preventDefault();
                  setActive(name);
                }}
              >
                <Icon name={(["file-text", "sparkles", "brain"] as const)[i]} />
                <NavigationMenuLabel>{name}</NavigationMenuLabel>
                <NavigationMenuCount>{[12, 8, 4][i]}</NavigationMenuCount>
              </NavigationMenuLink>
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
      </NavigationMenu>
      <Meta role="status">Collection: {active}</Meta>
    </div>
  );
}
export function PopoverExample() {
  const [label, setLabel] = React.useState("Personal");
  const id = React.useId();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="secondary">Label: {label}</Button>
      </PopoverTrigger>
      <PopoverContent>
        <div style={{ display: "grid", gap: 12 }}>
          <Label htmlFor={id}>Note label</Label>
          <Input
            id={id}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <PopoverClose asChild>
            <Button size="sm">Done</Button>
          </PopoverClose>
        </div>
      </PopoverContent>
    </Popover>
  );
}
export function RadioGroupExample() {
  const [value, setValue] = React.useState("daily");
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <RadioGroup
        value={value}
        onValueChange={setValue}
        aria-label="Reflection frequency"
      >
        <RadioGroupItem value="daily">
          <RadioGroupBody>Every day</RadioGroupBody>
        </RadioGroupItem>
        <RadioGroupItem value="weekly">
          <RadioGroupBody>Every week</RadioGroupBody>
        </RadioGroupItem>
        <RadioGroupItem value="monthly" disabled>
          <RadioGroupBody>Every month · unavailable</RadioGroupBody>
        </RadioGroupItem>
      </RadioGroup>
      <RadioGroup pictographic defaultValue="learn" aria-label="Example focus">
        <RadioGroupItem value="learn">
          <Disk variant="pink">
            <Icon name="brain" />
          </Disk>
          <RadioGroupBody>Learn</RadioGroupBody>
        </RadioGroupItem>
        <RadioGroupItem value="make">
          <Disk variant="olive">
            <Icon name="sparkles" />
          </Disk>
          <RadioGroupBody>Make</RadioGroupBody>
        </RadioGroupItem>
      </RadioGroup>
      <Meta role="status">Selected schedule: {value}</Meta>
    </div>
  );
}
export function ResizableExample({ variant = "default" }: ExampleProps) {
  return (
    <ResizablePanelGroup
      variant={
        variant as React.ComponentProps<typeof ResizablePanelGroup>["variant"]
      }
      style={{ height: 280, minWidth: 220 }}
    >
      <ResizablePanel defaultSize="35%" minSize="20%">
        <div style={{ padding: 20 }}>
          <Title>Notes</Title>
          <Body>Morning pages</Body>
          <Body>Reading list</Body>
        </div>
      </ResizablePanel>
      <ResizableHandle withHandle aria-label="Resize notebook panels" />
      <ResizablePanel defaultSize="65%" minSize="25%">
        <div style={{ padding: 20 }}>
          <Title>Room to think</Title>
          <Body>
            Drag the handle, or focus it and use the arrow keys, to adjust your
            space.
          </Body>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
export function ScrollAreaExample({ variant = "default" }: ExampleProps) {
  return (
    <ScrollArea
      variant={variant as React.ComponentProps<typeof ScrollArea>["variant"]}
      style={{ height: 220 }}
    >
      <div style={{ display: "grid", gap: 20, padding: 20 }}>
        {Array.from({ length: 12 }, (_, i) => (
          <div key={i}>
            <Title as="h4">Small discovery {i + 1}</Title>
            <Body>A useful thought worth keeping for later.</Body>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}
export function SelectExample() {
  const [value, setValue] = React.useState("weekly");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Select value={value} onValueChange={setValue}>
        <SelectTrigger aria-label="Choose reflection frequency">
          <SelectValue placeholder="Choose frequency" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Reflection frequency</SelectLabel>
            <SelectItem value="daily">Every day</SelectItem>
            <SelectItem value="weekly">Every week</SelectItem>
            <SelectItem value="off">No schedule</SelectItem>
            <SelectItem value="monthly" disabled>
              Every month · unavailable
            </SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>
      <Meta role="status">Selected: {value}</Meta>
    </div>
  );
}
export function SheetExample() {
  const [checked, setChecked] = React.useState(true);
  return (
    <SheetParts.Sheet>
      <SheetParts.SheetTrigger asChild>
        <Button>Workspace preferences</Button>
      </SheetParts.SheetTrigger>
      <SheetParts.SheetContent>
        <SheetParts.SheetHeader>
          <SheetParts.SheetTitle>Make yourself at home</SheetParts.SheetTitle>
        </SheetParts.SheetHeader>
        <SheetParts.SheetDescription>
          A few preferences for this example workspace.
        </SheetParts.SheetDescription>
        <SwitchRow>
          Daily reflection
          <Switch
            checked={checked}
            onCheckedChange={setChecked}
            aria-label="Daily reflection"
          />
        </SwitchRow>
        <Meta>
          {checked
            ? "A daily reflection is enabled."
            : "Daily reflections are off."}
        </Meta>
        <SheetParts.SheetFooter>
          <SheetParts.SheetClose asChild>
            <Button>Done</Button>
          </SheetParts.SheetClose>
        </SheetParts.SheetFooter>
      </SheetParts.SheetContent>
    </SheetParts.Sheet>
  );
}
export function SliderExample({ variant = "default" }: ExampleProps) {
  const [value, setValue] = React.useState([45]);
  const id = React.useId();
  return (
    <SliderWrapper>
      <SliderRow>
        <Label htmlFor={id}>Focus duration</Label>
        <SliderOutput>{value[0]} min</SliderOutput>
      </SliderRow>
      <Slider
        id={id}
        variant={variant as React.ComponentProps<typeof Slider>["variant"]}
        value={value}
        onValueChange={setValue}
        max={90}
        step={5}
        thumbLabel="Focus duration"
      />
      <Meta>Drag or use the arrow keys to adjust the duration.</Meta>
    </SliderWrapper>
  );
}
export function SwitchExample() {
  const [checked, setChecked] = React.useState(false);
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <SwitchRow>
        Keep a daily reflection
        <Switch
          checked={checked}
          onCheckedChange={setChecked}
          aria-label="Keep a daily reflection"
        />
      </SwitchRow>
      <Meta role="status">Daily reflection is {checked ? "on" : "off"}.</Meta>
      <SwitchRow>
        Unavailable preference
        <Switch disabled aria-label="Unavailable preference" />
      </SwitchRow>
    </div>
  );
}
export function TabsExample({ variant = "default" }: ExampleProps) {
  return (
    <Tabs
      defaultValue="notes"
      variant={variant as React.ComponentProps<typeof Tabs>["variant"]}
    >
      <TabsList aria-label="Notebook sections">
        <TabsTrigger value="notes">Notes</TabsTrigger>
        <TabsTrigger value="ideas">Ideas</TabsTrigger>
        <TabsTrigger value="reading">Reading</TabsTrigger>
      </TabsList>
      <TabsContent value="notes">
        <Card>
          <CardTitle>12 useful notes</CardTitle>
          <CardDescription>
            Little things you wanted to remember.
          </CardDescription>
        </Card>
      </TabsContent>
      <TabsContent value="ideas">
        <Card variant="pink">
          <CardTitle>8 ideas taking shape</CardTitle>
          <CardDescription>Somewhere for curiosity to land.</CardDescription>
        </Card>
      </TabsContent>
      <TabsContent value="reading">
        <Card variant="olive">
          <CardTitle>4 things to read</CardTitle>
          <CardDescription>Follow a thread that interests you.</CardDescription>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
export function ToastExample() {
  const [open, setOpen] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  return (
    <ToastProvider>
      <div style={{ display: "grid", gap: 16 }}>
        <Button
          onClick={() => {
            setSaved(true);
            setOpen(true);
          }}
        >
          Save example note
        </Button>
        <Meta role="status">
          {saved ? "Example note saved." : "No example note saved."}
        </Meta>
      </div>
      <Toast open={open} onOpenChange={setOpen}>
        <ToastTitle>Note kept</ToastTitle>
        <ToastDescription>A small thought, saved for later.</ToastDescription>
        <ToastAction
          altText="Undo saving this example note"
          onClick={() => setSaved(false)}
        >
          Undo
        </ToastAction>
        <ToastClose aria-label="Dismiss notification">
          <Icon name="x" />
        </ToastClose>
      </Toast>
      <ToastViewport />
    </ToastProvider>
  );
}
export function ToggleExample({ variant = "default" }: ExampleProps) {
  const [pressed, setPressed] = React.useState(variant === "pressed");
  return (
    <div
      style={{
        display: "flex",
        gap: 16,
        alignItems: "center",
        flexWrap: "wrap",
      }}
    >
      <Toggle
        variant={variant as React.ComponentProps<typeof Toggle>["variant"]}
        pressed={pressed}
        onPressedChange={setPressed}
        aria-label="Pin note"
      >
        {variant === "circle" ? <Icon name="check" /> : "Pin note"}
      </Toggle>
      <Meta role="status">{pressed ? "Pinned" : "Unpinned"}</Meta>
      <Toggle
        variant={variant as React.ComponentProps<typeof Toggle>["variant"]}
        disabled
        aria-label="Unavailable toggle"
      >
        {variant === "circle" ? "B" : "Unavailable"}
      </Toggle>
    </div>
  );
}
export function ToggleGroupExample() {
  const [values, setValues] = React.useState(["bold"]);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <ToggleGroup
        type="multiple"
        value={values}
        onValueChange={setValues}
        aria-label="Text formatting"
      >
        <ToggleGroupItem value="bold" aria-label="Bold">
          B
        </ToggleGroupItem>
        <ToggleGroupItem value="italic" aria-label="Italic">
          <em>I</em>
        </ToggleGroupItem>
        <ToggleGroupItem value="underline" aria-label="Underline">
          <u>U</u>
        </ToggleGroupItem>
      </ToggleGroup>
      <Body
        style={{
          fontWeight: values.includes("bold") ? 700 : 400,
          fontStyle: values.includes("italic") ? "italic" : "normal",
          textDecoration: values.includes("underline") ? "underline" : "none",
        }}
      >
        A thought worth keeping.
      </Body>
    </div>
  );
}
export function TooltipExample() {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <IconButton aria-label="Keyboard shortcut hint">
            <Icon name="sparkles" />
          </IconButton>
        </TooltipTrigger>
        <TooltipContent>Make a little room for ideas.</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
