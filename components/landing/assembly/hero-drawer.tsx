"use client";
import * as React from "react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/registry/cojeev/ui/card";
import { Badge } from "@/registry/cojeev/ui/badge";
import { Button } from "@/registry/cojeev/ui/button";
import { heroPointer, type DrawerId } from "./hero-interaction";

export default function HeroDrawer({
  id,
  close,
}: {
  id: DrawerId;
  close: () => void;
}) {
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const [saved, setSaved] = React.useState(false);
  React.useEffect(() => {
    closeRef.current?.focus({ preventScroll: true });
    const reveal = requestAnimationFrame(() => {
      if (window.innerWidth >= 900) return;
      const stage = document
        .querySelector(".asm-hero-space")
        ?.getBoundingClientRect();
      const node = closeRef.current?.closest<HTMLElement>(
        ".asm-drawer-preview",
      );
      if (!stage || !node) return;
      const top = stage.bottom + window.scrollY;
      document
        .querySelector<HTMLElement>(".asm")
        ?.style.setProperty("--hero-preview-top", `${top}px`);
      const y = Math.max(
        0,
        Math.round(top + node.offsetHeight - window.innerHeight + 90),
      );
      if (Math.abs(window.scrollY - y) > 1 || window.scrollX !== 0) {
        heroPointer.revealY = y;
        window.scrollTo({ top: y, left: 0, behavior: "instant" });
      }
    });
    return () => cancelAnimationFrame(reveal);
  }, []);
  const component =
    id === "layout" ? "card" : id === "content" ? "badge" : "button";
  return (
    <section
      className="asm-drawer-preview"
      role="region"
      aria-labelledby="asm-drawer-title"
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.stopPropagation();
          close();
        }
      }}
    >
      <header>
        <div>
          <p>Make it yours</p>
          <h2 id="asm-drawer-title">
            {id === "layout"
              ? "A place for your next idea."
              : id === "content"
                ? "Small words. Big character."
                : "Give your idea a little push."}
          </h2>
        </div>
        <button
          ref={closeRef}
          type="button"
          onClick={close}
          aria-label="Close component preview"
        >
          ×
        </button>
      </header>
      <div className="asm-drawer-demo">
        {id === "layout" ? (
          <Card variant="cream" size="sm">
            <CardHeader>
              <CardDescription>ON THE DRAWING BOARD</CardDescription>
              <CardTitle>Something good starts here.</CardTitle>
            </CardHeader>
            <CardContent>
              A little structure. Plenty of room to play.
            </CardContent>
          </Card>
        ) : id === "content" ? (
          <div className="asm-badge-demo">
            <Badge variant="pink">A new idea</Badge>
            <Badge variant="olive">Ready to grow</Badge>
            <Badge variant="blue">Made by you</Badge>
          </div>
        ) : (
          <div className="asm-button-demo">
            <Button variant="accent" onClick={() => setSaved(!saved)}>
              {saved ? "Nice one. ✓" : "Make something ↗"}
            </Button>
            <Button variant="outline" onClick={() => setSaved(false)}>
              Start again
            </Button>
            <span role="status">
              {saved ? "Your idea has its first click." : "Try a real button."}
            </span>
          </div>
        )}
      </div>
      <Link href={`/docs/${component}/`}>
        Explore{" "}
        {component === "card"
          ? "Card"
          : component === "badge"
            ? "Badge"
            : "Button"}{" "}
        <span aria-hidden="true">↗</span>
      </Link>
    </section>
  );
}
