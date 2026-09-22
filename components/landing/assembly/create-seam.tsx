"use client";

/**
 * The one deliberate DOM-over-WebGL seam.
 *
 * A genuine registry `<Button>` sits exactly on the sculpted pink pill. It is not
 * a picture of a button: it is the same component the catalogue installs, with a
 * real accessible name, real focus ring, real keyboard activation and real
 * pressed semantics. The label is never baked into WebGL.
 *
 * The measurement comes from the scene controller, which transforms the mesh's
 * own local-space probe points by its world matrix — so the seam follows the
 * sculpted control's press compression and the chapter camera rather than an
 * assumed screen offset. The stage writes that measurement straight onto
 * `plateRef` without a re-render; when no measurement exists (WebGL unavailable,
 * the mesh hidden, the element off-screen) the plate falls back to a static,
 * readable position instead of guessing.
 *
 * The drag is bounded: horizontal displacement maps to ribbon tension on a 0–100
 * scale, the gesture never blocks vertical scrolling, and the same value is
 * editable from an ordinary range control in the motion chapter.
 */
import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import { experience } from "./experience-store";
import { paintSeam, registerSeamWriter } from "./seam-bus";
import { INSTRUMENT } from "./canonical";

/** Screen pixels per unit of tension, derived from the authored ribbon length. */
const TENSION_PER_PIXEL = 100 / (INSTRUMENT.panel.width * 340);
const DRAG_THRESHOLD = 5;
const KEY_STEP = 4;

/**
 * The pointer ids this button is currently holding.
 *
 * The DOM exposes no way to enumerate an element's pointer captures, so the ids
 * are tracked as they are acquired. Without this the release path would have to
 * guess, and a guessed id throws rather than releasing the one that matters.
 */
const captured = new WeakMap<Element, Set<number>>();

function capturePointer(node: Element, pointerId: number) {
  const ids = captured.get(node) ?? new Set<number>();
  ids.add(pointerId);
  captured.set(node, ids);
}

function releaseCaptured(node: Element, pointerId: number) {
  captured.get(node)?.delete(pointerId);
}

function capturedPointers(node: Element): number[] {
  return [...(captured.get(node) ?? [])];
}

type Props = {
  /** Whether the hero chapter is the one being read. */
  active: boolean;
};

export function CreateSeam({ active }: Props) {
  const gesture = React.useRef({ x: 0, tension: 0, moved: false, down: false });
  const button = React.useRef<HTMLButtonElement | null>(null);

  // Registration, not a ref crossing a component boundary: the stage writes
  // measurements straight onto this node, so scrolling never re-renders.
  const attachPlate = React.useCallback((node: HTMLDivElement | null) => {
    if (!node) {
      registerSeamWriter(null);
      return;
    }
    registerSeamWriter((rect) => paintSeam(node, rect));
  }, []);

  /**
   * The drag cursor, written straight to the node that carries it.
   *
   * This was React state, which meant the effect below had to call `setState`
   * during a render pass just to clear a class name. It is presentation state
   * read by CSS and nothing else, so it belongs on the element: the write is
   * synchronous with the gesture and costs no render.
   */
  const markDragging = React.useCallback((value: boolean) => {
    const plate = button.current?.closest(".asm-seam") as HTMLElement | null;
    if (plate) plate.dataset.dragging = value ? "true" : "false";
  }, []);

  const press = React.useCallback(() => {
    if (experience.get().pressed) return;
    experience.set({ pressed: true });
    experience.emit({ type: "press" });
  }, []);

  const release = React.useCallback(() => {
    gesture.current.down = false;
    gesture.current.moved = false;
    if (!experience.get().pressed) return;
    experience.set({ pressed: false });
    experience.emit({ type: "release" });
  }, []);

  /**
   * The seam exists in the Invitation chapter and nowhere else — never
   * conditioned on the renderer. When the chapter stops being read the control
   * is hidden with `display: none`, and a hidden element that still holds
   * pointer capture never receives the `pointerup` that would have ended the
   * gesture, so `pressed` would stay true and the sculpted face would keep its
   * compression for the rest of the visit. Handing both back here is what makes
   * scrolling away mid-press a no-op rather than a stuck state.
   */
  React.useEffect(() => {
    if (active) return;
    const node = button.current;
    if (node) {
      for (const pointerId of capturedPointers(node)) {
        try {
          node.releasePointerCapture(pointerId);
        } catch {
          /* the pointer already left; there is nothing to release */
        }
      }
    }
    markDragging(false);
    release();
  }, [active, markDragging, release]);

  const nudge = React.useCallback((delta: number) => {
    const tension = Math.max(0, Math.min(100, experience.get().tension + delta));
    experience.set({ tension });
    experience.emit({ type: "tension", intensity: tension / 100 });
  }, []);

  const onPointerDown = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      gesture.current = {
        x: event.clientX,
        tension: experience.get().tension,
        moved: false,
        down: true,
      };
      markDragging(true);
      press();
      event.currentTarget.setPointerCapture(event.pointerId);
      capturePointer(event.currentTarget, event.pointerId);
    },
    [markDragging, press],
  );

  const onPointerMove = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      const state = gesture.current;
      if (!state.down) return;
      const travel = event.clientX - state.x;
      if (!state.moved && Math.abs(travel) < DRAG_THRESHOLD) return;
      state.moved = true;
      const tension = Math.max(0, Math.min(100, state.tension + travel * TENSION_PER_PIXEL));
      experience.set({ tension });
      experience.emit({ type: "tension", intensity: tension / 100 });
    },
    [],
  );

  const endDrag = React.useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
        releaseCaptured(event.currentTarget, event.pointerId);
      }
      if (gesture.current.moved) experience.emit({ type: "dragRelease" });
      markDragging(false);
      release();
    },
    [markDragging, release],
  );

  return (
    <div
      className="asm-seam"
      data-active={active ? "true" : "false"}
    >
      <div className="asm-seam__plate" ref={attachPlate} data-measured="false">
        <Button
          ref={button}
          variant="accent"
          size="lg"
          className="asm-seam__button"
          tabIndex={active ? undefined : -1}
          aria-describedby="asm-seam-hint"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onPointerLeave={() => {
            if (!gesture.current.down) release();
          }}
          onBlur={release}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") press();
            if (event.key === "ArrowRight") {
              event.preventDefault();
              nudge(KEY_STEP);
            }
            if (event.key === "ArrowLeft") {
              event.preventDefault();
              nudge(-KEY_STEP);
            }
          }}
          onKeyUp={(event) => {
            if (event.key === "Enter" || event.key === " ") release();
          }}
        >
          Create
        </Button>
      </div>
      <span id="asm-seam-hint" className="asm-visually-hidden">
        The same button the catalogue installs, drawn over its sculpted twin. Drag
        horizontally or use the arrow keys to pull the ribbon.
      </span>
    </div>
  );
}
