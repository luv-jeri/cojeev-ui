"use client";

import { AnimatedIcon, type AnimatedIconProps } from "@/registry/cojeev/ui/animated-icon";
import { Button } from "@/registry/cojeev/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/registry/cojeev/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/registry/cojeev/ui/tooltip";
import type { ReactNode } from "react";
import type { ReportKind } from "@/lib/reporting/contracts";

const icon = (name: AnimatedIconProps["name"], size = 18) => (
  <AnimatedIcon name={name} style={{ width: size, height: size }} aria-hidden="true" />
);

/** One toolbar tool: icon, a visible word on desktop, and the full name as label and tooltip. */
export function ReportTool({ label, word, icon, pressed, disabled, onClick }: {
  label: string; word: string; icon: ReactNode; pressed?: boolean; disabled?: boolean; onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="report-tool"
          aria-label={label}
          aria-pressed={pressed}
          disabled={disabled}
          onClick={onClick}
        >
          {icon}
          <span className="report-tool-label">{word}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function Line({ name, text }: { name: AnimatedIconProps["name"]; text: string }) {
  return (
    <li>
      {icon(name, 16)}
      <span>{text}</span>
    </li>
  );
}

/** The one place the rules and privacy text live; the form itself stays quiet. */
export function ReportInfo({ kind, beta }: { kind: ReportKind; beta: boolean }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="report-info" aria-label="How this works">
          {icon("info")}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="report-popover" aria-label="How this works" align="end" collisionPadding={12}>
        {kind === "request" && (
          <>
            <p>We aim to build requests within 36 hours, depending on demand and complexity.</p>
            <p>Your title is private until we approve it for the public board. Please keep personal details out of it.</p>
          </>
        )}
        <ul>
          <Line name="paperclip" text="Attach: add images or videos." />
          {kind === "bug" && (
            <>
              <Line name="pin" text="Pin: point at the part of the page you mean." />
              <Line name="crop" text="Area: screenshot part of the page." />
              <Line name="camera" text="Page: screenshot the whole page." />
              <Line name="settings" text="Details: add browser details." />
            </>
          )}
        </ul>
        <p>
          PNG, JPEG, WebP, MP4 or WebM. Up to 6 files, 10 MB each, 30 MB total. Screenshots are taken only when you ask,
          and you check each one first.
        </p>
        {kind === "bug" && (
          <div>
            <h3>Browser details</h3>
            <p>
              Adds device info, recent errors, failed routes and clicks. Never form values, cookies or storage. You can
              review and remove each group.
            </p>
          </div>
        )}
        <p>Your draft is saved on this device and stays here when you close this panel.</p>
        {beta && <p>Beta reports are stored separately. Email updates are limited to invited testers during this beta.</p>}
      </PopoverContent>
    </Popover>
  );
}
