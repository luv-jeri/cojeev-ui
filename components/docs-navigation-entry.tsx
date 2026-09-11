"use client";

import * as React from "react";
import Link from "next/link";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/registry/cojeev/ui/hover-card";
import { SidebarMenuButton, SidebarMenuLabel } from "@/registry/cojeev/ui/sidebar";
import { examples } from "@/components/examples";
import type { DocsLink } from "./docs-shell";

class PeekBoundary extends React.Component<React.PropsWithChildren, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? <p className="docs-peek-loading">Open the documentation to explore this example.</p> : this.props.children; }
}

export function DocsNavigationEntry({ entry, active, mobile, onNavigate }: { entry: DocsLink; active: boolean; mobile: boolean; onNavigate: () => void }) {
  const [open, setOpen] = React.useState(false);
  const [dismissed, setDismissed] = React.useState(false);
  const descriptionId = React.useId();
  const Example = examples[entry.name];
  // No example is mounted until intent is established. Inert content is a quick
  // visual introduction; the native link remains the only navigation action.
  return <HoverCard open={!mobile && !dismissed && open} onOpenChange={setOpen} openDelay={520} closeDelay={100}>
    <HoverCardTrigger asChild>
      <SidebarMenuButton asChild isActive={active}>
        <Link href={`/docs/${entry.name}/`} aria-label={entry.title} aria-describedby={open && !dismissed && !mobile ? descriptionId : undefined} data-component-link={entry.name}
          onClick={() => { setOpen(false); onNavigate(); }}
          onPointerLeave={() => setDismissed(false)} onBlur={() => setDismissed(false)}
          onKeyDown={event => { if (event.key === "Escape" && open) { event.preventDefault(); setDismissed(true); setOpen(false); } }}>
          <SidebarMenuLabel>{entry.title}</SidebarMenuLabel>
        </Link>
      </SidebarMenuButton>
    </HoverCardTrigger>
    {!mobile && open && !dismissed && <HoverCardContent side="right" align="start" sideOffset={18} collisionPadding={16} className="docs-component-peek" data-morph="none" aria-label={`${entry.title} quick look`} onEscapeKeyDown={() => setDismissed(true)}>
      <div className="docs-peek-stage" inert aria-hidden="true">
        <PeekBoundary key={entry.name}><React.Suspense fallback={<p className="docs-peek-loading">Preparing a quick look…</p>}>
          {Example && <div className="docs-peek-example" data-peek-example={entry.name}><Example variant={entry.previewVariant} compact /></div>}
        </React.Suspense></PeekBoundary>
      </div>
      <div className="docs-peek-caption"><span>{entry.category}</span><strong>{entry.title}</strong><p id={descriptionId}>{entry.description}</p><small>Open the component to try it ↗</small></div>
    </HoverCardContent>}
  </HoverCard>;
}
