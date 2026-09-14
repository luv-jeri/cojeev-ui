"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import { BentoGrid } from "./bento-grid";
import { Button } from "./button";
import { Input } from "./input";
import { NativeSelect } from "./native-select";
import { Icon } from "./icon";
import { ScrollArea, ScrollBar } from "./scroll-area";
import { cn } from "../lib/utils";
import {
  generateBento,
  bentoTemplates,
  resizeBentoSeam,
  swapBentoTiles,
  exportBento,
  validateBento,
  type BentoLayout,
  type BentoVariant,
  type BentoTemplate,
  type BentoSide,
} from "../lib/bento-layout";
export type BentoBuilderValue = {
  layout: BentoLayout;
  variant: BentoVariant;
  template: BentoTemplate;
};
export type BentoBuilderProps = Omit<
  React.ComponentProps<"div">,
  "onChange"
> & {
  initialLayout?: BentoLayout;
  /** Initial treatment; later prop changes select a treatment without replacing the edited layout. */
  initialVariant?: BentoVariant;
  onChange?: (value: BentoBuilderValue) => void;
};
type Gesture =
  | { kind: "swap"; id: string; pointer: number; x: number; y: number }
  | { kind: "resize"; id: string; side: BentoSide; pointer: number };
type EditFeedback = { message: string; x: number; y: number };
export function BentoBuilder({
  initialLayout,
  initialVariant = "classic",
  onChange,
  className,
  ...props
}: BentoBuilderProps) {
  const [history, setHistory] = React.useState<BentoBuilderValue[]>(() => [
    {
      layout: initialLayout ?? generateBento(),
      variant: initialVariant,
      template: "Editorial",
    },
  ]);
  const [cursor, setCursor] = React.useState(0),
    value = history[cursor],
    { layout, variant, template } = value;
  const lastVariant = React.useRef(initialVariant);
  React.useEffect(() => {
    if (lastVariant.current === initialVariant) return;
    lastVariant.current = initialVariant;
    setHistory((current) => [
      ...current.slice(0, cursor + 1),
      { ...current[cursor], variant: initialVariant },
    ]);
    setCursor(cursor + 1);
  }, [initialVariant, cursor]);
  const [selected, setSelected] = React.useState(layout.tiles[0]?.id ?? ""),
    [label, setLabel] = React.useState(layout.tiles[0]?.label ?? ""),
    [target, setTarget] = React.useState("");
  const [notice, setNotice] = React.useState(
      "Select a tile to edit. Drag onto another tile to swap their content.",
    ),
    [gesture, setGesture] = React.useState<Gesture | null>(null),
    [preview, setPreview] = React.useState<BentoLayout | null>(null),
    [feedback, setFeedback] = React.useState<EditFeedback | null>(null);
  const gestureRef = React.useRef<Gesture | null>(null),
    previewRef = React.useRef<BentoLayout | null>(null),
    rejectionRef = React.useRef<string | null>(null),
    board = React.useRef<HTMLDivElement>(null),
    uid = React.useId();
  const tile = layout.tiles.find((t) => t.id === selected) ?? layout.tiles[0];
  const paintedTile = preview?.tiles.find((t) => t.id === tile.id) ?? tile;
  const validationError = validateBento(layout);
  React.useEffect(() => {
    if (!validationError) onChange?.(value);
  }, [value, onChange, validationError]);
  const hasFeedback = feedback !== null;
  React.useEffect(() => {
    if (!hasFeedback) return;
    // A viewport-anchored hint should not linger over unrelated content after scrolling.
    const dismiss = () => setFeedback(null);
    document.addEventListener("scroll", dismiss, true);
    window.addEventListener("resize", dismiss);
    return () => {
      document.removeEventListener("scroll", dismiss, true);
      window.removeEventListener("resize", dismiss);
    };
  }, [hasFeedback]);
  function clearFeedback() {
    rejectionRef.current = null;
    setFeedback(null);
  }
  function reject(message: string, x: number, y: number) {
    rejectionRef.current = message;
    setNotice(message);
    setFeedback({ message, x, y });
  }
  function commit(next: BentoBuilderValue, message = "Layout updated.") {
    const error = validateBento(next.layout);
    if (error) {
      setNotice(error);
      return;
    }
    clearFeedback();
    if (JSON.stringify(next) === JSON.stringify(value)) {
      setNotice(message);
      return;
    }
    setHistory((current) => [...current.slice(0, cursor + 1), next]);
    setCursor(cursor + 1);
    setNotice(message);
  }
  function endGesture() {
    gestureRef.current = null;
    previewRef.current = null;
    setGesture(null);
    setPreview(null);
  }
  function cancel() {
    endGesture();
    clearFeedback();
  }
  function select(id: string) {
    clearFeedback();
    const next = layout.tiles.find((t) => t.id === id);
    if (next) {
      setSelected(id);
      setLabel(next.label);
      setTarget("");
    }
  }
  function restore(index: number) {
    cancel();
    setCursor(index);
    const restored =
      history[index].layout.tiles.find((t) => t.id === selected) ??
      history[index].layout.tiles[0];
    setSelected(restored.id);
    setLabel(restored.label);
    setNotice("History restored.");
  }
  function compose(
    columns: number,
    rows: number,
    nextTemplate = template,
    seed = layout.seed,
  ) {
    try {
      commit(
        {
          ...value,
          template: nextTemplate,
          layout: generateBento(
            columns,
            rows,
            seed,
            layout.tiles,
            nextTemplate,
          ),
        },
        "Composition updated; all tile content retained.",
      );
    } catch (error) {
      setNotice((error as Error).message);
    }
  }
  function resize(side: BentoSide, position: number, control: HTMLElement) {
    const edit = resizeBentoSeam(layout, tile.id, side, position);
    if (edit.error) {
      const rect = control.getBoundingClientRect();
      reject(edit.error, rect.left + rect.width / 2, rect.bottom);
    } else
      commit(
        { ...value, layout: edit.layout },
        "Shared seam moved; neighbors resized together.",
      );
  }
  function start(
    event: React.PointerEvent<HTMLElement>,
    kind: Gesture["kind"],
    id: string,
    side: BentoSide = "right",
  ) {
    if (event.button !== 0 || !event.isPrimary || gestureRef.current) return;
    event.preventDefault();
    // Pointer default is suppressed for dragging, so explicitly own keyboard cancellation.
    event.currentTarget.focus({ preventScroll: true });
    select(id);
    const next: Gesture =
      kind === "swap"
        ? {
            kind,
            id,
            pointer: event.pointerId,
            x: event.clientX,
            y: event.clientY,
          }
        : { kind, id, side, pointer: event.pointerId };
    gestureRef.current = next;
    setGesture(next);
    if (kind === "resize")
      setNotice(
        "Drag to the next cell to resize. Neighbors move together; Escape cancels.",
      );
    event.currentTarget.setPointerCapture(event.pointerId);
  }
  function move(event: React.PointerEvent) {
    const active = gestureRef.current;
    if (
      !active ||
      active.pointer !== event.pointerId ||
      active.kind !== "resize" ||
      !board.current
    )
      return;
    const rect = board.current.getBoundingClientRect(),
      vertical = active.side === "left" || active.side === "right";
    const position = Math.round(
      vertical
        ? ((event.clientX - rect.left) / rect.width) * layout.columns
        : ((event.clientY - rect.top) / rect.height) * layout.rows,
    );
    const edit = resizeBentoSeam(layout, active.id, active.side, position);
    if (edit.error) {
      reject(edit.error, event.clientX, event.clientY);
      return;
    }
    if (rejectionRef.current) setNotice("Release to keep this size.");
    clearFeedback();
    previewRef.current = edit.layout;
    setPreview(edit.layout);
  }
  function finish(event: React.PointerEvent) {
    const active = gestureRef.current;
    if (!active || active.pointer !== event.pointerId) return;
    if (active.kind === "resize") {
      const rejection = rejectionRef.current;
      const changed =
        previewRef.current &&
        JSON.stringify(previewRef.current) !== JSON.stringify(layout);
      if (changed) {
        commit({ ...value, layout: previewRef.current! }, "Shared seam moved.");
      } else if (!rejection) {
        setNotice(
          "Size unchanged. Move a little further to snap to the next cell.",
        );
      }
      if (rejection) {
        reject(
          changed ? `${rejection} Last valid size kept.` : rejection,
          event.clientX,
          event.clientY,
        );
      }
    }
    if (active.kind === "swap") {
      const destination = document
        .elementFromPoint(event.clientX, event.clientY)
        ?.closest<HTMLElement>("[data-bento-tile]");
      const destinationId = destination?.dataset.bentoTile;
      if (
        destinationId &&
        board.current?.contains(destination) &&
        destinationId !== active.id
      )
        commit(
          {
            ...value,
            layout: swapBentoTiles(layout, active.id, destinationId),
          },
          "Tile contents swapped.",
        );
      else if (
        Math.hypot(event.clientX - active.x, event.clientY - active.y) > 6
      )
        reject(
          "Drop onto another tile to swap. Empty space and the outside of the canvas are not drop targets.",
          event.clientX,
          event.clientY,
        );
    }
    endGesture();
  }
  if (validationError)
    return (
      <div {...props} role="alert" className={cn("v-bento-builder", className)}>
        {validationError}
      </div>
    );
  const sides: BentoSide[] = ["left", "right", "top", "bottom"];
  return (
    <div
      {...props}
      data-slot="bento-builder"
      className={cn("v-bento-builder", className)}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          cancel();
          setNotice("Edit cancelled.");
        }
        props.onKeyDown?.(event);
      }}
    >
      <div className="v-bento-builder__heading">
        <div>
          <span className="v-bento-builder__eyebrow">
            A place for every idea
          </span>
          <h3>Make the pieces yours.</h3>
        </div>
        <div className="v-bento-builder__actions">
          <Button
            variant="ghost"
            size="sm"
            disabled={cursor === 0}
            onClick={() => restore(cursor - 1)}
          >
            <Icon name="undo-2" />
            Undo
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={cursor === history.length - 1}
            onClick={() => restore(cursor + 1)}
          >
            <Icon name="redo-2" />
            Redo
          </Button>
        </div>
      </div>
      <div className="v-bento-builder__templates" aria-label="Templates">
        {bentoTemplates.map((name) => (
          <Button
            key={name}
            shape="card"
            variant={template === name ? "accent" : "outline"}
            aria-pressed={template === name}
            onClick={() => compose(layout.columns, layout.rows, name)}
          >
            {name}
          </Button>
        ))}
      </div>
      <div className="v-bento-builder__toolbar">
        <div className="v-bento-builder__actions">
          {(["classic", "interlock"] as const).map((mode) => (
            <Button
              key={mode}
              size="sm"
              variant={variant === mode ? "default" : "ghost"}
              aria-pressed={variant === mode}
              onClick={() => commit({ ...value, variant: mode })}
            >
              {mode === "classic" ? "Classic" : "Interlock"}
            </Button>
          ))}
        </div>
        <div className="v-bento-builder__actions">
          {variant === "interlock" && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                commit(
                  {
                    ...value,
                    layout: {
                      ...layout,
                      seed:
                        (Math.imul(layout.seed, 1664525) + 1013904223) >>> 0,
                    },
                  },
                  "Shared edges reshaped; tile content and positions retained.",
                )
              }
            >
              Reshape edges
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              compose(
                layout.columns,
                layout.rows,
                template,
                (layout.seed + 1) >>> 0,
              )
            }
          >
            <Icon name="shuffle" />
            Randomize
          </Button>
        </div>
      </div>
      <ScrollArea
        variant="plain"
        className="v-bento-builder__scroll"
        style={{ "--h": "none" } as React.CSSProperties}
        viewportWrapper={(viewport) => (
          <>
            {viewport}
            <ScrollBar orientation="horizontal" />
          </>
        )}
        viewportProps={{
          "aria-label": "Bento editing workspace",
          style: { maxHeight: "none", padding: "4px 4px 20px", height: "auto" },
        }}
      >
        <div
          ref={board}
          className="v-bento-builder__board"
          style={{ minWidth: Math.max(560, layout.columns * 120) }}
          data-dragging={gesture?.kind}
          onPointerMove={move}
          onPointerUp={finish}
          onPointerCancel={(event) => {
            if (gestureRef.current?.pointer === event.pointerId) {
              cancel();
              setNotice("Drag cancelled. Layout unchanged.");
            }
          }}
          onLostPointerCapture={(event) => {
            if (gestureRef.current?.pointer === event.pointerId) {
              cancel();
              setNotice("Drag cancelled. Layout unchanged.");
            }
          }}
        >
          <BentoGrid
            layout={preview ?? layout}
            variant={variant}
            renderTile={(current) => (
              <button
                type="button"
                className="v-bento-builder__tile"
                aria-label={`Select ${current.label}`}
                aria-pressed={current.id === tile.id}
                onClick={(event) => {
                  // Pointer selection happens on press; its trailing click must not erase a rejected drop.
                  if (event.detail === 0) select(current.id);
                }}
                onPointerDown={(event) => start(event, "swap", current.id)}
              >
                <span className="v-bento__number">
                  {String(
                    layout.tiles.findIndex((t) => t.id === current.id) + 1,
                  ).padStart(2, "0")}
                </span>
                <span className="v-bento__label">{current.label}</span>
                <span className="v-bento-builder__tile-hint">Drag to swap</span>
              </button>
            )}
          />
          {sides
            .filter((side) =>
              side === "left"
                ? tile.x > 0
                : side === "right"
                  ? tile.x + tile.width < layout.columns
                  : side === "top"
                    ? tile.y > 0
                    : tile.y + tile.height < layout.rows,
            )
            .map((side) => {
              const vertical = side === "left" || side === "right",
                position = vertical
                  ? paintedTile.x + (side === "right" ? paintedTile.width : 0)
                  : paintedTile.y +
                    (side === "bottom" ? paintedTile.height : 0);
              return (
                <button
                  key={side}
                  type="button"
                  aria-label={`Resize ${side} seam`}
                  className="v-bento-builder__seam"
                  data-side={side}
                  style={{
                    left: `${((vertical ? position : paintedTile.x + paintedTile.width / 2) / layout.columns) * 100}%`,
                    top: `${((vertical ? paintedTile.y + paintedTile.height / 2 : position) / layout.rows) * 100}%`,
                  }}
                  onPointerDown={(event) =>
                    start(event, "resize", tile.id, side)
                  }
                  onKeyDown={(event) => {
                    if (
                      [
                        "ArrowLeft",
                        "ArrowRight",
                        "ArrowUp",
                        "ArrowDown",
                      ].includes(event.key)
                    ) {
                      event.preventDefault();
                      resize(
                        side,
                        position +
                          (["ArrowRight", "ArrowDown"].includes(event.key)
                            ? 1
                            : -1),
                        event.currentTarget,
                      );
                    }
                  }}
                >
                  <span aria-hidden="true">{vertical ? "⋮" : "⋯"}</span>
                </button>
              );
            })}
        </div>
      </ScrollArea>
      <p className="v-bento-builder__scroll-hint">
        Scroll sideways to reach every tile. On touch screens, use Swap with to
        move content.
      </p>
      <div className="v-bento-builder__controls">
        <fieldset>
          <legend>Canvas</legend>
          <div className="v-bento-builder__fields">
            {(["columns", "rows"] as const).map((dimension) => (
              <label key={dimension} htmlFor={`${uid}-${dimension}`}>
                <span>{dimension === "columns" ? "Columns" : "Rows"}</span>
                <NativeSelect
                  id={`${uid}-${dimension}`}
                  aria-label={dimension === "columns" ? "Columns" : "Rows"}
                  value={layout[dimension]}
                  onChange={(event) =>
                    compose(
                      dimension === "columns"
                        ? Number(event.target.value)
                        : layout.columns,
                      dimension === "rows"
                        ? Number(event.target.value)
                        : layout.rows,
                    )
                  }
                >
                  {[2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            ))}
          </div>
          <p>
            {layout.tiles.length} tiles · {layout.columns * layout.rows} cells.
            Dimensions recompose the canvas.
          </p>
        </fieldset>
        <fieldset>
          <legend>Selected tile</legend>
          <label htmlFor={`${uid}-label`}>Tile label</label>
          <Input
            id={`${uid}-label`}
            maxLength={180}
            value={label}
            onChange={(event) => setLabel(event.target.value)}
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              commit(
                {
                  ...value,
                  layout: {
                    ...layout,
                    tiles: layout.tiles.map((t) =>
                      t.id === tile.id ? { ...t, label } : t,
                    ),
                  },
                },
                "Label saved.",
              )
            }
          >
            Save label
          </Button>
        </fieldset>
        <fieldset>
          <legend>Move content</legend>
          <label htmlFor={`${uid}-swap`}>Swap with</label>
          <NativeSelect
            id={`${uid}-swap`}
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          >
            <option value="">Choose a tile</option>
            {layout.tiles
              .filter((t) => t.id !== tile.id)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label || "Untitled tile"}
                </option>
              ))}
          </NativeSelect>
          <Button
            size="sm"
            variant="outline"
            disabled={!target}
            onClick={() => {
              commit(
                { ...value, layout: swapBentoTiles(layout, tile.id, target) },
                "Tile contents swapped.",
              );
              setTarget("");
            }}
          >
            Swap tiles
          </Button>
        </fieldset>
      </div>
      <details className="v-bento-builder__resize">
        <summary>Resize shared seams</summary>
        <p>
          Move a whole shared boundary by one cell. Neighbors grow or shrink
          together; outside edges stay fixed. Focus a canvas handle and use
          arrow keys, or use these buttons.
        </p>
        <div className="v-bento-builder__actions">
          {sides.map((side) => {
            const position =
              side === "left"
                ? tile.x
                : side === "right"
                  ? tile.x + tile.width
                  : side === "top"
                    ? tile.y
                    : tile.y + tile.height;
            return (
              <div key={side}>
                <span>{side}</span>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Move ${side} seam backward`}
                  onClick={(event) =>
                    resize(side, position - 1, event.currentTarget)
                  }
                >
                  −
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  aria-label={`Move ${side} seam forward`}
                  onClick={(event) =>
                    resize(side, position + 1, event.currentTarget)
                  }
                >
                  +
                </Button>
              </div>
            );
          })}
        </div>
      </details>
      <div className="v-bento-builder__footer">
        <p role="status">{notice}</p>
        <Button
          variant="accent"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(exportBento(layout, variant));
              setNotice(
                "Layout copied with your content and chosen treatment.",
              );
            } catch {
              setNotice(
                "Clipboard unavailable. Allow clipboard access and try again.",
              );
            }
          }}
        >
          <Icon name="copy" />
          Copy layout
        </Button>
      </div>
      {feedback &&
        createPortal(
          <div
            data-slot="bento-edit-feedback"
            className="v-bento-builder__feedback"
            aria-hidden="true"
            style={{
              left: Math.max(
                12,
                Math.min(feedback.x + 16, window.innerWidth - 268),
              ),
              top: Math.max(
                12,
                Math.min(feedback.y + 16, window.innerHeight - 156),
              ),
            }}
          >
            <strong>Movement limit</strong>
            <span>{feedback.message}</span>
          </div>,
          document.body,
        )}
    </div>
  );
}
