"use client";

import * as React from "react";
import Link from "next/link";
import { Hero, SectionTitle, Body, Meta, Title } from "@/registry/cojeev/ui/typography";
import { Shape } from "@/registry/cojeev/ui/shape";
import { ShapeScene, type SculptureMaterial } from "@/registry/cojeev/ui/shape-scene";
import { DepthBackground } from "@/registry/cojeev/ui/depth-background";
import { FloatLayer } from "@/registry/cojeev/ui/float-layer";
import { HeroButton } from "@/registry/cojeev/ui/hero-button";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { Switch, SwitchRow } from "@/registry/cojeev/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/registry/cojeev/ui/toggle-group";
import { AgentState, type AgentStatus } from "@/registry/cojeev/ui/agent-state";
import { OrganismAssembly } from "@/registry/cojeev/ui/organism-assembly";
import type { OrganismKind } from "@/registry/cojeev/ui/organism-composition";
import { Marquee } from "@/registry/cojeev/ui/marquee";
import { CodeBlock } from "@/registry/cojeev/ui/code-block";
import { useChoreography } from "@/registry/cojeev/motion/choreography";
import { getSettingsSnapshot, getServerSettingsSnapshot, subscribeSettings, setFlowSettings, type FlowVariant } from "@/registry/cojeev/motion/settings";
import { ShapePlayground } from "./shape-playground";
import { MarketingHeader, MarketingFooter, MarketingLink, sourceUrl } from "./marketing-shell";
import { LandingSmoothScroll } from "./landing-smooth-scroll";

/* THESIS: living components demonstrate personality before copy explains it.
   OWN-WORLD: Cojeev ink, four accent roles, sculpted contours and six live palettes.
   STORY: touch a part, compose it, change its material, take its source.
   FIRST VIEWPORT: central type/CTA with an asymmetric constellation of live controls.
   FORM: a specimen studio, followed by workbench, motion instrument and material exhibition. */
type LandingTone = "pink" | "olive" | "blue" | "yellow";
function ToneShape({ name, tone = "pink", className = "" }: { name: string; tone?: LandingTone; className?: string }) {
  return <Shape name={name} className={className} style={{ color: `var(--v-${tone})`, "--c": `var(--v-${tone})` } as React.CSSProperties} />;
}
export function StoryReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <FloatLayer className={className} depth={0} drift={0} replay revealDistance={34} revealDuration={1.05}>{children}</FloatLayer>;
}

function StudioHero({ count }: { count: number }) {
  const [presses, setPresses] = React.useState(0);
  const [playing, setPlaying] = React.useState(true);
  const { quiet } = useChoreography();
  const switchId = React.useId();
  return <section className="studio-hero" aria-labelledby="hero-title" data-playing={playing}>
    <DepthBackground variant="pollen" seed="cojeev-hero" density={.4} intensity={playing ? .35 : 0} />
    <div className="studio-hero-core">
      <FloatLayer delay={.08} depth={0} drift={0}><Meta className="studio-kicker">Cojeev UI · Open-source React components</Meta></FloatLayer>
      <FloatLayer delay={.18} depth={0} drift={0} revealDistance={36} revealDuration={1.1}>
        <Hero id="hero-title">Make it<br />feel <span className="studio-alive">alive<ToneShape name="aster-9" tone="pink" /></span>.</Hero>
      </FloatLayer>
      <FloatLayer delay={.38} depth={0} drift={0} className="studio-hero-action" revealDuration={1}>
        <HeroButton asChild><Link href="/docs/">Explore the library</Link></HeroButton>
        <Meta>{count} components. Yours to make your own.</Meta>
      </FloatLayer>
    </div>
    <div className="studio-hero-specimens">
      <FloatLayer className="studio-hero-touch" depth={0} drift={0} delay={.55}>
        <Button variant="accent" size="lg" onClick={() => setPresses(n => n + 1)}><AnimatedIcon name={presses ? "heart" : "mouse-pointer-2"} />{presses ? `Again? ${presses}` : "Give me a nudge"}</Button>
        <Meta aria-live="polite">{presses ? "A little joy, on repeat." : "A real button. Go on, touch."}</Meta>
      </FloatLayer>
      <FloatLayer className="studio-hero-ambient" depth={0} drift={0} delay={.65}>
        <SwitchRow><span>Background motion</span><Switch id={switchId} aria-label="Background motion" checked={playing} onCheckedChange={setPlaying} /></SwitchRow>
        {quiet && <Meta>Motion follows your accessibility settings.</Meta>}
      </FloatLayer>
    </div>
    <div className="studio-constellation" aria-hidden="true">
      <FloatLayer className="studio-float studio-float-bloom" depth={45} drift={playing ? 4 : 0} delay={.25}>
        <ToneShape name="daisy-12" tone="yellow" /><span className="studio-bloom-hole" />
      </FloatLayer>
      <FloatLayer className="studio-float studio-float-ceramic" depth={55} drift={playing ? 4 : 0} delay={.4}>
        <ShapeScene density="sparse" shapes={["cushion", "clover-soft"]} material="glazed" animate={playing} />
      </FloatLayer>
    </div>
    <MarketingLink href="#playground" className="studio-scroll-link">See what takes shape <AnimatedIcon name="chevron-down" /></MarketingLink>
  </section>;
}

function ComponentRibbon() {
  return <Marquee className="studio-ribbon" speed="slow" label="A whole family of possibilities">
    {[
      ["Buttons that bend", "petal-7", "pink"], ["Ideas that connect", "clover-soft", "olive"],
      ["Details with depth", "ribbon-soft", "blue"], ["Made to be yours", "aster-9", "yellow"],
    ].map(([label, shape, tone]) => <div className="studio-ribbon-word" key={label}><ToneShape name={shape} tone={tone as LandingTone} /><span>{label}</span></div>)}
  </Marquee>;
}

function Assembly() {
  const [kind, setKind] = React.useState<OrganismKind>("profile");
  const ingredients: Record<string, [string, string][]> = {
    profile: [["Avatar", "avatar"], ["Card", "card"], ["Badge", "badge"], ["Button", "button"]],
    "side-panel": [["Card", "card"], ["Item", "item"], ["Progress", "progress"], ["Button", "button"]],
    dock: [["Avatar", "avatar"], ["Button", "button"], ["Animated icon", "animated-icon"]],
    chat: [["Avatar", "avatar"], ["Bubble", "bubble"], ["Input group", "input-group"], ["Message scroller", "message-scroller"]],
    focus: [["Card", "card"], ["Progress", "progress"], ["Button", "button"]],
    invite: [["Card", "card"], ["Avatar", "avatar"], ["Shape", "shape"], ["Button", "button"]],
  };
  return <section className="studio-assembly story-section" id="playground" aria-labelledby="assembly-title">
    <div className="studio-section-heading"><StoryReveal><Meta className="studio-section-label">Small parts, bigger ideas</Meta><SectionTitle id="assembly-title">A little chemistry.</SectionTitle></StoryReveal><FloatLayer depth={-15} drift={0}><Body>Pick a composition. Watch the parts find each other.</Body></FloatLayer></div>
    <div className="studio-assembly-field" id="assembly"><DepthBackground variant="orbital" seed="assembly" density={.5} intensity={.5} /><OrganismAssembly value={kind} onValueChange={setKind} /></div>
    <div className="studio-ingredients"><Meta>Made from the same little parts</Meta><div>{(ingredients[kind] ?? ingredients["side-panel"]).map(([name, id]) => <Button key={id} asChild variant="ghost" size="sm"><Link href={`/docs/${id}/`}>{name}<AnimatedIcon name="arrow-up-right" size="sm" /></Link></Button>)}</div></div>
  </section>;
}

const flowChoices = [ ["glide", "Glide"], ["stretch", "Stretch"], ["jelly", "Jelly"], ["comet", "Comet"], ["drop", "Ink"], ["rubber", "Rubber"], ["pebble", "Pebble"], ["ripple", "Ripple"], ["halo", "Hollow"] ] as const;
function MotionPlayground() {
  const { flow } = React.useSyncExternalStore(subscribeSettings, getSettingsSnapshot, getServerSettingsSnapshot);
  const preset = flow.variant;
  const [status, setStatus] = React.useState<AgentStatus>("thinking");
  return <section className="studio-motion story-section" aria-labelledby="motion-title">
    <FloatLayer className="studio-motion-title" depth={0} drift={0} replay revealDistance={34}><Meta className="studio-section-label">A feeling, not just a function</Meta><SectionTitle id="motion-title">Made to <br /><span>move you.</span></SectionTitle><Body>Hover. Switch. Change your mind.</Body><MarketingLink href="/docs/adjuster/">Meet the motion system <AnimatedIcon name="arrow-up-right" /></MarketingLink></FloatLayer>
    <div className="studio-motion-instrument">
      <FloatLayer className="studio-agent" depth={0} drift={0} replay><AgentState status={status} size="lg" /></FloatLayer>
      <FloatLayer depth={0} drift={0} replay className="studio-motion-tabs"><ToggleGroup type="single" className="v-seg" value={status} onValueChange={v => { if (v) setStatus(v as AgentStatus); }} aria-label="Try the motion"><ToggleGroupItem value="thinking"><AnimatedIcon name="sparkles" />Thinking</ToggleGroupItem><ToggleGroupItem value="working"><AnimatedIcon name="pencil" />Making</ToggleGroupItem><ToggleGroupItem value="complete"><AnimatedIcon name="check" />Done</ToggleGroupItem></ToggleGroup></FloatLayer>
      <Meta className="studio-motion-hint">One character, shared across the whole library.</Meta>
    </div>
    <ToggleGroup className="studio-flow-choices v-seg" type="single" value={preset} onValueChange={value => { if (value) setFlowSettings({ variant: value as FlowVariant }); }} aria-label="Motion character">{flowChoices.map(([value, label]) => <ToggleGroupItem key={value} value={value}>{label}</ToggleGroupItem>)}</ToggleGroup>
  </section>;
}

function MaterialStudy() {
  const [material, setMaterial] = React.useState<SculptureMaterial>("glazed");
  const [sculpture, setSculpture] = React.useState(false);
  const [atmosphere, setAtmosphere] = React.useState<"pollen" | "contour" | "orbital">("contour");
  return <section className="studio-materials story-section" aria-labelledby="material-title">
    <DepthBackground variant={atmosphere} seed="material-room" density={.7} intensity={.8} />
    <StoryReveal className="studio-material-title"><Meta className="studio-section-label">Texture you can almost touch</Meta><SectionTitle id="material-title">A softer dimension.</SectionTitle></StoryReveal>
    <ToggleGroup className="studio-material-switches v-seg" type="single" value={material} onValueChange={value => { if (value) setMaterial(value as SculptureMaterial); }} aria-label="Sculpture material">{[["clay", "Soft clay"], ["glazed", "Glazed"], ["grain", "Speckled"], ["ripple", "Flowing"]].map(([value, label]) => <ToggleGroupItem key={value} value={value}>{label}</ToggleGroupItem>)}</ToggleGroup>
    <FloatLayer depth={0} drift={0} replay className="studio-material-scene"><ShapeScene density="full" material={material} shapes={sculpture ? ["daisy-12", "seed-wing", "pebble-tall", "scalloped-square", "crescent", "cloud-3"] : undefined} aria-label="Interactive Cojeev sculptures with procedural surface textures" /></FloatLayer>
    <FloatLayer className="studio-material-note" depth={-35} drift={4}><ToneShape name="petal-7" tone="yellow" /><Meta>Light catches.<br />Edges soften.<br />Ideas take shape.</Meta></FloatLayer>
    <div className="studio-material-toolbar"><Button variant="secondary" onClick={() => setSculpture(v => !v)}><AnimatedIcon name="refresh-cw" />Rearrange the room</Button><div className="studio-atmosphere"><Meta>Atmosphere</Meta><ToggleGroup className="v-seg" type="single" value={atmosphere} onValueChange={value => { if (value) setAtmosphere(value as typeof atmosphere); }} aria-label="Background atmosphere">{(["pollen", "contour", "orbital"] as const).map(value => <ToggleGroupItem key={value} value={value}>{value === "pollen" ? "Pollen" : value === "contour" ? "Contours" : "Orbit"}</ToggleGroupItem>)}</ToggleGroup></div></div>
    <MarketingLink href="/docs/depth-background/">Bring the atmosphere with you <AnimatedIcon name="arrow-up-right" /></MarketingLink>
  </section>;
}

function Principles() {
  return <section className="studio-principles story-section" aria-labelledby="principles-title"><Meta id="principles-title" className="studio-section-label">Our kind of interface</Meta>
    {[
      { word: "Human.", text: "A little warmth in the everyday.", shape: "clover-soft", tone: "pink" },
      { word: "Connected.", text: "Small parts. Room for your big idea.", shape: "ribbon-soft", tone: "blue" },
      { word: "Yours.", text: "Open source. MIT. Make it your own.", shape: "petal-7", tone: "olive" },
    ].map((p, i) => <FloatLayer key={p.word} depth={0} drift={0} replay delay={i * .07} className="studio-belief"><Title as="h3">{p.word}</Title><ToneShape name={p.shape} tone={p.tone as LandingTone} /><Body>{p.text}</Body></FloatLayer>)}
  </section>;
}

export function LandingPage({ componentCount }: { componentCount: number }) {
  const { quiet } = useChoreography();
  return <LandingSmoothScroll><div className="story-page studio-page" data-quiet={quiet}><MarketingHeader /><main id="story-main">
    <StudioHero count={componentCount} /><ComponentRibbon /><Assembly /><ShapePlayground /><MotionPlayground /><MaterialStudy /><Principles />
    <section className="studio-install story-section" aria-labelledby="install-title"><FloatLayer depth={0} drift={0} replay><ToneShape name="seed-wing" tone="yellow" className="studio-install-shape" /><SectionTitle id="install-title">Your turn.</SectionTitle><HeroButton asChild><Link href="/docs/">Make something yours</Link></HeroButton></FloatLayer>
      <FloatLayer depth={0} drift={0} replay className="studio-install-code"><CodeBlock title="Start with a button" language="Terminal" wrap code="npx shadcn@latest add https://luv-jeri.github.io/cojeev-ui/r/button.json" /><Meta>New project? The setup guide has you covered.</Meta><MarketingLink href={sourceUrl}><AnimatedIcon name="github" />Take the source</MarketingLink></FloatLayer>
    </section>
  </main><MarketingFooter /></div></LandingSmoothScroll>;
}
