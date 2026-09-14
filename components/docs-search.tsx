"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useDocsSearch } from "fumadocs-core/search/client";
import { staticClient } from "fumadocs-core/search/client/orama-static";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/registry/cojeev/ui/dialog";
import { Command, CommandInput, CommandList, CommandGroup, CommandItem } from "@/registry/cojeev/ui/command";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { Shape } from "@/registry/cojeev/ui/shape";
import { useMorph } from "@/registry/cojeev/motion/use-morph";

const starts = [
  ["Icon library", "A whole vocabulary of expressive marks", "/docs/icon/", "sparkles"],
  ["Shape studio", "Make a signature shape your own", "/docs/shape/", "shapes"],
  ["Button", "Start with a little everyday motion", "/docs/button/", "mouse-pointer-2"],
  ["Calendar", "Single days, ranges and planning", "/docs/calendar/", "calendar"],
] as const;

function Highlight({ text }: { text: string }) {
  return <>{text.split(/(<mark>.*?<\/mark>)/g).map((part, index) => part.startsWith("<mark>") ? <mark key={index}>{part.slice(6, -7)}</mark> : <React.Fragment key={index}>{part}</React.Fragment>)}</>;
}

export function DocsSearch({ open, onOpenChange, searchUrl, onNavigate, onCloseAutoFocus }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchUrl: string;
  onNavigate: () => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const router = useRouter();
  const [attempt, setAttempt] = React.useState(0);
  const from = `${searchUrl}${attempt ? `?retry=${attempt}` : ""}`;
  const client = React.useMemo(() => staticClient({ from }), [from]);
  const { search, setSearch, query } = useDocsSearch({ client, delayMs: 120 }, [from]);
  const paint = useMorph<HTMLDivElement>("buttons");
  const input = React.useRef<HTMLInputElement>(null);
  const results = Array.isArray(query.data) ? query.data : [];
  const navigate = (url: string) => {
    if (!url.startsWith("/docs/")) return;
    onNavigate();
    onOpenChange(false);
    router.push(url);
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="docs-search-dialog" data-morph="none" onCloseAutoFocus={onCloseAutoFocus} onOpenAutoFocus={event => { event.preventDefault(); input.current?.focus(); }}>
      <div ref={paint} className="docs-search-paper" data-morph="fill" data-tier="pill" data-r="28" aria-hidden="true">
        <svg viewBox="0 0 600 460" preserveAspectRatio="none" className="docs-search-contours"><path d="M420 -30C470 90 640 10 640 160M450 -35C515 80 660 50 660 180" /></svg>
        <Shape name="star-4" className="docs-search-star" />
      </div>
      <div className="docs-search-heading">
        <div><DialogTitle>Explore Cojeev UI</DialogTitle><DialogDescription>Find a component, an idea, or a way to build it.</DialogDescription></div>
        <Button variant="ghost" size="sm" aria-label="Close search" onClick={() => onOpenChange(false)}><AnimatedIcon name="x" size="sm" /></Button>
      </div>
      <Command shouldFilter={false} className="docs-search-command" data-morph="none" label="Search documentation">
        <CommandInput ref={input} aria-label="Search documentation" placeholder="What would you like to make?" value={search} onValueChange={setSearch} trailing={<kbd>esc</kbd>} />
        <CommandList aria-busy={query.isLoading}>
          {!search.trim() ? <CommandGroup heading="A few places to begin">{starts.map(([title, detail, url, icon]) => <CommandItem key={url} value={url} adornment={{ icon, showBackground: false }} onSelect={() => navigate(url)}><span className="docs-search-result"><strong>{title}</strong><small>{detail}</small></span></CommandItem>)}</CommandGroup>
            : query.error ? <div className="docs-search-state" role="status"><strong>Search couldn’t load.</strong><p>Your page is still here. Try loading the local index again.</p><Button size="sm" variant="secondary" onClick={() => setAttempt(value => value + 1)}>Try again</Button></div>
            : query.isLoading ? <div className="docs-search-state" role="status">Finding your next building block…</div>
            : results.length ? <CommandGroup heading={`${results.length} result${results.length === 1 ? "" : "s"}`}>{results.map(result => <CommandItem key={result.id} value={result.id} adornment={{ icon: result.type === "page" ? "file-text" : "hash", showBackground: false }} onSelect={() => navigate(result.url)}><span className="docs-search-result"><strong><Highlight text={result.content} /></strong>{result.breadcrumbs?.length ? <small>{result.breadcrumbs.map(item => item.replace(/<\/?mark>/g, "")).join(" / ")}</small> : null}</span></CommandItem>)}</CommandGroup>
            : <div className="docs-search-state" role="status"><strong>No matches yet.</strong><p>Try a component name, like “slider”, or a behaviour, like “rubber”.</p></div>}
        </CommandList>
      </Command>
      <div className="docs-search-footer"><span><kbd>↑</kbd><kbd>↓</kbd> explore <kbd>↵</kbd> open</span><span>Search stays on your device</span></div>
    </DialogContent>
  </Dialog>;
}
