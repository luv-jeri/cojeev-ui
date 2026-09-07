"use client";
import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva } from "class-variance-authority";
import { cn } from "@/registry/sahajiv/lib/utils";
import {
  Icon,
  IconButton,
  type IconButtonProps,
} from "@/registry/sahajiv/ui/icon";
import { useFlowGroup } from "@/registry/sahajiv/motion/use-flow";
type CarouselState = {
  viewportRef: React.RefObject<HTMLDivElement | null>;
  count: number;
  current: number;
  canPrevious: boolean;
  canNext: boolean;
  update: () => void;
  scroll: (direction: number) => void;
  scrollTo: (index: number) => void;
};
const CarouselContext = React.createContext<CarouselState | null>(null);
export function useCarousel() {
  const state = React.useContext(CarouselContext);
  if (!state) throw new Error("Carousel parts must be inside Carousel");
  return state;
}
export const carouselVariants = cva("v-carousel relative min-w-0");
export type CarouselProps = React.ComponentProps<"div"> & {
  onIndexChange?: (index: number) => void;
};
export function Carousel({
  className,
  children,
  onIndexChange,
  ...props
}: CarouselProps) {
  const viewportRef = React.useRef<HTMLDivElement>(null);
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
    const children = Array.from(el.children) as HTMLElement[];
    const current = children.reduce(
      (best, child, index) =>
        Math.abs(child.offsetLeft - el.offsetLeft - el.scrollLeft) <
        Math.abs(children[best].offsetLeft - el.offsetLeft - el.scrollLeft)
          ? index
          : best,
      0,
    );
    setState((old) => {
      const next = {
        count: children.length,
        current,
        canPrevious: el.scrollLeft >= 4,
        canNext: el.scrollLeft + el.clientWidth <= el.scrollWidth - 4,
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
  const behavior = (): ScrollBehavior =>
    matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
  const scroll = (direction: number) => {
    const el = viewportRef.current;
    if (el)
      el.scrollBy({
        left:
          direction *
          ((el.firstElementChild as HTMLElement)?.offsetWidth + 16 || 240),
        behavior: behavior(),
      });
  };
  const scrollTo = (index: number) => {
    const el = viewportRef.current;
    const child = el?.children[index] as HTMLElement | undefined;
    if (el && child)
      el.scrollTo({
        left: child.offsetLeft - el.offsetLeft,
        behavior: behavior(),
      });
  };
  return (
    <CarouselContext.Provider
      value={{ viewportRef, ...state, update, scroll, scrollTo }}
    >
      <div
        data-slot="carousel"
        data-part="root"
        data-carousel=""
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
export type CarouselContentProps = React.ComponentProps<"div">;
export function CarouselContent({
  ref,
  className,
  onScroll,
  onKeyDown,
  ...props
}: CarouselContentProps) {
  const carousel = useCarousel();
  const { viewportRef, update } = carousel;
  React.useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    const mo = new MutationObserver(update);
    mo.observe(el, { childList: true });
    return () => {
      ro.disconnect();
      mo.disconnect();
    };
  }, [viewportRef, update]);
  return (
    <div
      ref={(node) => {
        viewportRef.current = node;
        if (typeof ref === "function") return ref(node);
        if (ref) ref.current = node;
      }}
      data-slot="carousel-content"
      data-part="viewport"
      tabIndex={0}
      className={cn(
        "v-carousel__track flex min-w-0 gap-[var(--s-4)] overflow-x-auto overflow-y-hidden [scroll-snap-type:x_mandatory] pt-[2px] px-[2px] pb-[6px] mt-[-2px] mx-[-2px] [scrollbar-width:none] [scroll-padding-inline:2px]",
        className,
      )}
      onScroll={(event) => {
        update();
        onScroll?.(event);
      }}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (
          event.defaultPrevented ||
          !["ArrowLeft", "ArrowRight"].includes(event.key)
        )
          return;
        event.preventDefault();
        carousel.scroll(event.key === "ArrowLeft" ? -1 : 1);
      }}
      {...props}
    />
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
      data-slot="carousel-item"
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
  ...props
}: CarouselPreviousProps) {
  const carousel = useCarousel();
  return (
    <IconButton
      data-slot="carousel-previous"
      data-part="trigger"
      aria-label="Previous slide"
      disabled={!carousel.canPrevious}
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
  ...props
}: CarouselNextProps) {
  const carousel = useCarousel();
  return (
    <IconButton
      data-slot="carousel-next"
      data-part="trigger"
      aria-label="Next slide"
      disabled={!carousel.canNext}
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
      className={cn(
        "v-carousel__dots flex items-center gap-[6px] mr-auto",
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
  ...props
}: CarouselDotProps) {
  const carousel = useCarousel();
  return (
    <button
      data-slot="carousel-dot"
      data-part="indicator"
      type="button"
      aria-label={`Tile ${index + 1}`}
      aria-current={carousel.current === index ? "true" : undefined}
      className={cn(
        "size-[8px] p-0 border-0 rounded-full bg-[var(--v-border)]",
        className,
      )}
      onClick={(event) => {
        onClick?.(event);
        if (!event.defaultPrevented) carousel.scrollTo(index);
      }}
      {...props}
    />
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
