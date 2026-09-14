"use client";

import { componentHandoffPacket } from "@/lib/component-handoff";
import { CopyButton } from "@/registry/cojeev/ui/code-block";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/registry/cojeev/ui/collapsible";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon, StateChevron } from "@/registry/cojeev/ui/animated-icon";
import { ScrollArea } from "@/registry/cojeev/ui/scroll-area";
import { BodySecondary, Title } from "@/registry/cojeev/ui/typography";
import { sanitizeRoute, track } from "@/lib/analytics/client";

/** An inline reading aid composed from the library's disclosure, copy and scroll controls. */
export function ComponentHandoff({ notes, code, variant, size, componentId }: { notes: string; code: string; variant: string; size: string; componentId?: string }) {
  const packet = componentHandoffPacket(notes, code, variant, size);
  return <Collapsible className="docs-handoff">
    <div className="docs-handoff-bar">
      <div className="docs-handoff-intro">
        <Title as="h3">Take it with you</Title>
        <BodySecondary>Copy the example, API and usage notes for your editor or AI assistant.</BodySecondary>
      </div>
      <div className="docs-handoff-actions">
        <CopyButton
          code={packet}
          variant="secondary"
          onCopyResult={(result) => {
            if (!componentId) return;
            const route = sanitizeRoute(window.location.pathname);
            if (!route) return;
            if (result === "success") {
              track("guide_copied", { component_id: componentId, route });
            } else {
              track("copy_failed", { component_id: componentId, route, copy_kind: "guide" });
            }
          }}
        >
          Copy guide
        </CopyButton>
        <CollapsibleTrigger asChild><Button size="sm" variant="ghost"><AnimatedIcon name="book-open" size="sm" aria-hidden="true" />Read guide <StateChevron /></Button></CollapsibleTrigger>
      </div>
    </div>
    <CollapsibleContent>
      <ScrollArea className="docs-handoff-scroll" viewportProps={{ tabIndex: 0, "aria-label": "Component guide, select text to copy manually" }}>
        <pre className="docs-handoff-source">{packet}</pre>
      </ScrollArea>
    </CollapsibleContent>
  </Collapsible>;
}
