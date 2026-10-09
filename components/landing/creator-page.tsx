"use client";
import * as React from "react";
import { MarketingHeader, MarketingFooter, MarketingLink, creatorUrl } from "./marketing-shell";
import { SidebarMenuButton } from "@/registry/cojeev/ui/sidebar";
import { Hero, Caps, Body, Meta } from "@/registry/cojeev/ui/typography";
import { Shape } from "@/registry/cojeev/ui/shape";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { useChoreography } from "@/registry/cojeev/motion/choreography";
import dynamic from "next/dynamic";
import { ContactForm } from "./contact-form";
import { contactEmail, siteFlags } from "@/lib/site-config";

// The sculpture is a raster image and decorative, so it loads on the client and stays out of server rendering.
const BrandSculpture = dynamic(() => import("@/components/brand/brand-sculpture").then(module => module.BrandSculpture), { ssr: false });

// A mailto link does nothing when the visitor has no mail app, so the click also copies the address.
function EmailMe() {
  const [copied, setCopied] = React.useState(false);
  React.useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 2400);
    return () => window.clearTimeout(timer);
  }, [copied]);
  return <>
    <SidebarMenuButton asChild className="story-link"><a href={`mailto:${contactEmail}`} onClick={() => { navigator.clipboard?.writeText(contactEmail).then(() => setCopied(true), () => {}); }}><AnimatedIcon name={copied ? "check" : "mail"} /> {copied ? "Email copied" : "Email me"}</a></SidebarMenuButton>
    <span className="sr-only" role="status">{copied ? `Copied ${contactEmail}.` : ""}</span>
  </>;
}

// `contactEnabled` defaults to the build flag and exists so both contact states can be rendered in a test.
export function CreatorPage({ contactEnabled = siteFlags.contactEnabled }: { contactEnabled?: boolean }) {
  const { quiet } = useChoreography();
  return <div className="story-page maker-page" data-quiet={quiet}><MarketingHeader /><main id="story-main">
    <section className="creator-hero maker-hero" aria-labelledby="maker-title">
      <div className="maker-folio" aria-hidden="true"><Caps>Work with me</Caps><Caps>000h by Cojeev</Caps><Caps>Madhya Pradesh, India</Caps></div>
      <div className="maker-hero-copy">
        <Caps>Designer and developer</Caps>
        <Hero id="maker-title">Hi, I’m <span>Sanjay.</span></Hero>
        <p className="maker-deck">I design and build interfaces that feel warm, clear and a little <em>playful.</em></p>
        <Body>I take on design and development projects, separately from 000h by Cojeev, my free and open-source React library. I work from Madhya Pradesh, India.</Body>
        <div className="story-actions">{contactEnabled && <><MarketingLink href="#contact" primary><AnimatedIcon name="mail" /> Send me a message</MarketingLink><EmailMe /></>}<MarketingLink href={creatorUrl} primary={!contactEnabled}><AnimatedIcon name="github" /> Find me on GitHub <AnimatedIcon name="arrow-up-right" /></MarketingLink></div>
      </div>
      <figure className="creator-art">
        <div className="maker-hero-canvas" aria-hidden="true">
          <Shape name="petal-7" className="maker-hero-bloom" />
          <Shape name="pebble-soft" className="maker-hero-pebble" />
          <Shape name="star-4" className="maker-hero-spark" />
          <BrandSculpture />
        </div>
        <figcaption><Meta>Fig. 1</Meta> The 000h seed, cast in olive, resting on a petal contour.</figcaption>
      </figure>
    </section>

    <figure className="maker-quote">
      <Shape name="clover-soft" className="maker-quote-art" aria-hidden="true" />
      <Shape name="seed-wing" className="maker-quote-seed" aria-hidden="true" />
      <blockquote><p>Good tools. A human touch. Room to&nbsp;play.</p></blockquote>
      <figcaption><Meta>Sanjay Kumar</Meta> The kind of software I want to make.</figcaption>
    </figure>

    <section id="write" className="maker-write" data-contact={contactEnabled || undefined} aria-labelledby="maker-write-heading">
      <Shape name="scalloped-square" className="maker-write-art" aria-hidden="true" />
      <div className="maker-write-copy">
        <Caps>{contactEnabled ? "Write to me" : "Find me"}</Caps>
        <h2 id="maker-write-heading">Let’s make something <em>good.</em></h2>
        <p>{contactEnabled ? "Tell me what you’re making and what it should feel like. I’ll reply by email." : "For now, GitHub is the best place to find me."}</p>
        <div className="story-actions">{contactEnabled ? <><EmailMe /><MarketingLink href={creatorUrl}><AnimatedIcon name="github" /> Follow along on GitHub <AnimatedIcon name="arrow-up-right" /></MarketingLink></> : <MarketingLink href={creatorUrl} primary><AnimatedIcon name="github" /> Visit my GitHub <AnimatedIcon name="arrow-up-right" /></MarketingLink>}</div>
      </div>
      {contactEnabled && <div className="maker-write-sheet"><ContactForm /></div>}
    </section>
  </main><MarketingFooter /></div>;
}
