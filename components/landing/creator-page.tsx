"use client";
import * as React from "react";
import Link from "next/link";
import { MarketingHeader, MarketingFooter, MarketingLink, creatorUrl } from "./marketing-shell";
import { SidebarMenuButton } from "@/registry/cojeev/ui/sidebar";
import { Hero, SectionTitle, Caps, Body, Meta } from "@/registry/cojeev/ui/typography";
import { Shape, ShapeMorph, type SignatureShapeName } from "@/registry/cojeev/ui/shape";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { AgentState, type AgentStatus } from "@/registry/cojeev/ui/agent-state";
import { PatternBackground, type PatternBackgroundVariant } from "@/registry/cojeev/ui/pattern-background";
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

/* A choice row shared by the plates: one pressed button names the current state. */
function Choices<T extends string>({ label, options, value, onChange }: { label: string; options: readonly (readonly [T, string])[]; value: T; onChange: (value: T) => void }) {
  return <div className="maker-choices" role="group" aria-label={label}>
    {options.map(([option, text]) => <Button key={option} size="sm" variant={value === option ? "secondary" : "ghost"} aria-pressed={value === option} onClick={() => onChange(option)}>{text}</Button>)}
  </div>;
}

const contours = [["daisy-12", "Daisy"], ["clover-soft", "Clover"], ["cloud-3", "Cloud"], ["seed-wing", "Seed wing"]] as const satisfies readonly (readonly [SignatureShapeName, string])[];
function ContourPlate() {
  const [name, setName] = React.useState<SignatureShapeName>("daisy-12");
  return <div className="maker-specimen maker-specimen-contour" data-example="shape">
    <div className="maker-contour" aria-hidden="true"><ShapeMorph name={name} /><ShapeMorph name={name} variant="outline" /></div>
    <Choices label="Try a contour" options={contours} value={name} onChange={setName} />
  </div>;
}

function AgentPlate() {
  const [status, setStatus] = React.useState<AgentStatus>("thinking");
  return <div className="maker-specimen maker-specimen-agent" data-example="agent-state">
    <AgentState status={status} size="lg" />
    <Choices label="Try an agent state" options={[["thinking", "Think"], ["working", "Work"], ["complete", "Done"]] as const} value={status} onChange={setStatus} />
  </div>;
}

function IconPlate() {
  const [replay, setReplay] = React.useState(0);
  return <div className="maker-specimen maker-specimen-icons" data-example="animated-icon">
    <div className="maker-icon-row" key={replay}>
      {(["heart", "sparkles", "bell"] as const).map(name => <span key={name}><AnimatedIcon name={name} preset="draw" active size="lg" /></span>)}
    </div>
    <Button variant="secondary" size="sm" onClick={() => setReplay(value => value + 1)}><AnimatedIcon name="refresh-cw" /> Draw them again</Button>
  </div>;
}

function TexturePlate() {
  const [pattern, setPattern] = React.useState<PatternBackgroundVariant>("weave");
  return <div className="maker-specimen maker-specimen-texture" data-example="pattern-background">
    <PatternBackground variant={pattern} opacity={0.32} spacing={28} />
    <p className="maker-texture-note"><Shape name="clover-soft" /> Space to think.</p>
    <Choices label="Try a texture" options={[["weave", "Weave"], ["pebbles", "Pebbles"], ["folds", "Folds"], ["sprouts", "Sprouts"]] as const} value={pattern} onChange={setPattern} />
  </div>;
}

const plates = [
  { id: "shape", numeral: "I", title: "Contour", tone: "blue", demo: ContourPlate, caption: "Original silhouettes from one mathematical family. Organic shapes and a little imperfection give an interface character." },
  { id: "agent-state", numeral: "II", title: "Agent State", tone: "olive", demo: AgentPlate, caption: "Waiting, with a little character. Each state still reads when motion is off." },
  { id: "animated-icon", numeral: "III", title: "Animated Icon", tone: "pink", demo: IconPlate, caption: "Motion earns its place when it helps a detail make sense." },
  { id: "pattern-background", numeral: "IV", title: "Pattern Background", tone: "yellow", demo: TexturePlate, caption: "A little texture changes the feeling. Small screens, dark surfaces and quieter motion belong in the design too." },
] as const;

// `contactEnabled` defaults to the build flag and exists so both contact states can be rendered in a test.
export function CreatorPage({ contactEnabled = siteFlags.contactEnabled }: { contactEnabled?: boolean }) {
  const { quiet } = useChoreography();
  const contents = [["#practice", "The practice"], ["#plates", "Plates"], ["#write", contactEnabled ? "Write to me" : "Find me"]] as const;
  return <div className="story-page maker-page" data-quiet={quiet}><MarketingHeader /><main id="story-main">
    <section className="creator-hero maker-hero" aria-labelledby="maker-title">
      <div className="maker-folio" aria-hidden="true"><Caps>Profile</Caps><Caps>000h by Cojeev</Caps><Caps>Madhya Pradesh, India</Caps></div>
      <div className="maker-hero-copy">
        <Caps>Designing it. Building it. Sharing it.</Caps>
        <Hero id="maker-title">Hi, I’m <span>Sanjay.</span></Hero>
        <p className="maker-deck">I design the details and build the components, so what you see is something you can <em>actually use.</em></p>
        <Body>000h by Cojeev is my open-source React library: original organic shapes, purposeful motion, warm paper and ink. It’s MIT licensed and free.</Body>
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
      <nav className="maker-contents" aria-label="In this profile">
        <Meta>In this profile</Meta>
        <ol>{contents.map(([href, label], index) => <li key={href}><a href={href}><span>0{index + 1}</span>{label}</a></li>)}</ol>
      </nav>
    </section>

    <section id="practice" className="maker-practice" aria-labelledby="maker-practice-heading">
      <header className="maker-practice-head">
        <Caps>01 / The practice</Caps>
        <SectionTitle id="maker-practice-heading">From a feeling to a working&nbsp;thing.</SectionTitle>
      </header>
      <div className="maker-practice-text">
        <p className="maker-dropcap">A distinctive interface comes from decisions that work together: how a surface feels, how a control responds, and how the whole thing helps someone do what they came to do.</p>
        <Body>In 000h by Cojeev I bring those decisions into reusable React components, original shapes and purposeful motion. A component is more than its first frame, so focus, small screens and dark surfaces are designed too. The source is open so the thinking can keep growing.</Body>
      </div>
      <dl className="maker-facts">
        <div><dt>The library</dt><dd>Free and MIT licensed</dd></div>
        <div><dt>Based in</dt><dd>Madhya Pradesh, India</dd></div>
        <div><dt>Open to</dt><dd>Design and development projects, separate from the library</dd></div>
      </dl>
      <figure className="maker-quote">
        <Shape name="clover-soft" className="maker-quote-art" aria-hidden="true" />
        <Shape name="seed-wing" className="maker-quote-seed" aria-hidden="true" />
        <blockquote><p>Good tools. A human touch. Room to&nbsp;play.</p></blockquote>
        <figcaption><Meta>Sanjay Kumar</Meta> The kind of software I want to make.</figcaption>
      </figure>
    </section>

    <section id="plates" className="maker-plates" aria-labelledby="maker-plates-heading">
      <header className="maker-plates-head">
        <div><Caps>02 / Plates</Caps><SectionTitle id="maker-plates-heading">The work, in&nbsp;hand.</SectionTitle></div>
        <Body>Every plate is a live component from the library, not a picture of one. Touch it, change it, then read the source.</Body>
      </header>
      <div className="maker-plate-grid">
        {plates.map(({ id, numeral, title, tone, demo: Demo, caption }) => <figure className="maker-plate" data-tone={tone} data-plate={id} key={id}>
          <div className="maker-plate-stage"><Demo /></div>
          <figcaption>
            <Meta>Plate {numeral}</Meta>
            <h3>{title}</h3>
            <p>{caption}</p>
            <Link href={`/docs/${id}/`} className="maker-plate-link">Read the source<span className="sr-only"> for {title}</span> <AnimatedIcon name="arrow-up-right" size="sm" /></Link>
          </figcaption>
        </figure>)}
        <aside className="maker-plates-more" aria-label="The rest of the library">
          <p>These are four of the parts. The rest of the library is open, free and yours to change.</p>
          <div className="story-actions"><MarketingLink href="/" primary>Explore 000h by Cojeev <AnimatedIcon name="arrow-right" /></MarketingLink><MarketingLink href="/docs/">Browse the components</MarketingLink></div>
        </aside>
      </div>
    </section>

    <section id="write" className="maker-write" data-contact={contactEnabled || undefined} aria-labelledby="maker-write-heading">
      <Shape name="scalloped-square" className="maker-write-art" aria-hidden="true" />
      <div className="maker-write-copy">
        <Caps>03 / {contactEnabled ? "Write to me" : "Find me"}</Caps>
        <h2 id="maker-write-heading">Let’s make something <em>good.</em></h2>
        <p>{contactEnabled ? "Tell me what you’re making and what it should feel like. I take on design and development projects, separately from the library." : "I take on design and development projects, separately from the library. For now, GitHub is the best place to find me."}</p>
        <div className="story-actions">{contactEnabled ? <><EmailMe /><MarketingLink href={creatorUrl}><AnimatedIcon name="github" /> Follow along on GitHub <AnimatedIcon name="arrow-up-right" /></MarketingLink></> : <MarketingLink href={creatorUrl} primary><AnimatedIcon name="github" /> Visit my GitHub <AnimatedIcon name="arrow-up-right" /></MarketingLink>}</div>
      </div>
      {contactEnabled && <div className="maker-write-sheet"><ContactForm /></div>}
    </section>
  </main><MarketingFooter /></div>;
}
