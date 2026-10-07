"use client";

import * as React from "react";
import { cn } from "../lib/utils";
import {
  BANG_PATH,
  CHECK_PATH,
  MARK_PATHS,
  elapsedOf,
  elapsedParts,
  useMilestoneTravel,
  type MilestoneTravel,
} from "../lib/milestone-travel";
import { useChoreography } from "../motion/choreography";
import { assignMotionRef } from "../motion/refs";
import { useFlowGroup } from "../motion/use-flow";
import { useGuidanceMotion } from "../motion/use-guidance-motion";
import { Badge } from "./badge";
import { Button } from "./button";
import { Empty, EmptyDescription, EmptyTitle } from "./empty";
import { BodySecondary, Meta, Title } from "./typography";
import { ScrollArea, ScrollBar } from "./scroll-area";

export type { MilestoneTravel };
export type MilestoneState = "complete" | "current" | "upcoming" | "needs";
/** The one thing the caller needs from the person before work can continue. */
export type MilestoneAction = { label: string; onAction: () => void };
/** Milliseconds of active work. `startedAt` is Unix epoch time. */
export type MilestoneDuration =
  | { kind: "running"; startedAt: number; elapsedMs?: number }
  | { kind: "frozen"; elapsedMs: number };
type MilestoneBase = {
  /** Stable identity, independent of display text and array position. Unique across the tree. */
  id: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  meta?: React.ReactNode;
  /** Disables the optional selection button; does not change progress. */
  disabled?: boolean;
  /** Supporting detail behind a native disclosure. Never hides actions or nested steps. */
  details?: React.ReactNode;
  /** Child steps, always visible. One active branch: at most one current or needs item per list. */
  steps?: readonly Milestone[];
};
export type Milestone = MilestoneBase &
  (
    | {
        state: "complete";
        action?: never;
        duration?: Extract<MilestoneDuration, { kind: "frozen" }>;
      }
    | {
        state: "current";
        action?: never;
        duration?: Extract<MilestoneDuration, { kind: "running" }>;
      }
    | { state: "upcoming"; action?: never; duration?: never }
    | {
        /** Work is waiting on the person. Durations exclude this waiting time. */
        state: "needs";
        action: MilestoneAction;
        duration?: Extract<MilestoneDuration, { kind: "frozen" }>;
      }
  );
export type MilestonePathProps = Omit<
  React.ComponentProps<"section">,
  "children" | "title"
> & {
  /** Ordered journey. Supply at most one current or needs milestone per list. */
  items: readonly Milestone[];
  title?: React.ReactNode;
  description?: React.ReactNode;
  empty?: React.ReactNode;
  statusLabels?: Partial<Record<MilestoneState, React.ReactNode>>;
  /** Makes titles native buttons. Progress remains owned by the caller. */
  onMilestoneSelect?: (id: string) => void;
  /** Omit for the original vertical composition. */
  presentation?: "journey" | "sequence" | "review";
  /**
   * How the working mark moves to the next step when the caller completes one.
   * Decorative only; review, reduced motion and Motion off change instantly.
   */
  travel?: MilestoneTravel;
};

const MilestoneContext = React.createContext(1);
type Shared = {
  travel: MilestoneTravel;
  allowed: boolean;
  breathe: boolean;
  now: number | null;
  labels?: MilestonePathProps["statusLabels"];
  onSelect?: (id: string) => void;
};
const SharedContext = React.createContext<Shared>({
  travel: "seed",
  allowed: false,
  breathe: false,
  now: null,
});

function MilestoneParts({
  value,
  children,
}: {
  value: number;
  children: React.ReactNode;
}) {
  const { quiet } = useChoreography();
  return (
    <MilestoneContext.Provider value={value}>
      <div
        data-slot="milestone-path-provider"
        data-motion={quiet ? "off" : undefined}
      >
        {children}
      </div>
    </MilestoneContext.Provider>
  );
}

function MilestoneList({
  ref,
  className,
  ...props
}: React.ComponentProps<"ol">) {
  const flowRef = useFlowGroup<HTMLOListElement>(ref);
  return (
    <ol
      ref={flowRef}
      data-slot="milestone-path-list"
      data-part="root"
      data-orientation="vertical"
      className={cn(
        "grid gap-0 m-0 p-0 list-none [counter-reset:none]",
        className,
      )}
      {...props}
    />
  );
}

function MilestoneItem({
  step,
  className,
  ...props
}: React.ComponentProps<"li"> & { step: number }) {
  const value = React.useContext(MilestoneContext);
  return (
    <li
      data-slot="milestone-path-item"
      data-part="item"
      className={cn(
        "v-step relative grid grid-cols-[38px_minmax(0,1fr)] items-center gap-[var(--s-4)] py-[var(--s-2)] min-h-[54px] list-none",
        step < value && "-done",
        step === value && "-on",
        className,
      )}
      {...props}
    />
  );
}

function MilestoneTitle({
  className,
  ...props
}: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="milestone-path-title"
      data-part="label"
      className={cn(
        "v-step__t col-start-2 text-[length:var(--fs-body)] leading-[1.35] text-[color:var(--v-text-2)]",
        className,
      )}
      {...props}
    />
  );
}

const stateLabels: Record<MilestoneState, string> = {
  complete: "Completed",
  current: "In progress",
  upcoming: "Upcoming",
  needs: "Needs one action",
};
const badgeVariants = {
  complete: "olive-soft",
  current: "pink-soft",
  upcoming: "cream",
  needs: "danger",
} as const;
const vertical = "M18 0 C18 26 21 31 18 50 C15 69 18 75 18 100";
const horizontal = "M0 18 C26 18 31 21 50 18 C69 15 75 18 100 18";
const isActive = (state: MilestoneState) =>
  state === "current" || state === "needs";

// Integration errors are reported once per item object, then the row is left out.
const reported = new WeakSet<object>();
function report(item: Milestone, problem: string) {
  if (reported.has(item)) return;
  reported.add(item);
  console.error(`MilestonePath: "${item.id}" ${problem}`);
}
function usable(item: Milestone) {
  if (
    item.state === "needs" &&
    !(item.action?.label && typeof item.action.onAction === "function")
  ) {
    report(item, 'has state "needs" without an action; the row is not shown.');
    return false;
  }
  return true;
}
const position = (items: readonly Milestone[]) => {
  const active = items.findIndex((item) => isActive(item.state));
  const upcoming = items.findIndex((item) => item.state === "upcoming");
  // One terminal provider slot represents a finished journey without a fake
  // current item. Per-item states remain authoritative for mixed histories.
  return active >= 0
    ? active + 1
    : upcoming >= 0
      ? upcoming + 1
      : items.length + 1;
};
const hasRunning = (items: readonly Milestone[]): boolean =>
  items.some(
    (item) =>
      (item.state === "current" && item.duration?.kind === "running") ||
      hasRunning(item.steps ?? []),
  );

/** One wall-clock sample per second, only while a duration runs and the page is visible. */
function useNow(running: boolean) {
  const [now, setNow] = React.useState<number | null>(null);
  React.useEffect(() => {
    if (!running) return;
    let timer = 0;
    const sample = () => {
      window.clearTimeout(timer);
      if (document.hidden) return;
      setNow(Date.now());
      timer = window.setTimeout(sample, 1000);
    };
    timer = window.setTimeout(sample, 0);
    document.addEventListener("visibilitychange", sample);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", sample);
    };
  }, [running]);
  return now;
}

/** Rest paint of one marker. The travel layer settles on exactly this outline before it hands back. */
function Mark({
  state,
  travel,
  breathe,
}: {
  state: MilestoneState;
  travel: MilestoneTravel;
  breathe: boolean;
}) {
  if (state === "upcoming")
    return (
      <svg viewBox="-18 -18 36 36" className="v-milestone-path__mark">
        <circle r={5.5} className="v-milestone-path__ring" />
      </svg>
    );
  const shape =
    state === "complete"
      ? travel === "seed"
        ? "star"
        : "done"
      : state === "needs"
        ? "needs"
        : "pebble";
  return (
    <svg viewBox="-18 -18 36 36" className="v-milestone-path__mark">
      {state !== "complete" && (
        <circle
          r={22.5}
          className="v-milestone-path__halo"
          data-tone={state === "needs" ? "danger" : undefined}
        />
      )}
      <g className="v-milestone-path__turn">
        <path
          d={MARK_PATHS[shape]}
          className="v-milestone-path__shape"
          data-fill={
            state === "complete" ? "olive" : state === "needs" ? "danger" : "pink"
          }
          data-breathe={breathe || undefined}
        />
      </g>
      {state === "current" && (
        <circle r={3.2} className="v-milestone-path__core" />
      )}
      {state === "complete" && travel !== "seed" && (
        <path d={CHECK_PATH} className="v-milestone-path__check" />
      )}
      {state === "needs" && (
        <g className="v-milestone-path__bang">
          <path d={BANG_PATH} />
          <circle cy={5.6} r={1.6} />
        </g>
      )}
    </svg>
  );
}

function Duration({ item }: { item: Milestone }) {
  const { now } = React.useContext(SharedContext);
  if (!item.duration) return null;
  const ms = elapsedOf(item.duration, item.state, now);
  if (ms === null) {
    report(item, "has timing that does not fit its state; no duration is shown.");
    return null;
  }
  return (
    <span className="v-milestone-path__duration">
      <span className="sr-only">Elapsed time </span>
      {ms === undefined
        ? "—"
        : elapsedParts(ms).map((part, i) => (
            <React.Fragment key={i}>
              {i > 0 && ":"}
              <b>{part}</b>
            </React.Fragment>
          ))}
    </span>
  );
}

function Step({
  item,
  index,
  last,
  axis,
  breathe,
}: {
  item: Milestone;
  index: number;
  last: boolean;
  axis: "x" | "y";
  breathe: boolean;
}) {
  const { travel, labels, onSelect } = React.useContext(SharedContext);
  const id = React.useId();
  return (
    <MilestoneItem
      step={index + 1}
      data-milestone-id={item.id}
      data-state={item.state}
      aria-current={isActive(item.state) ? "step" : undefined}
      className="v-milestone-path__item"
    >
      {!last && (
        <svg
          aria-hidden="true"
          className="v-milestone-path__connection"
          viewBox={axis === "x" ? "0 0 100 36" : "0 0 36 100"}
          preserveAspectRatio="none"
          fill="none"
        >
          <path
            d={axis === "x" ? horizontal : vertical}
            className="v-milestone-path__track"
            vectorEffect="non-scaling-stroke"
          />
          {item.state === "complete" && (
            <path
              d={axis === "x" ? horizontal : vertical}
              className="v-milestone-path__progress"
              vectorEffect="non-scaling-stroke"
            />
          )}
        </svg>
      )}
      <span
        aria-hidden="true"
        data-slot="milestone-path-indicator"
        data-part="indicator"
        className="v-milestone-path__marker"
      >
        <Mark state={item.state} travel={travel} breathe={breathe} />
      </span>
      <div className="v-milestone-path__content">
        <div className="v-milestone-path__heading">
          <MilestoneTitle id={`${id}-title`} className="v-milestone-path__title">
            {onSelect ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={item.disabled}
                data-morph="none"
                data-flow="off"
                data-stable-hit=""
                className="v-milestone-path__select"
                onClick={() => onSelect(item.id)}
              >
                {item.title}
              </Button>
            ) : (
              item.title
            )}
          </MilestoneTitle>
          <Badge
            size="sm"
            variant={badgeVariants[item.state]}
            className="v-milestone-path__status"
          >
            {labels?.[item.state] ?? stateLabels[item.state]}
          </Badge>
        </div>
        <Duration item={item} />
        {item.description && (
          <BodySecondary as="div" className="v-milestone-path__description">
            {item.description}
          </BodySecondary>
        )}
        {item.state === "needs" && (
          <Button
            variant="accent"
            size="sm"
            data-flow="off"
            className="v-milestone-path__action"
            onClick={item.action.onAction}
          >
            {item.action.label}
          </Button>
        )}
        {item.meta && (
          <Meta className="v-milestone-path__meta">{item.meta}</Meta>
        )}
        {item.details != null && item.details !== false && (
          <details className="v-milestone-path__details">
            {/* Named by reference so a rich title is never rendered twice. */}
            <summary
              id={`${id}-details`}
              aria-labelledby={`${id}-details ${id}-title`}
            >
              Details
            </summary>
            <div className="v-milestone-path__detail">{item.details}</div>
          </details>
        )}
        {!!item.steps?.length && (
          <Steps items={item.steps} axis="y" nested />
        )}
      </div>
    </MilestoneItem>
  );
}

/** One sibling list with its own travel layer. Nested lists get their own. */
function Steps({
  items,
  axis,
  nested,
}: {
  items: readonly Milestone[];
  axis: "x" | "y";
  nested?: boolean;
}) {
  const shared = React.useContext(SharedContext);
  const host = React.useRef<HTMLDivElement>(null);
  const layer = React.useRef<SVGSVGElement>(null);
  const rows = items.filter(usable);
  useMilestoneTravel(host, layer, {
    ids: rows.map((item) => item.id),
    states: rows.map((item) => item.state),
    travel: shared.travel,
    axis,
    allowed: shared.allowed,
  });
  const list = (
    <div
      ref={host}
      className="v-milestone-path__travel"
      data-root={nested ? undefined : ""}
    >
      <MilestoneList
        className="v-milestone-path__list"
        role="list"
        data-no-glide=""
        data-flow="off"
      >
        {rows.map((item, index) => (
          <Step
            key={item.id}
            item={item}
            index={index}
            last={index === rows.length - 1}
            axis={axis}
            // Only the deepest working body breathes; a working parent holds still.
            breathe={
              shared.breathe &&
              item.state === "current" &&
              !(item.steps ?? []).some((child) => isActive(child.state))
            }
          />
        ))}
      </MilestoneList>
      <svg
        ref={layer}
        aria-hidden="true"
        focusable="false"
        className="v-milestone-path__organism"
      />
    </div>
  );
  return nested ? (
    <MilestoneContext.Provider value={position(rows)}>
      <div className="v-milestone-path__steps">{list}</div>
    </MilestoneContext.Provider>
  ) : (
    list
  );
}

export function MilestonePath({
  ref,
  items,
  title,
  description,
  empty,
  statusLabels,
  onMilestoneSelect,
  presentation,
  travel = "seed",
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": labelledBy,
  ...props
}: MilestonePathProps) {
  const titleId = React.useId();
  const section = React.useRef<HTMLElement | null>(null);
  const setSection = React.useCallback(
    (node: HTMLElement | null) => {
      section.current = node;
      return assignMotionRef(ref, node);
    },
    [ref],
  );
  const { quiet: globalQuiet } = useChoreography();
  const { quiet, enabled, inView } = useGuidanceMotion(section);
  const now = useNow(hasRunning(items));
  const live = !quiet && enabled;
  const shared = React.useMemo<Shared>(
    () => ({
      travel,
      allowed: live && inView && presentation !== "review",
      breathe: live && inView,
      now,
      labels: statusLabels,
      onSelect: onMilestoneSelect,
    }),
    [travel, live, inView, presentation, now, statusLabels, onMilestoneSelect],
  );
  const list = (
    <Steps items={items} axis={presentation === "sequence" ? "x" : "y"} />
  );
  return (
    <section
      {...props}
      ref={setSection}
      data-slot="milestone-path"
      data-presentation={presentation}
      data-travel={travel}
      data-motion-quiet={globalQuiet || undefined}
      aria-label={
        ariaLabel ?? (!title && !labelledBy ? "Milestones" : undefined)
      }
      aria-labelledby={labelledBy ?? (title ? titleId : undefined)}
      className={cn("v-milestone-path", className)}
    >
      {(title || description) && (
        <header className="v-milestone-path__header">
          {title && <Title id={titleId}>{title}</Title>}
          {description && <BodySecondary as="div">{description}</BodySecondary>}
        </header>
      )}
      {items.length === 0 ? (
        (empty ?? (
          <Empty>
            <EmptyTitle>No milestones yet</EmptyTitle>
            <EmptyDescription>
              Add the steps that matter to this journey.
            </EmptyDescription>
          </Empty>
        ))
      ) : (
        <SharedContext.Provider value={shared}>
          <MilestoneParts value={position(items)}>
            {presentation === "sequence" ? (
              <>
                <ScrollArea
                  variant="plain"
                  className="v-milestone-path__scroll"
                  aria-label="Milestone sequence"
                  viewportProps={{ style: { height: "auto" } }}
                  viewportWrapper={(viewport) => (
                    <>
                      {viewport}
                      <ScrollBar orientation="horizontal" />
                    </>
                  )}
                >
                  {list}
                </ScrollArea>
                <Meta className="v-milestone-path__scroll-note">
                  Scroll to explore ·{" "}
                  {items.filter((item) => item.state === "complete").length} of{" "}
                  {items.length} completed
                </Meta>
              </>
            ) : (
              list
            )}
          </MilestoneParts>
        </SharedContext.Provider>
      )}
    </section>
  );
}
