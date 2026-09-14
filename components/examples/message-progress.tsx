"use client";
import * as React from "react";
import type { ExampleProps } from "./types";
import {
  Alert,
  AlertIcon,
  AlertKicker,
  AlertBody,
  AlertTitle,
  AlertDescription,
  AlertActions,
  AlertClose,
} from "@/registry/cojeev/ui/alert";
import {
  Progress,
  type ProgressAppearance,
} from "@/registry/cojeev/ui/progress";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";

const messages = {
  default: {
    icon: "info",
    title: "Keep a little context",
    text: "A useful note has a title, a thought and a place to return to.",
    kicker: "A small reminder",
  },
  info: {
    icon: "info",
    title: "Your workspace is ready",
    text: "Three local notes are available to explore. Pick up a thought where you left it.",
    kicker: "For your attention",
  },
  ok: {
    icon: "check",
    title: "Three notes, safely kept",
    text: "This local sample is ready to review. Nothing has been sent or shared.",
    kicker: "All in place",
  },
  warn: {
    icon: "alert",
    title: "Keep a second copy",
    text: "Local notes stay on this device. Remember to export a copy before moving your work.",
    kicker: "Worth remembering",
  },
  danger: {
    icon: "alert",
    title: "Give the next step a little care",
    text: "A destructive action should explain what will be lost and offer a safe way back.",
    kicker: "Error-message example",
  },
  pink: {
    icon: "sparkles",
    title: "Make room for the next idea",
    text: "There is a good starting point in these three notes. Follow the one that catches your attention.",
    kicker: "An open invitation",
  },
} as const;

export function AlertExample({
  variant = "note",
  alertTone = "info",
}: ExampleProps) {
  const presentation =
    variant === "banner" || variant === "dispatch" ? variant : "note";
  const tone = Object.hasOwn(messages, variant)
    ? (variant as keyof typeof messages)
    : alertTone;
  const message = messages[tone];
  const [visible, setVisible] = React.useState(true),
    [reviewed, setReviewed] = React.useState(false);
  const restore = React.useRef<HTMLButtonElement>(null),
    panel = React.useRef<HTMLDivElement>(null),
    notes = React.useRef<HTMLDivElement>(null);
  const pendingFocus = React.useRef<"restore" | "panel" | "notes" | null>(null);
  React.useLayoutEffect(() => {
    const target = pendingFocus.current;
    pendingFocus.current = null;
    if (target)
      (target === "restore"
        ? restore.current
        : target === "panel"
          ? panel.current
          : notes.current
      )?.focus({ preventScroll: true });
  }, [visible, reviewed]);
  return (
    <div className="v-message-example">
      {visible ? (
        <Alert
          ref={panel}
          tabIndex={-1}
          presentation={presentation}
          variant={tone}
          role={tone === "danger" ? "alert" : "status"}
        >
          <AlertIcon>
            <Icon name={message.icon} />
          </AlertIcon>
          <AlertBody>
            <AlertKicker>{message.kicker}</AlertKicker>
            <AlertTitle>{message.title}</AlertTitle>
            <AlertDescription>{message.text}</AlertDescription>
            <AlertActions>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  if (reviewed) notes.current?.focus({ preventScroll: true });
                  else {
                    pendingFocus.current = "notes";
                    setReviewed(true);
                  }
                }}
              >
                Review notes
                <Icon name="arrow-right" />
              </Button>
            </AlertActions>
          </AlertBody>
          <AlertClose
            onClick={() => {
              pendingFocus.current = "restore";
              setVisible(false);
            }}
          >
            <Icon name="close" />
          </AlertClose>
        </Alert>
      ) : (
        <div className="v-message-example__restored">
          <p>Message dismissed. Your notes are still here.</p>
          <Button
            ref={restore}
            variant="secondary"
            onClick={() => {
              pendingFocus.current = "panel";
              setVisible(true);
            }}
          >
            Show alert again
            <Icon name="refresh" />
          </Button>
        </div>
      )}
      {reviewed && (
        <div
          ref={notes}
          role="region"
          aria-label="Local notes"
          tabIndex={-1}
          className="v-message-example__notes"
        >
          <h4>Three thoughts to pick up</h4>
          <ul>
            {[
              "A question worth following",
              "The shape of a quieter morning",
              "One small thing to try",
            ].map((note, index) => (
              <li key={note}>
                <span>0{index + 1}</span>
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="v-message-example__hint">
        Local message preview. Status changes the meaning; Approach changes how
        it sits in the page.
      </p>
    </div>
  );
}

export function ProgressExample({
  variant = "inline",
  size = "default",
  progressAppearance = "auto",
  progressSurface = "default",
}: ExampleProps) {
  const presentation =
    variant === "report" || variant === "milestones" ? variant : "inline";
  const [value, setValue] = React.useState(45),
    [unavailable, setUnavailable] = React.useState(false);
  const unknown = unavailable || variant === "unavail";
  const legacy = ["organic", "line", "segmented", "orbit"].includes(variant)
    ? (variant as ProgressAppearance)
    : undefined;
  const appearance =
    progressAppearance !== "auto"
      ? progressAppearance
      : (legacy ??
        (presentation === "report"
          ? "orbit"
          : presentation === "milestones"
            ? "segmented"
            : "organic"));
  const done = Math.floor(value / 5),
    total = 20;
  const meter = (
    <Progress
      value={unknown ? null : value}
      appearance={appearance}
      segments={20}
      size={size === "sm" || size === "lg" ? size : "default"}
      variant={
        variant === "cream" || progressSurface === "cream" ? "cream" : "default"
      }
      aria-label="Example progress"
      aria-valuetext={
        unknown
          ? "Measurement unavailable"
          : `${value}% complete; ${done} of ${total} sample notes indexed`
      }
    />
  );
  return (
    <div
      className="v-progress-example"
      data-presentation={presentation}
      data-appearance={appearance}
    >
      <div className="v-progress-example__paper">
        <header className="v-progress-example__heading">
          <span>THE LITTLE INDEX</span>
          <span>
            {unknown ? "Awaiting a measurement" : "A measured amount"}
          </span>
        </header>
        <div className="v-progress-example__summary">
          <div>
            <h3>Putting thoughts in order.</h3>
            <p>
              {unknown
                ? "The amount completed is unknown, not zero."
                : `${done} of ${total} sample notes indexed.`}
            </p>
          </div>
          {appearance !== "orbit" && (
            <output className="v-progress-example__value" aria-hidden="true">
              {unknown ? "—" : `${value}%`}
            </output>
          )}
        </div>
        <div className="v-progress-example__meter">{meter}</div>
        {presentation === "report" && (
          <div className="v-progress-example__totals">
            <div>
              <strong>{unknown ? "—" : done}</strong>
              <span>in their place</span>
            </div>
            <div>
              <strong>{unknown ? "—" : total - done}</strong>
              <span>still to go</span>
            </div>
          </div>
        )}
        {presentation === "milestones" && (
          <ol className="v-progress-example__milestones">
            {["Gather", "Read", "Connect", "Keep"].map((label, index) => {
              const end = (index + 1) * 25,
                status = unknown
                  ? "Unknown"
                  : value >= end
                    ? "Complete"
                    : value >= index * 25
                      ? "In progress"
                      : "Next";
              return (
                <li
                  key={label}
                  data-state={status.toLowerCase().replaceAll(" ", "-")}
                >
                  <span
                    className="v-progress-example__checkpoint"
                    aria-hidden="true"
                  >
                    {status === "Complete" ? (
                      <Icon name="check" />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <span>
                    <strong>{label}</strong>
                    <small>
                      {status} · {index * 25}–{end}%
                    </small>
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
      <div className="v-progress-example__controls">
        <div>
          <Button
            size="sm"
            variant="outline"
            disabled={unknown || value === 0}
            onClick={() => setValue((v) => Math.max(0, v - 10))}
          >
            Decrease
          </Button>
          <Button
            size="sm"
            variant="secondary"
            disabled={unknown || value === 100}
            onClick={() => setValue((v) => Math.min(100, v + 10))}
          >
            Increase
          </Button>
          <Button
            size="sm"
            variant="ghost"
            disabled={unknown}
            onClick={() => setValue((v) => (v === 100 ? 0 : 100))}
          >
            {value === 100 ? "Reset" : "Complete"}
          </Button>
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setUnavailable((v) => !v)}
        >
          {unavailable ? "Restore measurement" : "Make unavailable"}
        </Button>
      </div>
      <p className="v-progress-example__hint">
        Sample data, changed by you. Track shape changes the drawing; the amount
        stays the same.
      </p>
    </div>
  );
}
