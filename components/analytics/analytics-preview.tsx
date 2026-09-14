"use client";

import * as React from "react";
import { track, type AnalyticsPlacement } from "@/lib/analytics/client";
import { AnalyticsContext } from "@/components/analytics/analytics-provider";

const interactiveSelector =
  'button,a[href],input,select,textarea,[role="button"],[role="slider"],[role="checkbox"],[role="switch"],[role="tab"]';

export function AnalyticsPreview({
  componentId,
  placement,
  children,
  className,
}: {
  componentId: string;
  placement: AnalyticsPlacement;
  children: React.ReactNode;
  className?: string;
}) {
  const container = React.useRef<HTMLDivElement>(null);
  const analytics = React.useContext(AnalyticsContext);

  React.useEffect(() => {
    const host = container.current;
    const target = className ? host : host?.querySelector('[data-example-role="interactive"]') ?? host?.firstElementChild;
    if (!host || !target || !analytics.route || typeof IntersectionObserver === "undefined") return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let halfVisible = false;
    const cancel = () => {
      if (timer) clearTimeout(timer);
      timer = null;
    };
    const begin = () => {
      cancel();
      if (!halfVisible || document.visibilityState !== "visible" || !target.isConnected) return;
      timer = setTimeout(() => {
        timer = null;
        if (!halfVisible || document.visibilityState !== "visible" || !target.isConnected) return;
        const key = `${componentId}:${placement}`;
        if (analytics.claimImpression(key)) {
          track("component_impression", {
            component_id: componentId,
            placement,
            route: analytics.route!,
          });
        }
      }, 1_000);
    };
    const observer = new IntersectionObserver(([entry]) => {
      halfVisible = Boolean(entry?.isIntersecting && entry.intersectionRatio >= 0.5);
      if (halfVisible) begin();
      else cancel();
    }, { threshold: [0, 0.5] });

    observer.observe(target);
    const handleVisibility = () => {
      if (document.visibilityState === "visible" && halfVisible) begin();
      else cancel();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      cancel();
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [analytics, className, componentId, placement]);

  React.useEffect(() => {
    const host = container.current;
    if (!host || !analytics.route) return;
    const timers = new Map<Element, ReturnType<typeof setTimeout>>();
    const emitVariant = (element: Element) => {
      const variantId = element.getAttribute("data-analytics-variant-id");
      const variantValue = element.getAttribute("data-analytics-variant-value");
      if (!variantId || !variantValue) return;
      track("variant_selected", {
        component_id: componentId,
        placement,
        route: analytics.route!,
        variant_id: variantId as "preview_background",
        variant_value: variantValue,
      });
    };
    const handleClick = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest('[data-slot="copy-button"]')) return;
      const variant = target.closest("[data-analytics-variant-id][data-analytics-variant-value]");
      if (variant) {
        emitVariant(variant);
        return;
      }
      const control = target.closest(interactiveSelector);
      if (!control || !host.contains(control)) return;
      if (!control.closest("[data-example]") && !control.closest("[data-analytics-interaction]")) return;
      track("demo_interacted", {
        component_id: componentId,
        placement,
        route: analytics.route!,
        interaction_kind: "activate",
      });
    };
    const handleChange = (event: Event) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target) return;
      const variant = target.closest("[data-analytics-variant-id][data-analytics-variant-value]");
      if (variant) {
        const prior = timers.get(variant);
        if (prior) clearTimeout(prior);
        timers.set(variant, setTimeout(() => {
          timers.delete(variant);
          emitVariant(variant);
        }, 250));
        return;
      }
      const control = target.closest(interactiveSelector);
      if (!control || !host.contains(control)) return;
      if (!control.closest("[data-example]") && !control.closest("[data-analytics-interaction]")) return;
      track("demo_interacted", {
        component_id: componentId,
        placement,
        route: analytics.route!,
        interaction_kind: "change",
      });
    };
    host.addEventListener("click", handleClick);
    host.addEventListener("change", handleChange);
    return () => {
      host.removeEventListener("click", handleClick);
      host.removeEventListener("change", handleChange);
      for (const timer of timers.values()) clearTimeout(timer);
    };
  }, [analytics.route, componentId, placement]);

  return (
    <div
      ref={container}
      className={className}
      data-analytics-preview={componentId}
      data-analytics-placement={placement}
      style={className ? undefined : { display: "contents" }}
    >
      {children}
    </div>
  );
}
