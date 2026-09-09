"use client";

import * as React from "react";
import { ActivityFeed, type ActivityEntry } from "@/registry/cojeev/ui/activity-feed";
import { MilestonePath, type Milestone } from "@/registry/cojeev/ui/milestone-path";
import { Button } from "@/registry/cojeev/ui/button";
import { Meta } from "@/registry/cojeev/ui/typography";

const milestoneTitles = ["Find the right question", "Make a first version", "Invite a fresh perspective", "Bring it into the day"];
const milestoneDescriptions = [
  "Gather the notes, constraints, and small details that give this work its shape.",
  "A working draft makes the open questions easier to see.",
  "Make room for feedback while the work is still easy to change.",
  "Keep what is useful and carry the learning into the next piece of work.",
];

export function MilestonePathExample() {
  const [current, setCurrent] = React.useState(1);
  const [selected, setSelected] = React.useState<string | null>(null);
  const items: Milestone[] = milestoneTitles.map((title, index) => ({
    id: `milestone-${index}`, title, description: milestoneDescriptions[index],
    state: index < current ? "complete" : index === current ? "current" : "upcoming",
  }));
  return <div style={{ width:"100%", maxWidth:680, display:"grid", gap:24 }}>
    <MilestonePath title="From a thought to a useful thing" description="Four moments in a small creative project."
      items={items} onMilestoneSelect={setSelected} />
    <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:12 }}>
      <Button size="sm" onClick={() => setCurrent(value => value === items.length ? 0 : value + 1)}>
        {current === items.length ? "Start again" : "Complete this milestone"}
      </Button>
      <Meta role="status">{Math.min(current, items.length)} of {items.length} completed{selected ? ` · Selected: ${items.find(item => item.id === selected)?.title}` : ""}</Meta>
    </div>
  </div>;
}

const activityEntries: ActivityEntry[] = [
  { id:"note", title:"Added a useful detail", description:"The welcome screen should make the next action feel obvious.", actor:{ name:"Mira Shah" }, timestamp:"Today, 10:42", dateTime:"2026-09-08T10:42:00+05:30", badge:{label:"Note",variant:"yellow-soft"} },
  { id:"review", title:"Reviewed the first version", description:"The flow reads clearly. Let’s give the final step a little more room.", actor:{ name:"Arun Rao" }, timestamp:"Today, 09:18", dateTime:"2026-09-08T09:18:00+05:30" },
  { id:"draft", title:"Saved the opening draft", description:"A small beginning, ready for a fresh pair of eyes.", actor:{ name:"Mira Shah" }, timestamp:"Yesterday, 16:30", dateTime:"2026-09-07T16:30:00+05:30", badge:{label:"Draft",variant:"olive-soft"} },
  { id:"brief", title:"Collected the starting notes", description:"Audience, tone, and the three things this page needs to do.", timestamp:"Yesterday, 11:05", dateTime:"2026-09-07T11:05:00+05:30" },
];

export function ActivityFeedExample() {
  const [entries, setEntries] = React.useState(activityEntries);
  const [added, setAdded] = React.useState(false);
  return <div style={{ width:"100%", maxWidth:680, display:"grid", gap:22 }}>
    <ActivityFeed title="A little closer" description="Example activity from a shared project."
      entries={entries} initialVisible={2} pageSize={2} />
    <div style={{ display:"flex", flexWrap:"wrap", alignItems:"center", gap:12 }}>
      <Button variant="outline" size="sm" disabled={added} onClick={() => {
        setEntries(value => [{ id:"local-note", title:"Added an example update", description:"This entry was added by the button in this preview.", actor:{name:"You"}, timestamp:"Just now", badge:{label:"Local",variant:"blue-soft"} }, ...value]);
        setAdded(true);
      }}>{added ? "Example added" : "Add an example update"}</Button>
      <Meta>Changes stay in this preview.</Meta>
    </div>
  </div>;
}
