"use client";

import { componentHandoffPacket } from "@/lib/component-handoff";
import { CopyButton } from "@/registry/sahajiv/ui/code-block";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/registry/sahajiv/ui/collapsible";
import { Button } from "@/registry/sahajiv/ui/button";
import { StateChevron } from "@/registry/sahajiv/ui/animated-icon";
import { ScrollArea } from "@/registry/sahajiv/ui/scroll-area";
import { BodySecondary, Title } from "@/registry/sahajiv/ui/typography";

/** An inline reading aid composed from the library's disclosure, copy and scroll controls. */
export function ComponentHandoff({ notes, code, variant, size }: { notes: string; code: string; variant: string; size: string }) {
  const packet = componentHandoffPacket(notes, code, variant, size);
  return <Collapsible className="docs-handoff">
    <div className="docs-handoff-bar">
      <div className="docs-handoff-intro">
        <Title as="h3">Take it with you</Title>
        <BodySecondary>Copy the example, API and usage notes for your editor or AI assistant.</BodySecondary>
      </div>
      <div className="docs-handoff-actions">
        <CopyButton code={packet} variant="secondary">Copy guide</CopyButton>
        <CollapsibleTrigger asChild><Button size="sm" variant="ghost">Read guide <StateChevron /></Button></CollapsibleTrigger>
      </div>
    </div>
    <CollapsibleContent>
      <ScrollArea className="docs-handoff-scroll" viewportProps={{ tabIndex: 0, "aria-label": "Component guide, select text to copy manually" }}>
        <pre className="docs-handoff-source">{packet}</pre>
      </ScrollArea>
    </CollapsibleContent>
  </Collapsible>;
}
