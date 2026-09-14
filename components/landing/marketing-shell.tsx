"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { Shape } from "@/registry/cojeev/ui/shape";
import { Button } from "@/registry/cojeev/ui/button";
import { SidebarMenuButton } from "@/registry/cojeev/ui/sidebar";
import { Meta } from "@/registry/cojeev/ui/typography";
import { DocsThemeSync, ThemeControl } from "@/components/theme-control";
import { DocsMotion } from "@/components/docs-motion";
import { MotionPresence, MotionSurface } from "@/registry/cojeev/ui/presence";
import { site } from "@/lib/site-config";
import { BrandMark } from "@/components/brand/brand-mark";
import { BetaStamp } from "@/components/brand/beta-stamp";

export const sourceUrl = site.sourceUrl;
export const creatorUrl = site.creatorUrl;

export function MarketingLink({ href, children, primary = false, className = "" }: {
  href: string; children: React.ReactNode; primary?: boolean; className?: string;
}) {
  return <SidebarMenuButton asChild className={`story-link ${primary ? "story-link-primary" : ""} ${className}`}>
    <Link href={href}>{children}</Link>
  </SidebarMenuButton>;
}

export function MarketingHeader() {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const trigger = React.useRef<HTMLButtonElement>(null);
  const panel = React.useRef<HTMLElement>(null);
  const openedWithKeyboard = React.useRef(false);
  const id = React.useId();
  React.useEffect(() => {
    if (!open) return;
    if (openedWithKeyboard.current) panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [open]);
  return <>
    <DocsThemeSync />
    <a className="story-skip" href="#story-main">Skip to content</a>
    <header className="story-header">
      <Link className="story-brand" href="/" aria-label="000h by Cojeev home"><span className="launch-wordmark" aria-hidden="true"><BrandMark className="launch-wordmark__seed" /><span>00h</span></span><span className="story-brand-ui" aria-hidden="true">by Cojeev</span></Link>
      <BetaStamp />
      <nav className="story-nav" aria-label="Main navigation">
        <MarketingLink href="/docs/">Components</MarketingLink>
        <MarketingLink href="/getting-started/">Get started</MarketingLink>
        <SidebarMenuButton asChild className="story-link" isActive={pathname?.includes("about") || pathname?.includes("work-with-me")}><Link href="/about/" onClick={() => setOpen(false)}>About the maker</Link></SidebarMenuButton>
      </nav>
      <div className="story-header-tools">
        <MarketingLink href={sourceUrl} className="story-github"><AnimatedIcon name="github" /><span>GitHub</span></MarketingLink>
        <ThemeControl compact />
        <Button className="story-menu-trigger" variant="secondary" size="sm" ref={trigger} aria-controls={id} aria-expanded={open} onClick={event => { openedWithKeyboard.current = event.detail === 0; setOpen(!open); }} aria-label={open ? "Close navigation" : "Open navigation"}><AnimatedIcon name={open ? "x" : "menu"} /></Button>
      </div>
      <MotionPresence>{open && <MotionSurface asChild key="mobile-navigation" preset="rise">
        <nav ref={panel} id={id} className="story-mobile-nav" aria-label="Main navigation" onClick={event => { if ((event.target as HTMLElement).closest("a")) setOpen(false); }}>
          <MarketingLink href="/docs/">Components</MarketingLink>
          <MarketingLink href="/getting-started/">Get started</MarketingLink>
          <MarketingLink href="/about/">About the maker</MarketingLink>
          <MarketingLink href={sourceUrl}><AnimatedIcon name="github" />GitHub</MarketingLink>
        </nav>
      </MotionSurface>}</MotionPresence>
    </header>
  </>;
}

export function MarketingFooter({ compact = false }: { compact?: boolean }) {
  return <footer className="story-footer">
    {!compact && <div className="story-footer-wordmark" aria-hidden="true">Make it feel <em>human.</em><Shape name="aster-9" /></div>}
    <div className="story-footer-row"><Meta>000h by Cojeev · Made by Sanjay Kumar · MIT licensed</Meta>
      <div className="story-footer-links"><MarketingLink href="/about/">About the maker</MarketingLink><MarketingLink href="/privacy/">Privacy</MarketingLink><MarketingLink href="/requests/">Suggest a component</MarketingLink><MarketingLink href={sourceUrl}><AnimatedIcon name="github" /> Source</MarketingLink><DocsMotion className="story-motion-control" /></div>
    </div>
  </footer>;
}
