"use client";

import * as React from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavigation,
  CarouselPrevious,
  CarouselNext,
  CarouselDots,
  CarouselDot,
} from "@/registry/cojeev/ui/carousel";
import {
  ShapeArtwork,
  type ShapeArtworkTone,
} from "@/registry/cojeev/ui/shape-artwork";
import {
  ShapeMorph,
  type SignatureShapeName,
} from "@/registry/cojeev/ui/shape";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import type { ExampleProps } from "./types";

type Note = {
  title: string;
  detail: string;
  prompt: string;
  shape: SignatureShapeName;
  alternate: SignatureShapeName;
  tone: ShapeArtworkTone;
};
const notes: Note[] = [
  {
    title: "Make space",
    detail: "A little breathing room can change the shape of a day.",
    prompt: "Leave one small part of the page empty. See what wants to arrive.",
    shape: "cushion",
    alternate: "clover-soft",
    tone: "pink",
  },
  {
    title: "Follow a thread",
    detail: "One useful connection is worth keeping close.",
    prompt:
      "Link a new thought to something you already know. Let the line lead somewhere.",
    shape: "ribbon-soft",
    alternate: "seed-wing",
    tone: "blue",
  },
  {
    title: "Keep the useful bits",
    detail: "Not everything needs to stay. Keep what makes a difference.",
    prompt:
      "Collect three details you might otherwise forget. Give each a reason to return.",
    shape: "scalloped-square",
    alternate: "cushion",
    tone: "yellow",
  },
  {
    title: "Try something small",
    detail: "A first version is a place to start, not a promise to finish.",
    prompt:
      "Choose a tiny experiment. Make it simple enough to try before tomorrow.",
    shape: "seed-wing",
    alternate: "petal-7",
    tone: "olive",
  },
];
function NoteCard({
  note,
  index,
  saved,
  onSave,
}: {
  note: Note;
  index: number;
  saved: boolean;
  onSave: () => void;
}) {
  const [engaged, setEngaged] = React.useState(false);
  return (
    <article
      className="v-carousel-note"
      data-tone={note.tone}
      onPointerEnter={(event) => {
        if (event.pointerType !== "touch") setEngaged(true);
      }}
      onPointerLeave={() => setEngaged(false)}
      onFocusCapture={() => setEngaged(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setEngaged(false);
      }}
    >
      <div className="v-carousel-note__art" aria-hidden="true">
        <span className="v-carousel-note__edition">
          FIELD NOTE / 0{index + 1}
        </span>
        <span className="v-carousel-note__orbit" />
        <ShapeArtwork
          name={engaged ? note.alternate : note.shape}
          tone={note.tone}
          rotation={engaged ? 8 : -6}
          shadow={false}
          echo
          echoAngle={12}
        />
      </div>
      <div className="v-carousel-note__body">
        <div>
          <p className="v-carousel-note__kicker">A thought to take with you</p>
          <h3>{note.title}</h3>
          <p>{note.detail}</p>
          <p className="v-carousel-note__prompt">{note.prompt}</p>
        </div>
        <Button
          variant={saved ? "secondary" : "outline"}
          aria-label={`${saved ? "Unsave" : "Save"} ${note.title}`}
          aria-pressed={saved}
          onClick={onSave}
          data-stable-hit=""
        >
          <Icon name={saved ? "check" : "bookmark"} size="sm" />
          <span>{saved ? "Kept" : "Keep this idea"}</span>
        </Button>
      </div>
    </article>
  );
}
export function CarouselExample({ variant = "shelf" }: ExampleProps) {
  const presentation =
    variant === "story" || variant === "index" ? variant : "shelf";
  const [index, setIndex] = React.useState(0),
    [saved, setSaved] = React.useState<number[]>([]);
  return (
    <Carousel
      presentation={presentation}
      aria-label="Field notes to keep"
      className="v-carousel-example"
      onIndexChange={setIndex}
    >
      <header className="v-carousel-example__intro">
        <div>
          <p>The little collection</p>
          <h3>Ideas worth a second look.</h3>
        </div>
        <span aria-hidden="true">
          0{index + 1}
          <small>/ 04</small>
        </span>
      </header>
      <CarouselContent scrollbar aria-label="Field note slides">
        {notes.map((note, position) => (
          <CarouselItem
            key={note.title}
            aria-label={`${position + 1} of ${notes.length}: ${note.title}`}
          >
            <NoteCard
              note={note}
              index={position}
              saved={saved.includes(position)}
              onSave={() =>
                setSaved((current) =>
                  current.includes(position)
                    ? current.filter((item) => item !== position)
                    : [...current, position],
                )
              }
            />
          </CarouselItem>
        ))}
      </CarouselContent>
      <CarouselNavigation>
        <CarouselDots aria-label="Choose an idea">
          {presentation === "index"
            ? notes.map((note, position) => (
                <CarouselDot
                  key={note.title}
                  index={position}
                  className="v-carousel-example__thumbnail"
                >
                  <ShapeMorph
                    name={note.shape}
                    style={{ color: `var(--v-${note.tone})` }}
                  />
                  <span>{note.title}</span>
                </CarouselDot>
              ))
            : undefined}
        </CarouselDots>
        <CarouselPrevious />
        <CarouselNext />
      </CarouselNavigation>
      <footer className="v-carousel-example__footer">
        <p>Swipe, scroll sideways or use the arrows.</p>
        <p role="status">
          Idea {index + 1} of {notes.length} · {saved.length}{" "}
          {saved.length === 1 ? "idea" : "ideas"} kept in this example.
        </p>
      </footer>
    </Carousel>
  );
}
