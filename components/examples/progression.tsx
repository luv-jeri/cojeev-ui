"use client";

import * as React from "react";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbBack,
  BreadcrumbEllipsis,
} from "@/registry/cojeev/ui/breadcrumb";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/registry/cojeev/ui/dropdown-menu";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import type { ExampleProps } from "./types";

export function BreadcrumbExample({ variant = "trail" }: ExampleProps) {
  const id = React.useId();
  const [depth, setDepth] = React.useState(3);
  const [notice, setNotice] = React.useState("");
  const title = React.useRef<HTMLHeadingElement>(null);
  const focusNext = React.useRef(false);
  const path = ["Library", "Projects", "Field notes", "Garden journal"];
  const presentation =
    variant === "pocket" || variant === "directory" ? variant : "trail";
  React.useEffect(() => {
    if (focusNext.current) {
      title.current?.focus();
      focusNext.current = false;
    }
  }, [depth]);
  const move = (index: number) => {
    if (index === depth) return;
    focusNext.current = true;
    setDepth(index);
    setNotice(`Opened ${path[index]} in this local folder preview.`);
  };
  const navigate = (
    event: React.MouseEvent<HTMLAnchorElement>,
    index: number,
  ) => {
    if (
      !event.defaultPrevented &&
      event.button === 0 &&
      !event.metaKey &&
      !event.ctrlKey &&
      !event.shiftKey &&
      !event.altKey
    ) {
      event.preventDefault();
      move(index);
    }
  };
  const ancestor = (index: number) => (
    <BreadcrumbLink
      href={`#${id}-folder-${index}`}
      onClick={(event) => navigate(event, index)}
    >
      {path[index]}
    </BreadcrumbLink>
  );
  return (
    <div className="v-breadcrumb-example">
      <header className="v-breadcrumb-example__eyebrow">
        <Icon name="folder" size="sm" />
        <span>A place for every idea</span>
      </header>
      <Breadcrumb presentation={presentation}>
        {presentation === "pocket" && (
          <BreadcrumbBack
            aria-label={`Go to ${path[Math.max(0, depth - 1)]}`}
            disabled={depth === 0}
            onClick={() => move(depth - 1)}
          />
        )}
        <BreadcrumbList>
          {presentation === "pocket" && depth > 1 && (
            <>
              <BreadcrumbItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="v-breadcrumb-overflow"
                      aria-label="Show ancestors"
                      data-stable-hit=""
                    >
                      <BreadcrumbEllipsis />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuLabel>Earlier in this path</DropdownMenuLabel>
                    {path.slice(0, depth - 1).map((label, index) => (
                      <DropdownMenuItem asChild key={label}>
                        <a
                          href={`#${id}-folder-${index}`}
                          onClick={(event) => navigate(event, index)}
                        >
                          {label}
                        </a>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
            </>
          )}
          {path.slice(0, depth + 1).map((label, index) => {
            if (presentation === "pocket" && index < depth - 1) return null;
            return (
              <React.Fragment key={label}>
                <BreadcrumbItem
                  id={`${id}-folder-${index}`}
                  style={{ "--crumb-depth": index } as React.CSSProperties}
                >
                  {index > 0 &&
                    (presentation !== "pocket" || index === depth) && (
                      <BreadcrumbSeparator asChild>
                        <span>
                          <Icon name="chevron-right" size="sm" />
                        </span>
                      </BreadcrumbSeparator>
                    )}
                  {index === depth ? (
                    <BreadcrumbPage>
                      <Icon name="file-text" size="sm" />
                      {label}
                    </BreadcrumbPage>
                  ) : (
                    ancestor(index)
                  )}
                </BreadcrumbItem>
              </React.Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
      <section className="v-breadcrumb-example__document">
        <div>
          <p>Currently open</p>
          <h3 tabIndex={-1} ref={title}>
            {path[depth]}
          </h3>
          <p>
            {depth === 3
              ? "A few observations, gathered in one small place."
              : "Follow the path above to move through this collection."}
          </p>
        </div>
        <span className="v-breadcrumb-example__folio" aria-hidden="true">
          {String(depth + 1).padStart(2, "0")}
          <span>/ 04</span>
        </span>
      </section>
      <footer className="v-breadcrumb-example__footer">
        {presentation === "directory" && (
          <Button
            variant="outline"
            disabled={depth === 0}
            aria-label={`Go to ${path[Math.max(0, depth - 1)]}`}
            onClick={() => move(depth - 1)}
            data-stable-hit=""
          >
            <Icon name="arrow-left" size="sm" />
            Parent folder
          </Button>
        )}
        <Button variant="ghost" onClick={() => move(3)} disabled={depth === 3}>
          Reset path
        </Button>
        <p role="status">
          {notice || "Ancestor links navigate this local preview."}
        </p>
      </footer>
    </div>
  );
}
