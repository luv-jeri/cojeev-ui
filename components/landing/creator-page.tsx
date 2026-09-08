"use client";
import { MarketingHeader, MarketingFooter, MarketingLink, creatorUrl } from "./marketing-shell";
import { Hero, SectionTitle, Caps, Body, Meta } from "@/registry/sahajiv/ui/typography";
import { Shape } from "@/registry/sahajiv/ui/shape";
import { ShapeScene } from "@/registry/sahajiv/ui/shape-scene";
import { Card, CardContent } from "@/registry/sahajiv/ui/card";
import { Badge } from "@/registry/sahajiv/ui/badge";
import { AnimatedIcon } from "@/registry/sahajiv/ui/animated-icon";

export function CreatorPage() {
  return <div className="story-page"><MarketingHeader /><main id="story-main">
    <section className="creator-hero"><div><Caps>The person behind the parts</Caps><Hero>Hi, I’m Sanjay.<br />Let’s make<br />something <em>good.</em></Hero><Body>I’m building SahaJiv UI to bring more thought, warmth and personality to the products we use. This library is where design ideas meet working code.</Body><div className="story-actions"><MarketingLink href={creatorUrl} primary><AnimatedIcon name="github" /> Find me on GitHub <AnimatedIcon name="arrow-up-right" /></MarketingLink></div></div>
      <div className="creator-art"><Shape name="scalloped-square" /><Card variant="pink" lift className="creator-note"><CardContent><Badge variant="yellow">A work in the open</Badge><h2>Good tools.<br />A human touch.<br />Room to play.</h2><Body>That’s the kind of software I want to make.</Body><Meta>Sanjay Kumar / SahaJiv UI</Meta></CardContent></Card></div>
    </section>
    <section className="creator-practice story-section"><div><Caps>Design + engineering</Caps><SectionTitle>From a feeling<br />to a working thing.</SectionTitle></div><div><Body>A distinctive interface comes from decisions that work together: how a surface feels, how a control responds, and how the whole experience helps someone do what they came to do.</Body><Body>My work on SahaJiv UI brings those decisions into reusable React components, original shapes and purposeful motion. The source is open so the thinking can keep growing.</Body><Body>If that approach feels right for something you’re building, visit my GitHub profile. It’s the best place to find me for now.</Body><MarketingLink href={creatorUrl}>Let’s connect <AnimatedIcon name="arrow-up-right" /></MarketingLink></div></section>
    <section className="creator-project story-section"><ShapeScene density="sparse" /><div><Caps>Explore the work</Caps><SectionTitle>One library.<br />Many possibilities.</SectionTitle><Body>The best introduction is something you can use. Try the controls, explore the shapes, inspect the code, and see how the little parts come together.</Body><div className="story-actions"><MarketingLink href="/" primary>Explore SahaJiv UI <AnimatedIcon name="arrow-right" /></MarketingLink><MarketingLink href="/docs/">Browse the components</MarketingLink></div></div></section>
  </main><MarketingFooter /></div>;
}
