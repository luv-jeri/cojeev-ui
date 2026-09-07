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
import { Card, CardTitle, CardDescription } from "@/registry/sahajiv/ui/card";
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
import { Shape, shapeNames } from "@/registry/sahajiv/ui/shape";
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

export function AlertExample({ variant = "default" }: ExampleProps) {
  const [visible, setVisible] = React.useState(true);
  return visible ? (
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
    </Alert>
  ) : (
    <Button onClick={() => setVisible(true)}>Show alert again</Button>
  );
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
  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div
        style={{
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Button
          variant={variant as React.ComponentProps<typeof Button>["variant"]}
          size={size as React.ComponentProps<typeof Button>["size"]}
          onClick={() => setCount((n) => n + 1)}
        >
          Add a note
        </Button>
        <Button
          variant={variant as React.ComponentProps<typeof Button>["variant"]}
          size={size as React.ComponentProps<typeof Button>["size"]}
          disabled
        >
          Disabled
        </Button>
        <Button
          variant={variant as React.ComponentProps<typeof Button>["variant"]}
          size={size as React.ComponentProps<typeof Button>["size"]}
          loading
        >
          Saving
        </Button>
      </div>
      <Meta role="status">
        {count} {count === 1 ? "note" : "notes"} added in this example.
      </Meta>
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
      <Badge variant="ink">Personal space</Badge>
      <CardTitle>A place for the details</CardTitle>
      <CardDescription>
        Keep your notes, ideas and next steps together.
      </CardDescription>
      <Stats>
        <Stat>12 notes</Stat>
        <Stat>Updated today</Stat>
      </Stats>
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
      {added ? (
        <Card>
          <CardTitle>Your first note</CardTitle>
          <CardDescription>A small beginning.</CardDescription>
          <Button size="sm" onClick={() => setAdded(false)}>
            Reset example
          </Button>
        </Card>
      ) : (
        <Empty>
          <Shape name="star-4" style={{ width: 48, height: 48 }} />
          <EmptyTitle>Room for your first idea</EmptyTitle>
          <EmptyDescription>
            Add a note to start collecting what matters.
          </EmptyDescription>
          <Button onClick={() => setAdded(true)}>Create a note</Button>
        </Empty>
      )}
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
export function IconExample({ size = "default" }: ExampleProps) {
  const [query, setQuery] = React.useState("");
  const names = iconNames.filter((name) => name.includes(query.toLowerCase()));
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <Input
        aria-label="Filter icons"
        placeholder="Filter icon names…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Disk variant="pink">
          <Icon name="sparkles" />
        </Disk>
        <IconButton
          aria-label="Example settings"
          onClick={() => setQuery("settings")}
        >
          <Icon name="settings" />
        </IconButton>
        <Meta>{names.length} glyphs</Meta>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill,minmax(96px,1fr))",
          gap: 18,
        }}
      >
        {names.map((name) => (
          <div
            key={name}
            style={{ display: "grid", justifyItems: "center", gap: 8 }}
          >
            <Icon
              name={name}
              size={size as React.ComponentProps<typeof Icon>["size"]}
            />
            <Meta>{name}</Meta>
          </div>
        ))}
      </div>
    </div>
  );
}
export function ShapeExample() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill,minmax(120px,1fr))",
        gap: 24,
      }}
    >
      {shapeNames.map((name) => (
        <div
          key={name}
          style={{ display: "grid", justifyItems: "center", gap: 12 }}
        >
          <Shape
            name={name}
            style={
              {
                width: 56,
                height: 56,
                "--c": "var(--v-pink-deep)",
              } as React.CSSProperties
            }
          />
          <Meta>{name}</Meta>
        </div>
      ))}
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
