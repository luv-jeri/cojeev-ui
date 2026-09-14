"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/cojeev/lib/utils";
import {
  Icon,
  IconButton,
  type IconButtonProps,
} from "@/registry/cojeev/ui/icon";
import { useFlowGroup } from "@/registry/cojeev/motion/use-flow";
import { Button } from "@/registry/cojeev/ui/button";
import { ScrollArea, ScrollBar } from "@/registry/cojeev/ui/scroll-area";
import { assignMotionRef } from "@/registry/cojeev/motion/refs";
import { useChoreography } from "@/registry/cojeev/motion/choreography";
export type CarouselPresentation = "shelf" | "story" | "index";
type CarouselState = {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  count: number;
  current: number;
  canPrevious: boolean;
  canNext: boolean;
  update: () => void;
  scroll: (direction: number) => void;
  scrollTo: (index: number) => void;
  refresh: () => void;
  interrupt: () => void;
  settle: () => void;
  presentation?: CarouselPresentation;
  direction?: "ltr" | "rtl";
};
function slidesIn(viewport: HTMLDivElement): HTMLElement[] {
  const row = Array.from(
    viewport.querySelectorAll<HTMLElement>("[data-carousel-items]"),
  ).find((node) => node.closest('[data-slot="carousel-content"]') === viewport);
  return Array.from((row ?? viewport).children).filter(
    (node): node is HTMLElement => node instanceof HTMLElement,
  );
}
function slidePosition(viewport: HTMLDivElement, slide: HTMLElement) {
  const view = viewport.getBoundingClientRect(),
    rect = slide.getBoundingClientRect(),
    css = getComputedStyle(viewport);
  const rtl = css.direction === "rtl",
    room = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
  const padding =
    parseFloat(rtl ? css.scrollPaddingRight : css.scrollPaddingLeft) || 0;
  const left =
    viewport.scrollLeft +
    (rtl
      ? rect.right - view.right + viewport.clientLeft + padding
      : rect.left - view.left - viewport.clientLeft - padding);
  return rtl
    ? Math.max(-room, Math.min(0, left))
    : Math.max(0, Math.min(room, left));
}
const CarouselContext = React.createContext<CarouselState | null>(null);
export function useCarousel() {
  const state = React.useContext(CarouselContext);
  if (!state) throw new Error("Carousel parts must be inside Carousel");
  return state;
}
export const carouselVariants = cva("v-carousel relative min-w-0");
export type CarouselProps = React.ComponentProps<"div"> & {
  onIndexChange?: (index: number) => void;
  presentation?: CarouselPresentation;
};
export function Carousel({
  className,
  children,
  onIndexChange,
  presentation,
  ...props
}: CarouselProps) {
  const { quiet } = useChoreography();
  const viewportRef = React.useRef<HTMLDivElement>(null);
  const currentRef = React.useRef(0),
    lastPosition = React.useRef(NaN);
  const intent = React.useRef<{ index: number; position: number } | null>(null);
  const indexCallback = React.useRef(onIndexChange);
  React.useEffect(() => {
    indexCallback.current = onIndexChange;
  }, [onIndexChange]);
  const [state, setState] = React.useState({
    count: 0,
    current: 0,
    canPrevious: false,
    canNext: false,
  });
  const update = React.useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const children = slidesIn(el),
      room = Math.max(0, el.scrollWidth - el.clientWidth);
    let current = currentRef.current;
    if (intent.current) {
      current = intent.current.index;
      if (Math.abs(el.scrollLeft - intent.current.position) < 2)
        intent.current = null;
    } else if (
      room > 1 &&
      (!Number.isFinite(lastPosition.current) ||
        Math.abs(lastPosition.current - el.scrollLeft) > 0.5)
    ) {
      let distance = Infinity;
      children.forEach((child, index) => {
        const next = Math.abs(slidePosition(el, child) - el.scrollLeft);
        if (next <= distance) {
          distance = next;
          current = index;
        }
      });
    }
    current = Math.max(0, Math.min(children.length - 1, current));
    currentRef.current = current;
    lastPosition.current = el.scrollLeft;
    setState((old) => {
      const next = {
        count: children.length,
        current,
        canPrevious: room > 1 && current > 0,
        canNext: room > 1 && current < children.length - 1,
      };
      return Object.keys(next).every(
        (key) =>
          next[key as keyof typeof next] === old[key as keyof typeof next],
      )
        ? old
        : next;
    });
  }, []);
  const activeIndex = state.current;
  React.useEffect(() => {
    indexCallback.current?.(activeIndex);
  }, [activeIndex]);
  const seek = React.useCallback(
    (index: number, behavior: ScrollBehavior) => {
      if (!Number.isFinite(index)) return;
      const el = viewportRef.current;
      if (!el) return;
      const children = slidesIn(el),
        next = Math.max(0, Math.min(children.length - 1, Math.floor(index))),
        child = children[next];
      if (!child) {
        update();
        return;
      }
      const position = slidePosition(el, child);
      intent.current = { index: next, position };
      currentRef.current = next;
      el.scrollTo({ left: position, behavior });
      update();
    },
    [update],
  );
  const scrollTo = (index: number) => seek(index, quiet ? "instant" : "smooth");
  const scroll = (direction: number) => {
    if (Number.isFinite(direction))
      scrollTo(currentRef.current + Math.sign(direction));
  };
  const refresh = React.useCallback(() => {
    const el = viewportRef.current;
    if (!el) return;
    const width = `${el.clientWidth}px`;
    if (el.style.getPropertyValue("--carousel-viewport-width") !== width)
      el.style.setProperty("--carousel-viewport-width", width);
    seek(currentRef.current, "instant");
  }, [seek]);
  const interrupt = () => {
    intent.current = null;
  };
  const settle = () => {
    if (intent.current) {
      intent.current = null;
      lastPosition.current = NaN;
      update();
    }
  };
  return (
    <CarouselContext.Provider
      value={{
        viewportRef,
        ...state,
        update,
        scroll,
        scrollTo,
        refresh,
        interrupt,
        settle,
        presentation,
        direction:
          props.dir === "rtl" ? "rtl" : props.dir === "ltr" ? "ltr" : undefined,
      }}
    >
      <div
        data-slot="carousel"
        data-part="root"
        data-carousel=""
        data-presentation={presentation}
        data-motion={quiet ? "off" : undefined}
        role="region"
        aria-roledescription="carousel"
        className={cn(carouselVariants(), className)}
        {...props}
      >
        {children}
      </div>
    </CarouselContext.Provider>
  );
}
export type CarouselContentProps = React.ComponentProps<"div"> & {
  /** Keep the native viewport, with the shared organic horizontal scrollbar. */ scrollbar?: boolean;
};
export function CarouselContent({
  ref,
  className,
  onScroll,
  onKeyDown,
  onPointerDown,
  onWheel,
  children,
  scrollbar = false,
  ...props
}: CarouselContentProps) {
  const carousel = useCarousel();
  const { viewportRef, update, refresh, presentation } = carousel;
  const [inheritedDirection, setInheritedDirection] = React.useState<
    "ltr" | "rtl"
  >("ltr");
  const direction =
    props.dir === "rtl" || props.dir === "ltr"
      ? props.dir
      : (carousel.direction ?? inheritedDirection);
  React.useLayoutEffect(() => {
    if (
      !scrollbar ||
      carousel.direction ||
      props.dir === "rtl" ||
      props.dir === "ltr"
    )
      return;
    const root = viewportRef.current?.closest<HTMLElement>(
      '[data-slot="carousel"]',
    );
    if (!root) return;
    const read = () =>
      setInheritedDirection(
        getComputedStyle(root).direction === "rtl" ? "rtl" : "ltr",
      );
    read();
    const observer = new MutationObserver(read);
    for (let node: HTMLElement | null = root; node; node = node.parentElement)
      observer.observe(node, { attributes: true, attributeFilter: ["dir"] });
    return () => observer.disconnect();
  }, [viewportRef, scrollbar, carousel.direction, props.dir]);
  const settleTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const bindRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      viewportRef.current = node;
      const release = assignMotionRef(ref, node);
      return () => {
        viewportRef.current = null;
        release();
      };
    },
    [viewportRef, ref],
  );
  React.useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(refresh);
    const observe = () => {
      ro.disconnect();
      ro.observe(el);
      slidesIn(el).forEach((child) => ro.observe(child));
      refresh();
    };
    const row =
      Array.from(
        el.querySelectorAll<HTMLElement>("[data-carousel-items]"),
      ).find((node) => node.closest('[data-slot="carousel-content"]') === el) ??
      el;
    const mo = new MutationObserver(observe);
    mo.observe(row, { childList: true });
    observe();
    return () => {
      ro.disconnect();
      mo.disconnect();
      if (settleTimer.current) clearTimeout(settleTimer.current);
    };
  }, [viewportRef, refresh, scrollbar, presentation, direction]);
  const attributes: React.ComponentProps<"div"> = {
    ...props,
    ref: bindRef,
    ...{ "data-slot": "carousel-content", "data-part": "viewport" },
    tabIndex: props.tabIndex ?? 0,
    className: cn(
      scrollbar
        ? "v-carousel__viewport"
        : "v-carousel__track flex min-w-0 gap-[var(--s-4)] overflow-x-auto overflow-y-hidden [scroll-snap-type:x_mandatory] pt-[2px] px-[2px] pb-[6px] mt-[-2px] mx-[-2px] [scrollbar-width:none] [scroll-padding-inline:2px]",
      className,
    ),
    onScroll: (event) => {
      update();
      onScroll?.(event);
      if (settleTimer.current) clearTimeout(settleTimer.current);
      settleTimer.current = setTimeout(carousel.settle, 140);
    },
    onPointerDown: (event) => {
      carousel.interrupt();
      onPointerDown?.(event);
    },
    onWheel: (event) => {
      carousel.interrupt();
      onWheel?.(event);
    },
    onKeyDown: (event) => {
      onKeyDown?.(event);
      if (
        event.defaultPrevented ||
        event.target !== event.currentTarget ||
        !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
      )
        return;
      event.preventDefault();
      if (event.key === "Home") carousel.scrollTo(0);
      else if (event.key === "End") carousel.scrollTo(carousel.count - 1);
      else
        carousel.scroll(
          (event.key === "ArrowLeft" ? -1 : 1) *
            (getComputedStyle(event.currentTarget).direction === "rtl"
              ? -1
              : 1),
        );
    },
  };
  return scrollbar ? (
    <ScrollArea
      variant="plain"
      className="v-carousel-scroll"
      style={{ "--h": "none" } as React.CSSProperties}
      dir={direction}
      viewportProps={{
        ...attributes,
        role: props.role ?? "group",
        "aria-label": props["aria-label"] ?? "Slides",
      }}
      viewportWrapper={(viewport) => (
        <>
          {viewport}
          <ScrollBar orientation="horizontal" />
        </>
      )}
    >
      <div data-carousel-items="" className="v-carousel__items">
        {children}
      </div>
    </ScrollArea>
  ) : (
    <div {...attributes}>{children}</div>
  );
}
export type CarouselItemProps = React.ComponentProps<"div"> & {
  asChild?: boolean;
};
export function CarouselItem({
  className,
  asChild,
  ...props
}: CarouselItemProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      {...(!asChild ? { "data-slot": "carousel-item" } : {})}
      data-carousel-item=""
      data-part="item"
      role="group"
      aria-roledescription="slide"
      className={cn("shrink-0 grow-0 basis-auto snap-start", className)}
      {...props}
    />
  );
}
export type CarouselNavigationProps = React.ComponentProps<"div">;
export function CarouselNavigation({
  className,
  ...props
}: CarouselNavigationProps) {
  return (
    <div
      data-slot="carousel-navigation"
      className={cn(
        "v-carousel__nav flex items-center justify-between gap-[var(--s-2)] mt-[12px]",
        className,
      )}
      {...props}
    />
  );
}
export type CarouselPreviousProps = IconButtonProps;
export function CarouselPrevious({
  children,
  onClick,
  disabled,
  ...props
}: CarouselPreviousProps) {
  const carousel = useCarousel();
  return (
    <IconButton
      data-slot="carousel-previous"
      data-part="trigger"
      aria-label="Previous slide"
      disabled={disabled || !carousel.canPrevious}
      data-stable-hit=""
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) carousel.scroll(-1);
      }}
      {...props}
    >
      {children ?? <Icon name="arrow-left" />}
    </IconButton>
  );
}
export type CarouselNextProps = IconButtonProps;
export function CarouselNext({
  children,
  onClick,
  disabled,
  ...props
}: CarouselNextProps) {
  const carousel = useCarousel();
  return (
    <IconButton
      data-slot="carousel-next"
      data-part="trigger"
      aria-label="Next slide"
      disabled={disabled || !carousel.canNext}
      data-stable-hit=""
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) carousel.scroll(1);
      }}
      {...props}
    >
      {children ?? <Icon name="arrow-right" />}
    </IconButton>
  );
}
export type CarouselDotsProps = React.ComponentProps<"div">;
export function CarouselDots({
  ref,
  className,
  children,
  ...props
}: CarouselDotsProps) {
  const carousel = useCarousel();
  const flowRef = useFlowGroup<HTMLDivElement>(ref);
  return (
    <div
      ref={flowRef}
      data-slot="carousel-dots"
      data-flow="off"
      className={cn(
        "v-carousel__dots flex flex-wrap items-center gap-[2px] mr-auto",
        className,
      )}
      role="group"
      aria-label="Tiles"
      {...props}
    >
      {children ??
        Array.from({ length: carousel.count }, (_, index) => (
          <CarouselDot key={index} index={index} />
        ))}
    </div>
  );
}
export type CarouselDotProps = React.ComponentProps<"button"> & {
  index: number;
};
export function CarouselDot({
  index,
  onClick,
  className,
  children,
  disabled,
  ...props
}: CarouselDotProps) {
  const carousel = useCarousel();
  return (
    <Button
      data-slot="carousel-dot"
      data-part="indicator"
      type="button"
      variant="ghost"
      data-stable-hit=""
      data-morph="none"
      disabled={
        disabled ||
        !Number.isInteger(index) ||
        index < 0 ||
        index >= carousel.count
      }
      aria-label={`Tile ${index + 1}`}
      aria-current={carousel.current === index ? "true" : undefined}
      className={cn(
        "v-carousel__dot size-[44px] p-0 [border:0] bg-transparent",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) carousel.scrollTo(index);
      }}
      {...props}
    >
      {children ?? <span className="v-carousel__dot-mark" aria-hidden="true" />}
    </Button>
  );
}
export type CarouselDeckProps = React.ComponentProps<"div">;
export function CarouselDeck({ className, ...props }: CarouselDeckProps) {
  return (
    <div
      data-slot="carousel-deck"
      className={cn(
        "v-deck relative isolate h-auto min-h-[180px] pt-[22px] pr-[26px]",
        className,
      )}
      {...props}
    />
  );
}
