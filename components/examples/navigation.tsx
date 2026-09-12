"use client";
import * as React from "react";
import { Pagination } from "@/registry/cojeev/ui/pagination";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/registry/cojeev/ui/tabs";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import {
  NavigationMenu,
  NavigationMenuList,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuTrigger,
  NavigationMenuContent,
  NavigationMenuViewport,
} from "@/registry/cojeev/ui/navigation-menu";
import type { ExampleProps } from "./types";

export function NavigationMenuExample({ variant = "directory" }: ExampleProps) {
  const [collection, setCollection] = React.useState("Notes");
  const resultId = React.useId();
  const appearance =
    variant === "shelf" || variant === "compact" ? variant : "directory";
  const groups = [
    {
      name: "Collections",
      icon: "notebook",
      heading: "Keep a thought close",
      description:
        "A place for the things you notice, imagine and want to revisit.",
      items: [
        { name: "Notes", detail: "Small observations, worth keeping" },
        { name: "Ideas", detail: "Possibilities still taking shape" },
        { name: "Reading", detail: "Follow a thread that interests you" },
      ],
    },
    {
      name: "Resources",
      icon: "compass",
      heading: "Find your next direction",
      description:
        "A starting point, a repeatable practice, or a useful example.",
      items: [
        {
          name: "Getting started",
          detail: "A short introduction to the notebook",
        },
        { name: "Templates", detail: "Begin with a useful structure" },
        { name: "Field guide", detail: "Make room for a daily practice" },
      ],
    },
  ];
  const destinations = (items: (typeof groups)[number]["items"]) =>
    items.map((item) => (
      <NavigationMenuLink
        key={item.name}
        href={`#${resultId}`}
        adornmentId={item.name}
        active={collection === item.name}
        onClick={() => setCollection(item.name)}
      >
        <span className="v-nav__destination">
          <span>{item.name}</span>
          {appearance !== "compact" && <small>{item.detail}</small>}
        </span>
      </NavigationMenuLink>
    ));
  return (
    <div className="v-navigation-example">
      <NavigationMenu
        appearance={appearance}
        orientation={appearance === "directory" ? "vertical" : "horizontal"}
        aria-label="Notebook navigation"
      >
        <NavigationMenuList>
          {groups.map((group) => (
            <NavigationMenuItem key={group.name} value={group.name}>
              {appearance === "directory" ? (
                <>
                  <div className="v-nav__directory-heading">
                    {group.name}
                    <small>{group.items.length} places</small>
                  </div>
                  {destinations(group.items)}
                </>
              ) : (
                <>
                  <NavigationMenuTrigger adornment={false}>
                    {group.name}
                  </NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <div
                      className={
                        appearance === "shelf"
                          ? "v-nav__shelf-content"
                          : "v-nav__compact-content"
                      }
                    >
                      {appearance === "shelf" ? (
                        <div className="v-nav__feature">
                          <Icon name={group.icon} aria-hidden="true" />
                          <div>
                            <strong>{group.heading}</strong>
                            <p>{group.description}</p>
                          </div>
                        </div>
                      ) : (
                        <p>{group.heading}</p>
                      )}
                      <div>{destinations(group.items)}</div>
                    </div>
                  </NavigationMenuContent>
                </>
              )}
            </NavigationMenuItem>
          ))}
        </NavigationMenuList>
        {appearance !== "directory" && <NavigationMenuViewport />}
      </NavigationMenu>
      <div className="v-navigation-example__result" id={resultId} role="status">
        <strong>Collection: {collection}</strong>
        <p>
          Local demonstration · each destination updates this notebook view.
        </p>
      </div>
    </div>
  );
}

export function TabsExample({ variant = "notebook" }: ExampleProps) {
  const [selected, setSelected] = React.useState("notes");
  const [saved, setSaved] = React.useState<string[]>([]);
  const appearance = [
    "notebook",
    "rail",
    "underline",
    "lenses",
    "pills",
  ].includes(variant)
    ? (variant as "notebook" | "rail" | "underline" | "lenses" | "pills")
    : "pills";
  const sections = [
    {
      id: "notes",
      label: "Notes",
      title: "12 useful notes",
      description:
        "Little things you wanted to remember. Keep a thought close for the next time you need it.",
      icon: "notebook",
      count: 12,
    },
    {
      id: "ideas",
      label: "Ideas",
      title: "8 ideas taking shape",
      description:
        "A question, a sketch, a possible next step. Give curiosity somewhere to land.",
      icon: "sparkles",
      count: 8,
    },
    {
      id: "reading",
      label: "Reading",
      title: "4 things to read",
      description:
        "Follow a thread that interests you. Save this collection for a quieter moment.",
      icon: "book-open",
      count: 4,
    },
  ];
  return (
    <Tabs
      value={selected}
      onValueChange={setSelected}
      variant={appearance}
      orientation={appearance === "rail" ? "vertical" : "horizontal"}
    >
      <TabsList aria-label="Notebook sections">
        {sections.map((section) => (
          <TabsTrigger
            key={section.id}
            value={section.id}
            aria-label={section.label}
          >
            {appearance === "rail" && (
              <Icon name={section.icon} size="sm" aria-hidden="true" />
            )}
            <span>{section.label}</span>
            {appearance === "notebook" && (
              <span className="v-tabs__count" aria-hidden="true">
                {String(section.count).padStart(2, "0")}
              </span>
            )}
          </TabsTrigger>
        ))}
      </TabsList>
      {sections.map((section) => (
        <TabsContent key={section.id} value={section.id}>
          <div className="v-tabs__story">
            <small>Field notebook / {section.label}</small>
            <h3>{section.title}</h3>
            <p>{section.description}</p>
            <Button
              variant="outline"
              onClick={() =>
                setSaved((items) =>
                  items.includes(section.id)
                    ? items.filter((id) => id !== section.id)
                    : [...items, section.id],
                )
              }
            >
              {saved.includes(section.id)
                ? "Collection saved"
                : "Save collection"}
            </Button>
          </div>
        </TabsContent>
      ))}
    </Tabs>
  );
}

export function PaginationExample({ variant = "pages" }: ExampleProps) {
  const [page, setPage] = React.useState(1);
  const appearance =
    variant === "chapter" || variant === "jump" ? variant : "pages";
  return (
    <div className="v-pager__example">
      <div className="v-pager__specimen">
        <small>Field notebook · 120 notes</small>
        <h3>Notebook page {page}</h3>
        <p>
          Showing notes {(page - 1) * 10 + 1}–{page * 10} of 120.
        </p>
      </div>
      <Pagination
        appearance={appearance}
        page={page}
        totalPages={12}
        onPageChange={setPage}
      />
    </div>
  );
}
