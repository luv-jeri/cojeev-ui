"use client";

import * as React from "react";
import {
  ActivityFeed,
  type ActivityEntry,
} from "@/registry/cojeev/ui/activity-feed";
import {
  MilestonePath,
  type Milestone,
  type MilestoneTravel,
} from "@/registry/cojeev/ui/milestone-path";
import { Button } from "@/registry/cojeev/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/registry/cojeev/ui/toggle-group";
import { Meta } from "@/registry/cojeev/ui/typography";
import type { ExampleProps } from "./types";

const milestones = [
  {
    title: "Find the right question",
    description:
      "Gather the notes, constraints, and small details that give this work its shape.",
    ms: 252_000,
    details: "Three notes and one constraint shaped the brief.",
  },
  {
    title: "Make a first version",
    description: "A working draft makes the open questions easier to see.",
    ms: 1_105_000,
    steps: ["Sketch the outline", "Write the draft", "Tidy the wording"],
  },
  {
    title: "Invite a fresh perspective",
    description: "Make room for feedback while the work is still easy to change.",
    ms: 538_000,
    details: "Two people read it; one question changed the ending.",
  },
  {
    title: "Bring it into the day",
    description:
      "Keep what is useful and carry the learning into the next piece of work.",
    ms: 3_725_000,
  },
];
const travels: { value: MilestoneTravel; label: string }[] = [
  { value: "seed", label: "Seed" },
  { value: "droplet", label: "Droplet" },
  { value: "division", label: "Division" },
];
type Run = {
  current: number;
  /** Active time before the current attempt started, so waiting is never counted. */
  elapsed: number;
  startedAt: number;
  failed: boolean;
};
const startRun = (current: number): Run => ({
  current,
  elapsed: 0,
  startedAt: Date.now(),
  failed: false,
});

export function MilestonePathExample({ variant = "journey" }: ExampleProps) {
  const [run, setRun] = React.useState<Run>(() => ({
    ...startRun(1),
    elapsed: 83_000,
  }));
  const [travel, setTravel] = React.useState<MilestoneTravel>("seed");
  const [selected, setSelected] = React.useState<string | null>(null);
  const detail = React.useRef<HTMLDivElement>(null);
  const presentation =
    variant === "sequence" || variant === "review" ? variant : "journey";
  React.useLayoutEffect(() => {
    if (selected) detail.current?.focus({ preventScroll: true });
  }, [selected]);
  const { current } = run;
  const retry = React.useCallback(
    () =>
      setRun((run) => ({ ...run, startedAt: Date.now(), failed: false })),
    [],
  );
  const items: Milestone[] = milestones.map((milestone, index): Milestone => {
    const base = {
      id: `milestone-${index}`,
      title: milestone.title,
      description: milestone.description,
      details: milestone.details,
      // Nested steps follow their parent: done, partway, or not started.
      steps: milestone.steps?.map((title, step): Milestone => {
        const id = `milestone-${index}-${step}`;
        if (index < current || (index === current && step === 0))
          return { id, title, state: "complete" };
        // A failed parent has no step in progress; the next one waits for the retry.
        if (index === current && step === 1)
          return { id, title, state: run.failed ? "upcoming" : "current" };
        return { id, title, state: "upcoming" };
      }),
    };
    if (index < current)
      return {
        ...base,
        state: "complete",
        duration: { kind: "frozen", elapsedMs: milestone.ms },
      };
    if (index > current) return { ...base, state: "upcoming" };
    return run.failed
      ? {
          ...base,
          state: "needs",
          meta: "The draft could not be saved.",
          action: { label: "Try again", onAction: retry },
          duration: { kind: "frozen", elapsedMs: run.elapsed },
        }
      : {
          ...base,
          state: "current",
          duration: {
            kind: "running",
            startedAt: run.startedAt,
            elapsedMs: run.elapsed,
          },
        };
  });
  const done = Math.min(current, items.length);
  return (
    <div className="v-milestone-example">
      <ToggleGroup
        type="single"
        value={travel}
        aria-label="Travel"
        onValueChange={(value) => {
          if (value) setTravel(value as MilestoneTravel);
        }}
      >
        {travels.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <MilestonePath
        title="From a thought to a useful thing"
        description="Four moments in a small creative project."
        presentation={presentation}
        travel={travel}
        items={items}
        onMilestoneSelect={setSelected}
      />
      {selected && (
        <div
          ref={detail}
          tabIndex={-1}
          role="region"
          aria-label="Selected milestone"
          className="v-milestone-example__detail"
        >
          <strong>{items.find((item) => item.id === selected)?.title}</strong>
          <p>{items.find((item) => item.id === selected)?.description}</p>
          <Meta>
            Selection opens this local detail; it does not change progress.
          </Meta>
        </div>
      )}
      <div className="v-milestone-example__actions">
        <Button
          size="sm"
          onClick={() =>
            setRun((run) =>
              startRun(run.current === items.length ? 0 : run.current + 1),
            )
          }
        >
          {current === items.length ? "Start again" : "Complete this milestone"}
        </Button>
        <Button
          size="sm"
          variant="secondary"
          disabled={current === items.length || run.failed}
          onClick={() =>
            setRun((run) => ({
              ...run,
              elapsed: run.elapsed + Date.now() - run.startedAt,
              failed: true,
            }))
          }
        >
          Fail this step
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setRun({ ...startRun(1), elapsed: 83_000 })}
        >
          Reset
        </Button>
        <Meta role="status">
          {done} of {items.length} completed
          {selected
            ? ` · Selected: ${items.find((item) => item.id === selected)?.title}`
            : ""}
        </Meta>
      </div>
    </div>
  );
}

const activityEntries: ActivityEntry[] = [
  {
    id: "note",
    title: "Added a useful detail",
    description: "The welcome screen should make the next action feel obvious.",
    actor: { name: "Mira Shah" },
    group: "8 September",
    timestamp: "10:42",
    dateTime: "2026-09-08T10:42:00+05:30",
    badge: { label: "Note", variant: "yellow-soft" },
  },
  {
    id: "review",
    title: "Gave the final step more room",
    description: "The flow reads clearly now, right to the last screen.",
    actor: { name: "Mira Shah" },
    group: "8 September",
    timestamp: "10:31",
    dateTime: "2026-09-08T10:31:00+05:30",
  },
  {
    id: "draft",
    title: "Saved the opening draft",
    description: "A small beginning, ready for a fresh pair of eyes.",
    actor: { name: "Arun Rao" },
    group: "7 September",
    timestamp: "16:30",
    dateTime: "2026-09-07T16:30:00+05:30",
    badge: { label: "Draft", variant: "olive-soft" },
  },
  {
    // No actor: the product's own update, marked with the brand star.
    id: "brief",
    title: "Collected the starting notes",
    description: "Audience, tone, and the three things this page needs to do.",
    group: "7 September",
    timestamp: "16:12",
    dateTime: "2026-09-07T16:12:00+05:30",
  },
];
const looks = [
  { value: "thread", label: "Thread" },
  { value: "ledger", label: "Ledger" },
  { value: "bursts", label: "Bursts" },
] as const;
type Look = (typeof looks)[number]["value"];
const lookOf = (variant?: string): Look =>
  variant === "ledger" || variant === "bursts" ? variant : "thread";

export function ActivityFeedExample({ variant }: ExampleProps) {
  const [look, setLook] = React.useState(() => lookOf(variant));
  const [shownVariant, setShownVariant] = React.useState(variant);
  if (shownVariant !== variant) {
    setShownVariant(variant);
    setLook(lookOf(variant));
  }
  const [entries, setEntries] = React.useState(activityEntries);
  const [added, setAdded] = React.useState(false);
  // Undo belongs to the caller: the entry carries the button, the example keeps the way back.
  const [undone, setUndone] = React.useState<{
    entry: ActivityEntry;
    index: number;
  } | null>(null);
  const redo = React.useRef<HTMLButtonElement>(null);
  const undo = React.useRef<HTMLButtonElement>(null);
  const focusAfter = React.useRef<"redo" | "undo" | null>(null);
  React.useLayoutEffect(() => {
    if (focusAfter.current === "redo") redo.current?.focus();
    if (focusAfter.current === "undo") undo.current?.focus();
    focusAfter.current = null;
  }, [undone]);
  const shown = entries.map((entry) =>
    entry.id === "brief"
      ? {
          ...entry,
          content: (
            <Button
              ref={undo}
              variant="outline"
              size="sm"
              style={{ justifySelf: "start" }}
              onClick={() => {
                const index = entries.findIndex((e) => e.id === entry.id);
                focusAfter.current = "redo";
                setUndone({ entry, index });
                setEntries((value) => value.filter((e) => e.id !== entry.id));
              }}
            >
              Undo
            </Button>
          ),
        }
      : entry,
  );
  return (
    <div className="v-activity-example">
      <ToggleGroup
        type="single"
        value={look}
        aria-label="Look"
        onValueChange={(value) => {
          if (value) setLook(value as Look);
        }}
      >
        {looks.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      <ActivityFeed
        title="A little closer"
        description="Example activity from a shared project."
        entries={shown}
        variant={look}
        initialVisible={2}
        pageSize={2}
      />
      {undone && (
        <div
          role="status"
          style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}
        >
          <Meta>Undone · {undone.entry.title}</Meta>
          <Button
            ref={redo}
            variant="outline"
            size="sm"
            style={{ minHeight: 44 }}
            onClick={() => {
              focusAfter.current = "undo";
              setEntries((value) => {
                const next = [...value];
                next.splice(Math.min(undone.index, next.length), 0, undone.entry);
                return next;
              });
              setUndone(null);
            }}
          >
            Redo
          </Button>
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Button
          variant="outline"
          size="sm"
          style={{ minHeight: 44 }}
          disabled={added}
          onClick={() => {
            setEntries((value) => [
              {
                id: "local-note",
                title: "Added an example update",
                description:
                  "This entry was added by the button in this preview.",
                actor: { name: "You" },
                group: "In this preview",
                timestamp: "Just now",
                badge: { label: "Local", variant: "blue-soft" },
              },
              ...value,
            ]);
            setAdded(true);
          }}
        >
          {added ? "Example added" : "Add an example update"}
        </Button>
        <Meta>Changes stay in this preview.</Meta>
      </div>
    </div>
  );
}
