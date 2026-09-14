"use client";
/* eslint-disable @next/next/no-img-element -- Authored inline SVG data; copied examples have no Next dependency or image request. */
import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import { Input } from "@/registry/cojeev/ui/input";
import { Label } from "@/registry/cojeev/ui/label";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
  DialogClose,
} from "@/registry/cojeev/ui/dialog";
import { LinearModal } from "@/registry/cojeev/ui/linear-modal";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNavigation,
  CarouselPrevious,
  CarouselNext,
} from "@/registry/cojeev/ui/carousel";
import type { ExampleProps } from "./types";

const study = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#aec9d1"/><path d="M0 470Q180 150 370 380T800 290V600H0" fill="#a7b974"/><circle cx="500" cy="210" r="154" fill="#edacc6"/><circle cx="140" cy="90" r="90" fill="#f1d58d"/><path d="M50 500Q270 30 710 480M30 550Q330 90 750 530" fill="none" stroke="#25332d" stroke-width="3"/><path d="M500 110v200M400 210h200" stroke="#25332d" stroke-width="2"/></svg>')}`;

export function DialogExample({ variant }: ExampleProps) {
  const appearance =
    variant === "editor" || variant === "exhibit" ? variant : "confirmation";
  const [open, setOpen] = React.useState(false),
    [name, setName] = React.useState("Room for good ideas"),
    [draft, setDraft] = React.useState(name),
    [kept, setKept] = React.useState(false);
  const id = React.useId();
  return (
    <div className="v-dialog-example">
      <div className="v-dialog-example__slip">
        <span className="v-dialog-example__eyebrow">
          One note. Three moments.
        </span>
        <strong>{name}</strong>
        <p>Confirm a choice, shape a draft or look a little closer.</p>
      </div>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (value) setDraft(name);
        }}
      >
        <DialogTrigger asChild>
          <Button>
            <Icon name="plus" />
            Open note
          </Button>
        </DialogTrigger>
        <DialogContent appearance={appearance} showCloseButton>
          <DialogHeader>
            <span className="v-dialog__stamp" aria-hidden="true">
              <Icon
                name={
                  appearance === "editor"
                    ? "pencil"
                    : appearance === "exhibit"
                      ? "eye"
                      : "bookmark"
                }
              />
            </span>
            <DialogTitle>
              {appearance === "confirmation"
                ? "Give this idea a home."
                : appearance === "editor"
                  ? "A name worth keeping."
                  : name}
            </DialogTitle>
            <DialogDescription>
              {appearance === "confirmation"
                ? "Keep this note in the local sample collection. Nothing is sent anywhere."
                : appearance === "editor"
                  ? "A small change to this sample note. Cancel leaves the original intact."
                  : "A field study in colour, contour and a little room to think."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody aria-label="Note detail">
            {appearance === "confirmation" ? (
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                <strong>{name}</strong>
                <br />
                An idea can start small. Keep it nearby until the next piece
                arrives.
              </p>
            ) : appearance === "editor" ? (
              <form
                id={id}
                style={{ display: "grid", gap: 12, padding: 12 }}
                onSubmit={(e) => {
                  e.preventDefault();
                  if (draft.trim()) {
                    setName(draft.trim());
                    setOpen(false);
                  }
                }}
              >
                <Label htmlFor={`${id}-name`}>Note name</Label>
                <Input
                  id={`${id}-name`}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  appearance="editorial"
                  autoComplete="off"
                  required
                  maxLength={80}
                />
                <small>Up to 80 characters. Saved in this example only.</small>
              </form>
            ) : (
              <div className="v-dialog__exhibit">
                <img
                  src={study}
                  alt="Pink sun, olive hills and two fine ink contours"
                />
                <div>
                  <strong>Collect. Connect. Continue.</strong>
                  <p style={{ lineHeight: 1.7 }}>
                    A simple composition with a clear centre of attention. The
                    ink line carries your eye through it.
                  </p>
                  <dl>
                    <dt>Medium</dt>
                    <dd>Locally authored SVG</dd>
                    <dt>Collection</dt>
                    <dd>Notebook studies ·01</dd>
                  </dl>
                </div>
              </div>
            )}
          </DialogBody>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            {appearance === "editor" ? (
              <Button type="submit" form={id} disabled={!draft.trim()}>
                Save name
                <Icon name="arrow-right" />
              </Button>
            ) : (
              <Button
                onClick={() => {
                  setKept(!kept);
                  setOpen(false);
                }}
              >
                {kept ? "Remove from collection" : "Keep this note"}
                <Icon name="bookmark" />
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <p role="status">
        {kept ? "Kept in this sample collection." : "Not yet kept."} Current
        name: {name}.
      </p>
    </div>
  );
}

export function LinearModalExample({ variant }: ExampleProps) {
  const [saved, setSaved] = React.useState<number[]>([]);
  const mode =
    variant === "centered" || variant === "gallery" || variant === "compact"
      ? variant
      : "card";
  const titles = [
    "Room for good ideas",
    "A line worth following",
    "The space between",
  ];
  const images = [
    study,
    `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#eec4ca"/><path d="M110 120Q470 0 620 220T500 540Q140 600 110 120" fill="#adc9d2"/><path d="M-20 480C240-80 520 740 820 70" fill="none" stroke="#25332d" stroke-width="5"/><path d="M-20 510C240-50 520 770 820 100" fill="none" stroke="#25332d" stroke-width="2"/><circle cx="540" cy="375" r="48" fill="#f1d58d"/></svg>')}`,
    `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"><rect width="800" height="600" fill="#e8d8af"/><path d="M0 0H310Q530 210 310 400T0 600Z" fill="#a7b974"/><path d="M800 0H630Q410 210 630 400T800 600Z" fill="#edacc6"/><path d="M390 0Q620 180 390 400T390 600" fill="none" stroke="#25332d" stroke-width="3"/><circle cx="480" cy="205" r="38" fill="#adc9d2"/></svg>')}`,
  ];
  const alts = [
    "Pink sun and olive hills crossed by fine ink contours",
    "A blue pebble with two looping ink lines and a yellow point",
    "Olive and pink edges framing an open middle and a fine ink line",
  ];
  const detail = (index: number) => (
    <LinearModal
      title={titles[index]}
      eyebrow={`Notebook study ·0${index + 1}`}
      description="A quiet place to collect, connect and continue."
      src={images[index]}
      alt={alts[index]}
      variant={
        mode === "centered"
          ? "centered"
          : mode === "compact"
            ? "compact"
            : "card"
      }
    >
      <p>
        Some ideas arrive as fragments. Give them somewhere to land, and a small
        thread to follow back.
      </p>
      <p>
        One clear subject. Two fine lines. Enough space for the next thought.
      </p>
      <div
        style={{
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
          padding: "12px 0",
        }}
      >
        <Button
          variant="accent"
          onClick={() =>
            setSaved((current) =>
              current.includes(index)
                ? current.filter((value) => value !== index)
                : [...current, index],
            )
          }
          aria-pressed={saved.includes(index)}
        >
          <Icon name="bookmark" />
          {saved.includes(index) ? "Remove study" : "Keep this study"}
        </Button>
        <span role="status">
          {saved.includes(index)
            ? "Kept locally in this example."
            : "A local notebook study."}
        </span>
      </div>
    </LinearModal>
  );
  return (
    <div className="v-linear-example" data-mode={mode}>
      <header>
        <span className="v-dialog-example__eyebrow">
          From a glimpse to the whole story
        </span>
        <h3>A closer look, without losing your place.</h3>
        <p>
          Open the study. Follow the image and title into the detail, then close
          to return.
        </p>
      </header>
      {mode === "gallery" ? (
        <Carousel className="v-linear-example__gallery">
          <CarouselContent scrollbar aria-label="Notebook studies">
            {titles.map((title, index) => (
              <CarouselItem key={title}>{detail(index)}</CarouselItem>
            ))}
          </CarouselContent>
          <CarouselNavigation>
            <span>Three studies · swipe or use the arrows</span>
            <CarouselPrevious />
            <CarouselNext />
          </CarouselNavigation>
        </Carousel>
      ) : (
        detail(0)
      )}
      <p role="status">
        {saved.length
          ? `${saved.length} ${saved.length === 1 ? "study" : "studies"} kept. Your collection stays when you change the view.`
          : "Open a study to keep it in this sample collection."}
      </p>
    </div>
  );
}
