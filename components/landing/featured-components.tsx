"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/registry/cojeev/ui/button";
import { AnimatedIcon } from "@/registry/cojeev/ui/animated-icon";
import { MotionDrawer } from "@/registry/cojeev/ui/motion-drawer";
import { Shape } from "@/registry/cojeev/ui/shape";
import { Icon } from "@/registry/cojeev/ui/icon";
import { Dock } from "@/registry/cojeev/ui/dock";
import { Slider, SliderOutput } from "@/registry/cojeev/ui/slider";
import { BentoGrid } from "@/registry/cojeev/ui/bento-grid";
import { generateBento } from "@/registry/cojeev/lib/bento-layout";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/registry/cojeev/ui/command";
import { AgentState, type AgentStatus } from "@/registry/cojeev/ui/agent-state";
import { PatternBackground, type PatternBackgroundVariant } from "@/registry/cojeev/ui/pattern-background";
import { Meta } from "@/registry/cojeev/ui/typography";
import { InstallCommand } from "@/components/install-command";
import { AnalyticsPreview } from "@/components/analytics/analytics-preview";
import { installCommand } from "@/lib/site-config";
import { sanitizeRoute, track } from "@/lib/analytics/client";
import { MarketingLink } from "./marketing-shell";

function recordVariant(componentId: string, value: string, variantId: "variant" | "preview_background" = "variant") {
  const route = sanitizeRoute(window.location.pathname);
  if (route) track("variant_selected", { component_id: componentId, placement: "landing", route, variant_id: variantId, variant_value: value });
}

function SliderPreview() {
  const [value, setValue] = React.useState([64]);
  return <div className="launch-demo launch-demo--slider" data-example="slider">
    <Slider appearance="rubber" variant="pink" value={value} onValueChange={setValue} aria-label="Rubber slider" />
    <SliderOutput className="launch-demo__value">{value[0]}</SliderOutput>
  </div>;
}

function DrawerPreview() {
  return <div className="launch-demo launch-demo--drawer" data-example="motion-drawer">
    <div className="launch-paper-stack" aria-hidden="true"><span /><span /><span><Shape name="clover-soft" /></span></div>
    <MotionDrawer title="A little room for ideas" description="Real components, ready for your own content." variant="stack" triggerLabel="Open drawer" panels={[
      { value: "idea", label: "The idea", children: <div className="launch-drawer-content"><Shape name="clover-soft" /><p>A place for a thought, a task, or your next good idea. Switch between the files to try the stack.</p></div> },
      { value: "details", label: "The details", children: <div className="launch-drawer-content"><p>Keyboard navigation, focus return, and motion preferences are part of the experience. Try Escape to return to the page.</p><Button asChild><Link href="/docs/motion-drawer/">Explore Motion Drawer</Link></Button></div> },
      { value: "yours", label: "Make it yours", children: <div className="launch-install-details"><p>A little stack for settings, notes, or something entirely your own.</p><InstallCommand command={installCommand("motion-drawer")} componentId="motion-drawer" /></div> },
    ]} />
  </div>;
}

const bentoContent = [
  { id: "home", label: "Home" },
  { id: "grow", label: "Grow" },
  { id: "add", label: "Add" },
  { id: "keep", label: "Keep" },
];
const bentoIcons: Record<string, string> = { home: "house", grow: "sparkles", add: "plus", keep: "heart" };
const bentoLayout = generateBento(4, 3, 17, bentoContent, "Gallery");
function BentoPreview() {
  return <div className="launch-demo launch-demo--bento" data-example="bento-grid">
    <BentoGrid
      layout={bentoLayout}
      variant="classic"
      aria-label="A four-tile bento layout"
      renderTile={tile => <>
        <Icon name={bentoIcons[tile.id] ?? "circle-check"} />
        <span className="launch-demo__tile-label">{tile.label}</span>
      </>}
    />
  </div>;
}

const commandItems = [
  { id: "button", label: "Button" },
  { id: "card", label: "Card" },
  { id: "dialog", label: "Dialog" },
  { id: "tabs", label: "Tabs" },
  { id: "slider", label: "Slider" },
  { id: "calendar", label: "Calendar" },
];
/**
 * cmdk scrolls its selected result into view the moment one exists, and a result far down the
 * page drags the whole document with it. Nothing is selected until the reader actually searches
 * or arrows through the list, so the list stays mounted and keeps what they typed.
 */
function CommandPreview() {
  const router = useRouter();
  const [selected, setSelected] = React.useState("");
  return <div className="launch-demo launch-demo--command" data-example="command">
    <Command label="Search components" loop value={selected} onValueChange={setSelected}>
      <CommandInput aria-label="Search components" placeholder="Search components…" />
      <CommandList>
        <CommandEmpty>Nothing by that name yet.</CommandEmpty>
        <CommandGroup>
          {commandItems.map(item => <CommandItem key={item.id} value={item.label} onSelect={() => { recordVariant("command", item.id); router.push(`/docs/${item.id}/`); }}>
            <Icon name="layout-grid" />{item.label}
          </CommandItem>)}
        </CommandGroup>
      </CommandList>
    </Command>
  </div>;
}

function IconPreview() {
  const [replay, setReplay] = React.useState(0);
  return <div className="launch-demo launch-demo--icons" data-example="animated-icon">
    <div className="launch-icon-family" key={replay}>
      {(["heart", "sparkles", "bell"] as const).map(name => <span key={name}><AnimatedIcon name={name} preset="draw" active size="lg" /></span>)}
    </div>
    <Button variant="secondary" size="sm" onClick={() => setReplay(value => value + 1)}><AnimatedIcon name="refresh-cw" /> Replay the details</Button>
  </div>;
}

const dockItems = [
  { value: "notes", label: "Notes", icon: <Icon name="file-text" /> },
  { value: "files", label: "Files", icon: <Icon name="folder" /> },
  { value: "ideas", label: "Ideas", icon: <Icon name="sparkles" /> },
  { value: "settings", label: "Settings", icon: <Icon name="settings" /> },
];
function DockPreview() {
  const [selected, setSelected] = React.useState("notes");
  return <div className="launch-demo launch-demo--dock" data-example="dock">
    <p className="launch-demo__value" role="status">{dockItems.find(item => item.value === selected)?.label}</p>
    <Dock items={dockItems} value={selected} onValueChange={setSelected} variant="shelf" itemSize={38} magnification={1.35} aria-label="Try the dock" />
  </div>;
}

function AgentPreview() {
  const [status, setStatus] = React.useState<AgentStatus>("thinking");
  return <div className="launch-demo launch-demo--agent" data-example="agent-state">
    <AgentState status={status} size="sm" />
    <div className="launch-choices" role="group" aria-label="Try an agent state">
      {([["thinking", "Think"], ["working", "Work"], ["complete", "Done"]] as const).map(([value, label]) => <Button key={value} variant={status === value ? "secondary" : "ghost"} size="sm" aria-pressed={status === value} onClick={() => { setStatus(value); recordVariant("agent-state", value); }}>{label}</Button>)}
    </div>
  </div>;
}

function BackgroundPreview() {
  const [pattern, setPattern] = React.useState<PatternBackgroundVariant>("weave");
  return <div className="launch-demo launch-demo--background" data-example="pattern-background">
    <PatternBackground variant={pattern} opacity={0.3} spacing={27} />
    <div className="launch-choices" role="group" aria-label="Try a background">
      {([["weave", "Weave"], ["pebbles", "Pebbles"], ["folds", "Folds"]] as const).map(([value, label]) => <Button key={value} size="sm" variant={pattern === value ? "secondary" : "ghost"} aria-pressed={pattern === value} onClick={() => { setPattern(value); recordVariant("pattern-background", value, "preview_background"); }}>{label}</Button>)}
    </div>
  </div>;
}

type GalleryFilter = "featured" | "motion" | "layout";
const filters: { value: GalleryFilter; label: string }[] = [
  { value: "featured", label: "Featured" },
  { value: "motion", label: "Motion" },
  { value: "layout", label: "Layout" },
];

/** Eight real specimens; each filter draws a different four from them. */
const specimens = [
  { id: "slider", title: "Rubber Slider", purpose: "Expressive controls that feel natural.", tone: "pink", demo: SliderPreview, filters: ["featured", "motion"] },
  { id: "motion-drawer", title: "Motion Drawer", purpose: "Smooth. Simple. Considered.", tone: "blue", demo: DrawerPreview, filters: ["featured", "motion"] },
  { id: "bento-grid", title: "Bento Grid", purpose: "Flexible layouts for real content.", tone: "olive", demo: BentoPreview, filters: ["featured", "layout"] },
  { id: "command", title: "Command", purpose: "Find anything, faster.", tone: "cream", demo: CommandPreview, filters: ["featured", "layout"] },
  { id: "animated-icon", title: "Animated Icon", purpose: "Small gestures. A little personality.", tone: "yellow", demo: IconPreview, filters: ["motion"] },
  { id: "agent-state", title: "Agent State", purpose: "Give the waiting a little character.", tone: "pink", demo: AgentPreview, filters: ["motion"] },
  { id: "dock", title: "Dock", purpose: "Your favourite tools, close at hand.", tone: "blue", demo: DockPreview, filters: ["layout"] },
  { id: "pattern-background", title: "Subtle Backgrounds", purpose: "A little texture. A different feeling.", tone: "olive", demo: BackgroundPreview, filters: ["layout"] },
] as const;

/**
 * Every specimen stays mounted; a filter only hides the ones it does not list, so a value
 * someone set, a drawer they opened or a search they typed survives switching.
 */
export function FeaturedComponents() {
  const [filter, setFilter] = React.useState<GalleryFilter>("featured");
  return <section className="launch-gallery" id="featured-components" aria-labelledby="gallery-heading" data-filter={filter}>
    <header className="launch-gallery__head">
      <h2 id="gallery-heading">Find your next detail.</h2>
      <div className="launch-gallery__filters" role="group" aria-label="Filter the gallery">
        {filters.map(item => <Button
          key={item.value}
          size="sm"
          variant={item.value === filter ? "default" : "ghost"}
          aria-pressed={item.value === filter}
          onClick={() => { setFilter(item.value); recordVariant("component-gallery", item.value); }}
        >{item.label}</Button>)}
      </div>
      <MarketingLink href="/docs/" className="launch-gallery__all">All components <AnimatedIcon name="arrow-right" /></MarketingLink>
    </header>
    <div className="launch-gallery__grid">
      {specimens.map(({ id, title, purpose, tone, demo: Demo, filters: shown }) => <article
        key={id}
        className="launch-specimen"
        data-tone={tone}
        data-featured-component={id}
        hidden={!(shown as readonly string[]).includes(filter)}
      >
        <AnalyticsPreview componentId={id} placement="landing" className="launch-specimen-demo"><Demo /></AnalyticsPreview>
        <h3>{title}</h3>
        <p>{purpose}</p>
        <Link className="launch-specimen__docs" href={`/docs/${id}/`} aria-label={`${title} documentation`}>
          Documentation <AnimatedIcon name="arrow-up-right" size="sm" />
        </Link>
      </article>)}
    </div>
    <Meta className="launch-gallery__note">Every preview above is the installed component, running here.</Meta>
  </section>;
}
