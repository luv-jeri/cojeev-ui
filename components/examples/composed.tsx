"use client";
import * as React from "react";
import type { ExampleProps } from "./types";
import {
  Attachment,
  AttachmentType,
  AttachmentName,
  AttachmentMeta,
  AttachmentActions,
  AttachmentAction,
} from "@/registry/sahajiv/ui/attachment";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbSeparator,
  BreadcrumbPage,
} from "@/registry/sahajiv/ui/breadcrumb";
import {
  ButtonGroup,
  ButtonGroupItem,
} from "@/registry/sahajiv/ui/button-group";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavigation,
  CarouselPrevious,
  CarouselNext,
  CarouselDots,
} from "@/registry/sahajiv/ui/carousel";
import {
  Chart,
  ChartLine,
  ChartLinePath,
  ChartRing,
  ChartRankedRow,
  ChartRankedLabel,
  ChartRankedValue,
} from "@/registry/sahajiv/ui/chart";
import { DataTable } from "@/registry/sahajiv/ui/data-table";
import { Dropzone } from "@/registry/sahajiv/ui/dropzone";
import {
  Field,
  FieldLabel,
  FieldControl,
  FieldDescription,
  FieldError,
} from "@/registry/sahajiv/ui/field";
import {
  Input,
  InputWrapper,
  InputControl,
  InputAddon,
  InputClear,
} from "@/registry/sahajiv/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupButton,
  InputGroupText,
} from "@/registry/sahajiv/ui/input-group";
import {
  MessageScroller,
  MessageScrollerJump,
} from "@/registry/sahajiv/ui/message-scroller";
import {
  NativeSelect,
  NativeSelectOption,
  NativeSelectOptGroup,
} from "@/registry/sahajiv/ui/native-select";
import { Pagination } from "@/registry/sahajiv/ui/pagination";
import {
  Questionnaire,
  QuestionnaireProgress,
  QuestionnaireQuestion,
  QuestionnaireLabel,
  QuestionnaireOptions,
  QuestionnaireOption,
  QuestionnaireOptionBody,
} from "@/registry/sahajiv/ui/questionnaire";
import {
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarGroupLabel,
  SidebarMenuButton,
  SidebarMenuLabel,
  SidebarFooter,
} from "@/registry/sahajiv/ui/sidebar";
import {
  Stepper,
  StepperList,
  StepperItem,
  StepperIndicator,
  StepperTitle,
  StepperPrevious,
  StepperNext,
  StepperStatus,
} from "@/registry/sahajiv/ui/stepper";
import {
  TableContainer,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from "@/registry/sahajiv/ui/table";
import {
  Textarea,
  TextareaComposer,
  TextareaComposerBar,
  TextareaCount,
} from "@/registry/sahajiv/ui/textarea";
import { Button } from "@/registry/sahajiv/ui/button";
import { Badge } from "@/registry/sahajiv/ui/badge";
import { Card, CardTitle, CardDescription } from "@/registry/sahajiv/ui/card";
import { Icon, Disk } from "@/registry/sahajiv/ui/icon";
import { Label } from "@/registry/sahajiv/ui/label";
import {
  Message,
  MessageContent,
  MessageDescription,
} from "@/registry/sahajiv/ui/message";
import { Body, Meta, Title } from "@/registry/sahajiv/ui/typography";

export function AttachmentExample() {
  const [present, setPresent] = React.useState(true);
  function download() {
    const url = URL.createObjectURL(
      new Blob(
        [
          "A little room to think.\nThree ideas for the week: read, walk, make.",
        ],
        { type: "text/plain" },
      ),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "weekly-notes.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return present ? (
    <Attachment>
      <AttachmentType>TXT</AttachmentType>
      <AttachmentName>
        weekly-notes.txt
        <AttachmentMeta>Local example · plain text</AttachmentMeta>
      </AttachmentName>
      <AttachmentActions>
        <AttachmentAction aria-label="Download weekly notes" onClick={download}>
          <Icon name="download" />
        </AttachmentAction>
        <AttachmentAction
          aria-label="Remove attachment"
          onClick={() => setPresent(false)}
        >
          <Icon name="x" />
        </AttachmentAction>
      </AttachmentActions>
    </Attachment>
  ) : (
    <Button onClick={() => setPresent(true)}>Restore attachment</Button>
  );
}
export function BreadcrumbExample() {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink href="../button">Components</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbLink href="../sidebar">Navigation</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbSeparator />
        <BreadcrumbItem>
          <BreadcrumbPage>Breadcrumb</BreadcrumbPage>
        </BreadcrumbItem>
      </BreadcrumbList>
    </Breadcrumb>
  );
}
export function ButtonGroupExample() {
  const [view, setView] = React.useState("Week");
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <ButtonGroup
        value={view}
        onValueChange={setView}
        aria-label="Schedule range"
      >
        {["Day", "Week", "Month"].map((item) => (
          <ButtonGroupItem key={item} value={item}>
            {item}
          </ButtonGroupItem>
        ))}
      </ButtonGroup>
      <Card>
        <CardTitle>{view} overview</CardTitle>
        <CardDescription>
          {view === "Day"
            ? "2 notes today"
            : view === "Week"
              ? "12 notes this week"
              : "38 notes this month"}
        </CardDescription>
      </Card>
    </div>
  );
}
export function CarouselExample() {
  const [index, setIndex] = React.useState(0);
  return (
    <Carousel aria-label="Ideas to explore" onIndexChange={setIndex}>
      <CarouselContent>
        {[
          "Make space",
          "Follow a thread",
          "Keep the useful bits",
          "Try something small",
        ].map((title, i) => (
          <CarouselItem key={title} style={{ flexBasis: "min(85%, 300px)" }}>
            <Card
              variant={(["pink", "yellow", "olive", "blue"] as const)[i]}
              style={{ minHeight: 180 }}
            >
              <Badge variant="ink">0{i + 1}</Badge>
              <CardTitle>{title}</CardTitle>
              <CardDescription>One thoughtful step at a time.</CardDescription>
            </Card>
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselNavigation>
        <CarouselDots />
        <CarouselPrevious />
        <CarouselNext />
      </CarouselNavigation>
      <Meta role="status">Idea {index + 1} of 4</Meta>
    </Carousel>
  );
}
export function ChartExample() {
  const [showTable, setShowTable] = React.useState(false);
  const data = [
    { label: "Mon", value: 12 },
    { label: "Tue", value: 28 },
    { label: "Wed", value: 0 },
    { label: "Thu", value: 36 },
    { label: "Fri", value: 24 },
  ];
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <Button
        size="sm"
        variant="secondary"
        onClick={() => setShowTable(!showTable)}
      >
        {showTable ? "Hide" : "Show"} data tables
      </Button>
      <Title as="h4">Focus minutes</Title>
      <Chart
        data={data.map(item => ({ ...item, variant: "pink" as const }))}
        max={40}
        showTable={showTable}
        caption="Focus minutes by weekday"
      />
      <ChartLine data={data} showTable={showTable} caption="Focus trend">
        <ChartLinePath variant="hist" d={data.map((item,index) => `${index ? "L" : "M"}${index * 75},${100 - item.value * 2.5}`).join(" ")} style={{ stroke: "var(--v-pink)", fill: "none" }}/>
      </ChartLine>
      <ChartRing
        segments={[
          { label: "Reading", value: 45, color: "pink" },
          { label: "Making", value: 35, color: "olive" },
          { label: "Planning", value: 20, color: "yellow" },
        ]}
        unit="minutes"
        showTable={showTable}
        caption="Time by activity"
      />
      <ChartRankedRow>
        <ChartRankedLabel>Reading</ChartRankedLabel>
        <ChartRankedValue>45 min</ChartRankedValue>
      </ChartRankedRow>
      <Meta>
        Wednesday is a real zero value, retained in both the chart and data
        table.
      </Meta>
    </div>
  );
}
export function DataTableExample() {
  const [selected, setSelected] = React.useState("");
  const data = [
    { id: "01", name: "Morning notes", status: "Draft", words: 230 },
    { id: "02", name: "Reading list", status: "Ready", words: 125 },
    { id: "03", name: "Project ideas", status: "Draft", words: 450 },
    { id: "04", name: "Weekend plan", status: "Ready", words: 80 },
    { id: "05", name: "Small discoveries", status: "Ready", words: 312 },
  ];
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <DataTable
        data={data}
        columns={[
          {
            id: "name",
            header: "Note",
            accessorKey: "name",
            sortValue: (row) => row.name,
          },
          {
            id: "status",
            header: "Status",
            accessorKey: "status",
            sortValue: (row) => row.status,
            cell: (row) => (
              <Badge variant={row.status === "Ready" ? "olive" : "pending"}>
                {row.status}
              </Badge>
            ),
          },
          {
            id: "words",
            header: "Words",
            accessorKey: "words",
            numeric: true,
            sortValue: (row) => row.words,
          },
        ]}
        getRowId={(row) => row.id}
        filters={[
          {
            id: "ready",
            label: "Ready",
            predicate: (row) => row.status === "Ready",
          },
          {
            id: "draft",
            label: "Draft",
            predicate: (row) => row.status === "Draft",
          },
        ]}
        pageSize={3}
        onRowClick={(row) => setSelected(row.name)}
        caption="Local notes — select a row to inspect it"
      />
      <Meta role="status">
        {selected
          ? `Selected note: ${selected}`
          : "Sort a column, filter notes, or select a row."}
      </Meta>
    </div>
  );
}
export function DropzoneExample() {
  const [count, setCount] = React.useState(0);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <Dropzone
        accept=".txt,.md,.pdf"
        multiple
        onFilesSelected={(files) => setCount(files.length)}
      />
      <Meta role="status">
        {count
          ? `${count} file${count === 1 ? "" : "s"} selected. Files stay on this device.`
          : "Choose text, Markdown or PDF files. This example only lists the selection."}
      </Meta>
    </div>
  );
}
export function FieldExample({ variant = "default" }: ExampleProps) {
  const [value, setValue] = React.useState(
    variant === "invalid" ? "ab" : "Personal space",
  );
  const invalid = variant === "invalid" && value.trim().length < 3;
  return (
    <Field invalid={invalid}>
      <FieldLabel>Workspace name</FieldLabel>
      <FieldControl>
        <Input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          minLength={3}
          required
        />
      </FieldControl>
      {invalid ? (
        <FieldError>Use at least three characters.</FieldError>
      ) : (
        <FieldDescription>A name that feels like yours.</FieldDescription>
      )}
    </Field>
  );
}
export function InputExample({
  variant = "default",
  size = "default",
}: ExampleProps) {
  const [query, setQuery] = React.useState("Morning ideas");
  const id = React.useId();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Label htmlFor={id}>Find a note</Label>
      <InputWrapper
        variant={
          variant as React.ComponentProps<typeof InputWrapper>["variant"]
        }
        size={size as React.ComponentProps<typeof InputWrapper>["size"]}
      >
        <InputAddon>
          <Icon name="search" />
        </InputAddon>
        <InputControl
          id={id}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search notes…"
        />
        <InputClear onClear={() => setQuery("")} disabled={!query} />
      </InputWrapper>
      <Meta role="status">
        {query ? `Searching for “${query}”` : "Enter a search term."}
      </Meta>
      <Input
        variant={variant as React.ComponentProps<typeof Input>["variant"]}
        size={size as React.ComponentProps<typeof Input>["size"]}
        disabled
        placeholder="Disabled input"
        aria-label="Disabled example"
      />
    </div>
  );
}
export function InputGroupExample() {
  const [name, setName] = React.useState("personal-space");
  const [saved, setSaved] = React.useState("");
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
      <Label htmlFor="example-workspace-slug">Workspace address</Label>
      <InputGroup>
        <InputGroupAddon>
          <InputGroupText>notes /</InputGroupText>
        </InputGroupAddon>
        <InputGroupInput
          id="example-workspace-slug"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <InputGroupAddon>
          <InputGroupButton
            onClick={() => setSaved(name)}
            disabled={!name.trim()}
          >
            Save
          </InputGroupButton>
        </InputGroupAddon>
      </InputGroup>
      <Meta role="status">
        {saved
          ? `Saved example address: notes / ${saved}`
          : "Choose a short, memorable address."}
      </Meta>
    </div>
  );
}
export function MessageScrollerExample() {
  const [messages, setMessages] = React.useState([
    "A place to gather ideas.",
    "Follow the thread that feels useful.",
    "Small steps are still steps.",
    "Let’s make a little room to think.",
  ]);
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <MessageScroller style={{ height: 260 }}>
        {messages.map((message, i) => (
          <Message key={i} variant={i % 2 ? "me" : "default"}>
            <MessageContent>
              <Body>{message}</Body>
              <MessageDescription>
                {i % 2 ? "You" : "SahaJiv"} · note {i + 1}
              </MessageDescription>
            </MessageContent>
          </Message>
        ))}
        <MessageScrollerJump />
      </MessageScroller>
      <Button
        onClick={() =>
          setMessages((items) => [
            ...items,
            `New thought ${items.length + 1}: keep what matters.`,
          ])
        }
      >
        Add a message
      </Button>
      <Meta>
        Scroll up before adding a message to try the “jump to latest” control.
      </Meta>
    </div>
  );
}
export function NativeSelectExample({ variant = "default" }: ExampleProps) {
  const [value, setValue] = React.useState("weekly");
  const id = React.useId();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Label htmlFor={id}>Reflection frequency</Label>
      <NativeSelect
        id={id}
        variant={
          variant as React.ComponentProps<typeof NativeSelect>["variant"]
        }
        value={value}
        onChange={(e) => setValue(e.target.value)}
      >
        <NativeSelectOptGroup label="Regular">
          <NativeSelectOption value="daily">Every day</NativeSelectOption>
          <NativeSelectOption value="weekly">Every week</NativeSelectOption>
        </NativeSelectOptGroup>
        <NativeSelectOption value="off">No schedule</NativeSelectOption>
      </NativeSelect>
      <Meta role="status">
        {value === "off"
          ? "Reflections are unscheduled."
          : `A ${value} reflection is selected.`}
      </Meta>
    </div>
  );
}
export function PaginationExample() {
  const [page, setPage] = React.useState(1);
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Card>
        <CardTitle>Notebook page {page}</CardTitle>
        <CardDescription>
          Showing notes {(page - 1) * 10 + 1}–{page * 10} of 120.
        </CardDescription>
      </Card>
      <Pagination page={page} totalPages={12} onPageChange={setPage} />
    </div>
  );
}
export function QuestionnaireExample() {
  const [focus, setFocus] = React.useState("");
  const [pace, setPace] = React.useState("");
  return (
    <Questionnaire>
      <QuestionnaireProgress
        value={Number(!!focus) + Number(!!pace)}
        total={2}
        style={{ "--c": "var(--v-yellow)" } as React.CSSProperties}
      />
      <QuestionnaireQuestion>
        <QuestionnaireLabel as="legend">
          What would you like more room for?
        </QuestionnaireLabel>
        <QuestionnaireOptions value={focus} onValueChange={setFocus}>
          {["Learning", "Making", "Resting"].map((option, i) => (
            <QuestionnaireOption key={option} value={option}>
              <Disk variant={(["pink", "yellow", "olive"] as const)[i]}>
                <Icon name={(["brain", "sparkles", "clock"] as const)[i]} />
              </Disk>
              <QuestionnaireOptionBody>{option}</QuestionnaireOptionBody>
            </QuestionnaireOption>
          ))}
        </QuestionnaireOptions>
      </QuestionnaireQuestion>
      <QuestionnaireQuestion>
        <QuestionnaireLabel as="legend">Choose a pace</QuestionnaireLabel>
        <QuestionnaireOptions value={pace} onValueChange={setPace}>
          {["A little every day", "Once a week"].map((option) => (
            <QuestionnaireOption key={option} value={option}>
              <Disk variant="blue"><Icon name="clock"/></Disk>
              <QuestionnaireOptionBody>{option}</QuestionnaireOptionBody>
            </QuestionnaireOption>
          ))}
        </QuestionnaireOptions>
      </QuestionnaireQuestion>
      <Meta role="status">
        {focus && pace
          ? `${focus} · ${pace.toLowerCase()}`
          : "Your choices update the progress above."}
      </Meta>
    </Questionnaire>
  );
}
export function SidebarExample() {
  const [active, setActive] = React.useState("Notes");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 24, minHeight: 360 }}>
      <Sidebar>
        <SidebarHeader>
          <SidebarMenuLabel>Personal space</SidebarMenuLabel>
          <SidebarTrigger />
        </SidebarHeader>
        <SidebarContent aria-label="Example workspace">
          <SidebarGroupLabel>Your space</SidebarGroupLabel>
          {["Notes", "Ideas", "Archive"].map((label, i) => (
            <SidebarMenuButton
              key={label}
              href={`#example-${label.toLowerCase()}`}
              isActive={active === label}
              onClick={(e) => {
                e.preventDefault();
                setActive(label);
              }}
            >
              <Icon name={(["file-text", "sparkles", "clock"] as const)[i]} />
              <SidebarMenuLabel>{label}</SidebarMenuLabel>
            </SidebarMenuButton>
          ))}
        </SidebarContent>
        <SidebarFooter>
          <SidebarGroupLabel>Everything stays close.</SidebarGroupLabel>
        </SidebarFooter>
      </Sidebar>
      <div style={{ minWidth: 0, flex: "1 1 180px" }}>
        <Title>{active}</Title>
        <Body>Selected workspace section.</Body>
      </div>
    </div>
  );
}
export function StepperExample() {
  const [step, setStep] = React.useState(1);
  const labels = ["Name", "Preferences", "Ready"];
  return (
    <Stepper
      value={step}
      onValueChange={setStep}
      count={labels.length}
      labels={labels}
    >
      <StepperList>
        {labels.map((label, i) => (
          <StepperItem key={label} step={i+1}>
            <StepperIndicator step={i+1} />
            <StepperTitle>{label}</StepperTitle>
          </StepperItem>
        ))}
      </StepperList>
      <Card>
        <CardTitle>{labels[step-1]}</CardTitle>
        {step === 1 ? (
          <Input aria-label="Space name" placeholder="Name your space" />
        ) : step === 2 ? (
          <Body>Keep a little room for curiosity.</Body>
        ) : (
          <Body>Your example workspace is ready.</Body>
        )}
      </Card>
      <div
        style={{
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <StepperPrevious />
        <StepperStatus />
        <StepperNext />
      </div>
    </Stepper>
  );
}
export function TableExample() {
  return (
    <TableContainer>
      <Table>
        <TableCaption>A small notebook, at a glance</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Note</TableHead>
            <TableHead>Status</TableHead>
            <TableHead numeric>Words</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[
            { title: "Morning pages", status: "Ready", words: 240 },
            { title: "Reading notes", status: "Draft", words: 128 },
            { title: "A blank page", status: "New", words: 0 },
          ].map((note) => (
            <TableRow key={note.title}>
              <TableCell>{note.title}</TableCell>
              <TableCell>
                <Badge variant={note.status === "Ready" ? "olive" : "cream"}>
                  {note.status}
                </Badge>
              </TableCell>
              <TableCell numeric>{note.words}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
export function TextareaExample() {
  const [value, setValue] = React.useState("");
  const [saved, setSaved] = React.useState("");
  const id = React.useId();
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <Label htmlFor={id}>A thought worth keeping</Label>
      <TextareaComposer>
        <Textarea
          id={id}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={280}
          placeholder="Start anywhere…"
        />
        <TextareaComposerBar>
          <TextareaCount value={value} maxLength={280} />
          <Button
            size="sm"
            disabled={!value.trim()}
            onClick={() => {
              setSaved(value);
              setValue("");
            }}
          >
            Keep note
          </Button>
        </TextareaComposerBar>
      </TextareaComposer>
      {saved && (
        <Card>
          <CardTitle>Saved in this example</CardTitle>
          <CardDescription>{saved}</CardDescription>
        </Card>
      )}
    </div>
  );
}
