"use client";

import * as React from "react";
import Link from "next/link";
import { Hero, Body, Meta } from "@/registry/cojeev/ui/typography";
import { HeroButton } from "@/registry/cojeev/ui/hero-button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { Shape } from "@/registry/cojeev/ui/shape";
import { FloatLayer } from "@/registry/cojeev/ui/float-layer";
import { OrganismAssembly } from "@/registry/cojeev/ui/organism-assembly";
import type { OrganismKind } from "@/registry/cojeev/ui/organism-composition";
import { ContoursBackground } from "@/registry/cojeev/ui/contours-background";
import { SunwashBackground } from "@/registry/cojeev/ui/sunwash-background";
import { useChoreography } from "@/registry/cojeev/motion/choreography";
import { AnalyticsPreview } from "@/components/analytics/analytics-preview";
import { sanitizeRoute, track } from "@/lib/analytics/client";
import { MarketingHeader, MarketingFooter, MarketingLink } from "./marketing-shell";
import { LandingSmoothScroll } from "./landing-smooth-scroll";
import { FeaturedComponents } from "./featured-components";
import { ShapePlayground } from "./shape-playground";
import { BrandSculpture } from "@/components/brand/brand-sculpture";

const heroCompositions: OrganismKind[] = ["focus", "side-panel", "chat"];
function LittleCompanion() {
  return <FloatLayer depth={-24} drift={0} revealDistance={12} className="launch-companion" aria-hidden="true">
    <Shape name="clover-soft" />
    <svg viewBox="0 0 80 80" fill="none"><ellipse cx="31" cy="35" rx="2.5" ry="4"/><ellipse cx="48" cy="35" rx="2.5" ry="4"/><path d="M33 47q7 6 13-1"/></svg>
  </FloatLayer>;
}

/* One unfolding scene: loose parts become a working interface; the collection follows.
   Native parts, decorative particles and separate scroll planes each own their motion. */
export function LandingPage({ componentCount }: { componentCount: number }) {
  const { quiet } = useChoreography();
  const [composition, setComposition] = React.useState<OrganismKind>("focus");
  return <LandingSmoothScroll><div className="story-page launch-home" data-quiet={quiet}>
    <MarketingHeader />
    <main id="story-main">
      <section className="launch-hero launch-hero-story" aria-labelledby="hero-title">
        <FloatLayer depth={36} drift={0} revealDistance={0} className="launch-hero-atmosphere" aria-hidden="true">
          <SunwashBackground color="var(--v-yellow)" opacity={0.36} spacing={48} />
          <ContoursBackground opacity={0.12} spacing={64} />
        </FloatLayer>
        <div className="launch-introduction">
          <Meta className="launch-eyebrow">Open-source React components, with a little character.</Meta>
          <Hero id="hero-title">Good things<br /><span>come together.</span></Hero>
          <Body>A few thoughtful parts. A little curiosity.<br className="launch-desktop-break" /> Something entirely yours.</Body>
          <div className="launch-hero-actions">
            <HeroButton asChild><Link href="/docs/">Explore {componentCount} components</Link></HeroButton>
            <MarketingLink href="#featured-components">Meet the little parts <AnimatedIcon name="arrow-down" /></MarketingLink>
            <Meta>React · Tailwind CSS · shadcn · MIT</Meta>
          </div>
          <div className="launch-whisper"><LittleCompanion /><p>Go on. Pull it apart.<br /><span>See what comes together.</span></p></div>
        </div>
        <FloatLayer depth={-18} drift={0} revealDistance={16} className="launch-assembly-scene">
          <AnalyticsPreview componentId="organism-assembly" placement="landing" className="launch-hero-assembly">
            <div data-example="organism-assembly">
              <OrganismAssembly value={composition} defaultValue="focus" autoAssemble compositions={heroCompositions} onValueChange={value => {
                setComposition(value);
                const route = sanitizeRoute(window.location.pathname);
                if (route) track("variant_selected", { component_id: "organism-assembly", placement: "landing", route, variant_id: "variant", variant_value: value });
              }} />
            </div>
          </AnalyticsPreview>
          <MarketingLink href="/docs/organism-assembly/" className="launch-assembly-source">These are real components. Make them yours. <AnimatedIcon name="arrow-up-right" size="sm" /></MarketingLink>
        </FloatLayer>
      </section>
      <div className="launch-collection-intro">
        <FloatLayer depth={12} drift={0} revealDistance={18}><Meta>A few of the little things</Meta><h2>Find your kind of character.</h2></FloatLayer>
        <p>Open it. Change it. Give it a little nudge.</p>
      </div>
      <FeaturedComponents />
      <ShapePlayground />
      <section className="launch-more" aria-label="Explore the library">
        <div className="launch-more__invitation"><BrandSculpture /><div><h2>Small beginnings.<br />Good possibilities.</h2><p>Pick a little part. Make it your own.</p></div></div>
        <MarketingLink href="/docs/" primary>Browse all {componentCount} components <AnimatedIcon name="arrow-right" /></MarketingLink>
      </section>
    </main>
    <MarketingFooter compact />
  </div></LandingSmoothScroll>;
}
