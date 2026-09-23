"use client";
import * as React from "react";
import { Button } from "@/registry/cojeev/ui/button";
import {
  FLOW_DEFAULTS,
  getSettingsSnapshot,
  setFlowSettings,
  setMotionMode,
} from "@/registry/cojeev/motion/settings";
import { experience, useExperienceValue } from "./experience-store";
import { faceRect, paintFace, registerFace } from "./seam-bus";
import {
  dragTension,
  HERO_DRAG_THRESHOLD,
  heroInteraction,
  heroPointer,
  requestHeroFrame,
  type DrawerId,
  type HeroControlId,
} from "./hero-interaction";
const HeroDrawer = React.lazy(() => import("./hero-drawer"));

function Face({
  id,
  children,
}: {
  id: HeroControlId;
  children: React.ReactNode;
}) {
  const attach = React.useCallback(
    (node: HTMLDivElement | null) => {
      registerFace(id, node ? (rect) => paintFace(node, rect) : null);
    },
    [id],
  );
  return (
    <div
      className={`asm-hero-face asm-hero-face--${id}`}
      data-face={id}
      data-measured="false"
      ref={attach}
    >
      {children}
    </div>
  );
}
function DrawerIcon({ id }: { id: DrawerId }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      aria-hidden="true"
    >
      {id === "layout" ? (
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      ) : id === "content" ? (
        <>
          <path d="M6 2h8l4 4v16H6zM14 2v5h4M9 12h6M9 16h6" />
        </>
      ) : (
        <path d="m14 2-9 12h6l-1 8 9-13h-6z" />
      )}
    </svg>
  );
}
export function CreateSeam({ active }: { active: boolean }) {
  const motion = useExperienceValue((s) => s.motionOn);
  const tension = useExperienceValue((s) => s.tension);
  const drawer = useExperienceValue((s) => s.heroDrawer);
  const webgl = useExperienceValue((s) => s.webgl);
  const buttons = React.useRef<
    Partial<Record<HeroControlId, HTMLButtonElement | null>>
  >({});
  const gesture = React.useRef<{
    node: HTMLElement;
    pointer: number;
    id: "create" | "slider";
    x: number;
    y: number;
    value: number;
    axis: { x: number; y: number; length: number };
    moved: boolean;
  } | null>(null);
  const clearCapture = React.useCallback(() => {
    const g = gesture.current;
    gesture.current = null;
    if (g?.node.hasPointerCapture(g.pointer))
      g.node.releasePointerCapture(g.pointer);
  }, []);
  const close = React.useCallback(() => {
    const id = experience.get().heroDrawer;
    experience.set({ heroDrawer: null });
    heroInteraction.release();
    if (id) buttons.current[id]?.focus({ preventScroll: true });
  }, []);
  React.useEffect(() => heroInteraction.register(clearCapture), [clearCapture]);
  React.useEffect(() => {
    const stage = document.querySelector<HTMLElement>(".asm-hero-space");
    const shell = document.querySelector<HTMLElement>(".asm");
    if (!stage || !shell) return;
    const measure = () => {
      const r = stage.getBoundingClientRect();
      shell.style.setProperty(
        "--hero-stage-top",
        `${r.top + window.scrollY}px`,
      );
      shell.style.setProperty(
        "--hero-preview-top",
        `${r.bottom + window.scrollY}px`,
      );
    };
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    window.addEventListener("resize", measure);
    measure();
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);
  React.useEffect(() => {
    if (!active) heroInteraction.cancel();
  }, [active]);
  React.useEffect(() => {
    const cancel = () => heroInteraction.cancel();
    const scroll = () => {
      const reveal = heroPointer.revealY;
      heroPointer.revealY = null;
      if (reveal !== null && Math.abs(window.scrollY - reveal) <= 1) return;
      cancel();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (experience.get().heroDrawer) close();
        else cancel();
      }
    };
    const visibility = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("scroll", scroll, { passive: true });
    window.addEventListener("blur", cancel);
    window.addEventListener("pagehide", cancel);
    window.addEventListener("keydown", escape);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      cancel();
      window.removeEventListener("scroll", scroll);
      window.removeEventListener("blur", cancel);
      window.removeEventListener("pagehide", cancel);
      window.removeEventListener("keydown", escape);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [close]);
  const end = () => {
    const moved = gesture.current?.moved;
    clearCapture();
    heroInteraction.release();
    experience.emit({ type: moved ? "dragRelease" : "release" });
  };
  const down = (
    id: "create" | "slider",
    event: React.PointerEvent<HTMLElement>,
  ) => {
    if (event.button !== 0) return;
    if (experience.get().heroDrawer) experience.set({ heroDrawer: null });
    const rect = faceRect(id);
    const corners = rect?.corners;
    const dx = corners
      ? corners[1].x - corners[0].x
      : event.currentTarget.clientWidth;
    const dy = corners ? corners[1].y - corners[0].y : 0;
    let length = Math.hypot(dx, dy);
    let value = experience.get().tension;
    if (id === "slider") {
      const origin =
        corners?.[0] ?? event.currentTarget.getBoundingClientRect();
      const along =
        ((event.clientX - origin.x) * dx + (event.clientY - origin.y) * dy) /
        length;
      const inset = corners ? (length * 0.04) / 0.76 : 0;
      if (corners) length *= 0.68 / 0.76;
      value = Math.max(0, Math.min(100, ((along - inset) / length) * 100));
      experience.set({ tension: value });
    }
    const axisLength = Math.hypot(dx, dy);
    gesture.current = {
      node: event.currentTarget,
      pointer: event.pointerId,
      id,
      x: event.clientX,
      y: event.clientY,
      value,
      axis: { x: dx / axisLength, y: dy / axisLength, length },
      moved: false,
    };
    heroInteraction.activate(id);
    experience.set({ pressed: id === "create" });
    if (id === "create") experience.emit({ type: "press" });
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const move = (event: React.PointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g) return;
    const dx = event.clientX - g.x,
      dy = event.clientY - g.y;
    if (!g.moved && Math.abs(dx) < HERO_DRAG_THRESHOLD) return;
    if (!g.moved) {
      g.moved = true;
      heroInteraction.acquired();
    }
    const area = document
      .querySelector(".asm-hero-space")
      ?.getBoundingClientRect();
    const inArea =
      window.innerWidth < 900 && area
        ? event.clientY >= area.top &&
          event.clientY <= area.bottom &&
          event.clientX >= 0 &&
          event.clientX <= window.innerWidth
        : event.clientX >= window.innerWidth * 0.43 &&
          event.clientX <= window.innerWidth &&
          event.clientY >= 150 &&
          event.clientY <= window.innerHeight - 100;
    if (!inArea) {
      end();
      return;
    }
    heroPointer.x = event.clientX;
    heroPointer.y = event.clientY;
    heroPointer.active = g.id === "create";
    /* Nothing above changes React state, so the on-demand loop has to be told
     * a frame is owed or the drag stops drawing the moment it settles. */
    requestHeroFrame();
    const value = dragTension(g.value, dx, dy, g.axis);
    experience.set({ tension: value });
    experience.emit({ type: "tension", intensity: value / 100 });
  };
  return (
    <div
      className="asm-hero-controls"
      data-active={active}
      data-fallback={webgl !== "ready"}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          heroInteraction.cancel();
      }}
    >
      <div className="asm-hero-faces">
        <Face id="create">
          <Button
            ref={(node) => {
              buttons.current.create = node as HTMLButtonElement | null;
            }}
            className="asm-seam__button"
            variant="accent"
            aria-describedby="asm-play-instructions"
            onPointerDown={(e) => down("create", e)}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={() => heroInteraction.cancel()}
            onLostPointerCapture={() => {
              if (gesture.current) heroInteraction.cancel();
            }}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                if (!e.repeat) {
                  heroInteraction.activate("create");
                  experience.set({ pressed: true });
                  experience.emit({ type: "press" });
                }
              }
              if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
                e.preventDefault();
                heroInteraction.activate("create");
                experience.set({
                  tension: Math.max(
                    0,
                    Math.min(100, tension + (e.key === "ArrowRight" ? 4 : -4)),
                  ),
                });
              }
            }}
            onKeyUp={(e) => {
              if ([" ", "Enter", "ArrowLeft", "ArrowRight"].includes(e.key))
                end();
            }}
          >
            Create <span aria-hidden="true">↗</span>
          </Button>
        </Face>
        <Face id="switch">
          <button
            type="button"
            role="switch"
            aria-checked={motion}
            aria-label="Playful motion"
            onClick={() => {
              const next = !experience.get().motionOn;
              if (next && getSettingsSnapshot().flow.variant === "off")
                setFlowSettings({ variant: FLOW_DEFAULTS.variant });
              setMotionMode(next ? "subtle" : "off");
              experience.set({ motionOn: next });
              heroInteraction.activate("switch");
              if (!next) heroInteraction.release();
            }}
          >
            <span className="asm-switch-label">
              {motion ? "Playful" : "Still"}
            </span>
          </button>
        </Face>
        <Face id="slider">
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(tension)}
            aria-label="Ribbon tension"
            aria-valuetext={`${Math.round(tension)} percent`}
            onPointerDown={(e) => {
              e.preventDefault();
              down("slider", e);
            }}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={() => heroInteraction.cancel()}
            onChange={(e) => {
              if (!gesture.current)
                experience.set({ tension: Number(e.target.value) });
            }}
            onKeyDown={() => heroInteraction.activate("slider")}
            onKeyUp={() => heroInteraction.release()}
          />
          <output className="asm-slider-value">{Math.round(tension)}</output>
        </Face>
        {(["layout", "content", "actions"] as DrawerId[]).map((id) => (
          <Face key={id} id={id}>
            <button
              ref={(node) => {
                buttons.current[id] = node;
              }}
              type="button"
              aria-expanded={drawer === id}
              aria-controls={drawer === id ? "asm-drawer-panel" : undefined}
              onClick={() => {
                if (drawer === id) close();
                else {
                  heroInteraction.activate(id);
                  experience.set({ heroDrawer: id });
                }
              }}
            >
              <DrawerIcon id={id} />
              <span>{id[0].toUpperCase() + id.slice(1)}</span>
              <span aria-hidden="true">›</span>
            </button>
          </Face>
        ))}
      </div>
      <p id="asm-play-instructions" className="asm-visually-hidden">
        Press Create with Enter or Space. Pull horizontally or use arrow keys to
        change ribbon tension. Escape returns to the resting view.
      </p>
      {drawer && (
        <div id="asm-drawer-panel">
          <React.Suspense
            fallback={
              <div className="asm-drawer-preview" role="status">
                Opening your component… <button onClick={close}>Close</button>
              </div>
            }
          >
            <HeroDrawer key={drawer} id={drawer} close={close} />
          </React.Suspense>
        </div>
      )}
    </div>
  );
}
