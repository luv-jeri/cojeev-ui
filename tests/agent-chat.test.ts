import { test } from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AgentChatComposer,
  AgentChatOptions,
  AgentChatPermission,
} from "../registry/sahajiv/ui/agent-chat";
import { AgentState } from "../registry/sahajiv/ui/agent-state";

const noop = () => {};

test("composer rejects whitespace, allows attachments, and exposes stop during a run", () => {
  const render = (props: Record<string, unknown>) => renderToStaticMarkup(createElement(AgentChatComposer, {
    value: "  ", onValueChange: noop, onSend: noop, ...props,
  }));
  assert.match(render({}), /type="submit"[^>]*disabled=""/);
  assert.doesNotMatch(render({ attachments: [{ id: "a", name: "brief.md" }] }), /type="submit"[^>]*disabled=""/);
  const running = render({ status: "working", onStop: noop });
  assert.match(running, /Stop generation/);
  assert.doesNotMatch(running, /type="submit"/);
});

test("permission decisions remain explicit and a denied receipt cannot offer Allow", () => {
  const props = { title: "Read selected notes?", description: "Two selected files", onDecision: noop };
  const pending = renderToStaticMarkup(createElement(AgentChatPermission, props));
  assert.match(pending, /Allow once/);
  assert.match(pending, /Deny/);
  const denied = renderToStaticMarkup(createElement(AgentChatPermission, { ...props, decision: "denied" }));
  assert.match(denied, /Permission denied/);
  assert.doesNotMatch(denied, /<button/);
});

test("options require a valid enabled choice before confirming", () => {
  const props = {
    title: "Choose a format", onValueChange: noop, onConfirm: noop,
    options: [{ value: "brief", label: "Brief" }, { value: "full", label: "Full", disabled: true }],
  };
  const render = (value?: string) => renderToStaticMarkup(createElement(AgentChatOptions, { ...props, value }));
  assert.match(render(), /<button[^>]*disabled=""/);
  assert.match(render("full"), /<button[^>]*disabled=""/);
  assert.match(render("missing"), /<button[^>]*disabled=""/);
  assert.doesNotMatch(render("brief"), /<button[^>]*disabled=""/);
});

test("each agent state has readable status and independent SVG definitions", () => {
  const states = ["idle", "thinking", "working", "needs-input", "complete", "error"] as const;
  for (const status of states) {
    const html = renderToStaticMarkup(createElement(AgentState, { status }));
    assert.match(html, /role="status"/);
    assert.match(html, new RegExp(`data-status="${status}"`));
    assert.match(html, /<svg[^>]*aria-hidden="true"/);
  }
  const both = renderToStaticMarkup(createElement("div", null,
    createElement(AgentState, { status: "thinking" }), createElement(AgentState, { status: "working" })));
  const ids = [...both.matchAll(/ id="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(new Set(ids).size, ids.length);
});
