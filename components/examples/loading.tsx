"use client";
import * as React from "react";
import type { ExampleProps } from "./types";
import {
  AsyncContent,
  Skeleton,
  SkeletonGroup,
} from "@/registry/cojeev/ui/skeleton";
import { Spinner } from "@/registry/cojeev/ui/spinner";
import { Button } from "@/registry/cojeev/ui/button";
import { Icon } from "@/registry/cojeev/ui/icon";
import { Input } from "@/registry/cojeev/ui/input";
import { Field, FieldLabel, FieldControl } from "@/registry/cojeev/ui/field";
import { ShapeArtwork } from "@/registry/cojeev/ui/shape-artwork";

const blocks = [
  "default",
  "pill",
  "card",
  "disk",
  "line",
  "skel-group",
] as const;
export function SkeletonExample({
  variant = "article",
  compact = false,
  placeholderEffect = "shimmer",
}: ExampleProps) {
  const layout =
    variant === "profile" || variant === "board" ? variant : "article";
  const [loading, setLoading] = React.useState(true),
    [paused, setPaused] = React.useState(false),
    [title, setTitle] = React.useState("Make room for a thoughtful beginning.");
  const skel = (shape: (typeof blocks)[number], className: string) => (
    <Skeleton
      variant={shape}
      className={className}
      effect={placeholderEffect}
      paused={paused}
    />
  );
  const field = (
    <Field>
      <FieldLabel>A note for later</FieldLabel>
      <FieldControl>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </FieldControl>
    </Field>
  );
  const fallback = (
    <div className="v-loading-template" data-layout={layout}>
      {layout === "profile" ? (
        <>
          <div className="v-loading-template__identity">
            {skel("disk", "v-loading-template__portrait")}
            <SkeletonGroup>
              {skel("line", "v-loading-template__name")}
              {skel("line", "v-loading-template__short")}
            </SkeletonGroup>
          </div>
          {skel("card", "v-loading-template__field")}
          <div className="v-loading-template__stats">
            {skel("pill", "v-loading-template__stat")}
            {skel("pill", "v-loading-template__stat")}
          </div>
        </>
      ) : layout === "board" ? (
        <>
          <div className="v-loading-template__board-head">
            {skel("line", "v-loading-template__name")}
            {skel("disk", "v-loading-template__seal")}
          </div>
          {skel("card", "v-loading-template__field")}
          <div className="v-loading-template__tiles">
            {[0, 1, 2].map((n) => (
              <SkeletonGroup key={n} className="v-loading-template__tile">
                {skel("card", "v-loading-template__tile-art")}
                {skel("line", "v-loading-template__short")}
                {skel("line", "v-loading-template__name")}
              </SkeletonGroup>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="v-loading-template__article-head">
            {skel("line", "v-loading-template__short")}
            {skel("disk", "v-loading-template__seal")}
          </div>
          {skel("card", "v-loading-template__field")}
          <div className="v-loading-template__article-body">
            {skel("card", "v-loading-template__illustration")}
            <SkeletonGroup>
              {skel("line", "v-loading-template__name")}
              {skel("line", "v-loading-template__name")}
              {skel("line", "v-loading-template__short")}
            </SkeletonGroup>
          </div>
        </>
      )}
    </div>
  );
  return (
    <div className="v-loading-example">
      <div className="v-loading-example__heading">
        <span>
          {layout === "article"
            ? "A page taking shape"
            : layout === "profile"
              ? "A person, coming into focus"
              : "Room for the next ideas"}
        </span>
        <span aria-live="polite">
          {loading ? "Placeholder preview" : "Content ready"}
        </span>
      </div>
      <AsyncContent
        loading={loading}
        fallback={fallback}
        className="v-loading-example__surface"
      >
        <div className="v-loading-template" data-layout={layout}>
          {layout === "profile" ? (
            <>
              <div className="v-loading-template__identity">
                <div className="v-loading-template__portrait v-loading-template__monogram">
                  SA
                </div>
                <div>
                  <strong>Samira Arun</strong>
                  <p>Designer & careful observer</p>
                </div>
              </div>
              {field}
              <div className="v-loading-template__stats">
                <span>
                  <strong>12</strong> field notes
                </span>
                <span>
                  <strong>03</strong> collections
                </span>
              </div>
            </>
          ) : layout === "board" ? (
            <>
              <div className="v-loading-template__board-head">
                <strong>Small discoveries</strong>
                <Icon name="sparkles" />
              </div>
              {field}
              <div className="v-loading-template__tiles">
                {["Notice", "Connect", "Make"].map((name, i) => (
                  <div key={name} className="v-loading-template__tile">
                    <ShapeArtwork
                      name={
                        i === 0
                          ? "daisy-12"
                          : i === 1
                            ? "pebble-soft"
                            : "clover-soft"
                      }
                      tone={i === 0 ? "pink" : i === 1 ? "blue" : "yellow"}
                      className="v-loading-template__tile-art"
                      echo={false}
                      shadow={false}
                    />
                    <strong>{name}</strong>
                    <p>
                      {
                        [
                          "Keep a small detail.",
                          "Follow a shared thread.",
                          "Give an idea a form.",
                        ][i]
                      }
                    </p>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="v-loading-template__article-head">
                <span>FIELD NOTES · 01</span>
                <Icon name="sparkles" />
              </div>
              {field}
              <div className="v-loading-template__article-body">
                <ShapeArtwork
                  name="daisy-12"
                  tone="pink"
                  className="v-loading-template__illustration"
                  shadow={false}
                />
                <div>
                  <strong>Good ideas begin with attention.</strong>
                  <p>
                    Keep a detail that caught your eye. A small beginning is
                    still a beginning.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>
      </AsyncContent>
      <div className="v-loading-example__actions">
        <Button
          size="sm"
          variant="secondary"
          onClick={() => setLoading((value) => !value)}
        >
          {loading ? "Show content" : "Show placeholder"}
          <Icon name={loading ? "arrow-right" : "refresh"} />
        </Button>
        {loading && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setPaused((value) => !value)}
          >
            {paused ? "Resume effect" : "Pause effect"}
          </Button>
        )}
      </div>
      {!compact && (
        <section
          className="v-loading-example__blocks"
          aria-label="Placeholder building blocks"
        >
          <div>
            <strong>Six building blocks, still yours.</strong>
            <p>Combine these shapes to match your actual content.</p>
          </div>
          <div className="v-loading-example__block-grid">
            {blocks.map((shape) => (
              <figure key={shape} data-building-block={shape}>
                <Skeleton
                  variant={shape}
                  effect={placeholderEffect}
                  paused={paused}
                  style={{
                    width: shape === "disk" ? 32 : 72,
                    height: shape === "line" ? 12 : 32,
                  }}
                />
                <figcaption>
                  {shape === "skel-group"
                    ? "Group"
                    : shape === "default"
                      ? "Default"
                      : shape[0].toUpperCase() + shape.slice(1)}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

const loadingNotes = {
  bloom: {
    title: "An idea, unfolding",
    text: "A seed opens, gathers itself and begins again. For quiet, open-ended work.",
    tag: "01 / GROW",
  },
  orbit: {
    title: "Keeping things connected",
    text: "Three seeds circle a steady centre. A useful signal while related pieces come together.",
    tag: "02 / GATHER",
  },
  relay: {
    title: "One thought to the next",
    text: "A gentle hand-off from left to right. For work that moves through a sequence.",
    tag: "03 / PASS",
  },
};
export function SpinnerExample({
  variant = "bloom",
  spinnerShape = "soft",
}: ExampleProps) {
  const appearance =
    variant === "orbit" || variant === "relay" ? variant : "bloom";
  const [paused, setPaused] = React.useState(false),
    [complete, setComplete] = React.useState(false);
  const action = React.useRef<HTMLButtonElement>(null);
  const note = loadingNotes[appearance];
  return (
    <div
      className="v-loader-example"
      data-appearance={appearance}
      data-complete={complete}
    >
      <div className="v-loader-example__stage">
        <span className="v-loader-example__index">{note.tag}</span>
        <div className="v-loader-example__drawing">
          {complete ? (
            <Icon name="check" className="v-loader-example__done" />
          ) : (
            <Spinner
              appearance={appearance}
              variant={
                variant === "point" || spinnerShape === "point"
                  ? "point"
                  : "default"
              }
              paused={paused}
              aria-label={
                paused ? "Loading preview paused" : "Loading preview running"
              }
              style={{ "--pulse": "80px" } as React.CSSProperties}
            />
          )}
        </div>
        <div className="v-loader-example__copy">
          <h3>{complete ? "Preview complete" : note.title}</h3>
          <p>
            {complete
              ? "The local demonstration is finished. Restart whenever you like."
              : note.text}
          </p>
        </div>
        <span className="v-loader-example__status" role="status">
          {complete ? "Finished" : paused ? "Paused" : "Local loading preview"}
        </span>
      </div>
      <div className="v-loading-example__actions">
        <Button
          ref={action}
          size="sm"
          variant="secondary"
          onClick={() => {
            if (complete) {
              setComplete(false);
              setPaused(false);
            } else setPaused((value) => !value);
          }}
        >
          {complete
            ? "Restart preview"
            : paused
              ? "Resume preview"
              : "Pause preview"}
          <Icon name={complete ? "refresh" : "sparkles"} />
        </Button>
        {!complete && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setComplete(true);
              action.current?.focus();
            }}
          >
            Finish preview
            <Icon name="check" />
          </Button>
        )}
      </div>
    </div>
  );
}
