"use client";

import * as React from "react";
import { ArrowUpRight, RotateCcw } from "lucide-react";
import type { ExampleProps } from "./types";
import { Button } from "@/registry/sahajiv/ui/button";
import { Badge } from "@/registry/sahajiv/ui/badge";
import { Card } from "@/registry/sahajiv/ui/card";
import { MotionPresence, MotionSurface } from "@/registry/sahajiv/ui/presence";
import { AgentState, type AgentStatus } from "@/registry/sahajiv/ui/agent-state";
import {
  AgentChat, AgentChatLayout, AgentChatMain, AgentChatAside, AgentChatHeader, AgentChatThread, AgentChatMessage, AgentChatComposer,
  AgentChatPermission, AgentChatOptions, AgentChatProgress, type AgentChatAttachment,
} from "@/registry/sahajiv/ui/agent-chat";

export function AgentStateExample({ variant = "idle", size = "lg" }: ExampleProps) {
  const states: AgentStatus[] = ["idle", "thinking", "working", "needs-input", "complete", "error"];
  const selected = states.includes(variant as AgentStatus) ? variant as AgentStatus : "idle";
  const [status, setStatus] = React.useState<AgentStatus>(selected);
  const [previousVariant, setPreviousVariant] = React.useState(selected);
  if (previousVariant !== selected) {
    setPreviousVariant(selected);
    setStatus(selected);
  }
  const descriptions: Record<AgentStatus, string> = {
    idle: "A little space for your next idea.",
    thinking: "Connecting the useful pieces.",
    working: "Taking the next step, with you in control.",
    "needs-input": "One choice before we continue.",
    complete: "Everything is ready to review.",
    error: "Something interrupted this step. You can try again.",
  };
  return <div className="v-agent-state-demo">
    <AgentState status={status} size={size === "sm" || size === "md" ? size : "lg"} description={descriptions[status]} />
    <div className="v-agent-state-demo__controls" role="group" aria-label="Preview agent state">
      {states.map((state) => <Button key={state} size="sm" variant={state === status ? "default" : "secondary"} aria-pressed={state === status} onClick={() => setStatus(state)}>{state === "needs-input" ? "Your decision" : state.charAt(0).toUpperCase() + state.slice(1)}</Button>)}
    </div>
    <p style={{ margin: 0, fontSize: 12, color: "var(--v-text-2)" }}>Interactive demo · Select a state to explore its movement.</p>
  </div>;
}

export function AgentWorkspaceExample() {
  const [selected, setSelected] = React.useState("brief");
  const [reviewed, setReviewed] = React.useState<string[]>([]);
  const tasks = [
    { id: "brief", title: "Review the weekly brief", detail: "A small set of decisions, ready for your attention.", heading: "Leave a clear place to begin", points: ["Bring the open decisions together before starting something new.", "Keep tomorrow’s first action specific enough to begin in ten minutes.", "Save the useful context beside the work, so it is there when you return."] },
    { id: "context", title: "Prepare tomorrow’s context", detail: "Three useful pieces to carry into the next session.", heading: "A thoughtful handoff", points: ["The current draft is ready for a first read.", "Two open questions still need a person’s decision.", "The next session can start with those questions, then return to the draft."] },
    { id: "questions", title: "Collect the open questions", detail: "A place for the things that need a little thought.", heading: "Make the unknowns visible", points: ["What is the smallest result that would be useful this week?", "Which decision would make the next step clearer?", "What context should stay close to the work?"] },
  ];
  const current = tasks.find((task) => task.id === selected) ?? tasks[0];
  const complete = reviewed.includes(current.id);
  return <AgentChatLayout>
    <AgentChatMain>
      <div className="v-agent-workspace__intro"><Badge variant="olive">Interactive workspace demo</Badge><h1>A clear view of what comes next.</h1><p>Review a sample result, keep the useful pieces, and explore a conversation beside your work. Every action here stays in this local demo.</p></div>
      <div className="v-agent-workspace__section-heading"><h2>Ready for your attention</h2><span role="status">{reviewed.length} of {tasks.length} reviewed</span></div>
      <div className="v-agent-workspace__tasks" role="group" aria-label="Sample tasks">
        {tasks.map((task) => <Button key={task.id} variant={task.id === selected ? "default" : "secondary"} className="v-agent-workspace__task" aria-pressed={task.id === selected} onClick={() => setSelected(task.id)}><span className="v-agent-workspace__task-copy"><b>{task.title}</b><small>{task.detail}</small></span><span className="v-agent-workspace__task-status">{reviewed.includes(task.id) ? "Reviewed" : "Ready"}</span></Button>)}
      </div>
      <div className="v-agent-workspace__section-heading"><h2>Selected result</h2><span>Sample content</span></div>
      <Card className="v-agent-workspace__artifact">
        <Badge variant={complete ? "olive" : "blue"}>{complete ? "Reviewed" : "Ready to review"}</Badge>
        <h3>{current.heading}</h3><p>{current.detail}</p>
        <ul>{current.points.map((point) => <li key={point}>{point}</li>)}</ul>
        <div className="v-agent-workspace__artifact-actions"><Button variant={complete ? "secondary" : "default"} onClick={() => setReviewed((items) => complete ? items.filter((id) => id !== current.id) : [...items, current.id])}>{complete ? "Reopen review" : "Mark reviewed"}</Button><p role="status">{complete ? "Review saved in this demo." : "Read it through, then mark it reviewed."}</p></div>
      </Card>
    </AgentChatMain>
    <AgentChatAside><AgentChatExample /></AgentChatAside>
  </AgentChatLayout>;
}

export function AgentChatExample() {
  type Phase = "idle" | "thinking" | "permission" | "options" | "working" | "complete" | "denied" | "stopped" | "error";
  type Entry = { id: number; from: "user" | "agent"; text: string };
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState<Entry[]>([]);
  const [attachments, setAttachments] = React.useState<AgentChatAttachment[]>([]);
  const [scope, setScope] = React.useState<string[]>([]);
  const [format, setFormat] = React.useState("brief");
  const [lastPrompt, setLastPrompt] = React.useState("");
  const [failThisRun, setFailThisRun] = React.useState(false);
  const [permission, setPermission] = React.useState<"pending" | "allowed" | "denied">("pending");
  const sequence = React.useRef(0);
  const thread = React.useRef<HTMLDivElement>(null);
  const decisionFocus = React.useRef<HTMLDivElement>(null);
  const status: AgentStatus = phase === "thinking" ? "thinking" : phase === "working" ? "working" : phase === "permission" || phase === "options" ? "needs-input" : phase === "complete" || phase === "denied" ? "complete" : phase === "error" ? "error" : "idle";
  const active = ["thinking", "permission", "options", "working"].includes(phase);
  const addMessage = React.useCallback((from: Entry["from"], text: string) => {
    setMessages((items) => [...items, { id: ++sequence.current, from, text }]);
  }, []);
  React.useEffect(() => {
    if (phase === "thinking") {
      const timer = window.setTimeout(() => setPhase("permission"), 1400);
      return () => window.clearTimeout(timer);
    }
    if (phase === "working") {
      const timer = window.setTimeout(() => {
        if (failThisRun) { setPhase("error"); return; }
        addMessage("agent", format === "brief"
          ? "Your sample brief is ready.\n\n• Keep the next action small and specific.\n• Collect the decisions in one place.\n• Leave a clear point to pick up tomorrow.\n\nThis is a local demonstration; no files were read or changed."
          : "Your sample plan is ready.\n\n1. Gather context\nBring the relevant notes into one view and mark any open questions.\n\n2. Choose the next action\nTurn the most useful idea into a small, reviewable step.\n\n3. Keep a trail\nWrite down the result and where to continue next time.\n\nThis is a local demonstration; no files were read or changed.");
        setPhase("complete");
      }, 1800);
      return () => window.clearTimeout(timer);
    }
  }, [phase, failThisRun, format, addMessage]);
  React.useEffect(() => {
    if (phase === "permission" || phase === "options") decisionFocus.current?.focus({ preventScroll: true });
  }, [phase]);
  function start(prompt: string, fail = false) {
    if (active || (!prompt.trim() && !attachments.length)) return;
    setLastPrompt(prompt.trim() || "Use these attachments to make a short brief.");
    setScope(attachments.map((file) => file.name));
    addMessage("user", [prompt.trim() || "Use these attachments to make a short brief.", ...attachments.map((file) => `Attached: ${file.name}`)].join("\n"));
    setDraft(""); setAttachments([]); setPermission("pending"); setFailThisRun(fail); setPhase("thinking");
    if (thread.current) thread.current.scrollTop = thread.current.scrollHeight;
  }
  function stop() {
    setPhase("stopped");
    addMessage("agent", "Stopped. This demo did not read or change any files. Your conversation is still here when you are ready.");
  }
  function reset() {
    setPhase("idle"); setDraft(""); setMessages([]); setAttachments([]); setScope([]); setPermission("pending"); setFailThisRun(false); setFormat("brief");
  }
  return <div className="v-agent-chat-demo">
    <div className="v-agent-chat-demo__tools"><p>Interactive demo · runs locally</p><Button size="sm" variant="ghost" disabled={active} onClick={() => start("Create a brief, then show me the retry state.", true)}>Try an error</Button><Button size="sm" variant="ghost" onClick={reset} aria-label="Reset demo"><RotateCcw size={14} aria-hidden="true" />Reset</Button></div>
    <AgentChat>
      <AgentChatHeader title="A little room to think" description="SahaJiv · your working companion" status={status} statusLabel={phase === "stopped" ? "Stopped" : phase === "denied" ? "Permission denied" : undefined} />
      <AgentChatThread ref={thread}>
        <MotionPresence>
        {messages.length === 0 && <MotionSurface key="welcome" preset="fade" className="v-agent-chat-demo__welcome">
          <p>Bring a half-formed thought. Try a conversation, make a choice, and explore how a permission request feels.</p>
          <div className="v-agent-chat-demo__suggestions">
            {["Turn my notes into a clear next step", "Help me make room for a new idea"].map((prompt) => <Button key={prompt} variant="secondary" onClick={() => start(prompt)}>{prompt}<ArrowUpRight size={16} aria-hidden="true" /></Button>)}
          </div>
        </MotionSurface>}
        {messages.map((message) => <AgentChatMessage key={message.id} from={message.from} author={message.from === "user" ? "You" : "SahaJiv"}><p>{message.text}</p></AgentChatMessage>)}
        {(active || phase === "error") && <AgentChatMessage key="workflow" meta="Demo workflow">
          <p>{phase === "thinking" ? "I’m putting a small plan together. You can stop at any point." : phase === "permission" ? "A little context would help. You decide what I can use." : phase === "options" ? "How would you like the result?" : phase === "error" ? "The simulated run was interrupted. Retry will replay this request." : "I’m shaping the sample result into something useful."}</p>
          <AgentChatProgress steps={[
            { id: "understand", label: "Understand the request", status: phase === "thinking" ? "current" : "complete" },
            { id: "consent", label: "Check with you", detail: phase === "permission" ? "Waiting for permission" : phase === "options" ? "Choose an output format" : undefined, status: phase === "thinking" ? "pending" : phase === "permission" || phase === "options" ? "current" : "complete" },
            { id: "make", label: "Prepare a sample result", status: phase === "working" ? "current" : phase === "error" ? "error" : "pending" },
          ]} />
          <MotionPresence>
          {(phase === "permission" || phase === "options") && <MotionSurface key="decision" preset="rise" ref={decisionFocus} tabIndex={-1} className="v-agent-chat-demo__decision">
            <AgentChatPermission title="Use the selected context?" description="In a connected app, this would grant access to only the files listed below. This demo does not read them." scope={scope.length ? scope.join(" · ") : "Sample context: working-notes.md"} decision={permission} onDecision={(choice) => {
              setPermission(choice);
              if (choice === "allowed") setPhase("options");
              else { setPhase("denied"); addMessage("agent", "Permission denied. I did not use the selected context. You can send another request whenever you like."); }
            }} />
            <MotionPresence>{phase === "options" && <MotionSurface key="options" preset="rise" style={{ marginTop: 20 }}><AgentChatOptions title="Choose the shape of the answer" options={[
              { value: "brief", label: "A short brief", description: "Three useful points to move forward." },
              { value: "plan", label: "A thoughtful plan", description: "A few steps, with a little more context." },
            ]} value={format} onValueChange={setFormat} onConfirm={() => setPhase("working")} /></MotionSurface>}</MotionPresence>
            <Button variant="ghost" size="sm" onClick={stop} style={{ marginTop: 8 }}>Cancel request</Button>
          </MotionSurface>}
          </MotionPresence>
        </AgentChatMessage>}
        {phase === "complete" && <MotionSurface key="complete" preset="scale" asChild><AgentState size="sm" status="complete" label="Ready to review" description="Your sample result is above." /></MotionSurface>}
        </MotionPresence>
      </AgentChatThread>
      <AgentChatComposer value={draft} onValueChange={setDraft} onSend={() => start(draft)} status={status} disabled={phase === "permission" || phase === "options"} onStop={stop} attachments={attachments} onAttach={(files) => setAttachments((current) => [...current, ...files.map((file) => ({ id: String(++sequence.current), name: file.name, detail: `${Math.max(1, Math.ceil(file.size / 1024))} KB · stays on this device` }))])} onRemoveAttachment={(id) => setAttachments((current) => current.filter((file) => file.id !== id))} error={phase === "error" ? "Demo interruption. Your request is saved; retry to continue." : undefined} onRetry={phase === "error" ? () => { setFailThisRun(false); setPermission("pending"); setPhase("thinking"); addMessage("agent", `Retrying: ${lastPrompt}`); } : undefined} hint="Interactive demo · no AI connection, uploads, or file changes" />
    </AgentChat>
  </div>;
}
