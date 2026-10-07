"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import {
  ActivitySceneContext,
  useActivityPresence,
  useActivityScene,
  type ActivityLayout,
} from "../lib/activity-motion";
import { MARK_PATHS } from "../lib/milestone-travel";
import { useChoreography } from "../motion/choreography";
import { assignMotionRef } from "../motion/refs";
import { useGuidanceMotion } from "../motion/use-guidance-motion";
import { AnimatedIcon } from "./animated-icon";
import { Avatar, AvatarFallback, AvatarImage } from "./avatar";
import { Badge, type BadgeProps } from "./badge";
import { Button } from "./button";
import { Empty, EmptyDescription, EmptyTitle } from "./empty";
import { ItemContent, ItemDescription, ItemTitle } from "./item";
import { MotionPresence } from "./presence";
import { BodySecondary, Meta, Title } from "./typography";

export type ActivityEntry = {
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  actor?: { name: string; initials?: string; avatarSrc?: string };
  timestamp?: React.ReactNode;
  /** Machine-readable time matching the caller's timestamp label. */
  dateTime?: string;
  /** Optional visible group heading; shown where a consecutive group begins. */
  group?: string;
  badge?: { label: React.ReactNode; variant?: BadgeProps["variant"] };
  /** Additional supplied details or native actions, kept in document flow. */
  content?: React.ReactNode;
};
export type ActivityFeedProps = Omit<
  React.ComponentProps<"section">,
  "children" | "title"
> & {
  /** Caller supplies the chronological order; the feed never reorders entries. */
  entries: readonly ActivityEntry[];
  title?: React.ReactNode;
  description?: React.ReactNode;
  empty?: React.ReactNode;
  /** Omit to show every supplied entry, including later appends. */
  initialVisible?: number;
  pageSize?: number;
  showMoreLabel?: React.ReactNode;
  /**
   * Look of the history. "thread": one row per entry on a living thread. "ledger": dense,
   * one avatar per run of entries by the same actor within a group, pinned group labels.
   * "bursts": one card per actor's updates made within 30 minutes of each other; two or
   * more become a native disclosure titled "N updates".
   */
  variant?: "thread" | "ledger" | "bursts";
};

/* ---------- grouping: the caller's order is kept; consecutive entries are only gathered ---------- */
const BURST_SPAN = 30 * 60 * 1000;
const actorOf = (entry: ActivityEntry) => entry.actor?.name.trim() ?? "";
const timeOf = (entry: ActivityEntry) => {
  const t = entry.dateTime ? Date.parse(entry.dateTime) : NaN;
  return Number.isFinite(t) ? t : null;
};
function joins(layout: ActivityLayout, newer: ActivityEntry, entry: ActivityEntry) {
  if (layout === "thread" || actorOf(newer) !== actorOf(entry)) return false;
  if (layout === "ledger") return true;
  // A burst needs both times; an entry without one stands alone.
  const a = timeOf(newer),
    b = timeOf(entry);
  return a !== null && b !== null && Math.abs(a - b) <= BURST_SPAN;
}
function runs<T>(items: readonly T[], same: (newer: T, item: T) => boolean) {
  const out: T[][] = [];
  for (const item of items) {
    const last = out[out.length - 1];
    if (last && same(last[last.length - 1], item)) last.push(item);
    else out.push([item]);
  }
  return out;
}
type Keys = ReadonlyMap<string, string>;
/** A group keeps the key of any entry it held before, so prepends and reveals never remount it. */
function keyGroups(
  groups: readonly (readonly ActivityEntry[])[],
  previous: Keys,
  prefix: string,
) {
  const used = new Set<string>();
  return groups.map((group) => {
    let key = group
      .map((entry) => previous.get(entry.id))
      .find((k): k is string => k !== undefined && !used.has(k));
    if (key === undefined) {
      key = `${prefix}${group[0].id}`;
      while (used.has(key)) key += "+";
    }
    used.add(key);
    return key;
  });
}
const sameKeys = (a: Keys, b: Keys) =>
  a.size === b.size && [...a].every(([id, key]) => b.get(id) === key);
type Cluster = { key: string; entries: ActivityEntry[] };
type Day = { key: string; label?: string; clusters: Cluster[] };

function count(value: number | undefined, fallback: number) {
  return value !== undefined && Number.isFinite(value)
    ? Math.max(1, Math.floor(value))
    : fallback;
}
const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => Array.from(part)[0])
    .join("");

/** An actor's avatar, or the four-point star for the product's own entries. */
function Mark({ actor }: { actor?: ActivityEntry["actor"] }) {
  if (!actor)
    return (
      <span
        className="v-activity-feed__mark v-activity-feed__marker"
        data-brand=""
      >
        <svg viewBox="-18 -18 36 36" focusable="false" aria-hidden="true">
          <path d={MARK_PATHS.star} />
        </svg>
      </span>
    );
  return (
    <span className="v-activity-feed__mark">
      <Avatar variant="sm">
        {actor.avatarSrc && <AvatarImage src={actor.avatarSrc} alt="" />}
        <AvatarFallback>{actor.initials ?? initialsOf(actor.name)}</AvatarFallback>
      </Avatar>
    </span>
  );
}

function EntryContent({ entry }: { entry: ActivityEntry }) {
  return (
    <ItemContent className="v-activity-feed__content">
      <div className="v-activity-feed__entry-heading">
        <ItemTitle className="v-activity-feed__title">{entry.title}</ItemTitle>
        {entry.badge && (
          <Badge
            size="sm"
            variant={entry.badge.variant ?? "cream"}
            className="v-activity-feed__badge"
          >
            {entry.badge.label}
          </Badge>
        )}
      </div>
      {entry.description && (
        <ItemDescription className="v-activity-feed__description">
          {entry.description}
        </ItemDescription>
      )}
      {(entry.actor || entry.timestamp) && (
        <div className="v-activity-feed__meta">
          {entry.actor && (
            <Meta className="v-activity-feed__who">{entry.actor.name}</Meta>
          )}
          {entry.actor && entry.timestamp && (
            <span aria-hidden="true" className="v-activity-feed__sep">
              ·
            </span>
          )}
          <span aria-hidden="true" className="v-activity-feed__live" />
          {entry.timestamp && (
            <time dateTime={entry.dateTime}>
              <Meta>{entry.timestamp}</Meta>
            </time>
          )}
        </div>
      )}
      {entry.content && (
        <div className="v-activity-feed__details">{entry.content}</div>
      )}
    </ItemContent>
  );
}

function Row({
  entry,
  layout,
  label,
}: {
  entry: ActivityEntry;
  layout: ActivityLayout;
  label?: string;
}) {
  const [ref, leaving] = useActivityPresence<HTMLLIElement>();
  return (
    <li
      ref={ref}
      tabIndex={-1}
      data-activity-entry={entry.id}
      data-leaving={leaving || undefined}
      inert={leaving || undefined}
      aria-hidden={leaving || undefined}
      className="v-activity-feed__entry"
    >
      {label && <div className="v-activity-feed__group">{label}</div>}
      {/* Spacing lives inside, so the row itself can close to nothing. */}
      <div className="v-activity-feed__inner">
        {layout === "thread" && (
          <div className="v-activity-feed__portrait" aria-hidden="true">
            <Mark actor={entry.actor} />
          </div>
        )}
        {layout === "ledger" && (
          <span className="v-activity-feed__wash" aria-hidden="true" />
        )}
        <EntryContent entry={entry} />
      </div>
    </li>
  );
}

function Rows({
  entries,
  layout,
  id,
}: {
  entries: readonly ActivityEntry[];
  layout: ActivityLayout;
  id?: string;
}) {
  return (
    <ol id={id} className="v-activity-feed__rows" role="list">
      <MotionPresence>
        {entries.map((entry) => (
          <Row key={entry.id} entry={entry} layout={layout} />
        ))}
      </MotionPresence>
    </ol>
  );
}

function ClusterBox({
  cluster,
  layout,
}: {
  cluster: Cluster;
  layout: ActivityLayout;
}) {
  const [ref, leaving] = useActivityPresence<HTMLLIElement>();
  const scene = React.useContext(ActivitySceneContext);
  const rowsId = React.useId();
  const actor = cluster.entries[0].actor;
  const name = actor?.name.trim();
  const burst = layout === "bursts" && cluster.entries.length > 1;
  const toggle = (event: React.MouseEvent<HTMLElement>) => {
    const details = event.currentTarget.parentElement;
    if (details instanceof HTMLDetailsElement && scene.current?.toggle(details))
      event.preventDefault();
  };
  return (
    <li
      ref={ref}
      data-leaving={leaving || undefined}
      inert={leaving || undefined}
      aria-hidden={leaving || undefined}
      data-burst={burst || undefined}
      className="v-activity-feed__cluster"
    >
      {layout === "ledger" ? (
        <div className="v-activity-feed__cluster-inner">
          <div className="v-activity-feed__portrait" aria-hidden="true">
            <Mark actor={actor} />
          </div>
          <div className="v-activity-feed__cluster-body">
            {/* Each row keeps the actor in its own accessible text. */}
            {name && (
              <p className="v-activity-feed__cluster-name" aria-hidden="true">
                {name}
              </p>
            )}
            <Rows entries={cluster.entries} layout={layout} />
          </div>
        </div>
      ) : (
        <>
          {burst ? (
            <details open className="v-activity-feed__burst">
              <summary
                className="v-activity-feed__card-head"
                aria-controls={rowsId}
                onClick={toggle}
              >
                <span aria-hidden="true">
                  <Mark actor={actor} />
                </span>
                <span className="v-activity-feed__card-who">
                  {name && (
                    <span className="v-activity-feed__card-name">{name}</span>
                  )}
                  <span className="v-activity-feed__card-count">
                    {cluster.entries.length} updates
                  </span>
                </span>
                <svg
                  className="v-activity-feed__chevron"
                  viewBox="0 0 16 16"
                  aria-hidden="true"
                  focusable="false"
                >
                  <path d="M4 6l4 4 4-4" />
                </svg>
              </summary>
            </details>
          ) : (
            <div className="v-activity-feed__card-head" aria-hidden="true">
              <Mark actor={actor} />
              {name && (
                <span className="v-activity-feed__card-who">
                  <span className="v-activity-feed__card-name">{name}</span>
                </span>
              )}
            </div>
          )}
          {/* Rows stay outside the disclosure so a card becoming a burst keeps them mounted. */}
          <Rows id={rowsId} entries={cluster.entries} layout={layout} />
        </>
      )}
    </li>
  );
}

function DayBox({ day, layout }: { day: Day; layout: ActivityLayout }) {
  const [ref, leaving] = useActivityPresence<HTMLLIElement>();
  return (
    <li
      ref={ref}
      data-leaving={leaving || undefined}
      inert={leaving || undefined}
      aria-hidden={leaving || undefined}
      className="v-activity-feed__day"
    >
      {day.label && <div className="v-activity-feed__group">{day.label}</div>}
      <ol className="v-activity-feed__clusters" role="list">
        <MotionPresence>
          {day.clusters.map((cluster) => (
            <ClusterBox key={cluster.key} cluster={cluster} layout={layout} />
          ))}
        </MotionPresence>
      </ol>
    </li>
  );
}

export function ActivityFeed({
  entries,
  title,
  description,
  empty,
  initialVisible,
  pageSize = 3,
  showMoreLabel,
  variant,
  className,
  ref,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  ...props
}: ActivityFeedProps) {
  const layout: ActivityLayout =
    variant === "ledger" || variant === "bursts" ? variant : "thread";
  const titleId = React.useId();
  const listId = React.useId();
  const section = React.useRef<HTMLElement | null>(null);
  const setSection = React.useCallback(
    (node: HTMLElement | null) => {
      section.current = node;
      return assignMotionRef(ref, node);
    },
    [ref],
  );
  const layer = React.useRef<SVGSVGElement | null>(null);
  const list = React.useRef<HTMLOListElement>(null);
  const focusIndex = React.useRef<number | null>(null);
  const revealed = React.useRef<string[]>([]);
  const [windowState, setWindowState] = React.useState(() => ({
    ids: entries.map((entry) => entry.id),
    limit: count(initialVisible, Infinity),
  }));
  const ids = entries.map((entry) => entry.id);
  let limit = windowState.limit;
  if (
    ids.length !== windowState.ids.length ||
    ids.some((id, index) => id !== windowState.ids[index])
  ) {
    const oldFirst = windowState.ids[0],
      firstIndex = ids.indexOf(oldFirst),
      previous = new Set(windowState.ids);
    const prepended =
      firstIndex > 0
        ? ids.slice(0, firstIndex).filter((id) => !previous.has(id)).length
        : 0;
    limit += prepended;
    // Reconcile before committing the new list: existing entries never unmount
    // for a frame merely because a new update was prepended.
    setWindowState({ ids, limit });
  }
  const [announcement, setAnnouncement] = React.useState("");
  const visible = entries.slice(0, limit);
  const remaining = entries.length - visible.length;
  const nextPage = Math.min(remaining, count(pageSize, 3));

  // Days and runs keep their identity across prepends and reveals.
  const [keys, setKeys] = React.useState<{ days: Keys; clusters: Keys }>(
    () => ({ days: new Map(), clusters: new Map() }),
  );
  let days: Day[] = [];
  if (layout !== "thread") {
    const dayRuns = runs(visible, (a, b) => a.group === b.group);
    const dayKeys = keyGroups(dayRuns, keys.days, "d:");
    const clusterRuns = dayRuns.map((day) =>
      runs(day, (a, b) => joins(layout, a, b)),
    );
    const clusterKeys = keyGroups(clusterRuns.flat(), keys.clusters, "c:");
    let c = 0;
    days = dayRuns.map((day, i) => ({
      key: dayKeys[i],
      label: day[0].group,
      clusters: clusterRuns[i].map((entries) => ({
        key: clusterKeys[c++],
        entries,
      })),
    }));
    const next = {
      days: new Map(
        days.flatMap((d) =>
          d.clusters.flatMap((cl) => cl.entries.map((e) => [e.id, d.key] as const)),
        ),
      ),
      clusters: new Map(
        days.flatMap((d) =>
          d.clusters.flatMap((cl) => cl.entries.map((e) => [e.id, cl.key] as const)),
        ),
      ),
    };
    if (!sameKeys(next.days, keys.days) || !sameKeys(next.clusters, keys.clusters))
      setKeys(next);
  }

  React.useLayoutEffect(() => {
    if (focusIndex.current === null) return;
    const target = list.current?.querySelectorAll<HTMLElement>(
      "[data-activity-entry]:not([data-leaving])",
    )[focusIndex.current];
    // A revealed entry inside a closed burst opens it, so focus lands on something visible.
    const burst = target
      ?.closest(".v-activity-feed__cluster")
      ?.querySelector<HTMLDetailsElement>(":scope > details");
    if (burst && !burst.open) burst.open = true;
    target?.focus();
    focusIndex.current = null;
  }, [visible.length]);

  const { quiet: globalQuiet } = useChoreography();
  const { quiet, enabled, inView } = useGuidanceMotion(section);
  const live = !quiet && enabled && inView;
  const scene = useActivityScene(section, {
    layout,
    ids: visible.map((entry) => entry.id),
    brand: new Set(visible.filter((e) => !e.actor).map((e) => e.id)),
    allowed: live,
    breathe: live,
    layer,
    takeRevealed: () => {
      const taken = revealed.current;
      revealed.current = [];
      return taken;
    },
  });

  const reveal = () => {
    focusIndex.current = visible.length;
    const nextCount = visible.length + nextPage;
    revealed.current = entries
      .slice(visible.length, nextCount)
      .map((entry) => entry.id);
    setWindowState((value) => ({ ...value, limit: nextCount }));
    setAnnouncement(`${nextCount} of ${entries.length} activities shown.`);
  };
  return (
    <section
      {...props}
      ref={setSection}
      data-slot="activity-feed"
      data-variant={layout}
      data-motion-quiet={globalQuiet || undefined}
      aria-label={ariaLabel ?? (!title && !labelledBy ? "Activity" : undefined)}
      aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
      className={cn("v-activity-feed", className)}
    >
      {(title || description) && (
        <header className="v-activity-feed__header">
          {title && (
            <div className="v-activity-feed__heading">
              <Title id={titleId}>{title}</Title>
              <Badge
                variant="count"
                aria-label={`${entries.length} activities`}
              >
                {entries.length}
              </Badge>
            </div>
          )}
          {description && <BodySecondary as="div">{description}</BodySecondary>}
        </header>
      )}
      {entries.length === 0 ? (
        (empty ?? (
          <Empty>
            <EmptyTitle>No activity yet</EmptyTitle>
            <EmptyDescription>
              Updates appear here as they are added.
            </EmptyDescription>
          </Empty>
        ))
      ) : (
        <ActivitySceneContext.Provider value={scene}>
          <div className="v-activity-feed__body">
            <ol
              ref={list}
              id={listId}
              className="v-activity-feed__list"
              role="list"
            >
              <MotionPresence>
                {layout === "thread"
                  ? visible.map((entry, index) => (
                      <Row
                        key={entry.id}
                        entry={entry}
                        layout={layout}
                        label={
                          entry.group &&
                          entry.group !== visible[index - 1]?.group
                            ? entry.group
                            : undefined
                        }
                      />
                    ))
                  : days.map((day) => (
                      <DayBox key={day.key} day={day} layout={layout} />
                    ))}
              </MotionPresence>
            </ol>
            {layout === "thread" && (
              <svg
                ref={layer}
                className="v-activity-feed__thread"
                aria-hidden="true"
                focusable="false"
              />
            )}
          </div>
          {remaining > 0 && (
            <footer className="v-activity-feed__footer">
              <Button
                variant="secondary"
                size="sm"
                aria-controls={listId}
                onClick={reveal}
              >
                <AnimatedIcon name="chevron-down" size="sm" preset="bounce" />
                {showMoreLabel ?? `Show ${nextPage} more`}
              </Button>
              <Meta>
                {visible.length} of {entries.length}
              </Meta>
            </footer>
          )}
        </ActivitySceneContext.Provider>
      )}
      <span role="status" aria-live="polite" className="sr-only">
        {announcement}
      </span>
    </section>
  );
}
