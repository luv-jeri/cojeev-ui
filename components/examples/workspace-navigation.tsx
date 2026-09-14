"use client";
import * as React from "react";
import {
  Sidebar,
  SidebarHeader,
  SidebarTrigger,
  SidebarContent,
  SidebarMenuButton,
  SidebarMenuLabel,
  SidebarGroupLabel,
  SidebarFooter,
  SidebarMenuBadge,
} from "@/registry/cojeev/ui/sidebar";
import { MotionDrawer } from "@/registry/cojeev/ui/motion-drawer";
import { ScrollArea } from "@/registry/cojeev/ui/scroll-area";
import { Input } from "@/registry/cojeev/ui/input";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import type { ExampleProps } from "./types";

export function SidebarExample({ variant = "folio" }: ExampleProps) {
  const appearance =
    variant === "index" || variant === "drawer" ? variant : "folio";
  const [open, setOpen] = React.useState(true),
    [drawerOpen, setDrawerOpen] = React.useState(false),
    [active, setActive] = React.useState("Notes"),
    [draft, setDraft] = React.useState("Leave a little space for an idea."),
    [long, setLong] = React.useState(false);
  const entries = [
    { name: "Notes", icon: "file-text", count: 12 },
    { name: "Ideas", icon: "sparkles", count: 8 },
    { name: "Archive", icon: "archive", count: 24 },
    ...(long
      ? Array.from({ length: 12 }, (_, i) => ({
          name: `Chapter ${String(i + 1).padStart(2, "0")}`,
          icon: "book-open",
          count: i + 1,
        }))
      : []),
  ] as const;
  const navigation = (
    <SidebarContent aria-label="Your notebook destinations" data-flow="off">
      <SidebarGroupLabel>Your space</SidebarGroupLabel>
      {entries.map((entry) => (
        <SidebarMenuButton
          key={entry.name}
          asChild
          isActive={active === entry.name}
          label={entry.name}
        >
          <button
            type="button"
            onClick={() => {
              setActive(entry.name);
              if (appearance === "drawer") setDrawerOpen(false);
            }}
          >
            <Icon
              name={entry.icon as React.ComponentProps<typeof Icon>["name"]}
            />
            <SidebarMenuLabel>{entry.name}</SidebarMenuLabel>
            <SidebarMenuBadge data-morph="none" aria-hidden="true">
              {entry.count}
            </SidebarMenuBadge>
          </button>
        </SidebarMenuButton>
      ))}
    </SidebarContent>
  );
  const rail = (
    <Sidebar
      appearance={appearance}
      open={appearance === "drawer" ? true : open}
      onOpenChange={setOpen}
      data-morph={appearance === "drawer" ? "none" : "both"}
    >
      {appearance !== "drawer" && (
        <SidebarHeader>
          <span className="v-sidebar-example__seal" aria-hidden="true">
            <Icon name="book-open" style={{ color: "inherit" }} />
          </span>
          <SidebarMenuLabel>
            {appearance === "index" ? "Index" : "Notebook"}
          </SidebarMenuLabel>
          <SidebarTrigger />
        </SidebarHeader>
      )}
      {appearance === "drawer" ? (
        navigation
      ) : (
        <ScrollArea
          variant="plain"
          className="v-sidebar-example__scroll"
          aria-label="Notebook index"
          scrollbarSize={6}
        >
          {navigation}
        </ScrollArea>
      )}
      <SidebarFooter>
        <p>A place for useful little things.</p>
        <Button variant="ghost" size="sm" onClick={() => setLong((v) => !v)}>
          {long ? "Short index" : "Full index"}
          <Icon name={long ? "chevron-up" : "chevron-down"} />
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
  return (
    <section
      className="v-sidebar-example"
      data-appearance={appearance}
      aria-label="Notebook workspace example"
    >
      <header>
        <span>A QUIET PLACE TO BEGIN</span>
        <h3>Everything has its place.</h3>
        <p>
          Folio gives the notebook room. Index keeps it close. Drawer brings it
          forward when you need it.
        </p>
      </header>
      <div className="v-sidebar-example__stage">
        {appearance !== "drawer" && rail}
        <article>
          {appearance === "drawer" && (
            <MotionDrawer
              title="Your notebook"
              description="Choose a destination. Your draft stays where you left it."
              width={320}
              variant="floating"
              side="start"
              open={drawerOpen}
              onOpenChange={setDrawerOpen}
              buttonOpeningVariants="stay"
              triggerLabel="Open notebook navigation"
            >
              {rail}
            </MotionDrawer>
          )}
          <div className="v-sidebar-example__canvas">
            <span>LOCAL WORKSPACE PREVIEW</span>
            <h4>{active}</h4>
            <p>
              {active === "Ideas"
                ? "Catch the thought before it gets away."
                : active === "Archive"
                  ? "Good work, ready to return to."
                  : "Keep a little room for what comes next."}
            </p>
            <label className="v-sidebar-example__draft">
              Workspace draft
              <Input
                aria-label="Workspace draft"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                appearance="editorial"
              />
            </label>
          </div>
        </article>
      </div>
      <p role="status">
        Current destination: {active}. Draft retained locally in this example.
      </p>
    </section>
  );
}
