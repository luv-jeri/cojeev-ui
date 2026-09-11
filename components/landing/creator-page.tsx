"use client";
import { MarketingHeader, MarketingFooter, MarketingLink, creatorUrl } from "./marketing-shell";
import { Hero, SectionTitle, Caps, Body, Meta } from "@/registry/cojeev/ui/typography";
import { Shape } from "@/registry/cojeev/ui/shape";
import { ShapeScene } from "@/registry/cojeev/ui/shape-scene";
import { Card, CardContent } from "@/registry/cojeev/ui/card";
import { Badge } from "@/registry/cojeev/ui/badge";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { contactEmail, siteFlags } from "@/lib/site-config";

export function CreatorPage() {
  return <div className="story-page"><MarketingHeader /><main id="story-main">
    <section className="creator-hero"><div><Caps>Designing it. Building it. Sharing it.</Caps><Hero>Hi, I’m Sanjay.<br />Let’s make<br />something <em>good.</em></Hero><Body>I’m building 000h by Cojeev to bring more thought, warmth and personality to the products we use. I design the details and build the React components, so what you see is something you can actually use.</Body><div className="story-actions"><MarketingLink href={creatorUrl} primary><AnimatedIcon name="github" /> Find me on GitHub <AnimatedIcon name="arrow-up-right" /></MarketingLink></div></div>
      <div className="creator-art"><Shape name="scalloped-square" /><Card variant="pink" lift className="creator-note"><CardContent><Badge variant="yellow">A work in the open</Badge><h2>Good tools.<br />A human touch.<br />Room to play.</h2><Body>That’s the kind of software I want to make.</Body><Meta style={{ color: "var(--v-on-accent)" }}>Sanjay Kumar / 000h by Cojeev</Meta></CardContent></Card></div>
    </section>
    <section className="creator-practice story-section"><div><Caps>Design + engineering</Caps><SectionTitle>From a feeling<br />to a working thing.</SectionTitle></div><div><Body>A distinctive interface comes from decisions that work together: how a surface feels, how a control responds, and how the whole experience helps someone do what they came to do.</Body><Body>My work on 000h by Cojeev brings those decisions into reusable React components, original shapes and purposeful motion. The source is open so the thinking can keep growing.</Body><Body>If that approach feels right for something you’re building, {siteFlags.contactEnabled ? <>email me at <a href={`mailto:${contactEmail}`}>{contactEmail}</a> or visit my GitHub profile.</> : "visit my GitHub profile. It’s the best place to find me for now."}</Body><div className="story-actions">{siteFlags.contactEnabled && <MarketingLink href={`mailto:${contactEmail}`} primary><AnimatedIcon name="mail" /> Email me</MarketingLink>}<MarketingLink href={creatorUrl}>Let’s connect <AnimatedIcon name="arrow-up-right" /></MarketingLink></div></div></section>
    <section className="maker-values story-section" aria-labelledby="maker-values-heading"><div><Caps>Why this exists</Caps><SectionTitle id="maker-values-heading">Useful can have<br />a personality.</SectionTitle></div><div className="maker-values-grid">
      <article><Meta>01 / The feeling</Meta><h3>Warm, considered, alive.</h3><Body>Organic shapes and a little imperfection give an interface character. Motion earns its place by helping a detail make sense.</Body></article>
      <article><Meta>02 / The making</Meta><h3>Design meets the browser.</h3><Body>A component is more than its first frame. Focus, smaller screens, dark surfaces and quieter motion all belong in the design.</Body></article>
      <article><Meta>03 / The sharing</Meta><h3>Yours to work with.</h3><Body>Read the source, adapt the details, and bring your own point of view. The library grows through real use and specific feedback.</Body></article>
    </div></section>
    <section className="creator-project story-section"><ShapeScene density="sparse" /><div><Caps>Explore the work</Caps><SectionTitle>One library.<br />Many possibilities.</SectionTitle><Body>The best introduction is something you can use. Try the controls, explore the shapes, inspect the code, and see how the little parts come together.</Body><div className="story-actions"><MarketingLink href="/" primary>Explore 000h by Cojeev <AnimatedIcon name="arrow-right" /></MarketingLink><MarketingLink href="/docs/">Browse the components</MarketingLink></div></div></section>
  </main><MarketingFooter /></div>;
}
