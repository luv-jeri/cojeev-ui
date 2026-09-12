"use client";

import Link from "next/link";
import { Hero, Body, Meta } from "@/registry/cojeev/ui/typography";
import { HeroButton } from "@/registry/cojeev/ui/hero-button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { MarketingHeader, MarketingFooter, MarketingLink, sourceUrl } from "./marketing-shell";
import { LandingSmoothScroll } from "./landing-smooth-scroll";
import { FeaturedComponents } from "./featured-components";
import { ProfileStage } from "./profile-stage";

/** A shallow wave so the olive close meets the page like paper, not a ruled box. */
function ShallowWave() {
  return <svg className="launch-contact__wave" viewBox="0 0 1440 84" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <path d="M0 84V34c180-34 344-34 504 0s324 34 504 0 252-34 432 0v50z" />
  </svg>;
}

/* Three movements: one claim, one stage that proves it, one collection to explore.
   The close is an invitation, and the footer keeps its own utilities on paper. */
export function LandingPage({ componentCount }: { componentCount: number }) {
  return <LandingSmoothScroll><div className="story-page launch-home">
    <MarketingHeader />
    <main id="story-main">
      <section className="launch-hero" aria-labelledby="hero-title">
        <Hero id="hero-title">React components.<br /><span>With character.</span></Hero>
        <div className="launch-hero-actions">
          <Body>Thoughtful details. Source you can make your own.</Body>
          <HeroButton asChild><Link href="/docs/">Explore {componentCount} components</Link></HeroButton>
          <MarketingLink href="#featured-components">Find your next detail <AnimatedIcon name="arrow-down" /></MarketingLink>
          <Meta>React · Tailwind CSS · shadcn · MIT</Meta>
        </div>
      </section>
      <ProfileStage />
      <FeaturedComponents />
      <section className="launch-contact" aria-labelledby="contact-heading" data-contact-close="">
        <ShallowWave />
        <div className="launch-contact__inner">
          <div className="launch-contact__words">
            <h2 id="contact-heading">Like how this feels?</h2>
            <p>Let’s build something together.</p>
          </div>
          <div className="launch-contact__actions">
            <MarketingLink href="/work-with-me/" primary>Work with me <AnimatedIcon name="arrow-right" /></MarketingLink>
            <MarketingLink href={sourceUrl}><AnimatedIcon name="github" /> GitHub</MarketingLink>
          </div>
        </div>
        <Meta className="launch-contact__mark">Open source · for creative builders</Meta>
      </section>
    </main>
    <MarketingFooter compact />
  </div></LandingSmoothScroll>;
}
