"use client";

import * as React from "react";
import { motion, useScroll, useTransform, useMotionValueEvent } from "motion/react";
import { Hero, SectionTitle, Body, Lead, Meta, Caps, Title } from "@/registry/sahajiv/ui/typography";
import { Shape, ShapeMorph, signatureShapeNames, type SignatureShapeName } from "@/registry/sahajiv/ui/shape";
import { ShapeScene } from "@/registry/sahajiv/ui/shape-scene";
import { Button } from "@/registry/sahajiv/ui/button";
import { Badge } from "@/registry/sahajiv/ui/badge";
import { Card, CardContent, CardTitle } from "@/registry/sahajiv/ui/card";
import { AnimatedIcon } from "@/registry/sahajiv/ui/animated-icon";
import { Avatar, AvatarFallback } from "@/registry/sahajiv/ui/avatar";
import { Input } from "@/registry/sahajiv/ui/input";
import { Label } from "@/registry/sahajiv/ui/label";
import { Slider } from "@/registry/sahajiv/ui/slider";
import { AgentState, type AgentStatus } from "@/registry/sahajiv/ui/agent-state";
import { AgentChat, AgentChatHeader, AgentChatThread, AgentChatMessage, AgentChatComposer } from "@/registry/sahajiv/ui/agent-chat";
import { MotionPresence, MotionSurface } from "@/registry/sahajiv/ui/presence";
import { CodeBlock } from "@/registry/sahajiv/ui/code-block";
import { useChoreography } from "@/registry/sahajiv/motion/choreography";
import { MarketingHeader, MarketingFooter, MarketingLink, sourceUrl } from "./marketing-shell";

const tones = ["pink", "olive", "blue", "yellow"] as const;
const friendlyName = (name: string) => name.replaceAll("-", " ");

function DriftingShape({ name, className }: { name: string; className: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const { quiet } = useChoreography();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [45, -45]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-14, 22]);
  return <motion.div ref={ref} className={className} aria-hidden="true" style={quiet ? undefined : { y, rotate }}><Shape name={name} /></motion.div>;
}

export function StoryReveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const { quiet } = useChoreography();
  return <motion.div className={className} initial={false} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .12 }}
    style={{ opacity: 1 }} transition={{ duration: quiet ? 0 : .7, ease: [.2,.8,.2,1] }}>
    <MotionSurface initial={false} animate={quiet ? { y: 0 } : undefined} whileInView={quiet ? { y: 0 } : { y: [24, 0] }} viewport={{ once: true }}>{children}</MotionSurface>
  </motion.div>;
}

function HeroComposition() {
  const ref = React.useRef<HTMLDivElement>(null);
  const { quiet } = useChoreography();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 100]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-8, 14]);
  const [pressed, setPressed] = React.useState(0);
  return <div className="story-hero-art" ref={ref}>
    <div className="story-orbit" aria-hidden="true" />
    <ShapeScene className="story-scene" density="full" aria-label="Interactive floating three-dimensional SahaJiv shapes" />
    <motion.div className="story-floating story-floating-button" style={quiet ? undefined : { y, rotate }}>
      <Button variant="accent" size="lg" onClick={() => setPressed(n => n + 1)}><AnimatedIcon name="sparkles" />{pressed ? `That felt nice. ×${pressed}` : "Go on, press me"}</Button>
    </motion.div>
    <div className="story-floating story-floating-note"><Card variant="blue" size="sm" lift><CardContent>
      <div className="story-mini-row"><Avatar variant="pink"><AvatarFallback>SJ</AvatarFallback></Avatar><div><CardTitle>A little more you.</CardTitle><Meta>Built to be made your own.</Meta></div></div>
      <div className="story-mini-row"><Badge variant="olive">Expressive</Badge><Badge variant="yellow">Composable</Badge></div>
    </CardContent></Card></div>
    <Shape name="daisy-12" className="story-floating story-floating-daisy" />
    <Meta className="story-art-caption">Real 3D. Real components. Yours to play with.</Meta>
  </div>;
}

const assemblySteps = ["Start with the little things", "Give them a shared language", "Make something useful"];

function Assembly() {
  const passage = React.useRef<HTMLElement>(null);
  const { quiet } = useChoreography();
  const { scrollYProgress } = useScroll({ target: passage, offset: ["start .85", "end .7"] });
  const [scrollStep, setScrollStep] = React.useState(0);
  const [manualStep, setManualStep] = React.useState<number | null>(null);
  const [draft, setDraft] = React.useState("");
  const [messages, setMessages] = React.useState<string[]>([]);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  React.useEffect(() => () => timers.current.forEach(clearTimeout), []);
  useMotionValueEvent(scrollYProgress, "change", value => setScrollStep(Math.min(2, Math.floor(value * 3))));
  const step = manualStep ?? (quiet ? 2 : scrollStep);
  const showComplete = step === 2;
  function replay() {
    timers.current.forEach(clearTimeout); setManualStep(0);
    timers.current = [setTimeout(() => setManualStep(1), 850), setTimeout(() => setManualStep(2), 1750)];
  }
  return <section className="story-assembly story-section" id="assembly" ref={passage} aria-labelledby="assembly-title">
    <div className="story-assembly-intro"><Caps>01 / Better together</Caps>
      <SectionTitle id="assembly-title">A shape. A button.<br />A whole new possibility.</SectionTitle>
      <Body>Small pieces with a shared rhythm. Bring them together and an interface starts to feel like it belongs.</Body>
      <div className="story-assembly-controls" aria-label="Composition stages">{assemblySteps.map((name, index) => <Button key={name} size="sm" variant={step === index ? "accent" : "secondary"} aria-label={`Stage ${index + 1}: ${name}`} aria-pressed={step === index} onClick={() => { timers.current.forEach(clearTimeout); setManualStep(index); }}>{index + 1}</Button>)}
        <Button size="sm" variant="ghost" onClick={replay} disabled={quiet}><AnimatedIcon name="refresh-cw" />Replay</Button>
      </div><Meta role="status">{quiet ? `${assemblySteps[step]} · motion off` : assemblySteps[step]}</Meta>
    </div>
    <div className="story-assembly-stage" data-stage={step}>
      <DriftingShape name="sunburst-24" className="story-assembly-watermark" />
      <div className="story-assembly-components" data-assembled={showComplete} inert={showComplete || undefined} aria-hidden={showComplete || undefined}>
        <motion.div className="story-part story-part-avatar" animate={{ x: step === 0 ? -65 : 0, y: step === 0 ? -25 : 0, rotate: step === 0 ? -18 : 0 }} transition={{ duration: quiet ? 0 : .7 }}><Avatar variant="pink" size="lg"><AvatarFallback>SJ</AvatarFallback></Avatar><Meta>Avatar</Meta></motion.div>
        <motion.div className="story-part story-part-badge" animate={{ x: step === 0 ? 55 : 0, y: step === 0 ? -30 : 0, rotate: step === 0 ? 13 : 0 }} transition={{ duration: quiet ? 0 : .7 }}><Badge variant="olive">Ready when you are</Badge><Meta>Badge</Meta></motion.div>
        <motion.div className="story-part story-part-input" animate={{ x: step === 0 ? -18 : 0, y: step === 0 ? 35 : 0, rotate: step === 0 ? -5 : 0 }} transition={{ duration: quiet ? 0 : .7 }}><Input aria-label="Unassembled input example" placeholder="A thought starts here…" /><Meta>Input</Meta></motion.div>
        <motion.div className="story-part story-part-button" animate={{ x: step === 0 ? 30 : 0, y: step === 0 ? 65 : 0, rotate: step === 0 ? 10 : 0 }} transition={{ duration: quiet ? 0 : .7 }}><Button variant="accent" onClick={() => setManualStep(2)}>Bring it together <AnimatedIcon name="arrow-right" /></Button><Meta>Button</Meta></motion.div>
      </div>
      <motion.div className="story-assembled-chat" initial={false} animate={{ opacity: showComplete ? 1 : 0, scale: showComplete ? 1 : .88, y: showComplete ? 0 : 30 }} transition={{ duration: quiet ? 0 : .6 }} inert={!showComplete || undefined} aria-hidden={!showComplete || undefined}>
        <AgentChat><AgentChatHeader title="Room for your ideas" description="A local, interactive composition" status="idle" />
          <AgentChatThread className="story-chat-thread"><AgentChatMessage>One thought can become something wonderful. Try adding yours below.</AgentChatMessage><MotionPresence>{messages.map((message, i) => <AgentChatMessage key={i} from="user" author="You">{message}</AgentChatMessage>)}</MotionPresence></AgentChatThread>
          <AgentChatComposer value={draft} onValueChange={setDraft} onSend={() => { if (draft.trim()) { setMessages(m => [...m, draft.trim()]); setDraft(""); } }} label="Try the conversation composer" placeholder="What would you like to make?" hint="Local demo. Your message stays in this page." />
        </AgentChat>
      </motion.div><Meta className="story-stage-caption">Avatar + Bubble + Input + Button → Agent Chat</Meta>
    </div>
  </section>;
}

function ShapePlayground() {
  const [shape, setShape] = React.useState<SignatureShapeName>("daisy-12");
  const [tone, setTone] = React.useState<typeof tones[number]>("pink");
  const [rotation, setRotation] = React.useState(0);
  const [outline, setOutline] = React.useState(false);
  const { quiet, transition } = useChoreography();
  const labelId = React.useId();
  return <section className="story-shapes story-section" id="playground" aria-labelledby="shape-title">
    <StoryReveal className="story-shape-copy"><Caps>02 / A language with a little wiggle</Caps><SectionTitle id="shape-title">Perfectly<br /><em>imperfect.</em></SectionTitle><Body>Petals, pebbles, clouds and little bursts of joy. Choose a contour, give it a colour, then make it your own.</Body><MarketingLink href="/docs/shape/">Meet the shape family <AnimatedIcon name="arrow-right" /></MarketingLink></StoryReveal>
    <div className="story-shape-lab"><div className="story-shape-canvas" data-tone={tone}>
      <motion.div animate={{ rotate: rotation }} transition={quiet ? { duration: 0 } : transition} className="story-morph-display"><ShapeMorph name={shape} variant={outline ? "outline" : "fill"} label={`${friendlyName(shape)}, ${tone}, ${outline ? "outlined" : "filled"}`} /></motion.div>
      <Meta className="story-shape-coordinate">{friendlyName(shape)} / {rotation}°</Meta><Badge className="story-live-badge" variant="default">Live specimen</Badge>
    </div><div className="story-shape-settings">
      <div className="story-shape-choices" aria-label="Shape">{signatureShapeNames.map(name => <Button key={name} size="sm" variant={name === shape ? "accent" : "ghost"} aria-label={`Use ${friendlyName(name)}`} aria-pressed={name === shape} onClick={() => setShape(name)}><Shape name={name} /></Button>)}</div>
      <div className="story-shape-settings-row"><div className="story-swatches" aria-label="Colour">{tones.map(t => <Button key={t} size="sm" variant="ghost" aria-label={`Use ${t}`} aria-pressed={tone === t} onClick={() => setTone(t)}><Shape name="pebble-soft" style={{ color: `var(--v-${t})` }} /><span className="sr-only">{t}</span></Button>)}</div><Button size="sm" variant="secondary" aria-pressed={outline} onClick={() => setOutline(v => !v)}>{outline ? "Outlined" : "Filled"}</Button></div>
      <div className="story-rotation"><Label id={labelId}>Rotation</Label><Slider aria-labelledby={labelId} min={0} max={360} step={5} value={[rotation]} onValueChange={v => setRotation(v[0])} /><Meta>{rotation}°</Meta></div>
    </div></div>
  </section>;
}

function Personality() {
  const [status, setStatus] = React.useState<AgentStatus>("thinking");
  const statuses: AgentStatus[] = ["idle", "thinking", "working", "complete"];
  return <section className="story-personality story-section" aria-labelledby="personality-title">
    <div className="story-state-play"><AgentState status={status} size="lg" /><div className="story-state-options" aria-label="Try an agent state">{statuses.map(s => <Button key={s} size="sm" variant={status === s ? "accent" : "secondary"} aria-pressed={status === s} onClick={() => setStatus(s)}>{s === "idle" ? "Ready" : s[0].toUpperCase() + s.slice(1)}</Button>)}</div></div>
    <StoryReveal className="story-personality-copy"><Caps>03 / Feeling is a feature</Caps><SectionTitle id="personality-title">Let the interface<br />do a little talking.</SectionTitle><Body>A thinking shape gathers itself. A button meets your hand. A menu opens with intention. Motion helps people understand what just happened, and what comes next.</Body><MarketingLink href="/docs/agent-state/">Explore expressive states <AnimatedIcon name="arrow-right" /></MarketingLink></StoryReveal>
  </section>;
}

function Principles() {
  return <section className="story-principles story-section" aria-labelledby="principles-title"><Caps>04 / What we believe</Caps><SectionTitle id="principles-title">Useful can be beautiful.<br />Beautiful can be <em>useful.</em></SectionTitle>
    <div className="story-principle-list">{[
      { no: "01", name: "A human touch", text: "Warm colour. Organic edges. A little play in the everyday. Software should leave room for personality.", shape: "petal-7", tone: "pink" },
      { no: "02", name: "Parts, with possibility", text: "Start small and compose. The same button belongs in a quick action, a calendar or an agent conversation.", shape: "clover-soft", tone: "blue" },
      { no: "03", name: "Yours, all the way down", text: "Copy the source into your project. Change the shapes, tune the motion, build your own variants. MIT licensed.", shape: "scalloped-square", tone: "olive" },
    ].map(p => <StoryReveal key={p.no} className="story-principle"><Meta>{p.no}</Meta><Title>{p.name}</Title><Body>{p.text}</Body><Shape name={p.shape} style={{ color: `var(--v-${p.tone})` }} /></StoryReveal>)}</div>
  </section>;
}

export function LandingPage({ componentCount }: { componentCount: number }) {
  const { quiet } = useChoreography();
  return <div className="story-page" data-quiet={quiet}><MarketingHeader /><main id="story-main">
    <section className="story-hero" aria-labelledby="hero-title"><div className="story-hero-copy"><Caps>Open-source React components. A little more alive.</Caps>
      <Hero id="hero-title">Little parts.<br />Big <span>personality<Shape name="seed-wing" /></span>.</Hero>
      <Lead>Interfaces that feel as good as they work.</Lead><Body>A playful component library for thoughtful products. Organic shapes, expressive motion, and source code you can call your own.</Body>
      <div className="story-actions"><MarketingLink href="/docs/" primary>Explore components <AnimatedIcon name="arrow-right" /></MarketingLink><MarketingLink href="#playground">Take it for a spin <AnimatedIcon name="chevron-down" /></MarketingLink></div><Meta className="story-hero-proof">{componentCount} components · React + TypeScript · MIT</Meta>
    </div><HeroComposition /></section>
    <div className="story-divider"><span>Made to move.</span><Shape name="aster-9" /><span>Made to fit.</span><Shape name="clover-soft" /><span>Made yours.</span><Shape name="ribbon-soft" /></div>
    <Assembly /><ShapePlayground /><Personality /><Principles />
    <section className="story-install story-section" aria-labelledby="install-title"><div><Caps>05 / Your next idea starts here</Caps><SectionTitle id="install-title">Make something<br />only <em>you</em> would make.</SectionTitle><Body>Add your first component. Then follow your curiosity.</Body><div className="story-actions"><MarketingLink href="/docs/" primary>Get started <AnimatedIcon name="arrow-right" /></MarketingLink><MarketingLink href={sourceUrl}><AnimatedIcon name="github" /> View the source</MarketingLink></div></div>
      <div className="story-install-source"><DriftingShape name="cloud-3" className="story-install-cloud" /><CodeBlock title="Add a little personality" language="Terminal" wrap code="npx shadcn@latest add https://luv-jeri.github.io/sahajiv-ui/r/button.json" /><Meta>New project? Start with the setup guide before adding components.</Meta></div>
    </section>
  </main><MarketingFooter /></div>;
}
