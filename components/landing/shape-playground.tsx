"use client";

import * as React from "react";
import { AnalyticsPreview } from "@/components/analytics/analytics-preview";
import { track } from "@/lib/analytics/client";
import { ShapeStudio } from "@/components/studios/shape-studio";
import { FloatLayer } from "@/registry/cojeev/ui/float-layer";
import { Body, Meta, SectionTitle } from "@/registry/cojeev/ui/typography";
import { MarketingLink } from "./marketing-shell";

/** Landing and docs deliberately share one complete editor. */
export function ShapePlayground() {
  const id = React.useId();
  return (
    <section
      className="shape-workbench-section story-section"
      aria-labelledby={id}
    >
      <FloatLayer
        depth={0}
        drift={0}
        replay
        revealDuration={1.05}
        className="shape-workbench-heading"
      >
        <div>
          <Meta>An alphabet of organic shapes</Meta>
          <SectionTitle id={id}>
            Anything
            <br />
            but square.
          </SectionTitle>
        </div>
        <div>
          <Body>
            Compose a silhouette, give it depth, and take it into your own work.
          </Body>
          <MarketingLink href="/docs/shape/">
            Open the shape studio
          </MarketingLink>
        </div>
      </FloatLayer>
      <AnalyticsPreview componentId="shape-artwork" placement="landing">
        <ShapeStudio
          onChoose={(name) =>
            track("variant_selected", {
              component_id: "shape-artwork",
              placement: "landing",
              route: window.location.pathname,
              variant_id: "variant",
              variant_value: name,
            })
          }
          onCopyResult={(result) =>
            track(
              result === "success" ? "source_copied" : "copy_failed",
              result === "success"
                ? {
                    component_id: "shape-artwork",
                    route: window.location.pathname,
                  }
                : {
                    component_id: "shape-artwork",
                    route: window.location.pathname,
                    copy_kind: "source",
                  },
            )
          }
        />
      </AnalyticsPreview>
    </section>
  );
}
