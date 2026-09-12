"use client";
import * as React from "react";
import { cn } from "../lib/utils";
import { Button } from "./button";
import { Icon } from "./icon";
import { useMotionVisibility } from "../motion/use-motion-visibility";
import { useMorph } from "../motion/use-morph";
import {
  useGalleryRef,
  useGallerySelection,
} from "../lib/reference-gallery-motion";
export type OptionWheelItem = {
  id: string;
  label: string;
  description?: string;
};
export type OptionWheelProps = Omit<React.ComponentProps<"div">, "onChange"> & {
  items: readonly OptionWheelItem[];
  defaultIndex?: number;
  selectedIndex?: number;
  onSelectionChange?: (index: number) => void;
  side?: "left" | "right";
  /** Same selection, arranged as a rotary arc, aligned reel or compact readout. */
  presentation?: "arc" | "reel" | "compact";
};
function WheelSlot(props: React.ComponentProps<"div">) {
  const ref = useMorph<HTMLDivElement>("buttons");
  return (
    <div
      ref={ref}
      data-stable-hit=""
      data-r="18"
      data-morph={props["aria-selected"] ? "fill" : "none"}
      {...props}
    />
  );
}
export function OptionWheel({
  items,
  defaultIndex = 0,
  selectedIndex,
  onSelectionChange,
  side = "left",
  presentation = "arc",
  className,
  ref,
  ...props
}: OptionWheelProps) {
  const host = React.useRef<HTMLDivElement>(null),
    id = React.useId();
  const { enabled, inView } = useMotionVisibility(host);
  const { selected, select } = useGallerySelection(
    items.length,
    defaultIndex,
    selectedIndex,
    onSelectionChange,
  );
  const stage = React.useRef<HTMLDivElement>(null);
  const wheelGesture = React.useRef({
    amount: 0,
    last: 0,
    direction: 0,
    eventTime: 0,
  });
  React.useEffect(() => {
    const node = stage.current;
    if (!node) return;
    // React's delegated wheel listener is passive. Own only this bounded rotary
    // region, and release the native page scroll before the first/after the last.
    const wheel = (event: WheelEvent) => {
      if (
        event.defaultPrevented ||
        event.ctrlKey ||
        Math.abs(event.deltaX) >= Math.abs(event.deltaY) ||
        !event.deltaY ||
        items.length < 2
      )
        return;
      const direction = Math.sign(event.deltaY);
      if (selected + direction < 0 || selected + direction >= items.length)
        return;
      event.preventDefault();
      const now = performance.now(),
        gesture = wheelGesture.current;
      if (gesture.direction !== direction || now - gesture.eventTime > 180) {
        gesture.amount = 0;
        gesture.last = 0;
      }
      gesture.direction = direction;
      gesture.eventTime = now;
      if (now - gesture.last < 100) return;
      gesture.amount +=
        Math.abs(event.deltaY) *
        (event.deltaMode === 1
          ? 16
          : event.deltaMode === 2
            ? node.clientHeight
            : 1);
      if (gesture.amount >= 40) {
        gesture.amount = 0;
        gesture.last = now;
        select(selected + direction);
      }
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, [items.length, selected, select]);
  const key = (event: React.KeyboardEvent<HTMLDivElement>) => {
    let next = selected;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") next++;
    else if (event.key === "ArrowUp" || event.key === "ArrowLeft") next--;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = items.length - 1;
    else return;
    event.preventDefault();
    select(next);
  };
  return (
    <div
      {...props}
      ref={useGalleryRef(host, ref)}
      data-slot="option-wheel"
      data-motion={enabled && inView ? "on" : "off"}
      data-side={side}
      data-presentation={presentation}
      data-selected-index={selected}
      className={cn("v-option-wheel", className)}
    >
      <div className="v-option-wheel__heading" aria-hidden="true">
        <span>Find your direction</span>
        <span>
          {items.length ? String(selected + 1).padStart(2, "0") : "00"}{" "}
          <i>/ {String(items.length).padStart(2, "0")}</i>
        </span>
      </div>
      <div
        ref={stage}
        role="listbox"
        aria-label={props["aria-label"] ?? "Choose an option"}
        aria-activedescendant={selected >= 0 ? `${id}-${selected}` : undefined}
        tabIndex={items.length ? 0 : -1}
        onKeyDown={key}
        className="v-option-wheel__stage"
      >
        <div aria-hidden="true" className="v-option-wheel__dial">
          <span />
          <i />
          <i />
          <i />
        </div>
        <span aria-hidden="true" className="v-option-wheel__marker">
          <Icon
            name={side === "right" ? "arrow-left" : "arrow-right"}
            size="sm"
          />
        </span>
        {(presentation === "compact" ? [0] : [-2, -1, 0, 1, 2]).map((d) => {
          const index = selected + d,
            item = items[index];
          if (!item) return null;
          return (
            <WheelSlot
              key={d}
              id={`${id}-${index}`}
              role="option"
              aria-selected={index === selected}
              aria-posinset={index + 1}
              aria-setsize={items.length}
              data-distance={d}
              onClick={() => {
                select(index);
                stage.current?.focus({ preventScroll: true });
              }}
              className="v-option-wheel__option"
              style={
                {
                  "--wheel-distance": d,
                  "--wheel-bend": Math.abs(d) * Math.abs(d) * 5 + "px",
                  "--wheel-tilt": (side === "left" ? -1 : 1) * d * 3 + "deg",
                } as React.CSSProperties
              }
            >
              <span key={item.id} className="v-option-wheel__label">
                {item.label}
              </span>
            </WheelSlot>
          );
        })}
        {!items.length && <p>No options available.</p>}
      </div>
      <div className="v-option-wheel__footer">
        <Button
          variant="outline"
          data-stable-hit=""
          className="v-option-wheel__control"
          type="button"
          aria-label="Previous option"
          disabled={items.length < 2}
          onClick={() => select(selected - 1)}
        >
          <Icon name="arrow-up" size="sm" />
        </Button>
        <p role="status">
          {items[selected]?.description ??
            items[selected]?.label ??
            "No selection"}
        </p>
        <Button
          variant="secondary"
          data-stable-hit=""
          className="v-option-wheel__control"
          type="button"
          aria-label="Next option"
          disabled={items.length < 2}
          onClick={() => select(selected + 1)}
        >
          <Icon name="arrow-down" size="sm" />
        </Button>
      </div>
    </div>
  );
}
