"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarMenuButton,
  SidebarFooter,
} from "@/registry/cojeev/ui/sidebar";
import { Button } from "@/registry/cojeev/ui/button";
import { BrandMark } from "@/components/brand/brand-mark";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { ScrollArea } from "@/registry/cojeev/ui/scroll-area";
import { DocsThemeSync, ThemeControl } from "@/components/theme-control";
import { groupDocsEntries } from "@/lib/docs-navigation";
import { DocsNavigationEntry } from "@/components/docs-navigation-entry";
import { DocsMotion } from "@/components/docs-motion";
import { DocsAtmosphere } from "@/components/docs-atmosphere";
import { DocsSearch } from "@/components/docs-search";
import { MotionDrawer } from "@/registry/cojeev/ui/motion-drawer";
import { useChoreography } from "@/registry/cojeev/motion/choreography";
import { useMorph } from "@/registry/cojeev/motion/use-morph";
import { BetaStamp } from "@/components/brand/beta-stamp";

/** Animate the paper, never the navigation's layout or pointer targets. */
function NavigationSurface() {
  const ref = useMorph<HTMLDivElement>("buttons");
  return (
    <div
      ref={ref}
      data-slot="navigation-surface"
      data-morph="fill"
      data-tier="pill"
      data-r="24"
      className="docs-navigation-surface"
      aria-hidden="true"
    >
      <div className="docs-navigation-art" />
    </div>
  );
}
export type DocsLink = {
  name: string;
  title: string;
  baseComponent: boolean;
  category: string;
  description: string;
  previewVariant: string;
};
function readNavigationPreference() {
  try { return localStorage.getItem("cojeev-docs-navigation") !== "collapsed"; } catch { return true; }
}
function subscribeNavigationPreference(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

export function DocsShell({
  entries,
  searchUrl = "/cojeev-ui/docs-search.json",
  children,
}: {
  entries: DocsLink[];
  searchUrl?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname()?.replace(/\/$/, "");
  const { quiet } = useChoreography();
  const [searchOpen, setSearchOpen] = React.useState(false);
  const searchOpenRef = React.useRef(false);
  const searchOrigin = React.useRef<HTMLElement | null>(null);
  const searchSelected = React.useRef(false);
  const [open, setOpen] = React.useState(false);
  const storedExpanded = React.useSyncExternalStore(subscribeNavigationPreference, readNavigationPreference, () => true);
  const [localExpanded, setExpanded] = React.useState<boolean | null>(null);
  const expanded = localExpanded ?? storedExpanded;
  const [compactIndexOpen, setCompactIndexOpen] = React.useState(false);
  const [mobile, setMobile] = React.useState(false);
  const compact = !mobile && !expanded;
  const groups = React.useMemo(() => groupDocsEntries(entries), [entries]);
  const routeSelected = React.useRef(false);
  const browseRef = React.useRef<HTMLButtonElement>(null);
  const compactIndexRef = React.useRef<HTMLButtonElement>(null);
  const changeSearchOpen = React.useCallback((next: boolean) => {
    searchOpenRef.current = next;
    setSearchOpen(next);
  }, []);
  const launchSearch = React.useCallback(() => {
    searchOrigin.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    searchSelected.current = false;
    changeSearchOpen(true);
    setOpen(false);
  }, [changeSearchOpen, setOpen]);
  React.useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.defaultPrevented || !(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== "k") return;
      event.preventDefault();
      if (searchOpenRef.current) changeSearchOpen(false);
      else launchSearch();
    };
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, [launchSearch, changeSearchOpen]);
  React.useEffect(() => {
    const media = matchMedia("(max-width: 900px)");
    const update = () => {
      setMobile(media.matches);
      if (!media.matches) setOpen(false);
    };
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const changeExpanded = (next: boolean) => {
    setExpanded(next);
    setCompactIndexOpen(false);
    try {
      localStorage.setItem(
        "cojeev-docs-navigation",
        next ? "expanded" : "collapsed",
      );
    } catch {}
  };
  const selectRoute = () => {
    routeSelected.current = mobile && open;
    setOpen(false);
  };
  const settings = <div className="docs-navigation-settings" aria-label="Display settings"><ThemeControl compact navigation /><DocsMotion label="Motion" className="docs-motion-launch" /></div>;
  const invitations = <div className="docs-persistent-links">
    <Button asChild variant="accent" shape="card" size="sm" className="docs-work-invitation"><Link href="/work-with-me/" aria-label="Work with me"><span>Work with me</span><AnimatedIcon name="arrow-up-right" size="sm" /></Link></Button>
    <Button asChild variant="ghost" size="sm" className="docs-github-invitation"><Link href="https://github.com/luv-jeri/cojeev-ui" aria-label="GitHub"><AnimatedIcon name="github" size="sm" />GitHub</Link></Button>
  </div>;
  const navigation = (
    <Sidebar
      id="docs-navigation"
      className={`docs-sidebar${mobile ? " docs-mobile-index" : ""}`}
      data-morph="none"
      data-compact-index={compact && compactIndexOpen ? "open" : "closed"}
      open={mobile || expanded}
      onKeyDown={(event) => {
        // React portal events bubble here too; let a settings overlay own Escape.
        if (compact && compactIndexOpen && event.key === "Escape" && !event.defaultPrevented && event.currentTarget.contains(event.target as Node)) {
          event.preventDefault();
          setCompactIndexOpen(false);
          compactIndexRef.current?.focus({ preventScroll: true });
        }
      }}
    >
      {!mobile && <NavigationSurface />}
      {!mobile && (
        <div className="docs-rail-heading">
          <Link href="/docs/" className="docs-brand" aria-label="000h by Cojeev">
            <span className="docs-brand-seal">
              <BrandMark className="docs-brand-mark" />
            </span>
            {expanded && <span className="docs-brand-name">000h <small>by Cojeev</small></span>}
          </Link>
          {expanded && <BetaStamp />}
          <Button
            size="sm"
            variant="ghost"
            className="docs-navigation-expand"
            title={expanded ? "Collapse navigation" : "Expand navigation"}
            aria-label={expanded ? "Collapse navigation" : "Expand navigation"}
            aria-controls="docs-index-content"
            aria-expanded={expanded}
            onClick={() => changeExpanded(!expanded)}
          >
            <AnimatedIcon
              name={expanded ? "chevron-left" : "arrow-right"}
              size="sm"
            />
          </Button>
        </div>
      )}
      {/* A collapsed rail hides the heading stamp, which is the state with the least beta context. */}
      {compact && <BetaStamp className="docs-rail-beta" />}
      <div className="docs-search-row">
        <Button
          size="sm"
          variant="ghost"
          shape="card"
          className="docs-search-launch"
          aria-label="Search components"
          onClick={launchSearch}
        >
          <AnimatedIcon name="search" size="sm" />
          <span className="docs-search-label">{compact ? "Search" : "Search library"}</span>
          {!compact && <kbd>⌘ K</kbd>}
        </Button>
      </div>
      {compact && settings}
      <div
        id="docs-index-content"
        className="docs-index-content"
        hidden={compact && !compactIndexOpen}
      >
        <ScrollArea
          className="docs-navigation-scroll"
          scrollbarSize={6}
          viewportClassName="docs-navigation-viewport"
          type="auto"
        >
          <SidebarContent
            aria-label="Component documentation"
            className="docs-navigation"
          >
              <div className="docs-overview-link">
                <SidebarMenuButton
                  asChild
                  isActive={pathname?.endsWith("/docs")}
                >
                  <Link href="/docs/" onClick={selectRoute}>
                    Getting started
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton
                  asChild
                  isActive={pathname?.endsWith("/docs/reference-guide")}
                >
                  <Link href="/docs/reference-guide/" onClick={selectRoute}>
                    Reference effects
                  </Link>
                </SidebarMenuButton>
                <SidebarMenuButton asChild isActive={pathname?.endsWith("/requests")}><Link href="/requests/" onClick={selectRoute}>Request board</Link></SidebarMenuButton>
              </div>
            {groups.map(group => <details className="docs-library-group" open key={group.name}>
              <summary aria-label={`${group.name}, ${group.entries.length} components`}><span>{group.name}</span><small>{group.entries.length}</small><AnimatedIcon name="chevron-down" preset="none" size="sm" /></summary>
              <div>{group.entries.map(entry => <DocsNavigationEntry key={entry.name} entry={entry} active={!!pathname?.endsWith(`/docs/${entry.name}`)} mobile={mobile} onNavigate={selectRoute} />)}</div>
            </details>)}
          </SidebarContent>
        </ScrollArea>
      </div>
      {compact && <Button
        ref={compactIndexRef}
        size="sm"
        variant="secondary"
        className="docs-compact-disclosure"
        aria-label={compactIndexOpen ? "Hide compact component index" : "Show compact component index"}
        aria-controls="docs-index-content"
        aria-expanded={compactIndexOpen}
        onClick={() => setCompactIndexOpen(value => !value)}
      >
        <span>{compactIndexOpen ? "Fold index" : "Components"}</span>
        <span className="docs-compact-disclosure-arrow" aria-hidden="true">
          <AnimatedIcon name="chevron-down" preset="none" size="sm" />
        </span>
      </Button>}
      <SidebarFooter className="docs-navigation-footer">
        {!compact && settings}
        {invitations}
      </SidebarFooter>
    </Sidebar>
  );
  return (
    <div
      className="docs-shell"
      data-navigation={expanded ? "expanded" : "collapsed"}
      data-navigation-motion={quiet ? "off" : "on"}
    >
      <DocsThemeSync />
      <DocsSearch open={searchOpen} onOpenChange={changeSearchOpen} searchUrl={searchUrl} onNavigate={() => { searchSelected.current = true; }} onCloseAutoFocus={event => {
        event.preventDefault();
        if (searchSelected.current) document.getElementById("docs-main")?.focus({ preventScroll: true });
        else if (searchOrigin.current?.isConnected && searchOrigin.current.getClientRects().length) searchOrigin.current.focus({ preventScroll: true });
        else browseRef.current?.focus({ preventScroll: true });
      }} />
      <DocsAtmosphere />
      <a className="docs-skip" href="#docs-main">
        Skip to content
      </a>
      <header className="docs-mobile">
        <Link href="/" className="docs-brand">
          <BrandMark className="docs-brand-mark" />
          000h by Cojeev
        </Link>
        <BetaStamp />
        <div className="docs-mobile-actions">
          <Link
            href="https://github.com/luv-jeri/cojeev-ui"
            className="docs-source-icon"
            aria-label="000h by Cojeev on GitHub"
          >
            <AnimatedIcon name="github" />
          </Link>
          <MotionDrawer
            title="Browse components"
            width={340}
            open={open}
            onOpenChange={setOpen}
            buttonOpeningVariants="stay"
            enableDrag={false}
            onCloseAutoFocus={(event) => {
              event.preventDefault();
              if (searchOpenRef.current) return;
              if (routeSelected.current) {
                document
                  .getElementById("docs-main")
                  ?.focus({ preventScroll: true });
                routeSelected.current = false;
              } else if (matchMedia("(max-width: 900px)").matches)
                browseRef.current?.focus({ preventScroll: true });
              else
                document
                  .querySelector<HTMLButtonElement>(".docs-rail-heading button")
                  ?.focus({ preventScroll: true });
            }}
            trigger={
              <Button
                ref={browseRef}
                size="sm"
                variant="secondary"
                aria-expanded={open}
                aria-controls="docs-navigation"
              >
                <AnimatedIcon
                  name={open ? "x" : "menu"}
                  size="sm"
                  aria-hidden="true"
                />
                Browse
              </Button>
            }
          >
            {mobile && (
              <div className="docs-shell docs-drawer-index">{navigation}</div>
            )}
          </MotionDrawer>
        </div>
      </header>
      {!mobile && navigation}
      <div id="docs-main" className="docs-main" tabIndex={-1}>
        {children}
      </div>
    </div>
  );
}
