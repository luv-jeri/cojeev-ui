"use client";
import * as React from "react";
import type { ExampleProps } from "./types";
import {
  Alert,
  AlertBody,
  AlertTitle,
  AlertDescription,
  AlertIcon,
  AlertActions,
} from "@/registry/sahajiv/ui/alert";
import { AspectRatio } from "@/registry/sahajiv/ui/aspect-ratio";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
} from "@/registry/sahajiv/ui/avatar";
import { Badge } from "@/registry/sahajiv/ui/badge";
import {
  Bubble,
  BubbleRow,
  BubbleContent,
  BubbleTime,
} from "@/registry/sahajiv/ui/bubble";
import { Button } from "@/registry/sahajiv/ui/button";
import { CodeBlock } from "@/registry/sahajiv/ui/code-block";
import { NativeSelect, NativeSelectOption } from "@/registry/sahajiv/ui/native-select";
import { Card, CardTitle, CardDescription, CardContent, CardFooter } from "@/registry/sahajiv/ui/card";
import { Direction } from "@/registry/sahajiv/ui/direction";
import {
  Empty,
  EmptyTitle,
  EmptyDescription,
  EmptyState,
  EmptyStateTitle,
  EmptyStateDescription,
} from "@/registry/sahajiv/ui/empty";
import { Icon, IconButton, Disk, iconNames } from "@/registry/sahajiv/ui/icon";
import { Input } from "@/registry/sahajiv/ui/input";
import {
  Item,
  ItemGroup,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemTrailing,
} from "@/registry/sahajiv/ui/item";
import { Kbd } from "@/registry/sahajiv/ui/kbd";
import { Label, Stats, Stat } from "@/registry/sahajiv/ui/label";
import { Marker } from "@/registry/sahajiv/ui/marker";
import {
  Message,
  MessageContent,
  MessageDescription,
} from "@/registry/sahajiv/ui/message";
import { Progress } from "@/registry/sahajiv/ui/progress";
import { Separator } from "@/registry/sahajiv/ui/separator";
import { Shape, ShapeMorph, shapeNames, signatureShapeNames, type SignatureShapeName } from "@/registry/sahajiv/ui/shape";
import { Skeleton, SkeletonGroup } from "@/registry/sahajiv/ui/skeleton";
import { Spinner } from "@/registry/sahajiv/ui/spinner";
import {
  Typography,
  Hero,
  Display,
  SectionTitle,
  Title,
  Lead,
  Body,
  BodySecondary,
  ControlText,
  Meta,
  Caps,
  Value,
  Identifier,
} from "@/registry/sahajiv/ui/typography";
import { Adjuster } from "@/registry/sahajiv/ui/adjuster";
import { Preview } from "@/registry/sahajiv/ui/preview";
import { MotionPresence, MotionSurface } from "@/registry/sahajiv/ui/presence";

export function AlertExample({ variant = "default" }: ExampleProps) {
  const [visible, setVisible] = React.useState(true);
  return <MotionPresence mode="wait">{visible ? (
    <MotionSurface key="alert" asChild preset="rise">
    <Alert variant={variant as React.ComponentProps<typeof Alert>["variant"]}>
      <AlertIcon>
        <Icon name="check" />
      </AlertIcon>
      <AlertBody>
        <AlertTitle>Your workspace is ready</AlertTitle>
        <AlertDescription>
          Three local notes are available to explore.
        </AlertDescription>
        <AlertActions>
          <Button size="sm" variant="ghost" onClick={() => setVisible(false)}>
            Dismiss
          </Button>
        </AlertActions>
      </AlertBody>
    </Alert></MotionSurface>
  ) : (
    <MotionSurface key="restore" asChild preset="fade"><Button onClick={() => setVisible(true)}>Show alert again</Button></MotionSurface>
  )}</MotionPresence>;
}
export function AspectRatioExample() {
  return (
    <div style={{ maxWidth: 420 }}>
      <AspectRatio ratio={16 / 9} variant="pink">
        <Shape name="star-4" style={{ width: 72, height: 72 }} />
        <Meta style={{ color: "var(--muted-foreground-ink)" }}>
          16:9 · a frame that keeps its proportions
        </Meta>
      </AspectRatio>
    </div>
  );
}
export function AvatarExample({
  variant = "default",
  size = "default",
}: ExampleProps) {
  return (
    <AvatarGroup>
      <Avatar
        variant={variant as React.ComponentProps<typeof Avatar>["variant"]}
        size={size as React.ComponentProps<typeof Avatar>["size"]}
      >
        <AvatarFallback>SK</AvatarFallback>
      </Avatar>
      <Avatar
        variant="pink"
        size={size as React.ComponentProps<typeof Avatar>["size"]}
      >
        <AvatarFallback>AM</AvatarFallback>
      </Avatar>
      <Avatar
        variant="olive"
        size={size as React.ComponentProps<typeof Avatar>["size"]}
      >
        <AvatarFallback>JL</AvatarFallback>
      </Avatar>
    </AvatarGroup>
  );
}
export function BadgeExample({
  variant = "default",
  size = "default",
}: ExampleProps) {
  return (
    <Badge
      variant={variant as React.ComponentProps<typeof Badge>["variant"]}
      size={size as React.ComponentProps<typeof Badge>["size"]}
    >
      {variant === "count" ? "12" : variant === "live" ? "Live" : "In progress"}
    </Badge>
  );
}
export function BubbleExample() {
  return (
    <Bubble>
      <BubbleRow>
        <BubbleContent variant="tail">
          What should we focus on today?
        </BubbleContent>
      </BubbleRow>
      <BubbleRow variant="me">
        <BubbleContent variant="me">A little room to think.</BubbleContent>
      </BubbleRow>
      <BubbleTime>Today · 09:41</BubbleTime>
    </Bubble>
  );
}
export function ButtonExample({
  variant = "default",
  size = "default",
}: ExampleProps) {
  const [count, setCount] = React.useState(0);
  const [outcome, setOutcome] = React.useState("success");
  const [phase, setPhase] = React.useState<"idle" | "pending" | "success" | "error">("idle");
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const outcomeId = React.useId();
  React.useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  function runExample() {
    if (timer.current) return;
    setPhase("pending");
    timer.current = setTimeout(() => {
      timer.current = null;
      if (outcome === "error") setPhase("error");
      else { setCount((value) => value + 1); setPhase("success"); }
    }, 650);
  }
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Button
          variant={variant as React.ComponentProps<typeof Button>["variant"]}
          size={size as React.ComponentProps<typeof Button>["size"]}
          onClick={runExample}
          loading={phase === "pending"}
          disabled={phase === "pending"}
        >
          {phase === "pending" ? "Adding…" : phase === "error" ? "Retry example" : "Add a note"}
        </Button>
        <Button
          variant={variant as React.ComponentProps<typeof Button>["variant"]}
          size={size as React.ComponentProps<typeof Button>["size"]}
          disabled
        >
          Disabled
        </Button>
      </div>
      <div style={{ display: "grid", justifyItems: "start", gap: 8 }}>
        <Label htmlFor={outcomeId}>Example outcome</Label>
        <NativeSelect id={outcomeId} value={outcome} disabled={phase === "pending"} onChange={(event) => setOutcome(event.target.value)}>
          <NativeSelectOption value="success">Success</NativeSelectOption>
          <NativeSelectOption value="error">Error and retry</NativeSelectOption>
        </NativeSelect>
      </div>
      <Meta role="status" aria-live="polite">
        {phase === "pending" ? "Running the local example…" : phase === "error" ? "The example action failed. Choose Success and retry." : `${count} ${count === 1 ? "note" : "notes"} added in this example.`}
      </Meta>
      <Meta>This demo only updates the count on this page.</Meta>
    </div>
  );
}
export function CardExample({
  variant = "default",
  size = "default",
}: ExampleProps) {
  return (
    <Card
      variant={variant as React.ComponentProps<typeof Card>["variant"]}
      size={size as React.ComponentProps<typeof Card>["size"]}
      style={{ maxWidth: 400 }}
    >
      <Shape name="clover-soft" className="v-wm" style={{opacity:.22}}/>
      <Badge variant="ink">Personal space</Badge>
      <CardContent style={{marginTop:16}}>
      <CardTitle>A place for the details</CardTitle>
      <CardDescription>
        Keep your notes, ideas and next steps together.
      </CardDescription>
      </CardContent>
      <CardFooter>
        <Stat>12 notes</Stat>
        <Stat>Updated today</Stat>
      </CardFooter>
    </Card>
  );
}
export function DirectionExample() {
  const [rtl, setRtl] = React.useState(true);
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Button variant="secondary" onClick={() => setRtl(!rtl)}>
        Direction: {rtl ? "right to left" : "left to right"}
      </Button>
      <Direction dir={rtl ? "rtl" : "ltr"}>
        <Card>
          <Title>{rtl ? "مساحة للأفكار" : "Room for ideas"}</Title>
          <Body>
            {rtl
              ? "كل خطوة صغيرة تصنع فرقاً."
              : "Every small step makes a difference."}
          </Body>
          <Button>
            <Icon name={rtl ? "arrow-left" : "arrow-right"} />
            {rtl ? "متابعة" : "Continue"}
          </Button>
        </Card>
      </Direction>
    </div>
  );
}
export function EmptyExample() {
  const [added, setAdded] = React.useState(false);
  return (
    <div style={{ display: "grid", gap: 24 }}>
      <MotionPresence mode="wait">{added ? (
        <MotionSurface key="note" asChild preset="rise"><Card>
          <CardTitle>Your first note</CardTitle>
          <CardDescription>A small beginning.</CardDescription>
          <Button size="sm" onClick={() => setAdded(false)}>
            Reset example
          </Button>
        </Card></MotionSurface>
      ) : (
        <MotionSurface key="empty" asChild preset="scale"><Empty>
          <Shape name="star-4" style={{ width: 48, height: 48 }} />
          <EmptyTitle>Room for your first idea</EmptyTitle>
          <EmptyDescription>
            Add a note to start collecting what matters.
          </EmptyDescription>
          <Button onClick={() => setAdded(true)}>Create a note</Button>
        </Empty></MotionSurface>
      )}</MotionPresence>
      {(["partial", "error", "filtered"] as const).map((variant) => (
        <EmptyState key={variant} variant={variant}>
          <EmptyStateTitle>
            {variant === "filtered"
              ? "No matches"
              : variant === "error"
                ? "Could not load notes"
                : "Some notes are still loading"}
          </EmptyStateTitle>
          <EmptyStateDescription>
            {variant === "filtered"
              ? "Try another search."
              : "This is an example of an empty state."}
          </EmptyStateDescription>
        </EmptyState>
      ))}
    </div>
  );
}
export function ItemExample({ variant = "default" }: ExampleProps) {
  const [selected, setSelected] = React.useState("Morning plan");
  return (
    <div style={{ display: "grid", gap: 12 }}>
      <ItemGroup>
        {["Morning plan", "Reading list", "Weekend ideas"].map((title) => (
          <Item
            key={title}
            variant={
              (variant === "selected"
                ? title === selected
                  ? "selected"
                  : "default"
                : variant) as React.ComponentProps<typeof Item>["variant"]
            }
            onClick={() => setSelected(title)}
          >
            <Disk variant="pink">
              <Icon name="file-text" />
            </Disk>
            <ItemContent>
              <ItemTitle>{title}</ItemTitle>
              <ItemDescription>Personal notes · updated today</ItemDescription>
            </ItemContent>
            <ItemTrailing variant="blue">
              <Icon name="arrow-right" />
            </ItemTrailing>
          </Item>
        ))}
      </ItemGroup>
      <Meta role="status">Selected: {selected}</Meta>
    </div>
  );
}
export function KbdExample() {
  return (
    <Body>
      Open search with <Kbd>⌘</Kbd> <Kbd>K</Kbd>. Use <Kbd>Esc</Kbd> to close
      it.
    </Body>
  );
}
export function LabelExample({ size = "default" }: ExampleProps) {
  const id = React.useId();
  return (
    <div style={{ display: "grid", gap: 12, maxWidth: 380 }}>
      <Label
        htmlFor={id}
        size={size as React.ComponentProps<typeof Label>["size"]}
      >
        Workspace name
      </Label>
      <Input id={id} defaultValue="Personal space" />
      <Stats>
        <Stat>Private</Stat>
        <Stat variant="ul">Saved locally</Stat>
      </Stats>
    </div>
  );
}
export function MarkerExample({ variant = "default" }: ExampleProps) {
  return (
    <Marker variant={variant as React.ComponentProps<typeof Marker>["variant"]}>
      <Icon name="check" />
      {variant === "danger"
        ? "Connection needs attention"
        : variant === "ok"
          ? "All changes saved"
          : "Updated a moment ago"}
    </Marker>
  );
}
export function MessageExample({ variant = "default" }: ExampleProps) {
  return (
    <Message
      variant={variant as React.ComponentProps<typeof Message>["variant"]}
    >
      <Avatar variant="pink">
        <AvatarFallback>{variant === "me" ? "You" : "SJ"}</AvatarFallback>
      </Avatar>
      <MessageContent>
        <Body>
          {variant === "me"
            ? "Let’s start with the reading list."
            : "I have grouped your notes into three themes."}
        </Body>
        <MessageDescription>
          {variant === "me" ? "You" : "SahaJiv"} · 09:41
        </MessageDescription>
      </MessageContent>
    </Message>
  );
}
export function ProgressExample({
  variant = "default",
  size = "default",
}: ExampleProps) {
  const [value, setValue] = React.useState(45);
  return (
    <div style={{ display: "grid", gap: 16, minWidth: 200 }}>
      <Progress
        variant={variant as React.ComponentProps<typeof Progress>["variant"]}
        size={size as React.ComponentProps<typeof Progress>["size"]}
        value={variant === "unavail" ? null : value}
        aria-label="Example progress"
        style={{ "--c": "var(--v-yellow)" } as React.CSSProperties}
      />
      <Meta role="status">
        {variant === "unavail" ? "Progress unavailable" : `${value}% complete`}
      </Meta>
      <div style={{ display: "flex", gap: 8 }}>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setValue((v) => Math.max(0, v - 10))}
          disabled={value === 0 || variant === "unavail"}
        >
          Decrease
        </Button>
        <Button
          size="sm"
          onClick={() => setValue((v) => Math.min(100, v + 10))}
          disabled={value === 100 || variant === "unavail"}
        >
          Increase
        </Button>
      </div>
    </div>
  );
}
export function SeparatorExample({ variant = "default" }: ExampleProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: variant === "v" ? "row" : "column",
        alignItems: variant === "v" ? "stretch" : undefined,
        minHeight: 48,
      }}
    >
      <Body>Notes</Body>
      <Separator
        variant={variant as React.ComponentProps<typeof Separator>["variant"]}
      />
      <Body>Ideas</Body>
    </div>
  );
}
export function SkeletonExample({ variant = "default" }: ExampleProps) {
  return variant === "skel-group" ? (
    <SkeletonGroup aria-label="Loading a note">
      <Skeleton variant="disk" style={{ width: 48, height: 48 }} />
      <Skeleton variant="line" style={{ width: "80%" }} />
      <Skeleton variant="line" style={{ width: "60%" }} />
    </SkeletonGroup>
  ) : (
    <Skeleton
      variant={variant as React.ComponentProps<typeof Skeleton>["variant"]}
      aria-label="Loading content"
      style={{
        width: variant === "disk" ? 56 : "min(100%, 320px)",
        height: variant === "line" ? 12 : variant === "card" ? 140 : 56,
      }}
    />
  );
}
export function SpinnerExample({ variant = "default" }: ExampleProps) {
  return (
    <div
      style={{
        display: "grid",
        justifyItems: "center",
        padding: "20px 0 32px",
      }}
    >
      <Spinner
        variant={variant as React.ComponentProps<typeof Spinner>["variant"]}
        label="Preparing your workspace"
      />
    </div>
  );
}
export function TypographyExample() {
  return (
    <Typography>
      <Caps>Everyday type</Caps>
      <Hero style={{ fontSize: "clamp(36px,8vw,72px)", whiteSpace: "normal" }}>
        Room to think.
      </Hero>
      <Display>Good things take shape</Display>
      <SectionTitle>A considered collection</SectionTitle>
      <Title>Start with the useful details</Title>
      <Lead>Clear language gives ideas somewhere to land.</Lead>
      <Body>
        Body text keeps longer thoughts comfortable to read, with a steady
        rhythm and a little space.
      </Body>
      <BodySecondary>
        Secondary text adds context without competing.
      </BodySecondary>
      <ControlText>Save changes</ControlText>
      <Meta>Updated today at 09:41</Meta>
      <Value>128</Value>
      <Identifier>note_7f3a</Identifier>
    </Typography>
  );
}
export function IconExample({ variant = "default", size = "default" }: ExampleProps) {
  const [query, setQuery] = React.useState("");
  const [buttonVariant, setButtonVariant] = React.useState<NonNullable<React.ComponentProps<typeof IconButton>["variant"]>>(variant as NonNullable<React.ComponentProps<typeof IconButton>["variant"]>);
  const [buttonSize, setButtonSize] = React.useState<NonNullable<React.ComponentProps<typeof IconButton>["size"]>>(size as NonNullable<React.ComponentProps<typeof IconButton>["size"]>);
  const [saved, setSaved] = React.useState(false);
  const controlId = React.useId();
  const names = iconNames.filter((name) => name.includes(query.toLowerCase()));
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Title as="h3">Icon buttons</Title>
      <Meta>An action uses IconButton; a decorative icon holder uses Disk. Every icon-only action needs an accessible name.</Meta>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        <div style={{ display: "grid", gap: 8 }}>
          <Label htmlFor={controlId + "-variant"}>Button style</Label>
          <NativeSelect id={controlId + "-variant"} value={buttonVariant} onChange={(event) => setButtonVariant(event.target.value as typeof buttonVariant)}>
            {(["default", "dashed", "ink", "pink", "beige", "cream"] as const).map((value) => <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>)}
          </NativeSelect>
        </div>
        <div style={{ display: "grid", gap: 8 }}>
          <Label htmlFor={controlId + "-size"}>Button size</Label>
          <NativeSelect id={controlId + "-size"} value={buttonSize} onChange={(event) => setButtonSize(event.target.value as typeof buttonSize)}>
            {(["default", "sm", "lg", "xl"] as const).map((value) => <NativeSelectOption key={value} value={value}>{value}</NativeSelectOption>)}
          </NativeSelect>
        </div>
      </div>
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
        <IconButton variant={buttonVariant} size={buttonSize} aria-label="Save example" aria-pressed={saved} onClick={() => setSaved((value) => !value)}>
          <Icon name={saved ? "check" : "star"} />
        </IconButton>
        <IconButton variant={buttonVariant} size={buttonSize} aria-label="Unavailable settings" disabled><Icon name="settings" /></IconButton>
        <Disk variant="pink"><Icon name="sparkles" /></Disk>
      </div>
      <Meta role="status" aria-live="polite">{saved ? "Example saved on this page." : "Example not saved."} Use Tab to focus the action, then Enter or Space.</Meta>
      <Title as="h3">Icon catalog</Title>
      <Input aria-label="Filter icons" placeholder="Filter icon names…" value={query} onChange={(event) => setQuery(event.target.value)} />
      <Meta>{names.length} glyphs</Meta>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))", gap: 18 }}>
        {names.map((name) => (
          <div key={name} style={{ display: "grid", justifyItems: "center", gap: 8 }}>
            <Icon name={name} size={(size === "xl" ? "lg" : size) as React.ComponentProps<typeof Icon>["size"]} />
            <Meta>{name}</Meta>
          </div>
        ))}
      </div>
    </div>
  );
}
export function ShapeExample() {
  const [name, setName] = React.useState<SignatureShapeName>("daisy-12");
  const [palette, setPalette] = React.useState("var(--v-pink-deep)");
  const [outline, setOutline] = React.useState(false);
  const colors = [{ name: "Mulberry", color: "var(--v-pink-deep)" }, { name: "Olive", color: "var(--v-olive)" }, { name: "Ink", color: "var(--v-ink)" }, { name: "Pink", color: "var(--v-pink)" }];
  return (
    <div className="v-shape-explorer" style={{ "--shape-color": palette } as React.CSSProperties}>
      <div className="v-shape-explorer__stage">
        <div className="v-shape-explorer__art">
          <ShapeMorph name={name} variant={outline ? "outline" : "fill"} label={`Selected shape: ${name}`} />
        </div>
        <div className="v-shape-explorer__caption">
          <Caps>Living geometry</Caps>
          <Title>{name.replaceAll("-", " ")}</Title>
          <BodySecondary>Pick a silhouette and watch its contour take a new form.</BodySecondary>
          <div className="v-shape-explorer__palette" role="group" aria-label="Shape color">
            {colors.map(color => <Button key={color.name} size="sm" variant="ghost" aria-label={color.name} aria-pressed={palette === color.color} onClick={() => setPalette(color.color)}><span aria-hidden="true" style={{ width: 16, height: 16, borderRadius: "50%", background: color.color, boxShadow: "inset 0 0 0 1px var(--v-border)" }} />{color.name}</Button>)}
          </div>
          <Button variant="secondary" size="sm" aria-pressed={outline} onClick={() => setOutline(value => !value)}>{outline ? "Use solid fill" : "Use outline"}</Button>
        </div>
      </div>
      <div className="v-shape-explorer__choices" role="group" aria-label="Signature shapes">
        {signatureShapeNames.map(shape => <Button key={shape} variant="ghost" className="v-shape-explorer__choice" aria-label={`Morph to ${shape}`} aria-pressed={name === shape} onClick={() => setName(shape)}><Shape name={shape} style={{ width: 30, height: 30, "--c": "var(--shape-color)" } as React.CSSProperties} /><Meta>{shape}</Meta></Button>)}
      </div>
      <div className="v-shape-explorer__catalog-head"><Title>Every silhouette</Title><Meta>{shapeNames.length} reusable shapes · SVG masks and matching morph surfaces</Meta></div>
      <div className="v-shape-gallery">
        {shapeNames.map(shape => <div key={shape} className="v-shape-gallery__item"><Shape name={shape} style={{ width: 52, height: 52, "--c": "var(--shape-color)" } as React.CSSProperties} /><Meta>{shape}</Meta></div>)}
      </div>
    </div>
  );
}
export function AdjusterExample() {
  return <Adjuster defaultOpen />;
}
export function PreviewExample() {
  return (
    <Preview
      title="A reusable example"
      code={'<Button variant="accent">Add a note</Button>'}
    >
      <Button variant="accent">Add a note</Button>
    </Preview>
  );
}

export function CodeBlockExample() {
  const [wrap, setWrap] = React.useState(false);
  const code = 'import { Button } from "@/components/ui/button";\n\nexport function SaveAction({ onSave }: { onSave: () => void }) {\n  return <Button onClick={onSave}>Save note</Button>;\n}';
  return (
    <div style={{ display: "grid", gap: 16, minWidth: 0 }}>
      <Button variant="ghost" size="sm" aria-pressed={wrap} onClick={() => setWrap((value) => !value)}>{wrap ? "Keep lines unwrapped" : "Wrap long lines"}</Button>
      <CodeBlock code={code} title="save-action.tsx" language="tsx" wrap={wrap} />
      <Meta>Copy keeps the original text, including line breaks. You can also select the code and copy it manually.</Meta>
    </div>
  );
}
