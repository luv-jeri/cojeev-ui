"use client";

import * as React from "react";
import { FocusSession } from "@/registry/sahajiv/ui/focus-session";
import { InviteCard } from "@/registry/sahajiv/ui/invite-card";
import type { OrganismAction } from "@/registry/sahajiv/ui/organism-composition";
import { ToggleGroup, ToggleGroupItem } from "@/registry/sahajiv/ui/toggle-group";
import { Meta } from "@/registry/sahajiv/ui/typography";

const frame: React.CSSProperties = { display: "grid", gap: 20, width: "100%", maxWidth: 440, marginInline: "auto", minWidth: 0 };

export function FocusSessionExample() {
  const [minutes, setMinutes] = React.useState("5");
  const [receipt, setReceipt] = React.useState("Choose a duration, then begin when you are ready.");
  const action = (event: OrganismAction) => {
    const label: Record<string, string> = {
      start: "Your local focus session has started.",
      pause: "Paused. Your remaining time is kept here.",
      reset: "A fresh session is ready.",
      complete: "Session complete. Take a little break.",
    };
    setReceipt(label[event.action] ?? `Local session action: ${event.action}.`);
  };
  return <div style={frame}>
    <ToggleGroup type="single" value={minutes} aria-label="Session duration" onValueChange={value => {
      if (!value) return;
      setMinutes(value);
      setReceipt(`A fresh ${value}-minute session is ready.`);
    }} style={{ justifyContent: "center" }}>
      {[5, 15, 25].map(value => <ToggleGroupItem key={value} value={String(value)} aria-label={`${value} minutes`}>{value} min</ToggleGroupItem>)}
    </ToggleGroup>
    <FocusSession key={minutes} name="Make room for one good idea" description="One task. A little uninterrupted time." durationSeconds={Number(minutes) * 60} onAction={action} />
    <Meta data-example-receipt="focus-session">{receipt}</Meta>
    <Meta>Local timer demo. Changing the duration starts a fresh session; reloading clears it.</Meta>
  </div>;
}

export function InviteCardExample() {
  const [receipt, setReceipt] = React.useState("A fictional open-studio invitation. Your response stays in this preview.");
  return <div style={frame}>
    <InviteCard name="An afternoon of making" description="Bring a small idea. Leave with a little momentum." inviteDate="Friday" inviteTime="15:00–16:00" inviteLocation="Studio room · online" participants={[{name:"Mira",initials:"MK"},{name:"Theo",initials:"TN"},{name:"Asha",initials:"AS"}]} onAction={event => {
      setReceipt(event.value === "yes" || event.checked === true ? "Marked as attending in this local preview." : event.value === "no" || event.checked === false ? "Marked as unable to attend in this local preview." : "Your response changed in this local preview.");
    }} />
    <Meta data-example-receipt="invite-card">{receipt}</Meta>
    <Meta>Local RSVP demo. It sends no invitation, email or calendar update.</Meta>
  </div>;
}
