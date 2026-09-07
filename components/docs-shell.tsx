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
import { Meta, Title } from "@/registry/sahajiv/ui/typography";
import { Shape } from "@/registry/sahajiv/ui/shape";
import { ThemeControl } from "@/components/theme-control";
import { DocsMotion } from "@/components/docs-motion";
export type DocsLink = { name: string; title: string; baseComponent: boolean };
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
  React.useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [open]);
  const filtered = entries.filter((entry) =>
    `${entry.title} ${entry.name}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="docs-shell">
      <a className="docs-skip" href="#docs-main">
        Skip to content
      </a>
      <header className="docs-mobile">
        <Title as="span">SahaJiv UI</Title>
        <div className="docs-mobile-actions">
        <DocsMotion />
        <Button
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
            <Shape name="star-4" style={{ width: 28, height: 28 }} />
            SahaJiv UI
          </Link>
        </SidebarHeader>
        <div className="docs-filter">
          <Label htmlFor={queryId} size="sm">
            Find a component
          </Label>
          <Input
            id={queryId}
            size="sm"
            type="search"
            placeholder="Search components…"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <SidebarContent
          aria-label="Component documentation"
          className="docs-navigation"
        >
          {[true, false].map((base) => (
            <React.Fragment key={String(base)}>
              <SidebarGroupLabel>
                {base
                  ? `Components · ${entries.filter((e) => e.baseComponent).length}`
                  : "Shared helpers"}
              </SidebarGroupLabel>
              {filtered
                .filter((e) => e.baseComponent === base)
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
          {!filtered.length && (
            <Meta role="status">No matching components.</Meta>
          )}
        </SidebarContent>
        <SidebarFooter>
          <DocsMotion className="docs-motion-launch" />
          <ThemeControl />
          <Meta>Made for everyday work.</Meta>
        </SidebarFooter>
      </Sidebar>
      <div id="docs-main" className="docs-main" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
