"use client";

import * as React from "react";
import { MotionDrawer } from "@/registry/cojeev/ui/motion-drawer";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import { BodySecondary, Meta, Title } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";

const drawerChapters = [
  { name: "Overview", summary: "A quiet starting point for the things you collect, connect and make.", detail: "Find your way around the library and choose a place to begin.", time: "2 min" },
  { name: "Shapes", summary: "A small family of shapes gives familiar tools a little character.", detail: "Explore soft corners, expressive silhouettes and useful combinations.", time: "4 min" },
  { name: "Motion", summary: "Movement shows what changed and helps your attention follow along.", detail: "See how entrances, transitions and direct manipulation work together.", time: "3 min" },
  { name: "Principles", summary: "Clear controls, useful feedback and room to make things your own.", detail: "Build around readable content, predictable actions and accessible choices.", time: "5 min" },
];
const drawerExampleFrame: React.CSSProperties = { display: "grid", justifyItems: "start", gap: 20, width: "100%", minWidth: 0 };
const drawerReceiptStyle: React.CSSProperties = { display: "block", minHeight: 32, margin: 0, color: "var(--v-text-2)", lineHeight: 1.5 };
const drawerSurfaceStyle: React.CSSProperties = { display: "grid", alignContent: "start", gap: 12, width: "100%", minWidth: 0, minHeight: 152, padding: 22, border: "1px solid var(--v-border)", borderRadius: "var(--r-card-sm)", background: "var(--v-paper)" };

function ChapterDrawerExample({ compact }: { compact?: boolean }) {
  const [selected, setSelected] = React.useState(0);
  const [open, setOpen] = React.useState(false);
  const contentId = `drawer-chapter-${React.useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const chapter = drawerChapters[selected];
  return <div style={drawerExampleFrame}>
    <MotionDrawer open={open} onOpenChange={setOpen} variant="default" title="Chapters" triggerLabel="Explore chapters" width={300}>
      <nav aria-label="Example chapters" style={{ display: "grid", gap: 12, paddingBlock: 8 }}>
        {drawerChapters.map((item, index) => <a key={item.name} href={`#${contentId}`} aria-current={selected === index ? "page" : undefined} style={{ paddingBlock: 7, color: "var(--v-text)", fontSize: 15, lineHeight: 1.4, textDecoration: "none", fontWeight: selected === index ? 600 : 400 }} onClick={event => { event.preventDefault(); setSelected(index); setOpen(false); }}>{item.name}</a>)}
      </nav>
    </MotionDrawer>
    <section id={contentId} aria-label="Selected chapter" style={drawerSurfaceStyle}>
      <Meta>THE FIELD GUIDE</Meta>
      <Title as="h3" style={{ margin: 0 }}>{chapter.name}</Title>
      {!compact && <BodySecondary style={{ margin: 0, color: "var(--v-text-2)" }}>{chapter.summary}</BodySecondary>}
      <Meta role="status" aria-live="polite" style={drawerReceiptStyle}>{chapter.name} is open.</Meta>
    </section>
  </div>;
}

function FloatingDrawerExample({ compact }: { compact?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [pinned, setPinned] = React.useState(false);
  const [notifications, setNotifications] = React.useState(false);
  const receipt = `Note ${pinned ? "pinned" : "unpinned"} · Notifications ${notifications ? "on" : "off"}.`;
  const actionStyle: React.CSSProperties = { justifyContent: "flex-start", width: "100%", height: "auto", minHeight: 60, padding: 12, whiteSpace: "normal", textAlign: "start" };
  return <div style={drawerExampleFrame}>
    <MotionDrawer open={open} onOpenChange={setOpen} variant="floating" width={360} title="A small thought" description="Keep this note close. Changes appear in the example." triggerLabel="Open quick actions" buttonOpeningVariants="stay">
      <div style={{ display: "grid", gap: 10 }}>
        <Button variant="ghost" shape="card" aria-pressed={pinned} style={actionStyle} onClick={() => setPinned(value => !value)}>
          <Icon name="bookmark" size="sm" aria-hidden="true" />
          <span style={{ display: "grid", flex: 1, gap: 5 }}><span>{pinned ? "Unpin note" : "Pin note"}</span><Meta>{pinned ? "Kept at the top of this example" : "Give this thought a little space"}</Meta></span>
          {pinned && <Icon name="check" size="sm" aria-hidden="true" />}
        </Button>
        <Button variant="ghost" shape="card" aria-pressed={notifications} style={actionStyle} onClick={() => setNotifications(value => !value)}>
          <Icon name="bell" size="sm" aria-hidden="true" />
          <span style={{ display: "grid", flex: 1, gap: 5 }}><span>Notifications</span><Meta>{notifications ? "On for this example" : "Off for this example"}</Meta></span>
          {notifications && <Icon name="check" size="sm" aria-hidden="true" />}
        </Button>
        <Meta role="status" aria-live="polite" style={drawerReceiptStyle}>{receipt}</Meta>
        <Button variant="secondary" style={{ justifySelf: "start" }} onClick={() => setOpen(false)}>Done<Icon name="check" size="sm" aria-hidden="true" /></Button>
      </div>
    </MotionDrawer>
    <section aria-label="Note preferences" style={drawerSurfaceStyle}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon name="bookmark" aria-hidden="true" /><Title as="h3" style={{ margin: 0 }}>A small thought</Title>{pinned && <Meta>Pinned</Meta>}</div>
      {!compact && <BodySecondary style={{ margin: 0, color: "var(--v-text-2)" }}>Good ideas need somewhere to land.</BodySecondary>}
      <Meta role="status" aria-live="polite" style={drawerReceiptStyle}>{receipt}</Meta>
    </section>
  </div>;
}

function StackedDrawerExample({ compact }: { compact?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState(0);
  const [reading, setReading] = React.useState(0);
  const current = drawerChapters[reading];
  return <div style={drawerExampleFrame}>
    <MotionDrawer open={open} onOpenChange={setOpen} variant="stack" width={540} title="The field guide" description="Each chapter has its own card. Choose one to bring it forward." triggerLabel="Choose a chapter" buttonOpeningVariants="push"
      value={String(selected)} onValueChange={value => setSelected(Number(value))}
      panels={drawerChapters.map((chapter, index) => ({ value: String(index), label: chapter.name, children:
        <section aria-label={`${chapter.name} outline`} style={{ display: "grid", alignContent: "start", gap: 20, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}><Icon name="book-open" size="sm" aria-hidden="true" /><Meta>{chapter.time} read</Meta></div>
          <Title as="h3" style={{ margin: 0 }}>{chapter.name}</Title>
          <BodySecondary style={{ margin: 0, color: "var(--v-text-2)", fontSize: 14 }}>{chapter.detail}</BodySecondary>
          <BodySecondary style={{ margin: 0, color: "var(--v-text-2)", fontSize: 14 }}>{chapter.summary}</BodySecondary>
          <Button variant="secondary" size="sm" style={{ justifySelf: "start" }} onClick={() => { setReading(index); setOpen(false); }}>Open selected<Icon name="arrow-right" size="sm" aria-hidden="true" /></Button>
          <Meta role="status" aria-live="polite" style={drawerReceiptStyle}>{chapter.name} selected.</Meta>
        </section>
      }))}
    />
    <section aria-label="Current chapter" style={drawerSurfaceStyle}>
      <Meta>THE FIELD GUIDE / {String(reading + 1).padStart(2, "0")}</Meta>
      <Title as="h3" style={{ margin: 0 }}>{current.name}</Title>
      {!compact && <BodySecondary style={{ margin: 0, color: "var(--v-text-2)" }}>{current.summary}</BodySecondary>}
      <Meta role="status" aria-live="polite" style={drawerReceiptStyle}>Reading {current.name}.</Meta>
    </section>
  </div>;
}

const drawerLayouts = [
  { name: "Notebook", icon: "book-open", caption: "Read in a simple list" },
  { name: "Cards", icon: "layout-grid", caption: "See ideas side by side" },
  { name: "Focus", icon: "eye", caption: "Give one idea the room" },
];
const drawerNotes = ["A place to begin", "A shape to explore", "A thread to follow"];

function BottomDrawerExample({ compact }: { compact?: boolean }) {
  const [open, setOpen] = React.useState(false);
  const [layout, setLayout] = React.useState("Notebook");
  const notes = layout === "Focus" ? drawerNotes.slice(0, 1) : drawerNotes;
  return <div style={drawerExampleFrame}>
    <MotionDrawer open={open} onOpenChange={setOpen} variant="bottom" width={640} title="Make room for your ideas" description="Choose how these notes sit together." triggerLabel="Change layout" buttonOpeningVariants="stay">
      <div role="group" aria-label="Note layout" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }}>
        {drawerLayouts.map(option => <Button key={option.name} shape="card" variant={layout === option.name ? "secondary" : "ghost"} aria-pressed={layout === option.name} style={{ minHeight: 84, minWidth: 0, flexDirection: "column", alignItems: "flex-start", justifyContent: "flex-start", gap: 8, textAlign: "start" }} onClick={() => { setLayout(option.name); setOpen(false); }}>
          <span style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 8 }}><Icon name={option.icon} size="sm" aria-hidden="true" /><span>{option.name}</span></span><Meta style={{ fontSize: 11, lineHeight: 1.4, color: "inherit" }}>{option.caption}</Meta>
        </Button>)}
      </div>
    </MotionDrawer>
    <section aria-label="Notes layout preview" style={{ ...drawerSurfaceStyle, minHeight: compact ? 180 : 210 }}>
      <Meta>{layout.toUpperCase()}</Meta>
      <div data-notes-layout={layout.toLowerCase()} style={{ display: "grid", gridTemplateColumns: layout === "Cards" ? "repeat(3, minmax(0, 1fr))" : "minmax(0, 1fr)", gap: layout === "Cards" ? 10 : 8, minHeight: 84, alignContent: "start" }}>
        {notes.map((note, index) => <div key={note} style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0, minHeight: layout === "Notebook" ? 22 : 84, padding: layout === "Cards" ? 10 : 0, border: layout === "Cards" ? "1px solid var(--v-border)" : undefined, borderRadius: layout === "Cards" ? 10 : undefined }}>
          {layout === "Notebook" && <Meta>{String(index + 1).padStart(2, "0")}</Meta>}
          <span style={{ fontSize: layout === "Focus" ? 22 : 13, lineHeight: 1.45, overflowWrap: "anywhere" }}>{note}</span>
        </div>)}
      </div>
      <Meta role="status" aria-live="polite" style={drawerReceiptStyle}>{layout} layout selected.</Meta>
    </section>
  </div>;
}

export function MotionDrawerExample({ variant = "default", compact }: ExampleProps) {
  if (variant === "floating") return <FloatingDrawerExample compact={compact} />;
  if (variant === "stack") return <StackedDrawerExample compact={compact} />;
  if (variant === "bottom") return <BottomDrawerExample compact={compact} />;
  return <ChapterDrawerExample compact={compact} />;
}
