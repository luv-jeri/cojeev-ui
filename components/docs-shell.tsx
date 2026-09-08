"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroupLabel,
  SidebarMenuButton,
  SidebarMenuLabel,
  SidebarFooter,
} from "@/registry/sahajiv/ui/sidebar";
import { Button } from "@/registry/sahajiv/ui/button";
import { Input } from "@/registry/sahajiv/ui/input";
import { Label } from "@/registry/sahajiv/ui/label";
import { Meta } from "@/registry/sahajiv/ui/typography";
import { Shape } from "@/registry/sahajiv/ui/shape";
import { AnimatedIcon } from "@/registry/sahajiv/ui/animated-icon";
import { ScrollArea } from "@/registry/sahajiv/ui/scroll-area";
import { ThemeControl } from "@/components/theme-control";
import { categories } from "@/lib/categories";
import { DocsMotion } from "@/components/docs-motion";
export type DocsLink = { name: string; title: string; baseComponent: boolean; category: string };
export function DocsShell({
  entries,
  children,
}: {
  entries: DocsLink[];
  children: React.ReactNode;
}) {
  const pathname = usePathname()?.replace(/\/$/, "");
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const queryId = React.useId();
  const browseRef = React.useRef<HTMLButtonElement>(null);
  const searchRef = React.useRef<HTMLInputElement>(null);
  React.useEffect(() => {
    if (!open) return;
    searchRef.current?.focus({ preventScroll: true });
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !event.defaultPrevented) {
        setOpen(false);
        browseRef.current?.focus({ preventScroll: true });
      }
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  const filtered = entries.filter((entry) =>
    `${entry.title} ${entry.name}`.toLowerCase().includes(query.trim().toLowerCase()),
  );
  return (
    <div className="docs-shell">
      <a className="docs-skip" href="#docs-main">
        Skip to content
      </a>
      <header className="docs-mobile">
        <Link href="/" className="docs-brand">
          <Shape name="star-4" className="docs-brand-mark" />
          SahaJiv UI
        </Link>
        <div className="docs-mobile-actions">
          <Link href="https://github.com/luv-jeri/sahajiv-ui" className="docs-source-icon" aria-label="SahaJiv UI on GitHub"><AnimatedIcon name="github" /></Link>
          <Button
            ref={browseRef}
            size="sm"
            variant="secondary"
            aria-expanded={open}
            aria-controls="docs-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? "Close menu" : "Browse"}
          </Button>
        </div>
      </header>
      <Sidebar
        id="docs-navigation"
        className="docs-sidebar"
        data-mobile-open={open}
      >
        <SidebarHeader>
          <Link href="/" className="docs-brand">
            <Shape name="star-4" className="docs-brand-mark" />
            SahaJiv UI
          </Link>
          <Meta>Components for everyday work.</Meta>
          <div className="docs-brand-links"><Link href="https://github.com/luv-jeri/sahajiv-ui"><AnimatedIcon name="github" /> GitHub</Link><Link href="/work-with-me/">Work with me <AnimatedIcon name="arrow-up-right" /></Link></div>
        </SidebarHeader>
        <div className="docs-filter">
          <Label htmlFor={queryId} size="sm">
            Find a component
          </Label>
          <Input
            ref={searchRef}
            id={queryId}
            size="sm"
            type="search"
            placeholder="Search components…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <ScrollArea
          className="docs-navigation-scroll"
          viewportClassName="docs-navigation-viewport"
          type="always"
        >
          <SidebarContent
            aria-label="Component documentation"
            className="docs-navigation"
          >
            {!query.trim() && <div className="docs-overview-link">
              <SidebarMenuButton asChild isActive={pathname?.endsWith("/docs")}>
                <Link href="/docs/" aria-current={pathname?.endsWith("/docs") ? "page" : undefined} onClick={() => setOpen(false)}>Getting started</Link>
              </SidebarMenuButton>
              <SidebarMenuButton asChild isActive={pathname?.endsWith("/docs/reference-guide")}>
                <Link href="/docs/reference-guide/" aria-current={pathname?.endsWith("/docs/reference-guide") ? "page" : undefined} onClick={() => setOpen(false)}>Reference effects</Link>
              </SidebarMenuButton>
            </div>}
            {categories.filter((category) => filtered.some((entry) => entry.category === category)).map((category) => (
              <React.Fragment key={category}>
                <SidebarGroupLabel>
                  {category}
                </SidebarGroupLabel>
                {filtered
                  .filter((e) => e.category === category)
                  .map((entry) => (
                    <SidebarMenuButton
                      key={entry.name}
                      asChild
                      isActive={pathname?.endsWith(`/docs/${entry.name}`)}
                    >
                      <Link
                        href={`/docs/${entry.name}`}
                        aria-current={pathname?.endsWith(`/docs/${entry.name}`) ? "page" : undefined}
                        onClick={() => setOpen(false)}
                      >
                        <SidebarMenuLabel>{entry.title}</SidebarMenuLabel>
                      </Link>
                    </SidebarMenuButton>
                  ))}
              </React.Fragment>
            ))}
            {query.trim() && (
              <div className="docs-filter-result">
                <Meta role="status">{filtered.length ? `${filtered.length} matching component${filtered.length === 1 ? "" : "s"}.` : "No matching components."}</Meta>
                <Button size="sm" variant="ghost" onClick={() => { setQuery(""); searchRef.current?.focus(); }}>Clear search</Button>
              </div>
            )}
          </SidebarContent>
        </ScrollArea>
        <SidebarFooter>
          <DocsMotion className="docs-motion-launch" />
          <ThemeControl />
          <div className="docs-footer-links">
            <Link href="https://github.com/luv-jeri/sahajiv-ui">
              <AnimatedIcon name="github" /> Source on GitHub
            </Link>
            <Meta as="span">MIT</Meta>
          </div>
        </SidebarFooter>
      </Sidebar>
      <div id="docs-main" className="docs-main" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
