"use client";

import * as React from "react";
import { Icon, IconButton } from "@/registry/cojeev/ui/icon";
import { Tree, type TreeNode } from "@/registry/cojeev/ui/tree";
import type { ExampleProps } from "./types";

type RetryState = "error" | "loading" | "ready";

/* The calm default: a small writing project with one open path, one
   collapsed folder and one locked record. Branch states live in the
   separate specimens below so the first view stays readable. */
function projectNodes(onMore: () => void): readonly TreeNode[] {
  return [
    {
      id: "field-notes",
      label: "Field notes",
      kind: "folder",
      children: [
        {
          id: "drafts",
          label: "drafts",
          kind: "folder",
          children: [
            { id: "morning", label: "morning-walk.md", kind: "file" },
            {
              id: "branch-ledger",
              label: "the-branch-ledger-keeps-its-full-accessible-name.md",
              kind: "file",
              trailing: (
                <IconButton
                  size="sm"
                  aria-label="More actions for the branch ledger note"
                  onClick={onMore}
                >
                  <Icon name="ellipsis" size="sm" feedback={false} />
                </IconButton>
              ),
            },
            { id: "evening", label: "evening-light.md", kind: "file" },
          ],
        },
        {
          id: "chapters",
          label: "chapters",
          kind: "folder",
          children: [
            { id: "chapter-one", label: "01-small-beginnings.md", kind: "file" },
            { id: "chapter-two", label: "02-good-possibilities.md", kind: "file" },
          ],
        },
        { id: "published", label: "published-note.md", kind: "file" },
      ],
    },
    {
      id: "references",
      label: "References",
      kind: "folder",
      children: [
        { id: "reading-list", label: "reading-list.md", kind: "file" },
        { id: "cover", label: "cover-sketch.png", kind: "file" },
      ],
    },
    { id: "locked", label: "Locked record", kind: "file", disabled: true },
  ];
}

function LedgerCard({
  compact,
  kicker,
  title,
  description,
  status,
  children,
}: {
  compact?: boolean;
  kicker: string;
  title: string;
  description: string;
  status: string;
  children: React.ReactNode;
}) {
  return (
    <section className="v-tree-example" data-compact={compact || undefined}>
      {!compact && (
        <header>
          <span>{kicker}</span>
          <h3>{title}</h3>
          <p>{description}</p>
        </header>
      )}
      <div className="v-tree-example__card">{children}</div>
      <p className="v-tree-example__status" role="status">
        {status}
      </p>
    </section>
  );
}

function ProjectLedger({ compact }: { compact?: boolean }) {
  const [expanded, setExpanded] = React.useState([
    "field-notes",
    "drafts",
    "references",
  ]);
  const [selected, setSelected] = React.useState("branch-ledger");
  const [announcement, setAnnouncement] = React.useState(
    "Branch state is supplied by this local example.",
  );
  const nodes = React.useMemo(
    () =>
      projectNodes(() =>
        setAnnouncement("The note action stayed separate from selection."),
      ),
    [],
  );

  return (
    <LedgerCard
      compact={compact}
      kicker="Controlled disclosure list"
      title="Project branch ledger"
      description="Expansion, selection and supplied branch data stay independent. This specimen does not read a filesystem or fetch remote data."
      status={announcement}
    >
      <Tree
        aria-label="Example project files"
        nodes={nodes}
        expandedIds={expanded}
        selectedId={selected}
        onExpandedChange={(id, open) => {
          setExpanded((ids) =>
            open
              ? [...new Set([...ids, id])]
              : ids.filter((value) => value !== id),
          );
          setAnnouncement(`${open ? "Expanded" : "Collapsed"} ${id}.`);
        }}
        onSelectionChange={(id) => {
          setSelected(id);
          setAnnouncement(`Selected ${id}.`);
        }}
      />
    </LedgerCard>
  );
}

/* One branch per state, each with a sibling that has already loaded, so the
   notice reads in context rather than as an isolated strip. */
function BranchState({
  compact,
  state,
}: {
  compact?: boolean;
  state: "loading" | "empty" | "error";
}) {
  const [expanded, setExpanded] = React.useState(["inbox", "notes"]);
  const [selected, setSelected] = React.useState("welcome");
  const [retryState, setRetryState] = React.useState<RetryState>("error");
  const [announcement, setAnnouncement] = React.useState(
    state === "loading"
      ? "The loading branch waits for the consumer to supply notes."
      : state === "empty"
        ? "An empty array means a loaded branch with nothing inside."
        : "The consumer decides what a retry does; this example resolves it locally.",
  );
  const retryTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  const nodes = React.useMemo<readonly TreeNode[]>(() => {
    const branch: TreeNode =
      state === "loading"
        ? {
            id: "inbox",
            label: "Incoming notes",
            kind: "folder",
            status: "loading",
            message: "Waiting for this example to supply notes…",
          }
        : state === "empty"
          ? {
              id: "inbox",
              label: "Empty archive",
              kind: "folder",
              children: [],
            }
          : {
              id: "inbox",
              label: "Remote references",
              kind: "folder",
              status: retryState === "ready" ? "idle" : retryState,
              message:
                retryState === "error"
                  ? "This example has not supplied its references."
                  : retryState === "loading"
                    ? "Retrying the local example…"
                    : undefined,
              children:
                retryState === "ready"
                  ? [{ id: "source", label: "source-note.md", kind: "file" }]
                  : undefined,
            };
    return [
      {
        id: "notes",
        label: "Notes",
        kind: "folder",
        children: [
          { id: "welcome", label: "welcome.md", kind: "file" },
          { id: "ideas", label: "ideas.md", kind: "file" },
        ],
      },
      branch,
    ];
  }, [state, retryState]);

  const copy = {
    loading: {
      kicker: "Loading branch",
      title: "A branch still on its way",
      description:
        "status=\"loading\" keeps the folder open and busy while the consumer fetches its children.",
    },
    empty: {
      kicker: "Empty branch",
      title: "A branch with nothing inside",
      description:
        "An empty children array is a loaded, empty branch; undefined children mean nothing was supplied yet.",
    },
    error: {
      kicker: "Failed branch",
      title: "A branch that could not load",
      description:
        "status=\"error\" pairs a readable message with Retry, which routes back to the consumer through onRetry.",
    },
  }[state];

  return (
    <LedgerCard
      compact={compact}
      kicker={copy.kicker}
      title={copy.title}
      description={copy.description}
      status={announcement}
    >
      <Tree
        aria-label={`${copy.kicker} example`}
        nodes={nodes}
        expandedIds={expanded}
        selectedId={selected}
        onExpandedChange={(id, open) => {
          setExpanded((ids) =>
            open
              ? [...new Set([...ids, id])]
              : ids.filter((value) => value !== id),
          );
          setAnnouncement(`${open ? "Expanded" : "Collapsed"} ${id}.`);
        }}
        onSelectionChange={(id) => {
          setSelected(id);
          setAnnouncement(`Selected ${id}.`);
        }}
        onRetry={(id) => {
          if (id !== "inbox" || retryState === "loading") return;
          setRetryState("loading");
          setAnnouncement("Retrying the local references branch.");
          retryTimer.current = setTimeout(() => {
            setRetryState("ready");
            setAnnouncement("The local example supplied one reference.");
          }, 900);
        }}
      />
    </LedgerCard>
  );
}

export function TreeExample({ variant = "branch-ledger", compact }: ExampleProps) {
  if (variant === "loading-branch")
    return <BranchState compact={compact} state="loading" />;
  if (variant === "empty-branch")
    return <BranchState compact={compact} state="empty" />;
  if (variant === "failed-branch")
    return <BranchState compact={compact} state="error" />;
  return <ProjectLedger compact={compact} />;
}
