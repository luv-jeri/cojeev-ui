"use client";

import * as React from "react";
import { Icon, IconButton } from "@/registry/cojeev/ui/icon";
import { Tree, type TreeNode } from "@/registry/cojeev/ui/tree";
import type { ExampleProps } from "./types";

type RetryState = "error" | "loading" | "ready";

export function TreeExample(_props: ExampleProps) {
  const [expanded, setExpanded] = React.useState([
    "field-notes",
    "drafts",
    "chapters",
    "empty",
    "incoming",
    "references",
  ]);
  const [selected, setSelected] = React.useState("branch-ledger");
  const [retryState, setRetryState] = React.useState<RetryState>("error");
  const [announcement, setAnnouncement] = React.useState(
    "Branch state is supplied by this local example.",
  );
  const retryTimer = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  React.useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  const nodes = React.useMemo<readonly TreeNode[]>(
    () => [
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
                id: "chapters",
                label: "chapters/a-deliberately-deep-path-for-a-small-screen",
                kind: "folder",
                truncated: true,
                children: [
                  {
                    id: "branch-ledger",
                    label:
                      "the-branch-ledger-keeps-its-full-accessible-name.md",
                    kind: "file",
                    trailing: (
                      <IconButton
                        size="sm"
                        aria-label="More actions for the branch ledger note"
                        onClick={() =>
                          setAnnouncement(
                            "The note action stayed separate from selection.",
                          )
                        }
                      >
                        <Icon name="ellipsis" size="sm" feedback={false} />
                      </IconButton>
                    ),
                  },
                ],
              },
            ],
          },
          { id: "published", label: "published-note.md", kind: "file" },
        ],
      },
      {
        id: "empty",
        label: "Empty archive",
        kind: "folder",
        children: [],
      },
      {
        id: "incoming",
        label: "Incoming notes",
        kind: "folder",
        status: "loading",
        message: "Waiting for this example to supply notes…",
      },
      {
        id: "references",
        label: "References",
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
      },
      { id: "locked", label: "Locked record", kind: "file", disabled: true },
    ],
    [retryState],
  );

  return (
    <section className="v-tree-example">
      <header>
        <span>Controlled disclosure list</span>
        <h3>Project branch ledger</h3>
        <p>
          Expansion, selection and supplied branch data stay independent. This
          specimen does not read a filesystem or fetch remote data.
        </p>
      </header>
      <div className="v-tree-example__viewport">
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
          onRetry={(id) => {
            if (id !== "references" || retryState === "loading") return;
            setRetryState("loading");
            setAnnouncement("Retrying the local References branch.");
            retryTimer.current = setTimeout(() => {
              setRetryState("ready");
              setAnnouncement("The local example supplied one reference.");
            }, 650);
          }}
        />
      </div>
      <p className="v-tree-example__status" role="status">
        {announcement}
      </p>
    </section>
  );
}
