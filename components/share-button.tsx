"use client";

import * as React from "react";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { Button, type ButtonProps } from "@/registry/cojeev/ui/button";
import { Meta } from "@/registry/cojeev/ui/typography";
import { sanitizeRoute, track } from "@/lib/analytics/client";
import { copyText, shareLink, shareOrCopy, type ShareOutcome } from "@/lib/share";

type State = "idle" | "working" | "copied" | "failed";

export function ShareButton({
  iconOnly = false,
  variant = "ghost",
  size = "sm",
  shape = "pill",
  className,
  ...props
}: Omit<ButtonProps, "onClick"> & { iconOnly?: boolean }) {
  const [state, setState] = React.useState<State>("idle");
  const busy = React.useRef(false);
  const statusId = React.useId();

  const onClick = async (event: React.MouseEvent<HTMLButtonElement>) => {
    const trigger = event.currentTarget;
    if (busy.current) return;
    busy.current = true;
    setState("working");
    let outcome: ShareOutcome = "failed";
    try {
      const nav = navigator;
      outcome = await shareOrCopy(
        {
          share: typeof nav.share === "function" ? (data) => nav.share(data) : undefined,
          canShare: typeof nav.canShare === "function" ? (data) => nav.canShare(data) : undefined,
          copy: (text) => copyText(text, trigger),
        },
        shareLink(window.location),
        document.title,
      );
    } catch {
      // Sharing must never break the page.
    }
    busy.current = false;
    const route = sanitizeRoute(window.location.pathname);
    if (route && (outcome === "shared" || outcome === "copied")) {
      track("page_shared", { route, method: outcome === "shared" ? "share_sheet" : "copy_link" });
    }
    if (outcome === "copied" || outcome === "failed") {
      setState(outcome === "copied" ? "copied" : "failed");
    } else {
      setState("idle");
    }
  };

  const icon =
    state === "copied" ? "check" : state === "failed" ? "triangle-alert" : state === "working" ? "loader-circle" : "share-2";
  const label = state === "copied" ? "Link copied" : state === "failed" ? "Copy failed" : "Share";
  return (
    <>
      <Button
        {...props}
        type="button"
        variant={variant}
        size={size}
        shape={shape}
        className={`share-button relative ${className ?? ""}`}
        data-share-state={state}
        loadingIndicator={<React.Fragment />}
        aria-label="Share this page"
        aria-disabled={state === "working" || undefined}
        aria-busy={state === "working" || undefined}
        aria-describedby={statusId}
        onClick={onClick}
      >
        <AnimatedIcon name={icon} size="sm" aria-hidden="true" />
        {iconOnly ? null : <span className="share-label">{label}</span>}
        {state === "copied" && <span aria-hidden="true" className="share-feedback hidden absolute top-full end-0 mt-[var(--s-2)] px-[var(--s-3)] py-[var(--s-2)] rounded-[var(--r-sm)] bg-[var(--v-paper)] text-[color:var(--v-text)] text-[length:var(--fs-small)]">Link copied</span>}
      </Button>
      <Meta as="span" id={statusId} role="status" aria-live="polite" className="sr-only" data-share-state={state}>
        {state === "copied" ? "Link copied." : state === "failed" ? "Copy unavailable. Copy the address from the browser bar." : ""}
      </Meta>
    </>
  );
}
