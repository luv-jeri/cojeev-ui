"use client";

import * as React from "react";
import { useChoreography } from "@/registry/cojeev/motion/choreography";
import { useFlowGroup } from "@/registry/cojeev/motion/use-flow";
import { cn } from "@/registry/cojeev/lib/utils";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";

export type TreeNode = {
  /** Stable, unique identity owned by the caller. */
  id: string;
  label: string;
  kind: "file" | "folder";
  /** Undefined means not supplied; an empty array means loaded and empty. */
  children?: readonly TreeNode[];
  icon?: React.ReactNode;
  status?: "idle" | "loading" | "error";
  message?: string;
  truncated?: boolean;
  trailing?: React.ReactNode;
  disabled?: boolean;
};

export type TreeProps = Omit<React.ComponentProps<"ul">, "children"> & {
  nodes: readonly TreeNode[];
  expandedIds: readonly string[];
  selectedId?: string;
  onExpandedChange: (id: string, expanded: boolean) => void;
  onSelectionChange: (id: string) => void;
  onRetry?: (id: string) => void;
};

type TreeBranchParameters = {
  node: TreeNode;
  expanded: ReadonlySet<string>;
  selectedId?: string;
  treeId: string;
  expandRefs: React.RefObject<Map<string, HTMLButtonElement>>;
  onExpandedChange: TreeProps["onExpandedChange"];
  onSelectionChange: TreeProps["onSelectionChange"];
  onRetry?: TreeProps["onRetry"];
};

function branchId(treeId: string, id: string) {
  return `${treeId}-${encodeURIComponent(id)}`;
}

function TreeBranch({
  node,
  expanded,
  selectedId,
  treeId,
  expandRefs,
  onExpandedChange,
  onSelectionChange,
  onRetry,
}: TreeBranchParameters) {
  const isFolder = node.kind === "folder";
  const isExpanded = isFolder && expanded.has(node.id);
  const isSelected = selectedId === node.id;
  const contentId = branchId(treeId, node.id);
  const hasChildren = Boolean(node.children?.length);
  const branchNotice =
    node.status === "loading"
      ? (node.message ?? "Loading this branch…")
      : node.status === "error"
        ? (node.message ?? "This branch could not be loaded.")
        : node.children === undefined
          ? "Children have not been supplied."
          : !hasChildren
            ? "This branch is empty."
            : null;
  const noticeStatus =
    node.status === "loading" || node.status === "error"
      ? node.status
      : "empty";

  return (
    <li
      data-slot="tree-item"
      data-tree-node-id={node.id}
      data-kind={node.kind}
      data-selected={isSelected || undefined}
      data-disabled={node.disabled || undefined}
      aria-busy={node.status === "loading" || undefined}
    >
      {/* The row is the travelling-selection item: one surface for chevron, name and actions. */}
      <div
        data-slot="tree-row"
        data-selected={isSelected || undefined}
        data-disabled={node.disabled || undefined}
      >
        {isFolder ? (
          <button
            ref={(element) => {
              if (element) expandRefs.current.set(node.id, element);
              else expandRefs.current.delete(node.id);
            }}
            type="button"
            data-slot="tree-expand"
            aria-label={`${isExpanded ? "Collapse" : "Expand"} ${node.label}`}
            aria-expanded={isExpanded}
            aria-controls={contentId}
            disabled={node.disabled}
            onClick={() => onExpandedChange(node.id, !isExpanded)}
          >
            <Icon name="chevron-right" size="sm" feedback={false} />
          </button>
        ) : (
          <span data-slot="tree-expand-spacer" aria-hidden="true" />
        )}

        <button
          type="button"
          data-slot="tree-select"
          aria-current={isSelected ? "true" : undefined}
          disabled={node.disabled}
          onClick={() => onSelectionChange(node.id)}
        >
          <span data-slot="tree-icon" aria-hidden="true">
            {node.icon ?? (
              <Icon
                name={
                  isFolder ? (isExpanded ? "folder-open" : "folder") : "file-text"
                }
                size="sm"
                feedback={false}
              />
            )}
          </span>
          <span data-slot="tree-label" title={node.label} dir="auto">
            {node.label}
          </span>
        </button>

        {node.trailing && (
          <span data-slot="tree-trailing">{node.trailing}</span>
        )}
      </div>

      {isFolder && (
        <ul id={contentId} data-slot="tree-branch" hidden={!isExpanded}>
          {hasChildren &&
            node.children!.map((child) => (
              <TreeBranch
                key={child.id}
                node={child}
                expanded={expanded}
                selectedId={selectedId}
                treeId={treeId}
                expandRefs={expandRefs}
                onExpandedChange={onExpandedChange}
                onSelectionChange={onSelectionChange}
                onRetry={onRetry}
              />
            ))}
          {branchNotice && (
            <li
              data-slot="tree-notice"
              data-status={noticeStatus}
              role={node.status === "loading" ? "status" : undefined}
            >
              <span data-slot="tree-notice-icon" aria-hidden="true">
                {node.status === "loading" ? (
                  <Icon name="loader" size="sm" feedback={false} />
                ) : node.status === "error" ? (
                  <Icon name="triangle-alert" size="sm" feedback={false} />
                ) : (
                  <Icon name="circle-dashed" size="sm" feedback={false} />
                )}
              </span>
              <span dir="auto">{branchNotice}</span>
              {node.status === "error" && onRetry && (
                <Button
                  size="sm"
                  variant="outline"
                  data-slot="tree-retry"
                  className="v-tree__retry"
                  style={{ "--mstroke": "currentColor" } as React.CSSProperties}
                  onClick={() => onRetry(node.id)}
                >
                  <Icon name="refresh-cw" size="sm" />
                  Retry
                </Button>
              )}
            </li>
          )}
          {node.truncated && (
            <li data-slot="tree-notice" data-status="truncated">
              <span data-slot="tree-notice-icon" aria-hidden="true">
                <Icon name="ellipsis" size="sm" feedback={false} />
              </span>
              <span dir="auto">
                {node.message ?? "This branch is truncated by the consumer."}
              </span>
            </li>
          )}
        </ul>
      )}
    </li>
  );
}

function parentIds(nodes: readonly TreeNode[]) {
  const parents = new Map<string, string>();
  const visit = (entries: readonly TreeNode[], parent?: string) => {
    for (const node of entries) {
      if (parent) parents.set(node.id, parent);
      if (node.children) visit(node.children, node.id);
    }
  };
  visit(nodes);
  return parents;
}

export function Tree({
  ref,
  className,
  nodes,
  expandedIds,
  selectedId,
  onExpandedChange,
  onSelectionChange,
  onRetry,
  onFocusCapture,
  onBlurCapture,
  ...props
}: TreeProps) {
  const { quiet } = useChoreography();
  const generatedId = React.useId();
  const treeId = `tree-branch-${generatedId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const rootRef = React.useRef<HTMLUListElement>(null);
  // The shared travelling selection owns the selected surface and pointer preview.
  // Rows are its items, so the surface glides between files instead of repainting.
  const flowRef = useFlowGroup<HTMLUListElement>(rootRef, {
    kind: "pill",
    itemSelector: '[data-slot="tree-row"]',
    activeSelector: '[data-selected="true"]',
  });
  const expandRefs = React.useRef(new Map<string, HTMLButtonElement>());
  const focusedNode = React.useRef<string | undefined>(undefined);
  const previousExpanded = React.useRef(new Set(expandedIds));
  const parents = React.useMemo(() => parentIds(nodes), [nodes]);
  const expanded = React.useMemo(() => new Set(expandedIds), [expandedIds]);

  React.useImperativeHandle(ref, () => rootRef.current!);
  React.useLayoutEffect(() => {
    const collapsed = new Set(
      [...previousExpanded.current].filter((id) => !expanded.has(id)),
    );
    let ancestor = focusedNode.current
      ? parents.get(focusedNode.current)
      : undefined;
    let recoveryTarget: string | undefined;
    while (ancestor) {
      if (collapsed.has(ancestor)) recoveryTarget = ancestor;
      ancestor = parents.get(ancestor);
    }
    if (recoveryTarget) {
      expandRefs.current.get(recoveryTarget)?.focus({ preventScroll: true });
      focusedNode.current = recoveryTarget;
    }
    previousExpanded.current = new Set(expanded);
  }, [expanded, parents]);

  return (
    <ul
      ref={flowRef}
      data-slot="tree"
      data-flow-group=""
      data-motion-quiet={quiet || undefined}
      className={cn("v-tree", className)}
      onFocusCapture={(event) => {
        const item = (event.target as Element).closest<HTMLElement>(
          "[data-tree-node-id]",
        );
        if (item?.dataset.treeNodeId)
          focusedNode.current = item.dataset.treeNodeId;
        onFocusCapture?.(event);
      }}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          focusedNode.current = undefined;
        }
        onBlurCapture?.(event);
      }}
      {...props}
    >
      {nodes.map((node) => (
        <TreeBranch
          key={node.id}
          node={node}
          expanded={expanded}
          selectedId={selectedId}
          treeId={treeId}
          expandRefs={expandRefs}
          onExpandedChange={onExpandedChange}
          onSelectionChange={onSelectionChange}
          onRetry={onRetry}
        />
      ))}
    </ul>
  );
}
