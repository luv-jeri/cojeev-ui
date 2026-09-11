"use client";
import * as React from "react";
import type { ExampleProps } from "./types";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
  AvatarWrapper,
  AvatarEdit,
  AvatarGroup,
  AvatarHex,
  AvatarHexGroup,
} from "@/registry/cojeev/ui/avatar";
import { Badge, BadgeIndicator } from "@/registry/cojeev/ui/badge";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import { Input } from "@/registry/cojeev/ui/input";
import { Field, FieldLabel, FieldControl } from "@/registry/cojeev/ui/field";

const people = [
  { name: "Mira Sen", role: "Design" },
  { name: "Dev Patel", role: "Engineering" },
  { name: "Ira Shah", role: "Research" },
  { name: "Noor Ali", role: "Writing" },
];
function initials(name: string) {
  return (
    name
      .trim()
      .split(/\s+/)
      .map((word) => word[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "?"
  );
}
function portrait(index: number) {
  const colors = [
    ["#F2D9D3", "#A2BFCC", "#EDB4C4"],
    ["#DEE6CC", "#E3BE67", "#AAC7D8"],
    ["#DBE4EF", "#DCB2C3", "#BAA586"],
  ][index % 3];
  return (
    "data:image/svg+xml," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="0 0 160 160"><rect width="160" height="160" fill="${colors[0]}"/><path d="M-20 166C4 60 73 154 181 40L180 180Z" fill="${colors[1]}"/><path d="M34 90C0 59 49 27 85 42C102 8 140 33 127 76C165 92 141 144 105 123C77 164 30 139 34 90Z" fill="${colors[2]}"/><path d="M43 113C67 75 102 101 121 60" fill="none" stroke="#292D32" stroke-width="2"/><circle cx="52" cy="48" r="6" fill="#292D32"/></svg>`,
    )
  );
}

export function AvatarExample({
  variant = "portrait",
  size = "lg",
  compact = false,
  avatarShape = "circle",
  avatarAccent = "pink",
}: ExampleProps) {
  const layout =
    variant === "identity" || variant === "participants" ? variant : "portrait";
  const [name, setName] = React.useState("Mira Sen"),
    [art, setArt] = React.useState(0),
    [image, setImage] = React.useState(true),
    [expanded, setExpanded] = React.useState(false),
    [profile, setProfile] = React.useState(false);
  const rosterId = React.useId(),
    profileId = React.useId();
  const roster = people.map((person, index) =>
    index === 0 ? { ...person, name } : person,
  );
  const avatar = (person: string, index: number, small = false) => (
    <Avatar
      variant={avatarAccent}
      shape={avatarShape}
      className={
        !small && size === "default"
          ? "v-identity-example__avatar-medium"
          : undefined
      }
      size={
        small
          ? "default"
          : size === "lg"
            ? "lg"
            : size === "sm"
              ? "sm"
              : "default"
      }
      role="img"
      aria-label={person}
    >
      {image && <AvatarImage alt="" src={portrait(art + index)} />}
      <AvatarFallback>{initials(person)}</AvatarFallback>
    </Avatar>
  );
  const editable = (
    <AvatarWrapper data-edit-placement={size === "sm" ? "beside" : "badge"}>
      {avatar(name, 0)}
      <AvatarEdit
        aria-label="Change artwork"
        onClick={() => {
          setArt((n) => n + 1);
          setImage(true);
        }}
      >
        <Icon name="refresh" aria-hidden="true" />
      </AvatarEdit>
    </AvatarWrapper>
  );
  const copy = (
    <div className="v-identity-example__copy">
      <span className="v-identity-example__eyebrow">
        Studio member · Design
      </span>
      <strong className="v-identity-example__name">
        {name || "Your name"}
      </strong>
      <p>Making everyday things feel considered.</p>
    </div>
  );
  return (
    <section className="v-identity-example" aria-label="Identity example">
      <div className="v-identity-example__surface">
        {layout === "portrait" ? (
          <div className="v-identity-example__portrait">
            <span className="v-identity-example__eyebrow">
              A little face for your work
            </span>
            <div className="v-identity-example__art">{editable}</div>
            {copy}
          </div>
        ) : layout === "identity" ? (
          <>
            <div className="v-identity-example__row">
              {editable}
              {copy}
            </div>
            <div className="v-identity-example__detail">
              <Button
                variant="ghost"
                size="sm"
                aria-expanded={profile}
                aria-controls={profileId}
                onClick={() => setProfile((value) => !value)}
              >
                {profile ? "Hide profile" : "View profile"}
                <Icon name="chevron-down" aria-hidden="true" />
              </Button>
              {profile && (
                <p id={profileId}>
                  A sample profile for {name || "this member"}. Interested in
                  typography, small interactions and quieter interfaces. This
                  detail stays local to the example.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="v-identity-example__participants">
            <div className="v-identity-example__copy">
              <span className="v-identity-example__eyebrow">
                Shared notebook · 04 people
              </span>
              <strong className="v-identity-example__name">
                Good work has company.
              </strong>
              <p>{name || "You"}, Dev, Ira and Noor are in this example.</p>
            </div>
            <AvatarGroup aria-label="Participant portraits">
              {roster.slice(0, 3).map((person, index) => (
                <React.Fragment key={index}>
                  {avatar(person.name, index)}
                </React.Fragment>
              ))}
            </AvatarGroup>
            <Button
              variant="secondary"
              size="sm"
              style={{ justifySelf: "start" }}
              aria-expanded={expanded}
              aria-controls={rosterId}
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Hide participants" : "Show all participants"}
              <Icon name="chevron-down" aria-hidden="true" />
            </Button>
            {expanded && (
              <ul
                className="v-identity-example__roster"
                id={rosterId}
                aria-label="Participants"
              >
                {roster.map((person, index) => (
                  <li key={index}>
                    {avatar(person.name, index, true)}
                    <span>
                      <strong>{person.name || "Your name"}</strong>
                      <small>{person.role}</small>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <div className="v-identity-example__controls">
        <Field>
          <FieldLabel>Display name</FieldLabel>
          <FieldControl>
            <Input
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </FieldControl>
        </Field>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setImage((value) => !value)}
        >
          {image ? "Show initials" : "Show artwork"}
        </Button>
      </div>
      <p className="v-identity-example__eyebrow" role="status">
        Local preview ·{" "}
        {image ? `Artwork ${(art % 3) + 1}` : "Initials fallback"}
      </p>
      {!compact && (
        <div className="v-identity-example__copy">
          <span className="v-identity-example__eyebrow">
            Also included · square and hexagon primitives
          </span>
          <div className="v-identity-example__legacy">
            <Avatar variant="square" aria-label="Square avatar">
              <AvatarFallback>MS</AvatarFallback>
            </Avatar>
            <AvatarHexGroup
              aria-label="Hexagonal group"
              style={{ "--c": "var(--v-blue)" } as React.CSSProperties}
            >
              <AvatarHex>DP</AvatarHex>
              <AvatarHex>IS</AvatarHex>
              <AvatarHex>NA</AvatarHex>
            </AvatarHexGroup>
            <small>Shape and accent are independent controls above.</small>
          </div>
        </div>
      )}
    </section>
  );
}

export function BadgeExample({
  variant = "stamp",
  size = "default",
  compact = false,
  badgeTreatment = "pink",
}: ExampleProps) {
  const layout = variant === "tag" || variant === "counter" ? variant : "stamp";
  const [ready, setReady] = React.useState(false),
    [count, setCount] = React.useState(3);
  const status = ready ? "Ready for review" : "Draft in progress";
  const badgeSize = size === "sm" || size === "lg" ? size : "default";
  const statusBadge = (
    <Badge appearance={layout} variant={badgeTreatment} size={badgeSize}>
      <Icon name={ready ? "check" : "sparkles"} size="sm" aria-hidden="true" />
      {status}
    </Badge>
  );
  return (
    <section className="v-badge-example" aria-label="Badge example">
      <article className="v-badge-example__surface" data-layout={layout}>
        <div className="v-badge-example__kicker">
          <span>Field notes</span>
          <span>No. 024</span>
        </div>
        {layout === "counter" ? (
          <>
            <div className="v-badge-example__counter" style={{ marginTop: 24 }}>
              <h3>Little observations</h3>
              <Badge
                appearance="counter"
                variant={badgeTreatment}
                size={badgeSize}
                aria-label={`${count} local notes`}
              >
                <span data-badge-count="">{count}</span>
              </Badge>
            </div>
            <p>A growing collection of small things worth noticing.</p>
            {statusBadge}
          </>
        ) : (
          <>
            <h3>Little observations</h3>
            <p>A growing collection of small things worth noticing.</p>
            {layout === "stamp" ? (
              <div className="v-badge-example__stamp">
                <div className="v-badge-example__meta">
                  <span>Notebook status</span>
                  <strong>
                    <span data-badge-count="">{count}</span> local notes
                  </strong>
                </div>
                {statusBadge}
              </div>
            ) : (
              <dl className="v-badge-example__tags">
                <div>
                  <dt>Collection</dt>
                  <dd>
                    <Badge appearance="tag" variant="cream" size={badgeSize}>
                      Studio journal
                    </Badge>
                  </dd>
                </div>
                <div>
                  <dt>Status</dt>
                  <dd>{statusBadge}</dd>
                </div>
                <div>
                  <dt>Contents</dt>
                  <dd>
                    <span data-badge-count="">{count}</span> local notes
                  </dd>
                </div>
              </dl>
            )}
          </>
        )}
      </article>
      <div className="v-badge-example__actions">
        <Button
          variant="secondary"
          size="sm"
          onClick={() => setReady((value) => !value)}
        >
          {ready ? "Return to draft" : "Mark ready"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCount((value) => value + 1)}
        >
          Add a local note
        </Button>
      </div>
      <span className="v-badge-example__eyebrow" role="status">
        {status} · {count} notes in this preview
      </span>
      {!compact && (
        <div className="v-badge-example__copy">
          <span className="v-badge-example__eyebrow">
            Original treatments · still available
          </span>
          <div className="v-badge-example__treatments">
            {(
              [
                "default",
                "pending",
                "count",
                "dashed",
                "caps",
                "test",
                "live",
              ] as const
            ).map((treatment) => (
              <Badge key={treatment} variant={treatment}>
                {["pending", "live"].includes(treatment) && <BadgeIndicator />}
                {treatment === "count" ? "3" : treatment}
              </Badge>
            ))}
          </div>
          <small>
            Choose an accent above. Status is written in text, never colour
            alone.
          </small>
        </div>
      )}
    </section>
  );
}
