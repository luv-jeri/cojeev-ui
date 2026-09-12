"use client";

import * as React from "react";
import Link from "next/link";
import { animate } from "motion";
import { Avatar, AvatarFallback } from "@/registry/cojeev/ui/avatar";
import { Badge } from "@/registry/cojeev/ui/badge";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { Icon } from "@/registry/cojeev/ui/icon";
import { Input } from "@/registry/cojeev/ui/input";
import { Label } from "@/registry/cojeev/ui/label";
import { PigmentField } from "@/registry/cojeev/ui/pigment-field";
import { Meta } from "@/registry/cojeev/ui/typography";
import { trackMotion, useChoreography } from "@/registry/cojeev/motion/choreography";

/** Three compositions of one person, not three colours of one card. */
type ProfileTreatment = "classic" | "fold" | "stack";

const treatments: { value: ProfileTreatment; label: string; note: string }[] = [
  { value: "classic", label: "Classic", note: "A wide card with room to speak." },
  { value: "fold", label: "Fold", note: "One narrow column, folded at the top." },
  { value: "stack", label: "Stack", note: "Sheets of paper with readable handles." },
];

const person = {
  name: "Alex Rivera",
  role: "Designer & developer",
  initials: "AR",
  bio: "Curious about interfaces, systems and the little details that make them feel human.",
  interests: ["Design", "Code", "Open source", "Better tools", "Brighter days"],
  tags: ["UI", "Systems", "Open source"],
};

/**
 * The assembly, in order. Interactive parts change opacity only and never fall below
 * a visible floor, so a hit target never moves out from under the pointer or disappears.
 */
const paintOrder: { part: string; keyframes: Record<string, (string | number)[]> }[] = [
  // Only the inert paint layer is clipped; the surface that holds the controls is never masked.
  { part: "surface", keyframes: { clipPath: ["inset(0 0 100% 0 round 30px)", "inset(0 0 0% 0 round 30px)"] } },
  { part: "avatar", keyframes: { opacity: [0, 1], scale: [0.5, 1] } },
  { part: "identity", keyframes: { opacity: [0, 1], y: [14, 0] } },
  { part: "bio", keyframes: { opacity: [0, 1], y: [10, 0] } },
  { part: "tags", keyframes: { opacity: [0, 1], y: [8, 0] } },
  { part: "rail", keyframes: { opacity: [0.12, 1] } },
  { part: "actions", keyframes: { opacity: [0.25, 1] } },
];
const paintStep = 0.075;

/** The quiet alternates are previews: paint and words, and no controls of their own. */
function QuietPreview({ treatment }: { treatment: ProfileTreatment }) {
  return (
    <span className="profile-quiet" data-quiet-treatment={treatment} aria-hidden="true">
      <span className="profile-quiet__face">{person.initials}</span>
      <span className="profile-quiet__name">{person.name}</span>
      <span className="profile-quiet__role">{person.role}</span>
      <span className="profile-quiet__rule" />
      <span className="profile-quiet__line">{treatments.find(item => item.value === treatment)?.note}</span>
      <span className="profile-quiet__label">{treatments.find(item => item.value === treatment)?.label}</span>
    </span>
  );
}

/**
 * One bounded stage: a live profile, two quiet alternates and one small toolbar.
 *
 * The live profile is a single tree. A treatment changes its composition through CSS grid
 * areas and which sections it shows, so the native controls, the follow and save choices,
 * the open composer and every kept note are the same nodes before and after a switch.
 * Replay restarts the finite part-by-part paint on those same nodes; it never remounts them.
 */
export function ProfileStage() {
  const { quiet, transition } = useChoreography();
  const headingId = React.useId();
  const fieldId = React.useId();
  const [treatment, setTreatment] = React.useState<ProfileTreatment>("classic");
  const [following, setFollowing] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const [composing, setComposing] = React.useState(false);
  const [draft, setDraft] = React.useState("");
  const [notes, setNotes] = React.useState<string[]>([]);
  const [sequence, setSequence] = React.useState(0);
  const stage = React.useRef<HTMLElement>(null);
  const live = React.useRef<HTMLDivElement>(null);

  // The paint phase describes the running animation, not React data, so it is written
  // straight onto the stage element. Nothing in the composition re-renders while it runs.
  React.useEffect(() => {
    const host = live.current, root = stage.current;
    if (!host || !root) return;
    const phase = (value: "painting" | "settled") => { root.dataset.phase = value; };
    const parts = paintOrder
      .map(step => ({ step, node: host.querySelector<HTMLElement>(`[data-profile-part="${step.part}"]`) }))
      .filter((entry): entry is { step: (typeof paintOrder)[number]; node: HTMLElement } => Boolean(entry.node) && !entry.node!.hidden);
    const settle = (node: HTMLElement) => { node.style.clipPath = ""; node.style.opacity = ""; node.style.transform = ""; };
    if (quiet) {
      parts.forEach(({ node }) => { settle(node); node.dataset.paintSettled = "0"; });
      phase("settled");
      return;
    }
    phase("painting");
    const startedAt = performance.now();
    let current = true;
    const running = parts.map(({ step, node }, index) => {
      delete node.dataset.paintSettled;
      const controls = animate(node, step.keyframes, { ...transition, delay: index * paintStep });
      const finished = controls.finished.then(() => {
        if (!current) return;
        node.dataset.paintSettled = String(Math.round(performance.now() - startedAt));
        settle(node);
      }, () => {});
      return { release: trackMotion(controls), finished };
    });
    void Promise.allSettled(running.map(item => item.finished)).then(() => { if (current) phase("settled"); });
    return () => { current = false; running.forEach(item => item.release()); };
  }, [sequence, quiet, transition]);

  const alternates = treatments.filter(item => item.value !== treatment);
  const keep = () => {
    const note = draft.trim();
    if (!note) return;
    setNotes(list => [...list, note]);
    setDraft("");
  };

  return (
    <section
      className="profile-stage"
      ref={stage}
      aria-labelledby={headingId}
      data-profile-stage=""
      data-treatment={treatment}
      data-phase="settled"
      data-sequence={sequence}
    >
      <h2 className="sr-only" id={headingId}>One profile card, three treatments</h2>
      <PigmentField className="profile-stage__field" tone="cool" speed={0.55} intensity={0.85} />
      <div className="profile-stage__deck">
        <Button
          variant="ghost"
          data-flow="off"
          data-stable-hit=""
          data-profile-preview=""
          data-slot-position="lead"
          className="profile-stage__alternate"
          aria-label={`Show the ${alternates[0].label} treatment`}
          onClick={() => setTreatment(alternates[0].value)}
        ><QuietPreview treatment={alternates[0].value} /></Button>
        <div className="profile-live" data-profile-live="" data-treatment={treatment} ref={live}>
          <span className="profile-live__sheet" data-sheet="2" aria-hidden="true" hidden={treatment !== "stack"}><span>Work</span></span>
          <span className="profile-live__sheet" data-sheet="1" aria-hidden="true" hidden={treatment !== "stack"}><span>Notes</span></span>
          <div className="profile-live__surface">
            <span className="profile-live__paint" data-profile-part="surface" aria-hidden="true" />
            <span className="profile-live__fold" aria-hidden="true" hidden={treatment !== "fold"} />
            <Avatar
              variant={treatment === "classic" ? "default" : "olive"}
              size={treatment === "stack" ? "default" : "lg"}
              className="profile-live__face"
              data-profile-part="avatar"
            ><AvatarFallback>{person.initials}</AvatarFallback></Avatar>
            <div className="profile-live__identity" data-profile-part="identity">
              <h3 className="profile-live__name">{person.name}</h3>
              <p className="profile-live__role">{person.role}</p>
            </div>
            <p className="profile-live__bio" data-profile-part="bio">{person.bio}</p>
            <ul className="profile-live__tags" data-profile-part="tags" hidden={treatment === "classic"}>
              {person.tags.map(item => <li key={item}><Badge variant="cream">{item}</Badge></li>)}
            </ul>
            <div className="profile-live__actions" data-profile-part="actions">
              <Button className="profile-live__follow" aria-pressed={following} onClick={() => setFollowing(value => !value)}>
                {following ? "Following" : "Follow"}
              </Button>
              <Button variant="outline" aria-pressed={composing} aria-expanded={composing} aria-controls={fieldId} onClick={() => setComposing(value => !value)}>
                Message
              </Button>
              <Button variant="ghost" size="sm" className="profile-live__save" aria-label="Save profile" aria-pressed={saved} onClick={() => setSaved(value => !value)}>
                <Icon name={saved ? "check" : "bookmark"} />
              </Button>
            </div>
            <div className="profile-live__composer" id={fieldId} data-profile-composer="" hidden={!composing}>
              <Label htmlFor={`${fieldId}-note`}>Your note</Label>
              <div className="profile-live__composer-row">
                <Input
                  id={`${fieldId}-note`}
                  data-profile-note=""
                  value={draft}
                  placeholder="Something worth remembering"
                  onChange={event => setDraft(event.target.value)}
                  onKeyDown={event => { if (event.key === "Enter") { event.preventDefault(); keep(); } }}
                />
                <Button variant="secondary" disabled={!draft.trim()} onClick={keep}>Keep note</Button>
              </div>
              <ul className="profile-live__notes" data-profile-notes="" hidden={notes.length === 0}>
                {notes.map((note, index) => <li key={`${index}-${note}`}>{note}</li>)}
              </ul>
              <p className="profile-live__feedback" role="status">
                {notes.length > 0
                  ? `${notes.length} ${notes.length === 1 ? "note is" : "notes are"} listed above, kept on this page in this browser tab.`
                  : "A note you keep is listed here, on this page, in this browser tab."}
              </p>
            </div>
            <div className="profile-live__rail" data-profile-part="rail" hidden={treatment !== "classic"}>
              <ul>{person.interests.map(item => <li key={item}>{item}</li>)}</ul>
              <Button asChild variant="ghost" size="sm" className="profile-live__aside">
                <Link href="/work-with-me/">Always building something good <AnimatedIcon name="arrow-up-right" size="sm" /></Link>
              </Button>
            </div>
          </div>
        </div>
        <Button
          variant="ghost"
          data-flow="off"
          data-stable-hit=""
          data-profile-preview=""
          data-slot-position="trail"
          className="profile-stage__alternate"
          aria-label={`Show the ${alternates[1].label} treatment`}
          onClick={() => setTreatment(alternates[1].value)}
        ><QuietPreview treatment={alternates[1].value} /></Button>
      </div>
      <div className="profile-stage__toolbar">
        <div className="profile-stage__choices" role="group" aria-label="Profile card treatment">
          {treatments.map(item => <Button
            key={item.value}
            size="sm"
            variant={item.value === treatment ? "default" : "ghost"}
            aria-pressed={item.value === treatment}
            onClick={() => setTreatment(item.value)}
          >{item.label}</Button>)}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="profile-stage__replay"
          disabled={quiet}
          onClick={() => setSequence(value => value + 1)}
        ><AnimatedIcon name="refresh-cw" size="sm" /> Replay assembly</Button>
        <Meta className="profile-stage__aside-note">A local demo: Follow, Save and notes stay on this page.</Meta>
      </div>
    </section>
  );
}
