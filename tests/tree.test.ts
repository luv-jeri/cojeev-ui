import assert from "node:assert/strict";
import test from "node:test";
import * as React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Tree, type TreeNode } from "@/registry/cojeev/ui/tree";
import { componentAPIs } from "../scripts/component-api.mjs";

const nodes: readonly TreeNode[] = [
  {
    id: "workspace",
    label: "Workspace",
    kind: "folder",
    children: [
      { id: "readme", label: "README.md", kind: "file" },
      {
        id: "empty",
        label: "Empty archive",
        kind: "folder",
        children: [],
      },
    ],
  },
  {
    id: "failed",
    label: "Failed branch",
    kind: "folder",
    status: "error",
    message: "Could not load this branch.",
  },
];

test("Tree renders labelled native disclosure lists with separate controls and local branch state", () => {
  const markup = renderToStaticMarkup(
    React.createElement(Tree, {
      "aria-label": "Project files",
      nodes,
      expandedIds: ["workspace", "empty", "failed"],
      selectedId: "readme",
      onExpandedChange: () => {},
      onSelectionChange: () => {},
      onRetry: () => {},
    }),
  );

  assert.match(markup, /^<ul[^>]*aria-label="Project files"/);
  assert.match(markup, /aria-label="Collapse Workspace"/);
  assert.match(markup, /aria-expanded="true"/);
  assert.match(markup, /aria-controls="tree-branch-[^"]+"/);
  assert.match(
    markup,
    /<button[^>]*data-slot="tree-select"[^>]*>.*README\.md.*<\/button>/,
  );
  assert.match(markup, /aria-current="true"/);
  assert.match(markup, /This branch is empty\./);
  assert.match(markup, /Could not load this branch\./);
  assert.match(
    markup,
    /<button[^>]*data-slot="tree-retry"[^>]*>.*Retry.*<\/button>/,
  );
  assert.doesNotMatch(markup, /role="(?:tree|treeitem|treegrid)"/);
});

test("Tree catalogue metadata exposes the supplied-node contract", () => {
  const api = componentAPIs(["tree"]).tree;
  const node = api.find((entry: { name: string }) => entry.name === "TreeNode");
  assert.ok(node, "TreeNode must be documented beside TreeProps");
  assert.deepEqual(
    node.props.map((property: { name: string }) => property.name),
    [
      "id",
      "label",
      "kind",
      "children",
      "icon",
      "status",
      "message",
      "truncated",
      "trailing",
      "disabled",
    ],
  );
});
